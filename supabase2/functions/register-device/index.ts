import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REGISTER-DEVICE] ${step}${detailsStr}`);
};

interface RegisterDeviceRequest {
  fcmToken: string;
  deviceType?: 'ios' | 'android' | 'web';
  deviceName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData.user) {
      logStep("Auth error", { error: userError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    const body = await req.json() as RegisterDeviceRequest;
    const { fcmToken, deviceType = 'web', deviceName } = body;

    if (!fcmToken) {
      return new Response(JSON.stringify({ error: "Missing fcmToken" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Use service role for database operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Check if this token already exists for this user
    const { data: existingDevice } = await supabaseService
      .from("user_devices")
      .select("id, is_active")
      .eq("user_id", userId)
      .eq("fcm_token", fcmToken)
      .single();

    if (existingDevice) {
      // Update existing device - reactivate if needed
      if (!existingDevice.is_active) {
        await supabaseService
          .from("user_devices")
          .update({
            is_active: true,
            device_type: deviceType,
            device_name: deviceName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingDevice.id);

        logStep("Device reactivated", { deviceId: existingDevice.id });
      } else {
        // Just update the timestamp
        await supabaseService
          .from("user_devices")
          .update({
            device_type: deviceType,
            device_name: deviceName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingDevice.id);

        logStep("Device updated", { deviceId: existingDevice.id });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Device updated",
        deviceId: existingDevice.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if this token exists for another user (device changed hands)
    const { data: otherUserDevice } = await supabaseService
      .from("user_devices")
      .select("id")
      .eq("fcm_token", fcmToken)
      .neq("user_id", userId)
      .single();

    if (otherUserDevice) {
      // Deactivate the old device entry
      await supabaseService
        .from("user_devices")
        .update({ is_active: false })
        .eq("id", otherUserDevice.id);

      logStep("Deactivated token from previous user", { oldDeviceId: otherUserDevice.id });
    }

    // Create new device entry
    const { data: newDevice, error: insertError } = await supabaseService
      .from("user_devices")
      .insert({
        user_id: userId,
        fcm_token: fcmToken,
        device_type: deviceType,
        device_name: deviceName,
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      logStep("Insert error", { error: insertError.message });
      return new Response(JSON.stringify({ error: insertError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("New device registered", { deviceId: (newDevice as any)?.id, deviceType });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Device registered",
      deviceId: (newDevice as any)?.id 
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
