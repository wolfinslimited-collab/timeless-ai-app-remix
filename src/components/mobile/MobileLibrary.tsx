import { useEffect, useState, useCallback } from "react";
import { Search, Heart, Play, Image, Video, Loader2, X, Music, Download, Trash2, Calendar, Cpu, Maximize2, Sparkles, Coins, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { PullToRefresh } from "./PullToRefresh";
import { useToast } from "@/hooks/use-toast";

interface Generation {
  id: string;
  type: string;
  output_url: string | null;
  thumbnail_url: string | null;
  prompt: string;
  created_at: string;
  status: string;
  title?: string;
  model?: string;
  aspect_ratio?: string | null;
  quality?: string | null;
  credits_used?: number;
}

type Filter = "all" | "image" | "video" | "music";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function statusColor(status: string) {
  switch (status) {
    case "completed": return "text-emerald-400";
    case "failed": return "text-destructive";
    default: return "text-yellow-400";
  }
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function GenerationDetailModal({
  gen,
  onClose,
  onDelete,
}: {
  gen: Generation;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const rows: { icon: React.ReactNode; label: string; value: string; valueClass?: string }[] = [
    {
      icon: <Info className="w-4 h-4" />,
      label: "Type",
      value: capitalize(gen.type),
    },
    ...(gen.model ? [{
      icon: <Cpu className="w-4 h-4" />,
      label: "Model",
      value: gen.model,
    }] : []),
    ...(gen.aspect_ratio ? [{
      icon: <Maximize2 className="w-4 h-4" />,
      label: "Aspect Ratio",
      value: gen.aspect_ratio,
    }] : []),
    ...(gen.quality ? [{
      icon: <Sparkles className="w-4 h-4" />,
      label: "Quality",
      value: capitalize(gen.quality),
    }] : []),
    {
      icon: <Coins className="w-4 h-4" />,
      label: "Credits Used",
      value: String(gen.credits_used ?? 0),
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: "Created",
      value: formatDate(gen.created_at),
    },
    {
      icon: <Info className="w-4 h-4" />,
      label: "Status",
      value: capitalize(gen.status),
      valueClass: statusColor(gen.status),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-t-2xl overflow-hidden"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "calc(92vh - 20px)" }}>
          <div className="p-6 space-y-4">
            {/* Preview */}
            {gen.type === "music" ? (
              <div className="h-36 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <Music className="w-7 h-7 text-white" />
                </div>
                {gen.output_url && (
                  <audio src={gen.output_url} controls className="w-3/4 h-8" />
                )}
              </div>
            ) : gen.type === "video" && gen.output_url ? (
              <div className="rounded-xl overflow-hidden bg-black">
                <video
                  src={gen.output_url}
                  poster={gen.thumbnail_url ?? undefined}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-64 object-contain"
                />
              </div>
            ) : gen.output_url || gen.thumbnail_url ? (
              <div className="rounded-xl overflow-hidden">
                <img
                  src={gen.output_url || gen.thumbnail_url || ""}
                  alt={gen.prompt}
                  className="w-full max-h-64 object-contain bg-secondary"
                />
              </div>
            ) : (
              <div className="h-36 rounded-xl bg-secondary flex items-center justify-center">
                <Image className="w-10 h-10 text-muted-foreground" />
              </div>
            )}

            {/* Prompt */}
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Prompt</p>
              <p className="text-sm text-foreground leading-relaxed">{gen.title || gen.prompt}</p>
            </div>

            {/* Details card */}
            <div className="rounded-xl border border-border/50 bg-secondary/40 divide-y divide-border/40">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-muted-foreground flex-shrink-0">{row.icon}</span>
                  <span className="text-sm text-muted-foreground flex-1">{row.label}</span>
                  <span className={cn("text-sm font-medium text-right", row.valueClass)}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pb-2">
              {gen.output_url && (
                <button
                  onClick={() => window.open(gen.output_url!, "_blank")}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border/50 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Save
                </button>
              )}
              <button
                onClick={() => { onDelete(gen.id); onClose(); }}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 rounded-xl border border-destructive/40 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors",
                  !gen.output_url && "col-span-2"
                )}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function MobileLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);

  useEffect(() => {
    if (user) {
      fetchGenerations();
    }
  }, [user, filter]);

  const fetchGenerations = async () => {
    setIsLoading(true);

    let query = supabase
      .from("generations")
      .select("id, type, output_url, thumbnail_url, prompt, created_at, status, title, model, aspect_ratio, quality, credits_used")
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

  const deleteGeneration = async (id: string) => {
    const { error } = await supabase.from("generations").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error deleting", description: error.message });
    } else {
      setGenerations((prev) => prev.filter((g) => g.id !== id));
      toast({ title: "Deleted", description: "Generation removed from library." });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="w-8 h-8 text-muted-foreground" />;
      case "music": return <Music className="w-8 h-8 text-muted-foreground" />;
      default: return <Image className="w-8 h-8 text-muted-foreground" />;
    }
  };

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} className="h-full">
        <div className="px-4 py-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-foreground text-xl font-bold">Library</h1>
            <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <Search className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto">
            {(["all", "image", "video", "music"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm capitalize transition-colors whitespace-nowrap",
                  filter === f ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
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
                  onClick={() => setSelectedGen(gen)}
                  className={cn(
                    "aspect-square rounded-xl overflow-hidden relative cursor-pointer",
                    gen.type === "music"
                      ? "bg-gradient-to-br from-emerald-500/30 to-teal-500/30"
                      : "bg-gradient-to-br from-primary/20 to-blue-500/20"
                  )}
                >
                  {gen.status === "processing" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                      <span className="text-muted-foreground text-xs">Processing...</span>
                    </div>
                  ) : gen.type === "music" ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-2">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                      <div className="flex items-center gap-0.5 mb-2">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const height = 8 + (i % 3) * 6 + (i % 2) * 4;
                          return (
                            <div key={i} className="w-[3px] bg-emerald-500 rounded-full" style={{ height: `${height}px` }} />
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

                  {/* Bottom overlay */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
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
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Detail Modal */}
      {selectedGen && (
        <GenerationDetailModal
          gen={selectedGen}
          onClose={() => setSelectedGen(null)}
          onDelete={deleteGeneration}
        />
      )}
    </>
  );
}
