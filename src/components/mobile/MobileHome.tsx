import { useEffect, useState, useCallback } from "react";
import { Image, Video, Music, Clapperboard, ChevronRight, Zap, Crown, Bell, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { PullToRefresh } from "./PullToRefresh";
import type { Screen } from "./MobileNav";

// App icons
import translateAiIcon from "@/assets/app-icons/translate-ai.png";
import pixlabIcon from "@/assets/app-icons/pixlab.png";
import colorizeIcon from "@/assets/app-icons/colorize.png";
import relightIcon from "@/assets/app-icons/relight.png";
import removeBgIcon from "@/assets/app-icons/remove-bg.png";

const appItems = [
  { id: "brain-ai", name: "Brain AI", description: "Memory & brain games.", icon: translateAiIcon, buttonText: "Try now" },
  { id: "skin-ai", name: "Skin AI", description: "Face scan for skin.", icon: pixlabIcon, buttonText: "Analyze" },
  { id: "blood-ai", name: "Blood AI", description: "Blood test insights.", icon: colorizeIcon, buttonText: "Test" },
  { id: "sleep-ai", name: "Sleep AI", description: "Personal sleep advice.", icon: relightIcon, buttonText: "Start" },
  { id: "calorie-ai", name: "Calorie AI", description: "Count calories by photo.", icon: removeBgIcon, buttonText: "Track" },
];

interface MobileHomeProps {
  onNavigate: (screen: Screen) => void;
  credits: number;
  onRefreshCredits?: () => void;
}

interface Generation {
  id: string;
  type: string;
  output_url: string | null;
  thumbnail_url: string | null;
  prompt: string;
}

export function MobileHome({ onNavigate, credits, onRefreshCredits }: MobileHomeProps) {
  const { user } = useAuth();
  const [recentGenerations, setRecentGenerations] = useState<Generation[]>([]);

  useEffect(() => {
    if (user) {
      fetchRecentGenerations();
    }
  }, [user]);

  const fetchRecentGenerations = async () => {
    const { data } = await supabase
      .from("generations")
      .select("id, type, output_url, thumbnail_url, prompt")
      .eq("user_id", user?.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(4);

    if (data) {
      setRecentGenerations(data);
    }
  };

  const handleRefresh = useCallback(async () => {
    await fetchRecentGenerations();
    onRefreshCredits?.();
  }, [onRefreshCredits]);

  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
      <div className="px-4 py-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-xl font-bold">Timeless AI</h1>
          <p className="text-gray-400 text-xs">Create anything with AI</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-purple-500/20 px-3 py-1.5 rounded-full">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-purple-300 text-xs font-semibold">{credits}</span>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-white text-sm font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          <QuickAction icon={Image} label="Image" color="bg-blue-500" onClick={() => onNavigate("image")} />
          <QuickAction icon={Video} label="Video" color="bg-purple-500" onClick={() => onNavigate("video")} />
          <QuickAction icon={Music} label="Music" color="bg-pink-500" />
          <QuickAction icon={Clapperboard} label="Cinema" color="bg-orange-500" />
        </div>
      </div>

      {/* Apps Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-sm font-semibold">Apps</h2>
          <button className="text-purple-400 text-xs">See all</button>
        </div>
        <div className="flex flex-col gap-3">
          {appItems.map((app) => (
            <div
              key={app.id}
              className="flex items-center gap-3 p-3 rounded-2xl border border-white/20"
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                <img 
                  src={app.icon} 
                  alt={app.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-sm font-medium">{app.name}</h3>
                <p className="text-gray-400 text-xs truncate">{app.description}</p>
              </div>
              <button className="px-4 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-full flex-shrink-0 transition-colors">
                {app.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pro Banner */}
      <button 
        onClick={() => onNavigate("profile")}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-white font-semibold text-sm">Upgrade to Pro</h3>
            <p className="text-white/70 text-xs">Unlimited generations & more</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white" />
        </div>
      </button>

      {/* Recent Generations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white text-sm font-semibold">Recent Creations</h2>
          <button 
            onClick={() => onNavigate("library")}
            className="text-purple-400 text-xs"
          >
            See all
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {recentGenerations.length > 0 ? (
            recentGenerations.map((gen) => (
              <div 
                key={gen.id}
                className="aspect-square rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 overflow-hidden relative"
              >
                {gen.output_url || gen.thumbnail_url ? (
                  <>
                    {gen.type === "video" ? (
                      <video 
                        src={gen.output_url || undefined}
                        poster={gen.thumbnail_url || undefined}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img 
                        src={gen.output_url || gen.thumbnail_url || ""}
                        alt={gen.prompt}
                        className="w-full h-full object-cover"
                      />
                    )}
                    {gen.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white/70" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {gen.type === "video" ? (
                      <Play className="w-8 h-8 text-white/70" />
                    ) : (
                      <Image className="w-8 h-8 text-white/50" />
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <>
              <div className="aspect-square rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center">
                <Image className="w-8 h-8 text-gray-500 mb-2" />
                <span className="text-gray-500 text-xs">No images yet</span>
              </div>
              <div className="aspect-square rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center">
                <Video className="w-8 h-8 text-gray-500 mb-2" />
                <span className="text-gray-500 text-xs">No videos yet</span>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </PullToRefresh>
  );
}

function QuickAction({ 
  icon: Icon, 
  label, 
  color,
  onClick 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  color: string;
  onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-gray-300 text-xs">{label}</span>
    </button>
  );
}
