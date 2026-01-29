import { useState } from "react";
import { ArrowLeft, Brain, Gamepad2, TrendingUp, Lightbulb, Plus, Lock, Focus, Heart, Zap, Grid3X3, Calculator, Search, Type, Timer, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileBrainAIProps {
  onBack: () => void;
}

export function MobileBrainAI({ onBack }: MobileBrainAIProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "games" | "trends" | "insights">("dashboard");
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isPremium] = useState(true); // Simulated premium status

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "games", label: "Games" },
    { id: "trends", label: "Trends" },
    { id: "insights", label: "Insights" },
  ] as const;

  if (!isPremium) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="px-4 py-3 flex items-center">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="ml-3 text-base font-semibold text-foreground">Brain AI</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-3">Brain AI is a Premium Feature</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Unlock cognitive wellness insights, focus tracking, and personalized recommendations with an active subscription.
          </p>
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            View Subscription Plans
          </button>
        </div>
      </div>
    );
  }

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
            <Brain className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Welcome to Brain AI</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Track your cognitive wellness, monitor focus and stress, and get personalized insights.
          </p>
          <div className="w-full space-y-3 mb-8">
            {[
              { icon: Focus, title: "Focus Tracking", desc: "Monitor your attention span" },
              { icon: Heart, title: "Mood Stability", desc: "Track emotional balance" },
              { icon: Gamepad2, title: "Brain Games", desc: "Exercise your mind" },
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <Brain className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">Brain AI</h1>
            <p className="text-xs text-muted-foreground">Cognitive Wellness Dashboard</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "dashboard" && (
          <div className="p-4 space-y-4">
            {/* Main Score */}
            <div className="p-6 bg-secondary rounded-2xl border border-border text-center">
              <p className="text-sm text-muted-foreground mb-2">Today's Brain Performance</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-foreground">85</span>
                <span className="text-muted-foreground">/100</span>
              </div>
              <p className="text-sm text-green-500 mt-2">You're performing well today!</p>
              <div className="flex justify-around mt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">45</p>
                  <p className="text-xs text-muted-foreground">Deep Work (min)</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">12</p>
                  <p className="text-xs text-muted-foreground">App Switches</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">3</p>
                  <p className="text-xs text-muted-foreground">Check-ins</p>
                </div>
              </div>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Focus, label: "Focus", score: 82 },
                { icon: Zap, label: "Stress Load", score: 25 },
                { icon: Heart, label: "Mood", score: 78 },
                { icon: TrendingUp, label: "Reaction", score: 91 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-4 rounded-xl border bg-secondary border-border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{item.score}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "games" && (
          <div className="p-4">
            <h3 className="text-base font-semibold text-foreground mb-3">Brain Games</h3>
            <div className="space-y-3">
              {[
                { name: "Memory Match", desc: "Test your memory", icon: Grid3X3 },
                { name: "Speed Math", desc: "Quick calculations", icon: Calculator },
                { name: "Pattern Recognition", desc: "Find the pattern", icon: Search },
                { name: "Word Puzzle", desc: "Vocabulary challenge", icon: Type },
                { name: "Reaction Test", desc: "Test your reflexes", icon: Zap },
                { name: "Focus Timer", desc: "Deep work session", icon: Timer },
              ].map((game) => (
                <button
                  key={game.name}
                  onClick={() => alert(`Launching ${game.name}...`)}
                  className="w-full flex items-center gap-3 p-4 bg-secondary rounded-xl text-left border border-border"
                >
                  <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center">
                    <game.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{game.name}</p>
                    <p className="text-xs text-muted-foreground">{game.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "trends" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Weekly Trends</h3>
            <p className="text-sm text-muted-foreground">
              Track your performance for a week to see trends.
            </p>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="p-4">
            <h3 className="text-base font-semibold text-foreground mb-3">Today's Insights</h3>
            <div className="space-y-3">
              {[
                { text: "Your focus improved 15% this week!" },
                { text: "Try taking breaks every 25 minutes" },
                { text: "Stress levels higher than usual today" },
              ].map((insight, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border bg-secondary border-border flex items-start gap-3"
                >
                  <Lightbulb className="w-5 h-5 shrink-0 mt-0.5 text-muted-foreground" />
                  <p className="text-sm text-foreground">{insight.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="absolute bottom-6 right-4 px-4 py-3 bg-primary text-primary-foreground rounded-full flex items-center gap-2 shadow-lg">
        <Plus className="w-5 h-5" />
        <span className="text-sm font-medium">Mood Check-In</span>
      </button>
    </div>
  );
}
