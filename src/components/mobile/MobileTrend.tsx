import { ArrowLeft, TrendingUp, Play, Eye, Heart, Clock, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileTrendProps {
  onBack: () => void;
}

const trendingItems = [
  {
    id: 1,
    title: "Cinematic Sunset",
    views: "2.4M",
    likes: "124K",
    thumbnail: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    duration: "0:15",
    trending: true,
  },
  {
    id: 2,
    title: "Urban Night Flow",
    views: "1.8M",
    likes: "98K",
    thumbnail: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&h=300&fit=crop",
    duration: "0:12",
    trending: true,
  },
  {
    id: 3,
    title: "Nature Timelapse",
    views: "956K",
    likes: "67K",
    thumbnail: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=300&fit=crop",
    duration: "0:20",
    trending: false,
  },
  {
    id: 4,
    title: "Abstract Motion",
    views: "743K",
    likes: "45K",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop",
    duration: "0:08",
    trending: false,
  },
  {
    id: 5,
    title: "Ocean Waves",
    views: "1.2M",
    likes: "89K",
    thumbnail: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=400&h=300&fit=crop",
    duration: "0:18",
    trending: true,
  },
  {
    id: 6,
    title: "City Lights",
    views: "678K",
    likes: "34K",
    thumbnail: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&h=300&fit=crop",
    duration: "0:14",
    trending: false,
  },
];

const categories = ["All", "Cinematic", "Abstract", "Nature", "Urban", "Minimal"];

export function MobileTrend({ onBack }: MobileTrendProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Trending
            </h1>
            <p className="text-xs text-muted-foreground">Discover what's hot right now</p>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((category, index) => (
            <button
              key={category}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                index === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Featured Trending */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Hot Right Now</h2>
          </div>
          <div className="relative rounded-2xl overflow-hidden aspect-video">
            <img
              src={trendingItems[0].thumbnail}
              alt={trendingItems[0].title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-white font-semibold text-base">{trendingItems[0].title}</h3>
              <div className="flex items-center gap-3 mt-1 text-white/80 text-xs">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {trendingItems[0].views}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {trendingItems[0].likes}
                </span>
              </div>
            </div>
            <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded-md text-white text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {trendingItems[0].duration}
            </div>
            <button className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
            </button>
          </div>
        </div>

        {/* Trending Grid */}
        <div className="space-y-3">
          {trendingItems.slice(1).map((item, index) => (
            <div
              key={item.id}
              className="flex gap-3 p-2 rounded-xl bg-secondary border border-border"
            >
              <div className="relative w-28 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-white text-[10px]">
                  {item.duration}
                </div>
                {item.trending && (
                  <div className="absolute top-1 left-1 bg-primary p-1 rounded">
                    <Flame className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 py-1">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-medium text-foreground line-clamp-1">
                    {item.title}
                  </h3>
                  <span className="text-xs text-muted-foreground">#{index + 2}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-muted-foreground text-xs">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {item.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    {item.likes}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
