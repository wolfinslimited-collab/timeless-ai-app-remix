import { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  Video, 
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
  Music,
  Type,
  Star,
  PictureInPicture2,
  MessageSquareText,
  Circle,
  SlidersHorizontal,
  Maximize,
  RectangleHorizontal,
  Undo2,
  Redo2,
  VolumeX,
  Image,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface MobileAIEditorProps {
  onBack: () => void;
}

interface EditorTool {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const EDITOR_TOOLS: EditorTool[] = [
  { id: "edit", name: "Edit", icon: Scissors },
  { id: "audio", name: "Audio", icon: Music },
  { id: "text", name: "Text", icon: Type },
  { id: "effects", name: "Effects", icon: Star },
  { id: "overlay", name: "Overlay", icon: PictureInPicture2 },
  { id: "captions", name: "Captions", icon: MessageSquareText },
  { id: "filters", name: "Filters", icon: Circle },
  { id: "adjust", name: "Adjust", icon: SlidersHorizontal },
];

export function MobileAIEditor({ onBack }: MobileAIEditorProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedTool, setSelectedTool] = useState("edit");
  const [isMuted, setIsMuted] = useState(false);
  
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

  const clearVideo = () => {
    setVideoUrl(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToolClick = (tool: EditorTool) => {
    setSelectedTool(tool.id);
    toast({
      title: tool.name,
      description: "Coming soon!",
    });
  };

  // Calculate playhead position
  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Top Bar - Only show when video is loaded */}
      {videoUrl && (
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center gap-6">
            <button className="p-2">
              <Maximize className="w-5 h-5 text-white/70" />
            </button>
            <button onClick={togglePlayPause} className="p-2">
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>
            <button className="p-2 flex items-center gap-1">
              <RectangleHorizontal className="w-5 h-5 text-white/70" />
              <span className="text-white/70 text-xs">ON</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2">
              <Undo2 className="w-5 h-5 text-white/70" />
            </button>
            <button className="p-2">
              <Redo2 className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>
      )}

      {/* Back button for upload state */}
      {!videoUrl && (
        <div className="px-4 py-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* Video Preview Area */}
      <div className="flex-1 flex flex-col">
        {isUploading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-white/20"
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
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold">
                {uploadProgress}%
              </span>
            </div>
            <p className="mt-4 text-white/60 text-sm">Uploading video...</p>
          </div>
        ) : videoUrl ? (
          <div className="flex-1 flex flex-col">
            {/* Time Counter */}
            <div className="px-4 py-2">
              <span className="text-white/60 text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            {/* Video Container */}
            <div className="flex-1 flex items-center justify-center px-4 relative">
              <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  playsInline
                  muted={isMuted}
                />
                
                {/* Clear button */}
                <button
                  onClick={clearVideo}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <button
              onClick={handleUploadClick}
              className="w-full max-w-sm aspect-video bg-white/5 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/10 transition-colors"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-white text-lg font-bold mb-2">Upload Video</h2>
              <p className="text-white/50 text-sm mb-4 text-center">
                Tap to select a video
              </p>
              <div className="flex items-center gap-2 px-4 py-2 bg-primary rounded-full">
                <Upload className="w-4 h-4 text-primary-foreground" />
                <span className="text-primary-foreground text-sm font-semibold">Choose Video</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Timeline Section - Only show when video is loaded */}
      {videoUrl && duration > 0 && (
        <div className="px-4 py-3 bg-[#0a0a0a]">
          {/* Time markers */}
          <div className="flex justify-between mb-2 text-[10px] text-white/40 font-mono">
            <span>00:00</span>
            <span>{formatTime(duration / 4)}</span>
            <span>{formatTime(duration / 2)}</span>
            <span>{formatTime((duration * 3) / 4)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          
          {/* Timeline tracks */}
          <div className="flex gap-2 relative">
            {/* Left controls */}
            <div className="flex flex-col gap-2 w-16 shrink-0">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-white/5 rounded-lg"
              >
                <VolumeX className={cn("w-4 h-4", isMuted ? "text-primary" : "text-white/60")} />
                <span className="text-[9px] text-white/60 leading-tight text-center">Mute clip audio</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-1 p-2 bg-white/5 rounded-lg">
                <Image className="w-4 h-4 text-white/60" />
                <span className="text-[9px] text-white/60">Cover</span>
              </button>
            </div>
            
            {/* Tracks area */}
            <div className="flex-1 flex flex-col gap-2 relative">
              {/* Playhead line */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white z-10 shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                style={{ left: `${playheadPosition}%` }}
              />
              
              {/* Video track with thumbnails */}
              <div className="flex items-center gap-1">
                <div className="flex-1 h-12 bg-white/10 rounded-lg overflow-hidden flex relative">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 border-r border-black/30 last:border-r-0 bg-gradient-to-b from-red-900/40 to-red-950/60 flex items-center justify-center"
                    >
                      <Video className="w-3 h-3 text-white/20" />
                    </div>
                  ))}
                </div>
                {/* Add clip button */}
                <button className="w-8 h-12 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                  <Plus className="w-5 h-5 text-white" />
                </button>
              </div>
              
              {/* Audio track */}
              <button className="h-8 bg-white/5 rounded-lg flex items-center justify-center gap-2 hover:bg-white/10 transition-colors border border-dashed border-white/20">
                <Plus className="w-4 h-4 text-white/40" />
                <span className="text-white/40 text-xs">Add audio</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Toolbar - Always show when video is loaded */}
      {videoUrl && duration > 0 && (
        <div className="bg-[#0a0a0a] border-t border-white/10 pb-safe">
          <div className="overflow-x-auto">
            <div className="flex px-2 py-3 min-w-max">
              {EDITOR_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isSelected = selectedTool === tool.id;

                return (
                  <button
                    key={tool.id}
                    onClick={() => handleToolClick(tool)}
                    className="flex flex-col items-center justify-center w-16 py-1"
                  >
                    <Icon
                      className={cn(
                        "w-6 h-6 mb-1",
                        isSelected ? "text-white" : "text-white/60"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[11px]",
                        isSelected ? "text-white font-medium" : "text-white/60"
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
    </div>
  );
}
