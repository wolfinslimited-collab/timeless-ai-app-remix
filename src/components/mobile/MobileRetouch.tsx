import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Upload, Play, Pause, User, Accessibility, SlidersHorizontal, Wand2, X, Zap, Sparkles, Hand, Palette, Move, Settings, Download } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MobileRetouchProps {
  onBack: () => void;
}

const ACTIONS = [
  { id: "face", name: "Face", icon: User },
  { id: "body", name: "Body", icon: Accessibility },
  { id: "adjust", name: "Adjust", icon: SlidersHorizontal },
  { id: "edit_more", name: "Edit More", icon: Wand2 },
];

const FACE_TABS = [
  { id: "looks", name: "Looks", icon: Sparkles },
  { id: "face", name: "Face", icon: User },
  { id: "reshape", name: "Reshape", icon: Move },
  { id: "makeup", name: "Makeup", icon: Palette },
];

const BODY_TABS = [
  { id: "auto", name: "Auto", icon: Wand2 },
  { id: "manual", name: "Manual", icon: Hand },
  { id: "presets", name: "Presets", icon: Settings },
];

const FRAME_COUNT = 10;

const RESOLUTION_OPTIONS = [
  { value: "480p", label: "480p" },
  { value: "720p", label: "720p" },
  { value: "1080p", label: "1080p" },
  { value: "4k", label: "4K" },
];

const FRAMERATE_OPTIONS = [
  { value: 24, label: "24" },
  { value: 25, label: "25" },
  { value: 30, label: "30" },
  { value: 50, label: "50" },
  { value: 60, label: "60" },
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
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState<"face" | "body" | "export" | null>(null);
  
  // Export settings state
  const [exportResolution, setExportResolution] = useState("1080p");
  const [exportFrameRate, setExportFrameRate] = useState(30);
  const [exportQuality, setExportQuality] = useState([75]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractorVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
      // Clean up thumbnails
      thumbnails.forEach(url => URL.revokeObjectURL(url));
    };
  }, [videoUrl, thumbnails]);

  const extractFrames = useCallback(async (videoSrc: string) => {
    setIsExtractingFrames(true);
    const frames: string[] = [];
    
    return new Promise<string[]>((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      extractorVideoRef.current = video;
      canvasRef.current = canvas;
      
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      
      video.onloadedmetadata = async () => {
        const videoDuration = video.duration;
        canvas.width = 80;
        canvas.height = 60;
        
        const captureFrame = (time: number): Promise<string> => {
          return new Promise((res) => {
            video.currentTime = time;
            video.onseeked = () => {
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                res(dataUrl);
              } else {
                res('');
              }
            };
          });
        };
        
        for (let i = 0; i < FRAME_COUNT; i++) {
          const time = (videoDuration / FRAME_COUNT) * i;
          const frame = await captureFrame(time);
          if (frame) frames.push(frame);
        }
        
        setIsExtractingFrames(false);
        resolve(frames);
      };
      
      video.onerror = () => {
        setIsExtractingFrames(false);
        resolve([]);
      };
      
      video.src = videoSrc;
    });
  }, []);

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
    setThumbnails([]);

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
    
    setTimeout(async () => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      setVideoFile(file);
      setVideoUrl(url);
      setIsUploading(false);
      
      // Extract frames for timeline
      const frames = await extractFrames(url);
      setThumbnails(frames);
      
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

  const handleTimelineClick = (index: number) => {
    if (!videoRef.current || !duration) return;
    const time = (duration / FRAME_COUNT) * index;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleClearVideo = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    thumbnails.forEach(url => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setVideoFile(null);
    setVideoUrl(null);
    setThumbnails([]);
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
    
    if (actionId === "face" || actionId === "body") {
      setShowBottomSheet(actionId);
    } else {
      toast({
        title: `${actionId.replace("_", " ")} tools`,
        description: "Coming soon",
      });
    }
  };

  const closeBottomSheet = () => {
    setShowBottomSheet(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getCurrentFrameIndex = () => {
    if (!duration || thumbnails.length === 0) return 0;
    return Math.min(
      Math.floor((currentTime / duration) * thumbnails.length),
      thumbnails.length - 1
    );
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-primary/15 px-2 py-1 rounded-lg">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-primary text-xs font-semibold">10</span>
          </div>
          {videoUrl && (
            <button
              onClick={() => setShowBottomSheet("export")}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">Export</span>
            </button>
          )}
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

      {/* Timeline with Frame Thumbnails */}
      {videoUrl && (
        <div className="px-4 pb-2">
          {/* Thumbnail Strip */}
          <div className="relative mb-2">
            {isExtractingFrames ? (
              <div className="h-14 bg-secondary rounded-lg flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-muted-foreground text-xs">Extracting frames...</span>
                </div>
              </div>
            ) : thumbnails.length > 0 ? (
              <div className="relative h-14 rounded-lg overflow-hidden">
                {/* Frame Thumbnails */}
                <div className="absolute inset-0 flex">
                  {thumbnails.map((thumb, index) => (
                    <button
                      key={index}
                      onClick={() => handleTimelineClick(index)}
                      className={cn(
                        "flex-1 h-full relative transition-all",
                        getCurrentFrameIndex() === index && "ring-2 ring-primary ring-inset z-10"
                      )}
                    >
                      <img
                        src={thumb}
                        alt={`Frame ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Overlay for non-active frames */}
                      <div
                        className={cn(
                          "absolute inset-0 bg-black/30 transition-opacity",
                          getCurrentFrameIndex() === index ? "opacity-0" : "opacity-100"
                        )}
                      />
                    </button>
                  ))}
                </div>
                
                {/* Playhead Indicator */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-lg z-20 pointer-events-none"
                  style={{
                    left: `${(currentTime / (duration || 1)) * 100}%`,
                    boxShadow: '0 0 8px hsl(var(--primary))',
                  }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full" />
                </div>
              </div>
            ) : (
              <div className="h-14 bg-secondary rounded-lg" />
            )}
          </div>

          {/* Slider for fine-grained control */}
          <div className="relative">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-transparent rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg"
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

      {/* Bottom Sheet Overlay */}
      {showBottomSheet && (
        <div 
          className="absolute inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={closeBottomSheet}
        />
      )}

      {/* Face Tools Bottom Sheet */}
      {showBottomSheet === "face" && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl animate-slide-in-right" style={{ animation: 'slideUp 0.3s ease-out' }}>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
          {/* Handle */}
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-foreground text-lg font-bold">Face Tools</h2>
            <button
              onClick={closeBottomSheet}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>
          {/* Tabs */}
          <Tabs defaultValue="looks" className="w-full">
            <TabsList className="mx-4 mb-4 bg-secondary rounded-xl p-1 grid grid-cols-4">
              {FACE_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {FACE_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsContent key={tab.id} value={tab.id} className="px-4 pb-8">
                  <div className="h-48 flex flex-col items-center justify-center">
                    <Icon className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-foreground font-semibold">{tab.name} Tools</p>
                    <p className="text-muted-foreground text-sm">Coming soon</p>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      )}

      {/* Body Tools Bottom Sheet */}
      {showBottomSheet === "body" && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl" style={{ animation: 'slideUp 0.3s ease-out' }}>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
          {/* Handle */}
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-foreground text-lg font-bold">Body Tools</h2>
            <button
              onClick={closeBottomSheet}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>
          {/* Tabs */}
          <Tabs defaultValue="auto" className="w-full">
            <TabsList className="mx-4 mb-4 bg-secondary rounded-xl p-1 grid grid-cols-3">
              {BODY_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-lg text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {BODY_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsContent key={tab.id} value={tab.id} className="px-4 pb-8">
                  <div className="h-48 flex flex-col items-center justify-center">
                    <Icon className="w-12 h-12 text-muted-foreground mb-4" />
                    <p className="text-foreground font-semibold">{tab.name} Mode</p>
                    <p className="text-muted-foreground text-sm">Coming soon</p>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      )}

      {/* Export Settings Bottom Sheet */}
      {showBottomSheet === "export" && (
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl" style={{ animation: 'slideUp 0.3s ease-out' }}>
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
          {/* Handle */}
          <div className="flex justify-center pt-3">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-foreground text-lg font-bold">Export Settings</h2>
            <button
              onClick={closeBottomSheet}
              className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>
          
          {/* Settings Content */}
          <div className="px-4 pb-8 space-y-6">
            {/* Resolution */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-medium">Resolution</span>
                <span className="text-muted-foreground text-sm">
                  {exportResolution === "1080p" ? "Full HD" : exportResolution === "4k" ? "Ultra HD" : "Standard"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {RESOLUTION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setExportResolution(option.value)}
                    className={cn(
                      "py-2.5 rounded-xl text-sm font-medium transition-all",
                      exportResolution === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame Rate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-medium">Frame Rate</span>
                <span className="text-muted-foreground text-sm">
                  {exportFrameRate >= 50 ? "Smoother playback" : "Standard playback"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {FRAMERATE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setExportFrameRate(option.value)}
                    className={cn(
                      "py-2.5 rounded-xl text-sm font-medium transition-all",
                      exportFrameRate === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-medium">Quality</span>
                <span className="text-muted-foreground text-sm">{exportQuality[0]}%</span>
              </div>
              <div className="px-1">
                <Slider
                  value={exportQuality}
                  onValueChange={setExportQuality}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Low</span>
                <span>Medium</span>
                <span>High</span>
              </div>
            </div>

            {/* Estimated File Size */}
            <div className="bg-secondary/50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Estimated file size</span>
              <span className="text-foreground font-medium">
                {Math.round(
                  (exportResolution === "4k" ? 200 : exportResolution === "1080p" ? 80 : exportResolution === "720p" ? 40 : 20) *
                  (exportFrameRate / 30) *
                  (exportQuality[0] / 100)
                )} MB
              </span>
            </div>

            {/* Export Button */}
            <button
              onClick={() => {
                toast({
                  title: "Export started",
                  description: `Exporting at ${exportResolution}, ${exportFrameRate}fps, ${exportQuality[0]}% quality`,
                });
                closeBottomSheet();
              }}
              className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}