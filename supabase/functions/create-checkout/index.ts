import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Credit packages mapping: priceId -> credits
const CREDIT_PACKAGES: Record<string, number> = {
  'price_1SrcTeCpOaBygRMzLIWgPj5N': 50,   // Starter Pack
  'price_1SrcTpCpOaBygRMzleZEbBV6': 150,  // Pro Pack
  'price_1SrcU0CpOaBygRMzYAhHRnqv': 500,  // Ultimate Pack
};

// Subscription price ID
const SUBSCRIPTION_PRICE_ID = 'price_1SrcXaCpOaBygRMz5atgcaW3';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { priceId, isSubscription } = await req.json();

    if (!priceId) {
      throw new Error("Price ID is required");
    }

    // Validate price ID
    if (!isSubscription && !CREDIT_PACKAGES[priceId]) {
      throw new Error("Invalid price ID");
    }

    if (isSubscription && priceId !== SUBSCRIPTION_PRICE_ID) {
      throw new Error("Invalid subscription price ID");
    }

    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    if (!STRIPE_SECRET_KEY) {
      throw new Error("Stripe is not configured");
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log("Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating checkout for user: ${user.id}, price: ${priceId}, subscription: ${isSubscription}`);

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Get the origin from the request
    const origin = req.headers.get('origin') || 'http://localhost:5173';

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: `${origin}/pricing?success=true&type=${isSubscription ? 'subscription' : 'credits'}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        type: isSubscription ? 'subscription' : 'credits',
        credits: isSubscription ? '0' : CREDIT_PACKAGES[priceId].toString(),
      },
    };

    // For subscriptions, add subscription metadata
    if (isSubscription) {
      sessionParams.subscription_data = {
        metadata: {
          user_id: user.id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`Checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating checkout:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
