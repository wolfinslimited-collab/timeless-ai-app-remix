import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { notification, originalRequest } = await req.json();

    if (!notification || !notification.type || !notification.title) {
      return new Response(
        JSON.stringify({ error: "Invalid notification data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Credit cost for creating a notification
    const NOTIFICATION_CREDIT_COST = 1;

    // Check user credits and subscription
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, subscription_status")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    const hasActiveSubscription = profile?.subscription_status === "active";

    // Check credits if not subscribed
    if (!hasActiveSubscription) {
      if ((profile?.credits ?? 0) < NOTIFICATION_CREDIT_COST) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please purchase more credits to create notifications." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deduct credits
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: (profile?.credits ?? 0) - NOTIFICATION_CREDIT_COST })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Credit deduction error:", updateError);
      } else {
        console.log(`Deducted ${NOTIFICATION_CREDIT_COST} credits from user ${user.id} for notification creation`);
      }
    }

    // Calculate max_triggers based on type and repeat settings
    const isRecurring = notification.condition_config?.repeat === "daily" || 
        notification.condition_config?.repeat === "weekly" ||
        notification.type === "crypto_price" ||
        notification.type === "weather";


    const { data: saved, error } = await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        type: notification.type,
        title: notification.title,
        description: notification.description || "",
        original_request: originalRequest || notification.title,
        condition_config: notification.condition_config || {},
        channel: notification.channel || "both",
        status: "active",
        ...(isRecurring ? {} : { max_triggers: 1 }),
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving notification:", error);
      throw error;
    }

    console.log("Notification saved:", saved.id);

    return new Response(
      JSON.stringify({ success: true, notification: saved }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Notify AI save error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
