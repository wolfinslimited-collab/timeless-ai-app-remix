import { useEffect, useState, useCallback } from "react";
import { Image, Video, Music, Clapperboard, ChevronRight, Zap, Infinity, Bell } from "lucide-react";
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
  'Visual Styles': 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/d49d2f58-acca-48f6-b890-2cf2443c4bba-style-transfer-preview-ezgif.com-resize-video.mp4',
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

// Hardcoded fallback featured items (used when DB table doesn't exist)
const FALLBACK_FEATURED_ITEMS: FeaturedItem[] = [
  { id: '1', title: 'Cinema Studio', description: 'Professional cinematic video creation with AI', tag: 'Featured', videoUrl: titleToVideoUrl['Cinema Studio'], displayOrder: 1, linkUrl: '/create?type=cinema' },
  { id: '2', title: 'Video Upscale', description: 'Enhance video quality up to 4K resolution', tag: 'Popular', videoUrl: titleToVideoUrl['Video Upscale'], displayOrder: 2, linkUrl: '/create?app=video-upscale' },
  { id: '3', title: 'Draw to Video', description: 'Transform sketches into animated videos', tag: 'New', videoUrl: titleToVideoUrl['Draw to Video'], displayOrder: 3, linkUrl: '/create?app=draw-to-video' },
  { id: '4', title: 'Music Studio', description: 'AI-powered music creation and remixing', tag: 'Hot', videoUrl: titleToVideoUrl['Music Studio'], displayOrder: 4, linkUrl: '/create?type=music' },
  { id: '5', title: 'Visual Styles', description: 'Ultra-realistic fashion visuals', tag: 'New', videoUrl: titleToVideoUrl['Visual Styles'], displayOrder: 5, linkUrl: '/create?type=image' },
];

interface MobileHomeProps {
  onNavigate: (screen: Screen) => void;
  credits: number;
  onRefreshCredits?: () => void;
}

export function MobileHome({ onNavigate, credits, onRefreshCredits }: MobileHomeProps) {
  const { user } = useAuth();
  const { hasActiveSubscription } = useCredits();
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
    fetchFeaturedItems();
  }, []);

  const fetchFeaturedItems = async () => {
    try {
      // Use type assertion since featured_items may not be in generated types
      const { data, error } = await (supabase
        .from("featured_items" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true }) as any);

      if (error) throw error;

      if (data && data.length > 0) {
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
      } else {
        // Use fallback items if no data from DB
        setFeaturedItems(FALLBACK_FEATURED_ITEMS);
      }
    } catch (e) {
      console.error("Error loading featured items:", e);
      // Use fallback items on error
      setFeaturedItems(FALLBACK_FEATURED_ITEMS);
    } finally {
      setLoadingFeatured(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setLoadingFeatured(true);
    await fetchFeaturedItems();
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
    } else if (linkUrl.includes('/create?type=image') || linkUrl.includes('/create/image')) {
      onNavigate("image");
    } else {
      onNavigate("apps");
    }
  };

  const handleAppTap = (appId: string) => {
    // Navigate to specific app screens - matching Flutter AppsScreen
    switch (appId) {
      case 'skin-ai':
        onNavigate("skin-ai");
        break;
      case 'calorie-ai':
        onNavigate("calorie-ai");
        break;
      case 'brain-ai':
        onNavigate("brain-ai");
        break;
      case 'sleep-ai':
        onNavigate("sleep-ai");
        break;
      default:
        onNavigate("apps");
    }
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

        {/* Quick Actions - matching Flutter 4 column grid exactly */}
        <div className="mb-6">
          <h2 className="text-foreground text-base font-semibold mb-3">Quick Actions</h2>
          <div className="flex justify-around">
            <QuickAction icon={Image} label="Image" color="bg-[#3B82F6]" onClick={() => onNavigate("image")} />
            <QuickAction icon={Video} label="Video" color="bg-primary" onClick={() => onNavigate("video")} />
            <QuickAction icon={Music} label="Music" color="bg-[#EC4899]" onClick={() => onNavigate("audio")} />
            <QuickAction icon={Clapperboard} label="Cinema" color="bg-[#F59E0B]" onClick={() => onNavigate("cinema")} />
          </div>
        </div>

        {/* Pro Banner - only show if not subscribed - matching Flutter exactly */}
        {!hasActiveSubscription && (
          <button 
            onClick={handleProBannerClick}
            className="w-full bg-gradient-to-br from-primary to-[#EC4899] rounded-2xl p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Infinity className="w-5 h-5 text-white" />
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

        {/* Trending Visual Styles Banner - matching Flutter exactly */}
        <button 
          onClick={() => onNavigate("visual-styles")}
          className="w-full mb-6 p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(219, 39, 119, 0.85), rgba(147, 51, 234, 0.85))'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-base">Trending</span>
                <span className="px-1.5 py-0.5 bg-white/20 rounded text-white text-[10px] font-bold">
                  HOT
                </span>
              </div>
              <p className="text-white/70 text-xs mt-0.5">
                Visual Styles · Ultra-realistic fashion & portrait visuals
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/70 flex-shrink-0" />
          </div>
        </button>

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
