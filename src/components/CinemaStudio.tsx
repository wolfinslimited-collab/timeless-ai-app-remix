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

// Cinema Models
const cinemaModels = [
  { id: "wan-2.6-cinema", name: "Wan Cinema", credits: 20 },
  { id: "kling-2.6-cinema", name: "Kling Cinema Pro", credits: 30 },
  { id: "veo-3-cinema", name: "Veo 3 Cinema", credits: 35 },
  { id: "luma-cinema", name: "Luma Cinema", credits: 28 },
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
}: CinemaStudioProps) => {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [variationCount, setVariationCount] = useState(1);
  const [movementsOpen, setMovementsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraSettingsOpen, setCameraSettingsOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [previousGenerations, setPreviousGenerations] = useState<Array<{
    id: string;
    output_url: string | null;
    thumbnail_url: string | null;
    prompt: string;
    created_at: string;
  }>>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  
  // Image/Video mode toggle
  const [cinemaMode, setCinemaMode] = useState<"video" | "image">("video");
  
  // Camera settings for image mode
  const [cameraSettingsTab, setCameraSettingsTab] = useState<"all" | "recommended" | "saved">("all");
  const [selectedCamera, setSelectedCamera] = useState(cameraPresets[0]);
  const [selectedLens, setSelectedLens] = useState(lensPresets[0]);
  const [selectedFocalLength, setSelectedFocalLength] = useState("35");
  const [selectedAperture, setSelectedAperture] = useState("f/4");
  const [selectedStyle, setSelectedStyle] = useState<StylePreset | null>(null);

  // Apply style preset
  const applyStylePreset = (preset: StylePreset) => {
    setSelectedStyle(preset);
    setSelectedCamera(cameraPresets.find(c => c.id === preset.cameraId) || cameraPresets[0]);
    setSelectedLens(lensPresets.find(l => l.id === preset.lensId) || lensPresets[0]);
    setSelectedFocalLength(preset.focalLength);
    setSelectedAperture(preset.aperture);
  };

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
          .select("id, output_url, thumbnail_url, prompt, created_at")
          .eq("user_id", user.id)
          .eq("type", "cinema")
          .eq("status", "completed")
          .not("output_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(12);

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
  const displayVideo = selectedVideo || result?.output_url;

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
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Gallery Grid */}
      {user && previousGenerations.length > 0 && (
        <div className="px-4 pt-4">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-3">
              {previousGenerations.map((gen) => (
                <button
                  key={gen.id}
                  onClick={() => setSelectedVideo(gen.output_url)}
                  className={cn(
                    "relative flex-shrink-0 w-40 h-24 rounded-lg overflow-hidden border-2 transition-all group",
                    displayVideo === gen.output_url
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border/30 hover:border-border/60"
                  )}
                >
                  {/* Thumbnail or placeholder */}
                  {gen.thumbnail_url ? (
                    <img
                      src={gen.thumbnail_url}
                      alt={gen.prompt}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary/80 flex items-center justify-center">
                      <Video className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  
                  {/* Play button overlay */}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-5 w-5 text-black ml-0.5" fill="black" />
                    </div>
                  </div>
                  
                  {/* Selected indicator */}
                  {displayVideo === gen.output_url && (
                    <div className="absolute top-1 right-1">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Main Preview Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl aspect-video rounded-2xl bg-secondary/50 border border-border/30 flex items-center justify-center overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                <Sparkles className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm">Creating cinematic video...</p>
            </div>
          ) : displayVideo ? (
            <video
              src={displayVideo}
              controls
              autoPlay
              loop
              className="w-full h-full object-contain"
            />
          ) : generationError ? (
            <div className="flex flex-col items-center gap-4 text-muted-foreground px-6 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Generation Failed</p>
                <p className="text-xs text-muted-foreground max-w-xs">{generationError}</p>
              </div>
              <Button
                onClick={onGenerate}
                disabled={!prompt.trim() || !hasEnoughCredits}
                className="gap-2"
                variant="outline"
              >
                <RotateCcw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Video className="h-16 w-16 opacity-50" />
              <p className="text-sm">Your cinematic video will appear here</p>
              <p className="text-xs opacity-70">Enter a prompt below to start creating</p>
            </div>
          )}
        </div>
      </div>

      {/* Download button when result is ready */}
      {displayVideo && !isGenerating && (
        <div className="flex justify-center pb-4">
          <Button
            variant="outline"
            className="gap-2 border-border/50"
            onClick={() => {
              const link = document.createElement("a");
              link.href = displayVideo;
              link.download = "cinema-generation.mp4";
              link.target = "_blank";
              link.click();
            }}
          >
            <Download className="h-4 w-4" />
            Download Video
          </Button>
        </div>
      )}

      {/* Floating Bottom Toolbar - Redesigned */}
      <div className="sticky bottom-4 mx-auto w-full max-w-5xl px-4 pb-4">
        <div className="rounded-2xl border border-border/30 bg-card/95 backdrop-blur-xl shadow-2xl p-2.5">
          {/* Single Row Layout */}
          <div className="flex items-center gap-2">
            {/* Image/Video Toggle */}
            <div className="flex flex-col items-center border border-border/30 rounded-xl p-1.5 bg-secondary/30 gap-1">
              <button
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all",
                  cinemaMode === "image" 
                    ? "bg-foreground/10 text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setCinemaMode("image")}
              >
                <Image className="h-4 w-4" />
                <span className="text-[10px]">Image</span>
              </button>
              <button
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all",
                  cinemaMode === "video" 
                    ? "bg-foreground/10 text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setCinemaMode("video")}
              >
                <Video className="h-4 w-4" />
                <span className="text-[10px]">Video</span>
              </button>
            </div>

            {/* Reference Frames Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-11 w-11 rounded-xl border border-border/30 bg-secondary/30",
                    referenceImages.length > 0 && "border-primary/50 bg-primary/10"
                  )}
                >
                  {referenceImages.length > 0 ? (
                    <span className="text-xs font-medium">+{referenceImages.length}</span>
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Reference Frames</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Add up to {MAX_REFERENCE_IMAGES} reference images to guide lighting, style, and character consistency.
                </p>
                <div className="grid grid-cols-2 gap-3 py-4">
                  {referenceImages.map((img, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden border border-border/50 aspect-video">
                      <img src={img} alt={`Reference ${index + 1}`} className="w-full h-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => setReferenceImages(referenceImages.filter((_, i) => i !== index))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <Badge className="absolute bottom-2 left-2 text-[10px]" variant="secondary">{index + 1}</Badge>
                    </div>
                  ))}
                  {referenceImages.length < MAX_REFERENCE_IMAGES && (
                    <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-primary/30 rounded-lg cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors">
                      <div className="flex flex-col items-center justify-center">
                        {isUploading && uploadingIndex === referenceImages.length ? (
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-primary mb-1" />
                            <p className="text-xs text-primary font-medium">Add Frame</p>
                          </>
                        )}
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => onImageUpload(e, referenceImages.length)} disabled={isUploading || !user} />
                    </label>
                  )}
                </div>
                {referenceImages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center pb-2">No frames added yet.</p>
                )}
              </DialogContent>
            </Dialog>

            {/* Prompt Input */}
            <Input
              placeholder={cinemaMode === "image" ? "A man in the mars, storm with a whale on the sky, detailed, cinematic" : "Describe your cinematic scene..."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 h-12 bg-transparent border-0 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0"
            />

            {/* Variations Counter */}
            <div className="flex items-center gap-1 border border-border/30 rounded-xl bg-secondary/30 px-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-foreground/10"
                onClick={() => setVariationCount(Math.max(1, variationCount - 1))}
                disabled={variationCount <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-sm font-medium w-8 text-center">{variationCount}/4</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-foreground/10"
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
                  className="h-11 gap-1.5 border border-border/30 rounded-xl bg-secondary/30 px-3"
                >
                  <span className="text-muted-foreground">⬜</span>
                  <span className="text-sm">{aspectRatio}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2" align="center" side="top">
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
            <Button
              variant="ghost"
              className="h-11 gap-1.5 border border-border/30 rounded-xl bg-secondary/30 px-3"
            >
              <span className="text-muted-foreground">♡</span>
              <span className="text-sm">2K</span>
            </Button>

            {/* Camera Settings Card */}
            <Popover open={cameraSettingsOpen} onOpenChange={setCameraSettingsOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-3 h-11 px-3 rounded-xl border border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <span className="text-lg">📹</span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-foreground">{selectedCamera.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {selectedLens.name.split(" ")[0]} {selectedLens.name.split(" ")[1]}, {selectedFocalLength}mm, {selectedAperture}
                      </p>
                    </div>
                  </div>
                  {selectedStyle && (
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[560px] p-0" align="end" side="top">
                <div className="bg-card rounded-xl overflow-hidden">
                  {/* Tabs */}
                  <div className="flex items-center gap-2 p-3 border-b border-border/30">
                    {(["all", "recommended", "saved"] as const).map((tab) => (
                      <Button
                        key={tab}
                        variant={cameraSettingsTab === tab ? "secondary" : "ghost"}
                        size="sm"
                        className={cn(
                          "h-8 px-4 rounded-full capitalize",
                          cameraSettingsTab === tab && "bg-foreground text-background"
                        )}
                        onClick={() => setCameraSettingsTab(tab)}
                      >
                        {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </Button>
                    ))}
                  </div>

                  {/* Quick Presets Row */}
                  <div className="p-4 border-b border-border/30">
                    <ScrollArea className="w-full">
                      <div className="flex gap-3 pb-2">
                        {cameraPresets.slice(0, 4).map((cam, idx) => (
                          <button
                            key={cam.id}
                            onClick={() => { setSelectedCamera(cam); setSelectedStyle(null); }}
                            className={cn(
                              "flex-shrink-0 flex items-center gap-3 p-2 rounded-xl border transition-all",
                              selectedCamera.id === cam.id
                                ? "border-primary/50 bg-primary/10"
                                : "border-border/30 bg-secondary/30 hover:bg-secondary/50"
                            )}
                          >
                            <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                              <span className="text-xl">📹</span>
                            </div>
                            <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center">
                              <span className="text-xl">🔭</span>
                            </div>
                            <span className="text-2xl font-light text-muted-foreground">{focalLengths[idx + 1] || "24"}</span>
                            <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center">
                              <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                            </div>
                          </button>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>

                  {/* Camera Settings Grid */}
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      {/* Camera */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide text-center block">Camera</Label>
                        <div className="bg-secondary/30 rounded-xl p-4 border border-border/30 flex flex-col items-center">
                          <div className="h-14 w-14 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
                            <span className="text-3xl">📹</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] mb-2">{selectedCamera.type}</Badge>
                          <p className="text-xs font-medium text-center">{selectedCamera.name}</p>
                        </div>
                        <Select value={selectedCamera.id} onValueChange={(v) => { setSelectedCamera(cameraPresets.find(c => c.id === v) || cameraPresets[0]); setSelectedStyle(null); }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {cameraPresets.map((cam) => (
                              <SelectItem key={cam.id} value={cam.id} className="text-xs">{cam.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Lens */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide text-center block">Lens</Label>
                        <div className="bg-secondary/30 rounded-xl p-4 border border-border/30 flex flex-col items-center">
                          <div className="h-14 w-14 rounded-xl bg-secondary/50 flex items-center justify-center mb-3">
                            <span className="text-3xl">🔭</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] mb-2">{selectedLens.type}</Badge>
                          <p className="text-xs font-medium text-center">{selectedLens.name.split(" ").slice(0, 2).join(" ")}</p>
                        </div>
                        <Select value={selectedLens.id} onValueChange={(v) => { setSelectedLens(lensPresets.find(l => l.id === v) || lensPresets[0]); setSelectedStyle(null); }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {lensPresets.map((lens) => (
                              <SelectItem key={lens.id} value={lens.id} className="text-xs">{lens.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Focal Length */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide text-center block">Focal Length</Label>
                        <div className="bg-secondary/30 rounded-xl p-4 border border-border/30 flex flex-col items-center">
                          <div className="h-14 flex items-center justify-center mb-3">
                            <span className="text-4xl font-bold">{selectedFocalLength}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] mb-2">mm</Badge>
                          <p className="text-xs font-medium text-center invisible">placeholder</p>
                        </div>
                        <Select value={selectedFocalLength} onValueChange={(v) => { setSelectedFocalLength(v); setSelectedStyle(null); }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {focalLengths.map((fl) => (
                              <SelectItem key={fl} value={fl} className="text-xs">{fl}mm</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Aperture */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide text-center block">Aperture</Label>
                        <div className="bg-secondary/30 rounded-xl p-4 border border-border/30 flex flex-col items-center">
                          <div className="h-14 flex items-center justify-center mb-3">
                            <div className="h-12 w-12 rounded-full border-4 border-foreground/50 flex items-center justify-center">
                              <div className="h-5 w-5 rounded-full bg-foreground/20" />
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] mb-2">{selectedAperture}</Badge>
                          <p className="text-xs font-medium text-center invisible">placeholder</p>
                        </div>
                        <Select value={selectedAperture} onValueChange={(v) => { setSelectedAperture(v); setSelectedStyle(null); }}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {apertures.map((ap) => (
                              <SelectItem key={ap} value={ap} className="text-xs">{ap}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Save Setup Button */}
                    <div className="flex justify-center pt-2">
                      <Button variant="outline" size="sm" className="gap-2 rounded-full border-border/50">
                        <Plus className="h-3.5 w-3.5" />
                        Save setup
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Generate Button */}
            <Button
              onClick={onGenerate}
              disabled={isGenerating || !prompt.trim() || (user && !hasEnoughCredits)}
              className="h-11 px-6 rounded-xl bg-[#c8e600] hover:bg-[#b8d600] text-black font-bold gap-2 text-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  GENERATE
                  <Sparkles className="h-4 w-4" />
                  <span className="font-normal">{currentCost}</span>
                </>
              )}
            </Button>
          </div>

          {/* Video Mode Extra Controls */}
          {cinemaMode === "video" && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/20">
              {/* Movements Popover */}
              <Popover open={movementsOpen} onOpenChange={setMovementsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 gap-1.5 rounded-lg text-xs",
                      selectedMovements.length > 0 && "bg-primary/10 text-primary"
                    )}
                  >
                    <Move3d className="h-3.5 w-3.5" />
                    {getMovementLabel()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start" side="top">
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
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    {cinematicDuration}s
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40 p-2" align="start" side="top">
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
                className={cn("h-8 gap-1.5 rounded-lg text-xs", soundEnabled && "bg-primary/10 text-primary")}
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                Sound {soundEnabled ? "On" : "Off"}
              </Button>

              <div className="flex-1" />

              {/* Settings */}
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
                    <Settings className="h-3.5 w-3.5" />
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
                        <SelectContent>
                          {cinemaModels.map((m) => (
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
    </div>
  );
};

export default CinemaStudio;
