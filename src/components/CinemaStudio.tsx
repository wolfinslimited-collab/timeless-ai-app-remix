import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface CinemaStudioProps {
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

const CinemaStudio = ({
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
          ) : result?.output_url ? (
            <video
              src={result.output_url}
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
      {result?.output_url && !isGenerating && (
        <div className="flex justify-center pb-4">
          <Button
            variant="outline"
            className="gap-2 border-border/50"
            onClick={() => {
              const link = document.createElement("a");
              link.href = result.output_url!;
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

      {/* Floating Bottom Toolbar */}
      <div className="sticky bottom-4 mx-auto w-full max-w-4xl px-4 pb-4">
        <div className="rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl p-3">
          {/* Prompt Row */}
          <div className="flex items-center gap-2 mb-3">
            {/* Image/Video Toggle */}
            <div className="flex items-center border border-border/50 rounded-lg p-1 bg-secondary/50">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-50"
                      disabled
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Image mode (coming soon)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 px-3 bg-primary/20 text-primary"
              >
                <Video className="h-4 w-4 mr-1.5" />
                Video
              </Button>
            </div>

            {/* Prompt Input */}
            <Input
              placeholder="Describe your cinematic scene..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 h-10 bg-secondary/50 border-border/30 text-sm"
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Movements Popover */}
            <Popover open={movementsOpen} onOpenChange={setMovementsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5 border-border/50 bg-secondary/50 hover:bg-secondary",
                    selectedMovements.length > 0 && "border-primary/50 bg-primary/10"
                  )}
                >
                  <Move3d className="h-3.5 w-3.5" />
                  {getMovementLabel()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Camera Movements</Label>
                    <Badge variant="outline" className="text-xs">
                      {selectedMovements.length}/3
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {allMovements.map((movement) => (
                      <Button
                        key={movement.id}
                        variant={selectedMovements.includes(movement.id) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleMovement(movement.id)}
                        disabled={
                          !selectedMovements.includes(movement.id) &&
                          selectedMovements.length >= 3
                        }
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

            {/* Aspect Ratio */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-border/50 bg-secondary/50 hover:bg-secondary"
                >
                  <span className="text-xs">⬜</span>
                  {aspectRatio}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
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

            {/* Duration */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-border/50 bg-secondary/50 hover:bg-secondary"
                >
                  <Clock className="h-3.5 w-3.5" />
                  {cinematicDuration}s
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
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
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 border-border/50 bg-secondary/50 hover:bg-secondary",
                soundEnabled && "border-primary/50 bg-primary/10"
              )}
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  On
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5" />
                  Off
                </>
              )}
            </Button>

            {/* Variations Counter */}
            <div className="flex items-center border border-border/50 rounded-lg bg-secondary/50">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setVariationCount(Math.max(1, variationCount - 1))}
                disabled={variationCount <= 1}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs w-8 text-center">{variationCount}/4</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setVariationCount(Math.min(4, variationCount + 1))}
                disabled={variationCount >= 4}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Settings */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-border/50 bg-secondary/50 hover:bg-secondary"
                >
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

            {/* End Frame Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5 border-border/50 bg-secondary/50 hover:bg-secondary",
                    startingImage && "border-primary/50 bg-primary/10"
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {startingImage ? "Frame Set" : "End Frame"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Starting Frame</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {startingImage ? (
                    <div className="relative rounded-lg overflow-hidden border border-border/50">
                      <img
                        src={startingImage}
                        alt="Starting frame"
                        className="w-full h-48 object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => setStartingImage(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-primary/30 rounded-lg cursor-pointer bg-primary/5 hover:bg-primary/10 transition-colors">
                      <div className="flex flex-col items-center justify-center">
                        {isUploading ? (
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-primary mb-2" />
                            <p className="text-sm text-primary font-medium">
                              Upload starting frame
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Lock in lighting and character consistency
                            </p>
                          </>
                        )}
                      </div>
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
              </DialogContent>
            </Dialog>

            {/* Generate Button */}
            <Button
              onClick={onGenerate}
              disabled={isGenerating || !prompt.trim() || (user && !hasEnoughCredits)}
              className="h-10 px-6 bg-[#c8e600] hover:bg-[#b8d600] text-black font-semibold gap-2"
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
                  <span className="opacity-70">{currentCost}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CinemaStudio;
