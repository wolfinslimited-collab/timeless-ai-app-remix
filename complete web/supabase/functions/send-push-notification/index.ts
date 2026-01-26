import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PUSH-NOTIFICATION] ${step}${detailsStr}`);
};

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

// Send FCM notification via HTTP v1 API (legacy)
async function sendFCMNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  imageUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const serverKey = Deno.env.get("FIREBASE_SERVER_KEY");
  if (!serverKey) {
    return { success: false, error: "Firebase server key not configured" };
  }

  try {
    const payload: Record<string, unknown> = {
      to: fcmToken,
      notification: {
        title,
        body,
        icon: "/favicon.png",
        badge: "/favicon.png",
        ...(imageUrl && { image: imageUrl }),
      },
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channel_id: "subscription_updates",
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
        headers: {
          Urgency: "high",
        },
        notification: {
          requireInteraction: true,
        },
      },
    };

    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${serverKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    logStep("FCM response", { success: result.success, failure: result.failure });

    if (result.success === 1) {
      return { success: true };
    } else if (result.results?.[0]?.error) {
      return { success: false, error: result.results[0].error };
    }

    return { success: false, error: "Unknown FCM error" };
  } catch (error) {
    logStep("FCM send error", { error: String(error) });
    return { success: false, error: String(error) };
  }
}

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
    logStep("Function started");

    const body = await req.json() as PushNotificationRequest;
    const { userId, title, body: messageBody, data, imageUrl } = body;

    if (!userId || !title || !messageBody) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing required fields: userId, title, body" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Sending notification", { userId, title });

    // Get all active devices for the user
    const { data: devices, error: devicesError } = await supabase
      .from("user_devices")
      .select("fcm_token, device_type, device_name")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (devicesError) {
      logStep("Error fetching devices", { error: devicesError.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: devicesError.message 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (!devices || devices.length === 0) {
      logStep("No active devices found for user");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No active devices found",
        sent: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Found devices", { count: devices.length });

    // Send to all devices
    const results = await Promise.all(
      devices.map(async (device: any) => {
        const result = await sendFCMNotification(
          device.fcm_token,
          title,
          messageBody,
          data,
          imageUrl
        );

        // If token is invalid, mark device as inactive
        if (!result.success && (
          result.error === "NotRegistered" || 
          result.error === "InvalidRegistration"
        )) {
          await supabase
            .from("user_devices")
            .update({ is_active: false })
            .eq("fcm_token", device.fcm_token);
          
          logStep("Deactivated invalid token", { deviceType: device.device_type });
        }

        return {
          deviceType: device.device_type,
          ...result
        };
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logStep("Notifications sent", { successCount, failureCount });

    return new Response(JSON.stringify({ 
      success: true,
      sent: successCount,
      failed: failureCount,
      results
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
