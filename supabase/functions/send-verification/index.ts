import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  email: string;
  fullName: string;
  country?: string;
  referralCode?: string;
  password: string;
}

const generateCode = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, country, referralCode, password }: VerificationRequest = await req.json();

    // Validate required fields
    if (!email || !fullName || !password) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email, fullName, and password are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service is not configured. Please contact support." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email is already registered using admin API
    console.log("Checking if email exists:", email);
    const emailLower = email.toLowerCase();
    
    let userExists = false;
    
    // List all users and check if email exists
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    
    if (listError) {
      console.error("Error listing users:", listError);
      // Don't block registration on this error, just log it
    } else if (allUsers?.users) {
      userExists = allUsers.users.some(u => u.email?.toLowerCase() === emailLower);
    }
    
    if (userExists) {
      console.log("Email already registered:", email);
      return new Response(
        JSON.stringify({ error: "This email is already registered. Please sign in instead." }),
        { status: 409, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email not found, proceeding with verification");

    // Check for rate limiting - prevent resending within 30 seconds
    const { data: existingVerification, error: verificationCheckError } = await supabase
      .from("email_verifications")
      .select("created_at")
      .eq("email", emailLower)
      .single();

    if (verificationCheckError && verificationCheckError.code !== "PGRST116") {
      console.error("Error checking existing verification:", verificationCheckError);
      // Continue anyway, don't block the user
    }

    if (existingVerification) {
      const createdAt = new Date(existingVerification.created_at);
      const now = new Date();
      const secondsSinceLastSend = (now.getTime() - createdAt.getTime()) / 1000;
      
      if (secondsSinceLastSend < 30) {
        const waitTime = Math.ceil(30 - secondsSinceLastSend);
        console.log(`Rate limit hit for ${emailLower}, wait ${waitTime}s`);
        return new Response(
          JSON.stringify({ error: `Please wait ${waitTime} seconds before requesting a new code.` }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Generate 4-digit code
    const code = generateCode();

    // Delete any existing verification for this email
    await supabase
      .from("email_verifications")
      .delete()
      .eq("email", emailLower);

    // Store verification request (password is stored temporarily, will be used when verifying)
    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        email: emailLower,
        code,
        full_name: fullName,
        country: country || null,
        referral_code: referralCode || null,
        password_hash: password, // This is the plain password, will be hashed by Supabase Auth
      });

    if (insertError) {
      console.error("Error storing verification:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create verification request. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create verification email content
    const emailContent = `
      <tr>
        <td style="padding: 40px 32px;">
          <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">Welcome to Timeless ✨</h1>
          <p style="margin: 0 0 32px; font-size: 15px; color: #a1a1aa; text-align: center; line-height: 1.6;">Hi ${fullName}, verify your email to start creating amazing content</p>
          
          <!-- Code Box -->
          <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 16px; padding: 28px; margin-bottom: 28px; text-align: center;">
            <p style="margin: 0 0 14px; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your Verification Code</p>
            <div style="font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #a78bfa; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'Droid Sans Mono', monospace; padding-left: 12px;">${code}</div>
          </div>
          
          <p style="margin: 0 0 8px; text-align: center; color: #71717a; font-size: 13px;">
            <span style="display: inline-block; width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
            This code expires in 15 minutes
          </p>
          <p style="margin: 0; text-align: center; color: #52525b; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </td>
      </tr>
    `;

    const emailHtml = createEmailTemplate(emailContent);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Timeless <noreply@timelessapp.ai>",
        to: [email],
        subject: "✨ Your Timeless Verification Code",
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to send verification email. Please check your email address." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Verification email sent successfully to:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-verification function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
