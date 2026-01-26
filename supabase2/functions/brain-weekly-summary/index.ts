import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[BRAIN-WEEKLY-SUMMARY] ${step}`, details ? JSON.stringify(details) : "");
};

const createEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Timeless - Weekly Brain Performance Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background: linear-gradient(180deg, #18181b 0%, #0f0f12 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(168, 85, 247, 0.15); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(168, 85, 247, 0.08);">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%); border-bottom: 1px solid rgba(168, 85, 247, 0.1);">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding-right: 12px; vertical-align: middle;">
                    <div style="width: 44px; height: 44px; background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.35);">
                      <img src="https://timeless-new.lovable.app/favicon.png" width="28" height="28" alt="Timeless" style="display: block;"/>
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <span style="font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Brain AI</span>
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
                    <a href="https://timeless-new.lovable.app/ai-apps/brain-ai" style="color: #a1a1aa; text-decoration: none; font-size: 12px;">Brain AI</a>
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

interface WeeklyBrainData {
  avg_brain_score: number;
  avg_focus_score: number;
  avg_stress_load: number;
  avg_mood_stability: number;
  avg_reaction_speed: number;
  total_screen_time_hours: number;
  avg_screen_time_hours: number;
  total_deep_work_hours: number;
  avg_deep_work_hours: number;
  total_app_switches: number;
  avg_night_usage_minutes: number;
  days_tracked: number;
  best_day_score: number;
  best_day_date: string | null;
  worst_day_score: number;
  worst_day_date: string | null;
  mood_entries: number;
  avg_mood_score: number;
  week_start: string;
  week_end: string;
  trend: 'improving' | 'stable' | 'declining';
}

const generateRecommendations = (data: WeeklyBrainData): string[] => {
  const recommendations: string[] = [];

  // Screen time recommendations
  if (data.avg_screen_time_hours > 6) {
    recommendations.push("Your screen time is high. Try setting app limits to reduce digital fatigue and improve focus.");
  }

  // Deep work recommendations
  if (data.avg_deep_work_hours < 2) {
    recommendations.push("Schedule 2-3 focused work blocks daily without interruptions to boost productivity.");
  }

  // Night usage recommendations
  if (data.avg_night_usage_minutes > 30) {
    recommendations.push("Reduce night-time screen usage to improve sleep quality and next-day cognitive performance.");
  }

  // Stress recommendations
  if (data.avg_stress_load > 60) {
    recommendations.push("Your stress levels are elevated. Consider meditation, breathing exercises, or short breaks.");
  }

  // Focus recommendations
  if (data.avg_focus_score < 60) {
    recommendations.push("Try the Pomodoro technique: 25 min focused work followed by 5 min breaks.");
  }

  // Mood tracking
  if (data.mood_entries < 3) {
    recommendations.push("Log your mood more often to unlock personalized insights about your cognitive patterns.");
  }

  // App switches
  if (data.total_app_switches / data.days_tracked > 100) {
    recommendations.push("Frequent app switching fragments attention. Use focus modes to reduce context switching.");
  }

  // Positive reinforcement
  if (data.avg_brain_score >= 70) {
    recommendations.push("Your cognitive performance is strong! Keep up your current habits.");
  }

  return recommendations.slice(0, 4);
};

const getScoreColor = (score: number): string => {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
};

const getTrendEmoji = (trend: string): string => {
  if (trend === 'improving') return '📈';
  if (trend === 'stable') return '➡️';
  return '📉';
};

const sendEmailToUser = async (
  resendApiKey: string,
  email: string,
  displayName: string | null,
  data: WeeklyBrainData
): Promise<boolean> => {
  const userName = displayName || email.split("@")[0];
  const recommendations = generateRecommendations(data);
  const scoreColor = getScoreColor(data.avg_brain_score);

  const emailContent = `
    <tr>
      <td style="padding: 40px 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 48px;">🧠</span>
        </div>
        <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff; text-align: center;">Your Weekly Brain Report</h1>
        <p style="margin: 0 0 32px; font-size: 15px; color: #a1a1aa; text-align: center; line-height: 1.6;">
          Hi ${userName}, here's your cognitive performance from ${data.week_start} to ${data.week_end}
        </p>
        
        <!-- Brain Score Circle -->
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; width: 130px; height: 130px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%); border: 3px solid ${scoreColor}; border-radius: 50%; padding: 24px;">
            <p style="margin: 10px 0 0; font-size: 44px; font-weight: 800; color: #ffffff; line-height: 1;">${Math.round(data.avg_brain_score)}</p>
            <p style="margin: 2px 0 0; font-size: 12px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px;">Brain Score</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: ${scoreColor};">${getTrendEmoji(data.trend)} ${data.trend}</p>
          </div>
        </div>
        
        <!-- Core Metrics Grid -->
        <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <p style="margin: 0 0 16px; color: #ffffff; font-size: 14px; font-weight: 600; text-align: center;">Core Metrics</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" style="text-align: center; padding: 10px;">
                <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Focus</p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${getScoreColor(data.avg_focus_score)};">${Math.round(data.avg_focus_score)}</p>
              </td>
              <td width="50%" style="text-align: center; padding: 10px;">
                <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Stress</p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${data.avg_stress_load <= 40 ? '#22c55e' : data.avg_stress_load <= 60 ? '#eab308' : '#ef4444'};">${Math.round(data.avg_stress_load)}</p>
              </td>
            </tr>
            <tr>
              <td width="50%" style="text-align: center; padding: 10px;">
                <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Mood</p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${getScoreColor(data.avg_mood_stability)};">${Math.round(data.avg_mood_stability)}</p>
              </td>
              <td width="50%" style="text-align: center; padding: 10px;">
                <p style="margin: 0 0 4px; color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Reaction</p>
                <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${getScoreColor(data.avg_reaction_speed)};">${Math.round(data.avg_reaction_speed)}</p>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Usage Stats -->
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 16px; color: #ffffff; font-size: 14px; font-weight: 600; text-align: center;">Weekly Activity</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="33%" style="text-align: center; padding: 8px;">
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #c084fc;">${data.total_screen_time_hours.toFixed(1)}h</p>
                <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 11px;">Screen Time</p>
              </td>
              <td width="33%" style="text-align: center; padding: 8px;">
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #22c55e;">${data.total_deep_work_hours.toFixed(1)}h</p>
                <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 11px;">Deep Work</p>
              </td>
              <td width="33%" style="text-align: center; padding: 8px;">
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: #f59e0b;">${data.total_app_switches}</p>
                <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 11px;">App Switches</p>
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Best/Worst Day -->
        ${data.best_day_date && data.worst_day_date ? `
        <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="50%" style="text-align: center; padding: 8px; border-right: 1px solid rgba(255, 255, 255, 0.08);">
                <p style="margin: 0 0 4px; color: #22c55e; font-size: 12px; font-weight: 600;">🏆 Best Day</p>
                <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: 500;">${data.best_day_date}</p>
                <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 12px;">Score: ${Math.round(data.best_day_score)}</p>
              </td>
              <td width="50%" style="text-align: center; padding: 8px;">
                <p style="margin: 0 0 4px; color: #ef4444; font-size: 12px; font-weight: 600;">💤 Needs Improvement</p>
                <p style="margin: 0; font-size: 14px; color: #ffffff; font-weight: 500;">${data.worst_day_date}</p>
                <p style="margin: 4px 0 0; color: #a1a1aa; font-size: 12px;">Score: ${Math.round(data.worst_day_score)}</p>
              </td>
            </tr>
          </table>
        </div>
        ` : ''}
        
        <!-- Recommendations Section -->
        <div style="margin-bottom: 28px;">
          <p style="margin: 0 0 16px; color: #ffffff; font-size: 14px; font-weight: 600;">💡 Personalized Recommendations</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${recommendations.map(rec => `
              <tr>
                <td style="padding: 8px 0;">
                  <span style="color: #a855f7; margin-right: 10px;">◆</span>
                  <span style="color: #a1a1aa; font-size: 13px;">${rec}</span>
                </td>
              </tr>
            `).join('')}
          </table>
        </div>
        
        <!-- Summary Stats -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 28px;">
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #a855f7; margin-right: 10px;">◆</span>
              <span style="color: #a1a1aa; font-size: 13px;">Tracked ${data.days_tracked} days this week</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #a855f7; margin-right: 10px;">◆</span>
              <span style="color: #a1a1aa; font-size: 13px;">Logged ${data.mood_entries} mood check-ins</span>
            </td>
          </tr>
          ${data.avg_night_usage_minutes > 0 ? `
          <tr>
            <td style="padding: 8px 0;">
              <span style="color: #f59e0b; margin-right: 10px;">◐</span>
              <span style="color: #a1a1aa; font-size: 13px;">Avg ${Math.round(data.avg_night_usage_minutes)} min late-night screen time</span>
            </td>
          </tr>
          ` : ''}
        </table>
        
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <a href="https://timeless-new.lovable.app/ai-apps/brain-ai" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #a855f7 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.4);">View Full Dashboard →</a>
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
      subject: `🧠 Your Weekly Brain Report - Score: ${Math.round(data.avg_brain_score)}`,
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
      logStep("Processing scheduled weekly brain emails");
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get all users with brain profiles (they've completed onboarding)
      const { data: profiles, error: profilesError } = await supabase
        .from("brain_profiles")
        .select("user_id, baseline_established");

      if (profilesError) throw profilesError;

      logStep("Found brain profiles", { count: profiles?.length || 0 });

      let sent = 0;
      let failed = 0;

      for (const profile of profiles || []) {
        try {
          // Get user email
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
          if (!user?.email) continue;

          // Get display name and check subscription
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("display_name, subscription_status")
            .eq("user_id", profile.user_id)
            .single();

          // Only send to active subscribers
          if (userProfile?.subscription_status !== "active") {
            logStep("Skipping non-subscriber", { userId: profile.user_id });
            continue;
          }

          // Get brain metrics for the past week
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);
          
          const { data: metrics } = await supabase
            .from("brain_metrics")
            .select("*")
            .eq("user_id", profile.user_id)
            .gte("metric_date", weekStart.toISOString().split('T')[0])
            .order("metric_date", { ascending: false });

          if (!metrics || metrics.length === 0) {
            logStep("No metrics for user, skipping", { userId: profile.user_id });
            continue;
          }

          // Get mood logs for the past week
          const { data: moodLogs } = await supabase
            .from("brain_mood_logs")
            .select("mood_score")
            .eq("user_id", profile.user_id)
            .gte("logged_at", weekStart.toISOString());

          // Calculate weekly stats
          const avgBrainScore = metrics.reduce((acc, m) => acc + (m.brain_performance_score || 0), 0) / metrics.length;
          const avgFocusScore = metrics.reduce((acc, m) => acc + (m.focus_score || 0), 0) / metrics.length;
          const avgStressLoad = metrics.reduce((acc, m) => acc + (m.stress_load || 0), 0) / metrics.length;
          const avgMoodStability = metrics.reduce((acc, m) => acc + (m.mood_stability || 0), 0) / metrics.length;
          const avgReactionSpeed = metrics.reduce((acc, m) => acc + (m.reaction_speed || 0), 0) / metrics.length;
          
          const totalScreenTime = metrics.reduce((acc, m) => acc + (m.total_screen_time_minutes || 0), 0);
          const totalDeepWork = metrics.reduce((acc, m) => acc + (m.deep_work_minutes || 0), 0);
          const totalAppSwitches = metrics.reduce((acc, m) => acc + (m.app_switches || 0), 0);
          const avgNightUsage = metrics.reduce((acc, m) => acc + (m.night_usage_minutes || 0), 0) / metrics.length;

          // Find best and worst days
          const sortedByScore = [...metrics].filter(m => m.brain_performance_score != null)
            .sort((a, b) => (b.brain_performance_score || 0) - (a.brain_performance_score || 0));
          
          const bestDay = sortedByScore[0];
          const worstDay = sortedByScore[sortedByScore.length - 1];

          // Determine trend (compare first half to second half)
          const halfIdx = Math.floor(metrics.length / 2);
          const firstHalfAvg = metrics.slice(halfIdx).reduce((acc, m) => acc + (m.brain_performance_score || 0), 0) / (metrics.length - halfIdx);
          const secondHalfAvg = metrics.slice(0, halfIdx).reduce((acc, m) => acc + (m.brain_performance_score || 0), 0) / halfIdx || firstHalfAvg;
          
          let trend: 'improving' | 'stable' | 'declining' = 'stable';
          if (secondHalfAvg - firstHalfAvg > 5) trend = 'improving';
          else if (firstHalfAvg - secondHalfAvg > 5) trend = 'declining';

          const avgMoodScore = moodLogs?.length 
            ? moodLogs.reduce((acc, m) => acc + (m.mood_score || 0), 0) / moodLogs.length 
            : 0;

          const weeklyData: WeeklyBrainData = {
            avg_brain_score: avgBrainScore,
            avg_focus_score: avgFocusScore,
            avg_stress_load: avgStressLoad,
            avg_mood_stability: avgMoodStability,
            avg_reaction_speed: avgReactionSpeed,
            total_screen_time_hours: totalScreenTime / 60,
            avg_screen_time_hours: (totalScreenTime / 60) / metrics.length,
            total_deep_work_hours: totalDeepWork / 60,
            avg_deep_work_hours: (totalDeepWork / 60) / metrics.length,
            total_app_switches: totalAppSwitches,
            avg_night_usage_minutes: avgNightUsage,
            days_tracked: metrics.length,
            best_day_score: bestDay?.brain_performance_score || 0,
            best_day_date: bestDay?.metric_date || null,
            worst_day_score: worstDay?.brain_performance_score || 0,
            worst_day_date: worstDay?.metric_date || null,
            mood_entries: moodLogs?.length || 0,
            avg_mood_score: avgMoodScore,
            week_start: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            week_end: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            trend,
          };

          const success = await sendEmailToUser(
            resendApiKey,
            user.email,
            userProfile?.display_name || null,
            weeklyData
          );

          if (success) {
            sent++;
            logStep("Email sent", { userId: profile.user_id });
          } else {
            failed++;
          }
        } catch (error) {
          logStep("Error processing user", { userId: profile.user_id, error: String(error) });
          failed++;
        }
      }

      logStep("Weekly emails completed", { sent, failed });

      return new Response(JSON.stringify({ success: true, sent, failed }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Handle direct API call with user data
    const { user_id, email, display_name, weekly_data } = body;

    if (!email || !weekly_data) {
      throw new Error("Missing required fields");
    }

    const success = await sendEmailToUser(resendApiKey, email, display_name, weekly_data);

    if (!success) {
      throw new Error("Failed to send email");
    }

    logStep("Weekly brain email sent", { email });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("Error", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
