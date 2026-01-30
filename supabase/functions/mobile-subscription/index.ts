import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MOBILE-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product ID mappings for iOS and Android
// Include App Store Connect / Google Play product IDs and any product_id returned in Apple receipts (renewals, legacy IDs)
const PRODUCT_MAPPINGS: Record<string, { plan: string; credits: number; type: 'subscription' | 'consumable' }> = {
  // iOS Product IDs (from App Store Connect)
  "com.timeless.premium.monthly": { plan: "premium", credits: -1, type: "subscription" }, // -1 = unlimited
  "com.timeless.premium.yearly": { plan: "premium", credits: -1, type: "subscription" },
  "credits_1500_ios": { plan: "free", credits: 1500, type: "consumable" },
  // Apple receipt can return alternate product_id (renewals, legacy, sandbox)
  "basic_weekly": { plan: "premium", credits: -1, type: "subscription" },
  "basic_monthly": { plan: "premium", credits: -1, type: "subscription" },
  "basic_monthly_renew": { plan: "premium", credits: -1, type: "subscription" },
  "basic_yearly": { plan: "premium", credits: -1, type: "subscription" },
  "66": { plan: "premium", credits: -1, type: "subscription" },
  "22": { plan: "premium", credits: -1, type: "subscription" },

  // Android Product IDs (from Google Play Console)
  "timeless.premium.monthly": { plan: "premium", credits: -1, type: "subscription" },
  "timeless.premium.yearly": { plan: "premium", credits: -1, type: "subscription" },
  "credits_1500_android": { plan: "free", credits: 1500, type: "consumable" },
};

// Apple App Store Receipt Verification
async function verifyAppleReceipt(receiptData: string, isSandbox = false): Promise<{
  isValid: boolean;
  productId?: string;
  expiresDate?: Date;
  transactionId?: string;
  originalTransactionId?: string;
  error?: string;
}> {
  const appleSharedSecret = Deno.env.get("APPLE_SHARED_SECRET");
  if (!appleSharedSecret) {
    return { isValid: false, error: "Apple shared secret not configured" };
  }

  const verifyUrl = isSandbox 
    ? "https://sandbox.itunes.apple.com/verifyReceipt"
    : "https://buy.itunes.apple.com/verifyReceipt";

  try {
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "receipt-data": receiptData,
        "password": appleSharedSecret,
        "exclude-old-transactions": true,
      }),
    });

    const result = await response.json();
    logStep("Apple verification response", { status: result.status });

    // Status 21007 means receipt is from sandbox, retry with sandbox URL
    if (result.status === 21007 && !isSandbox) {
      return verifyAppleReceipt(receiptData, true);
    }

    if (result.status !== 0) {
      return { isValid: false, error: `Apple verification failed with status: ${result.status}` };
    }

    // Get the latest receipt info
    const latestReceipt = result.latest_receipt_info?.[0] || result.receipt?.in_app?.[0];
    if (!latestReceipt) {
      return { isValid: false, error: "No receipt info found" };
    }

    const expiresDate = latestReceipt.expires_date_ms 
      ? new Date(parseInt(latestReceipt.expires_date_ms))
      : undefined;

    return {
      isValid: true,
      productId: latestReceipt.product_id,
      expiresDate,
      transactionId: latestReceipt.transaction_id,
      originalTransactionId: latestReceipt.original_transaction_id,
    };
  } catch (error) {
    logStep("Apple verification error", { error: String(error) });
    return { isValid: false, error: String(error) };
  }
}

// Google Play Receipt Verification
async function verifyGoogleReceipt(
  packageName: string,
  productId: string,
  purchaseToken: string,
  isSubscription: boolean
): Promise<{
  isValid: boolean;
  productId?: string;
  expiresDate?: Date;
  transactionId?: string;
  originalTransactionId?: string;
  error?: string;
}> {
  const serviceAccountJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!serviceAccountJson) {
    return { isValid: false, error: "Google Play service account not configured" };
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Generate JWT for Google API authentication
    const now = Math.floor(Date.now() / 1000);
    const jwtHeader = { alg: "RS256", typ: "JWT" };
    const jwtClaims = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    };

    // Encode JWT parts
    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(jwtHeader)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const claimsB64 = btoa(JSON.stringify(jwtClaims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const signatureInput = `${headerB64}.${claimsB64}`;

    // Import private key and sign
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

    // Get access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return { isValid: false, error: "Failed to get Google access token" };
    }

    // Verify purchase with Google Play API
    const apiPath = isSubscription 
      ? `subscriptions/${productId}/tokens/${purchaseToken}`
      : `products/${productId}/purchases/${purchaseToken}`;
    
    const verifyUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/${apiPath}`;
    
    const verifyResponse = await fetch(verifyUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    const purchaseData = await verifyResponse.json();
    logStep("Google verification response", { purchaseData });

    if (purchaseData.error) {
      return { isValid: false, error: purchaseData.error.message };
    }

    // Check purchase state
    const purchaseState = isSubscription 
      ? purchaseData.paymentState 
      : purchaseData.purchaseState;
    
    if (purchaseState !== 1 && purchaseState !== 0) {
      return { isValid: false, error: "Purchase not valid or canceled" };
    }

    const expiresDate = purchaseData.expiryTimeMillis 
      ? new Date(parseInt(purchaseData.expiryTimeMillis))
      : undefined;

    return {
      isValid: true,
      expiresDate,
      transactionId: purchaseData.orderId,
    };
  } catch (error) {
    logStep("Google verification error", { error: String(error) });
    return { isValid: false, error: String(error) };
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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const { action, platform, receiptData, productId, purchaseToken, packageName } = body;

    logStep("Request received", { action, platform, productId });

    if (action === "verify") {
      // Verify and process purchase
      let verificationResult;
      
      if (platform === "ios") {
        verificationResult = await verifyAppleReceipt(receiptData);
      } else if (platform === "android") {
        if (!packageName || !purchaseToken) {
          throw new Error("Missing packageName or purchaseToken for Android verification");
        }
        const productMapping = PRODUCT_MAPPINGS[productId];
        const isSubscription = productMapping?.type === "subscription";
        verificationResult = await verifyGoogleReceipt(packageName, productId, purchaseToken, isSubscription);
        verificationResult.productId = productId;
      } else {
        throw new Error("Invalid platform. Use 'ios' or 'android'");
      }

      if (!verificationResult.isValid) {
        logStep("Verification failed", { error: verificationResult.error });
        return new Response(JSON.stringify({ 
          success: false, 
          error: verificationResult.error 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const verifiedProductId = verificationResult.productId;
      const productMapping = PRODUCT_MAPPINGS[verifiedProductId || ""];
      
      if (!productMapping) {
        logStep("Unknown product ID", { productId: verifiedProductId });
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Unknown product ID: ${verifiedProductId}` 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Get current profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits, plan, subscription_status")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw new Error(`Profile error: ${profileError.message}`);

      const currentCredits = profile?.credits || 0;
      const transactionId = verificationResult.transactionId || verificationResult.originalTransactionId;

      // Process based on purchase type
      if (productMapping.type === "subscription") {
        // Update subscription status
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            plan: productMapping.plan,
            subscription_status: "active",
            subscription_end_date: verificationResult.expiresDate?.toISOString() || null,
            subscription_id: transactionId,
            credits: currentCredits + productMapping.credits,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) throw new Error(`Update error: ${updateError.message}`);

        logStep("Subscription activated", { plan: productMapping.plan, credits: productMapping.credits });

      } else {
        // Credit pack purchase
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            credits: currentCredits + productMapping.credits,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) throw new Error(`Update error: ${updateError.message}`);

        logStep("Credits added", { credits: productMapping.credits });
      }

      return new Response(JSON.stringify({ 
        success: true,
        productId: verifiedProductId,
        credits: productMapping.credits,
        plan: productMapping.plan,
        type: productMapping.type,
        expiresDate: verificationResult.expiresDate?.toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (action === "check") {
      // Check current subscription status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits, plan, subscription_status, subscription_end_date")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw new Error(`Profile error: ${profileError.message}`);

      return new Response(JSON.stringify({ 
        success: true,
        credits: profile?.credits || 0,
        plan: profile?.plan || "free",
        subscriptionStatus: profile?.subscription_status || "none",
        subscriptionEndDate: profile?.subscription_end_date,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (action === "restore") {
      // Restore purchases - re-verify and update status
      if (platform === "ios" && receiptData) {
        const verificationResult = await verifyAppleReceipt(receiptData);
        
        if (verificationResult.isValid && verificationResult.expiresDate) {
          const isActive = verificationResult.expiresDate > new Date();
          const productMapping = PRODUCT_MAPPINGS[verificationResult.productId || ""];
          
          if (isActive && productMapping) {
            await supabase
              .from("profiles")
              .update({
                plan: productMapping.plan,
                subscription_status: "active",
                subscription_end_date: verificationResult.expiresDate.toISOString(),
                subscription_id: verificationResult.originalTransactionId,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id);

            logStep("Subscription restored", { plan: productMapping.plan });

            return new Response(JSON.stringify({ 
              success: true,
              restored: true,
              plan: productMapping.plan,
              expiresDate: verificationResult.expiresDate.toISOString(),
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        }

        return new Response(JSON.stringify({ 
          success: true,
          restored: false,
          message: "No active subscription found to restore",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      throw new Error("Restore requires iOS receiptData");

    } else {
      throw new Error("Invalid action. Use 'verify', 'check', or 'restore'");
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
