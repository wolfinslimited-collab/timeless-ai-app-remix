import { Flame, Zap, Sparkles, Heart, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const categories = [
  { name: "All", active: true },
  { name: "Viral", icon: <Flame className="h-3 w-3" /> },
  { name: "VFX", icon: <Zap className="h-3 w-3" /> },
  { name: "Commercial", icon: <Sparkles className="h-3 w-3" /> },
  { name: "ASMR", icon: <Heart className="h-3 w-3" /> },
];

const effects = [
  { 
    name: "Explosion", 
    category: "VFX", 
    thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=400&fit=crop",
  },
  { 
    name: "Glitch Art", 
    category: "Viral", 
    thumbnail: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop",
  },
  { 
    name: "Product Reveal", 
    category: "Commercial", 
    thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
  },
  { 
    name: "Satisfying Loop", 
    category: "ASMR", 
    thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
  },
  { 
    name: "Cinematic Zoom", 
    category: "VFX", 
    thumbnail: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=400&h=400&fit=crop",
  },
  { 
    name: "Trending Dance", 
    category: "Viral", 
    thumbnail: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=400&h=400&fit=crop",
  },
];

const EffectsSection = () => {
  return (
    <section className="py-12">
      <div className="container px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold md:text-3xl">One-Click Effects</h2>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
            See all
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Button
              key={cat.name}
              variant={cat.active ? "default" : "outline"}
              size="sm"
              className={cn(
                "rounded-full gap-1.5 whitespace-nowrap",
                cat.active 
                  ? "gradient-primary text-primary-foreground" 
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.icon}
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Effects Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {effects.map((effect) => (
            <button
              key={effect.name}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/50 hover:border-primary/30 transition-all"
            >
              {/* Video Thumbnail */}
              <img 
                src={effect.thumbnail} 
                alt={effect.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
              
              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                  <Play className="h-5 w-5 text-primary-foreground fill-current" />
                </div>
              </div>
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                <span className="font-medium text-foreground text-sm">{effect.name}</span>
                <Badge 
                  variant="outline" 
                  className="mt-1.5 block w-fit text-[10px] bg-background/40 border-border/50 text-muted-foreground"
                >
                  {effect.category}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EffectsSection;
