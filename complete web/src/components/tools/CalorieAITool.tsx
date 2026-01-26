import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CalorieOnboarding, { CalorieProfile } from "./CalorieOnboarding";
import { 
  Camera, 
  Loader2, 
  Sparkles, 
  Apple,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Heart,
  Lightbulb,
  Search,
  X,
  ImageIcon,
  Plus,
  History,
  Calendar,
  TrendingUp,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Target,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Mail,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus,
  Send,
  UtensilsCrossed,
  Clock,
  ChefHat,
  Zap,
  Activity,
  GlassWater
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, LineChart, Line, ReferenceLine, PieChart, Pie, Cell } from "recharts";

interface NutritionInfo {
  food_name: string;
  serving_size: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  confidence: number;
}

interface AnalysisResult {
  foods: NutritionInfo[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meal_description: string;
  health_score: number;
  suggestions: string[];
}

interface MealLog {
  id: string;
  user_id: string;
  meal_type: string;
  foods: NutritionInfo[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  health_score: number;
  meal_description: string;
  logged_at: string;
  created_at: string;
}

interface DailyStats {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: number;
}

interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: string;
  ingredients: string[];
  meal_type: string;
  image_url?: string;
}

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast", icon: "🌅" },
  { value: "lunch", label: "Lunch", icon: "☀️" },
  { value: "dinner", label: "Dinner", icon: "🌙" },
  { value: "snack", label: "Snack", icon: "🍎" },
];

const CalorieAITool = () => {
  const [mainTab, setMainTab] = useState<"analyze" | "history" | "plan">("analyze");
  const [activeTab, setActiveTab] = useState<"camera" | "text">("camera");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [foodDescription, setFoodDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [mealType, setMealType] = useState("snack");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History state
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");

  // Calorie goal state
  const [calorieGoal, setCalorieGoal] = useState<number>(() => {
    const saved = localStorage.getItem("calorieGoal");
    return saved ? parseInt(saved, 10) : 2000;
  });
  const [proteinGoal, setProteinGoal] = useState<number>(() => {
    const saved = localStorage.getItem("proteinGoal");
    return saved ? parseInt(saved, 10) : 150;
  });
  const [carbsGoal, setCarbsGoal] = useState<number>(() => {
    const saved = localStorage.getItem("carbsGoal");
    return saved ? parseInt(saved, 10) : 250;
  });
  const [fatGoal, setFatGoal] = useState<number>(() => {
    const saved = localStorage.getItem("fatGoal");
    return saved ? parseInt(saved, 10) : 65;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(calorieGoal.toString());
  const [tempProteinGoal, setTempProteinGoal] = useState(proteinGoal.toString());
  const [tempCarbsGoal, setTempCarbsGoal] = useState(carbsGoal.toString());
  const [tempFatGoal, setTempFatGoal] = useState(fatGoal.toString());
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayProtein, setTodayProtein] = useState(0);
  const [todayCarbs, setTodayCarbs] = useState(0);
  const [todayFat, setTodayFat] = useState(0);
  const [isLoadingTodayCalories, setIsLoadingTodayCalories] = useState(false);

  // Weekly goal tracking state
  const [weeklyData, setWeeklyData] = useState<{
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    meals_logged: number;
    days_active: number;
    daily_average: number;
    goal_met_days: number;
  } | null>(null);
  const [weeklyChartData, setWeeklyChartData] = useState<Array<{
    day: string;
    date: string;
    calories: number;
    isToday: boolean;
  }>>([]);
  const [isLoadingWeeklyData, setIsLoadingWeeklyData] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState<"7d" | "30d">("7d");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(() => {
    return localStorage.getItem("calorieEmailNotifications") === "true";
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Meal planning state
  const [mealSuggestions, setMealSuggestions] = useState<MealSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [mealTypeFilter, setMealTypeFilter] = useState<string>("any");
  const [suggestionReasoning, setSuggestionReasoning] = useState<string>("");

  // Water tracking state
  const [waterGoal, setWaterGoal] = useState<number>(() => {
    const saved = localStorage.getItem("waterGoal");
    return saved ? parseInt(saved, 10) : 2000; // 2000ml = 8 glasses
  });
  const [todayWater, setTodayWater] = useState(0);
  const [isLoadingWater, setIsLoadingWater] = useState(false);
  const [isAddingWater, setIsAddingWater] = useState(false);
  const [tempWaterGoal, setTempWaterGoal] = useState("");

  // Onboarding state
  const [calorieProfile, setCalorieProfile] = useState<CalorieProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // First-time app download popup
  const [showAppPopup, setShowAppPopup] = useState(() => {
    const hasSeenPopup = localStorage.getItem("calorieAI_appPopupSeen");
    return !hasSeenPopup;
  });

  const handleCloseAppPopup = () => {
    localStorage.setItem("calorieAI_appPopupSeen", "true");
    setShowAppPopup(false);
  };

  const { credits, refetch, hasActiveSubscription } = useCredits();
  const { user } = useAuth();
  const imageCreditCost = 2;
  const textCreditCost = 1;

  const hasEnoughCredits = (cost: number) => {
    if (hasActiveSubscription) return true;
    if (credits === null) return false;
    return credits >= cost;
  };

  // Fetch meal history
  const fetchMealHistory = useCallback(async () => {
    if (!user) return;

    setIsLoadingHistory(true);
    try {
      const startDate = viewMode === "daily" 
        ? startOfDay(selectedDate)
        : startOfWeek(selectedDate, { weekStartsOn: 1 });
      const endDate = viewMode === "daily"
        ? endOfDay(selectedDate)
        : endOfWeek(selectedDate, { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from("meal_logs")
        .select("*")
        .gte("logged_at", startDate.toISOString())
        .lte("logged_at", endDate.toISOString())
        .order("logged_at", { ascending: false });

      if (error) throw error;

      // Cast the data to handle the JSONB foods field
      const typedData = (data || []).map((log: any) => ({
        ...log,
        foods: log.foods as NutritionInfo[],
        total_protein: Number(log.total_protein),
        total_carbs: Number(log.total_carbs),
        total_fat: Number(log.total_fat),
      })) as MealLog[];

      setMealLogs(typedData);

      // Calculate daily stats for chart
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const stats = days.map(day => {
        const dayLogs = typedData.filter(log => 
          format(new Date(log.logged_at), "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
        );
        return {
          date: format(day, viewMode === "daily" ? "HH:mm" : "EEE"),
          calories: dayLogs.reduce((sum, log) => sum + log.total_calories, 0),
          protein: dayLogs.reduce((sum, log) => sum + Number(log.total_protein), 0),
          carbs: dayLogs.reduce((sum, log) => sum + Number(log.total_carbs), 0),
          fat: dayLogs.reduce((sum, log) => sum + Number(log.total_fat), 0),
          meals: dayLogs.length,
        };
      });
      setDailyStats(stats);
    } catch (error: any) {
      console.error("Error fetching meal history:", error);
      toast.error("Failed to load meal history");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user, selectedDate, viewMode]);

  // Fetch today's calories and macros for goal tracking
  const fetchTodayCalories = useCallback(async () => {
    if (!user) return;

    setIsLoadingTodayCalories(true);
    try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const { data, error } = await supabase
        .from("meal_logs")
        .select("total_calories, total_protein, total_carbs, total_fat")
        .gte("logged_at", todayStart.toISOString())
        .lte("logged_at", todayEnd.toISOString());

      if (error) throw error;

      const totals = (data || []).reduce((acc, log) => ({
        calories: acc.calories + log.total_calories,
        protein: acc.protein + Number(log.total_protein),
        carbs: acc.carbs + Number(log.total_carbs),
        fat: acc.fat + Number(log.total_fat),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      setTodayCalories(totals.calories);
      setTodayProtein(totals.protein);
      setTodayCarbs(totals.carbs);
      setTodayFat(totals.fat);
    } catch (error: any) {
      console.error("Error fetching today's calories:", error);
    } finally {
      setIsLoadingTodayCalories(false);
    }
  }, [user]);

  // Fetch today's water intake
  const fetchTodayWater = useCallback(async () => {
    if (!user) return;

    setIsLoadingWater(true);
    try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const { data, error } = await supabase
        .from("water_logs")
        .select("amount_ml")
        .eq("user_id", user.id)
        .gte("logged_at", todayStart.toISOString())
        .lte("logged_at", todayEnd.toISOString());

      if (error) throw error;

      const total = (data || []).reduce((sum, log) => sum + log.amount_ml, 0);
      setTodayWater(total);
    } catch (error: any) {
      console.error("Error fetching water intake:", error);
    } finally {
      setIsLoadingWater(false);
    }
  }, [user]);

  // Add water intake
  const addWater = async (amount: number) => {
    if (!user) return;

    setIsAddingWater(true);
    try {
      const { error } = await supabase.from("water_logs").insert({
        user_id: user.id,
        amount_ml: amount,
        logged_at: new Date().toISOString(),
      });

      if (error) throw error;

      setTodayWater(prev => prev + amount);
      toast.success(`+${amount}ml water logged!`);
    } catch (error: any) {
      console.error("Error adding water:", error);
      toast.error("Failed to log water");
    } finally {
      setIsAddingWater(false);
    }
  };

  // Remove last water log
  const removeLastWater = async () => {
    if (!user || todayWater === 0) return;

    try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      // Get the most recent water log for today
      const { data, error: fetchError } = await supabase
        .from("water_logs")
        .select("id, amount_ml")
        .eq("user_id", user.id)
        .gte("logged_at", todayStart.toISOString())
        .lte("logged_at", todayEnd.toISOString())
        .order("logged_at", { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !data) {
        toast.error("No water log to remove");
        return;
      }

      const { error: deleteError } = await supabase
        .from("water_logs")
        .delete()
        .eq("id", data.id);

      if (deleteError) throw deleteError;

      setTodayWater(prev => Math.max(0, prev - data.amount_ml));
      toast.success("Water log removed");
    } catch (error: any) {
      console.error("Error removing water:", error);
      toast.error("Failed to remove water log");
    }
  };

  // Fetch user's calorie profile
  const fetchCalorieProfile = useCallback(async () => {
    if (!user) {
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from("calorie_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const profile: CalorieProfile = {
          age: data.age,
          gender: data.gender as CalorieProfile["gender"],
          height_cm: Number(data.height_cm),
          weight_kg: Number(data.weight_kg),
          activity_level: data.activity_level as CalorieProfile["activity_level"],
          goal: data.goal as CalorieProfile["goal"],
          target_weight_kg: data.target_weight_kg ? Number(data.target_weight_kg) : undefined,
          calculated_bmr: Number(data.calculated_bmr),
          calculated_tdee: Number(data.calculated_tdee),
          recommended_calories: data.recommended_calories,
          recommended_protein: data.recommended_protein,
          recommended_carbs: data.recommended_carbs,
          recommended_fat: data.recommended_fat,
        };
        setCalorieProfile(profile);
        
        // Apply recommended goals from profile
        setCalorieGoal(profile.recommended_calories);
        setProteinGoal(profile.recommended_protein);
        setCarbsGoal(profile.recommended_carbs);
        setFatGoal(profile.recommended_fat);
        
        // Update localStorage
        localStorage.setItem("calorieGoal", profile.recommended_calories.toString());
        localStorage.setItem("proteinGoal", profile.recommended_protein.toString());
        localStorage.setItem("carbsGoal", profile.recommended_carbs.toString());
        localStorage.setItem("fatGoal", profile.recommended_fat.toString());
        
        setShowOnboarding(false);
      } else {
        setShowOnboarding(true);
      }
    } catch (error: any) {
      console.error("Error fetching calorie profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user]);

  const handleOnboardingComplete = (profile: CalorieProfile) => {
    setCalorieProfile(profile);
    setShowOnboarding(false);
    
    // Apply the calculated goals
    setCalorieGoal(profile.recommended_calories);
    setProteinGoal(profile.recommended_protein);
    setCarbsGoal(profile.recommended_carbs);
    setFatGoal(profile.recommended_fat);
    
    // Update localStorage
    localStorage.setItem("calorieGoal", profile.recommended_calories.toString());
    localStorage.setItem("proteinGoal", profile.recommended_protein.toString());
    localStorage.setItem("carbsGoal", profile.recommended_carbs.toString());
    localStorage.setItem("fatGoal", profile.recommended_fat.toString());
    
    // Refresh data
    fetchTodayCalories();
    fetchWeeklyData();
  };

  useEffect(() => {
    if (user) {
      fetchCalorieProfile();
      fetchTodayCalories();
      fetchTodayWater();
      // Get user email
      supabase.auth.getUser().then(({ data }) => {
        setUserEmail(data.user?.email || null);
      });
    } else {
      setIsLoadingProfile(false);
    }
  }, [user, fetchCalorieProfile, fetchTodayCalories]);

  useEffect(() => {
    if (mainTab === "history" && user) {
      fetchMealHistory();
    }
  }, [mainTab, user, fetchMealHistory]);

  // Fetch chart data for goal tracking (7d or 30d)
  const fetchWeeklyData = useCallback(async () => {
    if (!user) return;

    setIsLoadingWeeklyData(true);
    try {
      const today = new Date();
      const rangeStart = chartTimeframe === "7d" 
        ? startOfWeek(today, { weekStartsOn: 1 })
        : subDays(today, 29);
      const rangeEnd = chartTimeframe === "7d"
        ? endOfWeek(today, { weekStartsOn: 1 })
        : endOfDay(today);

      const { data, error } = await supabase
        .from("meal_logs")
        .select("total_calories, total_protein, total_carbs, total_fat, logged_at")
        .gte("logged_at", rangeStart.toISOString())
        .lte("logged_at", rangeEnd.toISOString());

      if (error) throw error;

      const logs = data || [];
      const totalCalories = logs.reduce((sum, log) => sum + log.total_calories, 0);
      const totalProtein = logs.reduce((sum, log) => sum + Number(log.total_protein), 0);
      const totalCarbs = logs.reduce((sum, log) => sum + Number(log.total_carbs), 0);
      const totalFat = logs.reduce((sum, log) => sum + Number(log.total_fat), 0);

      // Calculate days active and goal met days
      const dayCalories: Record<string, number> = {};
      logs.forEach(log => {
        const day = format(new Date(log.logged_at), "yyyy-MM-dd");
        dayCalories[day] = (dayCalories[day] || 0) + log.total_calories;
      });

      const daysActive = Object.keys(dayCalories).length;
      const goalMetDays = Object.values(dayCalories).filter(cal => cal <= calorieGoal).length;
      const dailyAverage = daysActive > 0 ? totalCalories / daysActive : 0;

      setWeeklyData({
        total_calories: totalCalories,
        total_protein: totalProtein,
        total_carbs: totalCarbs,
        total_fat: totalFat,
        meals_logged: logs.length,
        days_active: daysActive,
        daily_average: dailyAverage,
        goal_met_days: goalMetDays,
      });

      // Build chart data for each day in the range
      const todayStr = format(today, "yyyy-MM-dd");
      const daysInRange = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
      const chartData = daysInRange.map(day => {
        const dateKey = format(day, "yyyy-MM-dd");
        // For 7d show single letter, for 30d show day number
        const dayLabel = chartTimeframe === "7d" 
          ? format(day, "EEE").charAt(0)
          : format(day, "d");
        return {
          day: dayLabel,
          date: dateKey,
          calories: dayCalories[dateKey] || 0,
          isToday: dateKey === todayStr,
        };
      });
      setWeeklyChartData(chartData);
    } catch (error: any) {
      console.error("Error fetching chart data:", error);
    } finally {
      setIsLoadingWeeklyData(false);
    }
  }, [user, calorieGoal, chartTimeframe]);

  useEffect(() => {
    if (user) {
      fetchWeeklyData();
    }
  }, [user, fetchWeeklyData]);

  const toggleEmailNotifications = (enabled: boolean) => {
    setEmailNotificationsEnabled(enabled);
    localStorage.setItem("calorieEmailNotifications", enabled.toString());
    toast.success(enabled ? "Weekly email notifications enabled" : "Weekly email notifications disabled");
  };

  const sendWeeklySummaryEmail = async () => {
    if (!user || !userEmail || !weeklyData) {
      toast.error("Unable to send email. Please try again.");
      return;
    }

    setIsSendingEmail(true);
    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      const response = await supabase.functions.invoke("calorie-weekly-summary", {
        body: {
          user_id: user.id,
          email: userEmail,
          display_name: profileData?.display_name,
          weekly_data: {
            ...weeklyData,
            calorie_goal: calorieGoal,
            week_start: format(weekStart, "MMM d"),
            week_end: format(weekEnd, "MMM d"),
          },
        },
      });

      if (response.error) throw response.error;

      toast.success("Weekly summary sent to your email!");
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error("Failed to send weekly summary email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const saveGoal = () => {
    const newGoal = parseInt(tempGoal, 10);
    const newProtein = parseInt(tempProteinGoal, 10);
    const newCarbs = parseInt(tempCarbsGoal, 10);
    const newFat = parseInt(tempFatGoal, 10);
    
    if (isNaN(newGoal) || newGoal < 500 || newGoal > 10000) {
      toast.error("Please enter a calorie goal between 500 and 10,000");
      return;
    }
    if (isNaN(newProtein) || newProtein < 10 || newProtein > 500) {
      toast.error("Please enter a protein goal between 10 and 500g");
      return;
    }
    if (isNaN(newCarbs) || newCarbs < 10 || newCarbs > 800) {
      toast.error("Please enter a carbs goal between 10 and 800g");
      return;
    }
    if (isNaN(newFat) || newFat < 10 || newFat > 300) {
      toast.error("Please enter a fat goal between 10 and 300g");
      return;
    }
    
    // Validate water goal
    const newWater = tempWaterGoal ? parseInt(tempWaterGoal, 10) : waterGoal;
    if (tempWaterGoal && (isNaN(newWater) || newWater < 500 || newWater > 5000)) {
      toast.error("Please enter a water goal between 500 and 5000ml");
      return;
    }

    setCalorieGoal(newGoal);
    setProteinGoal(newProtein);
    setCarbsGoal(newCarbs);
    setFatGoal(newFat);
    if (tempWaterGoal) {
      setWaterGoal(newWater);
      localStorage.setItem("waterGoal", newWater.toString());
    }
    localStorage.setItem("calorieGoal", newGoal.toString());
    localStorage.setItem("proteinGoal", newProtein.toString());
    localStorage.setItem("carbsGoal", newCarbs.toString());
    localStorage.setItem("fatGoal", newFat.toString());
    setIsEditingGoal(false);
    toast.success("Daily goals updated!");
  };

  const calorieProgress = Math.min((todayCalories / calorieGoal) * 100, 100);
  const proteinProgress = Math.min((todayProtein / proteinGoal) * 100, 100);
  const carbsProgress = Math.min((todayCarbs / carbsGoal) * 100, 100);
  const fatProgress = Math.min((todayFat / fatGoal) * 100, 100);
  
  const remainingCalories = calorieGoal - todayCalories;
  const remainingProtein = proteinGoal - todayProtein;
  const remainingCarbs = carbsGoal - todayCarbs;
  const remainingFat = fatGoal - todayFat;
  
  const isApproachingGoal = calorieProgress >= 80 && calorieProgress < 100;
  const isOverGoal = todayCalories >= calorieGoal;

  // Water tracking
  const waterProgress = Math.min((todayWater / waterGoal) * 100, 100);
  const waterGlasses = Math.floor(todayWater / 250); // 250ml per glass
  const waterGoalGlasses = Math.ceil(waterGoal / 250);

  // Weekly goal comparison
  const weeklyGoalTotal = calorieGoal * 7;
  const weeklyProgress = weeklyData ? Math.min((weeklyData.total_calories / weeklyGoalTotal) * 100, 100) : 0;
  const avgVsGoal = weeklyData ? weeklyData.daily_average - calorieGoal : 0;

  // Fetch meal suggestions based on remaining macros
  const fetchMealSuggestions = async () => {
    if (!user) {
      toast.error("Please sign in to get meal suggestions");
      return;
    }

    if (remainingCalories <= 0 && remainingProtein <= 0 && remainingCarbs <= 0 && remainingFat <= 0) {
      toast.error("You've already met your daily goals!");
      return;
    }

    setIsLoadingSuggestions(true);
    setMealSuggestions([]);
    setSuggestionReasoning("");

    try {
      const response = await supabase.functions.invoke("calorie-ai", {
        body: {
          action: "suggest_meals",
          remaining_macros: {
            calories: Math.max(0, remainingCalories),
            protein: Math.max(0, Math.round(remainingProtein)),
            carbs: Math.max(0, Math.round(remainingCarbs)),
            fat: Math.max(0, Math.round(remainingFat)),
          },
          meal_type_preference: mealTypeFilter !== "any" ? mealTypeFilter : undefined,
        },
      });

      if (response.error) throw response.error;

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const data = response.data.data;
      setMealSuggestions(data.suggestions || []);
      setSuggestionReasoning(data.reasoning || "");
      refetch();
      toast.success("Meal suggestions ready!");
    } catch (error: any) {
      console.error("Meal suggestion error:", error);
      toast.error(error.message || "Failed to get meal suggestions");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      toast.error("Please select an image first");
      return;
    }

    if (!hasEnoughCredits(imageCreditCost)) {
      toast.error(`You need ${imageCreditCost} credits for image analysis`);
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await supabase.functions.invoke("calorie-ai", {
        body: {
          action: "analyze_image",
          image: selectedImage,
        },
      });

      if (response.error) throw response.error;

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setResult(response.data.data);
      refetch();
      toast.success("Food analyzed successfully!");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze image");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeText = async () => {
    if (!foodDescription.trim()) {
      toast.error("Please describe your food");
      return;
    }

    if (!hasEnoughCredits(textCreditCost)) {
      toast.error(`You need ${textCreditCost} credit for text analysis`);
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await supabase.functions.invoke("calorie-ai", {
        body: {
          action: "analyze_text",
          food_description: foodDescription,
        },
      });

      if (response.error) throw response.error;

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setResult(response.data.data);
      refetch();
      toast.success("Nutrition info retrieved!");
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast.error(error.message || "Failed to analyze food");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveMeal = async () => {
    if (!result || !user) {
      toast.error("Please analyze food first and sign in");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("meal_logs").insert([{
        user_id: user.id,
        meal_type: mealType,
        foods: result.foods as any,
        total_calories: result.total_calories,
        total_protein: result.total_protein,
        total_carbs: result.total_carbs,
        total_fat: result.total_fat,
        health_score: result.health_score,
        meal_description: result.meal_description,
        logged_at: new Date().toISOString(),
      }]);

      if (error) throw error;

      toast.success("Meal saved to history!");
      setResult(null);
      setSelectedImage(null);
      setFoodDescription("");
      fetchTodayCalories(); // Refresh today's calories for goal tracking
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Error saving meal:", error);
      toast.error("Failed to save meal");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteMeal = async (mealId: string) => {
    try {
      const { error } = await supabase
        .from("meal_logs")
        .delete()
        .eq("id", mealId);

      if (error) throw error;

      setMealLogs(logs => logs.filter(l => l.id !== mealId));
      toast.success("Meal deleted");
      fetchMealHistory();
    } catch (error: any) {
      console.error("Error deleting meal:", error);
      toast.error("Failed to delete meal");
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 8) return "text-foreground";
    if (score >= 6) return "text-foreground";
    if (score >= 4) return "text-muted-foreground";
    return "text-muted-foreground";
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 8) return "Excellent";
    if (score >= 6) return "Good";
    if (score >= 4) return "Fair";
    return "Poor";
  };

  const navigateDate = (direction: "prev" | "next") => {
    const days = viewMode === "daily" ? 1 : 7;
    setSelectedDate(prev => 
      direction === "prev" ? subDays(prev, days) : new Date(prev.getTime() + days * 24 * 60 * 60 * 1000)
    );
  };

  // Calculate totals for current view
  const viewTotals = mealLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.total_calories,
      protein: acc.protein + Number(log.total_protein),
      carbs: acc.carbs + Number(log.total_carbs),
      fat: acc.fat + Number(log.total_fat),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Show loading state
  if (isLoadingProfile && user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Show onboarding for new users
  if (showOnboarding && user) {
    return <CalorieOnboarding userId={user.id} onComplete={handleOnboardingComplete} />;
  }

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
                <Apple className="h-5 w-5" />
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
            Hello{user ? '' : ' there'} 
            <span className="text-2xl">🥗</span>
          </h1>
          <p className="text-muted-foreground text-sm">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </div>
        {user && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsEditingGoal(!isEditingGoal)}
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Goal Editing Panel */}
      {isEditingGoal && user && (
        <Card className="border-border/50 mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Daily Goals
              </h3>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveGoal}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setTempGoal(calorieGoal.toString());
                  setTempProteinGoal(proteinGoal.toString());
                  setTempCarbsGoal(carbsGoal.toString());
                  setTempFatGoal(fatGoal.toString());
                  setTempWaterGoal(waterGoal.toString());
                  setIsEditingGoal(false);
                }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Calories</Label>
                <Input type="number" value={tempGoal} onChange={(e) => setTempGoal(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Protein (g)</Label>
                <Input type="number" value={tempProteinGoal} onChange={(e) => setTempProteinGoal(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Carbs (g)</Label>
                <Input type="number" value={tempCarbsGoal} onChange={(e) => setTempCarbsGoal(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fat (g)</Label>
                <Input type="number" value={tempFatGoal} onChange={(e) => setTempFatGoal(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Water (ml)</Label>
                <Input type="number" value={tempWaterGoal} onChange={(e) => setTempWaterGoal(e.target.value)} placeholder={waterGoal.toString()} className="h-9" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat Cards Grid */}
      {user && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Calories Burned Card */}
          <Card className="border-0 bg-secondary/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Flame className="h-5 w-5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs font-normal">
                  {Math.round(calorieProgress)}%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Calories</p>
              <p className="text-2xl font-bold">
                {isLoadingTodayCalories ? "..." : todayCalories}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ {calorieGoal}</span>
              </p>
              {/* Progress bar instead of mini chart */}
              <Progress value={calorieProgress} className="h-1.5 mt-4" />
            </CardContent>
          </Card>

          {/* Protein Card */}
          <Card className="border-0 bg-secondary/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Beef className="h-5 w-5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs font-normal">
                  {Math.round(proteinProgress)}%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Protein</p>
              <p className="text-2xl font-bold">
                {Math.round(todayProtein)}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ {proteinGoal}g</span>
              </p>
              <Progress value={proteinProgress} className="h-1.5 mt-4" />
            </CardContent>
          </Card>

          {/* Carbs Card */}
          <Card className="border-0 bg-secondary/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Wheat className="h-5 w-5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs font-normal">
                  {Math.round(carbsProgress)}%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Carbs</p>
              <p className="text-2xl font-bold">
                {Math.round(todayCarbs)}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ {carbsGoal}g</span>
              </p>
              <Progress value={carbsProgress} className="h-1.5 mt-4" />
            </CardContent>
          </Card>

          {/* Fat Card */}
          <Card className="border-0 bg-secondary/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Droplets className="h-5 w-5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs font-normal">
                  {Math.round(fatProgress)}%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Fat</p>
              <p className="text-2xl font-bold">
                {Math.round(todayFat)}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ {fatGoal}g</span>
              </p>
              <Progress value={fatProgress} className="h-1.5 mt-4" />
            </CardContent>
          </Card>

          {/* Water Intake Card */}
          <Card className="border-0 bg-secondary/50 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <GlassWater className="h-5 w-5 text-muted-foreground" />
                <Badge variant="secondary" className="text-xs font-normal">
                  {waterGlasses}/{waterGoalGlasses} 🥛
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Water</p>
              <p className="text-2xl font-bold">
                {isLoadingWater ? "..." : todayWater}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ {waterGoal}ml</span>
              </p>
              {/* Quick add/remove buttons */}
              <div className="flex gap-1 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1 hover:bg-secondary"
                  onClick={() => removeLastWater()}
                  disabled={todayWater === 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 h-8 text-xs gap-1"
                  onClick={() => addWater(250)}
                  disabled={isAddingWater}
                >
                  {isAddingWater ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  250ml
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress Ring + Weekly Chart Row */}
      {user && (
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          {/* Progress Ring Card */}
          <Card className="md:col-span-2 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Daily Progress</h3>
                {isOverGoal ? (
                  <Badge variant="destructive" className="text-xs">Over goal</Badge>
                ) : isApproachingGoal ? (
                  <Badge className="text-xs bg-yellow-500/20 text-yellow-500">Almost there</Badge>
                ) : (
                  <Badge className="text-xs bg-green-500/20 text-green-500">On track</Badge>
                )}
              </div>
              <div className="flex items-center justify-center py-4">
                <div className="relative">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'consumed', value: Math.min(todayCalories, calorieGoal) },
                          { name: 'remaining', value: Math.max(0, calorieGoal - todayCalories) }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={70}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        <Cell fill={isOverGoal ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-2xl font-bold">{Math.round(calorieProgress)}%</p>
                    <p className="text-xs text-muted-foreground">of goal</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-secondary/30">
                  <p className="text-muted-foreground">Consumed</p>
                  <p className="font-semibold">{todayCalories} kcal</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/30">
                  <p className="text-muted-foreground">Remaining</p>
                  <p className={cn("font-semibold", isOverGoal && "text-destructive")}>
                    {remainingCalories >= 0 ? remainingCalories : `+${Math.abs(remainingCalories)}`} kcal
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart Card */}
          <Card className="md:col-span-3 border-border/50 flex flex-col">
            <CardContent className="pt-4 px-4 pb-2 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{chartTimeframe === "7d" ? "Weekly" : "Monthly"} Trend</h3>
                  <div className="flex rounded-md border border-border overflow-hidden">
                    <button
                      onClick={() => setChartTimeframe("7d")}
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium transition-colors",
                        chartTimeframe === "7d" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      7D
                    </button>
                    <button
                      onClick={() => setChartTimeframe("30d")}
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium transition-colors",
                        chartTimeframe === "30d" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      )}
                    >
                      30D
                    </button>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs font-normal gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {weeklyData?.daily_average ? Math.round(weeklyData.daily_average) : 0} avg
                </Badge>
              </div>
              <div className="flex-1 min-h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyChartData} margin={{ top: 5, right: 15, left: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" strokeOpacity={0.3} horizontal vertical={false} />
                    <XAxis 
                      dataKey="day" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={chartTimeframe === "7d" ? 11 : 9} 
                      tickLine={false} 
                      axisLine={false}
                      interval={chartTimeframe === "30d" ? 4 : 0}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} domain={[0, 'auto']} width={35} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [`${value} kcal`, 'Calories']}
                    />
                    <ReferenceLine y={calorieGoal} stroke="hsl(var(--primary))" strokeDasharray="4 4" strokeOpacity={0.5} />
                    <Area type="monotone" dataKey="calories" stroke="none" fill="hsl(var(--foreground))" fillOpacity={0.1} />
                    <Line
                      type="monotone"
                      dataKey="calories"
                      stroke="hsl(var(--foreground))"
                      strokeWidth={2}
                      dot={chartTimeframe === "7d" ? (props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload.isToday) {
                          return <circle key={payload.date} cx={cx} cy={cy} r={5} fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth={2} />;
                        }
                        return <circle key={payload.date} cx={cx} cy={cy} r={3} fill="hsl(var(--foreground))" />;
                      } : false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button 
          variant={mainTab === "analyze" ? "default" : "secondary"}
          className="gap-2 whitespace-nowrap"
          onClick={() => setMainTab("analyze")}
        >
          <Plus className="h-4 w-4" />
          Log Food
        </Button>
        <Button 
          variant={mainTab === "plan" ? "default" : "secondary"}
          className="gap-2 whitespace-nowrap"
          onClick={() => setMainTab("plan")}
        >
          <ChefHat className="h-4 w-4" />
          Meal Ideas
        </Button>
        <Button 
          variant={mainTab === "history" ? "default" : "secondary"}
          className="gap-2 whitespace-nowrap"
          onClick={() => setMainTab("history")}
        >
          <History className="h-4 w-4" />
          History
        </Button>
      </div>


      {/* Main Content Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "analyze" | "history" | "plan")}>
        {/* Hidden TabsList - using buttons above instead */}
        <TabsList className="hidden">
          <TabsTrigger value="analyze">Log Food</TabsTrigger>
          <TabsTrigger value="plan">Meal Ideas</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Analyze Tab */}
        <TabsContent value="analyze" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Analyze Food
                </CardTitle>
                <CardDescription>
                  Upload a photo or describe what you ate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "camera" | "text")}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="camera" className="gap-2">
                      <Camera className="h-4 w-4" />
                      Photo
                    </TabsTrigger>
                    <TabsTrigger value="text" className="gap-2">
                      <Search className="h-4 w-4" />
                      Search
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="camera" className="space-y-4">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={fileInputRef}
                      onChange={handleImageSelect}
                      className="hidden"
                    />

                    {selectedImage ? (
                      <div className="relative">
                        <img
                          src={selectedImage}
                          alt="Selected food"
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
                          <p className="font-medium">Upload food photo</p>
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
                      disabled={!selectedImage || isAnalyzing || !hasEnoughCredits(imageCreditCost)}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Analyze Photo ({imageCreditCost} credits)
                        </>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="text" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Describe your food</Label>
                      <Textarea
                        placeholder="e.g., 2 eggs, 2 slices of toast with butter, and a glass of orange juice"
                        value={foodDescription}
                        onChange={(e) => setFoodDescription(e.target.value)}
                        className="min-h-[120px] resize-none"
                      />
                      <p className="text-xs text-muted-foreground">
                        Be specific about portions and ingredients for better accuracy
                      </p>
                    </div>

                    <Button
                      className="w-full gap-2"
                      size="lg"
                      onClick={analyzeText}
                      disabled={!foodDescription.trim() || isAnalyzing || !hasEnoughCredits(textCreditCost)}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Looking up...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4" />
                          Get Nutrition Info ({textCreditCost} credit)
                        </>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>

                {/* Credits Display */}
                <div className="mt-4 pt-4 border-t border-border">
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
                  <Flame className="h-5 w-5 text-orange-500" />
                  Nutrition Results
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of your meal
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
                    {/* Total Calories */}
                    <div className="text-center p-6 rounded-xl bg-secondary/50 border border-border/50">
                      <Flame className="h-8 w-8 text-foreground mx-auto mb-2" />
                      <p className="text-4xl font-bold">{result.total_calories}</p>
                      <p className="text-muted-foreground">Total Calories</p>
                    </div>

                    {/* Macros */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-4 rounded-xl bg-secondary/50">
                        <Beef className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xl font-bold">{result.total_protein}g</p>
                        <p className="text-xs text-muted-foreground">Protein</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-secondary/50">
                        <Wheat className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xl font-bold">{result.total_carbs}g</p>
                        <p className="text-xs text-muted-foreground">Carbs</p>
                      </div>
                      <div className="text-center p-4 rounded-xl bg-secondary/50">
                        <Droplets className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xl font-bold">{result.total_fat}g</p>
                        <p className="text-xs text-muted-foreground">Fat</p>
                      </div>
                    </div>

                    {/* Health Score */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <Heart className={cn("h-6 w-6", getHealthScoreColor(result.health_score))} />
                        <div>
                          <p className="font-medium">Health Score</p>
                          <p className="text-sm text-muted-foreground">
                            {getHealthScoreLabel(result.health_score)}
                          </p>
                        </div>
                      </div>
                      <p className={cn("text-3xl font-bold", getHealthScoreColor(result.health_score))}>
                        {result.health_score}/10
                      </p>
                    </div>

                    {/* Save Meal */}
                    {user && (
                      <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <Label>Meal Type</Label>
                        <Select value={mealType} onValueChange={setMealType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MEAL_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.icon} {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          className="w-full gap-2" 
                          onClick={saveMeal}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              Save to History
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Food Items */}
                    {result.foods.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">Food Items</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {result.foods.map((food, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                            >
                              <div>
                                <p className="font-medium">{food.food_name}</p>
                                <p className="text-xs text-muted-foreground">{food.serving_size}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-orange-400">{food.calories} cal</p>
                                <p className="text-xs text-muted-foreground">
                                  {Math.round(food.confidence * 100)}% confidence
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {result.suggestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-muted-foreground" />
                          Suggestions
                        </h4>
                        <ul className="space-y-2 max-h-32 overflow-y-auto">
                          {result.suggestions.map((suggestion, index) => (
                            <li
                              key={index}
                              className="text-sm p-3 rounded-lg bg-secondary/30 text-muted-foreground"
                            >
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <Apple className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-[200px]">
                      Upload a photo or describe your food to see nutrition details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Meal Ideas Tab */}
        <TabsContent value="plan" className="mt-6">
          {!user ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sign in to get meal ideas</h3>
                <p className="text-muted-foreground">
                  Get personalized meal suggestions based on your remaining macros
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Remaining Macros Summary */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Remaining Today
                  </CardTitle>
                  <CardDescription>
                    Get meal suggestions that fit your remaining macro budget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                      <Flame className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{Math.max(0, remainingCalories)}</p>
                      <p className="text-xs text-muted-foreground">Calories</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                      <Beef className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{Math.max(0, Math.round(remainingProtein))}g</p>
                      <p className="text-xs text-muted-foreground">Protein</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                      <Wheat className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{Math.max(0, Math.round(remainingCarbs))}g</p>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                      <Droplets className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-bold">{Math.max(0, Math.round(remainingFat))}g</p>
                      <p className="text-xs text-muted-foreground">Fat</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select value={mealTypeFilter} onValueChange={setMealTypeFilter}>
                      <SelectTrigger className="sm:w-40">
                        <SelectValue placeholder="Any meal type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any meal type</SelectItem>
                        <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                        <SelectItem value="lunch">☀️ Lunch</SelectItem>
                        <SelectItem value="dinner">🌙 Dinner</SelectItem>
                        <SelectItem value="snack">🍎 Snack</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      className="flex-1 gap-2"
                      onClick={fetchMealSuggestions}
                      disabled={isLoadingSuggestions || !hasEnoughCredits(1)}
                    >
                      {isLoadingSuggestions ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Finding meals...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="h-4 w-4" />
                          Get Meal Ideas (1 credit)
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Suggestions Results */}
              {isLoadingSuggestions ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="border-border/50 overflow-hidden">
                      <Skeleton className="h-48 w-full" />
                      <CardContent className="p-4 space-y-3">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-16" />
                          <Skeleton className="h-8 w-16" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : mealSuggestions.length > 0 ? (
                <div className="space-y-4">
                  {suggestionReasoning && (
                    <Alert className="border-primary/30 bg-primary/5">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <AlertDescription className="text-muted-foreground">
                        {suggestionReasoning}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    {mealSuggestions.map((meal, index) => (
                      <Card key={index} className="border-border/50 hover:border-primary/30 transition-colors overflow-hidden">
                        {/* Meal Image */}
                        {meal.image_url && (
                          <div className="relative h-48 w-full overflow-hidden bg-secondary/30">
                            <img 
                              src={meal.image_url} 
                              alt={meal.name}
                              className="w-full h-full object-cover transition-transform hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        {!meal.image_url && (
                          <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                            <UtensilsCrossed className="h-12 w-12 text-primary/30" />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{meal.name}</h3>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {meal.meal_type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                              <Clock className="h-3.5 w-3.5" />
                              {meal.prep_time}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {meal.description}
                          </p>
                          
                          {/* Macros */}
                          <div className="grid grid-cols-4 gap-2 mb-3">
                            <div className="text-center p-2 rounded bg-orange-500/10">
                              <p className="text-sm font-bold">{meal.calories}</p>
                              <p className="text-xs text-muted-foreground">kcal</p>
                            </div>
                            <div className="text-center p-2 rounded bg-red-400/10">
                              <p className="text-sm font-bold">{meal.protein}g</p>
                              <p className="text-xs text-muted-foreground">protein</p>
                            </div>
                            <div className="text-center p-2 rounded bg-amber-400/10">
                              <p className="text-sm font-bold">{meal.carbs}g</p>
                              <p className="text-xs text-muted-foreground">carbs</p>
                            </div>
                            <div className="text-center p-2 rounded bg-yellow-400/10">
                              <p className="text-sm font-bold">{meal.fat}g</p>
                              <p className="text-xs text-muted-foreground">fat</p>
                            </div>
                          </div>

                          {/* Ingredients */}
                          {meal.ingredients && meal.ingredients.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Key ingredients:</p>
                              <div className="flex flex-wrap gap-1">
                                {meal.ingredients.slice(0, 5).map((ingredient, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {ingredient}
                                  </Badge>
                                ))}
                                {meal.ingredients.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{meal.ingredients.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <Card className="border-border/50">
                  <CardContent className="py-12 text-center">
                    <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No meal ideas yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Click "Get Meal Ideas" to receive personalized meal suggestions based on your remaining daily macros.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          {!user ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sign in to view history</h3>
                <p className="text-muted-foreground">
                  Track your meals over time by signing in
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Date Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigateDate("prev")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {viewMode === "daily" 
                        ? format(selectedDate, "EEEE, MMM d")
                        : `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "MMM d")}`
                      }
                    </span>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => navigateDate("next")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={viewMode} onValueChange={(v) => setViewMode(v as "daily" | "weekly")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-500/10 to-red-500/10">
                  <CardContent className="p-4 text-center">
                    <Flame className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{viewTotals.calories}</p>
                    <p className="text-xs text-muted-foreground">Calories</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-red-500/10 to-pink-500/10">
                  <CardContent className="p-4 text-center">
                    <Beef className="h-6 w-6 text-red-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{Math.round(viewTotals.protein)}g</p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500/10 to-yellow-500/10">
                  <CardContent className="p-4 text-center">
                    <Wheat className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{Math.round(viewTotals.carbs)}g</p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-yellow-500/10 to-lime-500/10">
                  <CardContent className="p-4 text-center">
                    <Droplets className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{Math.round(viewTotals.fat)}g</p>
                    <p className="text-xs text-muted-foreground">Fat</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              {dailyStats.length > 0 && viewMode === "weekly" && (
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Calorie Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyStats}>
                          <defs>
                            <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="date" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))", 
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              color: "hsl(var(--foreground))"
                            }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                            itemStyle={{ color: "hsl(var(--foreground))" }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="calories" 
                            stroke="hsl(var(--primary))" 
                            fill="url(#calorieGradient)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Weekly Goal Summary Card */}
              {viewMode === "weekly" && weeklyData && (
                <Card className="border-border/50 bg-secondary/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="h-5 w-5 text-muted-foreground" />
                        Weekly Goal Summary
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Email updates</span>
                          <Switch
                            checked={emailNotificationsEnabled}
                            onCheckedChange={toggleEmailNotifications}
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Average vs Goal Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-secondary/30 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Daily Average</p>
                        <p className="text-2xl font-bold">{Math.round(weeklyData.daily_average)}</p>
                        <p className="text-xs text-muted-foreground">cal/day</p>
                      </div>
                      <div className="p-4 rounded-xl bg-secondary/30 text-center">
                        <p className="text-sm text-muted-foreground mb-1">Daily Goal</p>
                        <p className="text-2xl font-bold">{calorieGoal}</p>
                        <p className="text-xs text-muted-foreground">cal/day</p>
                      </div>
                      <div className={cn(
                        "p-4 rounded-xl text-center",
                        avgVsGoal <= 0 ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        <p className="text-sm text-muted-foreground mb-1">Difference</p>
                        <div className="flex items-center justify-center gap-1">
                          {avgVsGoal < 0 ? (
                            <ArrowDown className="h-5 w-5 text-green-500" />
                          ) : avgVsGoal > 0 ? (
                            <ArrowUp className="h-5 w-5 text-red-500" />
                          ) : (
                            <Minus className="h-5 w-5 text-muted-foreground" />
                          )}
                          <p className={cn(
                            "text-2xl font-bold",
                            avgVsGoal <= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {Math.abs(Math.round(avgVsGoal))}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {avgVsGoal <= 0 ? "under goal" : "over goal"}
                        </p>
                      </div>
                    </div>

                    {/* Weekly Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Weekly Progress ({weeklyData.total_calories.toLocaleString()} / {weeklyGoalTotal.toLocaleString()} cal)
                        </span>
                        <span className={cn(
                          "font-medium",
                          weeklyProgress > 100 ? "text-red-500" : weeklyProgress >= 80 ? "text-yellow-500" : "text-green-500"
                        )}>
                          {Math.round(weeklyProgress)}%
                        </span>
                      </div>
                      <Progress 
                        value={weeklyProgress} 
                        className={cn(
                          "h-3",
                          weeklyProgress > 100 && "[&>div]:bg-red-500",
                          weeklyProgress >= 80 && weeklyProgress <= 100 && "[&>div]:bg-yellow-500"
                        )}
                      />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-secondary/20 text-center">
                        <p className="text-lg font-bold text-primary">{weeklyData.goal_met_days}/7</p>
                        <p className="text-xs text-muted-foreground">Days at goal</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/20 text-center">
                        <p className="text-lg font-bold">{weeklyData.meals_logged}</p>
                        <p className="text-xs text-muted-foreground">Meals logged</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/20 text-center">
                        <p className="text-lg font-bold">{weeklyData.days_active}/7</p>
                        <p className="text-xs text-muted-foreground">Days active</p>
                      </div>
                      <div className="p-3 rounded-lg bg-secondary/20 text-center">
                        <p className="text-lg font-bold">{Math.round(weeklyData.total_protein)}g</p>
                        <p className="text-xs text-muted-foreground">Total protein</p>
                      </div>
                    </div>

                    {/* Alert based on performance */}
                    {weeklyData.goal_met_days >= 5 ? (
                      <Alert className="border-border bg-secondary/50">
                        <CheckCircle2 className="h-4 w-4 text-foreground" />
                        <AlertDescription className="text-muted-foreground">
                          Excellent week! You met your calorie goal {weeklyData.goal_met_days} out of 7 days. Keep up the great work! 🎉
                        </AlertDescription>
                      </Alert>
                    ) : weeklyData.goal_met_days >= 3 ? (
                      <Alert className="border-border bg-secondary/50">
                        <AlertTriangle className="h-4 w-4 text-foreground" />
                        <AlertDescription className="text-muted-foreground">
                          Good progress! You met your goal {weeklyData.goal_met_days} out of 7 days. Try to stay consistent this week.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="border-border bg-secondary/50">
                        <Target className="h-4 w-4 text-foreground" />
                        <AlertDescription className="text-muted-foreground">
                          You met your goal {weeklyData.goal_met_days} out of 7 days. Consider adjusting your goal or logging more consistently.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Send Email Button */}
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={sendWeeklySummaryEmail}
                        disabled={isSendingEmail || !userEmail}
                      >
                        {isSendingEmail ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Send Summary to Email
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Meal List */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="h-5 w-5 text-muted-foreground" />
                    Logged Meals
                    <Badge variant="secondary" className="ml-2">
                      {mealLogs.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingHistory ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : mealLogs.length === 0 ? (
                    <div className="py-12 text-center">
                      <Apple className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No meals logged for this period</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mealLogs.map(log => {
                        const mealInfo = MEAL_TYPES.find(t => t.value === log.meal_type);
                        return (
                          <div
                            key={log.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-2xl">{mealInfo?.icon || "🍽️"}</div>
                              <div>
                                <p className="font-medium">
                                  {mealInfo?.label || "Meal"}
                                  <span className="text-muted-foreground ml-2 text-sm">
                                    {format(new Date(log.logged_at), "h:mm a")}
                                  </span>
                                </p>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {log.meal_description || `${log.foods.length} items`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-orange-400">{log.total_calories} cal</p>
                                <p className="text-xs text-muted-foreground">
                                  P: {Math.round(Number(log.total_protein))}g · C: {Math.round(Number(log.total_carbs))}g · F: {Math.round(Number(log.total_fat))}g
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => deleteMeal(log.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalorieAITool;
