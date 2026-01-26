import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Subscription plans mapping: priceId -> credits, plan name, and display info
const SUBSCRIPTION_PLANS: Record<string, { credits: number; interval: 'month' | 'year'; plan: string; displayName: string; price: string }> = {
  'price_1SsTCRCpOaBygRMzaYvMeCVZ': { credits: 500, interval: 'month', plan: 'premium-monthly', displayName: 'Premium', price: '$9.99/month' },
  'price_1SsTCdCpOaBygRMzezP7vu5t': { credits: 5000, interval: 'year', plan: 'premium-yearly', displayName: 'Premium', price: '$99/year' },
  'price_1SsTD3CpOaBygRMz4Zidlmny': { credits: 1000, interval: 'month', plan: 'premium-plus-monthly', displayName: 'Premium Plus', price: '$19.99/month' },
  'price_1SsTDGCpOaBygRMzr08YAnjw': { credits: 7500, interval: 'year', plan: 'premium-plus-yearly', displayName: 'Premium Plus', price: '$149/year' },
};

// One-time credit packages: priceId -> credits and display info
const CREDIT_PACKAGES: Record<string, { credits: number; packageName: string; price: string }> = {
  'price_1SskytCpOaBygRMzKn3QRWI8': { credits: 350, packageName: 'Starter', price: '$5.00' },
  'price_1Sskz8CpOaBygRMzhfTitmx9': { credits: 700, packageName: 'Plus', price: '$10.00' },
  'price_1SskzeCpOaBygRMzxFMSYoPK': { credits: 1400, packageName: 'Pro', price: '$20.00' },
};

// Timeless branded email template
const createEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Timeless</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background: linear-gradient(180deg, #18181b 0%, #0f0f12 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(139, 92, 246, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.08);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%); border-bottom: 1px solid rgba(139, 92, 246, 0.1);">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="display: inline-block; width: 44px; height: 44px; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%); border-radius: 12px; text-align: center; line-height: 44px;">
                      <span style="font-size: 22px; font-weight: 700; color: #ffffff;">T</span>
                    </div>
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;">
                    <span style="font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Timeless</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          ${content}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px 28px; background: rgba(0, 0, 0, 0.25); text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05);">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px;">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="https://timeless-new.lovable.app" style="color: #a1a1aa; text-decoration: none; font-size: 12px;">Website</a>
                  </td>
                  <td style="color: #3f3f46; font-size: 12px;">•</td>
                  <td style="padding: 0 8px;">
                    <a href="https://timeless-new.lovable.app/help" style="color: #a1a1aa; text-decoration: none; font-size: 12px;">Help Center</a>
                  </td>
                  <td style="color: #3f3f46; font-size: 12px;">•</td>
                  <td style="padding: 0 8px;">
                    <a href="https://timeless-new.lovable.app/support" style="color: #a1a1aa; text-decoration: none; font-size: 12px;">Contact</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 8px; color: #52525b; font-size: 11px;">Timeless AI • Dubai, UAE</p>
              <p style="margin: 0; color: #3f3f46; font-size: 11px;">© ${new Date().getFullYear()} Timeless. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Send subscription confirmation email
async function sendSubscriptionConfirmationEmail(
  email: string,
  displayName: string,
  planDisplayName: string,
  planPrice: string,
  credits: number,
  interval: 'month' | 'year'
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping subscription email");
    return;
  }

  const renewalText = interval === 'year' ? 'annually' : 'monthly';
  
  const emailContent = `
    <tr>
      <td style="padding: 40px 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">🎉</span>
        </div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">Welcome to ${planDisplayName}!</h1>
        <p style="margin: 0 0 32px; font-size: 15px; color: #a1a1aa; text-align: center; line-height: 1.6;">Your subscription is now active. Thank you for choosing Timeless!</p>
        
        <!-- Plan Details Box -->
        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Your Plan</p>
                <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">${planDisplayName}</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 16px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="50%">
                      <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Credits Added</p>
                      <p style="margin: 0; font-size: 18px; font-weight: 700; color: #a78bfa;">+${credits.toLocaleString()}</p>
                    </td>
                    <td width="50%" style="text-align: right;">
                      <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Billing</p>
                      <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">${planPrice}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- What's Included -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin-bottom: 28px;">
          <p style="margin: 0 0 12px; color: #ffffff; font-size: 14px; font-weight: 600;">What's included:</p>
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding: 6px 0;">
                <span style="color: #22c55e; margin-right: 10px;">✓</span>
                <span style="color: #a1a1aa; font-size: 13px;">${credits.toLocaleString()} credits added to your account</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0;">
                <span style="color: #22c55e; margin-right: 10px;">✓</span>
                <span style="color: #a1a1aa; font-size: 13px;">Credits renew ${renewalText}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0;">
                <span style="color: #22c55e; margin-right: 10px;">✓</span>
                <span style="color: #a1a1aa; font-size: 13px;">Access to all AI creation tools</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0;">
                <span style="color: #22c55e; margin-right: 10px;">✓</span>
                <span style="color: #a1a1aa; font-size: 13px;">Priority support</span>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <a href="https://timeless-new.lovable.app/create" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">Start Creating →</a>
            </td>
          </tr>
        </table>
        
        <p style="margin: 24px 0 0; text-align: center; color: #52525b; font-size: 12px;">You can manage your subscription anytime from your account settings.</p>
      </td>
    </tr>
  `;

  const emailHtml = createEmailTemplate(emailContent);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Timeless <noreply@timelessapp.ai>",
        to: [email],
        subject: `🎉 Welcome to ${planDisplayName}! Your subscription is active`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send subscription email:", errorData);
    } else {
      console.log("Subscription confirmation email sent to:", email);
    }
  } catch (err) {
    console.error("Error sending subscription email:", err);
  }
}

// Send credit purchase confirmation email
async function sendCreditPurchaseEmail(
  email: string,
  packageName: string,
  packagePrice: string,
  creditsAdded: number,
  newBalance: number
) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping credit purchase email");
    return;
  }

  const emailContent = `
    <tr>
      <td style="padding: 40px 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">✨</span>
        </div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">Credits Added!</h1>
        <p style="margin: 0 0 32px; font-size: 15px; color: #a1a1aa; text-align: center; line-height: 1.6;">Your purchase was successful. Time to create something amazing!</p>
        
        <!-- Purchase Details Box -->
        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Package Purchased</p>
                <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">${packageName} Pack</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 16px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="50%">
                      <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Credits Added</p>
                      <p style="margin: 0; font-size: 22px; font-weight: 700; color: #a78bfa;">+${creditsAdded.toLocaleString()}</p>
                    </td>
                    <td width="50%" style="text-align: right;">
                      <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Amount Paid</p>
                      <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">${packagePrice}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- New Balance -->
        <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 12px; padding: 20px; margin-bottom: 28px; text-align: center;">
          <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Your New Balance</p>
          <p style="margin: 0; color: #22c55e; font-size: 28px; font-weight: 800;">${newBalance.toLocaleString()} credits</p>
        </div>
        
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <a href="https://timeless-new.lovable.app/create" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">Start Creating →</a>
            </td>
          </tr>
        </table>
        
        <p style="margin: 24px 0 0; text-align: center; color: #52525b; font-size: 12px;">Need more credits? Visit your <a href="https://timeless-new.lovable.app/credits" style="color: #a78bfa; text-decoration: none;">Credits page</a> anytime.</p>
      </td>
    </tr>
  `;

  const emailHtml = createEmailTemplate(emailContent);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Timeless <noreply@timelessapp.ai>",
        to: [email],
        subject: `✨ ${creditsAdded.toLocaleString()} credits added to your account!`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send credit purchase email:", errorData);
    } else {
      console.log("Credit purchase email sent to:", email);
    }
  } catch (err) {
    console.error("Error sending credit purchase email:", err);
  }
}

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
        event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET);
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

    // Handle subscription checkout completed
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

      if (type === 'subscription') {
        // Handle subscription activation with credits
        const subscriptionId = session.subscription as string;
        const creditsToAdd = parseInt(session.metadata?.credits || '0', 10);
        
        console.log(`Activating subscription ${subscriptionId} for user ${userId} with ${creditsToAdd} credits`);

        // Get subscription details to determine the plan
        let planName = 'premium-monthly'; // default
        let planInfo = SUBSCRIPTION_PLANS['price_1SsTCRCpOaBygRMzaYvMeCVZ']; // default
        let priceId: string | undefined;
        
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          priceId = subscription.items.data[0]?.price?.id;
          if (priceId && SUBSCRIPTION_PLANS[priceId]) {
            planName = SUBSCRIPTION_PLANS[priceId].plan;
            planInfo = SUBSCRIPTION_PLANS[priceId];
          }
          console.log(`Subscription price: ${priceId}, plan: ${planName}`);
        } catch (subError) {
          console.log("Could not retrieve subscription details, using default plan:", subError);
        }

        // Get current credits and user email
        const { data: profile, error: fetchError } = await supabase
          .from("profiles")
          .select("credits, display_name")
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
          .update({ 
            subscription_status: 'active',
            subscription_id: subscriptionId,
            plan: planName,
            credits: newCredits,
          })
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error updating subscription:", updateError.message);
          throw new Error("Failed to update subscription");
        }

        // Log the subscription credit transaction
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: creditsToAdd,
          type: 'subscription',
          description: 'Subscription credits',
          reference_id: subscriptionId,
        });

        // Send subscription confirmation email
        const userEmail = session.customer_email || session.customer_details?.email;
        if (userEmail && planInfo) {
          try {
            await sendSubscriptionConfirmationEmail(
              userEmail,
              profile?.display_name || 'there',
              planInfo.displayName,
              planInfo.price,
              planInfo.credits,
              planInfo.interval
            );
          } catch (emailErr) {
            console.log("Failed to send subscription confirmation email (non-critical):", emailErr);
          }
        }

        // Complete referral bonus for referrer when referred user subscribes
        try {
          // Get referrer info before completing referral
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, referred_by")
            .eq("user_id", userId)
            .single();

          let referrerUserId: string | null = null;
          
          if (profileData?.referred_by) {
            // Get the referrer's user_id for email notification
            const { data: referrerProfile } = await supabase
              .from("profiles")
              .select("user_id")
              .eq("id", profileData.referred_by)
              .single();
            
            referrerUserId = referrerProfile?.user_id || null;
          }

          await supabase.rpc('complete_referral', { p_user_id: userId });
          console.log(`Referral completion checked for user ${userId}`);

          // Send email notification to referrer
          if (referrerUserId) {
            try {
              const notifyResponse = await fetch(
                `${Deno.env.get('SUPABASE_URL')}/functions/v1/referral-notification`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  },
                  body: JSON.stringify({
                    referrerUserId,
                    creditsAwarded: 50,
                  }),
                }
              );
              console.log(`Referral notification sent, status: ${notifyResponse.status}`);
            } catch (notifyErr) {
              console.log(`Referral notification failed (non-critical):`, notifyErr);
            }
          }
        } catch (err) {
          console.log(`Referral completion skipped or already done for ${userId}:`, err);
        }

        console.log(`Subscription activated for user ${userId}, credits: ${currentCredits} -> ${newCredits}`);
      } else if (type === 'credits') {
        // Handle one-time credit purchase
        const creditsToAdd = parseInt(session.metadata?.credits || '0', 10);
        const priceId = session.metadata?.price_id;
        
        if (!creditsToAdd) {
          console.error("Missing credits in session metadata");
          return new Response(
            JSON.stringify({ error: "Invalid credits metadata" }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Adding ${creditsToAdd} credits to user ${userId}`);

        // Get package info for email
        let packageInfo = { packageName: 'Credit', price: '' };
        if (priceId && CREDIT_PACKAGES[priceId]) {
          packageInfo = CREDIT_PACKAGES[priceId];
        }

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

        // Log the credit purchase transaction
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: creditsToAdd,
          type: 'purchase',
          description: `Purchased ${creditsToAdd} credits`,
          reference_id: session.id,
        });

        // Send credit purchase confirmation email
        const userEmail = session.customer_email || session.customer_details?.email;
        if (userEmail) {
          try {
            await sendCreditPurchaseEmail(
              userEmail,
              packageInfo.packageName,
              packageInfo.price,
              creditsToAdd,
              newCredits
            );
          } catch (emailErr) {
            console.log("Failed to send credit purchase email (non-critical):", emailErr);
          }
        }

        console.log(`Credits updated: ${currentCredits} -> ${newCredits}`);
      }
    }

    // Handle subscription renewal (invoice paid)
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      
      if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
        const subscriptionId = invoice.subscription as string;
        
        // Get subscription details to find the price and user
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const userId = subscription.metadata?.user_id;
        const priceId = subscription.items.data[0]?.price.id;
        
        if (userId && priceId && SUBSCRIPTION_PLANS[priceId]) {
          const creditsToAdd = SUBSCRIPTION_PLANS[priceId].credits;
          
          console.log(`Subscription renewal for user ${userId}, adding ${creditsToAdd} credits`);

          const { data: profile, error: fetchError } = await supabase
            .from("profiles")
            .select("credits")
            .eq("user_id", userId)
            .single();

          if (!fetchError && profile) {
            const currentCredits = profile.credits ?? 0;
            const newCredits = currentCredits + creditsToAdd;

            const { error: updateError } = await supabase
              .from("profiles")
              .update({ credits: newCredits })
              .eq("user_id", userId);

            if (!updateError) {
              // Log the renewal credit transaction
              await supabase.from("credit_transactions").insert({
                user_id: userId,
                amount: creditsToAdd,
                type: 'subscription',
                description: 'Subscription renewal credits',
                reference_id: subscriptionId,
              });
              console.log(`Renewal credits added: ${currentCredits} -> ${newCredits}`);
            }
          }
        }
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
