import { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  Video, 
  Loader2, 
  Upload, 
  Play, 
  Pause, 
  X,
  Zap,
  Wallpaper,
  Subtitles,
  Sparkles,
  CircleOff,
  Scissors,
  Volume2,
  Type,
  Wand2,
  Layers,
  Captions,
  Palette,
  SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";

interface MobileAIEditorProps {
  onBack: () => void;
}

interface AIFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  credits: number;
}

const AI_FEATURES: AIFeature[] = [
  {
    id: "remove-bg",
    name: "AI Remove Background",
    description: "Automatically remove video backgrounds",
    icon: Wallpaper,
    credits: 12,
  },
  {
    id: "auto-subtitles",
    name: "Auto Subtitles",
    description: "Generate and add captions automatically",
    icon: Subtitles,
    credits: 8,
  },
  {
    id: "ai-enhance",
    name: "AI Enhance",
    description: "Upscale and improve video quality",
    icon: Sparkles,
    credits: 10,
  },
  {
    id: "object-removal",
    name: "Object Removal",
    description: "Remove unwanted objects from video",
    icon: CircleOff,
    credits: 15,
  },
];

interface EditorTool {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const EDITOR_TOOLS: EditorTool[] = [
  { id: "edit", name: "Edit", icon: Scissors },
  { id: "audio", name: "Audio", icon: Volume2 },
  { id: "text", name: "Text", icon: Type },
  { id: "effects", name: "Effects", icon: Wand2 },
  { id: "overlay", name: "Overlay", icon: Layers },
  { id: "captions", name: "Captions", icon: Captions },
  { id: "filters", name: "Filters", icon: Palette },
  { id: "adjust", name: "Adjust", icon: SlidersHorizontal },
];

export function MobileAIEditor({ onBack }: MobileAIEditorProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState("edit");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoUrl]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please select a video file",
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please sign in to upload videos",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("generation-inputs")
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("generation-inputs")
        .getPublicUrl(fileName);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setVideoUrl(urlData.publicUrl);
      
      toast({
        title: "Video uploaded",
        description: "Your video is ready for editing",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (values: number[]) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = values[0];
    setCurrentTime(values[0]);
  };

  const clearVideo = () => {
    setVideoUrl(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setSelectedFeature(null);
  };

  const handleFeatureClick = (feature: AIFeature) => {
    if (!videoUrl) {
      toast({
        variant: "destructive",
        title: "No video",
        description: "Please upload a video first",
      });
      return;
    }
    
    setSelectedFeature(feature.id);
    toast({
      title: feature.name,
      description: "Coming soon!",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1">
          <h1 className="text-foreground text-lg font-semibold">AI Editor</h1>
          <p className="text-muted-foreground text-xs">AI-powered video editing</p>
        </div>
        <div className="flex items-center gap-1 bg-primary/15 px-2.5 py-1 rounded-lg">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-primary text-xs font-semibold">12</span>
        </div>
      </div>

      {/* Video Preview Area */}
      <div className="flex-1 p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {isUploading ? (
          <div className="h-full bg-secondary rounded-2xl border border-border flex flex-col items-center justify-center">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-border"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - uploadProgress / 100)}`}
                  className="text-primary transition-all duration-300"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-foreground font-bold">
                {uploadProgress}%
              </span>
            </div>
            <p className="mt-4 text-muted-foreground text-sm">Uploading video...</p>
          </div>
        ) : videoUrl ? (
          <div className="h-full flex flex-col">
            <div className="flex-1 relative bg-secondary rounded-2xl border border-border overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                playsInline
              />
              
              {/* Play/Pause overlay */}
              <button
                onClick={togglePlayPause}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div
                  className={cn(
                    "w-16 h-16 rounded-full bg-black/50 flex items-center justify-center transition-opacity",
                    isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
                  )}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </div>
              </button>

              {/* Clear button */}
              <button
                onClick={clearVideo}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleUploadClick}
            className="h-full w-full bg-secondary rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
              <Video className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-foreground text-xl font-bold mb-2">Upload Video</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Tap to select a video from your gallery
            </p>
            <div className="flex items-center gap-2 px-5 py-3 bg-primary rounded-full">
              <Upload className="w-5 h-5 text-primary-foreground" />
              <span className="text-primary-foreground text-sm font-semibold">Choose Video</span>
            </div>
          </button>
        )}
      </div>

      {/* Timeline (only when video is loaded) */}
      {videoUrl && duration > 0 && (
        <div className="px-4 pb-3">
          <div className="bg-secondary rounded-lg p-3 border border-border">
            {/* Thumbnail strip placeholder */}
            <div className="h-12 mb-3 rounded-lg overflow-hidden flex bg-border/30">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 border-r border-border/20 last:border-r-0 flex items-center justify-center"
                >
                  <Video className="w-3 h-3 text-muted-foreground/30" />
                </div>
              ))}
            </div>
            
            {/* Slider */}
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="mb-2"
            />
            
            {/* Time display */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Editor Tools Menu (only when video is loaded) */}
      {videoUrl && duration > 0 && (
        <div className="px-4 pb-3">
          <div className="bg-secondary rounded-2xl border border-border p-2 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {EDITOR_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isSelected = selectedTool === tool.id;

                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setSelectedTool(tool.id);
                      toast({
                        title: tool.name,
                        description: "Coming soon!",
                      });
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-all",
                      isSelected
                        ? "bg-primary/15"
                        : "hover:bg-secondary/80"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center mb-1",
                        isSelected ? "bg-primary/15" : "bg-transparent"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-5 h-5",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {tool.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AI Features Grid */}
      <div className="px-4 pb-4">
        <h3 className="text-foreground font-bold mb-3">AI Features</h3>
        <div className="grid grid-cols-2 gap-3">
          {AI_FEATURES.map((feature) => {
            const Icon = feature.icon;
            const isSelected = selectedFeature === feature.id;
            const isDisabled = !videoUrl;

            return (
              <button
                key={feature.id}
                onClick={() => handleFeatureClick(feature)}
                disabled={isDisabled}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all",
                  isSelected
                    ? "bg-primary/15 border-primary"
                    : "bg-secondary border-border hover:bg-secondary/80",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center",
                      isSelected ? "bg-primary" : "bg-primary/10"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        isSelected ? "text-primary-foreground" : "text-primary"
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 rounded-md">
                    <Zap className="w-2.5 h-2.5 text-primary" />
                    <span className="text-[10px] font-bold text-primary">{feature.credits}</span>
                  </div>
                </div>
                <h4 className="text-foreground text-xs font-semibold mb-0.5 truncate">
                  {feature.name}
                </h4>
                <p className="text-muted-foreground text-[10px] truncate">
                  {feature.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
