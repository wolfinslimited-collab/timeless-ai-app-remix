import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GOOGLE-WEBHOOK] ${step}${detailsStr}`);
};

// Send push notification helper
async function sendPushNotification(
  supabaseUrl: string,
  supabaseServiceKey: string,
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ userId, title, body, data }),
    });
    const result = await response.json();
    logStep("Push notification sent", { userId, sent: result.sent });
  } catch (error) {
    logStep("Push notification error", { error: String(error) });
  }
}

// Product ID mappings (same as mobile-subscription)
const PRODUCT_MAPPINGS: Record<string, { plan: string; credits: number; type: 'subscription' | 'consumable' }> = {
  "timeless.premium.monthly": { plan: "premium", credits: 500, type: "subscription" },
  "timeless.premium.yearly": { plan: "premium", credits: 5000, type: "subscription" },
  "timeless.premium_plus.monthly": { plan: "premium_plus", credits: 1000, type: "subscription" },
  "timeless.premium_plus.yearly": { plan: "premium_plus", credits: 7500, type: "subscription" },
  "timeless.credits.350": { plan: "free", credits: 350, type: "consumable" },
  "timeless.credits.700": { plan: "free", credits: 700, type: "consumable" },
  "timeless.credits.1400": { plan: "free", credits: 1400, type: "consumable" },
};

// Google Play notification types
// https://developer.android.com/google/play/billing/rtdn-reference
enum SubscriptionNotificationType {
  SUBSCRIPTION_RECOVERED = 1,      // Recovered from account hold
  SUBSCRIPTION_RENEWED = 2,        // Active subscription renewed
  SUBSCRIPTION_CANCELED = 3,       // Subscription canceled (voluntary or involuntary)
  SUBSCRIPTION_PURCHASED = 4,      // New subscription purchased
  SUBSCRIPTION_ON_HOLD = 5,        // Subscription entered account hold
  SUBSCRIPTION_IN_GRACE_PERIOD = 6, // Subscription entered grace period
  SUBSCRIPTION_RESTARTED = 7,      // User reactivated subscription
  SUBSCRIPTION_PRICE_CHANGE_CONFIRMED = 8,
  SUBSCRIPTION_DEFERRED = 9,       // Subscription deferred
  SUBSCRIPTION_PAUSED = 10,        // Subscription paused
  SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED = 11,
  SUBSCRIPTION_REVOKED = 12,       // Subscription revoked
  SUBSCRIPTION_EXPIRED = 13,       // Subscription expired
  SUBSCRIPTION_PENDING_PURCHASE_CANCELED = 20,
}

enum OneTimePurchaseNotificationType {
  ONE_TIME_PRODUCT_PURCHASED = 1,
  ONE_TIME_PRODUCT_CANCELED = 2,
}

interface GooglePubSubMessage {
  message: {
    data: string; // Base64 encoded
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

interface DeveloperNotification {
  version: string;
  packageName: string;
  eventTimeMillis: string;
  subscriptionNotification?: {
    version: string;
    notificationType: SubscriptionNotificationType;
    purchaseToken: string;
    subscriptionId: string;
  };
  oneTimeProductNotification?: {
    version: string;
    notificationType: OneTimePurchaseNotificationType;
    purchaseToken: string;
    sku: string;
  };
  voidedPurchaseNotification?: {
    purchaseToken: string;
    orderId: string;
    productType: number;
    refundType: number;
  };
  testNotification?: {
    version: string;
  };
}

// Get Google access token using service account
async function getGoogleAccessToken(): Promise<string | null> {
  const serviceAccountJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountJson) {
    logStep("Google Play service account not configured");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = { alg: "RS256", typ: "JWT" };
    const jwtClaims = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };

    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(jwtHeader)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const claimsB64 = btoa(JSON.stringify(jwtClaims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const signatureInput = `${headerB64}.${claimsB64}`;

    const privateKeyPem = serviceAccount.private_key;
    const pemContents = privateKeyPem
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");
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
      encoder.encode(signatureInput)
    );
    
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const jwt = `${signatureInput}.${signatureB64}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    
    const tokenData = await tokenResponse.json();
    return tokenData.access_token || null;
  } catch (error) {
    logStep("Failed to get Google access token", { error: String(error) });
    return null;
  }
}

// Get subscription details from Google Play API
async function getSubscriptionDetails(
  packageName: string,
  subscriptionId: string,
  purchaseToken: string,
  accessToken: string
): Promise<{
  expiryTimeMillis?: string;
  orderId?: string;
  linkedPurchaseToken?: string;
  obfuscatedExternalAccountId?: string;
  paymentState?: number;
  cancelReason?: number;
  userCancellationTimeMillis?: string;
} | null> {
  try {
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${subscriptionId}/tokens/${purchaseToken}`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const data = await response.json();
    
    if (data.error) {
      logStep("Google API error", { error: data.error });
      return null;
    }
    
    return data;
  } catch (error) {
    logStep("Failed to get subscription details", { error: String(error) });
    return null;
  }
}

// Find user by purchase token or order ID stored in subscription_id
async function findUserByPurchaseInfo(
  supabase: any,
  orderId?: string,
  obfuscatedAccountId?: string
): Promise<{ userId: string; profileId: string } | null> {
  // Try to find by order ID first
  if (orderId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id")
      .eq("subscription_id", orderId)
      .single();

    if (!error && data) {
      return { userId: (data as any).user_id, profileId: (data as any).id };
    }
  }

  // Try obfuscated account ID (should be user_id passed during purchase)
  if (obfuscatedAccountId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id")
      .eq("user_id", obfuscatedAccountId)
      .single();

    if (!error && data) {
      return { userId: (data as any).user_id, profileId: (data as any).id };
    }
  }

  return null;
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
    logStep("Webhook received");

    const body = await req.json() as GooglePubSubMessage;
    
    // Decode the Pub/Sub message
    if (!body.message?.data) {
      logStep("No message data received");
      return new Response(JSON.stringify({ error: "Missing message data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const decodedData = atob(body.message.data);
    const notification: DeveloperNotification = JSON.parse(decodedData);

    logStep("Notification received", { 
      packageName: notification.packageName,
      hasSubscription: !!notification.subscriptionNotification,
      hasOneTime: !!notification.oneTimeProductNotification,
      hasVoided: !!notification.voidedPurchaseNotification,
      isTest: !!notification.testNotification
    });

    // Handle test notification
    if (notification.testNotification) {
      logStep("Test notification received");
      return new Response(JSON.stringify({ success: true, type: "test" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle voided purchase (refund)
    if (notification.voidedPurchaseNotification) {
      const { orderId } = notification.voidedPurchaseNotification;
      logStep("Voided purchase notification", { orderId });

      const userInfo = await findUserByPurchaseInfo(supabase, orderId);
      
      if (userInfo) {
        await supabase
          .from("profiles")
          .update({
            plan: "free",
            subscription_status: "refunded",
            credits: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userInfo.userId);

        await supabase.from("credit_transactions").insert({
          user_id: userInfo.userId,
          type: "refund",
          amount: 0,
          description: "Android subscription refunded",
          reference_id: orderId,
        });

        logStep("Subscription refunded", { userId: userInfo.userId });
      }

      return new Response(JSON.stringify({ success: true, type: "voided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle subscription notification
    if (notification.subscriptionNotification) {
      const { notificationType, purchaseToken, subscriptionId } = notification.subscriptionNotification;
      const packageName = notification.packageName;

      logStep("Subscription notification", { 
        type: notificationType, 
        subscriptionId 
      });

      // Get access token to query subscription details
      const accessToken = await getGoogleAccessToken();
      if (!accessToken) {
        logStep("Failed to get access token");
        return new Response(JSON.stringify({ error: "Auth failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200, // Return 200 to acknowledge
        });
      }

      // Get subscription details from Google
      const subscriptionDetails = await getSubscriptionDetails(
        packageName,
        subscriptionId,
        purchaseToken,
        accessToken
      );

      if (!subscriptionDetails) {
        logStep("Failed to get subscription details");
        return new Response(JSON.stringify({ success: true, message: "Could not fetch details" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Subscription details", { 
        orderId: subscriptionDetails.orderId,
        expiryTime: subscriptionDetails.expiryTimeMillis,
        paymentState: subscriptionDetails.paymentState
      });

      // Find the user
      const userInfo = await findUserByPurchaseInfo(
        supabase,
        subscriptionDetails.orderId,
        subscriptionDetails.obfuscatedExternalAccountId
      );

      if (!userInfo) {
        logStep("User not found for notification");
        return new Response(JSON.stringify({ success: true, message: "User not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const { userId } = userInfo;
      const productMapping = PRODUCT_MAPPINGS[subscriptionId];
      const expiresDate = subscriptionDetails.expiryTimeMillis 
        ? new Date(parseInt(subscriptionDetails.expiryTimeMillis))
        : null;

      // Process based on notification type
      switch (notificationType) {
        case SubscriptionNotificationType.SUBSCRIPTION_PURCHASED:
        case SubscriptionNotificationType.SUBSCRIPTION_RENEWED:
        case SubscriptionNotificationType.SUBSCRIPTION_RECOVERED:
        case SubscriptionNotificationType.SUBSCRIPTION_RESTARTED: {
          if (!productMapping) {
            logStep("Unknown subscription ID", { subscriptionId });
            break;
          }

          // Get current credits
          const { data: profile } = await supabase
            .from("profiles")
            .select("credits")
            .eq("user_id", userId)
            .single();

          const currentCredits = (profile as any)?.credits || 0;
          const orderId = subscriptionDetails.orderId;

          // Check for duplicate
          if (orderId) {
            const { data: existingTx } = await supabase
              .from("credit_transactions")
              .select("id")
              .eq("reference_id", orderId)
              .single();

            if (existingTx) {
              logStep("Duplicate transaction, skipping", { orderId });
              break;
            }
          }

          // Update profile
          await supabase
            .from("profiles")
            .update({
              plan: productMapping.plan,
              subscription_status: "active",
              subscription_end_date: expiresDate?.toISOString() || null,
              subscription_id: orderId,
              source: "android",
              credits: currentCredits + productMapping.credits,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          // Log transaction
          const txType = notificationType === SubscriptionNotificationType.SUBSCRIPTION_RENEWED 
            ? 'renewal' 
            : 'subscription';
          
          await supabase.from("credit_transactions").insert({
            user_id: userId,
            type: txType,
            amount: productMapping.credits,
            description: `Android ${productMapping.plan} ${txType}`,
            reference_id: orderId,
          });

          // Send push notification
          const notifTitle = notificationType === SubscriptionNotificationType.SUBSCRIPTION_RENEWED 
            ? '🎉 Subscription Renewed!' 
            : '🎉 Subscription Activated!';
          const notifBody = `Your ${productMapping.plan} plan is active. ${productMapping.credits} credits have been added.`;
          await sendPushNotification(supabaseUrl, supabaseServiceKey, userId, notifTitle, notifBody, { type: 'subscription_renewed' });

          logStep("Subscription activated/renewed", { 
            type: notificationType,
            plan: productMapping.plan 
          });
          break;
        }

        case SubscriptionNotificationType.SUBSCRIPTION_CANCELED: {
          // Check cancel reason
          const cancelReason = subscriptionDetails.cancelReason;
          // 0 = user canceled, 1 = system canceled (payment issue), 2 = replaced, 3 = developer canceled

          await supabase
            .from("profiles")
            .update({
              subscription_status: "cancelling",
              subscription_end_date: expiresDate?.toISOString() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          // Send push notification
          await sendPushNotification(
            supabaseUrl, supabaseServiceKey, userId,
            '📋 Subscription Update',
            'Your subscription will cancel at the end of the billing period.',
            { type: 'subscription_cancelling' }
          );

          logStep("Subscription canceled", { cancelReason, expiresDate });
          break;
        }

        case SubscriptionNotificationType.SUBSCRIPTION_EXPIRED: {
          await supabase
            .from("profiles")
            .update({
              plan: "free",
              subscription_status: "expired",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          // Send push notification
          await sendPushNotification(
            supabaseUrl, supabaseServiceKey, userId,
            '⚠️ Subscription Expired',
            'Your subscription has expired. Renew to continue enjoying premium features.',
            { type: 'subscription_expired' }
          );

          logStep("Subscription expired");
          break;
        }

        case SubscriptionNotificationType.SUBSCRIPTION_ON_HOLD:
        case SubscriptionNotificationType.SUBSCRIPTION_IN_GRACE_PERIOD: {
          await supabase
            .from("profiles")
            .update({
              subscription_status: "past_due",
              subscription_end_date: expiresDate?.toISOString() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          // Send push notification
          await sendPushNotification(
            supabaseUrl, supabaseServiceKey, userId,
            '⚠️ Payment Issue',
            'There was a problem renewing your subscription. Please update your payment method.',
            { type: 'subscription_payment_failed' }
          );

          logStep("Subscription in grace period/on hold", { type: notificationType });
          break;
        }

        case SubscriptionNotificationType.SUBSCRIPTION_PAUSED: {
          await supabase
            .from("profiles")
            .update({
              subscription_status: "paused",
              subscription_end_date: expiresDate?.toISOString() || null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          // Send push notification
          await sendPushNotification(
            supabaseUrl, supabaseServiceKey, userId,
            '⏸️ Subscription Paused',
            'Your subscription has been paused.',
            { type: 'subscription_paused' }
          );

          logStep("Subscription paused");
          break;
        }

        case SubscriptionNotificationType.SUBSCRIPTION_REVOKED: {
          await supabase
            .from("profiles")
            .update({
              plan: "free",
              subscription_status: "revoked",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          // Send push notification
          await sendPushNotification(
            supabaseUrl, supabaseServiceKey, userId,
            '⚠️ Access Revoked',
            'Your subscription access has been revoked.',
            { type: 'subscription_revoked' }
          );

          logStep("Subscription revoked");
          break;
        }

        default:
          logStep("Unhandled notification type", { type: notificationType });
      }

      return new Response(JSON.stringify({ 
        success: true,
        notificationType,
        processed: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle one-time product notification
    if (notification.oneTimeProductNotification) {
      const { notificationType, sku } = notification.oneTimeProductNotification;
      logStep("One-time product notification", { type: notificationType, sku });
      
      // One-time purchases are handled at purchase time via mobile-subscription
      // This notification is primarily for tracking/analytics
      
      return new Response(JSON.stringify({ 
        success: true,
        type: "one_time",
        notificationType 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Return 200 to acknowledge receipt (Google will retry on non-200)
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
