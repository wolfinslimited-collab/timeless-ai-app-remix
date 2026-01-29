import { useState } from "react";
import { 
  Bell, Moon, Brain, Sparkles, DollarSign, Apple, Fingerprint, 
  Megaphone, ArrowLeft, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Screen } from "./MobileNav";

// Import custom app icons
import brainAiIcon from "@/assets/app-icons/brain-ai.png";
import skinAiIcon from "@/assets/app-icons/skin-ai.png";
import sleepAiIcon from "@/assets/app-icons/sleep-ai.png";
import calorieAiIcon from "@/assets/app-icons/calorie-ai.png";

interface AIAppItem {
  id: string;
  name: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconImage?: string;
  category: string;
  badge?: string;
  gradientColors: string;
  comingSoon?: boolean;
}

const aiApps: AIAppItem[] = [
  {
    id: "notify-ai",
    name: "Notify AI",
    description: "Smart notifications that learn your preferences",
    icon: Bell,
    category: "productivity",
    badge: "POPULAR",
    gradientColors: "from-amber-500/20 to-orange-500/20",
    comingSoon: false,
  },
  {
    id: "sleep-ai",
    name: "Sleep AI",
    description: "Optimize your sleep patterns with AI analysis",
    icon: Moon,
    iconImage: sleepAiIcon,
    category: "health",
    badge: "NEW",
    gradientColors: "from-indigo-500/20 to-purple-500/20",
    comingSoon: false,
  },
  {
    id: "brain-ai",
    name: "Brain AI",
    description: "Cognitive wellness & focus tracking powered by AI",
    icon: Brain,
    iconImage: brainAiIcon,
    category: "productivity",
    badge: "NEW",
    gradientColors: "from-violet-500/20 to-purple-500/20",
    comingSoon: false,
  },
  {
    id: "skin-ai",
    name: "Skin AI",
    description: "AI-powered skin analysis and care recommendations",
    icon: Sparkles,
    iconImage: skinAiIcon,
    category: "health",
    badge: "NEW",
    gradientColors: "from-pink-500/20 to-rose-500/20",
    comingSoon: false,
  },
  {
    id: "financial-ai",
    name: "Financial AI",
    description: "AI-powered market research with technical, fundamental & sentiment analysis",
    icon: DollarSign,
    category: "finance",
    badge: "NEW",
    gradientColors: "from-emerald-500/20 to-green-500/20",
    comingSoon: false,
  },
  {
    id: "calorie-ai",
    name: "Calorie AI",
    description: "Track and optimize your nutrition with AI",
    icon: Apple,
    iconImage: calorieAiIcon,
    category: "health",
    badge: "NEW",
    gradientColors: "from-lime-500/20 to-green-500/20",
    comingSoon: false,
  },
  {
    id: "fingerprint-ai",
    name: "Fingerprint AI",
    description: "Discover social profiles and public info about anyone",
    icon: Fingerprint,
    category: "productivity",
    badge: "NEW",
    gradientColors: "from-slate-500/20 to-zinc-500/20",
    comingSoon: false,
  },
  {
    id: "ads-ai",
    name: "Ads AI",
    description: "Create high-converting ad campaigns with AI",
    icon: Megaphone,
    category: "marketing",
    badge: "SOON",
    gradientColors: "from-orange-500/20 to-red-500/20",
    comingSoon: true,
  },
];

const categories = [
  { id: "all", label: "All Apps" },
  { id: "health", label: "Health" },
  { id: "productivity", label: "Productivity" },
  { id: "finance", label: "Finance" },
  { id: "security", label: "Security" },
  { id: "marketing", label: "Marketing" },
];

interface MobileAppsProps {
  onBack?: () => void;
  onNavigate?: (screen: Screen) => void;
}

export function MobileApps({ onBack, onNavigate }: MobileAppsProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredApps = selectedCategory === "all" 
    ? aiApps 
    : aiApps.filter(app => app.category === selectedCategory);

  const handleAppTap = (app: AIAppItem) => {
    if (app.comingSoon) {
      return;
    }
    
    // Navigate to specific app screens
    const appRoutes: Record<string, Screen> = {
      "notify-ai": "notify-ai",
      "sleep-ai": "sleep-ai",
      "brain-ai": "brain-ai",
      "skin-ai": "skin-ai",
      "financial-ai": "financial-ai",
      "calorie-ai": "calorie-ai",
      "fingerprint-ai": "fingerprint-ai",
    };
    
    const route = appRoutes[app.id];
    if (route && onNavigate) {
      onNavigate(route);
    }
  };

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case "NEW":
        return "bg-[#C8FF00] text-black";
      case "POPULAR":
        return "bg-primary/15 text-primary";
      case "BETA":
        return "bg-blue-500/15 text-blue-500";
      case "SOON":
        return "bg-muted/50 text-muted-foreground";
      default:
        return "bg-muted text-foreground";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2">
        {onBack && (
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
        )}

        {/* Hero Section */}
        <div className="mb-5">
          <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
            AI-Powered Apps
          </span>
          <h1 className="text-foreground text-[32px] font-bold leading-tight mt-3">
            Discover Our{"\n"}AI Apps
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Explore our suite of AI-powered applications
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "px-4 py-2.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all",
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Apps Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-2 gap-3.5 mt-5">
          {filteredApps.map(app => (
            <AppCard key={app.id} app={app} onTap={() => handleAppTap(app)} />
          ))}
        </div>

        {filteredApps.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <p className="text-muted-foreground text-sm">
              No apps found in this category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AppCard({ app, onTap }: { app: AIAppItem; onTap: () => void }) {
  const Icon = app.icon;
  
  return (
    <button
      onClick={onTap}
      className="flex flex-col p-4 bg-card rounded-2xl border border-border/50 text-left h-full"
    >
      {/* Badge positioned at top-right */}
      <div className="flex justify-between items-start mb-auto">
        <div className={cn(
          "w-[52px] h-[52px] rounded-[14px] flex items-center justify-center bg-gradient-to-br",
          app.gradientColors
        )}>
          {app.iconImage ? (
            <img src={app.iconImage} alt={app.name} className="w-7 h-7 object-contain" />
          ) : Icon ? (
            <Icon className="w-[26px] h-[26px] text-foreground" />
          ) : null}
        </div>
        {app.badge && (
          <span className={cn(
            "px-2 py-0.5 text-[9px] font-bold rounded-md",
            getBadgeColor(app.badge)
          )}>
            {app.badge === "SOON" ? "COMING SOON" : app.badge}
          </span>
        )}
      </div>

      <div className="mt-auto pt-4">
        {/* Name */}
        <h3 className="text-foreground text-[15px] font-semibold truncate">
          {app.name}
        </h3>
        
        {/* Description */}
        <p className="text-muted-foreground text-xs leading-[1.3] line-clamp-2 mt-1">
          {app.description}
        </p>
        
        {/* Action row */}
        <div className="flex items-center gap-1 mt-2.5">
          {app.comingSoon ? (
            <span className="text-muted-foreground text-xs font-medium">
              Coming Soon
            </span>
          ) : (
            <>
              <span className="text-primary text-xs font-medium">Open App</span>
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
            </>
          )}
        </div>
      </div>
    </button>
  );
}

function getBadgeColor(badge?: string) {
  switch (badge) {
    case "NEW":
      return "bg-[#C8FF00] text-black";
    case "POPULAR":
      return "bg-primary/15 text-primary";
    case "BETA":
      return "bg-blue-500/15 text-blue-500";
    case "SOON":
      return "bg-muted/50 text-muted-foreground";
    default:
      return "bg-muted text-foreground";
  }
}
