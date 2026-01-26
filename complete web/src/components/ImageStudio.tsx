import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Image,
  Sparkles,
  Loader2,
  Upload,
  X,
  Download,
  RotateCcw,
  Plus,
  Film,
  Share2,
  ChevronDown,
  Coins,
  Zap,
  Clapperboard,
  User,
  Wand2,
  TvMinimal,
  Camera,
  Palette,
  type LucideIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import AddCreditsDialog from "@/components/AddCreditsDialog";
import { useCredits } from "@/hooks/useCredits";
import { useRecentModels } from "@/hooks/useRecentModels";
import { ModelSelectorModal } from "@/components/ModelSelectorModal";

// Image Models with Economy/HQ tiers
const imageModels = [
  // Economy tier (Kie.ai)
  { id: "kie-4o-image", name: "GPT-4o Image", description: "Fast creative images", badge: "FAST", credits: 3, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-gpt-image-1", name: "GPT Image 1", description: "High quality outputs", badge: "TOP", credits: 4, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-nano-banana", name: "Nano Banana", description: "Quick stylized images", badge: "HOT", credits: 2, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-midjourney", name: "Midjourney v6", description: "Artistic and creative", badge: "HOT", credits: 5, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-flux-kontext-pro", name: "Flux Kontext Pro", description: "Advanced context", badge: "NEW", credits: 4, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-flux-kontext-max", name: "Flux Kontext Max", description: "Maximum detail", badge: "", credits: 6, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-flux2-pro", name: "Flux 2 Pro", description: "Latest Flux model", badge: "NEW", credits: 4, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-flux-pro", name: "Flux Pro", description: "Professional quality", badge: "", credits: 3, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-flux-dev", name: "Flux Dev", description: "Development model", badge: "", credits: 2, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-flux-schnell", name: "Flux Schnell", description: "Ultra fast", badge: "FAST", credits: 1, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-ideogram-v3", name: "Ideogram v3", description: "Text in images", badge: "", credits: 3, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-imagen-4", name: "Imagen 4", description: "Google's latest", badge: "NEW", credits: 4, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-grok-imagine", name: "Grok Imagine", description: "xAI image model", badge: "", credits: 3, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-kling-image", name: "Kling Image", description: "Detailed renders", badge: "", credits: 3, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-qwen-image", name: "Qwen Image", description: "Alibaba model", badge: "", credits: 2, provider: "kie" as const, tier: "economy" as const },
  { id: "kie-seedream-4", name: "Seedream 4", description: "Creative dreams", badge: "", credits: 3, provider: "kie" as const, tier: "economy" as const },
  
  // HQ tier (Fal.ai / Lovable)
  { id: "flux-1.1-pro", name: "Flux 1.1 Pro", description: "Premium quality", badge: "TOP", credits: 5, provider: "fal" as const, tier: "hq" as const },
  { id: "nano-banana", name: "Nano Banana", description: "Fast multimodal", badge: "HOT", credits: 4, provider: "lovable" as const, tier: "hq" as const },
  { id: "gpt-image-1.5", name: "GPT Image 1.5", description: "OpenAI's best", badge: "TOP", credits: 10, provider: "lovable" as const, tier: "hq" as const },
  { id: "ideogram-v2", name: "Ideogram v2", description: "Great for text", badge: "", credits: 6, provider: "fal" as const, tier: "hq" as const },
  { id: "flux-pro-ultra", name: "Flux Pro Ultra", description: "4K outputs", badge: "NEW", credits: 8, provider: "fal" as const, tier: "hq" as const },
  { id: "recraft-v3", name: "Recraft v3", description: "Design focused", badge: "", credits: 5, provider: "fal" as const, tier: "hq" as const },
  { id: "stable-diffusion-3", name: "SD 3.5", description: "Open source power", badge: "", credits: 4, provider: "fal" as const, tier: "hq" as const },
];

// Model-specific quality options
const MODEL_QUALITY_OPTIONS: Record<string, string[]> = {
  "nano-banana": ["1024", "2K", "4K"],
  "flux-1.1-pro": ["1024", "2K"],
  "gpt-image-1.5": ["1024", "2K"],
  "ideogram-v2": ["1024", "2K"],
  "flux-pro-ultra": ["2K", "4K"],
  "midjourney-v6": ["1024", "2K", "4K"],
};

const DEFAULT_QUALITY_OPTIONS = ["1024", "2K"];

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"];

// Style Presets
interface StylePreset {
  id: string;
  name: string;
  description: string;
  Icon: LucideIcon;
  prompt: string;
}

const stylePresets: StylePreset[] = [
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Film-like quality with dramatic lighting",
    Icon: Clapperboard,
    prompt: "cinematic lighting, film grain, dramatic shadows, 35mm",
  },
  {
    id: "portrait",
    name: "Portrait",
    description: "Professional portrait photography",
    Icon: User,
    prompt: "portrait photography, soft lighting, bokeh, 85mm lens",
  },
  {
    id: "fantasy",
    name: "Fantasy",
    description: "Magical and ethereal atmosphere",
    Icon: Wand2,
    prompt: "fantasy art, magical lighting, ethereal, dreamlike",
  },
  {
    id: "anime",
    name: "Anime",
    description: "Japanese animation style",
    Icon: TvMinimal,
    prompt: "anime style, vibrant colors, detailed, studio quality",
  },
  {
    id: "photorealistic",
    name: "Photorealistic",
    description: "Ultra-realistic photography",
    Icon: Camera,
    prompt: "photorealistic, 8K, ultra detailed, professional photography",
  },
  {
    id: "oil-painting",
    name: "Oil Painting",
    description: "Classic oil painting style",
    Icon: Palette,
    prompt: "oil painting, textured brushstrokes, classical art, masterpiece",
  },
];

interface ImageStudioProps {
  prompt: string;
  setPrompt: (value: string) => void;
  referenceImages: string[];
  setReferenceImages: (value: string[]) => void;
  isUploading: boolean;
  uploadingIndex: number | null;
  isGenerating: boolean;
  generationError: string | null;
  result: { output_url?: string } | null;
  currentCost: number;
  hasEnoughCredits: boolean;
  user: any;
  onGenerate: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  model: string;
  setModel: (value: string) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  quality: string;
  setQuality: (value: string) => void;
}

const ImageStudio = ({
  prompt,
  setPrompt,
  referenceImages,
  setReferenceImages,
  isUploading,
  uploadingIndex,
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
}: ImageStudioProps) => {
  const { credits } = useCredits();
  const { trackModelUsage, getRecentModelIds } = useRecentModels();
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<{
    id: string;
    output_url: string | null;
    prompt: string;
    created_at: string;
    model: string | null;
  } | null>(null);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [previousGenerations, setPreviousGenerations] = useState<Array<{
    id: string;
    output_url: string | null;
    prompt: string;
    created_at: string;
    model: string | null;
  }>>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<StylePreset | null>(null);
  
  const recentImageModels = getRecentModelIds("image");

  // Handle generate with credit check
  const handleGenerateClick = () => {
    if (user && !hasEnoughCredits) {
      setShowAddCreditsDialog(true);
      return;
    }
    onGenerate();
  };

  // Apply style preset
  const applyStylePreset = (preset: StylePreset) => {
    setSelectedStyle(preset);
    // Append style to prompt if not already there
    if (!prompt.includes(preset.prompt)) {
      setPrompt(prompt ? `${prompt}, ${preset.prompt}` : preset.prompt);
    }
  };

  // Auto-update quality when model changes
  useEffect(() => {
    const availableQualities = MODEL_QUALITY_OPTIONS[model] ?? DEFAULT_QUALITY_OPTIONS;
    if (!availableQualities.includes(quality)) {
      setQuality(availableQualities[0]);
    }
  }, [model, quality, setQuality]);

  // Fetch previous image generations
  useEffect(() => {
    const fetchGenerations = async () => {
      if (!user) {
        setLoadingGenerations(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("generations")
          .select("id, output_url, prompt, created_at, model")
          .eq("user_id", user.id)
          .eq("type", "image")
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
  }, [user, result]); // Refetch when result changes (new generation)

  const modelInfo = imageModels.find((m) => m.id === model) || imageModels[0];

  return (
    <div className="relative h-[calc(100vh-8rem)] overflow-hidden">
      {/* Full-Screen Grid Background */}
      <div className="absolute inset-0 overflow-auto pb-32">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border/20">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-primary" />
            <span className="font-medium">Image Studio</span>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {previousGenerations.length} generations
          </div>
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 p-1">
          {/* Loading state - Skeleton Grid */}
          {loadingGenerations ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-secondary/50 animate-pulse rounded-sm" />
            ))
          ) : previousGenerations.length > 0 ? (
            previousGenerations.map((gen) => (
              <button
                key={gen.id}
                onClick={() => setSelectedGeneration(gen)}
                className={cn(
                  "relative aspect-square overflow-hidden group rounded-sm",
                  selectedGeneration?.id === gen.id && "ring-2 ring-primary"
                )}
              >
                {gen.output_url && (
                  <img
                    src={gen.output_url}
                    alt="Generated image"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          ) : (
            // Empty state with placeholder grid
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="grid grid-cols-3 gap-2 mb-6 opacity-30">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center">
                    <Image className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                ))}
              </div>
              <p className="text-muted-foreground text-sm">Your generated images will appear here</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Start creating with the prompt below</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Toolbar */}
      <div className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-2 sm:px-4 z-30">
        <div className="rounded-2xl border border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl p-3 sm:p-4">
          {/* Prompt Input - Full Width Row */}
          <div className="mb-3 sm:mb-4">
            <Input
              placeholder="A majestic dragon flying over a neon-lit cyberpunk city at sunset, 4K cinematic..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-12 sm:h-14 bg-secondary/20 border border-border/30 rounded-xl text-base sm:text-lg placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/50 px-3 sm:px-4"
            />
          </div>

          {/* Style Presets Row */}
          <div className="mb-3">
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-1">
                {stylePresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyStylePreset(preset)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm",
                      selectedStyle?.id === preset.id
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/40 bg-secondary/40 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <preset.Icon className="h-4 w-4" />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Controls Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Reference Image Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 sm:h-10 sm:w-10 rounded-xl border border-border/30 bg-secondary/30",
                    referenceImages.length > 0 && "border-primary/50 bg-primary/10"
                  )}
                >
                  {referenceImages.length > 0 ? (
                    <span className="text-xs font-medium">+{referenceImages.length}</span>
                  ) : (
                    <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-xl font-semibold">Reference Images</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Add up to 3 reference images for style transfer and consistency.
                </p>
                
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[0, 1, 2].map((index) => {
                    const imageUrl = referenceImages[index];
                    const isUploadingThis = isUploading && uploadingIndex === index;
                    
                    return (
                      <div key={index} className="space-y-2">
                        {imageUrl ? (
                          <div className="relative rounded-xl overflow-hidden border border-border/50 aspect-square group bg-secondary/50">
                            <img src={imageUrl} alt={`Reference ${index + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  const newImages = [...referenceImages];
                                  newImages.splice(index, 1);
                                  setReferenceImages(newImages);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            {index === 0 && (
                              <Badge className="absolute top-2 left-2 text-[10px] px-2" variant="secondary">PRIMARY</Badge>
                            )}
                          </div>
                        ) : (
                          <label className={cn(
                            "flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-xl cursor-pointer transition-all",
                            index <= referenceImages.length
                              ? "border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60"
                              : "border-border/30 bg-secondary/50 opacity-50 cursor-not-allowed"
                          )}>
                            <div className="flex flex-col items-center justify-center">
                              {isUploadingThis ? (
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                              ) : (
                                <>
                                  <Upload className="h-6 w-6 text-primary/70 mb-1" />
                                  <p className="text-xs text-primary/70 font-medium">
                                    {index === 0 ? "Add" : `+${index + 1}`}
                                  </p>
                                </>
                              )}
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={(e) => onImageUpload(e, index)} 
                              disabled={isUploading || !user || index > referenceImages.length}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>

            {/* Aspect Ratio */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 sm:h-10 gap-1 sm:gap-1.5 border border-border/30 rounded-xl bg-secondary/30 px-2 sm:px-3"
                >
                  <span className="text-muted-foreground text-sm">⬜</span>
                  <span className="text-xs sm:text-sm">{aspectRatio}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2 bg-popover border border-border z-50" align="center" side="top">
                <div className="space-y-1">
                  {aspectRatios.map((ratio) => (
                    <Button
                      key={ratio}
                      variant={aspectRatio === ratio ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setAspectRatio(ratio)}
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
                  variant="ghost"
                  className="h-8 sm:h-10 gap-1 sm:gap-1.5 border border-border/30 rounded-xl bg-secondary/30 px-2 sm:px-3"
                >
                  <Film className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <span className="text-xs sm:text-sm">{quality}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2 bg-popover border border-border z-50" align="center" side="top">
                <div className="space-y-1">
                  {(MODEL_QUALITY_OPTIONS[model] ?? DEFAULT_QUALITY_OPTIONS).map((q) => (
                    <Button
                      key={q}
                      variant={quality === q ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => setQuality(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Model Selector - Opens Modal */}
            <Button
              variant="ghost"
              onClick={() => setModelModalOpen(true)}
              className="h-8 sm:h-10 gap-1.5 sm:gap-2 border border-border/30 rounded-xl bg-secondary/30 px-2 sm:px-3"
            >
              {modelInfo.tier === "economy" ? (
                <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
              ) : (
                <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              )}
              <span className="text-xs sm:text-sm">{modelInfo.name}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>

            {/* Model Selector Modal */}
            <ModelSelectorModal
              open={modelModalOpen}
              onOpenChange={setModelModalOpen}
              models={imageModels}
              selectedModel={model}
              onSelectModel={(id) => {
                setModel(id);
                trackModelUsage(id, "image");
              }}
              type="image"
              recentModelIds={recentImageModels}
            />

            <div className="flex-1" />

            {/* Generate Button */}
            <Button
              onClick={handleGenerateClick}
              disabled={isGenerating || !prompt.trim() || !user}
              className="h-8 sm:h-10 px-4 sm:px-6 rounded-xl gap-2 gradient-primary text-primary-foreground font-medium"
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
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-5 bg-background/20 text-primary-foreground">
                    {currentCost}
                  </Badge>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedGeneration && (
        <div 
          className="fixed inset-0 z-50 flex bg-black/80"
          onClick={() => setSelectedGeneration(null)}
        >
          {/* Image Section */}
          <div 
            className="flex-1 flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedGeneration.output_url || ""}
              alt="Generated image"
              className="max-h-full max-w-full rounded-lg shadow-2xl object-contain"
            />
          </div>
          
          {/* Right Side Info Panel */}
          <div 
            className="hidden md:flex w-80 flex-col bg-card/95 backdrop-blur-xl border-l border-border/30 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-secondary/50 hover:bg-secondary"
              onClick={() => setSelectedGeneration(null)}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex-1 space-y-6 pt-8">
              {/* Model Info */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Model</p>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedGeneration.model || "Unknown"}</span>
                </div>
              </div>

              {/* Prompt */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Prompt</p>
                <p className="text-sm leading-relaxed">{selectedGeneration.prompt}</p>
              </div>

              {/* Date */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Created</p>
                <p className="text-sm">{new Date(selectedGeneration.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-6 border-t border-border/30">
              {/* Recreate */}
              <Button 
                variant="outline" 
                className="w-full h-11 gap-2 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => {
                  if (selectedGeneration.output_url) {
                    setPrompt(selectedGeneration.prompt);
                    setSelectedGeneration(null);
                  }
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Recreate
              </Button>
              
              {/* Download & Share */}
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  className="flex-1 h-11 gap-2 rounded-full"
                  onClick={() => {
                    if (selectedGeneration.output_url) {
                      const link = document.createElement("a");
                      link.href = selectedGeneration.output_url;
                      link.download = "generated-image.png";
                      link.target = "_blank";
                      link.click();
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1 h-11 gap-2 rounded-full"
                  onClick={async () => {
                    if (selectedGeneration.output_url) {
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: 'Generated Image',
                            text: selectedGeneration.prompt,
                            url: selectedGeneration.output_url,
                          });
                        } catch {
                          navigator.clipboard.writeText(selectedGeneration.output_url);
                        }
                      } else {
                        navigator.clipboard.writeText(selectedGeneration.output_url);
                      }
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        open={showAddCreditsDialog}
        onOpenChange={setShowAddCreditsDialog}
        currentCredits={credits ?? 0}
        requiredCredits={currentCost}
      />
    </div>
  );
};

export default ImageStudio;
