import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  Target,
  Zap,
  Heart,
  Activity,
  Sparkles,
  Plus,
  TrendingUp,
  Clock,
  Gamepad2,
  Lock,
} from "lucide-react";
import BrainOnboarding from "./brain/BrainOnboarding";
import BrainScoreCard from "./brain/BrainScoreCard";
import MoodCheckIn from "./brain/MoodCheckIn";
import BrainInsightCard from "./brain/BrainInsightCard";
import BrainTrendsChart from "./brain/BrainTrendsChart";
import DeviceUsageCard from "./brain/DeviceUsageCard";
import GamesTab from "./brain/games/GamesTab";
import { BrainProfile, BrainMetrics, BrainMoodLog, BrainInsight } from "./brain/types";
import { DeviceUsageStats } from "@/hooks/useDeviceUsage";
import { format } from "date-fns";

const BrainAITool = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<BrainProfile | null>(null);
  const [todayMetrics, setTodayMetrics] = useState<BrainMetrics | null>(null);
  const [weeklyMetrics, setWeeklyMetrics] = useState<BrainMetrics[]>([]);
  const [recentMoodLogs, setRecentMoodLogs] = useState<BrainMoodLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMoodCheckIn, setShowMoodCheckIn] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;
    
    const { data: profileData } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("user_id", user.id)
      .single();
    
    setHasActiveSubscription(profileData?.subscription_status === 'active');
  };

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Load profile
      const { data: profileData } = await supabase
        .from("brain_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      setProfile(profileData as BrainProfile | null);

      if (profileData) {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        // Load today's metrics
        const { data: todayData } = await supabase
          .from("brain_metrics")
          .select("*")
          .eq("user_id", user.id)
          .eq("metric_date", today)
          .single();
        
        if (todayData) {
          setTodayMetrics({
            ...todayData,
            insights: (todayData.insights as unknown as BrainInsight[]) || [],
          });
        }

        // Load weekly metrics
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { data: weeklyData } = await supabase
          .from("brain_metrics")
          .select("*")
          .eq("user_id", user.id)
          .gte("metric_date", format(weekAgo, 'yyyy-MM-dd'))
          .order("metric_date", { ascending: false });
        
        setWeeklyMetrics((weeklyData || []).map(m => ({
          ...m,
          insights: (m.insights as unknown as BrainInsight[]) || [],
        })));

        // Load recent mood logs
        const { data: moodData } = await supabase
          .from("brain_mood_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("logged_at", { ascending: false })
          .limit(10);
        
        setRecentMoodLogs((moodData || []) as BrainMoodLog[]);
      }
    } catch (error) {
      console.error("Error loading brain data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (data: {
    age: number;
    gender: string;
    occupation?: string;
    work_schedule: string;
    sleep_goal_hours: number;
    focus_goals: string[];
  }) => {
    if (!user) return;

    try {
      const { data: newProfile, error } = await supabase
        .from("brain_profiles")
        .insert({
          user_id: user.id,
          age: data.age,
          gender: data.gender,
          occupation: data.occupation,
          work_schedule: data.work_schedule,
          sleep_goal_hours: data.sleep_goal_hours,
          focus_goals: data.focus_goals,
          baseline_start_date: format(new Date(), 'yyyy-MM-dd'),
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(newProfile as BrainProfile);
      
      // Create initial metrics for today
      await createTodayMetrics();
      
      toast({
        title: "Welcome to Brain AI!",
        description: "Your cognitive wellness journey begins now.",
      });
    } catch (error) {
      console.error("Error creating profile:", error);
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createTodayMetrics = async () => {
    if (!user) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Generate initial scores based on time of day and random variance
    const baseScore = 60 + Math.floor(Math.random() * 20);
    const insights = generateInitialInsights();

    // First try to get existing metrics
    const { data: existing } = await supabase
      .from("brain_metrics")
      .select("id")
      .eq("user_id", user.id)
      .eq("metric_date", today)
      .single();

    let result;
    if (existing) {
      // Update existing
      result = await supabase
        .from("brain_metrics")
        .update({
          brain_performance_score: baseScore,
          focus_score: baseScore + Math.floor(Math.random() * 10) - 5,
          stress_load: 30 + Math.floor(Math.random() * 20),
          mood_stability: baseScore + Math.floor(Math.random() * 10) - 5,
          reaction_speed: baseScore + Math.floor(Math.random() * 10) - 5,
          cognitive_consistency: baseScore + Math.floor(Math.random() * 10) - 5,
          insights: JSON.parse(JSON.stringify(insights)) as Json,
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      // Insert new
      result = await supabase
        .from("brain_metrics")
        .insert([{
          user_id: user.id,
          metric_date: today,
          brain_performance_score: baseScore,
          focus_score: baseScore + Math.floor(Math.random() * 10) - 5,
          stress_load: 30 + Math.floor(Math.random() * 20),
          mood_stability: baseScore + Math.floor(Math.random() * 10) - 5,
          reaction_speed: baseScore + Math.floor(Math.random() * 10) - 5,
          cognitive_consistency: baseScore + Math.floor(Math.random() * 10) - 5,
          insights: JSON.parse(JSON.stringify(insights)) as Json,
        }])
        .select()
        .single();
    }

    if (!result.error && result.data) {
      setTodayMetrics({
        ...result.data,
        insights: (result.data.insights as unknown as BrainInsight[]) || [],
      });
    }
  };

  // Handle device usage data sync
  const handleDeviceUsageSync = async (data: DeviceUsageStats) => {
    if (!user) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    
    try {
      // Update today's metrics with device usage data
      const { error } = await supabase
        .from("brain_metrics")
        .upsert({
          user_id: user.id,
          metric_date: today,
          total_screen_time_minutes: data.totalScreenTimeMinutes,
          app_switches: data.appSwitches,
          deep_work_minutes: data.deepWorkMinutes,
          night_usage_minutes: data.nightUsageMinutes,
          notification_interactions: data.notificationInteractions,
          session_count: data.sessionCount,
          avg_session_length_minutes: data.avgSessionLengthMinutes,
        }, { onConflict: 'user_id,metric_date' });

      if (!error) {
        // Reload data to show updated metrics
        loadData();
      }
    } catch (error) {
      console.error("Error updating metrics from device usage:", error);
    }
  };

  const generateInitialInsights = (): BrainInsight[] => {
    const hour = new Date().getHours();
    const insights: BrainInsight[] = [];

    if (hour >= 9 && hour <= 11) {
      insights.push({
        type: 'positive',
        title: 'Peak Focus Window',
        description: 'This is typically your best time for deep work. Consider tackling your most important tasks now.',
      });
    }

    if (hour >= 14 && hour <= 15) {
      insights.push({
        type: 'neutral',
        title: 'Post-Lunch Dip',
        description: 'Energy often drops after lunch. A short walk or light stretching can help.',
      });
    }

    insights.push({
      type: 'neutral',
      title: 'Building Your Baseline',
      description: 'Brain AI is learning your patterns. Check back daily for personalized insights.',
    });

    return insights;
  };

  const handleMoodCheckIn = async (data: {
    mood_score: number;
    energy_level: number;
    focus_level: number;
    stress_level: number;
    notes?: string;
    context: string;
  }) => {
    if (!user) return;

    try {
      await supabase
        .from("brain_mood_logs")
        .insert({
          user_id: user.id,
          mood_score: data.mood_score,
          energy_level: data.energy_level,
          focus_level: data.focus_level,
          stress_level: data.stress_level,
          notes: data.notes,
          context: data.context,
        });

      // Update today's metrics with mood data
      const today = format(new Date(), 'yyyy-MM-dd');
      await supabase
        .from("brain_metrics")
        .upsert({
          user_id: user.id,
          metric_date: today,
          self_reported_mood: data.mood_score,
          self_reported_energy: data.energy_level,
          self_reported_focus: data.focus_level,
          mood_stability: Math.round((data.mood_score * 10)),
          stress_load: Math.round((data.stress_level * 10)),
        }, { onConflict: 'user_id,metric_date' });

      setShowMoodCheckIn(false);
      loadData();
      
      toast({
        title: "Check-in logged!",
        description: "Your mood data has been recorded.",
      });
    } catch (error) {
      console.error("Error logging mood:", error);
      toast({
        title: "Error",
        description: "Failed to log check-in. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Subscription gate
  if (!hasActiveSubscription && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-6">
          <Lock className="h-10 w-10 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Brain AI is a Premium Feature</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          Unlock cognitive wellness insights, focus tracking, stress monitoring, and personalized recommendations with an active subscription.
        </p>
        <Button onClick={() => window.location.href = '/pricing'} className="gap-2">
          <Sparkles className="h-4 w-4" />
          View Subscription Plans
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading Brain AI...</div>
      </div>
    );
  }

  if (!profile) {
    return <BrainOnboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <Tabs defaultValue="dashboard" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
              <Brain className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Brain AI</h1>
              <p className="text-sm text-muted-foreground">Cognitive Wellness Dashboard</p>
            </div>
          </div>

          <TabsList className="grid w-full sm:w-auto grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="games">Games</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => setShowMoodCheckIn(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Mood Check-In
            </Button>
            <Button variant="outline" className="gap-2" onClick={createTodayMetrics}>
              <Activity className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>

          {/* Mood Check-in Modal */}
          {showMoodCheckIn && (
            <MoodCheckIn
              onSubmit={handleMoodCheckIn}
              onCancel={() => setShowMoodCheckIn(false)}
            />
          )}

          {/* Main Score Card */}
          <Card className="border-0 bg-gradient-to-br from-violet-500/10 to-purple-500/10">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Today's Brain Performance</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-bold">
                      {todayMetrics?.brain_performance_score ?? '--'}
                    </span>
                    <span className="text-muted-foreground">/100</span>
                  </div>
                  <p className="text-sm text-emerald-400">
                    {todayMetrics?.brain_performance_score && todayMetrics.brain_performance_score >= 70 
                      ? "You're performing well today!" 
                      : "Room for improvement"}
                  </p>
                </div>
                
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{todayMetrics?.deep_work_minutes || 0}</div>
                    <div className="text-muted-foreground">Deep Work (min)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{todayMetrics?.app_switches || 0}</div>
                    <div className="text-muted-foreground">App Switches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{recentMoodLogs.length}</div>
                    <div className="text-muted-foreground">Check-ins</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <BrainScoreCard
              title="Focus"
              score={todayMetrics?.focus_score ?? null}
              icon={Target}
              color="bg-blue-500/20"
              description="Attention span & concentration"
            />
            <BrainScoreCard
              title="Stress Load"
              score={todayMetrics?.stress_load ? 100 - todayMetrics.stress_load : null}
              icon={Zap}
              color="bg-rose-500/20"
              description="Mental pressure level"
            />
            <BrainScoreCard
              title="Mood Stability"
              score={todayMetrics?.mood_stability ?? null}
              icon={Heart}
              color="bg-emerald-500/20"
              description="Emotional balance"
            />
            <BrainScoreCard
              title="Reaction Speed"
              score={todayMetrics?.reaction_speed ?? null}
              icon={Activity}
              color="bg-amber-500/20"
              description="Mental processing speed"
            />
            <BrainScoreCard
              title="Consistency"
              score={todayMetrics?.cognitive_consistency ?? null}
              icon={TrendingUp}
              color="bg-cyan-500/20"
              description="Performance stability"
            />
          </div>

          {/* Insights Section */}
          {todayMetrics?.insights && Array.isArray(todayMetrics.insights) && todayMetrics.insights.length > 0 && (
            <Card className="border-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-violet-400" />
                  Today's Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(todayMetrics.insights as BrainInsight[]).map((insight, index) => (
                  <BrainInsightCard key={index} insight={insight} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Mood Logs */}
          {recentMoodLogs.length > 0 && (
            <Card className="border-0">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Recent Check-ins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {recentMoodLogs.slice(0, 5).map((log) => (
                      <div 
                        key={log.id} 
                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {log.mood_score >= 7 ? '😊' : log.mood_score >= 4 ? '😐' : '😔'}
                          </div>
                          <div>
                            <div className="font-medium text-sm">
                              Mood: {log.mood_score}/10 • Energy: {log.energy_level}/10
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(log.logged_at), 'MMM d, h:mm a')}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {log.context}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Device Usage Card */}
          <DeviceUsageCard onUsageDataSync={handleDeviceUsageSync} />
        </TabsContent>

        {/* Games Tab */}
        <TabsContent value="games">
          <GamesTab />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card className="border-0">
            <CardHeader>
              <CardTitle>7-Day Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <BrainTrendsChart 
                metrics={weeklyMetrics}
                selectedMetrics={['brain_performance_score', 'focus_score', 'mood_stability']}
              />
            </CardContent>
          </Card>

          <Card className="border-0">
            <CardHeader>
              <CardTitle>Stress & Consistency</CardTitle>
            </CardHeader>
            <CardContent>
              <BrainTrendsChart 
                metrics={weeklyMetrics}
                selectedMetrics={['stress_load', 'cognitive_consistency']}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <Card className="border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-400" />
                Brain Coach
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BrainInsightCard insight={{
                type: 'neutral',
                title: 'Your Focus Pattern',
                description: `Based on your ${profile.work_schedule} schedule, your peak focus times are likely in the morning. Try scheduling your most demanding tasks between 9-11 AM.`,
              }} />
              
              <BrainInsightCard insight={{
                type: 'positive',
                title: 'Sleep Goal',
                description: `You're targeting ${profile.sleep_goal_hours} hours of sleep. Consistent sleep timing is key to cognitive performance.`,
              }} />

              {profile.focus_goals.includes('reduce_stress') && (
                <BrainInsightCard insight={{
                  type: 'neutral',
                  title: 'Stress Management',
                  description: 'You mentioned stress reduction as a goal. Regular mood check-ins help Brain AI provide better stress predictions.',
                }} />
              )}

              {profile.focus_goals.includes('reduce_screen_time') && (
                <BrainInsightCard insight={{
                  type: 'warning',
                  title: 'Screen Time Awareness',
                  description: 'To help reduce screen time, try the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.',
                }} />
              )}
            </CardContent>
          </Card>

          {/* Device Usage Integration */}
          <DeviceUsageCard onUsageDataSync={handleDeviceUsageSync} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrainAITool;
