import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Image,
  Video,
  Move3d,
  Clock,
  Volume2,
  VolumeX,
  Settings,
  Plus,
  Minus,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AddCreditsDialog from "@/components/AddCreditsDialog";
import { useCredits } from "@/hooks/useCredits";

// Camera Movement Presets
const allMovements = [
  { id: "static", label: "Static", icon: "📷" },
  { id: "dolly-in", label: "Dolly In", icon: "➡️" },
  { id: "dolly-out", label: "Dolly Out", icon: "⬅️" },
  { id: "pan-left", label: "Pan Left", icon: "↩️" },
  { id: "pan-right", label: "Pan Right", icon: "↪️" },
  { id: "tilt-up", label: "Tilt Up", icon: "⬆️" },
  { id: "tilt-down", label: "Tilt Down", icon: "⬇️" },
  { id: "zoom-in", label: "Zoom In", icon: "🔍" },
  { id: "zoom-out", label: "Zoom Out", icon: "🔎" },
  { id: "crane-up", label: "Crane Up", icon: "🏗️" },
  { id: "crane-down", label: "Crane Down", icon: "⬇️" },
  { id: "tracking-left", label: "Track Left", icon: "⏪" },
  { id: "tracking-right", label: "Track Right", icon: "⏩" },
  { id: "arc-left", label: "Arc Left", icon: "↺" },
  { id: "arc-right", label: "Arc Right", icon: "↻" },
  { id: "360-orbit", label: "360 Orbit", icon: "🔄" },
  { id: "fpv-drone", label: "FPV Drone", icon: "🚁" },
  { id: "handheld", label: "Handheld", icon: "🤚" },
];

const aspectRatios = ["16:9", "9:16", "1:1", "21:9", "4:3"];
const durations = [3, 5, 7, 10];

// Model-specific quality options
const MODEL_QUALITY_OPTIONS: Record<string, string[]> = {
  // Image models
  "nano-banana": ["2K", "4K"],
  "flux-1.1-pro": ["1024", "2K"],
  "gpt-image-1.5": ["1024", "2K"],
  "ideogram-v2": ["1024", "2K"],
  // Video models
  "wan-2.6-cinema": ["720p", "1080p", "2K"],
  "kling-2.6-cinema": ["1080p", "2K", "4K"],
  "veo-3-cinema": ["1080p", "2K", "4K"],
  "luma-cinema": ["720p", "1080p", "2K"],
};

const DEFAULT_QUALITY_OPTIONS = ["720p", "1080p", "2K"];

// Cinema Video Models
const cinemaVideoModels = [
  { id: "wan-2.6-cinema", name: "Wan Cinema", credits: 20 },
  { id: "kling-2.6-cinema", name: "Kling Cinema Pro", credits: 30 },
  { id: "veo-3-cinema", name: "Veo 3 Cinema", credits: 35 },
  { id: "luma-cinema", name: "Luma Cinema", credits: 28 },
];

// Cinema Image Models
const cinemaImageModels = [
  { id: "nano-banana", name: "Nano Banana", credits: 4 },
  { id: "flux-1.1-pro", name: "Flux 1.1 Pro", credits: 5 },
  { id: "gpt-image-1.5", name: "GPT Image 1.5", credits: 10 },
  { id: "ideogram-v2", name: "Ideogram v2", credits: 6 },
];

// Camera Presets for Image Mode
const cameraPresets = [
  { id: "arri-alexa-35", name: "Arri Alexa 35", type: "DIGITAL", icon: "📹" },
  { id: "arri-alexa-mini", name: "Arri Alexa Mini", type: "DIGITAL", icon: "📹" },
  { id: "red-komodo", name: "RED Komodo", type: "DIGITAL", icon: "📹" },
  { id: "sony-venice", name: "Sony Venice", type: "DIGITAL", icon: "📹" },
  { id: "blackmagic-ursa", name: "Blackmagic URSA", type: "DIGITAL", icon: "📹" },
  { id: "canon-c70", name: "Canon C70", type: "DIGITAL", icon: "📹" },
];

const lensPresets = [
  { id: "arri-signature-prime", name: "ARRI Signature Prime", type: "SPHERICAL" },
  { id: "cooke-anamorphic", name: "Cooke Anamorphic", type: "ANAMORPHIC" },
  { id: "zeiss-supreme", name: "Zeiss Supreme", type: "SPHERICAL" },
  { id: "panavision-primo", name: "Panavision Primo", type: "SPHERICAL" },
  { id: "leica-summilux", name: "Leica Summilux-C", type: "SPHERICAL" },
  { id: "atlas-orion", name: "Atlas Orion", type: "ANAMORPHIC" },
];

const focalLengths = ["14", "18", "24", "28", "35", "50", "65", "85", "100", "135"];
const apertures = ["f/1.4", "f/2", "f/2.8", "f/4", "f/5.6", "f/8", "f/11", "f/16"];

// Cinematography Style Presets
interface StylePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  cameraId: string;
  lensId: string;
  focalLength: string;
  aperture: string;
}

const stylePresets: StylePreset[] = [
  {
    id: "cinematic-drama",
    name: "Cinematic Drama",
    description: "Deep bokeh, warm tones, intimate framing",
    icon: "🎬",
    cameraId: "arri-alexa-35",
    lensId: "cooke-anamorphic",
    focalLength: "50",
    aperture: "f/1.4",
  },
  {
    id: "documentary",
    name: "Documentary",
    description: "Sharp focus, natural look, wide depth",
    icon: "📽️",
    cameraId: "sony-venice",
    lensId: "zeiss-supreme",
    focalLength: "24",
    aperture: "f/5.6",
  },
  {
    id: "action",
    name: "Action",
    description: "Dynamic, punchy, fast-paced visuals",
    icon: "💥",
    cameraId: "red-komodo",
    lensId: "arri-signature-prime",
    focalLength: "18",
    aperture: "f/2.8",
  },
  {
    id: "horror",
    name: "Horror",
    description: "Dark, distorted, unsettling atmosphere",
    icon: "👻",
    cameraId: "blackmagic-ursa",
    lensId: "atlas-orion",
    focalLength: "28",
    aperture: "f/2",
  },
  {
    id: "commercial",
    name: "Commercial",
    description: "Clean, bright, product-focused",
    icon: "✨",
    cameraId: "arri-alexa-mini",
    lensId: "leica-summilux",
    focalLength: "85",
    aperture: "f/4",
  },
  {
    id: "vintage",
    name: "Vintage Film",
    description: "Soft, nostalgic, classic Hollywood",
    icon: "🎞️",
    cameraId: "arri-alexa-35",
    lensId: "panavision-primo",
    focalLength: "35",
    aperture: "f/2.8",
  },
  {
    id: "music-video",
    name: "Music Video",
    description: "Stylized, high contrast, artistic",
    icon: "🎵",
    cameraId: "red-komodo",
    lensId: "cooke-anamorphic",
    focalLength: "35",
    aperture: "f/1.4",
  },
  {
    id: "portrait",
    name: "Portrait",
    description: "Flattering, soft background, sharp subject",
    icon: "👤",
    cameraId: "canon-c70",
    lensId: "arri-signature-prime",
    focalLength: "85",
    aperture: "f/1.4",
  },
];

interface CinemaStudioProps {
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
  // Cinema-specific state
  selectedMovements: string[];
  setSelectedMovements: (value: string[]) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  cinematicDuration: number;
  setCinematicDuration: (value: number) => void;
  model: string;
  setModel: (value: string) => void;
  quality: string;
  setQuality: (value: string) => void;
}

const MAX_REFERENCE_IMAGES = 4;

const CinemaStudio = ({
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
  selectedMovements,
  setSelectedMovements,
  aspectRatio,
  setAspectRatio,
  cinematicDuration,
  setCinematicDuration,
  model,
  setModel,
  quality,
  setQuality,
}: CinemaStudioProps) => {
  const { credits } = useCredits();
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [variationCount, setVariationCount] = useState(1);
  const [movementsOpen, setMovementsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraSettingsOpen, setCameraSettingsOpen] = useState(false);
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
  
  // Grid filter state (top tabs)
  const [gridFilter, setGridFilter] = useState<"all" | "image" | "video">("all");
  
  // Image/Video mode toggle (for generation)
  const [cinemaMode, setCinemaMode] = useState<"video" | "image">("video");
  
  // Camera settings for image mode
  const [cameraSettingsTab, setCameraSettingsTab] = useState<"all" | "recommended" | "saved">("all");
  const [selectedCamera, setSelectedCamera] = useState(cameraPresets[0]);
  const [selectedLens, setSelectedLens] = useState(lensPresets[0]);
  const [selectedFocalLength, setSelectedFocalLength] = useState("35");
  const [selectedAperture, setSelectedAperture] = useState("f/4");
  const [selectedStyle, setSelectedStyle] = useState<StylePreset | null>(null);

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
    setSelectedCamera(cameraPresets.find(c => c.id === preset.cameraId) || cameraPresets[0]);
    setSelectedLens(lensPresets.find(l => l.id === preset.lensId) || lensPresets[0]);
    setSelectedFocalLength(preset.focalLength);
    setSelectedAperture(preset.aperture);
  };

  // Switch model when mode changes to ensure correct model type
  useEffect(() => {
    const videoModelIds = cinemaVideoModels.map(m => m.id);
    const imageModelIds = cinemaImageModels.map(m => m.id);
    
    if (cinemaMode === "video" && !videoModelIds.includes(model)) {
      setModel(cinemaVideoModels[0].id);
    } else if (cinemaMode === "image" && !imageModelIds.includes(model)) {
      setModel(cinemaImageModels[0].id);
    }
  }, [cinemaMode, model, setModel]);

  // Auto-update quality when model changes
  useEffect(() => {
    const availableQualities = MODEL_QUALITY_OPTIONS[model] ?? DEFAULT_QUALITY_OPTIONS;
    if (!availableQualities.includes(quality)) {
      setQuality(availableQualities[0]);
    }
  }, [model, quality, setQuality]);

  // Fetch previous cinema generations
  useEffect(() => {
    const fetchGenerations = async () => {
      if (!user) {
        setLoadingGenerations(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("generations")
          .select("id, output_url, thumbnail_url, prompt, created_at, type, model")
          .eq("user_id", user.id)
          .eq("type", "cinema")
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

  // Use selected video or current result
  const displayVideo = selectedGeneration?.output_url || result?.output_url;

  const toggleMovement = (id: string) => {
    if (selectedMovements.includes(id)) {
      setSelectedMovements(selectedMovements.filter((m) => m !== id));
    } else if (selectedMovements.length < 3) {
      setSelectedMovements([...selectedMovements, id]);
    }
  };

  const getMovementLabel = () => {
    if (selectedMovements.length === 0) return "Movements";
    if (selectedMovements.length === 1) {
      return allMovements.find((m) => m.id === selectedMovements[0])?.label || "1 Movement";
    }
    return `${selectedMovements.length} Movements`;
  };

  return (
    <div className="relative h-[calc(100vh-8rem)] overflow-hidden">
      {/* Higgsfield-style Full-Screen Grid Background */}
      <div className="absolute inset-0 overflow-auto pb-32">
        {/* Filter Tabs */}
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border/20">
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              "h-8 rounded-full px-4 text-xs font-medium",
              gridFilter === "image" ? "bg-foreground text-background" : "bg-secondary/60"
            )}
            onClick={() => setGridFilter("image")}
          >
            <Image className="h-3.5 w-3.5 mr-1.5" />
            Image
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className={cn(
              "h-8 rounded-full px-4 text-xs font-medium",
              gridFilter === "video" ? "bg-foreground text-background" : "bg-secondary/60"
            )}
            onClick={() => setGridFilter("video")}
          >
            <Video className="h-3.5 w-3.5 mr-1.5" />
            Video
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 rounded-full px-4 text-xs font-medium",
              gridFilter === "all" && "bg-foreground text-background"
            )}
            onClick={() => setGridFilter("all")}
          >
            All
          </Button>
        </div>

        {/* Media Grid - Always show grid structure */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 p-1">
          {/* Loading state - Skeleton Grid */}
          {loadingGenerations ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-video bg-secondary/50 animate-pulse rounded-sm" />
            ))
          ) : previousGenerations.length > 0 ? (
            previousGenerations
              .filter((gen) => {
                // Helper to check if generation is an image
                const isImage = (gen.model && cinemaImageModels.some(m => m.id === gen.model)) || 
                  (gen.output_url && (
                    gen.output_url.startsWith('data:image/') ||
                    gen.output_url.includes('.png') || 
                    gen.output_url.includes('.jpg') || 
                    gen.output_url.includes('.jpeg') || 
                    gen.output_url.includes('.webp')
                  ));
                
                if (gridFilter === "all") return true;
                if (gridFilter === "image") return isImage;
                if (gridFilter === "video") return !isImage;
                return true;
              })
              .map((gen) => {
              // Determine if this generation is an image based on model or URL (including base64 data URLs)
              const isImageGeneration = (gen.model && cinemaImageModels.some(m => m.id === gen.model)) || 
                (gen.output_url && (
                  gen.output_url.startsWith('data:image/') ||
                  gen.output_url.includes('.png') || 
                  gen.output_url.includes('.jpg') || 
                  gen.output_url.includes('.jpeg') || 
                  gen.output_url.includes('.webp')
                ));
              
              return (
                <button
                  key={gen.id}
                  onClick={() => setSelectedGeneration(gen)}
                  className={cn(
                    "relative aspect-video overflow-hidden group",
                    displayVideo === gen.output_url && "ring-2 ring-primary"
                  )}
                >
                  {/* Media preview - show image or video based on type */}
                  {gen.output_url ? (
                    isImageGeneration ? (
                      <img
                        src={gen.output_url}
                        alt="Generated image"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={gen.output_url}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      />
                    )
                  ) : (
                    <div className="w-full h-full bg-secondary/80 flex items-center justify-center">
                      {cinemaMode === "image" ? (
                        <Image className="h-8 w-8 text-muted-foreground/50" />
                      ) : (
                        <Video className="h-8 w-8 text-muted-foreground/50" />
                      )}
                    </div>
                  )}
                  
                  {/* Play/View button overlay - only show play for videos */}
                  {!isImageGeneration && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="h-6 w-6 text-black ml-0.5" fill="black" />
                      </div>
                    </div>
                  )}
                  
                  {/* Hover actions */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="h-8 w-8 rounded-lg bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (gen.output_url) {
                          const link = document.createElement("a");
                          link.href = gen.output_url;
                          link.download = isImageGeneration ? "cinema-image.png" : "cinema-video.mp4";
                          link.target = "_blank";
                          link.click();
                        }
                      }}
                    >
                      <Download className="h-4 w-4 text-white" />
                    </button>
                  </div>

                  {/* Selected indicator */}
                  {displayVideo === gen.output_url && (
                    <div className="absolute top-2 left-2">
                      <div className="h-3 w-3 rounded-full bg-primary animate-pulse shadow-lg" />
                    </div>
                  )}
                </button>
              );
            })
          ) : (
            /* Empty state - show placeholder skeleton tiles with icon based on mode */
            Array.from({ length: 12 }).map((_, i) => (
              <div 
                key={i} 
                className="relative aspect-video bg-secondary/30 rounded-sm flex items-center justify-center"
              >
                {cinemaMode === "image" ? (
                  <Image className="h-8 w-8 text-muted-foreground/20" />
                ) : (
                  <Video className="h-8 w-8 text-muted-foreground/20" />
                )}
                {cinemaMode === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Play className="h-6 w-6 text-white/50 ml-0.5" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Media Player Overlay - Shows when a media is selected and not in modal */}
      {displayVideo && !isGenerating && !selectedGeneration && (() => {
        // Check if current result is an image based on mode or URL (including base64 data URLs)
        const isImageResult = cinemaMode === "image" || 
          (displayVideo && (
            displayVideo.startsWith('data:image/') ||
            displayVideo.includes('.png') || 
            displayVideo.includes('.jpg') || 
            displayVideo.includes('.jpeg') || 
            displayVideo.includes('.webp')
          ));
        
        return (
          <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-xl flex flex-col">
            {/* Close button */}
            <div className="flex justify-end p-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-secondary/50"
                onClick={() => setSelectedGeneration(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Media Player - Image or Video */}
            <div className="flex-1 flex items-center justify-center px-6 pb-6">
              <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-black">
                {isImageResult ? (
                  <img
                    src={displayVideo}
                    alt="Generated image"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    src={displayVideo}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Download button */}
            <div className="flex justify-center pb-6">
              <Button
                variant="outline"
                className="gap-2 border-border/50 rounded-xl"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = displayVideo;
                  link.download = isImageResult ? "cinema-generation.png" : "cinema-generation.mp4";
                  link.target = "_blank";
                  link.click();
                }}
              >
                <Download className="h-4 w-4" />
                {isImageResult ? "Download Image" : "Download Video"}
              </Button>
            </div>
          </div>
        );
      })()}

      {/* Generating Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              <Sparkles className="h-10 w-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <p className="text-lg font-medium">
              {cinemaMode === "image" ? "Creating cinematic image..." : "Creating cinematic video..."}
            </p>
            <p className="text-sm text-muted-foreground/70">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {generationError && !isGenerating && (
        <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground px-6 text-center">
            <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">Generation Failed</p>
              <p className="text-sm text-muted-foreground max-w-md">{generationError}</p>
            </div>
            <Button
              onClick={handleGenerateClick}
              disabled={!prompt.trim()}
              className="gap-2 mt-2"
              variant="outline"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bottom Toolbar - Redesigned */}
      <div className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 w-full max-w-5xl px-2 sm:px-4 z-30">
        <div className="rounded-2xl border border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl p-3 sm:p-4">
          {/* Prompt Input - Full Width Row */}
          <div className="mb-3 sm:mb-4">
            <Input
              placeholder={cinemaMode === "image" ? "A man in the mars, storm with a whale on the sky, detailed, cinematic" : "Describe your cinematic scene..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-12 sm:h-14 bg-secondary/20 border border-border/30 rounded-xl text-base sm:text-lg placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/50 px-3 sm:px-4"
            />
          </div>

          {/* Controls Row - Responsive */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Left Group: Mode Toggle + Reference */}
            <div className="flex items-center gap-2 order-1">
              {/* Image/Video Toggle */}
              <div className="flex items-center border border-border/30 rounded-xl p-1 bg-secondary/30 gap-0.5">
                <button
                  className={cn(
                    "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all text-xs sm:text-sm",
                    cinemaMode === "image" 
                      ? "bg-foreground/10 text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setCinemaMode("image")}
                >
                  <Image className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Image</span>
                </button>
                <button
                  className={cn(
                    "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all text-xs sm:text-sm",
                    cinemaMode === "video" 
                      ? "bg-foreground/10 text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setCinemaMode("video")}
                >
                  <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Video</span>
                </button>
              </div>

              {/* Reference Frames Button */}
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
                    <DialogTitle className="text-xl font-semibold">Reference Frames</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Add start and end frames to guide video generation with consistent style and motion.
                  </p>
                  
                  {/* Two Column Layout: Start Frame & End Frame */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {/* Start Frame */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <Label className="text-sm font-medium">Start Frame</Label>
                      </div>
                      {referenceImages[0] ? (
                        <div className="relative rounded-xl overflow-hidden border border-border/50 aspect-video group bg-secondary/50">
                          <img src={referenceImages[0]} alt="Start Frame" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const newImages = [...referenceImages];
                                newImages[0] = '';
                                setReferenceImages(newImages.filter(Boolean));
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Badge className="absolute top-2 left-2 text-[10px] px-2" variant="secondary">START</Badge>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-green-500/40 rounded-xl cursor-pointer bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/60 transition-all">
                          <div className="flex flex-col items-center justify-center">
                            {isUploading && uploadingIndex === 0 ? (
                              <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                            ) : (
                              <>
                                <Upload className="h-6 w-6 text-green-500 mb-1" />
                                <p className="text-xs text-green-500 font-medium">Add Start</p>
                              </>
                            )}
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => onImageUpload(e, 0)} disabled={isUploading || !user} />
                        </label>
                      )}
                      <p className="text-[11px] text-muted-foreground text-center">First frame of your video</p>
                    </div>

                    {/* End Frame */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        <Label className="text-sm font-medium">End Frame</Label>
                      </div>
                      {referenceImages[1] ? (
                        <div className="relative rounded-xl overflow-hidden border border-border/50 aspect-video group bg-secondary/50">
                          <img src={referenceImages[1]} alt="End Frame" className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const newImages = [...referenceImages];
                                newImages.splice(1, 1);
                                setReferenceImages(newImages);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Badge className="absolute top-2 left-2 text-[10px] px-2" variant="secondary">END</Badge>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-red-500/40 rounded-xl cursor-pointer bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/60 transition-all">
                          <div className="flex flex-col items-center justify-center">
                            {isUploading && uploadingIndex === 1 ? (
                              <Loader2 className="h-6 w-6 animate-spin text-red-500" />
                            ) : (
                              <>
                                <Upload className="h-6 w-6 text-red-500 mb-1" />
                                <p className="text-xs text-red-500 font-medium">Add End</p>
                              </>
                            )}
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => onImageUpload(e, 1)} disabled={isUploading || !user} />
                        </label>
                      )}
                      <p className="text-[11px] text-muted-foreground text-center">Last frame of your video</p>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-secondary/30 border border-border/30">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      The AI will generate motion between your start and end frames, maintaining style consistency throughout the video.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Center Group: Variations, Aspect Ratio, Quality */}
            <div className="flex items-center gap-1.5 sm:gap-2 order-3 sm:order-2 w-full sm:w-auto justify-center sm:flex-1">
              {/* Variations Counter */}
              <div className="flex items-center gap-0.5 sm:gap-1 border border-border/30 rounded-xl bg-secondary/30 h-8 sm:h-10 px-0.5 sm:px-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-foreground/10"
                  onClick={() => setVariationCount(Math.max(1, variationCount - 1))}
                  disabled={variationCount <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs sm:text-sm font-medium w-6 sm:w-8 text-center">{variationCount}/4</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-foreground/10"
                  onClick={() => setVariationCount(Math.min(4, variationCount + 1))}
                  disabled={variationCount >= 4}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

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
            </div>

            {/* Right Group: Camera Settings + Generate */}
            <div className="flex items-center gap-2 order-2 sm:order-3 ml-auto sm:ml-0">
              {/* Camera Settings Card - Hidden on very small screens */}
              <Popover open={cameraSettingsOpen} onOpenChange={setCameraSettingsOpen}>
                <PopoverTrigger asChild>
                  <button className="hidden sm:flex items-center gap-2 h-10 px-3 rounded-xl border border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all">
                    <div className="h-7 w-7 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <span className="text-sm">📹</span>
                    </div>
                    <div className="text-left hidden md:block">
                      <p className="text-xs font-medium text-foreground leading-tight">{selectedCamera.name}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {selectedLens.name.split(" ")[0]}, {selectedFocalLength}mm, {selectedAperture}
                      </p>
                    </div>
                    {selectedStyle && (
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[640px] p-0 bg-popover border border-border z-50" align="end" side="top">
                  <div className="bg-card rounded-xl overflow-hidden">
                    {/* Tabs */}
                    <div className="flex items-center gap-3 p-4 border-b border-border/30">
                      {(["all", "recommended", "saved"] as const).map((tab) => (
                        <button
                          key={tab}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all",
                            cameraSettingsTab === tab 
                              ? "bg-foreground text-background" 
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          onClick={() => setCameraSettingsTab(tab)}
                        >
                          {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>

                    {/* Quick Presets Row - Horizontal Scroll */}
                    <div className="px-4 pt-4 pb-3 border-b border-border/30">
                      <ScrollArea className="w-full">
                        <div className="flex gap-2 pb-1">
                          {stylePresets.slice(0, 6).map((preset, idx) => {
                            const presetCamera = cameraPresets.find(c => c.id === preset.cameraId);
                            const presetLens = lensPresets.find(l => l.id === preset.lensId);
                            const isSelected = selectedStyle?.id === preset.id;
                            return (
                              <button
                                key={preset.id}
                                onClick={() => applyStylePreset(preset)}
                                className={cn(
                                  "flex-shrink-0 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/10"
                                    : "border-border/40 bg-secondary/40 hover:bg-secondary/60 hover:border-border/60"
                                )}
                              >
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-secondary/60">
                                  <span className="text-lg opacity-70">📹</span>
                                </div>
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-secondary/60">
                                  <span className="text-lg opacity-70">🔭</span>
                                </div>
                                <span className="text-xl font-light text-foreground/80">{preset.focalLength}</span>
                                <div className="h-7 w-7 rounded-full border-2 border-foreground/40 flex items-center justify-center">
                                  <div className="h-2.5 w-2.5 rounded-full bg-foreground/30" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </div>

                    {/* Camera Settings Grid - 4 Columns */}
                    <div className="p-4">
                      <div className="grid grid-cols-4 gap-3">
                        {/* Camera Column */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest text-center font-medium">Camera</p>
                          <div className="bg-secondary/40 rounded-xl p-4 border border-border/40 flex flex-col items-center min-h-[140px]">
                            <div className="h-12 w-12 rounded-xl bg-secondary/60 flex items-center justify-center mb-2">
                              <span className="text-2xl opacity-80">📹</span>
                            </div>
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 mb-1.5 bg-secondary/80">{selectedCamera.type}</Badge>
                            <p className="text-xs font-medium text-center leading-tight">{selectedCamera.name}</p>
                          </div>
                          <Select value={selectedCamera.id} onValueChange={(v) => { setSelectedCamera(cameraPresets.find(c => c.id === v) || cameraPresets[0]); setSelectedStyle(null); }}>
                            <SelectTrigger className="h-10 text-sm bg-secondary/40 border-border/40 rounded-xl">
                              <SelectValue placeholder="Select camera" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border z-50">
                              {cameraPresets.map((cam) => (
                                <SelectItem key={cam.id} value={cam.id} className="text-sm">{cam.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Lens Column */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest text-center font-medium">Lens</p>
                          <div className="bg-secondary/40 rounded-xl p-4 border border-border/40 flex flex-col items-center min-h-[140px]">
                            <div className="h-12 w-12 rounded-xl bg-secondary/60 flex items-center justify-center mb-2">
                              <span className="text-2xl opacity-80">🔭</span>
                            </div>
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 mb-1.5 bg-secondary/80">{selectedLens.type}</Badge>
                            <p className="text-xs font-medium text-center leading-tight">{selectedLens.name.split(" ").slice(0, 2).join("\n")}</p>
                          </div>
                          <Select value={selectedLens.id} onValueChange={(v) => { setSelectedLens(lensPresets.find(l => l.id === v) || lensPresets[0]); setSelectedStyle(null); }}>
                            <SelectTrigger className="h-10 text-sm bg-secondary/40 border-border/40 rounded-xl">
                              <SelectValue placeholder="Select lens" />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border z-50">
                              {lensPresets.map((lens) => (
                                <SelectItem key={lens.id} value={lens.id} className="text-sm">{lens.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Focal Length Column */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest text-center font-medium">Focal Length</p>
                          <div className="bg-secondary/40 rounded-xl p-4 border border-border/40 flex flex-col items-center justify-center min-h-[140px]">
                            <span className="text-5xl font-bold text-foreground">{selectedFocalLength}</span>
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 mt-2 bg-secondary/80">mm</Badge>
                          </div>
                          <Select value={selectedFocalLength} onValueChange={(v) => { setSelectedFocalLength(v); setSelectedStyle(null); }}>
                            <SelectTrigger className="h-10 text-sm bg-secondary/40 border-border/40 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border z-50">
                              {focalLengths.map((fl) => (
                                <SelectItem key={fl} value={fl} className="text-sm">{fl}mm</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Aperture Column */}
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest text-center font-medium">Aperture</p>
                          <div className="bg-secondary/40 rounded-xl p-4 border border-border/40 flex flex-col items-center justify-center min-h-[140px]">
                            <div className="h-14 w-14 rounded-full border-[3px] border-foreground/50 flex items-center justify-center">
                              <div className="h-5 w-5 rounded-full bg-foreground/25" />
                            </div>
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 mt-2 bg-secondary/80">{selectedAperture}</Badge>
                          </div>
                          <Select value={selectedAperture} onValueChange={(v) => { setSelectedAperture(v); setSelectedStyle(null); }}>
                            <SelectTrigger className="h-10 text-sm bg-secondary/40 border-border/40 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border border-border z-50">
                              {apertures.map((ap) => (
                                <SelectItem key={ap} value={ap} className="text-sm">{ap}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Save Setup Button */}
                      <div className="flex justify-center pt-4 mt-2">
                        <Button variant="outline" size="default" className="gap-2 rounded-full border-border/50 px-6">
                          <Plus className="h-4 w-4" />
                          Save setup
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateClick}
                disabled={isGenerating || !prompt.trim()}
                className="h-8 sm:h-10 px-3 sm:px-5 rounded-xl bg-[#c8e600] hover:bg-[#b8d600] text-black font-bold gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    <span className="hidden sm:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">GENERATE</span>
                    <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="font-normal">{currentCost}</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Video Mode Extra Controls */}
          {cinemaMode === "video" && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/20">
              {/* Movements Popover */}
              <Popover open={movementsOpen} onOpenChange={setMovementsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 sm:h-9 gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm border border-border/30 bg-secondary/30",
                      selectedMovements.length > 0 && "border-primary/50 bg-primary/10 text-primary"
                    )}
                  >
                    <Move3d className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden xs:inline">{getMovementLabel()}</span>
                    <span className="xs:hidden">Moves</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 bg-popover border border-border z-50" align="start" side="top">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Camera Movements</Label>
                      <Badge variant="outline" className="text-xs">{selectedMovements.length}/3</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {allMovements.map((movement) => (
                        <Button
                          key={movement.id}
                          variant={selectedMovements.includes(movement.id) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleMovement(movement.id)}
                          disabled={!selectedMovements.includes(movement.id) && selectedMovements.length >= 3}
                          className={cn(
                            "h-auto py-1.5 px-2 text-xs flex-col gap-0.5",
                            selectedMovements.includes(movement.id)
                              ? "bg-primary text-primary-foreground"
                              : "border-border/50"
                          )}
                        >
                          <span>{movement.icon}</span>
                          <span className="text-[10px] leading-tight">{movement.label}</span>
                        </Button>
                      ))}
                    </div>
                    {selectedMovements.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
                        {selectedMovements.map((id, index) => {
                          const movement = allMovements.find((m) => m.id === id);
                          return (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="gap-1 cursor-pointer hover:bg-destructive/20"
                              onClick={() => toggleMovement(id)}
                            >
                              {index + 1}. {movement?.icon} {movement?.label}
                              <X className="h-3 w-3" />
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Duration */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 sm:h-9 gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm border border-border/30 bg-secondary/30">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {cinematicDuration}s
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2 bg-popover border border-border z-50" align="start" side="top">
                  <div className="space-y-1">
                    {durations.map((d) => (
                      <Button
                        key={d}
                        variant={cinematicDuration === d ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setCinematicDuration(d)}
                      >
                        {d} seconds
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Sound Toggle */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 sm:h-9 gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm border border-border/30 bg-secondary/30",
                  soundEnabled && "border-primary/50 bg-primary/10 text-primary"
                )}
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                <span className="hidden xs:inline">Sound {soundEnabled ? "On" : "Off"}</span>
              </Button>

              <div className="flex-1" />

              {/* Settings */}
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-border/30 bg-secondary/30">
                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Cinema Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          {cinemaVideoModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} ({m.credits} credits)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Image Mode Settings - Always show settings for image mode */}
          {cinemaMode === "image" && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/20">
              <div className="flex-1" />
              
              {/* Settings for Image Mode */}
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 gap-2 rounded-xl border border-border/30 bg-secondary/30">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Image Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border border-border z-50">
                          {cinemaImageModels.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} ({m.credits} credits)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* Video Playback Modal - Higgsfield style with side panel */}
      {selectedGeneration && (
        <div 
          className="fixed inset-0 z-50 flex bg-black/80"
          onClick={() => setSelectedGeneration(null)}
        >
          {/* Video Section - Takes most of the space */}
          <div 
            className="flex-1 flex items-center justify-center p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={selectedGeneration.output_url || ""}
              className="max-h-full max-w-full rounded-lg shadow-2xl"
              controls
              autoPlay
              loop
            />
          </div>
          
          {/* Right Side Info Panel */}
          <div 
            className="w-80 bg-background/95 backdrop-blur-xl border-l border-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="flex justify-end p-4">
              <button
                className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
                onClick={() => setSelectedGeneration(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            {/* Information Section */}
            <div className="flex-1 px-5 pb-5 space-y-6">
              <div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Information
                </h3>
                
                <div className="space-y-4">
                  {/* Thumbnail */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Preview</span>
                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-secondary">
                      <video
                        src={selectedGeneration.output_url || ""}
                        className="w-full h-full object-cover"
                        muted
                        preload="metadata"
                      />
                    </div>
                  </div>
                  
                  {/* Model */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Model</span>
                    <span className="text-sm font-medium">
                      {selectedGeneration.model 
                        ? cinemaVideoModels.find(m => m.id === selectedGeneration.model)?.name || selectedGeneration.model
                        : "Unknown"}
                    </span>
                  </div>
                  
                  {/* Preset (extract from prompt if it starts with movement info) */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Preset</span>
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      {(() => {
                        // Try to extract movement from prompt
                        const movementMatch = selectedGeneration.prompt.match(/^Cinematic\s+([a-zA-Z\s]+)\s+shot/i);
                        if (movementMatch) {
                          const movementName = movementMatch[1].trim();
                          const movement = allMovements.find(m => 
                            m.label.toLowerCase() === movementName.toLowerCase() ||
                            m.id.replace(/-/g, ' ').toLowerCase() === movementName.toLowerCase()
                          );
                          return movement ? (
                            <>
                              <span>{movement.icon}</span>
                              {movement.label}
                            </>
                          ) : movementName;
                        }
                        return "Custom";
                      })()}
                    </span>
                  </div>
                  
                  {/* Feature */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Feature</span>
                    <span className="text-sm font-medium">Cinema Studio Video</span>
                  </div>
                  
                  {/* Date */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Created</span>
                    <span className="text-sm font-medium">
                      {new Date(selectedGeneration.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Prompt */}
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Prompt</h4>
                <p className="text-sm text-foreground/80 line-clamp-4">{selectedGeneration.prompt}</p>
              </div>
            </div>
            
            {/* Bottom Action Buttons */}
            <div className="p-5 border-t border-border space-y-3">
              {/* Primary Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1 h-11 gap-2 rounded-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
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
              </div>
              
              {/* Download & Share */}
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  className="flex-1 h-11 gap-2 rounded-full"
                  onClick={() => {
                    if (selectedGeneration.output_url) {
                      const link = document.createElement("a");
                      link.href = selectedGeneration.output_url;
                      link.download = "cinema-video.mp4";
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
                            title: 'Cinema Studio Video',
                            text: selectedGeneration.prompt,
                            url: selectedGeneration.output_url,
                          });
                        } catch (err) {
                          // Fallback to clipboard
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

export default CinemaStudio;
