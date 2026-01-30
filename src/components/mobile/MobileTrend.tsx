import { ArrowLeft } from "lucide-react";
import { TrendingUp, Flame, Star, Clock } from "lucide-react";

interface MobileTrendProps {
  onBack: () => void;
}

export function MobileTrend({ onBack }: MobileTrendProps) {
  const trendingItems = [
    { id: 1, title: "AI Art Generation", views: "2.5M", change: "+45%", icon: Flame },
    { id: 2, title: "Video Enhancement", views: "1.8M", change: "+32%", icon: TrendingUp },
    { id: 3, title: "Voice Cloning", views: "1.2M", change: "+28%", icon: Star },
    { id: 4, title: "Image Upscaling", views: "980K", change: "+22%", icon: Clock },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center border-b border-border">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="ml-3 text-lg font-semibold text-foreground">Trend</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Discover what's trending in AI creation
        </p>

        {/* Trending List */}
        <div className="space-y-3">
          {trendingItems.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.views} views</p>
              </div>
              <div className="flex items-center gap-1 text-primary text-sm font-medium">
                <item.icon className="w-4 h-4" />
                {item.change}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
