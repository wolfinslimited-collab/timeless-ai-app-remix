import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const createEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Timeless - Weekly Nutrition Summary</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background: linear-gradient(180deg, #18181b 0%, #0f0f12 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(132, 204, 22, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(132, 204, 22, 0.08);">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, rgba(132, 204, 22, 0.12) 0%, rgba(101, 163, 13, 0.08) 100%); border-bottom: 1px solid rgba(132, 204, 22, 0.1);">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding-right: 12px; vertical-align: middle;">
                    <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(132, 204, 22, 0.35);">
                      <img src="https://timeless-new.lovable.app/favicon.png" width="28" height="28" alt="Timeless" style="display: block;"/>
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Calorie AI</span>
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
                    <a href="https://timeless-new.lovable.app/ai-apps/calorie-ai" style="color: #a1a1aa; text-decoration: none; font-size: 12px;">Calorie AI</a>
                  </td>
                  <td style="color: #3f3f46; font-size: 12px;">•</td>
                  <td style="padding: 0 8px;">
                    <a href="https://timeless-new.lovable.app" style="color: #a1a1aa; text-decoration: none; font-size: 12px;">Timeless</a>
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

interface WeeklySummaryRequest {
  user_id: string;
  email: string;
  display_name?: string;
  weekly_data: {
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    meals_logged: number;
    days_active: number;
    daily_average: number;
    calorie_goal: number;
    goal_met_days: number;
    week_start: string;
    week_end: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const { user_id, email, display_name, weekly_data }: WeeklySummaryRequest = await req.json();

    if (!email || !weekly_data) {
      throw new Error("Missing required fields");
    }

    const userName = display_name || email.split("@")[0];
    const goalProgress = Math.round((weekly_data.daily_average / weekly_data.calorie_goal) * 100);
    const isUnderGoal = weekly_data.daily_average <= weekly_data.calorie_goal;
    const goalDiff = Math.abs(weekly_data.daily_average - weekly_data.calorie_goal);

    const emailContent = `
      <tr>
        <td style="padding: 40px 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">📊</span>
          </div>
          <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">Your Weekly Nutrition Summary</h1>
          <p style="margin: 0 0 32px; font-size: 15px; color: #a1a1aa; text-align: center; line-height: 1.6;">
            Hi ${userName}, here's how you did from ${weekly_data.week_start} to ${weekly_data.week_end}
          </p>
          
          <!-- Weekly Stats Box -->
          <div style="background: linear-gradient(135deg, rgba(132, 204, 22, 0.15) 0%, rgba(101, 163, 13, 0.1) 100%); border: 1px solid rgba(132, 204, 22, 0.25); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td colspan="2" style="padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
                  <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Daily Average</p>
                  <p style="margin: 0; color: #84cc16; font-size: 36px; font-weight: 800;">${Math.round(weekly_data.daily_average)}</p>
                  <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 12px;">calories / day</p>
                </td>
              </tr>
              <tr>
                <td style="padding-top: 16px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="50%" style="text-align: center; padding: 8px;">
                        <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Goal</p>
                        <p style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">${weekly_data.calorie_goal}</p>
                      </td>
                      <td width="50%" style="text-align: center; padding: 8px;">
                        <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Days Met Goal</p>
                        <p style="margin: 0; font-size: 18px; font-weight: 700; color: ${weekly_data.goal_met_days >= 5 ? '#22c55e' : weekly_data.goal_met_days >= 3 ? '#eab308' : '#ef4444'};">${weekly_data.goal_met_days}/7</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Macros Grid -->
          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 16px; color: #ffffff; font-size: 14px; font-weight: 600; text-align: center;">Weekly Totals</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="25%" style="text-align: center; padding: 8px;">
                  <p style="margin: 0; font-size: 20px; font-weight: 700; color: #f97316;">${weekly_data.total_calories.toLocaleString()}</p>
                  <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 11px;">Calories</p>
                </td>
                <td width="25%" style="text-align: center; padding: 8px;">
                  <p style="margin: 0; font-size: 20px; font-weight: 700; color: #ef4444;">${Math.round(weekly_data.total_protein)}g</p>
                  <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 11px;">Protein</p>
                </td>
                <td width="25%" style="text-align: center; padding: 8px;">
                  <p style="margin: 0; font-size: 20px; font-weight: 700; color: #f59e0b;">${Math.round(weekly_data.total_carbs)}g</p>
                  <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 11px;">Carbs</p>
                </td>
                <td width="25%" style="text-align: center; padding: 8px;">
                  <p style="margin: 0; font-size: 20px; font-weight: 700; color: #eab308;">${Math.round(weekly_data.total_fat)}g</p>
                  <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 11px;">Fat</p>
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Summary Message -->
          <div style="background: ${isUnderGoal ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border: 1px solid ${isUnderGoal ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}; border-radius: 12px; padding: 16px; margin-bottom: 28px; text-align: center;">
            <p style="margin: 0; color: ${isUnderGoal ? '#22c55e' : '#ef4444'}; font-size: 14px; font-weight: 500;">
              ${isUnderGoal 
                ? `Great job! You averaged ${goalDiff} calories under your daily goal! 🎉` 
                : `You averaged ${goalDiff} calories over your daily goal. Keep working at it! 💪`}
            </p>
          </div>
          
          <!-- Stats -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #84cc16; margin-right: 10px;">◆</span>
                <span style="color: #a1a1aa; font-size: 13px;">Logged ${weekly_data.meals_logged} meals this week</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="color: #84cc16; margin-right: 10px;">◆</span>
                <span style="color: #a1a1aa; font-size: 13px;">Active ${weekly_data.days_active} out of 7 days</span>
              </td>
            </tr>
          </table>
          
          <!-- CTA Button -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center">
                <a href="https://timeless-new.lovable.app/ai-apps/calorie-ai" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(132, 204, 22, 0.4);">Log Today's Meals →</a>
              </td>
            </tr>
          </table>
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
        subject: `📊 Your Weekly Nutrition Summary - ${weekly_data.week_start}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send weekly summary email");
    }

    console.log("Weekly summary email sent to:", email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending weekly summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
