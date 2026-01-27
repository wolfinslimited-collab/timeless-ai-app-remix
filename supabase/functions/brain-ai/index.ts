import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrainInsight {
  type: 'positive' | 'neutral' | 'warning';
  title: string;
  description: string;
  metric?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, data, date, limit: queryLimit } = await req.json();
    console.log(`Brain AI action: ${action} for user: ${user.id}`);

    switch (action) {
      case "getProfile": {
        const { data: profile, error } = await supabase
          .from("brain_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        return new Response(JSON.stringify({ profile }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "createProfile": {
        const { data: profile, error } = await supabase
          .from("brain_profiles")
          .insert({
            user_id: user.id,
            age: data.age,
            gender: data.gender,
            occupation: data.occupation,
            work_schedule: data.work_schedule,
            sleep_goal_hours: data.sleep_goal_hours,
            focus_goals: data.focus_goals,
            baseline_start_date: data.baseline_start_date,
          })
          .select()
          .single();

        if (error) throw error;

        // Create initial metrics for today
        const today = new Date().toISOString().split("T")[0];
        const baseScore = 60 + Math.floor(Math.random() * 20);
        const insights = generateInitialInsights();

        await supabase.from("brain_metrics").insert({
          user_id: user.id,
          metric_date: today,
          brain_performance_score: baseScore,
          focus_score: baseScore + Math.floor(Math.random() * 10) - 5,
          stress_load: 30 + Math.floor(Math.random() * 20),
          mood_stability: baseScore + Math.floor(Math.random() * 10) - 5,
          reaction_speed: baseScore + Math.floor(Math.random() * 10) - 5,
          cognitive_consistency: baseScore + Math.floor(Math.random() * 10) - 5,
          insights: insights,
        });

        return new Response(JSON.stringify({ profile }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "getMetrics": {
        const targetDate = date || new Date().toISOString().split("T")[0];
        
        const { data: metrics, error } = await supabase
          .from("brain_metrics")
          .select("*")
          .eq("user_id", user.id)
          .eq("metric_date", targetDate)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        return new Response(JSON.stringify({ metrics }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "getWeeklyMetrics": {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split("T")[0];

        const { data: metrics, error } = await supabase
          .from("brain_metrics")
          .select("*")
          .eq("user_id", user.id)
          .gte("metric_date", weekAgoStr)
          .order("metric_date", { ascending: false });

        if (error) throw error;

        return new Response(JSON.stringify({ metrics: metrics || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "getMoodLogs": {
        const { data: logs, error } = await supabase
          .from("brain_mood_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("logged_at", { ascending: false })
          .limit(queryLimit || 10);

        if (error) throw error;

        return new Response(JSON.stringify({ logs: logs || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "logMood": {
        const { error } = await supabase.from("brain_mood_logs").insert({
          user_id: user.id,
          mood_score: data.mood_score,
          energy_level: data.energy_level,
          focus_level: data.focus_level,
          stress_level: data.stress_level,
          notes: data.notes,
          context: data.context,
        });

        if (error) throw error;

        // Update today's metrics with mood data
        const today = new Date().toISOString().split("T")[0];
        
        // Check if metrics exist for today
        const { data: existing } = await supabase
          .from("brain_metrics")
          .select("id")
          .eq("user_id", user.id)
          .eq("metric_date", today)
          .single();

        if (existing) {
          await supabase
            .from("brain_metrics")
            .update({
              self_reported_mood: data.mood_score,
              self_reported_energy: data.energy_level,
              self_reported_focus: data.focus_level,
              mood_stability: Math.round(data.mood_score * 10),
              stress_load: Math.round(data.stress_level * 10),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("brain_metrics").insert({
            user_id: user.id,
            metric_date: today,
            self_reported_mood: data.mood_score,
            self_reported_energy: data.energy_level,
            self_reported_focus: data.focus_level,
            mood_stability: Math.round(data.mood_score * 10),
            stress_load: Math.round(data.stress_level * 10),
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "refreshMetrics": {
        const today = new Date().toISOString().split("T")[0];
        const baseScore = 60 + Math.floor(Math.random() * 20);
        const insights = generateInitialInsights();

        // Check if metrics exist for today
        const { data: existing } = await supabase
          .from("brain_metrics")
          .select("id")
          .eq("user_id", user.id)
          .eq("metric_date", today)
          .single();

        let metrics;
        if (existing) {
          const { data, error } = await supabase
            .from("brain_metrics")
            .update({
              brain_performance_score: baseScore,
              focus_score: baseScore + Math.floor(Math.random() * 10) - 5,
              stress_load: 30 + Math.floor(Math.random() * 20),
              mood_stability: baseScore + Math.floor(Math.random() * 10) - 5,
              reaction_speed: baseScore + Math.floor(Math.random() * 10) - 5,
              cognitive_consistency: baseScore + Math.floor(Math.random() * 10) - 5,
              insights: insights,
            })
            .eq("id", existing.id)
            .select()
            .single();
          
          if (error) throw error;
          metrics = data;
        } else {
          const { data, error } = await supabase
            .from("brain_metrics")
            .insert({
              user_id: user.id,
              metric_date: today,
              brain_performance_score: baseScore,
              focus_score: baseScore + Math.floor(Math.random() * 10) - 5,
              stress_load: 30 + Math.floor(Math.random() * 20),
              mood_stability: baseScore + Math.floor(Math.random() * 10) - 5,
              reaction_speed: baseScore + Math.floor(Math.random() * 10) - 5,
              cognitive_consistency: baseScore + Math.floor(Math.random() * 10) - 5,
              insights: insights,
            })
            .select()
            .single();
          
          if (error) throw error;
          metrics = data;
        }

        return new Response(JSON.stringify({ metrics }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "checkSubscription": {
        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_status")
          .eq("user_id", user.id)
          .single();

        return new Response(
          JSON.stringify({ hasActiveSubscription: profile?.subscription_status === "active" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Brain AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateInitialInsights(): BrainInsight[] {
  const hour = new Date().getHours();
  const insights: BrainInsight[] = [];

  if (hour >= 9 && hour <= 11) {
    insights.push({
      type: "positive",
      title: "Peak Focus Window",
      description: "This is typically your best time for deep work. Consider tackling your most important tasks now.",
    });
  }

  if (hour >= 14 && hour <= 15) {
    insights.push({
      type: "neutral",
      title: "Post-Lunch Dip",
      description: "Energy often drops after lunch. A short walk or light stretching can help.",
    });
  }

  if (hour >= 21) {
    insights.push({
      type: "warning",
      title: "Wind Down Time",
      description: "Consider reducing screen time to prepare for quality sleep.",
    });
  }

  insights.push({
    type: "neutral",
    title: "Building Your Baseline",
    description: "Brain AI is learning your patterns. Check back daily for personalized insights.",
  });

  return insights;
}
