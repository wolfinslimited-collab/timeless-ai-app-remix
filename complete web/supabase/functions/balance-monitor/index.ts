import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOW_BALANCE_THRESHOLD = 0.10; // 10%

// Fetch admin emails from database
async function getAdminEmails(supabase: any): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    
    if (error || !data?.length) {
      console.error("Error fetching admin roles:", error);
      return [];
    }

    // Get emails from auth.users for these admin user_ids
    const adminEmails: string[] = [];
    for (const row of data) {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(row.user_id);
      if (!userError && userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }
    
    console.log("Found admin emails:", adminEmails);
    return adminEmails;
  } catch (error) {
    console.error("Error getting admin emails:", error);
    return [];
  }
}

interface BalanceInfo {
  provider: string;
  balance: number;
  maxBalance: number;
  percentage: number;
  isLow: boolean;
}

// Check Kie.ai balance
async function checkKieBalance(apiKey: string): Promise<BalanceInfo | null> {
  try {
    const response = await fetch("https://api.kie.ai/api/v1/chat/credit", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Kie.ai balance check failed:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("Kie.ai balance response:", JSON.stringify(data));
    
    // Kie.ai returns { code: 200, msg: "success", data: <credits> }
    const balance = typeof data.data === "number" ? data.data : (data.balance || data.credits || 0);
    // Set a reasonable max balance for percentage calculation (default 10000 credits)
    const maxBalance = 10000;
    const percentage = maxBalance > 0 ? balance / maxBalance : 1;

    return {
      provider: "Kie AI",
      balance,
      maxBalance,
      percentage,
      isLow: percentage <= LOW_BALANCE_THRESHOLD,
    };
  } catch (error) {
    console.error("Error checking Kie.ai balance:", error);
    return null;
  }
}

// Check Fal.ai balance using usage endpoint
async function checkFalBalance(apiKey: string): Promise<BalanceInfo | null> {
  try {
    // Fal.ai uses the models/usage endpoint
    const response = await fetch("https://api.fal.ai/v1/models/usage", {
      method: "GET",
      headers: {
        "Authorization": `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Fal.ai balance check failed:", response.status);
      // Try alternative endpoint
      const altResponse = await fetch("https://fal.run/api/billing", {
        method: "GET",
        headers: {
          "Authorization": `Key ${apiKey}`,
        },
      });
      
      if (!altResponse.ok) {
        console.error("Fal.ai alt balance check also failed:", altResponse.status);
        return null;
      }
      
      const altData = await altResponse.json();
      console.log("Fal.ai alt balance response:", JSON.stringify(altData));
      const balance = altData.balance || altData.credits || altData.remaining || 0;
      const maxBalance = 1000;
      const percentage = maxBalance > 0 ? balance / maxBalance : 1;
      
      return {
        provider: "Fal AI",
        balance,
        maxBalance,
        percentage,
        isLow: percentage <= LOW_BALANCE_THRESHOLD,
      };
    }

    const data = await response.json();
    console.log("Fal.ai usage response:", JSON.stringify(data));
    
    // Calculate remaining from usage data if available
    const balance = data.remaining_credits || data.credits || data.balance || 0;
    const maxBalance = data.total_credits || 1000;
    const percentage = maxBalance > 0 ? balance / maxBalance : 1;

    return {
      provider: "Fal AI",
      balance,
      maxBalance,
      percentage,
      isLow: percentage <= LOW_BALANCE_THRESHOLD,
    };
  } catch (error) {
    console.error("Error checking Fal.ai balance:", error);
    return null;
  }
}

// Send low balance alert email via Resend API
async function sendLowBalanceAlert(
  apiKey: string,
  balances: BalanceInfo[],
  adminEmails: string[]
): Promise<void> {
  const lowBalanceProviders = balances.filter((b) => b.isLow);
  
  if (lowBalanceProviders.length === 0) {
    console.log("No low balance alerts to send");
    return;
  }

  if (adminEmails.length === 0) {
    console.log("No admin emails found, skipping alert");
    return;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">⚠️ Low API Balance Alert</h2>
      <p>The following AI service providers have low credit balances:</p>
      <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0;">
        ${lowBalanceProviders
          .map(
            (b) => `
          <div style="margin-bottom: 12px;">
            <strong style="color: #dc2626;">${b.provider}</strong><br/>
            <span style="color: #374151;">Balance: ${b.balance.toFixed(2)} credits (${(b.percentage * 100).toFixed(1)}% remaining)</span>
          </div>
        `
          )
          .join("")}
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        Please top up these services to avoid service interruption.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">
        This is an automated alert from Timeless AI Platform.
      </p>
    </div>
  `;

  try {
    for (const email of adminEmails) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Timeless AI <alerts@timeless.media>",
          to: [email],
          subject: `⚠️ Low API Balance Alert: ${lowBalanceProviders.map((b) => b.provider).join(", ")}`,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        console.error(`Failed to send email to ${email}:`, await response.text());
      }
    }
    console.log("Low balance alert emails sent successfully");
  } catch (error) {
    console.error("Failed to send low balance alert:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin authorization if token provided
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.log("No valid user token, proceeding with scheduled check");
      } else {
        // Check if user is admin
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: "Unauthorized - Admin access required" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Fetch admin emails from database
    const adminEmails = await getAdminEmails(supabase);

    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const balances: BalanceInfo[] = [];

    // Check Kie.ai balance
    if (KIE_API_KEY) {
      const kieBalance = await checkKieBalance(KIE_API_KEY);
      if (kieBalance) {
        balances.push(kieBalance);
      }
    } else {
      console.warn("KIE_API_KEY not configured");
    }

    // Check Fal.ai balance
    if (FAL_API_KEY) {
      const falBalance = await checkFalBalance(FAL_API_KEY);
      if (falBalance) {
        balances.push(falBalance);
      }
    } else {
      console.warn("FAL_API_KEY not configured");
    }

    // Send email alerts if any balance is low
    if (RESEND_API_KEY) {
      await sendLowBalanceAlert(RESEND_API_KEY, balances, adminEmails);
    } else {
      console.warn("RESEND_API_KEY not configured, skipping email alerts");
    }

    return new Response(
      JSON.stringify({
        success: true,
        balances,
        alerts_sent: balances.filter((b) => b.isLow).length > 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Balance monitor error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
