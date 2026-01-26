import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SLEEP-REMINDER] ${step}${detailsStr}`);
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
    logStep("Function started - checking for bedtime reminders");

    // Get current time in HH:MM format
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    
    logStep("Current UTC time", { hour: currentHour, minute: currentMinute });

    // Find users who have bedtime reminders enabled
    // We need to check for users whose bedtime is coming up
    const { data: profiles, error: profilesError } = await supabase
      .from("sleep_profiles")
      .select("user_id, bed_goal_time, reminder_minutes_before, wake_goal_time")
      .eq("bedtime_reminders_enabled", true)
      .not("bed_goal_time", "is", null);

    if (profilesError) {
      logStep("Error fetching profiles", { error: profilesError.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: profilesError.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!profiles || profiles.length === 0) {
      logStep("No users with reminders enabled");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No reminders to send",
        sent: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found profiles with reminders", { count: profiles.length });

    // Process each profile and check if reminder should be sent
    const usersToNotify: string[] = [];
    
    for (const profile of profiles) {
      if (!profile.bed_goal_time) continue;
      
      // Parse bedtime (format: "22:00" or "22:00:00")
      const bedtimeParts = profile.bed_goal_time.split(":");
      const bedtimeHour = parseInt(bedtimeParts[0], 10);
      const bedtimeMinute = parseInt(bedtimeParts[1], 10);
      
      const reminderMinutes = profile.reminder_minutes_before || 30;
      
      // Calculate reminder time
      let reminderHour = bedtimeHour;
      let reminderMinute = bedtimeMinute - reminderMinutes;
      
      if (reminderMinute < 0) {
        reminderMinute += 60;
        reminderHour -= 1;
        if (reminderHour < 0) reminderHour += 24;
      }
      
      // Check if current time matches reminder time (within 1 minute window)
      // Note: This is a simplified check - in production you'd want to account for timezones
      const isReminderTime = currentHour === reminderHour && 
                             Math.abs(currentMinute - reminderMinute) <= 1;
      
      if (isReminderTime) {
        logStep("User should receive reminder", { 
          userId: profile.user_id, 
          bedtime: profile.bed_goal_time,
          reminderTime: `${reminderHour}:${reminderMinute}`
        });
        usersToNotify.push(profile.user_id);
      }
    }

    logStep("Users to notify", { count: usersToNotify.length });

    // Send notifications
    let sentCount = 0;
    let failedCount = 0;

    for (const userId of usersToNotify) {
      try {
        // Get user's devices
        const { data: devices } = await supabase
          .from("user_devices")
          .select("fcm_token, device_type")
          .eq("user_id", userId)
          .eq("is_active", true);

        if (!devices || devices.length === 0) {
          logStep("No devices for user", { userId });
          continue;
        }

        // Send notification using the send-push-notification function
        const firebaseServerKey = Deno.env.get("FIREBASE_SERVER_KEY");
        if (!firebaseServerKey) {
          logStep("Firebase server key not configured");
          continue;
        }

        for (const device of devices) {
          const payload = {
            to: device.fcm_token,
            notification: {
              title: "🌙 Bedtime Reminder",
              body: "Time to start winding down! Your goal bedtime is coming up in 30 minutes.",
              icon: "/favicon.png",
              badge: "/favicon.png",
            },
            data: {
              type: "bedtime_reminder",
              click_action: "/ai-apps/sleep-ai",
            },
            android: {
              priority: "high",
              notification: {
                sound: "default",
                channel_id: "sleep_reminders",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: 1,
                },
              },
            },
            webpush: {
              headers: { Urgency: "high" },
              notification: { requireInteraction: true },
            },
          };

          const response = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `key=${firebaseServerKey}`,
            },
            body: JSON.stringify(payload),
          });

          const result = await response.json();
          
          if (result.success === 1) {
            sentCount++;
            logStep("Notification sent", { userId, deviceType: device.device_type });
          } else {
            failedCount++;
            logStep("Notification failed", { userId, error: result.results?.[0]?.error });
            
            // Deactivate invalid tokens
            if (result.results?.[0]?.error === "NotRegistered" || 
                result.results?.[0]?.error === "InvalidRegistration") {
              await supabase
                .from("user_devices")
                .update({ is_active: false })
                .eq("fcm_token", device.fcm_token);
            }
          }
        }
      } catch (error) {
        logStep("Error sending to user", { userId, error: String(error) });
        failedCount++;
      }
    }

    logStep("Reminders complete", { sent: sentCount, failed: failedCount });

    return new Response(JSON.stringify({ 
      success: true,
      sent: sentCount,
      failed: failedCount,
      usersChecked: profiles.length
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
