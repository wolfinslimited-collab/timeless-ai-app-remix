import { useState } from "react";
import { ArrowLeft, Moon, BarChart3, Lightbulb, Music, Flame, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileSleepAIProps {
  onBack: () => void;
}

export function MobileSleepAI({ onBack }: MobileSleepAIProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "log" | "insights" | "sounds">("dashboard");
  const [showOnboarding, setShowOnboarding] = useState(true);

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "log", label: "Log" },
    { id: "insights", label: "Insights" },
    { id: "sounds", label: "Sounds" },
  ] as const;

  const sounds = [
    { id: "rain", name: "Rain", emoji: "🌧️" },
    { id: "ocean", name: "Ocean Waves", emoji: "🌊" },
    { id: "forest", name: "Forest", emoji: "🌲" },
    { id: "fireplace", name: "Fireplace", emoji: "🔥" },
    { id: "wind", name: "Wind", emoji: "💨" },
    { id: "thunder", name: "Thunder", emoji: "⛈️" },
  ];

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
            <Moon className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Welcome to Sleep AI</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Track your sleep, get personalized insights, and improve your rest quality.
          </p>
          <div className="w-full space-y-3 mb-8">
            {[
              { icon: Lightbulb, title: "AI-Powered Insights", desc: "Get personalized recommendations" },
              { icon: BarChart3, title: "Track Progress", desc: "Monitor your sleep quality over time" },
              { icon: Music, title: "Sleep Sounds", desc: "Relaxing sounds to help you sleep" },
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
            <Moon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-foreground">Sleep AI</h1>
            <p className="text-xs text-muted-foreground">Sleep Health Dashboard</p>
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
            {/* Sleep Score */}
            <div className="p-6 bg-secondary rounded-2xl border border-border text-center">
              <p className="text-sm text-muted-foreground mb-2">Sleep Score</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-foreground">78</span>
                <span className="text-muted-foreground">/100</span>
              </div>
              <div className="flex justify-around mt-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">7.2h</p>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">85%</p>
                  <p className="text-xs text-muted-foreground">Consistency</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">92%</p>
                  <p className="text-xs text-muted-foreground">Efficiency</p>
                </div>
              </div>
            </div>

            {/* Streak */}
            <div className="p-4 bg-secondary rounded-xl border border-border">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center">
                  <Flame className="w-7 h-7 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sleep Streak</p>
                  <p className="text-2xl font-bold text-foreground">5 nights</p>
                  <p className="text-xs text-muted-foreground">You're building momentum! 🔥</p>
                </div>
              </div>
            </div>

            {/* Recent Sleep */}
            <div>
              <h3 className="text-base font-semibold text-foreground mb-3">Recent Sleep</h3>
              <div className="space-y-2">
                {[
                  { date: "Last Night", hours: "7h 30m", quality: 8 },
                  { date: "2 days ago", hours: "6h 45m", quality: 7 },
                  { date: "3 days ago", hours: "8h 00m", quality: 9 },
                ].map((log) => (
                  <div key={log.date} className="flex items-center gap-3 p-3 bg-secondary rounded-xl border border-border">
                    <div className="w-10 h-10 rounded-lg bg-card flex items-center justify-center">
                      <Moon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{log.date}</p>
                      <p className="text-xs text-muted-foreground">{log.hours} • Quality: {log.quality}/10</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "log" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Log Your Sleep</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track when you went to bed and woke up.
            </p>
            <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium">
              Add Sleep Log
            </button>
          </div>
        )}

        {activeTab === "insights" && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Lightbulb className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">AI Insights Coming</h3>
            <p className="text-sm text-muted-foreground">
              Log at least 3 nights to see personalized insights.
            </p>
          </div>
        )}

        {activeTab === "sounds" && (
          <div className="p-4">
            <h3 className="text-base font-semibold text-foreground mb-3">Sleep Sounds</h3>
            <div className="grid grid-cols-2 gap-3">
              {sounds.map((sound) => (
                <button
                  key={sound.id}
                  className="p-4 bg-secondary rounded-xl text-center hover:bg-secondary/80 transition-colors"
                >
                  <span className="text-3xl mb-2 block">{sound.emoji}</span>
                  <span className="text-sm font-medium text-foreground">{sound.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="absolute bottom-6 right-4 px-4 py-3 bg-primary text-primary-foreground rounded-full flex items-center gap-2 shadow-lg">
        <Plus className="w-5 h-5" />
        <span className="text-sm font-medium">Log Sleep</span>
      </button>
    </div>
  );
}
