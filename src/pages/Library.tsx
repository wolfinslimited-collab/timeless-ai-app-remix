import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Image, Video, Download, Trash2, Clock, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Generation {
  id: string;
  title: string | null;
  prompt: string;
  type: string;
  model: string;
  status: string;
  output_url: string | null;
  thumbnail_url: string | null;
  credits_used: number;
  created_at: string;
}

const Library = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchGenerations();
    }
  }, [user]);

  const fetchGenerations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("generations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading library",
        description: error.message,
      });
    } else {
      setGenerations(data || []);
    }
    setIsLoading(false);
  };

  const deleteGeneration = async (id: string) => {
    const { error } = await supabase
      .from("generations")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error deleting",
        description: error.message,
      });
    } else {
      setGenerations(generations.filter((g) => g.id !== id));
      toast({
        title: "Deleted",
        description: "Generation removed from library.",
      });
    }
  };

  const filteredGenerations = generations.filter((g) => {
    if (filter === "all") return true;
    return g.type === filter;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Library</h1>
            <p className="text-muted-foreground">
              All your AI-generated creations in one place
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className={filter === "all" ? "gradient-primary text-primary-foreground" : "border-border/50"}
            >
              All
            </Button>
            <Button
              variant={filter === "image" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("image")}
              className={filter === "image" ? "gradient-primary text-primary-foreground" : "border-border/50"}
            >
              <Image className="h-4 w-4 mr-1" />
              Images
            </Button>
            <Button
              variant={filter === "video" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("video")}
              className={filter === "video" ? "gradient-primary text-primary-foreground" : "border-border/50"}
            >
              <Video className="h-4 w-4 mr-1" />
              Videos
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredGenerations.length === 0 ? (
            <div className="text-center py-20">
              <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Image className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No creations yet</h3>
              <p className="text-muted-foreground mb-4">
                Start creating amazing AI content
              </p>
              <Button 
                onClick={() => navigate("/")}
                className="gradient-primary text-primary-foreground"
              >
                Start Creating
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredGenerations.map((gen) => (
                <div
                  key={gen.id}
                  className={`group relative rounded-xl border bg-card overflow-hidden transition-all ${
                    gen.status === "failed" 
                      ? "border-destructive/50 hover:border-destructive" 
                      : gen.status === "pending"
                      ? "border-yellow-500/50 hover:border-yellow-500"
                      : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  {/* Status Badge */}
                  {gen.status === "failed" && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-destructive/90 text-destructive-foreground rounded-full px-2 py-1">
                      <AlertCircle className="h-3 w-3" />
                      <span className="text-xs font-medium">Failed</span>
                    </div>
                  )}
                  {gen.status === "pending" && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-yellow-500/90 text-black rounded-full px-2 py-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs font-medium">Generating</span>
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div className={`aspect-square bg-secondary flex items-center justify-center ${gen.status === "failed" ? "opacity-50" : ""}`}>
                    {gen.thumbnail_url || gen.output_url ? (
                      <img
                        src={gen.thumbnail_url || gen.output_url || ""}
                        alt={gen.title || gen.prompt}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground">
                        {gen.status === "failed" ? (
                          <>
                            <AlertCircle className="h-12 w-12 mb-2 text-destructive" />
                            <span className="text-sm">Generation failed</span>
                          </>
                        ) : gen.status === "pending" ? (
                          <>
                            <Loader2 className="h-12 w-12 mb-2 animate-spin" />
                            <span className="text-sm">Processing...</span>
                          </>
                        ) : gen.type === "video" ? (
                          <>
                            <Video className="h-12 w-12 mb-2" />
                            <span className="text-sm">Preview unavailable</span>
                          </>
                        ) : (
                          <>
                            <Image className="h-12 w-12 mb-2" />
                            <span className="text-sm">Preview unavailable</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => deleteGeneration(gen.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-sm font-medium line-clamp-1 mb-1">
                      {gen.title || gen.prompt}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{gen.model}</span>
                      <span>•</span>
                      {gen.status === "failed" ? (
                        <span className="text-destructive font-medium">Failed</span>
                      ) : gen.status === "pending" ? (
                        <span className="text-yellow-500 font-medium">Processing</span>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(gen.created_at).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Library;
