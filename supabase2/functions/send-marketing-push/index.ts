import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MARKETING-PUSH] ${step}${detailsStr}`);
};

interface CampaignRequest {
  campaignId: string;
  continueFrom?: number;
}

const BATCH_SIZE = 100;
const MAX_BATCHES_PER_EXECUTION = 30;

// Cache for access token
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

// Base64URL encode for JWT
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Create JWT for Google OAuth2
async function createJWT(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

// Get OAuth2 access token for FCM v1 API
async function getAccessToken(): Promise<string | null> {
  // Check cache
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60000) {
    return cachedAccessToken.token;
  }

  const serviceAccountJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountJson) {
    logStep("ERROR", { message: "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not configured" });
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const jwt = await createJWT(serviceAccount);

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("ERROR", { message: "Failed to get access token", status: response.status, error: errorText });
      return null;
    }

    const data = await response.json();
    cachedAccessToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return data.access_token;
  } catch (error) {
    logStep("ERROR", { message: "Access token error", error: String(error) });
    return null;
  }
}

// Get Firebase project ID from service account
function getFirebaseProjectId(): string | null {
  const serviceAccountJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountJson) return null;
  
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return serviceAccount.project_id;
  } catch {
    return null;
  }
}

async function sendFCMNotification(
  fcmToken: string,
  title: string,
  body: string,
  imageUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { success: false, error: "Failed to get FCM access token" };
  }

  const projectId = getFirebaseProjectId();
  if (!projectId) {
    return { success: false, error: "Firebase project ID not found" };
  }

  try {
    // FCM v1 API payload structure
    const payload = {
      message: {
        token: fcmToken,
        notification: {
          title,
          body,
          ...(imageUrl && { image: imageUrl }),
        },
        data: {
          type: "marketing",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channel_id: "marketing",
            icon: "ic_notification",
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
          notification: {
            icon: "/favicon.png",
            badge: "/favicon.png",
          },
          headers: {
            Urgency: "high",
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (response.ok) {
      return { success: true };
    }

    const errorData = await response.json();
    const errorMessage = errorData?.error?.message || errorData?.error?.status || "Unknown FCM error";
    
    // Check for unregistered tokens
    if (errorMessage.includes("UNREGISTERED") || errorMessage.includes("NOT_FOUND")) {
      return { success: false, error: "NotRegistered" };
    }
    if (errorMessage.includes("INVALID_ARGUMENT")) {
      return { success: false, error: "InvalidRegistration" };
    }

    return { success: false, error: errorMessage };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function processBatch(
  supabase: any,
  campaignId: string,
  campaign: { title: string; body: string; image_url?: string },
  devices: { fcm_token: string; user_id: string; device_type: string }[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const results = await Promise.all(
    devices.map(async (device) => {
      const result = await sendFCMNotification(
        device.fcm_token,
        campaign.title,
        campaign.body,
        campaign.image_url
      );

      // Log the result
      await supabase.from("marketing_campaign_logs").insert({
        campaign_id: campaignId,
        user_id: device.user_id,
        device_token: device.fcm_token,
        device_type: device.device_type,
        status: result.success ? "sent" : "failed",
        error_message: result.error || null,
        sent_at: result.success ? new Date().toISOString() : null,
      });

      // Deactivate invalid tokens
      if (!result.success && (result.error === "NotRegistered" || result.error === "InvalidRegistration")) {
        await supabase
          .from("user_devices")
          .update({ is_active: false })
          .eq("fcm_token", device.fcm_token);
      }

      return result.success;
    })
  );

  sent = results.filter(Boolean).length;
  failed = results.filter((r) => !r).length;

  return { sent, failed };
}

async function continueProcessing(campaignId: string, offset: number) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  try {
    logStep("Self-invoking to continue", { campaignId, offset });
    
    const response = await fetch(`${supabaseUrl}/functions/v1/send-marketing-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ campaignId, continueFrom: offset }),
    });
    
    if (!response.ok) {
      logStep("Self-invoke failed", { status: response.status });
    }
  } catch (error) {
    logStep("Self-invoke error", { error: String(error) });
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
    const { campaignId, continueFrom } = await req.json() as CampaignRequest;
    const startOffset = continueFrom || 0;

    if (!campaignId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Missing campaignId" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Processing campaign", { campaignId, startOffset });

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      logStep("Campaign not found", { error: campaignError?.message });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Campaign not found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Check if campaign was cancelled or should be processed
    if (campaign.status === "cancelled") {
      logStep("Campaign was cancelled, stopping processing");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Campaign was cancelled" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (campaign.status !== "pending" && campaign.status !== "processing") {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Campaign already ${campaign.status}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // For initial request, get total count and set status
    if (startOffset === 0) {
      let countQuery = supabase
        .from("user_devices")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      if (campaign.target_device_type && campaign.target_device_type !== "all") {
        countQuery = countQuery.eq("device_type", campaign.target_device_type);
      }

      const { count: totalCount } = await countQuery;

      await supabase
        .from("marketing_campaigns")
        .update({
          status: "processing",
          total_recipients: totalCount || 0,
          started_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      logStep("Campaign started", { totalRecipients: totalCount });
    }

    // Process batches
    let offset = startOffset;
    let totalSent = campaign.sent_count || 0;
    let totalFailed = campaign.failed_count || 0;
    let batchesProcessed = 0;

    while (batchesProcessed < MAX_BATCHES_PER_EXECUTION) {
      // Check if campaign was cancelled before each batch
      const { data: currentCampaign } = await supabase
        .from("marketing_campaigns")
        .select("status")
        .eq("id", campaignId)
        .single();

      if (currentCampaign?.status === "cancelled") {
        logStep("Campaign cancelled during processing, stopping");
        return new Response(JSON.stringify({ 
          success: false,
          message: "Campaign cancelled",
          processed: offset,
          sent: totalSent,
          failed: totalFailed,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Fetch batch of devices
      let batchQuery = supabase
        .from("user_devices")
        .select("fcm_token, user_id, device_type")
        .eq("is_active", true)
        .range(offset, offset + BATCH_SIZE - 1);

      if (campaign.target_device_type && campaign.target_device_type !== "all") {
        batchQuery = batchQuery.eq("device_type", campaign.target_device_type);
      }

      const { data: devices, error: devicesError } = await batchQuery;

      if (devicesError) {
        throw new Error(`Failed to fetch devices: ${devicesError.message}`);
      }

      if (!devices || devices.length === 0) {
        // No more devices - campaign complete
        await supabase
          .from("marketing_campaigns")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", campaignId);

        logStep("Campaign completed", { totalSent, totalFailed });
        
        return new Response(JSON.stringify({ 
          success: true,
          message: "Campaign completed",
          totalSent,
          totalFailed,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      batchesProcessed++;
      const batchNumber = Math.floor(offset / BATCH_SIZE) + 1;
      logStep(`Processing batch ${batchNumber}`, { 
        offset, 
        batchSize: devices.length 
      });

      // Process batch
      const { sent, failed } = await processBatch(
        supabase,
        campaignId,
        campaign,
        devices
      );

      totalSent += sent;
      totalFailed += failed;

      // Update progress
      await supabase
        .from("marketing_campaigns")
        .update({
          sent_count: totalSent,
          failed_count: totalFailed,
          current_batch: batchNumber,
        })
        .eq("id", campaignId);

      offset += BATCH_SIZE;

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // More batches remain - trigger continuation
    logStep("Triggering continuation", { nextOffset: offset });
    
    EdgeRuntime.waitUntil(continueProcessing(campaignId, offset));

    return new Response(JSON.stringify({ 
      success: true,
      message: "Batch processed, continuing...",
      processed: offset,
      sent: totalSent,
      failed: totalFailed,
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
