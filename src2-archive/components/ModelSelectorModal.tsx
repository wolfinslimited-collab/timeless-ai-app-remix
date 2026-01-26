import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Star, 
  Zap, 
  Coins, 
  Search, 
  Check,
  Sparkles,
  Image,
  Video,
  Music,
  Film,
  Flame,
  Wand2,
  Palette,
  Clapperboard,
  AudioLines,
  Wind,
  Mic2,
  History
} from "lucide-react";

// Import logos
import openaiLogo from "@/assets/logos/openai.svg";
import geminiLogo from "@/assets/logos/gemini.svg";
import xLogo from "@/assets/logos/x-logo.svg";

type ModelTier = "economy" | "hq";
type ModelProvider = "kie" | "fal" | "lovable";

interface BaseModel {
  id: string;
  name: string;
  description: string;
  badge: string;
  credits: number;
  provider: ModelProvider;
  tier: ModelTier;
}

interface ModelSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  models: BaseModel[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  type: "image" | "video" | "music" | "cinema";
  recentModelIds?: string[];
}

// Brand color configurations for model providers
type LogoConfig = { 
  logo: string | null; 
  bgColor: string; 
  invert?: boolean;
  iconColor?: string;
  icon?: "flux" | "midjourney" | "kling" | "luma" | "runway" | "sd" | "ideogram" | "recraft" | "hailuo" | "wan" | "sora" | "music" | "elevenlabs";
};

// Model logo mapping for generation models
const MODEL_LOGOS: Record<string, LogoConfig> = {
  // === OpenAI / GPT models ===
  "kie-4o-image": { logo: openaiLogo, bgColor: "bg-black", invert: true },
  "kie-gpt-image-1": { logo: openaiLogo, bgColor: "bg-black", invert: true },
  "gpt-image-1.5": { logo: openaiLogo, bgColor: "bg-black", invert: true },
  "kie-sora2": { logo: openaiLogo, bgColor: "bg-black", invert: true, icon: "sora" },
  "kie-sora2-pro": { logo: openaiLogo, bgColor: "bg-black", invert: true, icon: "sora" },
  
  // === Google / Gemini models ===
  "kie-nano-banana": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-700" },
  "nano-banana": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-700" },
  "nano-banana-pro": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-700" },
  "kie-imagen-4": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-700" },
  "kie-veo31": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-700" },
  "kie-veo31-fast": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-700" },
  "veo-3": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-700" },
  "veo-3-fast": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-700" },
  "lyria2": { logo: geminiLogo, bgColor: "bg-white dark:bg-slate-700" },
  
  // === xAI / Grok models ===
  "kie-grok-imagine": { logo: xLogo, bgColor: "bg-white" },
  "kie-grok-video": { logo: xLogo, bgColor: "bg-white" },
  
  // === Flux models (Purple gradient) ===
  "kie-flux-kontext-pro": { logo: null, bgColor: "bg-gradient-to-br from-violet-600 to-purple-700", icon: "flux", iconColor: "text-white" },
  "kie-flux-kontext-max": { logo: null, bgColor: "bg-gradient-to-br from-violet-600 to-purple-700", icon: "flux", iconColor: "text-white" },
  "kie-flux2-pro": { logo: null, bgColor: "bg-gradient-to-br from-violet-600 to-purple-700", icon: "flux", iconColor: "text-white" },
  "kie-flux-pro": { logo: null, bgColor: "bg-gradient-to-br from-violet-600 to-purple-700", icon: "flux", iconColor: "text-white" },
  "kie-flux-dev": { logo: null, bgColor: "bg-gradient-to-br from-violet-500 to-purple-600", icon: "flux", iconColor: "text-white" },
  "kie-flux-schnell": { logo: null, bgColor: "bg-gradient-to-br from-violet-500 to-purple-600", icon: "flux", iconColor: "text-white" },
  "flux-1.1-pro": { logo: null, bgColor: "bg-gradient-to-br from-violet-600 to-purple-700", icon: "flux", iconColor: "text-white" },
  "flux-pro-ultra": { logo: null, bgColor: "bg-gradient-to-br from-violet-600 to-fuchsia-600", icon: "flux", iconColor: "text-white" },
  "flux-dev": { logo: null, bgColor: "bg-gradient-to-br from-violet-500 to-purple-600", icon: "flux", iconColor: "text-white" },
  "flux-schnell": { logo: null, bgColor: "bg-gradient-to-br from-violet-500 to-purple-600", icon: "flux", iconColor: "text-white" },
  
  // === Midjourney (Teal/Cyan) ===
  "kie-midjourney": { logo: null, bgColor: "bg-gradient-to-br from-cyan-500 to-teal-600", icon: "midjourney", iconColor: "text-white" },
  
  // === Kling (Blue) ===
  "kie-kling-image": { logo: null, bgColor: "bg-gradient-to-br from-blue-500 to-indigo-600", icon: "kling", iconColor: "text-white" },
  "kie-kling": { logo: null, bgColor: "bg-gradient-to-br from-blue-500 to-indigo-600", icon: "kling", iconColor: "text-white" },
  "kling-2.6": { logo: null, bgColor: "bg-gradient-to-br from-blue-500 to-indigo-600", icon: "kling", iconColor: "text-white" },
  
  // === Luma (Orange/Amber) ===
  "kie-luma": { logo: null, bgColor: "bg-gradient-to-br from-amber-500 to-orange-600", icon: "luma", iconColor: "text-white" },
  "luma": { logo: null, bgColor: "bg-gradient-to-br from-amber-500 to-orange-600", icon: "luma", iconColor: "text-white" },
  
  // === Runway (Pink/Rose) ===
  "kie-runway": { logo: null, bgColor: "bg-gradient-to-br from-pink-500 to-rose-600", icon: "runway", iconColor: "text-white" },
  "kie-runway-i2v": { logo: null, bgColor: "bg-gradient-to-br from-pink-500 to-rose-600", icon: "runway", iconColor: "text-white" },
  
  // === Stable Diffusion (Red/Orange) ===
  "stable-diffusion-3": { logo: null, bgColor: "bg-gradient-to-br from-red-500 to-orange-500", icon: "sd", iconColor: "text-white" },
  "sdxl": { logo: null, bgColor: "bg-gradient-to-br from-red-500 to-orange-500", icon: "sd", iconColor: "text-white" },
  "sdxl-lightning": { logo: null, bgColor: "bg-gradient-to-br from-red-500 to-orange-500", icon: "sd", iconColor: "text-white" },
  
  // === Ideogram (Green) ===
  "kie-ideogram-v3": { logo: null, bgColor: "bg-gradient-to-br from-emerald-500 to-green-600", icon: "ideogram", iconColor: "text-white" },
  "ideogram-v2": { logo: null, bgColor: "bg-gradient-to-br from-emerald-500 to-green-600", icon: "ideogram", iconColor: "text-white" },
  
  // === Recraft (Slate/Gray) ===
  "recraft-v3": { logo: null, bgColor: "bg-gradient-to-br from-slate-600 to-gray-700", icon: "recraft", iconColor: "text-white" },
  
  // === Hailuo (Sky Blue) ===
  "kie-hailuo": { logo: null, bgColor: "bg-gradient-to-br from-sky-500 to-blue-600", icon: "hailuo", iconColor: "text-white" },
  "hailuo-02": { logo: null, bgColor: "bg-gradient-to-br from-sky-500 to-blue-600", icon: "hailuo", iconColor: "text-white" },
  
  // === Wan (Indigo) ===
  "kie-wan": { logo: null, bgColor: "bg-gradient-to-br from-indigo-500 to-violet-600", icon: "wan", iconColor: "text-white" },
  "wan-2.6": { logo: null, bgColor: "bg-gradient-to-br from-indigo-500 to-violet-600", icon: "wan", iconColor: "text-white" },
  
  // === Hunyuan (Teal) ===
  "hunyuan-1.5": { logo: null, bgColor: "bg-gradient-to-br from-teal-500 to-cyan-600", iconColor: "text-white" },
  
  // === Seedream / Seedance (Rose) ===
  "kie-seedream-4": { logo: null, bgColor: "bg-gradient-to-br from-rose-500 to-pink-600", iconColor: "text-white" },
  "seedance-1.5": { logo: null, bgColor: "bg-gradient-to-br from-rose-500 to-pink-600", iconColor: "text-white" },
  
  // === Qwen (Blue) ===
  "kie-qwen-image": { logo: null, bgColor: "bg-gradient-to-br from-blue-600 to-indigo-700", iconColor: "text-white" },
  
  // === Art models ===
  "aura-flow": { logo: null, bgColor: "bg-gradient-to-br from-fuchsia-500 to-pink-600", iconColor: "text-white" },
  "playground-v2.5": { logo: null, bgColor: "bg-gradient-to-br from-amber-500 to-yellow-500", iconColor: "text-white" },
  
  // === Music models ===
  "kie-music-v4": { logo: null, bgColor: "bg-gradient-to-br from-purple-500 to-indigo-600", icon: "music", iconColor: "text-white" },
  "kie-music-v3.5": { logo: null, bgColor: "bg-gradient-to-br from-purple-500 to-indigo-600", icon: "music", iconColor: "text-white" },
  "sonauto": { logo: null, bgColor: "bg-gradient-to-br from-orange-500 to-red-500", icon: "music", iconColor: "text-white" },
  "cassetteai": { logo: null, bgColor: "bg-gradient-to-br from-gray-700 to-slate-800", icon: "music", iconColor: "text-white" },
  "stable-audio": { logo: null, bgColor: "bg-gradient-to-br from-red-500 to-orange-500", icon: "music", iconColor: "text-white" },
};

// Popular/recommended models
const POPULAR_MODELS = new Set([
  // Image
  "nano-banana", "gpt-image-1.5", "kie-4o-image", "kie-midjourney", "flux-1.1-pro",
  // Video
  "kie-sora2", "veo-3", "kie-kling", "wan-2.6", "luma",
]);

const getModelLogo = (modelId: string): LogoConfig => {
  return MODEL_LOGOS[modelId] || { logo: null, bgColor: "bg-primary/20" };
};

const isPopularModel = (modelId: string): boolean => {
  return POPULAR_MODELS.has(modelId);
};

export function ModelSelectorModal({
  open,
  onOpenChange,
  models,
  selectedModel,
  onSelectModel,
  type,
  recentModelIds = [],
}: ModelSelectorModalProps) {
  const [search, setSearch] = useState("");
  const [activeTier, setActiveTier] = useState<"all" | "economy" | "hq">("all");

  const filteredModels = models.filter((m) => {
    const matchesSearch = 
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase());
    const matchesTier = activeTier === "all" || m.tier === activeTier;
    return matchesSearch && matchesTier;
  });

  // Check if a model was recently used
  const isRecentlyUsed = (modelId: string): boolean => {
    return recentModelIds.includes(modelId);
  };

  // Sort function: recently used first, then popular, then rest
  const sortModels = (models: BaseModel[]) => {
    return [...models].sort((a, b) => {
      // Priority 1: Recently used
      const aRecent = isRecentlyUsed(a.id) ? 2 : 0;
      const bRecent = isRecentlyUsed(b.id) ? 2 : 0;
      if (aRecent !== bRecent) return bRecent - aRecent;
      
      // Priority 2: Popular models
      const aPopular = isPopularModel(a.id) ? 1 : 0;
      const bPopular = isPopularModel(b.id) ? 1 : 0;
      return bPopular - aPopular;
    });
  };

  const economyModels = sortModels(filteredModels.filter((m) => m.tier === "economy"));
  const hqModels = sortModels(filteredModels.filter((m) => m.tier === "hq"));

  const handleSelect = (modelId: string) => {
    onSelectModel(modelId);
    onOpenChange(false);
  };

  const getTypeLabel = () => {
    switch (type) {
      case "image": return "Image";
      case "video": return "Video";
      case "music": return "Music";
      case "cinema": return "Cinema";
      default: return "AI";
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case "image": return <Image className="h-5 w-5 text-primary" />;
      case "video": return <Video className="h-5 w-5 text-primary" />;
      case "music": return <Music className="h-5 w-5 text-primary" />;
      case "cinema": return <Film className="h-5 w-5 text-primary" />;
      default: return <Sparkles className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 bg-background border-border">
        <DialogHeader className="p-5 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {getTypeIcon()}
            Select {getTypeLabel()} Model
          </DialogTitle>
          
          {/* Search and Tier Filter */}
          <div className="flex items-center gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-secondary border-border/50 h-9"
              />
            </div>
            <div className="flex gap-1 p-1 bg-secondary rounded-lg">
              <Button
                variant={activeTier === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTier("all")}
                className={cn(
                  "text-xs h-7 px-3",
                  activeTier === "all" && "bg-primary text-primary-foreground"
                )}
              >
                All
              </Button>
              <Button
                variant={activeTier === "economy" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTier("economy")}
                className={cn(
                  "text-xs gap-1 h-7 px-3",
                  activeTier === "economy" && "bg-emerald-500 text-white hover:bg-emerald-600"
                )}
              >
                <Coins className="h-3 w-3" />
                Economy
              </Button>
              <Button
                variant={activeTier === "hq" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTier("hq")}
                className={cn(
                  "text-xs gap-1 h-7 px-3",
                  activeTier === "hq" && "bg-primary text-primary-foreground"
                )}
              >
                <Zap className="h-3 w-3" />
                HQ
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-4">
            {filteredModels.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Search className="h-7 w-7 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No models found matching "{search}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {/* Economy Column - Left */}
                {(activeTier === "all" || activeTier === "economy") && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                        <Coins className="h-3 w-3 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-500">Economy</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      {economyModels.map((m) => (
                        <ModelCard
                          key={m.id}
                          model={m}
                          isSelected={selectedModel === m.id}
                          onSelect={() => handleSelect(m.id)}
                          isRecent={isRecentlyUsed(m.id)}
                        />
                      ))}
                      {economyModels.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No economy models</p>
                      )}
                    </div>
                  </div>
                )}

                {/* HQ Column - Right */}
                {(activeTier === "all" || activeTier === "hq") && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/30">
                        <Zap className="h-3 w-3 text-primary" />
                        <span className="text-xs font-medium text-primary">High Quality</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      {hqModels.map((m) => (
                        <ModelCard
                          key={m.id}
                          model={m}
                          isSelected={selectedModel === m.id}
                          onSelect={() => handleSelect(m.id)}
                          isRecent={isRecentlyUsed(m.id)}
                        />
                      ))}
                      {hqModels.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No HQ models</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Icon component for models without logo files
function ModelIcon({ 
  icon, 
  iconColor, 
  isTop, 
  isEconomy 
}: { 
  icon?: LogoConfig["icon"]; 
  iconColor?: string;
  isTop: boolean; 
  isEconomy: boolean;
}) {
  const colorClass = iconColor || (isTop ? "text-amber-500" : isEconomy ? "text-emerald-500" : "text-primary");
  
  switch (icon) {
    case "flux":
      return <Zap className={cn("h-4 w-4", colorClass)} />;
    case "midjourney":
      return <Wand2 className={cn("h-4 w-4", colorClass)} />;
    case "kling":
    case "runway":
    case "wan":
    case "hailuo":
    case "sora":
      return <Clapperboard className={cn("h-4 w-4", colorClass)} />;
    case "luma":
      return <Sparkles className={cn("h-4 w-4", colorClass)} />;
    case "sd":
      return <Palette className={cn("h-4 w-4", colorClass)} />;
    case "ideogram":
      return <Wind className={cn("h-4 w-4", colorClass)} />;
    case "recraft":
      return <Palette className={cn("h-4 w-4", colorClass)} />;
    case "music":
      return <AudioLines className={cn("h-4 w-4", colorClass)} />;
    default:
      if (isTop) return <Star className={cn("h-4 w-4 fill-current", colorClass)} />;
      if (isEconomy) return <Coins className={cn("h-4 w-4", colorClass)} />;
      return <Zap className={cn("h-4 w-4", colorClass)} />;
  }
}

interface ModelCardProps {
  model: BaseModel;
  isSelected: boolean;
  onSelect: () => void;
  isRecent?: boolean;
}

function ModelCard({ model, isSelected, onSelect, isRecent }: ModelCardProps) {
  const isTop = model.badge === "TOP";
  const isEconomy = model.tier === "economy";
  const logoConfig = getModelLogo(model.id);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-md hover:shadow-primary/10",
        "active:scale-[0.99]",
        isSelected 
          ? "bg-primary/10 ring-1 ring-primary/30" 
          : "bg-card/50 hover:bg-secondary/80"
      )}
    >
      {/* Model Logo */}
      <div className={cn(
        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200",
        "group-hover:scale-105",
        logoConfig.bgColor
      )}>
        {logoConfig.logo ? (
          <img 
            src={logoConfig.logo} 
            alt={`${model.name} logo`}
            className={cn(
              "h-5 w-5 object-contain",
              logoConfig.invert && "invert"
            )}
          />
        ) : (
          <ModelIcon icon={logoConfig.icon} iconColor={logoConfig.iconColor} isTop={isTop} isEconomy={isEconomy} />
        )}
      </div>

      {/* Model Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <h3 className={cn(
            "font-medium text-sm truncate",
            isTop && "text-amber-500"
          )}>
            {model.name}
          </h3>
          {isRecent && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 gap-0.5">
              <History className="h-2.5 w-2.5" />
              RECENT
            </Badge>
          )}
          {isPopularModel(model.id) && !isRecent && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white border-0 gap-0.5">
              <Flame className="h-2.5 w-2.5" />
              HOT
            </Badge>
          )}
          {model.badge === "TOP" && !isPopularModel(model.id) && !isRecent && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
              TOP
            </Badge>
          )}
          {model.badge === "NEW" && !isRecent && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-500 border-blue-500/30">
              NEW
            </Badge>
          )}
          {model.badge === "FAST" && !isRecent && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/20 text-purple-500 border-purple-500/30">
              FAST
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {model.description}
        </p>
      </div>

      {/* Credits */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5">
          {model.credits} cr
        </Badge>
        
        {/* Selection indicator */}
        {isSelected && (
          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  );
}

export default ModelSelectorModal;