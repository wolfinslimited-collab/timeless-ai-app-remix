import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Camera, 
  Loader2, 
  Sparkles,
  Droplets,
  Sun,
  AlertCircle,
  X,
  ImageIcon,
  History,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Calendar,
  BarChart3,
  LineChart as LineChartIcon,
  ShoppingBag
} from "lucide-react";
import { SkinProductSuggestions } from "./SkinProductSuggestions";
import { SkinRoutineBuilder } from "./SkinRoutineBuilder";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format, subDays, differenceInDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Area, AreaChart } from "recharts";
import SkinOnboarding, { SkinProfile } from "./SkinOnboarding";

interface SkinConcern {
  name: string;
  severity: "mild" | "moderate" | "severe";
  description: string;
}

interface SkinAnalysisResult {
  skin_type: string;
  overall_score: number;
  hydration_level: number;
  oiliness_level: number;
  concerns: SkinConcern[];
  recommendations: string[];
  analysis_summary: string;
}

interface SkinAnalysis {
  id: string;
  user_id: string;
  image_url: string | null;
  skin_type: string;
  overall_score: number;
  hydration_level: number | null;
  oiliness_level: number | null;
  concerns: SkinConcern[];
  recommendations: string[];
  analysis_summary: string | null;
  created_at: string;
}

// Chart configuration
const chartConfig = {
  score: {
    label: "Skin Score",
    color: "hsl(var(--primary))",
  },
  hydration: {
    label: "Hydration",
    color: "hsl(var(--chart-2))",
  },
  oiliness: {
    label: "Oiliness",
    color: "hsl(var(--chart-3))",
  },
};

// Skin Score Trend Chart Component
const SkinScoreTrendChart = ({ analyses }: { analyses: SkinAnalysis[] }) => {
  // Sort analyses by date (oldest first) for chronological chart
  const chartData = useMemo(() => {
    return [...analyses]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((analysis) => ({
        date: format(new Date(analysis.created_at), "MMM d"),
        fullDate: format(new Date(analysis.created_at), "MMM d, yyyy"),
        score: analysis.overall_score,
        hydration: analysis.hydration_level || 0,
        oiliness: analysis.oiliness_level || 0,
      }));
  }, [analyses]);

  const averageScore = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.round(
      chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length
    );
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-secondary/50 text-center">
          <p className="text-xs text-muted-foreground">Analyses</p>
          <p className="text-lg font-bold">{chartData.length}</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 text-center">
          <p className="text-xs text-muted-foreground">Avg Score</p>
          <p className="text-lg font-bold">{averageScore}</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 text-center">
          <p className="text-xs text-muted-foreground">Latest</p>
          <p className="text-lg font-bold">{chartData[chartData.length - 1]?.score || 0}</p>
        </div>
      </div>

      {/* Chart */}
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11 }} 
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fontSize: 11 }} 
            tickLine={false}
            axisLine={false}
            className="fill-muted-foreground"
          />
          <ChartTooltip 
            content={
              <ChartTooltipContent 
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload?.fullDate) {
                    return payload[0].payload.fullDate;
                  }
                  return "";
                }}
              />
            } 
          />
          <ReferenceLine 
            y={averageScore} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="5 5"
            strokeOpacity={0.5}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#scoreGradient)"
            dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </AreaChart>
      </ChartContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span>Score</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-px w-4 border-t-2 border-dashed border-muted-foreground" />
          <span>Average ({averageScore})</span>
        </div>
      </div>
    </div>
  );
};

// Skin Health Insights Component
const SkinHealthInsights = ({ analyses }: { analyses: SkinAnalysis[] }) => {
  const insights = useMemo(() => {
    if (analyses.length === 0) return null;

    const now = new Date();
    const oneWeekAgo = subDays(now, 7);
    const oneMonthAgo = subDays(now, 30);

    // Filter analyses by time period
    const weeklyAnalyses = analyses.filter(
      (a) => new Date(a.created_at) >= oneWeekAgo
    );
    const monthlyAnalyses = analyses.filter(
      (a) => new Date(a.created_at) >= oneMonthAgo
    );

    // Calculate averages
    const calcAvg = (arr: SkinAnalysis[], key: keyof SkinAnalysis) => {
      if (arr.length === 0) return 0;
      const sum = arr.reduce((acc, a) => acc + (Number(a[key]) || 0), 0);
      return Math.round(sum / arr.length);
    };

    // Weekly stats
    const weeklyAvgScore = calcAvg(weeklyAnalyses, "overall_score");
    const weeklyAvgHydration = calcAvg(weeklyAnalyses, "hydration_level");
    const weeklyAvgOiliness = calcAvg(weeklyAnalyses, "oiliness_level");

    // Monthly stats
    const monthlyAvgScore = calcAvg(monthlyAnalyses, "overall_score");
    const monthlyAvgHydration = calcAvg(monthlyAnalyses, "hydration_level");
    const monthlyAvgOiliness = calcAvg(monthlyAnalyses, "oiliness_level");

    // Calculate trends (compare first half vs second half of period)
    const calcTrend = (arr: SkinAnalysis[]) => {
      if (arr.length < 2) return 0;
      const sorted = [...arr].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const mid = Math.floor(sorted.length / 2);
      const firstHalf = sorted.slice(0, mid);
      const secondHalf = sorted.slice(mid);
      const firstAvg = calcAvg(firstHalf, "overall_score");
      const secondAvg = calcAvg(secondHalf, "overall_score");
      return secondAvg - firstAvg;
    };

    const weeklyTrend = calcTrend(weeklyAnalyses);
    const monthlyTrend = calcTrend(monthlyAnalyses);

    // Find best and worst scores
    const sortedByScore = [...analyses].sort((a, b) => b.overall_score - a.overall_score);
    const bestScore = sortedByScore[0];
    const worstScore = sortedByScore[sortedByScore.length - 1];

    // Most common concerns
    const concernCounts: Record<string, number> = {};
    analyses.forEach((a) => {
      (a.concerns || []).forEach((c) => {
        concernCounts[c.name] = (concernCounts[c.name] || 0) + 1;
      });
    });
    const topConcerns = Object.entries(concernCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Consistency score (how regular are analyses)
    const daysSinceFirst = differenceInDays(
      now,
      new Date(sortedByScore[sortedByScore.length - 1]?.created_at || now)
    );
    const expectedAnalyses = Math.max(1, Math.floor(daysSinceFirst / 7)); // expect 1 per week
    const consistencyScore = Math.min(100, Math.round((analyses.length / expectedAnalyses) * 100));

    // Generate personalized tips
    const tips: string[] = [];
    
    if (weeklyAvgHydration < 50) {
      tips.push("Your hydration levels are low. Try drinking more water and using a hydrating moisturizer.");
    }
    if (weeklyAvgOiliness > 70) {
      tips.push("High oiliness detected. Consider using oil-free products and a gentle cleanser twice daily.");
    }
    if (monthlyTrend < -5) {
      tips.push("Your skin score has declined recently. Review your skincare routine and stress levels.");
    }
    if (monthlyTrend > 5) {
      tips.push("Great progress! Your routine is working. Keep it consistent.");
    }
    if (topConcerns.some(c => c.name.toLowerCase().includes("acne"))) {
      tips.push("Acne is a recurring concern. Consider consulting a dermatologist for persistent issues.");
    }
    if (analyses.length < 4) {
      tips.push("Track your skin regularly for better insights. Aim for at least one analysis per week.");
    }
    if (consistencyScore < 50) {
      tips.push("More consistent tracking will help identify patterns in your skin health.");
    }
    
    // Default tip if none generated
    if (tips.length === 0) {
      tips.push("Keep up your skincare routine and stay consistent with your analyses!");
    }

    return {
      weekly: {
        count: weeklyAnalyses.length,
        avgScore: weeklyAvgScore,
        avgHydration: weeklyAvgHydration,
        avgOiliness: weeklyAvgOiliness,
        trend: weeklyTrend,
      },
      monthly: {
        count: monthlyAnalyses.length,
        avgScore: monthlyAvgScore,
        avgHydration: monthlyAvgHydration,
        avgOiliness: monthlyAvgOiliness,
        trend: monthlyTrend,
      },
      bestScore,
      worstScore,
      topConcerns,
      consistencyScore,
      tips,
    };
  }, [analyses]);

  if (!insights || analyses.length < 1) {
    return null;
  }

  const getTrendLabel = (trend: number) => {
    if (trend > 5) return { text: "Improving", color: "text-green-500", icon: TrendingUp };
    if (trend < -5) return { text: "Declining", color: "text-red-500", icon: TrendingDown };
    return { text: "Stable", color: "text-muted-foreground", icon: Minus };
  };

  return (
    <div className="space-y-4">
      {/* Period Stats */}
      <div className="grid grid-cols-2 gap-4">
        {/* Weekly */}
        <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              This Week
            </h4>
            <Badge variant="secondary">{insights.weekly.count} analyses</Badge>
          </div>
          {insights.weekly.count > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Avg Score</span>
                <span className="font-semibold">{insights.weekly.avgScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Trend</span>
                <span className={cn("text-sm flex items-center gap-1", getTrendLabel(insights.weekly.trend).color)}>
                  {(() => {
                    const TrendIcon = getTrendLabel(insights.weekly.trend).icon;
                    return <TrendIcon className="h-3 w-3" />;
                  })()}
                  {getTrendLabel(insights.weekly.trend).text}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No analyses this week</p>
          )}
        </div>

        {/* Monthly */}
        <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              This Month
            </h4>
            <Badge variant="secondary">{insights.monthly.count} analyses</Badge>
          </div>
          {insights.monthly.count > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Avg Score</span>
                <span className="font-semibold">{insights.monthly.avgScore}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Trend</span>
                <span className={cn("text-sm flex items-center gap-1", getTrendLabel(insights.monthly.trend).color)}>
                  {(() => {
                    const TrendIcon = getTrendLabel(insights.monthly.trend).icon;
                    return <TrendIcon className="h-3 w-3" />;
                  })()}
                  {getTrendLabel(insights.monthly.trend).text}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No analyses this month</p>
          )}
        </div>
      </div>

      {/* Best/Worst & Consistency */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-green-500/10 text-center">
          <Heart className="h-4 w-4 text-green-500 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Best Score</p>
          <p className="text-lg font-bold text-green-500">{insights.bestScore.overall_score}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(insights.bestScore.created_at), "MMM d")}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 text-center">
          <AlertCircle className="h-4 w-4 text-red-500 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Lowest Score</p>
          <p className="text-lg font-bold text-red-500">{insights.worstScore.overall_score}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(insights.worstScore.created_at), "MMM d")}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 text-center">
          <BarChart3 className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Consistency</p>
          <p className="text-lg font-bold">{insights.consistencyScore}%</p>
          <p className="text-xs text-muted-foreground">tracking rate</p>
        </div>
      </div>

      {/* Top Concerns */}
      {insights.topConcerns.length > 0 && (
        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Recurring Concerns
          </h4>
          <div className="flex flex-wrap gap-2">
            {insights.topConcerns.map((concern) => (
              <Badge key={concern.name} variant="outline" className="gap-1">
                {concern.name}
                <span className="text-muted-foreground">({concern.count}x)</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Personalized Tips */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Personalized Tips
        </h4>
        <ul className="space-y-2">
          {insights.tips.slice(0, 3).map((tip, index) => (
            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const SkinAITool = () => {
  const [mainTab, setMainTab] = useState<"analyze" | "history" | "progress" | "routine">("analyze");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SkinAnalysisResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History state
  const [analyses, setAnalyses] = useState<SkinAnalysis[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<SkinAnalysis | null>(null);

  // Progress comparison state
  const [beforeAnalysisId, setBeforeAnalysisId] = useState<string | null>(null);
  const [afterAnalysisId, setAfterAnalysisId] = useState<string | null>(null);

  // Onboarding state
  const [skinProfile, setSkinProfile] = useState<SkinProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // First-time app download popup
  const [showAppPopup, setShowAppPopup] = useState(() => {
    const hasSeenPopup = localStorage.getItem("skinAI_appPopupSeen");
    return !hasSeenPopup;
  });

  const handleCloseAppPopup = () => {
    localStorage.setItem("skinAI_appPopupSeen", "true");
    setShowAppPopup(false);
  };

  const { credits, refetch, hasActiveSubscription } = useCredits();
  const { user } = useAuth();
  const creditCost = 2;

  const hasEnoughCredits = (cost: number) => {
    if (hasActiveSubscription) return true;
    if (credits === null) return false;
    return credits >= cost;
  };

  // Fetch skin profile
  const fetchProfile = useCallback(async () => {
    if (!user) {
      setIsLoadingProfile(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("skin_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSkinProfile({
          age: data.age,
          gender: data.gender as SkinProfile["gender"],
          skin_type: data.skin_type as SkinProfile["skin_type"],
          primary_concerns: data.primary_concerns || [],
          skin_goals: data.skin_goals || [],
          current_routine: data.current_routine as SkinProfile["current_routine"],
          sun_exposure: data.sun_exposure as SkinProfile["sun_exposure"],
          water_intake: data.water_intake as SkinProfile["water_intake"],
          sleep_quality: data.sleep_quality as SkinProfile["sleep_quality"],
          stress_level: data.stress_level as SkinProfile["stress_level"],
          diet_type: data.diet_type as SkinProfile["diet_type"],
        });
      }
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleOnboardingComplete = (profile: SkinProfile) => {
    setSkinProfile(profile);
  };

  // Fetch analysis history
  const fetchHistory = useCallback(async () => {
    if (!user) return;

    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("skin_analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = (data || []).map((item: any) => ({
        ...item,
        concerns: item.concerns as SkinConcern[],
        recommendations: item.recommendations as string[],
      }));

      setAnalyses(typedData);
      
      // Auto-select before/after if we have at least 2 analyses
      if (typedData.length >= 2) {
        setBeforeAnalysisId(typedData[typedData.length - 1].id); // oldest
        setAfterAnalysisId(typedData[0].id); // newest
      }
    } catch (error: any) {
      console.error("Failed to fetch history:", error);
      toast.error("Failed to load history");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user]);

  // Fetch history on mount for dashboard stats and when tab changes
  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user, fetchHistory]);

  useEffect(() => {
    if (user && (mainTab === "history" || mainTab === "progress")) {
      fetchHistory();
    }
  }, [user, mainTab, fetchHistory]);

  // Progress comparison data
  const beforeAnalysis = useMemo(() => 
    analyses.find(a => a.id === beforeAnalysisId) || null,
    [analyses, beforeAnalysisId]
  );
  
  const afterAnalysis = useMemo(() => 
    analyses.find(a => a.id === afterAnalysisId) || null,
    [analyses, afterAnalysisId]
  );

  const progressMetrics = useMemo(() => {
    if (!beforeAnalysis || !afterAnalysis) return null;

    const scoreDiff = afterAnalysis.overall_score - beforeAnalysis.overall_score;
    const hydrationDiff = (afterAnalysis.hydration_level || 0) - (beforeAnalysis.hydration_level || 0);
    const oilinessDiff = (afterAnalysis.oiliness_level || 0) - (beforeAnalysis.oiliness_level || 0);
    const daysBetween = differenceInDays(
      new Date(afterAnalysis.created_at),
      new Date(beforeAnalysis.created_at)
    );

    return {
      scoreDiff,
      hydrationDiff,
      oilinessDiff,
      daysBetween,
      scoreImproved: scoreDiff > 0,
      hydrationImproved: hydrationDiff > 0,
      oilinessImproved: oilinessDiff < 0, // Lower oiliness is usually better
    };
  }, [beforeAnalysis, afterAnalysis]);

  const getTrendIcon = (diff: number, invertPositive = false) => {
    const isPositive = invertPositive ? diff < 0 : diff > 0;
    if (diff === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (isPositive) return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getDiffLabel = (diff: number, suffix = "") => {
    if (diff === 0) return "No change";
    const sign = diff > 0 ? "+" : "";
    return `${sign}${diff}${suffix}`;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Block HEIC/HEIF files
    if (file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
      toast.error("HEIC/HEIF files are not supported. Please convert to JPG or PNG.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      toast.error("Please select an image first");
      return;
    }

    if (!user) {
      toast.error("Please sign in to analyze your skin");
      return;
    }

    if (!hasEnoughCredits(creditCost)) {
      toast.error(`You need ${creditCost} credits for skin analysis`);
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await supabase.functions.invoke("skin-ai", {
        body: {
          action: "analyze",
          image_base64: selectedImage,
          skin_profile: skinProfile,
        },
      });

      if (response.error) throw response.error;

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setResult(response.data.data);
      refetch();
      toast.success("Skin analysis complete!");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze skin");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAnalysis = async () => {
    if (!result || !user) {
      toast.error("No analysis to save");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("skin_analyses").insert({
        user_id: user.id,
        image_url: selectedImage,
        skin_type: result.skin_type,
        overall_score: result.overall_score,
        hydration_level: result.hydration_level,
        oiliness_level: result.oiliness_level,
        concerns: result.concerns as unknown as undefined,
        recommendations: result.recommendations as unknown as undefined,
        analysis_summary: result.analysis_summary,
      } as any);

      if (error) throw error;

      toast.success("Analysis saved to history!");
      clearImage();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error("Failed to save analysis");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      const { error } = await supabase.from("skin_analyses").delete().eq("id", id);
      if (error) throw error;
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      toast.success("Analysis deleted");
    } catch (error: any) {
      toast.error("Failed to delete analysis");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "mild":
        return "text-muted-foreground";
      case "moderate":
        return "text-foreground";
      case "severe":
        return "text-foreground font-semibold";
      default:
        return "text-muted-foreground";
    }
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Attention";
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sign in to use Skin AI</h3>
            <p className="text-muted-foreground">
              Get personalized skin analysis and track your skin health over time
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while checking for profile
  if (isLoadingProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Loading your profile...</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show onboarding if no profile exists
  if (!skinProfile) {
    return (
      <SkinOnboarding 
        userId={user.id} 
        onComplete={handleOnboardingComplete} 
      />
    );
  }

  // Get latest analysis for dashboard stats
  const latestAnalysis = analyses[0] || null;
  const scoreProgress = latestAnalysis ? latestAnalysis.overall_score : 0;
  const hydrationProgress = latestAnalysis?.hydration_level || 0;
  const oilinessProgress = latestAnalysis?.oiliness_level || 0;
  const totalAnalyses = analyses.length;
  const avgScore = analyses.length > 0 
    ? Math.round(analyses.reduce((sum, a) => sum + a.overall_score, 0) / analyses.length)
    : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
      {/* First-time App Download Popup */}
      <Dialog open={showAppPopup} onOpenChange={handleCloseAppPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📱 Download Our App
            </DialogTitle>
            <DialogDescription className="pt-2">
              For the better result and track your data, download our mobile app
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <a
              href="https://apps.apple.com/us/app/timeless-all-in-one-ai/id6740804440"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button variant="outline" className="w-full gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Download on App Store
              </Button>
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.wolfine.app"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              <Button variant="outline" className="w-full gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                </svg>
                Get it on Google Play
              </Button>
            </a>
            <Button variant="ghost" onClick={handleCloseAppPopup} className="mt-2">
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            Hello <span className="text-2xl">✨</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setMainTab("history")}
        >
          <History className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Latest Score Card */}
        <Card className="border-0 bg-secondary/50 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs font-normal">
                {scoreProgress >= 80 ? "Excellent" : scoreProgress >= 60 ? "Good" : scoreProgress >= 40 ? "Fair" : "---"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Skin Score</p>
            <p className="text-2xl font-bold">
              {latestAnalysis ? latestAnalysis.overall_score : "--"}
              <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>
            </p>
            <Progress value={scoreProgress} className="h-1.5 mt-4" />
          </CardContent>
        </Card>

        {/* Hydration Card */}
        <Card className="border-0 bg-secondary/50 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Droplets className="h-5 w-5 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs font-normal">
                {hydrationProgress}%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Hydration</p>
            <p className="text-2xl font-bold">
              {latestAnalysis?.hydration_level ?? "--"}
              <span className="text-sm font-normal text-muted-foreground ml-1">%</span>
            </p>
            <Progress value={hydrationProgress} className="h-1.5 mt-4" />
          </CardContent>
        </Card>

        {/* Oiliness Card */}
        <Card className="border-0 bg-secondary/50 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Sun className="h-5 w-5 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs font-normal">
                {oilinessProgress}%
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Oiliness</p>
            <p className="text-2xl font-bold">
              {latestAnalysis?.oiliness_level ?? "--"}
              <span className="text-sm font-normal text-muted-foreground ml-1">%</span>
            </p>
            <Progress value={oilinessProgress} className="h-1.5 mt-4" />
          </CardContent>
        </Card>

        {/* Total Analyses Card */}
        <Card className="border-0 bg-secondary/50 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs font-normal">
                Avg: {avgScore || "--"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Analyses</p>
            <p className="text-2xl font-bold">
              {totalAnalyses}
              <span className="text-sm font-normal text-muted-foreground ml-1">total</span>
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-3 h-8 text-xs"
              onClick={() => setMainTab("progress")}
            >
              View Progress
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Progress Ring + Quick Info Row */}
      {latestAnalysis && (
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          {/* Progress Ring Card */}
          <Card className="md:col-span-2 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Current Status</h3>
                <Badge className={cn(
                  "text-xs",
                  scoreProgress >= 80 ? "bg-green-500/20 text-green-500" :
                  scoreProgress >= 60 ? "bg-yellow-500/20 text-yellow-500" :
                  "bg-red-500/20 text-red-500"
                )}>
                  {getScoreLabel(scoreProgress)}
                </Badge>
              </div>
              <div className="flex items-center justify-center py-4">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${scoreProgress * 2.51} 251`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-3xl font-bold">{latestAnalysis.overall_score}</p>
                    <p className="text-xs text-muted-foreground capitalize">{latestAnalysis.skin_type}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-secondary/30">
                  <p className="text-muted-foreground">Skin Type</p>
                  <p className="font-semibold capitalize">{latestAnalysis.skin_type}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/30">
                  <p className="text-muted-foreground">Last Check</p>
                  <p className="font-semibold">{format(new Date(latestAnalysis.created_at), "MMM d")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Concerns & Tips Card */}
          <Card className="md:col-span-3 border-border/50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Active Concerns
              </h3>
              {latestAnalysis.concerns && latestAnalysis.concerns.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {latestAnalysis.concerns.slice(0, 3).map((concern, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                      <span className="text-sm">{concern.name}</span>
                      <Badge variant="outline" className="text-xs capitalize">{concern.severity}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">No concerns detected</p>
              )}
              
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Recommendations
              </h3>
              {latestAnalysis.recommendations && latestAnalysis.recommendations.length > 0 ? (
                <ul className="space-y-1">
                  {latestAnalysis.recommendations.slice(0, 2).map((rec, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Complete an analysis to get recommendations</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dashboard Quick Cards */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Product Suggestions Section */}
        {latestAnalysis && latestAnalysis.concerns && latestAnalysis.concerns.length > 0 && (
          <SkinProductSuggestions
            skinType={latestAnalysis.skin_type}
            concerns={latestAnalysis.concerns}
            compact={true}
            skinProfile={skinProfile}
          />
        )}

        {/* Routine Preview */}
        <div 
          className="cursor-pointer" 
          onClick={() => setMainTab("routine")}
        >
          <SkinRoutineBuilder
            skinProfile={skinProfile}
            latestAnalysis={latestAnalysis ? {
              skin_type: latestAnalysis.skin_type,
              overall_score: latestAnalysis.overall_score,
              hydration_level: latestAnalysis.hydration_level,
              oiliness_level: latestAnalysis.oiliness_level,
              concerns: latestAnalysis.concerns,
              recommendations: latestAnalysis.recommendations,
            } : null}
            compact={true}
          />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "analyze" | "history" | "progress" | "routine")}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="analyze" className="gap-2">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Analyze</span>
          </TabsTrigger>
          <TabsTrigger value="routine" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Routine</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Progress</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Analyze Tab */}
        <TabsContent value="analyze" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-muted-foreground" />
                  Upload Photo
                </CardTitle>
                <CardDescription>
                  Take a clear photo of your face in good lighting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />

                {selectedImage ? (
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt="Selected"
                      className="w-full h-64 object-cover rounded-xl"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={clearImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-64 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Upload your photo</p>
                      <p className="text-sm text-muted-foreground">
                        Click or tap to select
                      </p>
                    </div>
                  </button>
                )}

                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={analyzeImage}
                  disabled={!selectedImage || isAnalyzing || !hasEnoughCredits(creditCost)}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Analyze Skin ({creditCost} credits)
                    </>
                  )}
                </Button>

                {/* Credits Display */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Available credits</span>
                    <Badge variant="secondary" className="font-mono">
                      {credits ?? "..."}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Section */}
            <Card className="border-border/50 flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-muted-foreground" />
                  Skin Analysis
                </CardTitle>
                <CardDescription>
                  Your personalized skin health report
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                {isAnalyzing ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : result ? (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="text-center p-6 rounded-xl bg-secondary/50 border border-border/50">
                      <Heart className="h-8 w-8 text-foreground mx-auto mb-2" />
                      <p className="text-4xl font-bold">{result.overall_score}</p>
                      <p className="text-muted-foreground">{getScoreLabel(result.overall_score)}</p>
                    </div>

                    {/* Skin Type & Levels */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-4 rounded-xl bg-secondary/50">
                        <Sun className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm font-medium capitalize">{result.skin_type}</p>
                        <p className="text-xs text-muted-foreground">Skin Type</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-secondary/50">
                        <Droplets className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm font-medium">{result.hydration_level}%</p>
                        <p className="text-xs text-muted-foreground">Hydration</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-secondary/50">
                        <Sun className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-sm font-medium">{result.oiliness_level}%</p>
                        <p className="text-xs text-muted-foreground">Oiliness</p>
                      </div>
                    </div>

                    {/* Concerns */}
                    {result.concerns.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Concerns Detected
                        </h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {result.concerns.map((concern, index) => (
                            <div
                              key={index}
                              className="flex items-start justify-between p-3 rounded-lg bg-secondary/30"
                            >
                              <div>
                                <p className={cn("font-medium", getSeverityColor(concern.severity))}>
                                  {concern.name}
                                </p>
                                <p className="text-xs text-muted-foreground">{concern.description}</p>
                              </div>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {concern.severity}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {result.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Recommendations
                        </h4>
                        <ul className="space-y-2 max-h-32 overflow-y-auto">
                          {result.recommendations.map((rec, index) => (
                            <li
                              key={index}
                              className="text-sm p-3 rounded-lg bg-secondary/30 text-muted-foreground flex items-start gap-2"
                            >
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Save Button */}
                    <Button className="w-full gap-2" onClick={saveAnalysis} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Save to History
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <Sparkles className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-[200px]">
                      Upload a photo to get your personalized skin analysis
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Product Suggestions after Analysis */}
          {result && result.concerns && result.concerns.length > 0 && (
            <SkinProductSuggestions
              skinType={result.skin_type}
              concerns={result.concerns}
              compact={false}
              skinProfile={skinProfile}
            />
          )}
        </TabsContent>

        {/* Routine Tab */}
        <TabsContent value="routine" className="space-y-6">
          <SkinRoutineBuilder
            skinProfile={skinProfile}
            latestAnalysis={latestAnalysis ? {
              skin_type: latestAnalysis.skin_type,
              overall_score: latestAnalysis.overall_score,
              hydration_level: latestAnalysis.hydration_level,
              oiliness_level: latestAnalysis.oiliness_level,
              concerns: latestAnalysis.concerns,
              recommendations: latestAnalysis.recommendations,
            } : null}
          />
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-6">
          {isLoadingHistory ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : analyses.length < 2 ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Not enough data</h3>
                <p className="text-muted-foreground mb-4">
                  Save at least 2 skin analyses to compare your progress
                </p>
                <Button onClick={() => setMainTab("analyze")}>
                  Start New Analysis
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Date Selection */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Select Analyses to Compare
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Before</label>
                      <Select 
                        value={beforeAnalysisId || ""} 
                        onValueChange={setBeforeAnalysisId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select earlier analysis" />
                        </SelectTrigger>
                        <SelectContent>
                          {analyses.map((a) => (
                            <SelectItem key={a.id} value={a.id} disabled={a.id === afterAnalysisId}>
                              {format(new Date(a.created_at), "MMM d, yyyy")} - Score: {a.overall_score}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">After</label>
                      <Select 
                        value={afterAnalysisId || ""} 
                        onValueChange={setAfterAnalysisId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select later analysis" />
                        </SelectTrigger>
                        <SelectContent>
                          {analyses.map((a) => (
                            <SelectItem key={a.id} value={a.id} disabled={a.id === beforeAnalysisId}>
                              {format(new Date(a.created_at), "MMM d, yyyy")} - Score: {a.overall_score}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {beforeAnalysis && afterAnalysis && progressMetrics && (
                <>
                  {/* Before/After Photos */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Before & After Photos</CardTitle>
                      <CardDescription>
                        {progressMetrics.daysBetween} days between analyses
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground text-center">
                            {format(new Date(beforeAnalysis.created_at), "MMM d, yyyy")}
                          </div>
                          {beforeAnalysis.image_url ? (
                            <img
                              src={beforeAnalysis.image_url}
                              alt="Before"
                              className="w-full aspect-square object-cover rounded-xl border border-border"
                            />
                          ) : (
                            <div className="w-full aspect-square rounded-xl border border-border bg-muted flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="text-center">
                            <Badge variant="secondary">Score: {beforeAnalysis.overall_score}</Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground text-center">
                            {format(new Date(afterAnalysis.created_at), "MMM d, yyyy")}
                          </div>
                          {afterAnalysis.image_url ? (
                            <img
                              src={afterAnalysis.image_url}
                              alt="After"
                              className="w-full aspect-square object-cover rounded-xl border border-border"
                            />
                          ) : (
                            <div className="w-full aspect-square rounded-xl border border-border bg-muted flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="text-center">
                            <Badge variant="secondary">Score: {afterAnalysis.overall_score}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Score Changes */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Progress Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Overall Score */}
                      <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Overall Score</span>
                          <div className="flex items-center gap-2">
                            {getTrendIcon(progressMetrics.scoreDiff)}
                            <span className={cn(
                              "font-semibold",
                              progressMetrics.scoreDiff > 0 && "text-green-500",
                              progressMetrics.scoreDiff < 0 && "text-red-500"
                            )}>
                              {getDiffLabel(progressMetrics.scoreDiff)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-muted-foreground">
                            {beforeAnalysis.overall_score}
                          </span>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                          <span className="text-2xl font-bold">
                            {afterAnalysis.overall_score}
                          </span>
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Hydration */}
                        <div className="p-3 rounded-lg bg-secondary/30">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Droplets className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Hydration</span>
                            </div>
                            {getTrendIcon(progressMetrics.hydrationDiff)}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">
                              {beforeAnalysis.hydration_level || 0}%
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {afterAnalysis.hydration_level || 0}%
                            </span>
                          </div>
                          <span className={cn(
                            "text-xs",
                            progressMetrics.hydrationDiff > 0 && "text-green-500",
                            progressMetrics.hydrationDiff < 0 && "text-red-500",
                            progressMetrics.hydrationDiff === 0 && "text-muted-foreground"
                          )}>
                            {getDiffLabel(progressMetrics.hydrationDiff, "%")}
                          </span>
                        </div>

                        {/* Oiliness */}
                        <div className="p-3 rounded-lg bg-secondary/30">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Sun className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Oiliness</span>
                            </div>
                            {getTrendIcon(progressMetrics.oilinessDiff, true)}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">
                              {beforeAnalysis.oiliness_level || 0}%
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {afterAnalysis.oiliness_level || 0}%
                            </span>
                          </div>
                          <span className={cn(
                            "text-xs",
                            progressMetrics.oilinessDiff < 0 && "text-green-500",
                            progressMetrics.oilinessDiff > 0 && "text-red-500",
                            progressMetrics.oilinessDiff === 0 && "text-muted-foreground"
                          )}>
                            {getDiffLabel(progressMetrics.oilinessDiff, "%")}
                          </span>
                        </div>
                      </div>

                      {/* Skin Type Changes */}
                      {beforeAnalysis.skin_type !== afterAnalysis.skin_type && (
                        <div className="p-3 rounded-lg bg-secondary/30">
                          <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Skin Type Changed</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="capitalize">
                              {beforeAnalysis.skin_type}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="secondary" className="capitalize">
                              {afterAnalysis.skin_type}
                            </Badge>
                          </div>
                        </div>
                      )}

                      {/* Concerns Comparison */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Concerns Comparison
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-secondary/30">
                            <p className="text-xs text-muted-foreground mb-1">Before</p>
                            <p className="text-sm font-medium">
                              {beforeAnalysis.concerns?.length || 0} concerns
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-secondary/30">
                            <p className="text-xs text-muted-foreground mb-1">After</p>
                            <p className="text-sm font-medium">
                              {afterAnalysis.concerns?.length || 0} concerns
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Skin Score Trend Chart */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <LineChartIcon className="h-4 w-4" />
                    Score Trend Over Time
                  </CardTitle>
                  <CardDescription>
                    Track your skin health score across all analyses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SkinScoreTrendChart analyses={analyses} />
                </CardContent>
              </Card>

              {/* Skin Health Insights */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Health Insights
                  </CardTitle>
                  <CardDescription>
                    Weekly and monthly patterns with personalized tips
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SkinHealthInsights analyses={analyses} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          {isLoadingHistory ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : analyses.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No analysis history</h3>
                <p className="text-muted-foreground">
                  Your saved skin analyses will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {analyses.map((analysis) => (
                <Card key={analysis.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {analysis.image_url && (
                        <img
                          src={analysis.image_url}
                          alt="Skin analysis"
                          className="w-20 h-20 object-cover rounded-lg shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="capitalize">
                              {analysis.skin_type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Score: {analysis.overall_score}/100
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteAnalysis(analysis.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {analysis.analysis_summary && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {analysis.analysis_summary}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(analysis.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SkinAITool;
