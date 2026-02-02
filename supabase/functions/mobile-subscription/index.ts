import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MOBILE-SUBSCRIPTION] ${step}${detailsStr}`);
};

interface ProductMapping {
  plan: string;
  credits: number;
  type: "subscription" | "consumable";
}

// Hardcoded fallback product mappings (used when database tables don't exist)
// IMPORTANT: Include ALL product IDs that may exist in pending transactions
const FALLBACK_PRODUCT_MAPPINGS: Record<string, ProductMapping> = {
  // === CURRENT iOS Product IDs (from App Store Connect) ===
  "com.timeless.premium.monthly": { plan: "premium", credits: 0, type: "subscription" },
  "com.timeless.premium.yearly": { plan: "premium", credits: 0, type: "subscription" },
  credits_1500_ios: { plan: "free", credits: 1500, type: "consumable" },

  // === LEGACY iOS Product IDs (for pending transactions cleanup) ===
  basic_weekly: { plan: "premium", credits: 0, type: "subscription" },
  basic_monthly: { plan: "premium", credits: 0, type: "subscription" },
  basic_monthly_renew: { plan: "premium", credits: 0, type: "subscription" },
  basic_yearly: { plan: "premium", credits: 0, type: "subscription" },
  timeless_premium_monthly: { plan: "premium", credits: 500, type: "subscription" },
  timeless_premium_yearly: { plan: "premium", credits: 5000, type: "subscription" },
  timeless_premium_plus_monthly: { plan: "premium_plus", credits: 1000, type: "subscription" },
  timeless_premium_plus_yearly: { plan: "premium_plus", credits: 7500, type: "subscription" },
  timeless_credits_350: { plan: "free", credits: 350, type: "consumable" },
  timeless_credits_700: { plan: "free", credits: 700, type: "consumable" },
  timeless_credits_1400: { plan: "free", credits: 1400, type: "consumable" },

  // === Android Product IDs ===
  "timeless.premium.monthly": { plan: "premium", credits: 500, type: "subscription" },
  "timeless.premium.yearly": { plan: "premium", credits: 5000, type: "subscription" },
  "timeless.premium_plus.monthly": { plan: "premium_plus", credits: 1000, type: "subscription" },
  "timeless.premium_plus.yearly": { plan: "premium_plus", credits: 7500, type: "subscription" },
  "timeless.credits.350": { plan: "free", credits: 350, type: "consumable" },
  "timeless.credits.700": { plan: "free", credits: 700, type: "consumable" },
  "timeless.credits.1400": { plan: "free", credits: 1400, type: "consumable" },
  credits_1500_android: { plan: "free", credits: 1500, type: "consumable" },
};

// Fetch product mappings dynamically from database, ALWAYS including fallback mappings
async function getProductMappings(supabase: any, platform: "ios" | "android"): Promise<Record<string, ProductMapping>> {
  logStep("=== getProductMappings START ===", { platform });
  
  // ALWAYS start with fallback mappings to ensure legacy product IDs are recognized
  const mappings: Record<string, ProductMapping> = { ...FALLBACK_PRODUCT_MAPPINGS };
  const productIdColumn = platform === "ios" ? "apple_product_id" : "android_product_id";
  
  logStep("Using product ID column", { productIdColumn, fallbackMappingsCount: Object.keys(FALLBACK_PRODUCT_MAPPINGS).length });

  try {
    // Try to fetch subscription plans from database (will override fallback if found)
    logStep("Fetching subscription_plans from database...");
    const { data: plans, error: plansError } = await supabase
      .from("subscription_plans")
      .select(`id, name, credits, ${productIdColumn}`)
      .eq("is_active", true);

    if (plansError) {
      logStep("ERROR: Failed to fetch subscription_plans", { 
        errorMessage: plansError.message, 
        errorCode: plansError.code,
        errorDetails: plansError.details,
        errorHint: plansError.hint
      });
    } else {
      logStep("subscription_plans query result", { 
        rowCount: plans?.length || 0, 
        rawData: JSON.stringify(plans)
      });
      
      if (plans && plans.length > 0) {
        for (const plan of plans) {
          const productId = plan[productIdColumn];
          logStep("Processing plan row", { 
            planId: plan.id, 
            planName: plan.name, 
            credits: plan.credits,
            productIdColumnValue: productId,
            hasProductId: !!productId
          });
          
          if (productId) {
            const planName = plan.name.toLowerCase().includes("plus")
              ? "premium_plus"
              : plan.name.toLowerCase().includes("premium")
                ? "premium"
                : "free";
            mappings[productId] = {
              plan: planName,
              credits: plan.credits || 0,
              type: "subscription",
            };
            logStep("Added/updated subscription mapping", { productId, planName, credits: plan.credits || 0 });
          } else {
            logStep("SKIPPED plan - no product ID for platform", { planId: plan.id, planName: plan.name, platform });
          }
        }
      } else {
        logStep("No active subscription_plans found in database");
      }
    }

    // Try to fetch credit packages from database (will override fallback if found)
    logStep("Fetching credit_packages from database...");
    const { data: packages, error: packagesError } = await supabase
      .from("credit_packages")
      .select(`id, name, credits, ${productIdColumn}`)
      .eq("is_active", true);

    if (packagesError) {
      logStep("ERROR: Failed to fetch credit_packages", { 
        errorMessage: packagesError.message, 
        errorCode: packagesError.code,
        errorDetails: packagesError.details,
        errorHint: packagesError.hint
      });
    } else {
      logStep("credit_packages query result", { 
        rowCount: packages?.length || 0, 
        rawData: JSON.stringify(packages)
      });
      
      if (packages && packages.length > 0) {
        for (const pkg of packages) {
          const productId = pkg[productIdColumn];
          logStep("Processing package row", { 
            pkgId: pkg.id, 
            pkgName: pkg.name, 
            credits: pkg.credits,
            productIdColumnValue: productId,
            hasProductId: !!productId
          });
          
          if (productId) {
            mappings[productId] = {
              plan: "free",
              credits: pkg.credits || 0,
              type: "consumable",
            };
            logStep("Added/updated consumable mapping", { productId, credits: pkg.credits || 0 });
          } else {
            logStep("SKIPPED package - no product ID for platform", { pkgId: pkg.id, pkgName: pkg.name, platform });
          }
        }
      } else {
        logStep("No active credit_packages found in database");
      }
    }

    logStep("=== getProductMappings COMPLETE ===", {
      platform,
      totalMappings: Object.keys(mappings).length,
      allMappingKeys: Object.keys(mappings)
    });
  } catch (error) {
    logStep("EXCEPTION in getProductMappings", { 
      error: String(error), 
      stack: error instanceof Error ? error.stack : undefined 
    });
  }

  return mappings;
}

// Apple App Store Receipt Verification
async function verifyAppleReceipt(
  receiptData: string,
  isSandbox = false,
): Promise<{
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
        password: appleSharedSecret,
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

    const expiresDate = latestReceipt.expires_date_ms ? new Date(parseInt(latestReceipt.expires_date_ms)) : undefined;

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
  isSubscription: boolean,
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
    const headerB64 = btoa(JSON.stringify(jwtHeader)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const claimsB64 = btoa(JSON.stringify(jwtClaims)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const signatureInput = `${headerB64}.${claimsB64}`;

    // Import private key and sign
    const privateKeyPem = serviceAccount.private_key;
    const pemContents = privateKeyPem
      .replace("-----BEGIN PRIVATE KEY-----", "")
      .replace("-----END PRIVATE KEY-----", "")
      .replace(/\s/g, "");
    const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(signatureInput));

    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

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
    const purchaseState = isSubscription ? purchaseData.paymentState : purchaseData.purchaseState;

    if (purchaseState !== 1 && purchaseState !== 0) {
      return { isValid: false, error: "Purchase not valid or canceled" };
    }

    const expiresDate = purchaseData.expiryTimeMillis ? new Date(parseInt(purchaseData.expiryTimeMillis)) : undefined;

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
  logStep("========== REQUEST RECEIVED ==========");
  logStep("Request method", { method: req.method });
  
  if (req.method === "OPTIONS") {
    logStep("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  logStep("Environment check", { 
    hasSupabaseUrl: !!supabaseUrl, 
    hasServiceKey: !!supabaseServiceKey,
    supabaseUrlPrefix: supabaseUrl?.substring(0, 30) + "..."
  });
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    logStep("Function execution started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    logStep("Auth header check", { hasAuthHeader: !!authHeader, headerLength: authHeader?.length });
    
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token", { tokenLength: token.length, tokenPrefix: token.substring(0, 20) + "..." });
    
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError) {
      logStep("AUTH ERROR", { message: userError.message, status: userError.status });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    logStep("User authenticated successfully", { userId: user.id, email: user.email });

    const body = await req.json();
    logStep("Request body parsed", { 
      action: body.action, 
      platform: body.platform, 
      productId: body.productId,
      hasReceiptData: !!body.receiptData,
      receiptDataLength: body.receiptData?.length,
      hasPurchaseToken: !!body.purchaseToken,
      packageName: body.packageName
    });
    
    const { action, platform, receiptData, productId, purchaseToken, packageName } = body;

    if (action === "verify") {
      logStep("=== VERIFY ACTION START ===", { platform, productId });
      
      // Fetch product mappings dynamically based on platform
      const PRODUCT_MAPPINGS = await getProductMappings(supabase, platform as "ios" | "android");
      
      logStep("Product mappings loaded for verification", { 
        requestedProductId: productId,
        isProductIdInMappings: !!PRODUCT_MAPPINGS[productId],
        mappingForProductId: PRODUCT_MAPPINGS[productId] ? JSON.stringify(PRODUCT_MAPPINGS[productId]) : "NOT FOUND"
      });

      // Verify and process purchase
      let verificationResult;

      if (platform === "ios") {
        logStep("Starting iOS Apple receipt verification", { receiptDataLength: receiptData?.length });
        verificationResult = await verifyAppleReceipt(receiptData);
        logStep("iOS verification result", { 
          isValid: verificationResult.isValid, 
          productId: verificationResult.productId,
          error: verificationResult.error 
        });
      } else if (platform === "android") {
        logStep("Starting Android Google Play verification", { packageName, productId, hasPurchaseToken: !!purchaseToken });
        
        if (!packageName || !purchaseToken) {
          logStep("ERROR: Missing Android verification params", { hasPackageName: !!packageName, hasPurchaseToken: !!purchaseToken });
          throw new Error("Missing packageName or purchaseToken for Android verification");
        }
        
        const productMapping = PRODUCT_MAPPINGS[productId];
        const isSubscription = productMapping?.type === "subscription";
        
        logStep("Android product type determined", { 
          productId, 
          foundMapping: !!productMapping, 
          isSubscription,
          mappingDetails: productMapping ? JSON.stringify(productMapping) : "NOT FOUND"
        });
        
        verificationResult = await verifyGoogleReceipt(packageName, productId, purchaseToken, isSubscription);
        verificationResult.productId = productId;
        
        logStep("Android verification result", { 
          isValid: verificationResult.isValid, 
          transactionId: verificationResult.transactionId,
          error: verificationResult.error 
        });
      } else {
        logStep("ERROR: Invalid platform", { platform });
        throw new Error("Invalid platform. Use 'ios' or 'android'");
      }

      if (!verificationResult.isValid) {
        logStep("Verification failed", { error: verificationResult.error });
        return new Response(
          JSON.stringify({
            success: false,
            error: verificationResult.error,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      // Product ID from the receipt (Apple may return legacy IDs e.g. basic_weekly)
      let verifiedProductId = verificationResult.productId;
      logStep("Looking up product mapping", { 
        verifiedProductId, 
        requestProductId: productId,
        platform 
      });
      
      let productMapping = PRODUCT_MAPPINGS[verifiedProductId || ""];
      logStep("Initial product mapping lookup", { 
        verifiedProductId, 
        found: !!productMapping,
        mapping: productMapping ? JSON.stringify(productMapping) : "NOT FOUND"
      });

      // iOS: Apple's receipt can contain legacy product IDs. If the receipt is valid but
      // the receipt's product_id is not in our mappings, use the productId from the request.
      if (!productMapping && platform === "ios" && productId && PRODUCT_MAPPINGS[productId]) {
        logStep("Falling back to request productId (receipt had legacy/different ID)", {
          receiptProductId: verifiedProductId,
          requestProductId: productId,
          requestProductMapping: JSON.stringify(PRODUCT_MAPPINGS[productId])
        });
        productMapping = PRODUCT_MAPPINGS[productId];
        verifiedProductId = productId;
      }

      if (!productMapping) {
        logStep("ERROR: Unknown product ID - no mapping found", { 
          verifiedProductId,
          requestProductId: productId,
          availableMappingKeys: Object.keys(PRODUCT_MAPPINGS)
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown product ID: ${verifiedProductId}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
      
      logStep("Product mapping found", { 
        verifiedProductId, 
        plan: productMapping.plan, 
        credits: productMapping.credits, 
        type: productMapping.type 
      });

      // Get current profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits, plan, subscription_status, source")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw new Error(`Profile error: ${profileError.message}`);

      const currentCredits = profile?.credits || 0;
      const transactionId = verificationResult.transactionId || verificationResult.originalTransactionId;

      // Check for duplicate transaction
      if (transactionId) {
        const { data: existingTransaction } = await supabase
          .from("credit_transactions")
          .select("id")
          .eq("reference_id", transactionId)
          .single();

        if (existingTransaction) {
          logStep("Duplicate transaction detected", { transactionId });
          return new Response(
            JSON.stringify({
              success: true,
              message: "Purchase already processed",
              duplicate: true,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            },
          );
        }
      }

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
            source: platform,
            credits: currentCredits + productMapping.credits,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) throw new Error(`Update error: ${updateError.message}`);

        // Log transaction
        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          type: "subscription",
          amount: productMapping.credits,
          description: `${platform.toUpperCase()} ${productMapping.plan} subscription`,
          reference_id: transactionId,
        });

        logStep("Subscription activated", { plan: productMapping.plan, credits: productMapping.credits });
      } else {
        // Credit pack purchase
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            credits: currentCredits + productMapping.credits,
            source: platform,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) throw new Error(`Update error: ${updateError.message}`);

        // Log transaction
        await supabase.from("credit_transactions").insert({
          user_id: user.id,
          type: "purchase",
          amount: productMapping.credits,
          description: `${platform.toUpperCase()} credit pack (${productMapping.credits} credits)`,
          reference_id: transactionId,
        });

        logStep("Credits added", { credits: productMapping.credits });
      }

      return new Response(
        JSON.stringify({
          success: true,
          productId: verifiedProductId,
          credits: productMapping.credits,
          plan: productMapping.plan,
          type: productMapping.type,
          expiresDate: verificationResult.expiresDate?.toISOString(),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } else if (action === "check") {
      // Check current subscription status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits, plan, subscription_status, subscription_end_date, source")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw new Error(`Profile error: ${profileError.message}`);

      return new Response(
        JSON.stringify({
          success: true,
          credits: profile?.credits || 0,
          plan: profile?.plan || "free",
          subscriptionStatus: profile?.subscription_status || "none",
          subscriptionEndDate: profile?.subscription_end_date,
          source: profile?.source || "web",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } else if (action === "restore") {
      // Restore purchases - re-verify and update status
      if (platform === "ios" && receiptData) {
        const verificationResult = await verifyAppleReceipt(receiptData);

        if (verificationResult.isValid && verificationResult.expiresDate) {
          const isActive = verificationResult.expiresDate > new Date();
          // Fetch iOS product mappings for restore
          const PRODUCT_MAPPINGS = await getProductMappings(supabase, "ios");
          const productMapping = PRODUCT_MAPPINGS[verificationResult.productId || ""];

          if (isActive && productMapping) {
            await supabase
              .from("profiles")
              .update({
                plan: productMapping.plan,
                subscription_status: "active",
                subscription_end_date: verificationResult.expiresDate.toISOString(),
                subscription_id: verificationResult.originalTransactionId,
                source: "ios",
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id);

            logStep("Subscription restored", { plan: productMapping.plan });

            return new Response(
              JSON.stringify({
                success: true,
                restored: true,
                plan: productMapping.plan,
                expiresDate: verificationResult.expiresDate.toISOString(),
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              },
            );
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            restored: false,
            message: "No active subscription found to restore",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
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
