import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  email: string;
  code: string;
}

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
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%); border-bottom: 1px solid rgba(139, 92, 246, 0.1);">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding-right: 12px; vertical-align: middle;">
                    <img src="https://timeless-new.lovable.app/favicon.png" alt="Timeless" width="44" height="44" style="display: block; border-radius: 12px;" />
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

// Send welcome email to new users
async function sendWelcomeEmail(email: string, fullName: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping welcome email");
    return;
  }

  const firstName = fullName.split(' ')[0] || fullName;

  const emailContent = `
    <tr>
      <td style="padding: 40px 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px; color: #a78bfa;">✦</span>
        </div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">Welcome to Timeless, ${firstName}!</h1>
        <p style="margin: 0 0 32px; font-size: 15px; color: #a1a1aa; text-align: center; line-height: 1.6;">Your account is ready. Let's create something amazing together.</p>
        
        <!-- Getting Started Section -->
        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 16px; color: #ffffff; font-size: 16px; font-weight: 600; text-align: center;"><span style="color: #a78bfa;">◆</span> You've received 25 free credits!</p>
          <p style="margin: 0; color: #a1a1aa; font-size: 13px; text-align: center; line-height: 1.6;">Use them to explore our AI creation tools and bring your ideas to life.</p>
        </div>
        
        <!-- Quick Start Tips -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin-bottom: 28px;">
          <p style="margin: 0 0 16px; color: #ffffff; font-size: 14px; font-weight: 600;">Quick start tips:</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width: 32px; vertical-align: top;">
                      <span style="font-size: 16px; color: #a78bfa;">▶</span>
                    </td>
                    <td>
                      <p style="margin: 0 0 2px; color: #ffffff; font-size: 13px; font-weight: 500;">Create AI Videos</p>
                      <p style="margin: 0; color: #71717a; font-size: 12px;">Transform text prompts into stunning videos</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width: 32px; vertical-align: top;">
                      <span style="font-size: 16px; color: #a78bfa;">◐</span>
                    </td>
                    <td>
                      <p style="margin: 0 0 2px; color: #ffffff; font-size: 13px; font-weight: 500;">Generate Images</p>
                      <p style="margin: 0; color: #71717a; font-size: 12px;">Create beautiful AI artwork in seconds</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width: 32px; vertical-align: top;">
                      <span style="font-size: 16px; color: #a78bfa;">♪</span>
                    </td>
                    <td>
                      <p style="margin: 0 0 2px; color: #ffffff; font-size: 13px; font-weight: 500;">Compose Music</p>
                      <p style="margin: 0; color: #71717a; font-size: 12px;">Generate unique soundtracks with AI</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0;">
                <table cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width: 32px; vertical-align: top;">
                      <span style="font-size: 16px; color: #a78bfa;">◉</span>
                    </td>
                    <td>
                      <p style="margin: 0 0 2px; color: #ffffff; font-size: 13px; font-weight: 500;">Chat with AI</p>
                      <p style="margin: 0; color: #71717a; font-size: 12px;">Access multiple AI models for any task</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <a href="https://timeless-new.lovable.app/create" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">Start Creating Now →</a>
            </td>
          </tr>
        </table>
        
        <!-- Referral Promo -->
        <div style="margin-top: 28px; padding: 16px; background: rgba(139, 92, 246, 0.08); border-radius: 12px; text-align: center;">
          <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 12px;">💜 Love Timeless? Share it with friends!</p>
          <p style="margin: 0; color: #71717a; font-size: 11px;">Earn 50 credits for every friend who subscribes.</p>
        </div>
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
        subject: `🚀 Welcome to Timeless, ${firstName}! Let's create something amazing`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to send welcome email:", errorData);
    } else {
      console.log("Welcome email sent to:", email);
    }
  } catch (err) {
    console.error("Error sending welcome email:", err);
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: VerifyRequest = await req.json();

    // Validate required fields
    if (!email || !code) {
      throw new Error("Missing required fields: email and code are required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the verification record
    const { data: verification, error: fetchError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("verified", false)
      .single();

    if (fetchError || !verification) {
      console.log("Verification not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if code has expired
    if (new Date(verification.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Verification code has expired. Please request a new one." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: verification.email,
      password: verification.password_hash,
      email_confirm: true, // Auto-confirm since they verified via OTP
      user_metadata: {
        full_name: verification.full_name,
        country: verification.country,
        referral_code: verification.referral_code,
      },
    });

    if (authError) {
      console.error("Error creating user:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark verification as used
    await supabase
      .from("email_verifications")
      .update({ verified: true })
      .eq("id", verification.id);

    // Delete the verification record for cleanup
    await supabase
      .from("email_verifications")
      .delete()
      .eq("id", verification.id);

    console.log("User created successfully:", authData.user?.id);

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail(verification.email, verification.full_name);
    } catch (emailErr) {
      console.log("Welcome email failed (non-critical):", emailErr);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Account created successfully",
        user: authData.user 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in verify-code function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
