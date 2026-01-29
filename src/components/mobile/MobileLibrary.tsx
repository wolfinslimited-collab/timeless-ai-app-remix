import { useEffect, useState, useCallback } from "react";
import { Search, Heart, Play, Image, Video, Loader2, X, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { PullToRefresh } from "./PullToRefresh";

interface Generation {
  id: string;
  type: string;
  output_url: string | null;
  thumbnail_url: string | null;
  prompt: string;
  created_at: string;
  status: string;
  title?: string;
}

type Filter = "all" | "image" | "video" | "music";

export function MobileLibrary() {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Generation | null>(null);

  useEffect(() => {
    if (user) {
      fetchGenerations();
    }
  }, [user, filter]);

  const fetchGenerations = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from("generations")
      .select("id, type, output_url, thumbnail_url, prompt, created_at, status, title")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "all") {
      query = query.eq("type", filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching generations:", error);
    } else {
      setGenerations(data || []);
    }
    
    setIsLoading(false);
  };

  const handleRefresh = useCallback(async () => {
    await fetchGenerations();
  }, [filter]);

  const handleVideoClick = (gen: Generation) => {
    if (gen.type === "video" && gen.output_url) {
      setSelectedVideo(gen);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="w-8 h-8 text-muted-foreground" />;
      case "music":
        return <Music className="w-8 h-8 text-muted-foreground" />;
      default:
        return <Image className="w-8 h-8 text-muted-foreground" />;
    }
  };

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="px-4 py-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-foreground text-xl font-bold">Library</h1>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <Search className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>

          {/* Tabs - matching Flutter with Music tab */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto">
            {(["all", "image", "video", "music"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm capitalize transition-colors whitespace-nowrap",
                  filter === f
                    ? "bg-primary text-white"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {f === "all" ? "All" : f === "image" ? "Images" : f === "video" ? "Videos" : "Music"}
              </button>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Image className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-foreground font-semibold mb-2">No creations yet</h3>
              <p className="text-muted-foreground text-sm">Start creating to see them here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  onClick={() => handleVideoClick(gen)}
                  className={cn(
                    "aspect-square rounded-xl overflow-hidden relative",
                    gen.type === "music" 
                      ? "bg-gradient-to-br from-emerald-500/30 to-teal-500/30"
                      : "bg-gradient-to-br from-primary/20 to-blue-500/20",
                    (gen.type === "video" || gen.type === "music") && gen.output_url && "cursor-pointer"
                  )}
                >
                  {gen.status === "processing" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                      <span className="text-muted-foreground text-xs">Processing...</span>
                    </div>
                  ) : gen.type === "music" ? (
                    // Music card - matching Flutter
                    <div className="w-full h-full flex flex-col items-center justify-center p-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-2">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                      {/* Waveform visualization */}
                      <div className="flex items-center gap-0.5 mb-2">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const height = 8 + (i % 3) * 6 + (i % 2) * 4;
                          return (
                            <div
                              key={i}
                              className="w-[3px] bg-emerald-500 rounded-full"
                              style={{ height: `${height}px` }}
                            />
                          );
                        })}
                      </div>
                      <p className="text-foreground text-[11px] text-center line-clamp-2 px-2">
                        {gen.title || gen.prompt}
                      </p>
                    </div>
                  ) : gen.output_url || gen.thumbnail_url ? (
                    <>
                      {gen.type === "video" ? (
                        <video
                          src={gen.output_url || undefined}
                          poster={gen.thumbnail_url || undefined}
                          preload="metadata"
                          muted
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={gen.output_url || gen.thumbnail_url || ""}
                          alt={gen.prompt}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {gen.type === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Play className="w-6 h-6 text-white fill-white" />
                          </div>
                        </div>
                      )}
                    </>
                  ) : gen.status === "failed" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <span className="text-destructive text-xs">Failed</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getTypeIcon(gen.type)}
                    </div>
                  )}

                  {/* Overlay */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-xs bg-black/50 px-2 py-1 rounded-full capitalize">
                        {gen.type}
                      </span>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center"
                      >
                        <Heart className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedVideo(null)}
        >
          <button
            onClick={() => setSelectedVideo(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          {selectedVideo.type === "music" ? (
            <div className="flex flex-col items-center gap-4 p-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Music className="w-12 h-12 text-white" />
              </div>
              <p className="text-white text-center max-w-xs">{selectedVideo.title || selectedVideo.prompt}</p>
              <audio
                src={selectedVideo.output_url || undefined}
                controls
                autoPlay
                className="w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : (
            <video
              src={selectedVideo.output_url || undefined}
              poster={selectedVideo.thumbnail_url || undefined}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}