import { useEffect, useState, useCallback } from "react";
import { Image, Video, Music, Clapperboard, ChevronRight, Zap, Crown, Bell, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { PullToRefresh } from "./PullToRefresh";
import { MobileUpgradeWizard } from "./MobileUpgradeWizard";
import type { Screen } from "./MobileNav";

// Import custom app icons
import brainAiIcon from "@/assets/app-icons/brain-ai.png";
import skinAiIcon from "@/assets/app-icons/skin-ai.png";
import sleepAiIcon from "@/assets/app-icons/sleep-ai.png";
import calorieAiIcon from "@/assets/app-icons/calorie-ai.png";

interface AppItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  buttonText: string;
}

// Matching Flutter's _appItems (without Blood AI)
const appItems: AppItem[] = [
  { id: "brain-ai", name: "Brain AI", description: "Memory & brain games.", icon: brainAiIcon, buttonText: "Try now" },
  { id: "skin-ai", name: "Skin AI", description: "Face scan for skin.", icon: skinAiIcon, buttonText: "Analyze" },
  { id: "sleep-ai", name: "Sleep AI", description: "Personal sleep advice.", icon: sleepAiIcon, buttonText: "Start" },
  { id: "calorie-ai", name: "Calorie AI", description: "Count calories by photo.", icon: calorieAiIcon, buttonText: "Track" },
];

// CDN video mappings matching Flutter exactly
const titleToVideoUrl: Record<string, string> = {
  'Cinema Studio': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/47f98df2-8f0d-4cf0-a32f-f582f3c0f90f-video11080.1080.mp4',
  'Video Upscale': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/25bd0bda-0068-47e9-a2c3-c51330245765-video21080.1080%20-%20RESIZE%20-%20Videobolt.net.mp4',
  'Draw to Video': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/559a3bef-5733-4be4-b79b-324924945429-video31080.1080%20-%20RESIZE%20-%20Videobolt.net.mp4',
  'Music Studio': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/33ee7581-6b7d-4d50-87d0-98acd87a53f3-video41080.1080%20-%20RESIZE%20-%20Videobolt.net.mp4',
  'Change Angle': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/b1157a2e-6259-4af8-b909-85c28b4562c7-ChangeAngle-ezgif.com-resize-video.mp4',
  'Inpainting': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/09a58559-4b85-4053-ac90-42b30d151a5c-Inpainting-ezgif.com-resize-video.mp4',
  'Relight': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/07a011ff-ab2e-4e4f-adc4-8d42bf4bfd23-light-ezgif.com-resize-video.mp4',
  'Remove Background': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/a731fd6d-3262-4718-91d3-a0edc524310d-RemoveBackground-ezgif.com-resize-video.mp4',
  'Shots': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/c2ad8cb7-8bb3-43a4-92c2-09c83ae80b40-shot-ezgif.com-resize-video.mp4',
  'Skin Enhancer': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/faefb479-30b2-4b61-a1b8-49b7bfb4b35a-SkinEnhancer-ezgif.com-resize-video.mp4',
  'Upscale': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/02e516fd-e889-49fe-af14-043fc2c79521-Upscale-ezgif.com-resize-video.mp4',
  'Style Transfer': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/d49d2f58-acca-48f6-b890-2cf2443c4bba-style-transfer-preview-ezgif.com-resize-video.mp4',
};

interface FeaturedItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  videoUrl: string;
  displayOrder: number;
  linkUrl: string | null;
}

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
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [showUpgradeWizard, setShowUpgradeWizard] = useState(false);

  const handleProBannerClick = () => {
    // Show onboarding wizard first, then navigate to subscription
    setShowUpgradeWizard(true);
  };

  const handleWizardComplete = () => {
    setShowUpgradeWizard(false);
    onNavigate("subscription");
  };

  const handleWizardSkip = () => {
    setShowUpgradeWizard(false);
    onNavigate("subscription");
  };
  useEffect(() => {
    if (user) {
      fetchRecentGenerations();
    }
    fetchFeaturedItems();
  }, [user]);

  const fetchFeaturedItems = async () => {
    try {
      // Use type assertion since featured_items may not be in generated types
      const { data, error } = await (supabase
        .from("featured_items" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true }) as any);

      if (error) throw error;

      if (data) {
        const items: FeaturedItem[] = (data as any[]).map((item: any) => {
          const title = item.title || '';
          // Override video_url based on title if mapping exists
          const videoUrl = titleToVideoUrl[title] || item.video_url || '';
          
          return {
            id: item.id,
            title: title,
            description: item.description || '',
            tag: item.tag || '',
            videoUrl: videoUrl,
            displayOrder: item.display_order,
            linkUrl: item.link_url,
          };
        });
        setFeaturedItems(items);
      }
    } catch (e) {
      console.error("Error loading featured items:", e);
    } finally {
      setLoadingFeatured(false);
    }
  };

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
    setLoadingFeatured(true);
    await Promise.all([
      fetchRecentGenerations(),
      fetchFeaturedItems(),
    ]);
    onRefreshCredits?.();
  }, [onRefreshCredits]);

  const handleFeaturedTap = (item: FeaturedItem) => {
    const linkUrl = item.linkUrl;
    if (!linkUrl) return;

    // Parse link_url and navigate - matching Flutter logic exactly
    if (linkUrl.includes('/create?type=cinema')) {
      onNavigate("cinema");
    } else if (linkUrl.includes('/create?type=music')) {
      onNavigate("audio");
    } else if (linkUrl.includes('/create?app=video-upscale') || linkUrl.includes('/create?app=draw-to-video')) {
      onNavigate("video");
    } else if (linkUrl.includes('/create/image/')) {
      onNavigate("image");
    } else {
      onNavigate("apps");
    }
  };

  const handleAppTap = (appId: string) => {
    // Match Flutter behavior - only skin-ai navigates, others show coming soon
    if (appId === 'skin-ai') {
      onNavigate("apps");
    }
    // Other apps - could show toast or navigate
  };

  // Show upgrade wizard if triggered
  if (showUpgradeWizard) {
    return (
      <MobileUpgradeWizard
        onComplete={handleWizardComplete}
        onSkip={handleWizardSkip}
      />
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
      <div className="px-4 py-2">
        {/* Header - matching Flutter AppBar */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-foreground text-xl font-bold">Timeless AI</h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onNavigate("subscription")}
              className="flex items-center gap-1 bg-primary/20 px-3 py-1.5 rounded-full"
            >
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-xs font-semibold">{credits}</span>
            </button>
            <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <Bell className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Subtitle - matching Flutter */}
        <p className="text-muted-foreground text-sm mb-6">Create anything with AI</p>

        {/* Quick Actions - matching Flutter 4 column grid */}
        <div className="mb-6">
          <h2 className="text-foreground text-base font-semibold mb-3">Quick Actions</h2>
          <div className="flex justify-around">
            <QuickAction icon={Image} label="Image" color="bg-blue-500" onClick={() => onNavigate("image")} />
            <QuickAction icon={Video} label="Video" color="bg-primary" onClick={() => onNavigate("video")} />
            <QuickAction icon={Music} label="Music" color="bg-pink-500" onClick={() => onNavigate("audio")} />
            <QuickAction icon={Clapperboard} label="Cinema" color="bg-amber-500" onClick={() => onNavigate("cinema")} />
          </div>
        </div>

        {/* Pro Banner - only show if not subscribed - matching Flutter */}
        {!hasActiveSubscription && (
          <button 
            onClick={handleProBannerClick}
            className="w-full bg-gradient-to-br from-primary to-pink-500 rounded-2xl p-4 mb-6"
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

        {/* Trending Section - fetched from Supabase like Flutter */}
        <div className="mb-6">
          <h2 className="text-foreground text-base font-semibold mb-3">Trending</h2>
          {loadingFeatured ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="aspect-[3/4] rounded-xl bg-secondary animate-pulse" />
                  <div className="h-3 bg-secondary rounded animate-pulse w-3/4" />
                  <div className="h-2 bg-secondary rounded animate-pulse w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {featuredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleFeaturedTap(item)}
                  className="flex flex-col gap-2 text-left"
                >
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-secondary relative">
                    <video
                      src={item.videoUrl}
                      className="w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      crossOrigin="anonymous"
                    />
                    <span className="absolute top-2 left-2 px-2 py-1 bg-white/90 text-gray-800 text-[10px] font-semibold rounded-md">
                      {item.tag}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-foreground text-xs font-medium truncate">{item.title}</h3>
                    <p className="text-muted-foreground text-[10px] line-clamp-2">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Apps Section - matching Flutter exactly */}
        <div className="mb-6">
          <h2 className="text-foreground text-base font-semibold mb-3">Apps</h2>
          <div className="flex flex-col gap-3">
            {appItems.map((app) => (
              <button
                key={app.id}
                onClick={() => handleAppTap(app.id)}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border text-left"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={app.icon} alt={app.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground text-sm font-medium">{app.name}</h3>
                  <p className="text-muted-foreground text-xs truncate">{app.description}</p>
                </div>
                <span className="px-4 py-2 bg-secondary text-foreground text-xs font-medium rounded-lg flex-shrink-0">
                  {app.buttonText}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Creations - matching Flutter */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground text-base font-semibold">Recent Creations</h2>
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
                  className="aspect-square rounded-xl bg-gradient-to-br from-violet-500/30 to-blue-500/30 overflow-hidden relative"
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
                <div className="aspect-square rounded-xl bg-card border border-dashed border-border flex flex-col items-center justify-center">
                  <Image className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-muted-foreground text-xs">No images yet</span>
                </div>
                <div className="aspect-square rounded-xl bg-card border border-dashed border-border flex flex-col items-center justify-center">
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
