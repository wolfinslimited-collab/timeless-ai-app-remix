import { useState } from "react";
import { X, Sparkles, Search, Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelBrandLogo } from "./ModelBrandLogo";

export interface ModelOption {
  id: string;
  name: string;
  description?: string;
  credits: number;
  badge?: string;
  tier?: "economy" | "hq";
}

interface ModelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelOption[];
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  title?: string;
  type?: "image" | "video" | "audio";
}

const getBadgeColor = (badge: string) => {
  switch (badge?.toUpperCase()) {
    case "NEW": return "bg-emerald-500";
    case "TOP": return "bg-amber-500";
    case "PRO": return "bg-violet-500";
    case "HOT": return "bg-rose-500";
    case "ECONOMY": return "bg-sky-500";
    default: return "bg-primary";
  }
};

export function ModelSelectorModal({
  isOpen,
  onClose,
  models,
  selectedModel,
  onSelectModel,
  title = "Select Model",
  type = "image"
}: ModelSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTier, setActiveTier] = useState<"all" | "economy" | "hq">("all");

  if (!isOpen) return null;

  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = activeTier === "all" || model.tier === activeTier;
    return matchesSearch && matchesTier;
  });

  const hasTiers = models.some(m => m.tier);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl max-h-[80%] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">{title}</span>
              <p className="text-xs text-muted-foreground">{filteredModels.length} models available</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5 border border-border">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        {/* Tier Filter */}
        {hasTiers && (
          <div className="px-5 pb-3 flex gap-2">
            {(["all", "hq", "economy"] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  activeTier === tier
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
              >
                {tier === "all" ? "All" : tier === "hq" ? "High Quality" : "Economy"}
              </button>
            ))}
          </div>
        )}
        
        <div className="border-t border-border" />
        
        {/* Models List */}
        <div className="overflow-y-auto max-h-[55vh] p-4 space-y-2">
          {filteredModels.map(model => {
            const isSelected = model.id === selectedModel;
            return (
              <button
                key={model.id}
                onClick={() => {
                  onSelectModel(model.id);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all",
                  isSelected 
                    ? "bg-primary/10 border-primary shadow-lg shadow-primary/10" 
                    : "bg-secondary/50 border-border/50 hover:bg-secondary hover:border-border"
                )}
              >
                <ModelBrandLogo modelId={model.id} size="lg" />
                
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn(
                      "font-semibold truncate",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {model.name}
                    </span>
                    {model.badge && (
                      <span className={cn(
                        "px-1.5 py-0.5 text-[9px] font-bold text-white rounded",
                        getBadgeColor(model.badge)
                      )}>
                        {model.badge}
                      </span>
                    )}
                  </div>
                  {model.description && (
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {model.description}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={cn(
                    "px-2.5 py-1.5 rounded-lg flex items-center gap-1",
                    isSelected ? "bg-primary/20" : "bg-background"
                  )}>
                    <Zap className={cn(
                      "w-3 h-3",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-xs font-bold",
                      isSelected ? "text-primary" : "text-foreground"
                    )}>
                      {model.credits}
                    </span>
                  </div>
                  
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
          
          {filteredModels.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No models found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModelSelectorModal;
