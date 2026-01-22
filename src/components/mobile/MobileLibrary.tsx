import { useEffect, useState, useCallback } from "react";
import { Search, Heart, Play, Image, Video, Loader2 } from "lucide-react";
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
}

type Filter = "all" | "image" | "video";

export function MobileLibrary() {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchGenerations();
    }
  }, [user, filter]);

  const fetchGenerations = async () => {
    setIsLoading(true);
    
    let query = supabase
      .from("generations")
      .select("id, type, output_url, thumbnail_url, prompt, created_at, status")
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

  return (
    <PullToRefresh onRefresh={handleRefresh} className="h-full">
      <div className="px-4 py-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-xl font-bold">Library</h1>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4">
          {(["all", "image", "video"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-full text-sm capitalize transition-colors",
                filter === f
                  ? "bg-purple-500 text-white"
                  : "bg-white/10 text-gray-300"
              )}
            >
              {f === "all" ? "All" : f === "image" ? "Images" : "Videos"}
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Image className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-white font-semibold mb-2">No creations yet</h3>
            <p className="text-gray-400 text-sm">Start creating to see them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {generations.map((gen) => (
              <div
                key={gen.id}
                className="aspect-square rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 overflow-hidden relative"
              >
                {gen.status === "processing" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-2" />
                    <span className="text-gray-400 text-xs">Processing...</span>
                  </div>
                ) : gen.output_url || gen.thumbnail_url ? (
                  <>
                    {gen.type === "video" ? (
                      <video
                        src={gen.output_url || undefined}
                        poster={gen.thumbnail_url || undefined}
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
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </>
                ) : gen.status === "failed" ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <span className="text-red-400 text-xs">Failed</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {gen.type === "video" ? (
                      <Video className="w-8 h-8 text-gray-500" />
                    ) : (
                      <Image className="w-8 h-8 text-gray-500" />
                    )}
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-xs bg-black/50 px-2 py-1 rounded-full capitalize">
                      {gen.type}
                    </span>
                    <button className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
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
  );
}
