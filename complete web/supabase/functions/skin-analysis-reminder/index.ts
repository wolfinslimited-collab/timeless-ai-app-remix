import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SKIN-REMINDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  try {
    logStep("Starting skin analysis reminder job");

    // Get the date 7 days ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoISO = oneWeekAgo.toISOString();

    // Find users who have done at least one skin analysis but haven't done one in the last 7 days
    // and have push notifications enabled (active devices)
    const { data: usersToRemind, error: usersError } = await supabase
      .from("skin_analyses")
      .select("user_id")
      .lt("created_at", oneWeekAgoISO);

    if (usersError) {
      logStep("Error fetching users", { error: usersError.message });
      throw usersError;
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(usersToRemind?.map(u => u.user_id) || [])];
    logStep("Found potential users", { count: uniqueUserIds.length });

    // Filter out users who have done an analysis in the last 7 days
    const { data: recentAnalyses, error: recentError } = await supabase
      .from("skin_analyses")
      .select("user_id")
      .gte("created_at", oneWeekAgoISO);

    if (recentError) {
      logStep("Error fetching recent analyses", { error: recentError.message });
      throw recentError;
    }

    const recentUserIds = new Set(recentAnalyses?.map(u => u.user_id) || []);
    const usersNeedingReminder = uniqueUserIds.filter(id => !recentUserIds.has(id));
    
    logStep("Users needing reminder", { count: usersNeedingReminder.length });

    // Send push notifications to each user
    const notificationResults = await Promise.all(
      usersNeedingReminder.map(async (userId) => {
        try {
          // Check if user has active devices
          const { data: devices } = await supabase
            .from("user_devices")
            .select("id")
            .eq("user_id", userId)
            .eq("is_active", true)
            .limit(1);

          if (!devices || devices.length === 0) {
            return { userId, sent: false, reason: "no_devices" };
          }

          // Get user's last analysis to personalize the message
          const { data: lastAnalysis } = await supabase
            .from("skin_analyses")
            .select("overall_score, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const daysSinceLastAnalysis = lastAnalysis 
            ? Math.floor((Date.now() - new Date(lastAnalysis.created_at).getTime()) / (1000 * 60 * 60 * 24))
            : 7;

          // Personalized notification messages
          const messages = [
            {
              title: "Time for a skin check! ✨",
              body: `It's been ${daysSinceLastAnalysis} days since your last analysis. Track your progress today!`
            },
            {
              title: "Your skin routine reminder 🌟",
              body: "Consistent tracking leads to better skin! Take a quick photo to see your progress."
            },
            {
              title: "How's your skin doing? 💫",
              body: lastAnalysis?.overall_score 
                ? `Your last score was ${lastAnalysis.overall_score}. Let's see if you've improved!`
                : "Time for your weekly skin analysis. Track your skin health journey!"
            }
          ];

          // Pick a random message
          const message = messages[Math.floor(Math.random() * messages.length)];

          // Send notification via the shared function
          const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              userId,
              title: message.title,
              body: message.body,
              data: {
                type: "skin_reminder",
                route: "/ai-apps/skin-ai"
              }
            }),
          });

          const result = await response.json();
          logStep("Notification sent", { userId, success: result.success });

          return { userId, sent: result.success, result };
        } catch (error) {
          logStep("Error sending to user", { userId, error: String(error) });
          return { userId, sent: false, error: String(error) };
        }
      })
    );

    const sentCount = notificationResults.filter(r => r.sent).length;
    const failedCount = notificationResults.filter(r => !r.sent).length;

    logStep("Reminder job completed", { sentCount, failedCount });

    return new Response(JSON.stringify({ 
      success: true,
      usersProcessed: usersNeedingReminder.length,
      notificationsSent: sentCount,
      notificationsFailed: failedCount,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
