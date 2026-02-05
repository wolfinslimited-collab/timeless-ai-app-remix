import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Upload, Play, Pause, User, Accessibility, SlidersHorizontal, Wand2, Loader2, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface MobileRetouchProps {
  onBack: () => void;
}

const ACTIONS = [
  { id: "face", name: "Face", icon: User },
  { id: "body", name: "Body", icon: Accessibility },
  { id: "adjust", name: "Adjust", icon: SlidersHorizontal },
  { id: "edit_more", name: "Edit More", icon: Wand2 },
];

export function MobileRetouch({ onBack }: MobileRetouchProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

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

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 150);

    // Create local URL for preview
    const url = URL.createObjectURL(file);
    
    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setVideoFile(file);
      setVideoUrl(url);
      setIsUploading(false);
      toast({
        title: "Video loaded",
        description: "Your video is ready for retouching",
      });
    }, 1500);
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleClearVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoFile(null);
    setVideoUrl(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setSelectedAction(null);
  };

  const handleActionClick = (actionId: string) => {
    if (!videoUrl) {
      toast({
        variant: "destructive",
        title: "No video",
        description: "Please upload a video first",
      });
      return;
    }
    
    setSelectedAction(actionId);
    toast({
      title: `${actionId.replace("_", " ")} tools`,
      description: "Coming soon",
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
          <h1 className="text-foreground text-base font-semibold">Retouch</h1>
          <p className="text-muted-foreground text-xs">AI video retouching</p>
        </div>
        <div className="flex items-center gap-1 bg-primary/15 px-2 py-1 rounded-lg">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-primary text-xs font-semibold">10</span>
        </div>
      </div>

      {/* Video Preview Area */}
      <div className="flex-1 p-4">
        {isUploading ? (
          <div className="h-full bg-secondary rounded-2xl border border-border flex flex-col items-center justify-center">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90">
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
                  className="text-primary transition-all duration-200"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-foreground font-bold text-sm">
                {uploadProgress}%
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-4">Uploading video...</p>
          </div>
        ) : videoUrl ? (
          <div className="h-full bg-secondary rounded-2xl border border-border overflow-hidden relative">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              playsInline
            />
            {/* Play/Pause Overlay */}
            <button
              onClick={handlePlayPause}
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
            {/* Clear Button */}
            <button
              onClick={handleClearVideo}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-full w-full bg-secondary rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center hover:border-primary/50 transition-colors"
          >
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6">
              <Upload className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-foreground text-xl font-bold mb-2">Upload Video</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Tap to select a video from your device
            </p>
            <div className="bg-primary text-primary-foreground px-5 py-3 rounded-full flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span className="text-sm font-semibold">Choose Video</span>
            </div>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Timeline Scrubber */}
      {videoUrl && (
        <div className="px-4 pb-2">
          <div className="relative">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / (duration || 1)) * 100}%, hsl(var(--border)) ${(currentTime / (duration || 1)) * 100}%)`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-muted-foreground text-xs">
              {formatTime(currentTime)}
            </span>
            <span className="text-muted-foreground text-xs">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex justify-evenly">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            const isSelected = selectedAction === action.id;
            const isEnabled = !!videoUrl;

            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action.id)}
                disabled={!isEnabled}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all",
                  isSelected && "bg-primary/15 ring-1 ring-primary",
                  !isEnabled && "opacity-50"
                )}
              >
                <Icon
                  className={cn(
                    "w-6 h-6",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-xs",
                    isSelected ? "text-primary font-semibold" : "text-foreground"
                  )}
                >
                  {action.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
