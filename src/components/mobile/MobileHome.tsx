import { useEffect, useState, useCallback } from "react";
import { Image, Video, Music, Clapperboard, ChevronRight, Zap, Crown, Bell, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { PullToRefresh } from "./PullToRefresh";
import type { Screen } from "./MobileNav";

// Import custom app icons
import brainAiIcon from "@/assets/app-icons/brain-ai.png";
import skinAiIcon from "@/assets/app-icons/skin-ai.png";
import bloodAiIcon from "@/assets/app-icons/blood-ai.png";
import sleepAiIcon from "@/assets/app-icons/sleep-ai.png";
import calorieAiIcon from "@/assets/app-icons/calorie-ai.png";

interface AppItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  buttonText: string;
}

const appItems: AppItem[] = [
  { id: "brain-ai", name: "Brain AI", description: "Memory & brain games.", icon: brainAiIcon, buttonText: "Try now" },
  { id: "skin-ai", name: "Skin AI", description: "Face scan for skin.", icon: skinAiIcon, buttonText: "Analyze" },
  { id: "blood-ai", name: "Blood AI", description: "Blood test insights.", icon: bloodAiIcon, buttonText: "Test" },
  { id: "sleep-ai", name: "Sleep AI", description: "Personal sleep advice.", icon: sleepAiIcon, buttonText: "Start" },
  { id: "calorie-ai", name: "Calorie AI", description: "Count calories by photo.", icon: calorieAiIcon, buttonText: "Track" },
];

// CDN video mappings matching Flutter
const trendingItems = [
  { 
    url: "https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/47f98df2-8f0d-4cf0-a32f-f582f3c0f90f-video11080.1080.mp4", 
    title: "Cinema Studio", 
    description: "Professional cinematic video creation with AI", 
    badge: "Featured",
    route: "cinema"
  },
  { 
    url: "https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/25bd0bda-0068-47e9-a2c3-c51330245765-video21080.1080%20-%20RESIZE%20-%20Videobolt.net.mp4", 
    title: "Video Upscale", 
    description: "Enhance video quality up to 4K resolution", 
    badge: "Popular",
    route: "video"
  },
  { 
    url: "https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/559a3bef-5733-4be4-b79b-324924945429-video31080.1080%20-%20RESIZE%20-%20Videobolt.net.mp4", 
    title: "Draw to Video", 
    description: "Transform sketches into animated videos", 
    badge: "New",
    route: "video"
  },
  { 
    url: "https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/33ee7581-6b7d-4d50-87d0-98acd87a53f3-video41080.1080%20-%20RESIZE%20-%20Videobolt.net.mp4", 
    title: "Music Studio", 
    description: "AI-powered music creation and remixing", 
    badge: "Hot",
    route: "create"
  },
];

const imageToolItems = [
  { 
    url: "https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/07a011ff-ab2e-4e4f-adc4-8d42bf4bfd23-light-ezgif.com-resize-video.mp4", 
    title: "Relight", 
    description: "AI-powered relighting for professional photo results", 
    badge: "Image" 
  },
  { 
    url: "https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/c2ad8cb7-8bb3-43a4-92c2-09c83ae80b40-shot-ezgif.com-resize-video.mp4", 
    title: "Shots", 
    description: "Generate multiple angles and variations", 
    badge: "New" 
  },
  { 
    url: "https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/09a58559-4b85-4053-ac90-42b30d151a5c-Inpainting-ezgif.com-resize-video.mp4", 
    title: "Inpainting", 
    description: "Edit and replace parts of your images seamlessly", 
    badge: "Image" 
  },
  { 
    url: "https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/b1157a2e-6259-4af8-b909-85c28b4562c7-ChangeAngle-ezgif.com-resize-video.mp4", 
    title: "Change Angle", 
    description: "View your image from different perspectives", 
    badge: "Image" 
  },
  { 
    url: "https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/a731fd6d-3262-4718-91d3-a0edc524310d-RemoveBackground-ezgif.com-resize-video.mp4", 
    title: "Remove Background", 
    description: "Instantly remove backgrounds from any image", 
    badge: "Image" 
  },
  { 
    url: "https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/faefb479-30b2-4b61-a1b8-49b7bfb4b35a-SkinEnhancer-ezgif.com-resize-video.mp4", 
    title: "Skin Enhancer", 
    description: "Professional portrait retouching and skin smoothing", 
    badge: "Image" 
  },
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
  const { hasActiveSubscription } = useCredits();
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-foreground text-xl font-bold">Timeless AI</h1>
            <p className="text-muted-foreground text-xs">Create anything with AI</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-primary/20 px-3 py-1.5 rounded-full">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-xs font-semibold">{credits}</span>
            </div>
            <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <Bell className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Quick Actions - matching Flutter */}
        <div className="mb-6">
          <h2 className="text-foreground text-sm font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            <QuickAction icon={Image} label="Image" color="bg-blue-500" onClick={() => onNavigate("image")} />
            <QuickAction icon={Video} label="Video" color="bg-primary" onClick={() => onNavigate("video")} />
            <QuickAction icon={Music} label="Music" color="bg-pink-500" onClick={() => onNavigate("create")} />
            <QuickAction icon={Clapperboard} label="Cinema" color="bg-orange-500" onClick={() => onNavigate("cinema")} />
          </div>
        </div>

        {/* Pro Banner - only show if not subscribed */}
        {!hasActiveSubscription && (
          <button 
            onClick={() => onNavigate("subscription")}
            className="w-full bg-gradient-to-r from-primary to-pink-600 rounded-2xl p-4 mb-6"
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
        )}

        {/* Trending Section */}
        <div className="mb-6">
          <h2 className="text-foreground text-sm font-semibold mb-3">Trending</h2>
          <div className="grid grid-cols-2 gap-3">
            {trendingItems.map((item, index) => (
              <button
                key={index}
                onClick={() => onNavigate(item.route as Screen)}
                className="flex flex-col gap-2 text-left"
              >
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-secondary relative">
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    crossOrigin="anonymous"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/80 text-gray-800 text-[10px] font-semibold rounded-md">
                    {item.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-foreground text-xs font-medium truncate">{item.title}</h3>
                  <p className="text-muted-foreground text-[10px] line-clamp-2">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Apps Section */}
        <div className="mb-6">
          <h2 className="text-foreground text-sm font-semibold mb-3">Apps</h2>
          <div className="flex flex-col gap-3">
            {appItems.map((app) => (
              <div
                key={app.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={app.icon} alt={app.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground text-sm font-medium">{app.name}</h3>
                  <p className="text-muted-foreground text-xs truncate">{app.description}</p>
                </div>
                <button className="px-4 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium rounded-lg flex-shrink-0 transition-colors">
                  {app.buttonText}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Creations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground text-sm font-semibold">Recent Creations</h2>
            <button 
              onClick={() => onNavigate("library")}
              className="text-primary text-xs"
            >
              See all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {recentGenerations.length > 0 ? (
              recentGenerations.map((gen) => (
                <div 
                  key={gen.id}
                  className="aspect-square rounded-xl bg-gradient-to-br from-primary/30 to-blue-500/30 overflow-hidden relative"
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
                        <Play className="w-8 h-8 text-muted-foreground" />
                      ) : (
                        <Image className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <>
                <div className="aspect-square rounded-xl bg-secondary border border-dashed border-border flex flex-col items-center justify-center">
                  <Image className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-muted-foreground text-xs">No images yet</span>
                </div>
                <div className="aspect-square rounded-xl bg-secondary border border-dashed border-border flex flex-col items-center justify-center">
                  <Video className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-muted-foreground text-xs">No videos yet</span>
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
      <span className="text-muted-foreground text-xs">{label}</span>
    </button>
  );
}