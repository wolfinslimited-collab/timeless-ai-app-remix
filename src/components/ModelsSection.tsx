import { ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const models = [
  {
    name: "Sora 2",
    provider: "OpenAI",
    type: "Video",
    badge: "TOP",
    credits: "50/gen",
    color: "border-emerald-500/50 bg-emerald-500/10",
    badgeColor: "bg-emerald-500/20 text-emerald-400",
  },
  {
    name: "Veo 3.1",
    provider: "Google",
    type: "Video",
    badge: "NEW",
    credits: "40/gen",
    color: "border-blue-500/50 bg-blue-500/10",
    badgeColor: "bg-blue-500/20 text-blue-400",
  },
  {
    name: "Kling 2.6",
    provider: "Kuaishou",
    type: "Video",
    badge: "TOP",
    credits: "30/gen",
    color: "border-purple-500/50 bg-purple-500/10",
    badgeColor: "bg-purple-500/20 text-purple-400",
  },
  {
    name: "Nano Banana Pro",
    provider: "Higgsfield",
    type: "Image",
    badge: "∞",
    credits: "Unlimited",
    color: "border-amber-500/50 bg-amber-500/10",
    badgeColor: "bg-amber-500/20 text-amber-400",
  },
  {
    name: "Flux Ultra",
    provider: "Black Forest",
    type: "Image",
    credits: "10/gen",
    color: "border-pink-500/50 bg-pink-500/10",
    badgeColor: "bg-pink-500/20 text-pink-400",
  },
];

const ModelsSection = () => {
  return (
    <section className="py-12">
      <div className="container px-4">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">AI Models</h2>
            <p className="text-muted-foreground mt-1">Access the world's best generative AI</p>
          </div>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1">
            Compare all
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Models List */}
        <div className="space-y-3">
          {models.map((model) => (
            <button
              key={model.name}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl border transition-all",
                "hover:bg-secondary/50",
                model.color
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background/50">
                  <Zap className="h-5 w-5 text-foreground" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{model.name}</span>
                    {model.badge && (
                      <Badge className={cn("text-[10px] font-bold border-0", model.badgeColor)}>
                        {model.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {model.provider} • {model.type}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{model.credits}</div>
                <div className="text-xs text-muted-foreground">credits</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ModelsSection;
