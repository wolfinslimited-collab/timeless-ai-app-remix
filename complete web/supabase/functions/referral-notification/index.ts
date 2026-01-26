import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background: linear-gradient(180deg, #18181b 0%, #0f0f12 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(34, 197, 94, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(34, 197, 94, 0.08);">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(22, 163, 74, 0.08) 100%); border-bottom: 1px solid rgba(34, 197, 94, 0.1);">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding-right: 12px; vertical-align: middle;">
                    <!-- Timeless Logo Icon -->
                    <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);">
                      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="44" height="44" rx="12" fill="url(#logo-gradient)"/>
                        <path d="M14 16h16v2H14v-2zm0 5h16v2H14v-2zm0 5h10v2H14v-2z" fill="white" opacity="0.9"/>
                        <circle cx="32" cy="28" r="4" fill="white" opacity="0.9"/>
                        <defs>
                          <linearGradient id="logo-gradient" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                            <stop stop-color="#8b5cf6"/>
                            <stop offset="1" stop-color="#3b82f6"/>
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
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
                    <a href="https://timeless-new.lovable.app/referrals" style="color: #a1a1aa; text-decoration: none; font-size: 12px;">Referrals</a>
                  </td>
                  <td style="color: #3f3f46; font-size: 12px;">•</td>
                  <td style="padding: 0 8px;">
                    <a href="https://timeless-new.lovable.app/credits" style="color: #a1a1aa; text-decoration: none; font-size: 12px;">Credits</a>
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { referrerUserId, creditsAwarded } = await req.json();
    
    if (!referrerUserId || !creditsAwarded) {
      throw new Error("Missing referrerUserId or creditsAwarded");
    }

    console.log(`Processing referral notification for user ${referrerUserId}, credits: ${creditsAwarded}`);

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch user email from auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      referrerUserId
    );

    if (userError || !userData?.user?.email) {
      console.log("Could not fetch user email:", userError?.message);
      return new Response(
        JSON.stringify({ success: true, message: "Notification skipped - no email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = userData.user.email;
    const displayName = userData.user.user_metadata?.display_name || userEmail.split('@')[0];

    // Check if Resend API key is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - no API key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create referral email content
    const emailContent = `
      <tr>
        <td style="padding: 40px 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; font-size: 48px; line-height: 1;">🎉</span>
          </div>
          <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">Referral Bonus Earned!</h1>
          <p style="margin: 0 0 32px; font-size: 15px; color: #a1a1aa; text-align: center; line-height: 1.6;">Hey ${displayName}, one of your referrals just subscribed!</p>
          
          <!-- Credits Box -->
          <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.1) 100%); border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 16px; padding: 32px; margin-bottom: 28px; text-align: center;">
            <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Credits Earned</p>
            <div style="font-size: 56px; font-weight: 800; color: #22c55e; line-height: 1.1;">+${creditsAwarded}</div>
            <p style="margin: 12px 0 0; color: #4ade80; font-size: 14px; font-weight: 500;">Added to your account</p>
          </div>
          
          <p style="margin: 0 0 24px; text-align: center; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
            Keep sharing your referral link to earn more credits when your friends subscribe!
          </p>
          
          <!-- CTA Button -->
          <div style="text-align: center;">
            <a href="https://timeless-new.lovable.app/credits" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35); transition: transform 0.2s;">
              View Your Credits →
            </a>
          </div>
        </td>
      </tr>
    `;

    const emailHtml = createEmailTemplate(emailContent);

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    
    const { error: emailError } = await resend.emails.send({
      from: "Timeless <noreply@timelessapp.ai>",
      to: [userEmail],
      subject: `🎉 You earned ${creditsAwarded} referral credits!`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Failed to send referral email:", emailError);
      throw emailError;
    }

    console.log(`Referral notification sent to ${userEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: "Referral notification sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in referral-notification:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});