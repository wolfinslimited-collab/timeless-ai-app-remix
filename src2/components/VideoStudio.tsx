import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Video,
  Clock,
  Volume2,
  VolumeX,
  Settings,
  Sparkles,
  Loader2,
  Upload,
  X,
  Download,
  RotateCcw,
  AlertCircle,
  Play,
  Film,
  Share2,
  Coins,
  Zap,
  Star,
  Image as ImageIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AddCreditsDialog from "@/components/AddCreditsDialog";
import ModelSelectorModal from "@/components/ModelSelectorModal";
import { useCredits } from "@/hooks/useCredits";
import { useRecentModels } from "@/hooks/useRecentModels";

// Model types
type ModelTier = "economy" | "hq";
type ModelProvider = "kie" | "fal" | "lovable";

interface BaseModel {
  id: string;
  name: string;
  description: string;
  badge: string;
  credits: number;
  provider: ModelProvider;
  tier: ModelTier;
}

// Video Models
const videoModels: BaseModel[] = [
  // === ECONOMY TIER (Kie.ai Marketplace) ===
  { id: "kie-runway", name: "Runway Gen", description: "Kie.ai video gen", badge: "ECONOMY", credits: 8, provider: "kie", tier: "economy" },
  { id: "kie-runway-i2v", name: "Runway I2V", description: "Image to video", badge: "ECONOMY", credits: 10, provider: "kie", tier: "economy" },
  { id: "kie-sora2", name: "Sora 2", description: "OpenAI video gen", badge: "ECONOMY", credits: 12, provider: "kie", tier: "economy" },
  { id: "kie-sora2-pro", name: "Sora 2 Pro", description: "OpenAI best quality", badge: "ECONOMY", credits: 18, provider: "kie", tier: "economy" },
  { id: "kie-veo31", name: "Veo 3.1", description: "Google latest video", badge: "ECONOMY", credits: 15, provider: "kie", tier: "economy" },
  { id: "kie-veo31-fast", name: "Veo 3.1 Fast", description: "Google fast video", badge: "ECONOMY", credits: 10, provider: "kie", tier: "economy" },
  { id: "kie-kling", name: "Kling 2.1", description: "Kuaishou video AI", badge: "ECONOMY", credits: 12, provider: "kie", tier: "economy" },
  { id: "kie-hailuo", name: "Hailuo", description: "MiniMax video", badge: "ECONOMY", credits: 10, provider: "kie", tier: "economy" },
  { id: "kie-wan", name: "Wan 2.2", description: "Alibaba video AI", badge: "ECONOMY", credits: 8, provider: "kie", tier: "economy" },
  { id: "kie-grok-video", name: "Grok Video", description: "X.AI video gen", badge: "ECONOMY", credits: 10, provider: "kie", tier: "economy" },
  // === HIGH QUALITY TIER (Fal.ai) ===
  { id: "wan-2.6", name: "Wan 2.6", description: "Latest Alibaba model", badge: "NEW", credits: 15, provider: "fal", tier: "hq" },
  { id: "kling-2.6", name: "Kling 2.6 Pro", description: "Cinematic with audio", badge: "TOP", credits: 25, provider: "fal", tier: "hq" },
  { id: "veo-3", name: "Veo 3", description: "Google's best with audio", badge: "TOP", credits: 30, provider: "fal", tier: "hq" },
  { id: "veo-3-fast", name: "Veo 3 Fast", description: "Faster Veo 3", badge: "PRO", credits: 20, provider: "fal", tier: "hq" },
  { id: "hailuo-02", name: "Hailuo-02", description: "MiniMax video model", badge: "NEW", credits: 18, provider: "fal", tier: "hq" },
  { id: "seedance-1.5", name: "Seedance 1.5", description: "With audio support", badge: "NEW", credits: 20, provider: "fal", tier: "hq" },
  { id: "luma", name: "Luma Dream Machine", description: "Creative video", badge: "PRO", credits: 22, provider: "fal", tier: "hq" },
  { id: "hunyuan-1.5", name: "Hunyuan 1.5", description: "Tencent video model", badge: "NEW", credits: 18, provider: "fal", tier: "hq" },
];

const aspectRatios = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
const qualities = ["480p", "720p", "1080p"];
const durations = [3, 5, 7, 10];

// Video Templates
const videoTemplates = [
  { label: "Cinematic", prompt: "A cinematic wide shot of a beautiful sunset over mountains, golden hour, 4K quality" },
  { label: "Action", prompt: "Dynamic action shot with dramatic lighting, fast-paced, professional cinematography" },
  { label: "Nature", prompt: "Peaceful nature scene with flowing water and lush greenery, National Geographic style" },
  { label: "Urban", prompt: "Modern city skyline at night with neon lights reflecting, cyberpunk aesthetic" },
  { label: "Abstract", prompt: "Mesmerizing abstract patterns morphing and flowing, vibrant colors, artistic" },
  { label: "Portrait", prompt: "Elegant portrait with cinematic bokeh background, professional lighting" },
];

interface VideoStudioProps {
  prompt: string;
  setPrompt: (value: string) => void;
  startingImage: string | null;
  setStartingImage: (value: string | null) => void;
  isUploading: boolean;
  isGenerating: boolean;
  generationError: string | null;
  result: { output_url?: string } | null;
  currentCost: number;
  hasEnoughCredits: boolean;
  user: any;
  onGenerate: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  model: string;
  setModel: (value: string) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  quality: string;
  setQuality: (value: string) => void;
  duration: number;
  setDuration: (value: number) => void;
}

const VideoStudio = ({
  prompt,
  setPrompt,
  startingImage,
  setStartingImage,
  isUploading,
  isGenerating,
  generationError,
  result,
  currentCost,
  hasEnoughCredits,
  user,
  onGenerate,
  onImageUpload,
  model,
  setModel,
  aspectRatio,
  setAspectRatio,
  quality,
  setQuality,
  duration,
  setDuration,
}: VideoStudioProps) => {
  const { credits } = useCredits();
  const { getRecentModelIds, trackModelUsage } = useRecentModels();
  const recentVideoModels = getRecentModelIds("video");
  
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<{
    id: string;
    output_url: string | null;
    thumbnail_url: string | null;
    prompt: string;
    created_at: string;
    model: string | null;
  } | null>(null);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [previousGenerations, setPreviousGenerations] = useState<Array<{
    id: string;
    output_url: string | null;
    thumbnail_url: string | null;
    prompt: string;
    created_at: string;
    model: string | null;
  }>>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);

  // Handle generate with credit check
  const handleGenerateClick = () => {
    if (user && !hasEnoughCredits) {
      setShowAddCreditsDialog(true);
      return;
    }
    onGenerate();
  };

  // Fetch previous video generations
  useEffect(() => {
    const fetchGenerations = async () => {
      if (!user) {
        setLoadingGenerations(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("generations")
          .select("id, output_url, thumbnail_url, prompt, created_at, model")
          .eq("user_id", user.id)
          .eq("type", "video")
          .eq("status", "completed")
          .not("output_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setPreviousGenerations(data || []);
      } catch (err) {
        console.error("Error fetching generations:", err);
      } finally {
        setLoadingGenerations(false);
      }
    };

    fetchGenerations();
  }, [user, result]);

  const displayVideo = selectedGeneration?.output_url || result?.output_url;

  const getCurrentModel = () => videoModels.find(m => m.id === model);

  const handleDownload = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = "video.mp4";
    link.target = "_blank";
    link.click();
  };

  const handleShare = async (url: string, promptText: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out my video!",
          text: promptText,
          url: url,
        });
      } catch (err) {
        navigator.clipboard.writeText(url);
      }
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleRecreate = (promptText: string) => {
    setPrompt(promptText);
    setSelectedGeneration(null);
  };

  return (
    <div className="relative h-[calc(100vh-8rem)] overflow-hidden">
      {/* Higgsfield-style Full-Screen Grid Background */}
      <div className="absolute inset-0 overflow-auto pb-48 md:pb-40">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border/20">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
              <Video className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Video Studio</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {previousGenerations.length} videos
            </Badge>
          </div>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 p-1">
          {loadingGenerations ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-video bg-secondary/50 animate-pulse rounded-sm" />
            ))
          ) : previousGenerations.length > 0 ? (
            previousGenerations.map((gen) => (
              <button
                key={gen.id}
                onClick={() => setSelectedGeneration(gen)}
                className={cn(
                  "relative aspect-video overflow-hidden group",
                  displayVideo === gen.output_url && "ring-2 ring-primary"
                )}
              >
                {gen.output_url && (
                  <video
                    src={gen.output_url}
                    className="w-full h-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-[10px] text-white/90 line-clamp-2">
                      {gen.prompt}
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="h-5 w-5 text-white fill-white" />
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Video className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No videos yet</p>
              <p className="text-xs mt-1">Generate your first video below</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Toolbar - Higgsfield Style */}
      <div className="absolute bottom-4 left-4 right-4 md:left-8 md:right-8 z-20">
        <div className="bg-secondary/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-3 md:p-4">
          {/* Two-row layout */}
          <div className="flex flex-col gap-3">
            {/* Row 1: Prompt Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Describe your video..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="flex-1 h-12 md:h-14 text-base md:text-lg bg-background/50 border-border/30 placeholder:text-muted-foreground/50"
              />
            </div>

            {/* Row 2: Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Starting Image Upload */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      {startingImage ? (
                        <div className="relative h-10 w-10 rounded-lg overflow-hidden border-2 border-primary">
                          <img src={startingImage} alt="Starting" className="h-full w-full object-cover" />
                          <button
                            onClick={() => setStartingImage(null)}
                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive flex items-center justify-center"
                          >
                            <X className="h-2.5 w-2.5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <label className="h-10 w-10 rounded-lg bg-background/50 border border-border/30 flex items-center justify-center cursor-pointer hover:bg-background/80 transition-colors">
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={onImageUpload}
                            disabled={isUploading || !user}
                          />
                        </label>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Starting frame (I2V)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Templates */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-2 bg-background/50 border-border/30"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Templates</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <div className="grid gap-1">
                    {videoTemplates.map((template) => (
                      <Button
                        key={template.label}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-2"
                        onClick={() => setPrompt(template.prompt)}
                      >
                        <span className="text-sm">{template.label}</span>
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Duration */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-2 bg-background/50 border-border/30"
                  >
                    <Clock className="h-4 w-4" />
                    {duration}s
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <Label className="text-xs text-muted-foreground mb-2 block">Duration</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {durations.map((d) => (
                      <Button
                        key={d}
                        variant={duration === d ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDuration(d)}
                        className={cn(
                          "h-8",
                          duration === d && "gradient-primary"
                        )}
                      >
                        {d}s
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Aspect Ratio */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-2 bg-background/50 border-border/30"
                  >
                    <Film className="h-4 w-4" />
                    {aspectRatio}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="start">
                  <Label className="text-xs text-muted-foreground mb-2 block">Aspect Ratio</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {aspectRatios.map((ratio) => (
                      <Button
                        key={ratio}
                        variant={aspectRatio === ratio ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAspectRatio(ratio)}
                        className={cn(
                          "h-8 text-xs",
                          aspectRatio === ratio && "gradient-primary"
                        )}
                      >
                        {ratio}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Quality */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 gap-2 bg-background/50 border-border/30"
                  >
                    <Settings className="h-4 w-4" />
                    {quality}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2" align="start">
                  <Label className="text-xs text-muted-foreground mb-2 block">Quality</Label>
                  <div className="grid gap-1">
                    {qualities.map((q) => (
                      <Button
                        key={q}
                        variant={quality === q ? "default" : "outline"}
                        size="sm"
                        onClick={() => setQuality(q)}
                        className={cn(
                          "h-8",
                          quality === q && "gradient-primary"
                        )}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Sound Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-10 w-10 bg-background/50 border-border/30",
                        soundEnabled && "border-primary/50 bg-primary/10"
                      )}
                      onClick={() => setSoundEnabled(!soundEnabled)}
                    >
                      {soundEnabled ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{soundEnabled ? "Sound On" : "Sound Off"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Model Selector */}
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-2 bg-background/50 border-border/30 ml-auto"
                onClick={() => setModelModalOpen(true)}
              >
                {(() => {
                  const currentModel = getCurrentModel();
                  if (!currentModel) return null;
                  const isTop = currentModel.badge === "TOP";
                  const isEconomy = currentModel.tier === "economy";
                  return (
                    <>
                      {isTop ? (
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      ) : isEconomy ? (
                        <Coins className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Zap className="h-4 w-4 text-primary" />
                      )}
                      <span className="hidden sm:inline max-w-[80px] truncate">
                        {currentModel.name}
                      </span>
                    </>
                  );
                })()}
              </Button>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateClick}
                disabled={isGenerating || !prompt.trim()}
                className="h-10 px-4 md:px-6 gap-2 gradient-primary text-white font-medium"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Generate</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0">
                      {currentCost}
                    </Badge>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Generating Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-30">
          <div className="flex flex-col items-center gap-4 text-center p-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              <Sparkles className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="font-medium">Generating your video...</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a few minutes</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {generationError && !isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-30">
          <div className="flex flex-col items-center gap-4 text-center p-6 max-w-md">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">Generation failed</p>
              <p className="text-sm text-muted-foreground mt-1">{generationError}</p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Generation Detail Modal */}
      <Dialog open={!!selectedGeneration} onOpenChange={() => setSelectedGeneration(null)}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Video Preview */}
            <div className="flex-1 bg-black aspect-video md:aspect-auto md:min-h-[400px] flex items-center justify-center">
              {selectedGeneration?.output_url && (
                <video
                  src={selectedGeneration.output_url}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            
            {/* Sidebar */}
            <div className="w-full md:w-80 p-4 md:p-6 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-border">
              <div>
                <Label className="text-xs text-muted-foreground">Prompt</Label>
                <p className="text-sm mt-1">{selectedGeneration?.prompt}</p>
              </div>
              
              {selectedGeneration?.model && (
                <div>
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  <p className="text-sm mt-1">
                    {videoModels.find(m => m.id === selectedGeneration.model)?.name || selectedGeneration.model}
                  </p>
                </div>
              )}
              
              <div>
                <Label className="text-xs text-muted-foreground">Created</Label>
                <p className="text-sm mt-1">
                  {selectedGeneration?.created_at && new Date(selectedGeneration.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => selectedGeneration && handleRecreate(selectedGeneration.prompt)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Recreate
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => selectedGeneration?.output_url && handleDownload(selectedGeneration.output_url)}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => selectedGeneration?.output_url && handleShare(selectedGeneration.output_url, selectedGeneration.prompt)}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Model Selector Modal */}
      <ModelSelectorModal
        open={modelModalOpen}
        onOpenChange={setModelModalOpen}
        models={videoModels}
        selectedModel={model}
        onSelectModel={(id) => {
          setModel(id);
          trackModelUsage(id, "video");
        }}
        type="video"
        recentModelIds={recentVideoModels}
      />

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        open={showAddCreditsDialog}
        onOpenChange={setShowAddCreditsDialog}
        requiredCredits={currentCost}
      />
    </div>
  );
};

export default VideoStudio;
