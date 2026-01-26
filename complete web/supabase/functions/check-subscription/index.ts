import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Subscription plans mapping: priceId -> plan info
const SUBSCRIPTION_PLANS: Record<string, { credits: number; interval: 'month' | 'year'; plan: string }> = {
  'price_1SsTCRCpOaBygRMzaYvMeCVZ': { credits: 500, interval: 'month', plan: 'premium-monthly' },
  'price_1SsTCdCpOaBygRMzezP7vu5t': { credits: 5000, interval: 'year', plan: 'premium-yearly' },
  'price_1SsTD3CpOaBygRMz4Zidlmny': { credits: 1000, interval: 'month', plan: 'premium-plus-monthly' },
  'price_1SsTDGCpOaBygRMzr08YAnjw': { credits: 7500, interval: 'year', plan: 'premium-plus-yearly' },
  // Legacy price IDs
  'price_1SWxx7CpOaBygRMzCWkRsnpS': { credits: 500, interval: 'month', plan: 'premium-monthly' },
  'price_1SWxy1CpOaBygRMz22A4nG6X': { credits: 1000, interval: 'month', plan: 'premium-plus-monthly' },
  'price_1SWxznCpOaBygRMznQrerM4R': { credits: 5000, interval: 'year', plan: 'premium-yearly' },
  'price_1Sr2N9CpOaBygRMzWj0APhqV': { credits: 500, interval: 'month', plan: 'premium-monthly' },
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    // Find customer in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found, updating to unsubscribed state");
      
      // Use service role to update profile
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      await supabaseAdmin
        .from("profiles")
        .update({ 
          subscription_status: "none", 
          plan: "free",
          subscription_end_date: null,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ 
        subscribed: false,
        plan: "free",
        subscription_status: "none",
        message: "No Stripe customer found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let subscribed = false;
    let plan = "free";
    let subscriptionStatus = "none";
    let subscriptionEnd: string | null = null;
    let priceId: string | null = null;

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      subscribed = true;
      subscriptionStatus = "active";
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      priceId = subscription.items.data[0]?.price?.id || null;
      
      // Determine plan from price ID
      if (priceId && SUBSCRIPTION_PLANS[priceId]) {
        plan = SUBSCRIPTION_PLANS[priceId].plan;
      } else {
        plan = "unknown-paid-plan";
      }
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd,
        priceId,
        plan
      });
    } else {
      // Check for canceled but still valid subscriptions
      const canceledSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "canceled",
        limit: 1,
      });
      
      if (canceledSubs.data.length > 0) {
        const canceledSub = canceledSubs.data[0];
        const endDate = new Date(canceledSub.current_period_end * 1000);
        
        if (endDate > new Date()) {
          // Subscription is canceled but still active until period end
          subscribed = true;
          subscriptionStatus = "canceled";
          subscriptionEnd = endDate.toISOString();
          priceId = canceledSub.items.data[0]?.price?.id || null;
          
          if (priceId && SUBSCRIPTION_PLANS[priceId]) {
            plan = SUBSCRIPTION_PLANS[priceId].plan;
          } else {
            plan = "unknown-paid-plan";
          }
          
          logStep("Canceled but active subscription found", { endDate: subscriptionEnd });
        }
      }
      
      if (!subscribed) {
        logStep("No active subscription found");
      }
    }

    // Update profile in database
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        subscription_status: subscriptionStatus,
        plan: plan,
        subscription_end_date: subscriptionEnd,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", user.id);

    if (updateError) {
      logStep("Error updating profile", { error: updateError.message });
    } else {
      logStep("Profile updated successfully", { plan, subscriptionStatus });
    }

    return new Response(JSON.stringify({
      subscribed,
      plan,
      subscription_status: subscriptionStatus,
      subscription_end: subscriptionEnd,
      synced: !updateError,
      message: subscribed ? `Subscription synced: ${plan}` : "No active subscription"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
