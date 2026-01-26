import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed"
};

const statusColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  open: { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.25)", text: "#fbbf24", glow: "rgba(245, 158, 11, 0.08)" },
  in_progress: { bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.25)", text: "#60a5fa", glow: "rgba(59, 130, 246, 0.08)" },
  resolved: { bg: "rgba(34, 197, 94, 0.15)", border: "rgba(34, 197, 94, 0.25)", text: "#4ade80", glow: "rgba(34, 197, 94, 0.08)" },
  closed: { bg: "rgba(113, 113, 122, 0.15)", border: "rgba(113, 113, 122, 0.25)", text: "#a1a1aa", glow: "rgba(113, 113, 122, 0.08)" }
};

const statusEmojis: Record<string, string> = {
  open: "📋",
  in_progress: "⚡",
  resolved: "✅",
  closed: "📁"
};

// Timeless branded email template
const createEmailTemplate = (content: string, accentColor: string = "rgba(139, 92, 246, 0.15)") => `
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
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background: linear-gradient(180deg, #18181b 0%, #0f0f12 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(139, 92, 246, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px ${accentColor};">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, ${accentColor} 0%, rgba(59, 130, 246, 0.08) 100%); border-bottom: 1px solid rgba(139, 92, 246, 0.1);">
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ticketId, newStatus } = await req.json();
    
    if (!ticketId || !newStatus) {
      throw new Error("Missing ticketId or newStatus");
    }

    console.log(`Processing notification for ticket ${ticketId}, new status: ${newStatus}`);

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error(`Ticket not found: ${ticketError?.message}`);
    }

    // Fetch user email from auth.users
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      ticket.user_id
    );

    if (userError || !userData?.user?.email) {
      console.log("Could not fetch user email:", userError?.message);
      return new Response(
        JSON.stringify({ success: true, message: "Notification skipped - no email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmail = userData.user.email;
    const statusLabel = statusLabels[newStatus] || newStatus;
    const colors = statusColors[newStatus] || statusColors.open;
    const emoji = statusEmojis[newStatus] || "📋";

    // Check if Resend API key is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - no API key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create ticket notification email content
    const emailContent = `
      <tr>
        <td style="padding: 40px 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; font-size: 40px; line-height: 1;">${emoji}</span>
          </div>
          <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">Ticket Status Updated</h1>
          <p style="margin: 0 0 32px; font-size: 15px; color: #a1a1aa; text-align: center; line-height: 1.6;">Your support ticket has a new status</p>
          
          <!-- Ticket Details Box -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
            <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #ffffff;">${ticket.subject}</p>
            <p style="margin: 0; font-size: 14px; color: #71717a; line-height: 1.5;">${ticket.message.substring(0, 150)}${ticket.message.length > 150 ? '...' : ''}</p>
          </div>
          
          <!-- Status Badge -->
          <div style="text-align: center; margin-bottom: 28px;">
            <span style="display: inline-block; padding: 10px 24px; background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 24px; color: ${colors.text}; font-weight: 600; font-size: 14px; letter-spacing: 0.3px;">
              ${statusLabel}
            </span>
          </div>
          
          <p style="margin: 0 0 24px; text-align: center; color: #a1a1aa; font-size: 14px; line-height: 1.6;">
            ${newStatus === 'resolved' || newStatus === 'closed' 
              ? "Thank you for your patience! We hope we were able to help." 
              : "We're actively working on your request and will update you soon."}
          </p>
          
          <!-- CTA Button -->
          <div style="text-align: center;">
            <a href="https://timeless-new.lovable.app/support" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);">
              View Support Center →
            </a>
          </div>
        </td>
      </tr>
    `;

    const emailHtml = createEmailTemplate(emailContent, colors.glow);

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    
    const { error: emailError } = await resend.emails.send({
      from: "Timeless Support <support@timelessapp.ai>",
      to: [userEmail],
      subject: `${emoji} Ticket Update: ${statusLabel}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Failed to send email:", emailError);
      throw emailError;
    }

    console.log(`Notification sent to ${userEmail} for ticket ${ticketId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in ticket-notification:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});