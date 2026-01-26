import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import TopMenu from "@/components/TopMenu";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Image, Video, Music, Loader2, X, Download, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import GenerationCard from "@/components/GenerationCard";
import GenerationCardSkeleton from "@/components/GenerationCardSkeleton";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

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

const ITEMS_PER_PAGE = 12;

const Library = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filter, setFilter] = useState<"all" | "image" | "video" | "music">("all");
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; prompt: string } | null>(null);
  const [videoModal, setVideoModal] = useState<{ url: string; prompt: string; model: string; id: string } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const handleImageClick = async (imageUrl: string, generationId: string) => {
    // Fetch the full prompt for the lightbox on demand
    const { data } = await supabase
      .from("generations")
      .select("prompt")
      .eq("id", generationId)
      .single();
    
    setLightboxImage({ url: imageUrl, prompt: data?.prompt || "Generated image" });
  };

  const handleVideoClick = async (videoUrl: string, generationId: string, model: string) => {
    // Fetch the full prompt for the modal on demand
    const { data } = await supabase
      .from("generations")
      .select("prompt")
      .eq("id", generationId)
      .single();
    
    setVideoModal({ url: videoUrl, prompt: data?.prompt || "Generated video", model, id: generationId });
    setIsVideoPlaying(false);
  };

  const toggleVideoPlayback = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

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

  const fetchGenerations = async (retryCount = 0) => {
    try {
      setIsLoading(true);
      // Fetch smaller batches to prevent network timeouts
      const { data, error } = await supabase
        .from("generations")
        .select("id,title,type,model,status,output_url,thumbnail_url,credits_used,created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }
      
      // Fetch prompts separately for display (truncated)
      const generationsWithPrompts = (data || []).map(gen => ({
        ...gen,
        prompt: gen.title || "Generation" // Use title as fallback, fetch full prompt only when needed
      }));
      
      setGenerations(generationsWithPrompts as Generation[]);
    } catch (error: any) {
      console.error("Library fetch error:", error);
      
      // Retry up to 2 times on failure
      if (retryCount < 2) {
        console.log(`Retrying fetch... attempt ${retryCount + 2}`);
        setTimeout(() => fetchGenerations(retryCount + 1), 1000);
        return;
      }
      
      toast({
        variant: "destructive",
        title: "Error loading library",
        description: error?.message || "Failed to load your library. Please try again.",
      });
      setGenerations([]);
    } finally {
      if (retryCount === 0 || retryCount >= 2) {
        setIsLoading(false);
      }
    }
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

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [filter]);

  const filteredGenerations = generations.filter((g) => {
    if (filter === "all") return true;
    return g.type === filter;
  });

  const displayedGenerations = filteredGenerations.slice(0, displayCount);
  const hasMore = displayCount < filteredGenerations.length;

  const loadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayCount(prev => prev + ITEMS_PER_PAGE);
      setIsLoadingMore(false);
    }, 300);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      <main className="pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Your Library</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                All your AI-generated creations in one place
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
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
              <Button
                variant={filter === "music" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("music")}
                className={filter === "music" ? "gradient-primary text-primary-foreground" : "border-border/50"}
              >
                <Music className="h-4 w-4 mr-1" />
                Music
              </Button>
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <GenerationCardSkeleton key={i} />
                ))}
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
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayedGenerations.map((gen) => (
                    <GenerationCard 
                      key={gen.id} 
                      gen={gen} 
                      onDelete={deleteGeneration}
                      onImageClick={gen.type === "image" ? (url) => handleImageClick(url, gen.id) : undefined}
                      onVideoClick={gen.type === "video" ? (url) => handleVideoClick(url, gen.id, gen.model) : undefined}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="border-border/50"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        `Load More (${filteredGenerations.length - displayCount} remaining)`
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
      </main>

      <BottomNav />

      {/* Image Lightbox Modal */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-background/95 backdrop-blur-xl border-border/50 overflow-hidden">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {lightboxImage && (
            <div className="relative flex flex-col h-full">
              {/* Close button */}
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* Download button */}
              <button
                onClick={() => window.open(lightboxImage.url, "_blank")}
                className="absolute top-3 right-16 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background transition-colors"
              >
                <Download className="h-5 w-5" />
              </button>
              
              {/* Image container */}
              <div className="flex-1 flex items-center justify-center p-4 min-h-0">
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.prompt}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              </div>
              
              {/* Prompt caption */}
              <div className="p-4 border-t border-border/50 bg-background/50">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {lightboxImage.prompt}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Playback Modal */}
      <Dialog open={!!videoModal} onOpenChange={() => { setVideoModal(null); setIsVideoPlaying(false); }}>
        <DialogContent className="max-w-4xl p-0 bg-background/95 backdrop-blur-xl border-border/50 overflow-hidden">
          <DialogTitle className="sr-only">Video Preview</DialogTitle>
          {videoModal && (
            <div className="flex flex-col md:flex-row h-full">
              {/* Video container */}
              <div className="flex-1 relative bg-black flex items-center justify-center min-h-[300px] md:min-h-[400px]">
                <video
                  ref={videoRef}
                  src={videoModal.url}
                  className="max-w-full max-h-[60vh] object-contain"
                  loop
                  playsInline
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                />
                {/* Play/Pause overlay */}
                <button
                  onClick={toggleVideoPlayback}
                  className="absolute inset-0 flex items-center justify-center cursor-pointer group/play"
                >
                  <div className={`w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-all duration-200 group-hover/play:bg-white/20 group-hover/play:scale-110 shadow-lg ${isVideoPlaying ? 'opacity-0 group-hover/play:opacity-100' : ''}`}>
                    {isVideoPlaying ? (
                      <Pause className="h-7 w-7 text-white" fill="currentColor" />
                    ) : (
                      <Play className="h-7 w-7 text-white ml-1" fill="currentColor" />
                    )}
                  </div>
                </button>
              </div>
              
              {/* Sidebar with metadata */}
              <div className="w-full md:w-72 border-t md:border-t-0 md:border-l border-border/50 bg-background/50 p-4 flex flex-col">
                {/* Close button */}
                <button
                  onClick={() => { setVideoModal(null); setIsVideoPlaying(false); }}
                  className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="space-y-4 mt-8 md:mt-0">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Model</h4>
                    <p className="text-sm font-medium capitalize">{videoModal.model}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Prompt</h4>
                    <p className="text-sm text-foreground/80 line-clamp-6">{videoModal.prompt}</p>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="mt-auto pt-4 space-y-2">
                  <Button
                    onClick={() => window.open(videoModal.url, "_blank")}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Library;
