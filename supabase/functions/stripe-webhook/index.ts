import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!STRIPE_SECRET_KEY) {
      throw new Error("Stripe is not configured");
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (STRIPE_WEBHOOK_SECRET && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // For development, parse the event without verification
      event = JSON.parse(body);
      console.log("⚠️ Webhook signature verification skipped (no secret configured)");
    }

    console.log(`Received Stripe event: ${event.type}`);

    // Use service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle one-time payment completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const userId = session.metadata?.user_id;
      const type = session.metadata?.type;

      if (!userId) {
        console.error("Missing user_id in session metadata");
        return new Response(
          JSON.stringify({ error: "Invalid session metadata" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (type === 'credits') {
        // Handle credit purchase
        const creditsToAdd = parseInt(session.metadata?.credits || '0', 10);
        
        if (!creditsToAdd) {
          console.error("Missing credits in session metadata");
          return new Response(
            JSON.stringify({ error: "Invalid credits metadata" }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Adding ${creditsToAdd} credits to user ${userId}`);

        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("credits")
          .eq("user_id", userId)
          .single();

        if (fetchError) {
          console.error("Error fetching profile:", fetchError.message);
          throw new Error("Failed to fetch user profile");
        }

        const currentCredits = profile?.credits ?? 0;
        const newCredits = currentCredits + creditsToAdd;

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ credits: newCredits })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error updating credits:", updateError.message);
          throw new Error("Failed to update credits");
        }

        console.log(`Credits updated: ${currentCredits} -> ${newCredits}`);
      } else if (type === 'subscription') {
        // Handle subscription activation
        const subscriptionId = session.subscription as string;
        
        console.log(`Activating subscription ${subscriptionId} for user ${userId}`);

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            subscription_status: 'active',
            subscription_id: subscriptionId,
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error updating subscription:", updateError.message);
          throw new Error("Failed to update subscription");
        }

        console.log(`Subscription activated for user ${userId}`);
      }
    }

    // Handle subscription updated (renewal, plan change)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        const status = subscription.status === 'active' ? 'active' : 
                       subscription.status === 'past_due' ? 'past_due' : 'inactive';
        
        const endDate = new Date(subscription.current_period_end * 1000).toISOString();

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            subscription_status: status,
            subscription_end_date: endDate,
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error updating subscription status:", updateError.message);
        } else {
          console.log(`Subscription status updated to ${status} for user ${userId}`);
        }
      }
    }

    // Handle subscription canceled
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ 
            subscription_status: 'canceled',
            subscription_id: null,
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error canceling subscription:", updateError.message);
        } else {
          console.log(`Subscription canceled for user ${userId}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
