import { Flame, Zap, Sparkles, Heart, ChevronRight } from "lucide-react";
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
  { name: "Explosion", category: "VFX", color: "from-orange-500 to-red-600" },
  { name: "Glitch Art", category: "Viral", color: "from-cyan-500 to-blue-600" },
  { name: "Product Reveal", category: "Commercial", color: "from-amber-500 to-yellow-600" },
  { name: "Satisfying Loop", category: "ASMR", color: "from-pink-500 to-purple-600" },
  { name: "Cinematic Zoom", category: "VFX", color: "from-indigo-500 to-violet-600" },
  { name: "Trending Dance", category: "Viral", color: "from-green-500 to-emerald-600" },
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
              <div className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-80 group-hover:opacity-100 transition-opacity",
                effect.color
              )} />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                <span className="font-medium text-foreground text-sm">{effect.name}</span>
                <Badge 
                  variant="outline" 
                  className="mt-2 text-[10px] bg-background/20 border-foreground/20 text-foreground"
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
