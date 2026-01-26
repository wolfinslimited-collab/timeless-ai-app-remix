import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace("Bearer ", "");
    
    // Use service role key to validate the token
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body for cancellation reason
    const { reason, feedback } = await req.json();
    logStep("Cancellation request", { reason, hasFeedback: !!feedback });

    // Map frontend reasons to Stripe's valid feedback values
    const stripeFeedbackMap: Record<string, string> = {
      "too_expensive": "too_expensive",
      "not_using": "unused",
      "missing_features": "missing_features",
      "found_alternative": "switched_service",
      "technical_issues": "low_quality",
      "temporary": "other",
      "other": "other",
    };
    const stripeFeedback = stripeFeedbackMap[reason] || "other";

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });
    
    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }
    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found");
    }

    const subscription = subscriptions.data[0];
    logStep("Found active subscription", { subscriptionId: subscription.id });

    // Cancel subscription at period end (user keeps access until billing period ends)
    const cancelledSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
      cancellation_details: {
        comment: feedback || undefined,
        feedback: stripeFeedback as Stripe.SubscriptionUpdateParams.CancellationDetails.Feedback,
      },
    });
    
    // Safely handle the period end date
    const periodEndTimestamp = cancelledSubscription.current_period_end;
    const periodEndDate = periodEndTimestamp 
      ? new Date(periodEndTimestamp * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days
    
    logStep("Subscription cancelled", { 
      subscriptionId: cancelledSubscription.id,
      cancelAtPeriodEnd: cancelledSubscription.cancel_at_period_end,
      currentPeriodEnd: periodEndDate
    });

    // Update profile with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    await supabaseAdmin
      .from("profiles")
      .update({
        subscription_status: "cancelling",
        subscription_end_date: periodEndDate,
      })
      .eq("id", user.id);
    logStep("Profile updated with cancellation status");

    return new Response(JSON.stringify({ 
      success: true,
      cancelAt: periodEndDate
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in cancel-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
