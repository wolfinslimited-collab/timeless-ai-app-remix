import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 50;

interface EmailCampaignRequest {
  campaignId: string;
}

interface Campaign {
  email_subject: string;
  body: string;
  email_from_name: string;
  image_url: string | null;
}

interface UserWithEmail {
  user_id: string;
  email: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  fromName: string,
  imageUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo-text { font-size: 28px; font-weight: bold; background: linear-gradient(135deg, #a78bfa, #60a5fa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .content { background-color: #18181b; border-radius: 12px; padding: 30px; border: 1px solid #27272a; }
    .title { color: #fafafa; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; }
    .body-text { color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap; }
    .image { width: 100%; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #71717a; font-size: 12px; }
    .footer a { color: #a78bfa; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <span class="logo-text">✦ Timeless</span>
    </div>
    <div class="content">
      <h1 class="title">${subject}</h1>
      <p class="body-text">${body}</p>
      ${imageUrl ? `<img src="${imageUrl}" alt="" class="image" />` : ""}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Timeless. All rights reserved.</p>
      <p><a href="https://timelessapp.ai">timelessapp.ai</a></p>
    </div>
  </div>
</body>
</html>
    `;

    const { error } = await resend.emails.send({
      from: `${fromName} <notification@n.timelessapp.ai>`,
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

async function processBatch(
  serviceClient: SupabaseClient,
  campaignId: string,
  campaign: Campaign,
  users: UserWithEmail[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const result = await sendEmail(
      user.email,
      campaign.email_subject,
      campaign.body,
      campaign.email_from_name || "Timeless",
      campaign.image_url || undefined
    );

    await serviceClient.from("marketing_email_logs").insert({
      campaign_id: campaignId,
      user_id: user.user_id,
      email: user.email,
      status: result.success ? "sent" : "failed",
      sent_at: result.success ? new Date().toISOString() : null,
      error_message: result.error || null,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
      console.error(`[EMAIL] Failed to send to ${user.email}: ${result.error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { sent, failed };
}

async function processEmailCampaign(campaignId: string) {
  console.log(`[EMAIL] Starting email campaign processing for ${campaignId}`);

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: campaign, error: campaignError } = await serviceClient
      .from("marketing_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    const { data: authData, error: authError } = await serviceClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) {
      throw new Error(`Failed to fetch users: ${authError.message}`);
    }

    const users: UserWithEmail[] = authData.users
      .filter((u) => u.email)
      .map((u) => ({ user_id: u.id, email: u.email! }));

    const totalRecipients = users.length;
    console.log(`[EMAIL] Found ${totalRecipients} recipients`);

    await serviceClient
      .from("marketing_campaigns")
      .update({
        status: "processing",
        total_recipients: totalRecipients,
        started_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    let totalSent = 0;
    let totalFailed = 0;
    let batchNumber = 0;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      batchNumber++;
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(`[EMAIL] Processing batch ${batchNumber} (${batch.length} users)`);

      const { sent, failed } = await processBatch(serviceClient, campaignId, campaign as Campaign, batch);
      totalSent += sent;
      totalFailed += failed;

      await serviceClient
        .from("marketing_campaigns")
        .update({
          sent_count: totalSent,
          failed_count: totalFailed,
          current_batch: batchNumber,
        })
        .eq("id", campaignId);

      console.log(`[EMAIL] Batch ${batchNumber} complete: ${sent} sent, ${failed} failed`);
    }

    await serviceClient
      .from("marketing_campaigns")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    console.log(`[EMAIL] Campaign ${campaignId} completed: ${totalSent} sent, ${totalFailed} failed`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[EMAIL] Campaign ${campaignId} failed:`, message);

    await serviceClient
      .from("marketing_campaigns")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId }: EmailCampaignRequest = await req.json();

    if (!campaignId) {
      throw new Error("Campaign ID is required");
    }

    EdgeRuntime.waitUntil(processEmailCampaign(campaignId));

    return new Response(
      JSON.stringify({ success: true, message: "Email campaign started" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[EMAIL] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
