import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useHealthSync, SleepSession } from "@/hooks/useHealthSync";
import { toast } from "sonner";
import { format, subDays, startOfWeek, endOfWeek, differenceInMinutes, parseISO, isYesterday, differenceInDays } from "date-fns";
import {
  Moon,
  Sun,
  Bed,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Target,
  Zap,
  Brain,
  Coffee,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  BarChart3,
  Activity,
  Heart,
  Eye,
  Lightbulb,
  Flame,
  Trophy,
  Medal,
  Star,
  Award,
  Bell,
  BellOff,
  Mail,
  MailCheck,
  Send,
  AlarmClock,
  Sunrise,
  Smartphone,
  Watch,
  RefreshCw,
  Link2,
  Link2Off,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import SleepOnboarding, { SleepProfile } from "./SleepOnboarding";
import SleepSoundsPlayer from "./SleepSoundsPlayer";

interface SleepLog {
  id: string;
  user_id: string;
  sleep_date: string;
  bed_time: string | null;
  wake_time: string | null;
  sleep_duration_hours: number | null;
  sleep_quality: number | null;
  deep_sleep_percent: number | null;
  rem_sleep_percent: number | null;
  light_sleep_percent: number | null;
  awakenings: number;
  sleep_latency_minutes: number | null;
  mood_on_wake: string | null;
  energy_level: number | null;
  notes: string | null;
  factors: Record<string, any>;
  created_at: string;
}

interface SleepAnalysis {
  id: string;
  user_id: string;
  analysis_type: string;
  sleep_score: number;
  consistency_score: number | null;
  efficiency_score: number | null;
  avg_sleep_duration: number | null;
  avg_sleep_quality: number | null;
  insights: any;
  recommendations: string[];
  analysis_summary: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

const MOODS = [
  { value: "terrible", label: "😫 Terrible", color: "text-red-500" },
  { value: "poor", label: "😔 Poor", color: "text-orange-500" },
  { value: "okay", label: "😐 Okay", color: "text-yellow-500" },
  { value: "good", label: "🙂 Good", color: "text-green-500" },
  { value: "great", label: "😊 Great", color: "text-emerald-500" },
];

const chartConfig = {
  duration: { label: "Duration", color: "hsl(var(--primary))" },
  quality: { label: "Quality", color: "hsl(252, 100%, 70%)" },
  score: { label: "Score", color: "hsl(160, 100%, 40%)" },
};

// Sleep Score Trend Chart Component
const SleepScoreTrendChart = ({ logs }: { logs: SleepLog[] }) => {
  const chartData = useMemo(() => {
    return logs
      .slice(-14)
      .map(log => ({
        date: format(parseISO(log.sleep_date), "MMM d"),
        duration: log.sleep_duration_hours || 0,
        quality: log.sleep_quality || 0,
      }))
      .reverse();
  }, [logs]);

  if (chartData.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        <p>No sleep data yet. Start logging your sleep!</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(252, 100%, 70%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(252, 100%, 70%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Area
          type="monotone"
          dataKey="duration"
          stroke="hsl(252, 100%, 70%)"
          fillOpacity={1}
          fill="url(#colorDuration)"
          name="Hours"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

// Sleep Insights Component
const SleepInsights = ({ logs, profile }: { logs: SleepLog[]; profile: SleepProfile | null }) => {
  const insights = useMemo(() => {
    if (logs.length < 3) return null;

    const recentLogs = logs.slice(0, 7);
    const avgDuration = recentLogs.reduce((acc, log) => acc + (log.sleep_duration_hours || 0), 0) / recentLogs.length;
    const avgQuality = recentLogs.reduce((acc, log) => acc + (log.sleep_quality || 0), 0) / recentLogs.length;
    const consistentBedtime = recentLogs.every(log => log.bed_time);
    
    const goalHours = profile?.sleep_goal_hours || 8;
    const meetingGoal = avgDuration >= goalHours - 0.5;

    return {
      avgDuration: avgDuration.toFixed(1),
      avgQuality: avgQuality.toFixed(1),
      consistentBedtime,
      meetingGoal,
      trend: logs.length >= 2 ? (logs[0].sleep_duration_hours || 0) - (logs[1].sleep_duration_hours || 0) : 0,
    };
  }, [logs, profile]);

  if (!insights) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Moon className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Log at least 3 nights to see insights</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-indigo-500/10 border-indigo-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span className="text-sm text-muted-foreground">Avg Duration</span>
          </div>
          <p className="text-2xl font-bold">{insights.avgDuration}h</p>
          {insights.trend !== 0 && (
            <div className={cn("flex items-center gap-1 text-xs mt-1", insights.trend > 0 ? "text-green-500" : "text-red-500")}>
              {insights.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(insights.trend).toFixed(1)}h vs last night</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-purple-500/10 border-purple-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-muted-foreground">Avg Quality</span>
          </div>
          <p className="text-2xl font-bold">{insights.avgQuality}/10</p>
        </CardContent>
      </Card>

      <Card className={cn("border", insights.meetingGoal ? "bg-green-500/10 border-green-500/20" : "bg-orange-500/10 border-orange-500/20")}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">Goal Status</span>
          </div>
          <p className="text-sm font-medium">
            {insights.meetingGoal ? "Meeting sleep goal! 🎉" : "Below target hours"}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-muted-foreground">Consistency</span>
          </div>
          <p className="text-sm font-medium">
            {insights.consistentBedtime ? "Great routine! ✨" : "Improve bedtime consistency"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Sleep Streak Milestones
const STREAK_MILESTONES = [
  { days: 3, label: "3 Day", icon: Flame, color: "text-orange-400", bgColor: "bg-orange-500/20", borderColor: "border-orange-500/30" },
  { days: 7, label: "1 Week", icon: Star, color: "text-yellow-400", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/30" },
  { days: 14, label: "2 Weeks", icon: Medal, color: "text-blue-400", bgColor: "bg-blue-500/20", borderColor: "border-blue-500/30" },
  { days: 21, label: "3 Weeks", icon: Award, color: "text-purple-400", bgColor: "bg-purple-500/20", borderColor: "border-purple-500/30" },
  { days: 30, label: "1 Month", icon: Trophy, color: "text-amber-400", bgColor: "bg-amber-500/20", borderColor: "border-amber-500/30" },
  { days: 60, label: "2 Months", icon: Trophy, color: "text-emerald-400", bgColor: "bg-emerald-500/20", borderColor: "border-emerald-500/30" },
  { days: 90, label: "3 Months", icon: Trophy, color: "text-indigo-400", bgColor: "bg-indigo-500/20", borderColor: "border-indigo-500/30" },
];

// Sleep Streak Card Component
const SleepStreakCard = ({ logs, profile }: { logs: SleepLog[]; profile: SleepProfile | null }) => {
  const streakData = useMemo(() => {
    if (logs.length === 0 || !profile) {
      return { currentStreak: 0, longestStreak: 0, achievedMilestones: [], nextMilestone: STREAK_MILESTONES[0] };
    }

    const goalHours = profile.sleep_goal_hours || 7;
    const threshold = goalHours - 0.5; // Allow 30 min buffer

    // Sort logs by date (newest first - they should already be sorted)
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(b.sleep_date).getTime() - new Date(a.sleep_date).getTime()
    );

    // Calculate current streak (consecutive days meeting goal from today/yesterday)
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedLogs.length; i++) {
      const log = sortedLogs[i];
      const logDate = parseISO(log.sleep_date);
      logDate.setHours(0, 0, 0, 0);
      
      const daysDiff = differenceInDays(today, logDate);
      
      // First log should be today or yesterday to count as active streak
      if (i === 0 && daysDiff > 1) break;
      
      // Check if this day is consecutive
      if (i > 0) {
        const prevLogDate = parseISO(sortedLogs[i - 1].sleep_date);
        prevLogDate.setHours(0, 0, 0, 0);
        if (differenceInDays(prevLogDate, logDate) !== 1) break;
      }
      
      // Check if met goal
      const metGoal = (log.sleep_duration_hours || 0) >= threshold;
      if (!metGoal) break;
      
      currentStreak++;
    }

    // Calculate longest streak ever
    let longestStreak = 0;
    let tempStreak = 0;
    
    for (let i = 0; i < sortedLogs.length; i++) {
      const log = sortedLogs[i];
      const metGoal = (log.sleep_duration_hours || 0) >= threshold;
      
      if (i === 0) {
        tempStreak = metGoal ? 1 : 0;
        longestStreak = tempStreak;
        continue;
      }
      
      const prevLogDate = parseISO(sortedLogs[i - 1].sleep_date);
      const logDate = parseISO(log.sleep_date);
      const isConsecutive = differenceInDays(prevLogDate, logDate) === 1;
      
      if (metGoal && isConsecutive) {
        tempStreak++;
      } else if (metGoal) {
        tempStreak = 1;
      } else {
        tempStreak = 0;
      }
      
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Determine achieved milestones
    const achievedMilestones = STREAK_MILESTONES.filter(m => currentStreak >= m.days);
    
    // Next milestone to achieve
    const nextMilestone = STREAK_MILESTONES.find(m => currentStreak < m.days) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
    
    return { currentStreak, longestStreak, achievedMilestones, nextMilestone };
  }, [logs, profile]);

  const progressToNext = streakData.nextMilestone 
    ? Math.min(100, (streakData.currentStreak / streakData.nextMilestone.days) * 100) 
    : 100;

  const CurrentMilestoneIcon = streakData.achievedMilestones.length > 0 
    ? streakData.achievedMilestones[streakData.achievedMilestones.length - 1].icon 
    : Flame;

  return (
    <Card className="bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-yellow-500/10 border-orange-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-400" />
          Sleep Streak
        </CardTitle>
        <CardDescription>Consecutive nights meeting your sleep goal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-14 w-14 rounded-full flex items-center justify-center",
              streakData.currentStreak >= 3 ? "bg-orange-500/20 animate-pulse" : "bg-muted"
            )}>
              <CurrentMilestoneIcon className={cn(
                "h-7 w-7",
                streakData.currentStreak >= 3 ? "text-orange-400" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="text-3xl font-bold">{streakData.currentStreak}</p>
              <p className="text-sm text-muted-foreground">
                {streakData.currentStreak === 1 ? "night" : "nights"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Best Streak</p>
            <p className="text-xl font-semibold flex items-center gap-1 justify-end">
              <Trophy className="h-4 w-4 text-amber-400" />
              {streakData.longestStreak}
            </p>
          </div>
        </div>

        {/* Progress to Next Milestone */}
        {streakData.currentStreak < STREAK_MILESTONES[STREAK_MILESTONES.length - 1].days && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Next: {streakData.nextMilestone.label}</span>
              <span className="font-medium">{streakData.nextMilestone.days - streakData.currentStreak} nights to go</span>
            </div>
            <Progress value={progressToNext} className="h-2" />
          </div>
        )}

        {/* Achievement Badges */}
        {streakData.achievedMilestones.length > 0 && (
          <div className="pt-2">
            <p className="text-sm text-muted-foreground mb-2">Achievements Unlocked</p>
            <div className="flex flex-wrap gap-2">
              {streakData.achievedMilestones.map((milestone) => {
                const Icon = milestone.icon;
                return (
                  <Badge 
                    key={milestone.days} 
                    variant="outline" 
                    className={cn("gap-1 py-1", milestone.bgColor, milestone.borderColor)}
                  >
                    <Icon className={cn("h-3 w-3", milestone.color)} />
                    <span>{milestone.label}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Motivational Message */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-sm text-center">
            {streakData.currentStreak === 0 && "Start your streak tonight! 🌙"}
            {streakData.currentStreak === 1 && "Great start! Keep it going! 💪"}
            {streakData.currentStreak >= 2 && streakData.currentStreak < 7 && "You're building momentum! 🔥"}
            {streakData.currentStreak >= 7 && streakData.currentStreak < 14 && "One week strong! Amazing! ⭐"}
            {streakData.currentStreak >= 14 && streakData.currentStreak < 30 && "Incredible consistency! 🏅"}
            {streakData.currentStreak >= 30 && "Sleep master! Legendary streak! 🏆"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Sleep Cycle Constants
const SLEEP_CYCLE_MINUTES = 90; // Average sleep cycle duration
const FALL_ASLEEP_MINUTES = 15; // Average time to fall asleep

// Smart Wake-Up Recommendations Component
const SmartWakeUpCard = ({ logs, profile }: { logs: SleepLog[]; profile: SleepProfile | null }) => {
  const wakeUpData = useMemo(() => {
    if (!profile) {
      return { 
        recommendations: [], 
        avgSleepLatency: 15,
        avgDuration: 8,
        bestWakeTime: null,
        cyclesAnalysis: null
      };
    }

    // Calculate average sleep latency from logs
    const logsWithLatency = logs.filter(log => log.sleep_latency_minutes !== null);
    const avgSleepLatency = logsWithLatency.length > 0
      ? logsWithLatency.reduce((acc, log) => acc + (log.sleep_latency_minutes || 0), 0) / logsWithLatency.length
      : FALL_ASLEEP_MINUTES;

    // Calculate average sleep duration and quality correlation
    const recentLogs = logs.slice(0, 14);
    const avgDuration = recentLogs.length > 0
      ? recentLogs.reduce((acc, log) => acc + (log.sleep_duration_hours || 0), 0) / recentLogs.length
      : profile.sleep_goal_hours || 8;

    // Find optimal wake times based on bed goal time
    const bedTimeStr = profile.bed_goal_time || "23:00";
    const [bedHour, bedMin] = bedTimeStr.split(":").map(Number);
    
    // Calculate when user actually falls asleep (bed time + sleep latency)
    const fallAsleepDate = new Date(2000, 0, 1, bedHour, bedMin);
    fallAsleepDate.setMinutes(fallAsleepDate.getMinutes() + Math.round(avgSleepLatency));

    // Generate optimal wake times based on sleep cycles (4-6 cycles)
    const recommendations: { time: string; cycles: number; duration: number; quality: string; optimal: boolean }[] = [];
    
    for (let cycles = 4; cycles <= 6; cycles++) {
      const cycleMinutes = cycles * SLEEP_CYCLE_MINUTES;
      const wakeDate = new Date(fallAsleepDate.getTime());
      wakeDate.setMinutes(wakeDate.getMinutes() + cycleMinutes);
      
      // Handle day rollover
      if (wakeDate.getHours() < bedHour) {
        // Next day
      }
      
      const hours = wakeDate.getHours();
      const mins = wakeDate.getMinutes();
      const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
      const durationHours = cycleMinutes / 60;
      
      // Determine quality based on cycles and user's goal
      let quality = "Fair";
      let optimal = false;
      
      if (cycles === 5) {
        quality = "Optimal";
        optimal = true;
      } else if (cycles === 6) {
        quality = "Excellent";
      } else if (cycles === 4) {
        quality = "Minimum";
      }

      // Check if this matches user's goal
      const goalHours = profile.sleep_goal_hours || 8;
      if (Math.abs(durationHours - goalHours) < 0.5) {
        quality = "Goal Match";
        optimal = true;
      }
      
      recommendations.push({
        time: timeStr,
        cycles,
        duration: durationHours,
        quality,
        optimal
      });
    }

    // Find best wake time based on user's historical data
    const logsWithMood = logs.filter(log => log.mood_on_wake && log.energy_level && log.wake_time);
    let bestWakeTime = null;
    
    if (logsWithMood.length >= 3) {
      // Find the wake time with highest energy + best mood combination
      const bestLog = logsWithMood.reduce((best, log) => {
        const currentScore = (log.energy_level || 0) + 
          (log.mood_on_wake === "great" ? 5 : log.mood_on_wake === "good" ? 4 : log.mood_on_wake === "okay" ? 3 : 2);
        const bestScore = (best.energy_level || 0) + 
          (best.mood_on_wake === "great" ? 5 : best.mood_on_wake === "good" ? 4 : best.mood_on_wake === "okay" ? 3 : 2);
        return currentScore > bestScore ? log : best;
      }, logsWithMood[0]);

      if (bestLog.wake_time) {
        const wakeDate = parseISO(bestLog.wake_time);
        bestWakeTime = {
          time: format(wakeDate, "HH:mm"),
          duration: bestLog.sleep_duration_hours,
          mood: bestLog.mood_on_wake,
          energy: bestLog.energy_level
        };
      }
    }

    // Analyze sleep cycle completion from actual logs
    let cyclesAnalysis = null;
    if (recentLogs.length >= 5) {
      const avgQualityByDuration: { [key: string]: { total: number; count: number } } = {};
      
      recentLogs.forEach(log => {
        const duration = log.sleep_duration_hours || 0;
        const cycles = Math.round(duration / 1.5); // How many 90-min cycles
        const key = `${cycles}`;
        
        if (!avgQualityByDuration[key]) {
          avgQualityByDuration[key] = { total: 0, count: 0 };
        }
        avgQualityByDuration[key].total += log.sleep_quality || 0;
        avgQualityByDuration[key].count += 1;
      });

      const bestCycleCount = Object.entries(avgQualityByDuration)
        .map(([cycles, data]) => ({ cycles: parseInt(cycles), avgQuality: data.total / data.count }))
        .sort((a, b) => b.avgQuality - a.avgQuality)[0];

      if (bestCycleCount) {
        cyclesAnalysis = {
          optimalCycles: bestCycleCount.cycles,
          avgQuality: bestCycleCount.avgQuality.toFixed(1),
          optimalDuration: (bestCycleCount.cycles * 1.5).toFixed(1)
        };
      }
    }

    return {
      recommendations,
      avgSleepLatency: Math.round(avgSleepLatency),
      avgDuration: avgDuration.toFixed(1),
      bestWakeTime,
      cyclesAnalysis
    };
  }, [logs, profile]);

  if (!profile) return null;

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 border-amber-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlarmClock className="h-5 w-5 text-amber-400" />
          Smart Wake-Up
        </CardTitle>
        <CardDescription>
          Optimal wake times based on 90-minute sleep cycles
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sleep Cycle Info */}
        <div className="p-3 rounded-lg bg-background/50 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Sunrise className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium">Tonight's Wake-Up Windows</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Based on bedtime {profile.bed_goal_time} + {wakeUpData.avgSleepLatency}min to fall asleep
          </p>
          
          <div className="grid gap-2">
            {wakeUpData.recommendations.map((rec) => (
              <div 
                key={rec.cycles}
                className={cn(
                  "flex items-center justify-between p-2 rounded-md transition-all",
                  rec.optimal 
                    ? "bg-amber-500/20 border border-amber-500/40" 
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-16 rounded flex items-center justify-center font-mono font-bold text-sm",
                    rec.optimal ? "bg-amber-500/30 text-amber-300" : "bg-muted text-muted-foreground"
                  )}>
                    {rec.time}
                  </div>
                  <div>
                    <p className="text-sm">
                      {rec.cycles} cycles • {rec.duration}h
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={rec.optimal ? "default" : "outline"}
                  className={cn(
                    "text-xs",
                    rec.optimal && "bg-amber-600 hover:bg-amber-700"
                  )}
                >
                  {rec.quality}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Best Wake Time */}
        {wakeUpData.bestWakeTime && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium">Your Best Wake Time</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-400">{wakeUpData.bestWakeTime.time}</p>
                <p className="text-xs text-muted-foreground">
                  {wakeUpData.bestWakeTime.duration?.toFixed(1)}h sleep • Felt {wakeUpData.bestWakeTime.mood}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Energy</p>
                <p className="font-semibold">{wakeUpData.bestWakeTime.energy}/10</p>
              </div>
            </div>
          </div>
        )}

        {/* Sleep Cycle Analysis */}
        {wakeUpData.cyclesAnalysis && (
          <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-medium">Your Optimal Pattern</span>
            </div>
            <p className="text-sm">
              Based on your history, you sleep best with{" "}
              <span className="font-semibold text-indigo-400">
                {wakeUpData.cyclesAnalysis.optimalCycles} cycles ({wakeUpData.cyclesAnalysis.optimalDuration}h)
              </span>
              , averaging{" "}
              <span className="font-semibold">{wakeUpData.cyclesAnalysis.avgQuality}/10</span> quality.
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            💡 Wake between cycles to feel more refreshed. Avoid waking mid-cycle!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Sleep Debt Tracking Component
const SleepDebtCard = ({ logs, profile }: { logs: SleepLog[]; profile: SleepProfile | null }) => {
  const debtData = useMemo(() => {
    if (logs.length < 3 || !profile) {
      return null;
    }

    const goalHours = profile.sleep_goal_hours || 8;
    
    // Calculate sleep debt for the last 7 days
    const last7Days = logs.slice(0, 7);
    const weeklyDebt = last7Days.reduce((acc, log) => {
      const actual = log.sleep_duration_hours || 0;
      const deficit = goalHours - actual;
      return acc + Math.max(0, deficit); // Only count deficits, not surpluses
    }, 0);

    // Calculate sleep debt for the last 14 days
    const last14Days = logs.slice(0, 14);
    const biweeklyDebt = last14Days.reduce((acc, log) => {
      const actual = log.sleep_duration_hours || 0;
      const deficit = goalHours - actual;
      return acc + Math.max(0, deficit);
    }, 0);

    // Calculate average daily deficit
    const avgDailyDeficit = last7Days.length > 0 
      ? last7Days.reduce((acc, log) => acc + (goalHours - (log.sleep_duration_hours || 0)), 0) / last7Days.length
      : 0;

    // Determine debt severity
    let severity: "none" | "mild" | "moderate" | "severe" = "none";
    let severityColor = "text-green-500";
    let severityBg = "bg-green-500/10";
    let severityBorder = "border-green-500/30";
    
    if (weeklyDebt >= 10) {
      severity = "severe";
      severityColor = "text-red-500";
      severityBg = "bg-red-500/10";
      severityBorder = "border-red-500/30";
    } else if (weeklyDebt >= 5) {
      severity = "moderate";
      severityColor = "text-orange-500";
      severityBg = "bg-orange-500/10";
      severityBorder = "border-orange-500/30";
    } else if (weeklyDebt >= 2) {
      severity = "mild";
      severityColor = "text-yellow-500";
      severityBg = "bg-yellow-500/10";
      severityBorder = "border-yellow-500/30";
    }

    // Generate recovery strategies based on severity
    const strategies: string[] = [];
    
    if (severity === "none") {
      strategies.push("Great job! You're meeting your sleep goals consistently.");
      strategies.push("Keep maintaining your healthy sleep schedule.");
    } else if (severity === "mild") {
      strategies.push("Add 15-20 extra minutes of sleep each night this week.");
      strategies.push("Consider an earlier bedtime on weekends to catch up.");
      strategies.push("Avoid screens 30 minutes before bed to fall asleep faster.");
    } else if (severity === "moderate") {
      strategies.push("Add 30-45 minutes of sleep per night for the next 5-7 days.");
      strategies.push("Take a short 20-minute power nap in the early afternoon if needed.");
      strategies.push("Avoid caffeine after 2 PM to improve sleep quality.");
      strategies.push("Create a consistent wind-down routine 1 hour before bed.");
    } else {
      strategies.push("Prioritize sleep: aim for an extra 1 hour per night this week.");
      strategies.push("Consider taking 1-2 recovery nights with extended sleep (9-10 hours).");
      strategies.push("Avoid intense exercise within 3 hours of bedtime.");
      strategies.push("Limit alcohol and caffeine which disrupt sleep quality.");
      strategies.push("Consult a healthcare provider if fatigue persists.");
    }

    // Calculate estimated recovery time
    const recoveryDays = Math.ceil(weeklyDebt / 1.5); // Assume 1.5 hours extra sleep per night is max sustainable

    // Recent trend - is debt increasing or decreasing?
    let trend: "improving" | "worsening" | "stable" = "stable";
    if (logs.length >= 7) {
      const recentAvg = logs.slice(0, 3).reduce((acc, log) => acc + (log.sleep_duration_hours || 0), 0) / 3;
      const olderAvg = logs.slice(3, 6).reduce((acc, log) => acc + (log.sleep_duration_hours || 0), 0) / Math.min(3, logs.slice(3, 6).length);
      
      if (recentAvg > olderAvg + 0.3) {
        trend = "improving";
      } else if (recentAvg < olderAvg - 0.3) {
        trend = "worsening";
      }
    }

    return {
      weeklyDebt: weeklyDebt.toFixed(1),
      biweeklyDebt: biweeklyDebt.toFixed(1),
      avgDailyDeficit: avgDailyDeficit.toFixed(1),
      severity,
      severityColor,
      severityBg,
      severityBorder,
      strategies,
      recoveryDays,
      trend,
      goalHours,
      daysAnalyzed: last7Days.length,
    };
  }, [logs, profile]);

  if (!debtData) {
    return (
      <Card className="border-muted">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">Log at least 3 nights to see sleep debt analysis</p>
        </CardContent>
      </Card>
    );
  }

  const DebtIcon = debtData.severity === "none" ? CheckCircle2 : 
                   debtData.severity === "mild" ? Clock : 
                   debtData.severity === "moderate" ? AlertCircle : Flame;

  return (
    <Card className={cn("border", debtData.severityBorder, debtData.severityBg)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DebtIcon className={cn("h-5 w-5", debtData.severityColor)} />
            Sleep Debt Tracker
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              "capitalize",
              debtData.severity === "none" && "bg-green-500/20 border-green-500/30 text-green-400",
              debtData.severity === "mild" && "bg-yellow-500/20 border-yellow-500/30 text-yellow-400",
              debtData.severity === "moderate" && "bg-orange-500/20 border-orange-500/30 text-orange-400",
              debtData.severity === "severe" && "bg-red-500/20 border-red-500/30 text-red-400"
            )}
          >
            {debtData.severity === "none" ? "On Track" : `${debtData.severity} Debt`}
          </Badge>
        </div>
        <CardDescription>
          Cumulative sleep deficit based on your {debtData.goalHours}h goal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Debt Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-background/50">
            <p className="text-2xl font-bold">{debtData.weeklyDebt}h</p>
            <p className="text-xs text-muted-foreground">7-Day Debt</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50">
            <p className="text-2xl font-bold">{debtData.biweeklyDebt}h</p>
            <p className="text-xs text-muted-foreground">14-Day Debt</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-background/50">
            <p className="text-2xl font-bold flex items-center justify-center gap-1">
              {parseFloat(debtData.avgDailyDeficit) > 0 ? "-" : "+"}{Math.abs(parseFloat(debtData.avgDailyDeficit)).toFixed(1)}h
            </p>
            <p className="text-xs text-muted-foreground">Daily Avg</p>
          </div>
        </div>

        {/* Trend Indicator */}
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-lg",
          debtData.trend === "improving" && "bg-green-500/10",
          debtData.trend === "worsening" && "bg-red-500/10",
          debtData.trend === "stable" && "bg-muted"
        )}>
          {debtData.trend === "improving" ? (
            <>
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm">Your sleep is improving! Keep it up.</span>
            </>
          ) : debtData.trend === "worsening" ? (
            <>
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-sm">Sleep debt is increasing. Consider the strategies below.</span>
            </>
          ) : (
            <>
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Sleep patterns are stable.</span>
            </>
          )}
        </div>

        {/* Recovery Estimate */}
        {debtData.severity !== "none" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Clock className="h-4 w-4 text-indigo-400" />
            <span className="text-sm">
              Estimated recovery: <span className="font-semibold">{debtData.recoveryDays} days</span> with consistent extra sleep
            </span>
          </div>
        )}

        {/* Recovery Strategies */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            {debtData.severity === "none" ? "Keep Going!" : "Recovery Strategies"}
          </h4>
          <ul className="space-y-2">
            {debtData.strategies.map((strategy, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className={cn(
                  "h-4 w-4 mt-0.5 flex-shrink-0",
                  debtData.severity === "none" ? "text-green-500" : "text-indigo-400"
                )} />
                <span>{strategy}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Info Note */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            💡 Research suggests sleeping 1-2 extra hours per night helps recover from sleep debt. Avoid sleeping in too late on weekends.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const SleepAITool = () => {
  const { user } = useAuth();
  const { credits, hasActiveSubscription, refetch: refetchCredits } = useCredits();
  const { isSupported: pushSupported, requestPermission } = usePushNotifications();
  const { 
    isAvailable: healthAvailable, 
    isAuthorized: healthAuthorized, 
    isSyncing: healthSyncing,
    isNativePlatform,
    requestAuthorization: requestHealthAuth,
    syncSleepData: syncHealthSleepData,
    platformName: healthPlatformName,
    lastSyncAt: healthLastSyncAt
  } = useHealthSync();
  
  const [sleepProfile, setSleepProfile] = useState<SleepProfile | null>(null);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [sleepAnalyses, setSleepAnalyses] = useState<SleepAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingReminders, setIsTogglingReminders] = useState(false);
  
  const [mainTab, setMainTab] = useState<"dashboard" | "log" | "sounds" | "history" | "insights">("dashboard");
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Log form state
  const [bedTime, setBedTime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepQuality, setSleepQuality] = useState([7]);
  const [mood, setMood] = useState("okay");
  const [energyLevel, setEnergyLevel] = useState([5]);
  const [awakenings, setAwakenings] = useState("0");
  const [notes, setNotes] = useState("");

  // Bedtime reminders state
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  
  // Weekly email state
  const [weeklyEmailEnabled, setWeeklyEmailEnabled] = useState(false);
  const [isTogglingEmail, setIsTogglingEmail] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  // Fetch data
  useEffect(() => {
    if (user) {
      fetchSleepData();
    }
  }, [user]);

  const fetchSleepData = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("sleep_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (profileData) {
        setSleepProfile(profileData as unknown as SleepProfile);
        // Sync reminders state with profile
        setRemindersEnabled((profileData as any).bedtime_reminders_enabled || false);
        // Sync weekly email state with profile
        setWeeklyEmailEnabled((profileData as any).weekly_email_enabled || false);
      }

      // Fetch logs
      const { data: logsData } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("sleep_date", { ascending: false })
        .limit(30);
      
      if (logsData) {
        setSleepLogs(logsData as SleepLog[]);
      }

      // Fetch analyses
      const { data: analysesData } = await supabase
        .from("sleep_analyses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (analysesData) {
        setSleepAnalyses(analysesData as SleepAnalysis[]);
      }
    } catch (error) {
      console.error("Error fetching sleep data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle bedtime reminders
  const toggleBedtimeReminders = useCallback(async (enabled: boolean) => {
    if (!user || !sleepProfile) return;
    
    setIsTogglingReminders(true);
    try {
      // If enabling, request push permission first
      if (enabled && pushSupported) {
        const permissionGranted = await requestPermission();
        if (!permissionGranted) {
          toast.error("Please enable notifications to receive bedtime reminders");
          setIsTogglingReminders(false);
          return;
        }
      }

      const { error } = await supabase
        .from("sleep_profiles")
        .update({ 
          bedtime_reminders_enabled: enabled,
          reminder_minutes_before: 30
        })
        .eq("user_id", user.id);

      if (error) throw error;

      setRemindersEnabled(enabled);
      toast.success(enabled 
        ? "🔔 Bedtime reminders enabled! You'll get a notification 30 minutes before your goal bedtime." 
        : "Bedtime reminders disabled"
      );
    } catch (error) {
      console.error("Error toggling reminders:", error);
      toast.error("Failed to update reminder settings");
    } finally {
      setIsTogglingReminders(false);
    }
  }, [user, sleepProfile, pushSupported, requestPermission]);

  const calculateDuration = (bed: string, wake: string): number => {
    const bedDate = new Date(`2000-01-01T${bed}`);
    let wakeDate = new Date(`2000-01-01T${wake}`);
    
    // If wake time is before bed time, assume next day
    if (wakeDate < bedDate) {
      wakeDate = new Date(`2000-01-02T${wake}`);
    }
    
    return differenceInMinutes(wakeDate, bedDate) / 60;
  };

  const saveSleepLog = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const duration = calculateDuration(bedTime, wakeTime);
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const logData = {
        user_id: user.id,
        sleep_date: dateStr,
        bed_time: `${dateStr}T${bedTime}:00`,
        wake_time: `${dateStr}T${wakeTime}:00`,
        sleep_duration_hours: duration,
        sleep_quality: sleepQuality[0],
        mood_on_wake: mood,
        energy_level: energyLevel[0],
        awakenings: parseInt(awakenings) || 0,
        notes: notes || null,
        factors: {},
      };

      // Check if entry exists for this date
      const { data: existing } = await supabase
        .from("sleep_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("sleep_date", dateStr)
        .single();

      if (existing) {
        await supabase
          .from("sleep_logs")
          .update(logData)
          .eq("id", existing.id);
        toast.success("Sleep log updated!");
      } else {
        await supabase
          .from("sleep_logs")
          .insert(logData);
        toast.success("Sleep logged successfully!");
      }

      fetchSleepData();
      setMainTab("dashboard");
    } catch (error: any) {
      console.error("Error saving sleep log:", error);
      toast.error("Failed to save sleep log");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSleepLog = async (logId: string) => {
    try {
      await supabase
        .from("sleep_logs")
        .delete()
        .eq("id", logId);
      
      toast.success("Sleep log deleted");
      fetchSleepData();
    } catch (error) {
      toast.error("Failed to delete log");
    }
  };

  const runAIAnalysis = async () => {
    if (!user) return;
    if (sleepLogs.length < 3) {
      toast.error("Log at least 3 nights for AI analysis");
      return;
    }

    const creditCost = hasActiveSubscription ? 0 : 2;
    if (!hasActiveSubscription && (credits === null || credits < creditCost)) {
      toast.error("Not enough credits for AI analysis");
      return;
    }

    setIsAnalyzing(true);
    try {
      // Calculate metrics
      const recentLogs = sleepLogs.slice(0, 7);
      const avgDuration = recentLogs.reduce((acc, log) => acc + (log.sleep_duration_hours || 0), 0) / recentLogs.length;
      const avgQuality = recentLogs.reduce((acc, log) => acc + (log.sleep_quality || 0), 0) / recentLogs.length;
      
      // Calculate sleep score (0-100)
      const durationScore = Math.min(100, (avgDuration / 8) * 100);
      const qualityScore = avgQuality * 10;
      const sleepScore = Math.round((durationScore + qualityScore) / 2);

      // Generate recommendations based on data
      const recommendations: string[] = [];
      if (avgDuration < 7) {
        recommendations.push("Try to get at least 7-8 hours of sleep per night");
      }
      if (avgQuality < 6) {
        recommendations.push("Consider improving your sleep environment - darker room, cooler temperature");
      }
      if (sleepProfile?.caffeine_intake === "high") {
        recommendations.push("Reduce caffeine intake, especially after 2 PM");
      }
      if (sleepProfile?.screen_time_before_bed === "high") {
        recommendations.push("Limit screen time 1 hour before bed");
      }
      recommendations.push("Maintain a consistent sleep schedule, even on weekends");

      const analysisData = {
        user_id: user.id,
        analysis_type: "weekly",
        sleep_score: sleepScore,
        consistency_score: 75,
        efficiency_score: Math.round(qualityScore),
        avg_sleep_duration: avgDuration,
        avg_sleep_quality: avgQuality,
        insights: JSON.parse(JSON.stringify({
          best_night_date: recentLogs.reduce((best, log) => (log.sleep_quality || 0) > (best.sleep_quality || 0) ? log : best, recentLogs[0])?.sleep_date,
          worst_night_date: recentLogs.reduce((worst, log) => (log.sleep_quality || 0) < (worst.sleep_quality || 0) ? log : worst, recentLogs[0])?.sleep_date,
        })),
        recommendations,
        analysis_summary: `Your average sleep duration is ${avgDuration.toFixed(1)} hours with an average quality of ${avgQuality.toFixed(1)}/10. Your overall sleep score is ${sleepScore}/100.`,
        period_start: recentLogs[recentLogs.length - 1]?.sleep_date || null,
        period_end: recentLogs[0]?.sleep_date || null,
      };

      const { error } = await supabase
        .from("sleep_analyses")
        .insert([analysisData]);

      if (error) throw error;

      // Deduct credits if not subscribed
      if (!hasActiveSubscription && creditCost > 0) {
        await supabase
          .from("profiles")
          .update({ credits: (credits || 0) - creditCost })
          .eq("user_id", user.id);
        refetchCredits();
      }

      toast.success("AI analysis complete!");
      fetchSleepData();
    } catch (error) {
      console.error("Error running analysis:", error);
      toast.error("Failed to run analysis");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle weekly email notifications
  const toggleWeeklyEmail = useCallback(async (enabled: boolean) => {
    if (!user || !sleepProfile) return;
    
    setIsTogglingEmail(true);
    try {
      const { error } = await supabase
        .from("sleep_profiles")
        .update({ weekly_email_enabled: enabled })
        .eq("user_id", user.id);

      if (error) throw error;

      setWeeklyEmailEnabled(enabled);
      toast.success(enabled 
        ? "📧 Weekly sleep reports enabled! You'll receive a summary every Monday." 
        : "Weekly sleep reports disabled"
      );
    } catch (error) {
      console.error("Error toggling weekly email:", error);
      toast.error("Failed to update email settings");
    } finally {
      setIsTogglingEmail(false);
    }
  }, [user, sleepProfile]);

  // Calculate weekly stats for email
  const getWeeklyStats = useCallback(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    
    const weekLogs = sleepLogs.filter(log => {
      const logDate = parseISO(log.sleep_date);
      return logDate >= weekStart && logDate <= weekEnd;
    });

    if (weekLogs.length === 0) return null;

    const totalSleepHours = weekLogs.reduce((acc, log) => acc + (log.sleep_duration_hours || 0), 0);
    const avgDuration = totalSleepHours / weekLogs.length;
    const avgQuality = weekLogs.reduce((acc, log) => acc + (log.sleep_quality || 0), 0) / weekLogs.length;
    
    const goalHours = sleepProfile?.sleep_goal_hours || 8;
    const goalMetNights = weekLogs.filter(log => (log.sleep_duration_hours || 0) >= goalHours - 0.5).length;

    // Find best and worst nights
    const sortedByDuration = [...weekLogs].sort((a, b) => (b.sleep_duration_hours || 0) - (a.sleep_duration_hours || 0));
    const bestNight = sortedByDuration[0];
    const worstNight = sortedByDuration[sortedByDuration.length - 1];

    // Calculate streak
    let currentStreak = 0;
    const sortedLogs = [...sleepLogs].sort((a, b) => 
      new Date(b.sleep_date).getTime() - new Date(a.sleep_date).getTime()
    );
    
    for (const log of sortedLogs) {
      if ((log.sleep_duration_hours || 0) >= goalHours - 0.5) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      total_sleep_hours: totalSleepHours,
      avg_sleep_duration: avgDuration,
      avg_sleep_quality: avgQuality,
      nights_logged: weekLogs.length,
      best_night_date: bestNight ? format(parseISO(bestNight.sleep_date), "MMM d") : null,
      best_night_duration: bestNight?.sleep_duration_hours || 0,
      worst_night_date: worstNight ? format(parseISO(worstNight.sleep_date), "MMM d") : null,
      worst_night_duration: worstNight?.sleep_duration_hours || 0,
      sleep_goal_hours: goalHours,
      goal_met_nights: goalMetNights,
      current_streak: currentStreak,
      longest_streak: currentStreak, // Simplified
      week_start: format(weekStart, "MMM d"),
      week_end: format(weekEnd, "MMM d"),
    };
  }, [sleepLogs, sleepProfile]);

  // Send weekly summary email manually
  const sendWeeklySummaryEmail = async () => {
    if (!user) return;
    
    const weeklyData = getWeeklyStats();
    if (!weeklyData) {
      toast.error("No sleep data for this week yet");
      return;
    }

    setIsSendingEmail(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      const response = await supabase.functions.invoke("sleep-weekly-summary", {
        body: {
          user_id: user.id,
          email: authUser?.email,
          display_name: profile?.display_name,
          weekly_data: weeklyData,
        },
      });

      if (response.error) throw response.error;

      toast.success("📧 Weekly sleep report sent to your email!");
    } catch (error) {
      console.error("Error sending weekly summary:", error);
      toast.error("Failed to send weekly report");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleOnboardingComplete = (profile: SleepProfile) => {
    setSleepProfile(profile);
    fetchSleepData();
  };

  // Handle health sync from device
  const handleHealthSync = async () => {
    if (!user) return;
    
    // If not authorized, request authorization first
    if (!healthAuthorized) {
      const authorized = await requestHealthAuth();
      if (!authorized) return;
    }

    // Sync last 7 days of data
    const endDate = new Date();
    const startDate = subDays(endDate, 7);
    
    const sessions = await syncHealthSleepData(startDate, endDate);
    
    if (sessions.length > 0) {
      // Import synced sessions to sleep_logs
      for (const session of sessions) {
        const dateStr = format(parseISO(session.startDate), "yyyy-MM-dd");
        
        // Check if we already have a log for this date
        const existingLog = sleepLogs.find(log => log.sleep_date === dateStr);
        
        if (!existingLog) {
          // Create new log from synced data
          const logData = {
            user_id: user.id,
            sleep_date: dateStr,
            bed_time: session.startDate,
            wake_time: session.endDate,
            sleep_duration_hours: session.durationHours,
            sleep_quality: session.quality || 7,
            notes: `Synced from ${session.source}`,
            factors: { source: session.source, synced: true },
          };

          try {
            await supabase.from("sleep_logs").insert(logData);
          } catch (error) {
            console.error("Error saving synced log:", error);
          }
        }
      }
      
      // Refresh data
      fetchSleepData();
      toast.success(`Imported ${sessions.length} sleep session(s) from ${healthPlatformName}`);
    }
  };

  // Get today's log if exists
  const todayLog = sleepLogs.find(log => log.sleep_date === format(new Date(), "yyyy-MM-dd"));
  const latestAnalysis = sleepAnalyses[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center">
          <Moon className="h-12 w-12 mx-auto mb-4 text-indigo-500" />
          <h2 className="text-xl font-bold mb-2">Sign in Required</h2>
          <p className="text-muted-foreground">Please sign in to use Sleep AI</p>
        </Card>
      </div>
    );
  }

  if (!sleepProfile) {
    return <SleepOnboarding userId={user.id} onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Moon className="h-6 w-6 text-indigo-500" />
            Sleep AI
          </h1>
          <p className="text-muted-foreground">Track and optimize your sleep</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Zap className="h-3 w-3" />
          {credits} credits
        </Badge>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Log</span>
          </TabsTrigger>
          <TabsTrigger value="sounds" className="gap-2">
            <Volume2 className="h-4 w-4" />
            <span className="hidden sm:inline">Sounds</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs text-muted-foreground">Tonight's Goal</span>
                </div>
                <p className="text-xl font-bold">{sleepProfile.sleep_goal_hours}h</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bed className="h-4 w-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Bedtime</span>
                </div>
                <p className="text-xl font-bold">{sleepProfile.bed_goal_time}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sun className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground">Wake Time</span>
                </div>
                <p className="text-xl font-bold">{sleepProfile.wake_goal_time}</p>
              </CardContent>
            </Card>

            <Card className={cn(
              "border",
              latestAnalysis?.sleep_score >= 70 
                ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20"
                : "bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20"
            )}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground">Sleep Score</span>
                </div>
                <p className="text-xl font-bold">{latestAnalysis?.sleep_score || "--"}/100</p>
              </CardContent>
            </Card>
          </div>

          {/* Today's Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayLog ? (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Last Night</p>
                    <p className="text-lg font-semibold">{todayLog.sleep_duration_hours?.toFixed(1)}h sleep</p>
                    <p className="text-sm">Quality: {todayLog.sleep_quality}/10</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">No sleep logged yet</p>
                    <Button size="sm" onClick={() => setMainTab("log")} className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="h-4 w-4 mr-1" />
                      Log Last Night
                    </Button>
                  </div>
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sleep Streak */}
          <SleepStreakCard logs={sleepLogs} profile={sleepProfile} />

          {/* Sleep Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sleep Duration Trend</CardTitle>
              <CardDescription>Last 14 days</CardDescription>
            </CardHeader>
            <CardContent>
              <SleepScoreTrendChart logs={sleepLogs} />
            </CardContent>
          </Card>

          {/* Bedtime Reminders */}
          <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {remindersEnabled ? (
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Bell className="h-5 w-5 text-blue-400" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">Bedtime Reminders</h3>
                    <p className="text-sm text-muted-foreground">
                      {remindersEnabled 
                        ? `Get notified 30 min before ${sleepProfile?.bed_goal_time || "bedtime"}` 
                        : "Enable to get bedtime notifications"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={remindersEnabled}
                  onCheckedChange={toggleBedtimeReminders}
                  disabled={isTogglingReminders || !pushSupported}
                />
              </div>
              {!pushSupported && (
                <p className="text-xs text-muted-foreground mt-3">
                  Push notifications are not supported in this browser
                </p>
              )}
            </CardContent>
          </Card>

          {/* AI Analysis Button */}
          <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Brain className="h-5 w-5 text-indigo-400" />
                    AI Sleep Analysis
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get personalized insights and recommendations
                  </p>
                </div>
                <Button 
                  onClick={runAIAnalysis} 
                  disabled={isAnalyzing || sleepLogs.length < 3}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze ({hasActiveSubscription ? "Free" : "2 credits"})
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Log Sleep Tab */}
        <TabsContent value="log" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-indigo-400" />
                Log Your Sleep
              </CardTitle>
              <CardDescription>
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date Selector */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">{format(selectedDate, "MMM d")}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedDate(new Date())}
                  disabled={format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Sleep Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Moon className="h-4 w-4" /> Bedtime
                  </Label>
                  <Input
                    type="time"
                    value={bedTime}
                    onChange={(e) => setBedTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sun className="h-4 w-4" /> Wake Time
                  </Label>
                  <Input
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Calculated Duration */}
              <div className="p-4 rounded-lg bg-indigo-500/10 text-center">
                <p className="text-sm text-muted-foreground">Sleep Duration</p>
                <p className="text-2xl font-bold text-indigo-400">
                  {calculateDuration(bedTime, wakeTime).toFixed(1)} hours
                </p>
              </div>

              {/* Sleep Quality */}
              <div className="space-y-3">
                <Label>Sleep Quality: {sleepQuality[0]}/10</Label>
                <Slider
                  value={sleepQuality}
                  onValueChange={setSleepQuality}
                  max={10}
                  min={1}
                  step={1}
                  className="py-2"
                />
              </div>

              {/* Mood on Wake */}
              <div className="space-y-3">
                <Label>How did you feel waking up?</Label>
                <RadioGroup value={mood} onValueChange={setMood} className="grid grid-cols-5 gap-2">
                  {MOODS.map((m) => (
                    <Label
                      key={m.value}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all text-center",
                        mood === m.value
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-border hover:border-indigo-500/50"
                      )}
                    >
                      <RadioGroupItem value={m.value} className="sr-only" />
                      <span className="text-lg">{m.label.split(" ")[0]}</span>
                      <span className="text-xs text-muted-foreground">{m.label.split(" ")[1]}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* Energy Level */}
              <div className="space-y-3">
                <Label>Energy Level: {energyLevel[0]}/10</Label>
                <Slider
                  value={energyLevel}
                  onValueChange={setEnergyLevel}
                  max={10}
                  min={1}
                  step={1}
                  className="py-2"
                />
              </div>

              {/* Awakenings */}
              <div className="space-y-2">
                <Label>Times Woken During Night</Label>
                <Input
                  type="number"
                  value={awakenings}
                  onChange={(e) => setAwakenings(e.target.value)}
                  min={0}
                  max={20}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Any factors that affected your sleep..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Save Button */}
              <Button 
                onClick={saveSleepLog} 
                disabled={isSaving}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Save Sleep Log
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Sleep History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sleepLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Moon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sleep logs yet</p>
                  <Button 
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700" 
                    onClick={() => setMainTab("log")}
                  >
                    Log Your First Night
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sleepLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                          <Moon className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                          <p className="font-medium">{format(parseISO(log.sleep_date), "EEE, MMM d")}</p>
                          <p className="text-sm text-muted-foreground">
                            {log.sleep_duration_hours?.toFixed(1)}h • Quality: {log.sleep_quality}/10
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={log.sleep_quality && log.sleep_quality >= 7 ? "default" : "secondary"}>
                          {log.mood_on_wake || "—"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteSleepLog(log.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sounds Tab */}
        <TabsContent value="sounds" className="space-y-6">
          <SleepSoundsPlayer />
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <SleepInsights logs={sleepLogs} profile={sleepProfile} />

          {/* Sleep Debt Tracker */}
          <SleepDebtCard logs={sleepLogs} profile={sleepProfile} />

          {/* Smart Wake-Up Recommendations */}
          <SmartWakeUpCard logs={sleepLogs} profile={sleepProfile} />

          {/* Latest Analysis */}
          {latestAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-indigo-400" />
                  Latest AI Analysis
                </CardTitle>
                <CardDescription>
                  {latestAnalysis.period_start && latestAnalysis.period_end && 
                    `${format(parseISO(latestAnalysis.period_start), "MMM d")} - ${format(parseISO(latestAnalysis.period_end), "MMM d")}`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm">{latestAnalysis.analysis_summary}</p>
                </div>

                {latestAnalysis.recommendations && latestAnalysis.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {latestAnalysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Health Sync Card */}
          <Card className={cn(
            "border",
            healthAuthorized 
              ? "border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10" 
              : "border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10"
          )}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    healthAuthorized ? "bg-green-500/20" : "bg-cyan-500/20"
                  )}>
                    {healthAuthorized ? (
                      <Link2 className="h-5 w-5 text-green-400" />
                    ) : (
                      <Smartphone className="h-5 w-5 text-cyan-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      Device Sync
                      {healthAuthorized && (
                        <Badge variant="outline" className="text-xs bg-green-500/20 border-green-500/30 text-green-400">
                          Connected
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {isNativePlatform 
                        ? healthAuthorized 
                          ? `Syncing with ${healthPlatformName}` 
                          : `Connect to ${healthPlatformName} for automatic import`
                        : "Available in the mobile app"
                      }
                    </p>
                  </div>
                </div>
              </div>

              {isNativePlatform ? (
                <div className="space-y-3">
                  {/* Sync Platforms */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="gap-1">
                      <Smartphone className="h-3 w-3" />
                      {healthPlatformName}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <Watch className="h-3 w-3" />
                      Smartwatch
                    </Badge>
                  </div>

                  {/* Sync Button */}
                  <Button
                    onClick={handleHealthSync}
                    disabled={healthSyncing}
                    className={cn(
                      "w-full",
                      healthAuthorized 
                        ? "bg-green-600 hover:bg-green-700" 
                        : "bg-cyan-600 hover:bg-cyan-700"
                    )}
                  >
                    {healthSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : healthAuthorized ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Sleep Data
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect {healthPlatformName}
                      </>
                    )}
                  </Button>

                  {/* Last Sync Info */}
                  {healthLastSyncAt && (
                    <p className="text-xs text-muted-foreground text-center">
                      Last synced: {format(parseISO(healthLastSyncAt), "MMM d, h:mm a")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Download our mobile app to sync sleep data from:
                  </p>
                  <div className="flex justify-center gap-3">
                    <Badge variant="secondary" className="gap-1">
                      <Heart className="h-3 w-3" />
                      Apple Health
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Activity className="h-3 w-3" />
                      Health Connect
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Email Reports Card */}
          <Card className="border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-purple-500/10">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {weeklyEmailEnabled ? (
                    <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <MailCheck className="h-5 w-5 text-violet-400" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">Weekly Sleep Reports</h3>
                    <p className="text-sm text-muted-foreground">
                      {weeklyEmailEnabled 
                        ? "Get a detailed sleep summary every Monday" 
                        : "Enable to receive weekly email reports"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={weeklyEmailEnabled}
                  onCheckedChange={toggleWeeklyEmail}
                  disabled={isTogglingEmail}
                />
              </div>
              
              {/* Send Now Button */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendWeeklySummaryEmail}
                  disabled={isSendingEmail || sleepLogs.length === 0}
                  className="flex-1"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Report Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tips based on profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Personalized Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {sleepProfile.caffeine_intake === "high" && (
                  <li className="flex items-start gap-2 text-sm">
                    <Coffee className="h-4 w-4 text-amber-500 mt-0.5" />
                    <span>Consider reducing caffeine intake, especially after 2 PM</span>
                  </li>
                )}
                {sleepProfile.screen_time_before_bed === "high" && (
                  <li className="flex items-start gap-2 text-sm">
                    <Eye className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span>Try to reduce screen time 1-2 hours before bed</span>
                  </li>
                )}
                {sleepProfile.stress_level === "high" || sleepProfile.stress_level === "very_high" ? (
                  <li className="flex items-start gap-2 text-sm">
                    <Brain className="h-4 w-4 text-purple-500 mt-0.5" />
                    <span>Practice relaxation techniques like meditation or deep breathing</span>
                  </li>
                ) : null}
                <li className="flex items-start gap-2 text-sm">
                  <Clock className="h-4 w-4 text-indigo-500 mt-0.5" />
                  <span>Aim to be in bed by {sleepProfile.bed_goal_time} each night</span>
                </li>
                <li className="flex items-start gap-2 text-sm">
                  <Activity className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Regular exercise can improve sleep quality (but not too close to bedtime)</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SleepAITool;
