import { useState } from "react";
import { ArrowLeft, Heart, Image as ImageIcon, Video, Music, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileFavoritesProps {
  onBack: () => void;
}

type FilterType = "all" | "images" | "videos" | "audio";

// Mock favorites data - in real app this would come from local storage or state
const mockFavorites: { id: string; type: "image" | "video" | "audio"; url?: string; prompt: string }[] = [];

export function MobileFavorites({ onBack }: MobileFavoritesProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredFavorites = filter === "all" 
    ? mockFavorites 
    : mockFavorites.filter(f => {
        if (filter === "images") return f.type === "image";
        if (filter === "videos") return f.type === "video";
        if (filter === "audio") return f.type === "audio";
        return true;
      });

  const getIcon = (type: string) => {
    switch (type) {
      case "image":
        return ImageIcon;
      case "video":
        return Video;
      case "audio":
        return Music;
      default:
        return Heart;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>
        
        <h1 className="text-foreground text-2xl font-bold">Favorites</h1>
        <p className="text-muted-foreground text-sm">Your favorite creations</p>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-3">
        <div className="flex gap-2">
          {(["all", "images", "videos", "audio"] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all capitalize",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredFavorites.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredFavorites.map(item => {
              const Icon = getIcon(item.type);
              return (
                <div
                  key={item.id}
                  className="aspect-square rounded-xl bg-gradient-to-br from-primary/30 to-pink-500/30 overflow-hidden relative"
                >
                  {item.url ? (
                    item.type === "video" ? (
                      <>
                        <video 
                          src={item.url}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white/70" />
                        </div>
                      </>
                    ) : (
                      <img 
                        src={item.url}
                        alt={item.prompt}
                        className="w-full h-full object-cover"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Icon className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  {/* Heart overlay */}
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center">
                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-foreground text-lg font-semibold mb-2">No Favorites Yet</h2>
            <p className="text-muted-foreground text-sm">
              Tap the heart icon on any creation to save it here for quick access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
