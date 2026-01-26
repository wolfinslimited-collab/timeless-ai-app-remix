import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MigrateUser {
  email: string;
  password_hash?: string;
  display_name?: string;
  credits?: number;
  subscription_status?: string;
  plan?: string;
  subscription_period?: string;
  subscription_end_date?: string;
  created_at?: string;
  source?: string;
  fcm_token?: string;
  device_name?: string;
}

const VALID_SOURCES = ["web", "android", "ios"];

// Subscription plan mapping for validation
const VALID_PLANS = [
  "free",
  "premium-monthly",
  "premium-yearly", 
  "premium-plus-monthly",
  "premium-plus-yearly",
];

const VALID_STATUSES = ["none", "active", "canceled", "past_due", "inactive"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claimsData.claims.sub)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { users, mode } = await req.json() as { 
      users: MigrateUser[]; 
      mode: "create" | "update" | "upsert";
    };

    if (!users || !Array.isArray(users)) {
      return new Response(
        JSON.stringify({ error: "Users array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Migration started: ${users.length} users, mode: ${mode}`);

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as { email: string; status: string; message: string }[],
    };

    // Get existing users for lookup (for upsert mode)
    const existingEmails = new Set<string>();
    if (mode === "upsert" || mode === "update") {
      let page = 1;
      while (true) {
        const { data: { users: pageUsers }, error } = await supabase.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (error) break;
        pageUsers.forEach(u => {
          if (u.email) existingEmails.add(u.email.toLowerCase());
        });
        if (pageUsers.length < 1000) break;
        page++;
      }
      console.log(`Found ${existingEmails.size} existing users`);
    }

    for (const user of users) {
      const email = user.email?.toString().trim().toLowerCase();
      
      if (!email || email === "null" || email === "" || !email.includes("@")) {
        results.errors++;
        results.details.push({ 
          email: email || "invalid", 
          status: "error", 
          message: "Invalid email" 
        });
        continue;
      }

      const userExists = existingEmails.has(email);

      try {
        if (mode === "create" && userExists) {
          results.skipped++;
          results.details.push({ email, status: "skipped", message: "User already exists" });
          continue;
        }

        if (mode === "update" && !userExists) {
          results.skipped++;
          results.details.push({ email, status: "skipped", message: "User not found" });
          continue;
        }

        // Normalize and validate subscription data
        const normalizedPlan = user.plan?.toString().toLowerCase().trim();
        const normalizedStatus = user.subscription_status?.toString().toLowerCase().trim();
        const normalizedPeriod = user.subscription_period?.toString().toLowerCase().trim();

        // Parse subscription end date
        let subscriptionEndDate: string | null = null;
        if (user.subscription_end_date) {
          try {
            const dateValue = new Date(user.subscription_end_date);
            if (!isNaN(dateValue.getTime())) {
              subscriptionEndDate = dateValue.toISOString();
            }
          } catch {
            console.warn(`Invalid date format for ${email}: ${user.subscription_end_date}`);
          }
        }

        if (!userExists) {
          // Create new user in auth
          const createData: any = {
            email,
            email_confirm: true,
          };

          if (user.password_hash && user.password_hash.startsWith("$2")) {
            createData.password_hash = user.password_hash;
          } else if (user.password_hash) {
            createData.password = user.password_hash;
          } else {
            createData.password = crypto.randomUUID() + "Aa1!";
          }

            // Parse created_at date for user metadata
            let userCreatedAt: string | undefined;
            if (user.created_at) {
              try {
                const dateValue = new Date(user.created_at);
                if (!isNaN(dateValue.getTime())) {
                  userCreatedAt = dateValue.toISOString();
                }
              } catch {
                console.warn(`Invalid created_at format for ${email}: ${user.created_at}`);
              }
            }

            createData.user_metadata = {
              display_name: user.display_name || email.split("@")[0],
              migrated_from: "timeless_v1",
              migrated_at: new Date().toISOString(),
              original_created_at: userCreatedAt,
            };

          const { data: newUser, error: createError } = await supabase.auth.admin.createUser(createData);

          if (createError) {
            results.errors++;
            results.details.push({ email, status: "error", message: createError.message });
            console.error(`Failed to create user ${email}:`, createError.message);
            continue;
          }

            if (newUser?.user) {
            const profileUpdate: Record<string, any> = {
              display_name: user.display_name || email.split("@")[0],
            };

            // Set created_at on profile if provided
            if (user.created_at) {
              try {
                const dateValue = new Date(user.created_at);
                if (!isNaN(dateValue.getTime())) {
                  profileUpdate.created_at = dateValue.toISOString();
                }
              } catch {
                // Use default created_at
              }
            }

            // Set credits
            if (user.credits !== undefined && user.credits !== null) {
              const creditsNum = parseInt(String(user.credits));
              if (!isNaN(creditsNum) && creditsNum >= 0) {
                profileUpdate.credits = creditsNum;
              }
            }

            // Set subscription status
            if (normalizedStatus && VALID_STATUSES.includes(normalizedStatus)) {
              profileUpdate.subscription_status = normalizedStatus;
            }

            // Set plan
            if (normalizedPlan) {
              // Try to match plan names
              if (VALID_PLANS.includes(normalizedPlan)) {
                profileUpdate.plan = normalizedPlan;
              } else if (normalizedPlan.includes("premium") && normalizedPlan.includes("plus")) {
                // Map variations like "Premium Plus" to the correct plan
                profileUpdate.plan = normalizedPeriod === "yearly" || normalizedPeriod === "year" 
                  ? "premium-plus-yearly" 
                  : "premium-plus-monthly";
              } else if (normalizedPlan.includes("premium")) {
                profileUpdate.plan = normalizedPeriod === "yearly" || normalizedPeriod === "year"
                  ? "premium-yearly"
                  : "premium-monthly";
              } else {
                profileUpdate.plan = normalizedPlan;
              }
            }

            // Set subscription end date
            if (subscriptionEndDate) {
              profileUpdate.subscription_end_date = subscriptionEndDate;
            }

            // Set source (web/android/ios)
            if (user.source) {
              const normalizedSource = user.source.toString().toLowerCase().trim();
              if (VALID_SOURCES.includes(normalizedSource)) {
                profileUpdate.source = normalizedSource;
              } else {
                profileUpdate.source = "web"; // Default to web
              }
            }

            // Small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 50));

            const { error: profileError } = await supabase
              .from("profiles")
              .update(profileUpdate)
              .eq("user_id", newUser.user.id);

            if (profileError) {
              console.error(`Failed to update profile for ${email}:`, profileError.message);
            }

            // Insert FCM token if provided
            if (user.fcm_token && user.fcm_token.trim()) {
              const deviceType = user.source?.toLowerCase().trim() || "web";
              const { error: deviceError } = await supabase
                .from("user_devices")
                .upsert({
                  user_id: newUser.user.id,
                  fcm_token: user.fcm_token.trim(),
                  device_type: VALID_SOURCES.includes(deviceType) ? deviceType : "web",
                  device_name: user.device_name || null,
                  is_active: true,
                }, { onConflict: "user_id,fcm_token" });

              if (deviceError) {
                console.error(`Failed to insert device for ${email}:`, deviceError.message);
              }
            }
          }

          results.created++;
          results.details.push({ email, status: "created", message: "User created successfully" });
          existingEmails.add(email);
        } else {
          // Update existing user - use the pre-fetched user list
          const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });
          const existingUser = existingUsers?.find(u => u.email?.toLowerCase() === email);

          if (existingUser) {
            const profileUpdate: Record<string, any> = {};

            if (user.display_name) {
              profileUpdate.display_name = user.display_name;
            }

            if (user.credits !== undefined && user.credits !== null) {
              const creditsNum = parseInt(String(user.credits));
              if (!isNaN(creditsNum) && creditsNum >= 0) {
                profileUpdate.credits = creditsNum;
              }
            }

            if (normalizedStatus && VALID_STATUSES.includes(normalizedStatus)) {
              profileUpdate.subscription_status = normalizedStatus;
            }

            if (normalizedPlan) {
              if (VALID_PLANS.includes(normalizedPlan)) {
                profileUpdate.plan = normalizedPlan;
              } else if (normalizedPlan.includes("premium") && normalizedPlan.includes("plus")) {
                profileUpdate.plan = normalizedPeriod === "yearly" || normalizedPeriod === "year" 
                  ? "premium-plus-yearly" 
                  : "premium-plus-monthly";
              } else if (normalizedPlan.includes("premium")) {
                profileUpdate.plan = normalizedPeriod === "yearly" || normalizedPeriod === "year"
                  ? "premium-yearly"
                  : "premium-monthly";
              } else {
                profileUpdate.plan = normalizedPlan;
              }
            }

            if (subscriptionEndDate) {
              profileUpdate.subscription_end_date = subscriptionEndDate;
            }

            // Set source for existing users
            if (user.source) {
              const normalizedSource = user.source.toString().toLowerCase().trim();
              if (VALID_SOURCES.includes(normalizedSource)) {
                profileUpdate.source = normalizedSource;
              }
            }

            if (Object.keys(profileUpdate).length > 0) {
              const { error: profileError } = await supabase
                .from("profiles")
                .update(profileUpdate)
                .eq("user_id", existingUser.id);

              if (profileError) {
                results.errors++;
                results.details.push({ email, status: "error", message: profileError.message });
                continue;
              }
            }

            // Upsert FCM token for existing user if provided
            if (user.fcm_token && user.fcm_token.trim()) {
              const deviceType = user.source?.toLowerCase().trim() || "web";
              const { error: deviceError } = await supabase
                .from("user_devices")
                .upsert({
                  user_id: existingUser.id,
                  fcm_token: user.fcm_token.trim(),
                  device_type: VALID_SOURCES.includes(deviceType) ? deviceType : "web",
                  device_name: user.device_name || null,
                  is_active: true,
                }, { onConflict: "user_id,fcm_token" });

              if (deviceError) {
                console.error(`Failed to upsert device for ${email}:`, deviceError.message);
              }
            }

            results.updated++;
            results.details.push({ email, status: "updated", message: "Profile updated" });
          }
        }
      } catch (err: any) {
        results.errors++;
        results.details.push({ email, status: "error", message: err.message });
        console.error(`Error processing ${email}:`, err.message);
      }
    }

    console.log(`Migration complete: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped, ${results.errors} errors`);

    return new Response(
      JSON.stringify(results),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Migration error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
