import { useState } from "react";
import { ArrowLeft, Apple, Camera, Image, Flame, Droplet, Plus, Minus, Lightbulb, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileCalorieAIProps {
  onBack: () => void;
}

export function MobileCalorieAI({ onBack }: MobileCalorieAIProps) {
  const [activeTab, setActiveTab] = useState<"log" | "history" | "ideas">("log");
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [waterGlasses, setWaterGlasses] = useState(3);

  // Mock data
  const profile = {
    recommendedCalories: 2000,
    recommendedProtein: 120,
    recommendedCarbs: 250,
    recommendedFat: 65,
  };

  const todayData = {
    calories: 1450,
    protein: 85,
    carbs: 180,
    fat: 45,
  };

  const tabs = [
    { id: "log", label: "Log Food" },
    { id: "history", label: "History" },
    { id: "ideas", label: "Meal Ideas" },
  ] as const;

  if (showOnboarding) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="px-4 py-3 flex items-center">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
            <Apple className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Welcome to Calorie AI</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Track your nutrition with AI-powered food recognition and get personalized meal recommendations.
          </p>
          <div className="w-full space-y-3 mb-8">
            {[
              { icon: Camera, title: "Scan Food", desc: "Take a photo to analyze nutrition" },
              { icon: Flame, title: "Track Macros", desc: "Monitor calories, protein, carbs & fat" },
              { icon: Lightbulb, title: "Meal Ideas", desc: "Get AI-powered meal suggestions" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowOnboarding(false)}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            Get Started
          </button>
        </div>
      </div>
    );
  }

  const calorieProgress = todayData.calories / profile.recommendedCalories;
  const remainingCalories = profile.recommendedCalories - todayData.calories;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-foreground">Hello 🥗</h1>
              <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
          <button className="p-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stats Grid */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Calories */}
            <div className="p-3 bg-secondary rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <Flame className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{Math.round(calorieProgress * 100)}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Calories</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-foreground">{todayData.calories}</span>
                <span className="text-[10px] text-muted-foreground">/{profile.recommendedCalories}</span>
              </div>
              <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground transition-all" style={{ width: `${calorieProgress * 100}%` }} />
              </div>
            </div>

            {/* Protein */}
            <div className="p-3 bg-secondary rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">🥩</span>
                <span className="text-[10px] text-muted-foreground">{Math.round((todayData.protein / profile.recommendedProtein) * 100)}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Protein</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-foreground">{todayData.protein}g</span>
                <span className="text-[10px] text-muted-foreground">/{profile.recommendedProtein}g</span>
              </div>
              <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground transition-all" style={{ width: `${(todayData.protein / profile.recommendedProtein) * 100}%` }} />
              </div>
            </div>

            {/* Carbs */}
            <div className="p-3 bg-secondary rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">🌾</span>
                <span className="text-[10px] text-muted-foreground">{Math.round((todayData.carbs / profile.recommendedCarbs) * 100)}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Carbs</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-foreground">{todayData.carbs}g</span>
                <span className="text-[10px] text-muted-foreground">/{profile.recommendedCarbs}g</span>
              </div>
              <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground transition-all" style={{ width: `${(todayData.carbs / profile.recommendedCarbs) * 100}%` }} />
              </div>
            </div>

            {/* Fat */}
            <div className="p-3 bg-secondary rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <Droplet className="w-4 h-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{Math.round((todayData.fat / profile.recommendedFat) * 100)}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Fat</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-foreground">{todayData.fat}g</span>
                <span className="text-[10px] text-muted-foreground">/{profile.recommendedFat}g</span>
              </div>
              <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground transition-all" style={{ width: `${(todayData.fat / profile.recommendedFat) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Water Tracker */}
          <div className="p-4 bg-secondary rounded-xl border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Water</span>
              </div>
              <span className="text-xs text-muted-foreground">{waterGlasses}/8 glasses</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWaterGlasses(Math.max(0, waterGlasses - 1))}
                className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center"
              >
                <Minus className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-muted-foreground transition-all"
                  style={{ width: `${(waterGlasses / 8) * 100}%` }}
                />
              </div>
              <button
                onClick={() => setWaterGlasses(Math.min(8, waterGlasses + 1))}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
              >
                <Plus className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </div>

          {/* Remaining Calories */}
          <div className="p-5 bg-secondary rounded-2xl border border-border text-center">
            <p className="text-sm text-muted-foreground mb-1">Remaining Today</p>
            <p className={cn(
              "text-3xl font-bold",
              remainingCalories > 0 ? "text-foreground" : "text-destructive"
            )}>
              {remainingCalories > 0 ? remainingCalories : 0} cal
            </p>
            {remainingCalories < 0 && (
              <p className="text-xs text-destructive mt-1">Over by {Math.abs(remainingCalories)} cal</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === "log" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button className="p-6 bg-card border border-dashed border-border rounded-xl flex flex-col items-center gap-2">
                  <Camera className="w-8 h-8 text-primary" />
                  <span className="text-sm text-foreground">Scan Food</span>
                </button>
                <button className="p-6 bg-card border border-dashed border-border rounded-xl flex flex-col items-center gap-2">
                  <Image className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-foreground">From Gallery</span>
                </button>
              </div>
              <div className="p-4 bg-secondary rounded-xl text-center">
                <p className="text-sm text-muted-foreground">Or describe what you ate</p>
                <input
                  type="text"
                  placeholder="e.g., chicken salad with rice"
                  className="mt-2 w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {[
                { meal: "Breakfast", items: "Oatmeal with berries", cal: 350 },
                { meal: "Lunch", items: "Grilled chicken salad", cal: 520 },
                { meal: "Snack", items: "Greek yogurt", cal: 180 },
                { meal: "Dinner", items: "Salmon with vegetables", cal: 400 },
              ].map((log) => (
                <div key={log.meal} className="flex items-center gap-3 p-3 bg-secondary rounded-xl border border-border">
                  <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                    <Apple className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{log.meal}</p>
                    <p className="text-xs text-muted-foreground">{log.items}</p>
                  </div>
                  <span className="text-sm font-medium text-foreground">{log.cal} cal</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "ideas" && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Lightbulb className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">AI Meal Suggestions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Based on your remaining macros for today
              </p>
              <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium">
                Generate Ideas
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
