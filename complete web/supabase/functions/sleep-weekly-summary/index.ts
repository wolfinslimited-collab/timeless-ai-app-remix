import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[SLEEP-WEEKLY-SUMMARY] ${step}`, details ? JSON.stringify(details) : "");
};

const createEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Timeless - Weekly Sleep Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background: linear-gradient(180deg, #18181b 0%, #0f0f12 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(139, 92, 246, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.08);">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%); border-bottom: 1px solid rgba(139, 92, 246, 0.1);">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding-right: 12px; vertical-align: middle;">
                    <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);">
                      <img src="https://timeless-new.lovable.app/favicon.png" width="28" height="28" alt="Timeless" style="display: block;"/>
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Sleep AI</span>
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
                    <a href="https://timeless-new.lovable.app/ai-apps/sleep-ai" style="color: #a1a1aa; text-decoration: none; font-size: 12px;">Sleep AI</a>
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
    total_sleep_hours: number;
    avg_sleep_duration: number;
    avg_sleep_quality: number;
    nights_logged: number;
    best_night_date: string | null;
    best_night_duration: number;
    worst_night_date: string | null;
    worst_night_duration: number;
    sleep_goal_hours: number;
    goal_met_nights: number;
    current_streak: number;
    longest_streak: number;
    week_start: string;
    week_end: string;
  };
}

const generateTips = (weeklyData: WeeklySummaryRequest['weekly_data']): string[] => {
  const tips: string[] = [];
  
  if (weeklyData.avg_sleep_duration < 7) {
    tips.push("Try going to bed 30 minutes earlier to reach the recommended 7-8 hours of sleep.");
  }
  
  if (weeklyData.avg_sleep_quality < 6) {
    tips.push("Consider improving your sleep environment - keep your room dark, cool (65-68°F), and quiet.");
  }
  
  if (weeklyData.goal_met_nights < 4) {
    tips.push("Consistency is key! Aim to hit your sleep goal at least 5 nights this week.");
  }
  
  if (weeklyData.current_streak > 0) {
    tips.push(`Keep your ${weeklyData.current_streak}-night streak going! You're building great sleep habits.`);
  }
  
  tips.push("Avoid caffeine after 2 PM and limit screen time 1 hour before bed for better sleep.");
  
  return tips.slice(0, 3);
};

const sendEmailToUser = async (
  resendApiKey: string,
  email: string,
  displayName: string | null,
  weeklyData: WeeklySummaryRequest['weekly_data']
): Promise<boolean> => {
  const userName = displayName || email.split("@")[0];
  const isMeetingGoal = weeklyData.avg_sleep_duration >= weeklyData.sleep_goal_hours - 0.5;
  const sleepScore = Math.round(((weeklyData.avg_sleep_duration / 8) * 50) + (weeklyData.avg_sleep_quality * 5));
  const tips = generateTips(weeklyData);

  const emailContent = `
    <tr>
      <td style="padding: 40px 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">🌙</span>
        </div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">Your Weekly Sleep Report</h1>
        <p style="margin: 0 0 32px; font-size: 15px; color: #a1a1aa; text-align: center; line-height: 1.6;">
          Hi ${userName}, here's your sleep summary from ${weeklyData.week_start} to ${weeklyData.week_end}
        </p>
        
        <!-- Sleep Score Circle -->
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; width: 120px; height: 120px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%); border: 3px solid ${sleepScore >= 70 ? '#22c55e' : sleepScore >= 50 ? '#eab308' : '#ef4444'}; border-radius: 50%; padding: 24px;">
            <p style="margin: 8px 0 0; font-size: 42px; font-weight: 800; color: #ffffff; line-height: 1;">${sleepScore}</p>
            <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px;">Sleep Score</p>
          </div>
        </div>
        
        <!-- Weekly Stats Box -->
        <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td colspan="2" style="padding-bottom: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-align: center;">
                <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">Average Sleep</p>
                <p style="margin: 0; color: #8b5cf6; font-size: 36px; font-weight: 800;">${weeklyData.avg_sleep_duration.toFixed(1)}</p>
                <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 12px;">hours / night</p>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 16px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="50%" style="text-align: center; padding: 8px;">
                      <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Goal</p>
                      <p style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">${weeklyData.sleep_goal_hours}h</p>
                    </td>
                    <td width="50%" style="text-align: center; padding: 8px;">
                      <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Nights Met Goal</p>
                      <p style="margin: 0; font-size: 18px; font-weight: 700; color: ${weeklyData.goal_met_nights >= 5 ? '#22c55e' : weeklyData.goal_met_nights >= 3 ? '#eab308' : '#ef4444'};">${weeklyData.goal_met_nights}/7</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Quality & Streak Grid -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
          <tr>
            <td width="48%" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; text-align: center;">
              <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Avg Quality</p>
              <p style="margin: 0; font-size: 24px; font-weight: 700; color: #c084fc;">${weeklyData.avg_sleep_quality.toFixed(1)}/10</p>
            </td>
            <td width="4%"></td>
            <td width="48%" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; text-align: center;">
              <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Current Streak</p>
              <p style="margin: 0; font-size: 24px; font-weight: 700; color: #f59e0b;">${weeklyData.current_streak} 🔥</p>
            </td>
          </tr>
        </table>
        
        <!-- Best/Worst Night -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" style="text-align: center; padding: 8px; border-right: 1px solid rgba(255, 255, 255, 0.08);">
                <p style="margin: 0 0 4px; color: #22c55e; font-size: 12px; font-weight: 600;">✨ Best Night</p>
                <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: 500;">${weeklyData.best_night_date || 'N/A'}</p>
                <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 12px;">${weeklyData.best_night_duration.toFixed(1)}h sleep</p>
              </td>
              <td width="50%" style="text-align: center; padding: 8px;">
                <p style="margin: 0 0 4px; color: #ef4444; font-size: 12px; font-weight: 600;">💤 Needs Improvement</p>
                <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: 500;">${weeklyData.worst_night_date || 'N/A'}</p>
                <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 12px;">${weeklyData.worst_night_duration.toFixed(1)}h sleep</p>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Summary Message -->
        <div style="background: ${isMeetingGoal ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)'}; border: 1px solid ${isMeetingGoal ? 'rgba(34, 197, 94, 0.25)' : 'rgba(234, 179, 8, 0.25)'}; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; color: ${isMeetingGoal ? '#22c55e' : '#eab308'}; font-size: 14px; font-weight: 500;">
            ${isMeetingGoal 
              ? `Great job! You're averaging ${weeklyData.avg_sleep_duration.toFixed(1)} hours, meeting your ${weeklyData.sleep_goal_hours}h goal! 🎉` 
              : `You're averaging ${weeklyData.avg_sleep_duration.toFixed(1)} hours. Just ${(weeklyData.sleep_goal_hours - weeklyData.avg_sleep_duration).toFixed(1)} more hours to hit your goal! 💪`}
          </p>
        </div>
        
        <!-- Tips Section -->
        <div style="margin-bottom: 28px;">
          <p style="margin: 0 0 16px; color: #ffffff; font-size: 14px; font-weight: 600;">💡 Tips for This Week</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${tips.map(tip => `
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #8b5cf6; margin-right: 10px;">◆</span>
                  <span style="color: #a1a1aa; font-size: 13px;">${tip}</span>
                </td>
              </tr>
            `).join('')}
          </table>
        </div>
        
        <!-- Stats -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #8b5cf6; margin-right: 10px;">◆</span>
              <span style="color: #a1a1aa; font-size: 13px;">Logged ${weeklyData.nights_logged} nights this week</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #8b5cf6; margin-right: 10px;">◆</span>
              <span style="color: #a1a1aa; font-size: 13px;">Total sleep: ${weeklyData.total_sleep_hours.toFixed(1)} hours</span>
            </td>
          </tr>
          ${weeklyData.longest_streak > 0 ? `
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #f59e0b; margin-right: 10px;">🏆</span>
              <span style="color: #a1a1aa; font-size: 13px;">Longest streak: ${weeklyData.longest_streak} nights</span>
            </td>
          </tr>
          ` : ''}
        </table>
        
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <a href="https://timeless-new.lovable.app/ai-apps/sleep-ai" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);">Log Tonight's Sleep →</a>
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
      subject: `🌙 Your Weekly Sleep Report - ${weeklyData.week_start}`,
      html: emailHtml,
    }),
  });

  if (!emailResponse.ok) {
    const errorData = await emailResponse.json();
    logStep("Resend API error", { email, error: errorData });
    return false;
  }

  return true;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const body = await req.json();
    
    // Check if this is a scheduled cron job call
    if (body.scheduled) {
      logStep("Processing scheduled weekly emails");
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get all users with weekly email enabled
      const { data: profiles, error: profilesError } = await supabase
        .from("sleep_profiles")
        .select("user_id, sleep_goal_hours, weekly_email_enabled")
        .eq("weekly_email_enabled", true);

      if (profilesError) throw profilesError;

      logStep("Found users with weekly email enabled", { count: profiles?.length || 0 });

      let sent = 0;
      let failed = 0;

      for (const profile of profiles || []) {
        try {
          // Get user email
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
          if (!user?.email) continue;

          // Get display name
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", profile.user_id)
            .single();

          // Get sleep logs for the past week
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);
          
          const { data: logs } = await supabase
            .from("sleep_logs")
            .select("*")
            .eq("user_id", profile.user_id)
            .gte("sleep_date", weekStart.toISOString().split('T')[0])
            .order("sleep_date", { ascending: false });

          if (!logs || logs.length === 0) {
            logStep("No logs for user, skipping", { userId: profile.user_id });
            continue;
          }

          // Calculate weekly stats
          const totalSleepHours = logs.reduce((acc, log) => acc + (log.sleep_duration_hours || 0), 0);
          const avgDuration = totalSleepHours / logs.length;
          const avgQuality = logs.reduce((acc, log) => acc + (log.sleep_quality || 0), 0) / logs.length;
          const goalHours = profile.sleep_goal_hours || 8;
          const goalMetNights = logs.filter((log: any) => (log.sleep_duration_hours || 0) >= goalHours - 0.5).length;

          const sortedByDuration = [...logs].sort((a: any, b: any) => (b.sleep_duration_hours || 0) - (a.sleep_duration_hours || 0));
          const bestNight = sortedByDuration[0];
          const worstNight = sortedByDuration[sortedByDuration.length - 1];

          const weeklyData = {
            total_sleep_hours: totalSleepHours,
            avg_sleep_duration: avgDuration,
            avg_sleep_quality: avgQuality,
            nights_logged: logs.length,
            best_night_date: bestNight?.sleep_date ? new Date(bestNight.sleep_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
            best_night_duration: bestNight?.sleep_duration_hours || 0,
            worst_night_date: worstNight?.sleep_date ? new Date(worstNight.sleep_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
            worst_night_duration: worstNight?.sleep_duration_hours || 0,
            sleep_goal_hours: goalHours,
            goal_met_nights: goalMetNights,
            current_streak: 0,
            longest_streak: 0,
            week_start: new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            week_end: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          };

          const success = await sendEmailToUser(resendApiKey, user.email, userProfile?.display_name, weeklyData);
          if (success) {
            sent++;
            logStep("Email sent", { email: user.email });
          } else {
            failed++;
          }
        } catch (err) {
          logStep("Error processing user", { userId: profile.user_id, error: String(err) });
          failed++;
        }
      }

      return new Response(JSON.stringify({ success: true, sent, failed }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Manual email request
    const { user_id, email, display_name, weekly_data }: WeeklySummaryRequest = body;

    if (!email || !weekly_data) {
      throw new Error("Missing required fields");
    }

    logStep("Sending manual weekly sleep summary", { email });

    const success = await sendEmailToUser(resendApiKey, email, display_name || null, weekly_data);

    if (!success) {
      throw new Error("Failed to send weekly sleep summary email");
    }

    logStep("Weekly sleep summary email sent", { email });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("Error sending weekly summary", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
