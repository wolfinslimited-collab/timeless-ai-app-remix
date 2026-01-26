import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPLE-WEBHOOK] ${step}${detailsStr}`);
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
  "timeless_premium_monthly": { plan: "premium", credits: 500, type: "subscription" },
  "timeless_premium_yearly": { plan: "premium", credits: 5000, type: "subscription" },
  "timeless_premium_plus_monthly": { plan: "premium_plus", credits: 1000, type: "subscription" },
  "timeless_premium_plus_yearly": { plan: "premium_plus", credits: 7500, type: "subscription" },
  "timeless_credits_350": { plan: "free", credits: 350, type: "consumable" },
  "timeless_credits_700": { plan: "free", credits: 700, type: "consumable" },
  "timeless_credits_1400": { plan: "free", credits: 1400, type: "consumable" },
};

// Apple notification types (App Store Server Notifications V2)
type NotificationType = 
  | 'SUBSCRIBED'
  | 'DID_RENEW'
  | 'DID_CHANGE_RENEWAL_PREF'
  | 'DID_CHANGE_RENEWAL_STATUS'
  | 'DID_FAIL_TO_RENEW'
  | 'GRACE_PERIOD_EXPIRED'
  | 'EXPIRED'
  | 'REFUND'
  | 'REFUND_DECLINED'
  | 'REFUND_REVERSED'
  | 'CONSUMPTION_REQUEST'
  | 'RENEWAL_EXTENDED'
  | 'REVOKE'
  | 'OFFER_REDEEMED'
  | 'PRICE_INCREASE'
  | 'TEST';

interface AppleNotificationPayload {
  notificationType: NotificationType;
  subtype?: string;
  notificationUUID: string;
  data: {
    appAppleId: number;
    bundleId: string;
    bundleVersion: string;
    environment: 'Sandbox' | 'Production';
    signedRenewalInfo?: string;
    signedTransactionInfo?: string;
  };
  version: string;
  signedDate: number;
}

interface TransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate?: number;
  type: string;
  appAccountToken?: string;
  revocationDate?: number;
  revocationReason?: number;
}

interface RenewalInfo {
  autoRenewProductId: string;
  autoRenewStatus: number;
  expirationIntent?: number;
  gracePeriodExpiresDate?: number;
  isInBillingRetryPeriod?: boolean;
  offerIdentifier?: string;
  offerType?: number;
  originalTransactionId: string;
  priceIncreaseStatus?: number;
  productId: string;
  renewalDate?: number;
  signedDate: number;
}

// Decode JWT without verification (Apple signs these, we trust the source)
function decodeJWT(token: string): unknown {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    logStep("JWT decode error", { error: String(error) });
    return null;
  }
}

// Find user by original_transaction_id stored in subscription_id
async function findUserByTransactionId(
  supabase: any,
  originalTransactionId: string
): Promise<{ userId: string; profileId: string } | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id")
    .eq("subscription_id", originalTransactionId)
    .single();

  if (error || !data) {
    logStep("User not found by transaction ID", { originalTransactionId, error: error?.message });
    return null;
  }

  return { userId: (data as any).user_id, profileId: (data as any).id };
}

// Find user by app_account_token (if passed during purchase)
async function findUserByAppAccountToken(
  supabase: any,
  appAccountToken: string
): Promise<{ userId: string; profileId: string } | null> {
  // appAccountToken should be the user's UUID
  const { data, error } = await supabase
    .from("profiles")
    .select("id, user_id")
    .eq("user_id", appAccountToken)
    .single();

  if (error || !data) {
    return null;
  }

  return { userId: (data as any).user_id, profileId: (data as any).id };
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

    const body = await req.json();
    
    // Apple sends the payload as a signed JWT in V2
    const signedPayload = body.signedPayload;
    if (!signedPayload) {
      logStep("No signed payload received");
      return new Response(JSON.stringify({ error: "Missing signedPayload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Decode the main notification payload
    const notificationPayload = decodeJWT(signedPayload) as AppleNotificationPayload | null;
    if (!notificationPayload) {
      logStep("Failed to decode notification payload");
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Notification received", { 
      type: notificationPayload.notificationType,
      subtype: notificationPayload.subtype,
      uuid: notificationPayload.notificationUUID,
      environment: notificationPayload.data.environment 
    });

    // Decode transaction and renewal info if present
    let transactionInfo: TransactionInfo | null = null;
    let renewalInfo: RenewalInfo | null = null;

    if (notificationPayload.data.signedTransactionInfo) {
      transactionInfo = decodeJWT(notificationPayload.data.signedTransactionInfo) as TransactionInfo;
      logStep("Transaction info", { 
        transactionId: transactionInfo?.transactionId,
        originalTransactionId: transactionInfo?.originalTransactionId,
        productId: transactionInfo?.productId 
      });
    }

    if (notificationPayload.data.signedRenewalInfo) {
      renewalInfo = decodeJWT(notificationPayload.data.signedRenewalInfo) as RenewalInfo;
      logStep("Renewal info", { 
        autoRenewStatus: renewalInfo?.autoRenewStatus,
        productId: renewalInfo?.productId 
      });
    }

    // Find the user
    let userInfo: { userId: string; profileId: string } | null = null;
    
    if (transactionInfo?.appAccountToken) {
      userInfo = await findUserByAppAccountToken(supabase, transactionInfo.appAccountToken);
    }
    
    if (!userInfo && transactionInfo?.originalTransactionId) {
      userInfo = await findUserByTransactionId(supabase, transactionInfo.originalTransactionId);
    }

    if (!userInfo) {
      logStep("User not found for notification", { 
        originalTransactionId: transactionInfo?.originalTransactionId,
        appAccountToken: transactionInfo?.appAccountToken 
      });
      // Return 200 to acknowledge receipt (Apple will retry otherwise)
      return new Response(JSON.stringify({ 
        success: true, 
        message: "User not found, notification acknowledged" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { userId, profileId } = userInfo;
    logStep("User found", { userId });

    // Process based on notification type
    switch (notificationPayload.notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW':
      case 'RENEWAL_EXTENDED': {
        // Subscription started or renewed
        const productId = transactionInfo?.productId || renewalInfo?.productId;
        const productMapping = productId ? PRODUCT_MAPPINGS[productId] : null;
        
        if (!productMapping) {
          logStep("Unknown product ID", { productId });
          break;
        }

        const expiresDate = transactionInfo?.expiresDate 
          ? new Date(transactionInfo.expiresDate) 
          : renewalInfo?.renewalDate 
            ? new Date(renewalInfo.renewalDate) 
            : null;

        // Get current credits
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits")
          .eq("user_id", userId)
          .single();

        const currentCredits = profile?.credits || 0;
        const transactionId = transactionInfo?.transactionId || transactionInfo?.originalTransactionId;

        // Check for duplicate
        if (transactionId) {
          const { data: existingTx } = await supabase
            .from("credit_transactions")
            .select("id")
            .eq("reference_id", transactionId)
            .single();

          if (existingTx) {
            logStep("Duplicate transaction, skipping credit award", { transactionId });
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
            subscription_id: transactionInfo?.originalTransactionId,
            source: "ios",
            credits: currentCredits + productMapping.credits,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        // Log transaction
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          type: notificationPayload.notificationType === 'DID_RENEW' ? 'renewal' : 'subscription',
          amount: productMapping.credits,
          description: `iOS ${productMapping.plan} ${notificationPayload.notificationType === 'DID_RENEW' ? 'renewal' : 'subscription'}`,
          reference_id: transactionId,
        });

        // Send push notification
        const notifTitle = notificationPayload.notificationType === 'DID_RENEW' 
          ? '🎉 Subscription Renewed!' 
          : '🎉 Subscription Activated!';
        const notifBody = `Your ${productMapping.plan} plan is active. ${productMapping.credits} credits have been added to your account.`;
        await sendPushNotification(supabaseUrl, supabaseServiceKey, userId, notifTitle, notifBody, { type: 'subscription_renewed' });

        logStep("Subscription updated", { 
          type: notificationPayload.notificationType,
          plan: productMapping.plan, 
          credits: productMapping.credits 
        });
        break;
      }

      case 'DID_CHANGE_RENEWAL_STATUS': {
        // User turned auto-renew on/off
        const autoRenewStatus = renewalInfo?.autoRenewStatus;
        
        if (autoRenewStatus === 0) {
          // Auto-renew turned off (will cancel at period end)
          const expiresDate = transactionInfo?.expiresDate 
            ? new Date(transactionInfo.expiresDate) 
            : null;

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

          logStep("Subscription set to cancel at period end", { expiresDate });
        } else if (autoRenewStatus === 1) {
          // Auto-renew turned back on
          await supabase
            .from("profiles")
            .update({
              subscription_status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);

          // Send push notification
          await sendPushNotification(
            supabaseUrl, supabaseServiceKey, userId,
            '✅ Subscription Reactivated',
            'Your subscription has been reactivated and will renew automatically.',
            { type: 'subscription_reactivated' }
          );

          logStep("Subscription reactivated");
        }
        break;
      }

      case 'EXPIRED':
      case 'GRACE_PERIOD_EXPIRED': {
        // Subscription expired
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

      case 'DID_FAIL_TO_RENEW': {
        // Billing issue - subscription may still be in grace period
        const gracePeriodExpires = renewalInfo?.gracePeriodExpiresDate 
          ? new Date(renewalInfo.gracePeriodExpiresDate) 
          : null;

        await supabase
          .from("profiles")
          .update({
            subscription_status: "past_due",
            subscription_end_date: gracePeriodExpires?.toISOString() || null,
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

        logStep("Subscription billing failed", { gracePeriodExpires });
        break;
      }

      case 'REFUND': {
        // Refund granted - revoke access
        await supabase
          .from("profiles")
          .update({
            plan: "free",
            subscription_status: "refunded",
            credits: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        // Log negative transaction
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          type: "refund",
          amount: 0,
          description: `iOS subscription refunded`,
          reference_id: transactionInfo?.transactionId,
        });

        // Send push notification
        await sendPushNotification(
          supabaseUrl, supabaseServiceKey, userId,
          '💳 Refund Processed',
          'Your subscription refund has been processed. Your account has been reverted to free plan.',
          { type: 'subscription_refunded' }
        );

        logStep("Subscription refunded, access revoked");
        break;
      }

      case 'REVOKE': {
        // Family sharing access revoked
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

        logStep("Subscription access revoked");
        break;
      }

      case 'DID_CHANGE_RENEWAL_PREF': {
        // User changed to a different subscription product
        const newProductId = renewalInfo?.autoRenewProductId;
        if (newProductId) {
          logStep("User will switch to different product at renewal", { newProductId });
        }
        break;
      }

      case 'OFFER_REDEEMED': {
        // Promotional offer redeemed
        logStep("Promotional offer redeemed", { 
          offerIdentifier: renewalInfo?.offerIdentifier,
          offerType: renewalInfo?.offerType 
        });
        break;
      }

      case 'TEST': {
        // Test notification from Apple
        logStep("Test notification received");
        break;
      }

      default:
        logStep("Unhandled notification type", { type: notificationPayload.notificationType });
    }

    // Always return 200 to acknowledge receipt
    return new Response(JSON.stringify({ 
      success: true,
      notificationType: notificationPayload.notificationType,
      processed: true 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Return 200 to prevent Apple from retrying (log the error for debugging)
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
