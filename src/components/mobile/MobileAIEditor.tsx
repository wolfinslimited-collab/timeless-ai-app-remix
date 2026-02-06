import { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  Video, 
  Upload, 
  Play, 
  Pause, 
  X,
  Scissors,
  Music,
  Type,
  Star,
  PictureInPicture2,
  MessageSquareText,
  Circle,
  SlidersHorizontal,
  Maximize,
  Minimize,
  Undo2,
  Redo2,
  VolumeX,
  Image,
  Plus,
  Clock,
  PlayCircle,
  ChevronDown,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface MobileAIEditorProps {
  onBack: () => void;
}

interface EditorTool {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface RecentVideo {
  url: string;
  name: string;
  uploadedAt: Date;
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

const QUALITY_OPTIONS = ["720p", "1080p", "2K", "4K"];

export function MobileAIEditor({ onBack }: MobileAIEditorProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedTool, setSelectedTool] = useState("edit");
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showQualityPicker, setShowQualityPicker] = useState(false);
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("1080p");
  
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

  const loadRecentVideos = async () => {
    if (!user) return;
    
    setIsLoadingRecent(true);
    try {
      const { data, error } = await supabase.storage
        .from("generation-inputs")
        .list(user.id);

      if (error) throw error;

      const videos = data
        .filter((file) => 
          file.name.endsWith('.mp4') || 
          file.name.endsWith('.mov') || 
          file.name.endsWith('.webm') ||
          file.name.endsWith('.avi'))
        .map((file) => {
          const { data: urlData } = supabase.storage
            .from("generation-inputs")
            .getPublicUrl(`${user.id}/${file.name}`);
          return {
            url: urlData.publicUrl,
            name: file.name,
            uploadedAt: new Date(file.created_at || Date.now()),
          };
        });

      videos.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      setRecentVideos(videos.slice(0, 12));
    } catch (error) {
      console.error("Failed to load recent videos:", error);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleShowMediaPicker = () => {
    loadRecentVideos();
    setShowMediaPicker(true);
  };

  const handleUploadClick = () => {
    setShowMediaPicker(false);
    fileInputRef.current?.click();
  };

  const handleSelectRecentVideo = async (url: string) => {
    setShowMediaPicker(false);
    setIsUploading(true);
    setUploadProgress(50);

    try {
      setVideoUrl(url);
      setUploadProgress(100);
      toast({
        title: "Video loaded",
        description: "Your video is ready for editing",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load video",
      });
    } finally {
      setIsUploading(false);
    }
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

  const handleExport = () => {
    toast({
      title: "Exporting",
      description: `Exporting video in ${selectedQuality}...`,
    });
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const closeFullScreen = () => {
    setIsFullScreen(false);
  };

  const handleAddAudio = () => {
    toast({
      title: "Add Audio",
      description: "Audio picker coming soon!",
    });
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Fullscreen Video Dialog */}
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-none w-screen h-screen p-0 border-0 bg-black [&>button]:hidden">
          <div className="relative w-full h-full flex flex-col">
            {/* Fullscreen Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={closeFullScreen}
                  className="w-11 h-11 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
                <span className="text-white/80 text-base font-medium">Full Screen</span>
                <div className="w-11" />
              </div>
            </div>
            
            {/* Fullscreen Video */}
            <div className="flex-1 flex items-center justify-center">
              {videoUrl && (
                <video
                  src={videoUrl}
                  className="max-w-full max-h-full object-contain"
                  playsInline
                  muted={isMuted}
                  autoPlay
                  controls
                />
              )}
            </div>
            
            {/* Fullscreen Footer */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/60 to-transparent p-4">
              <div className="flex items-center justify-between text-white text-sm font-mono">
                <span>{formatTime(currentTime)}</span>
                <button
                  onClick={closeFullScreen}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full"
                >
                  <Minimize className="w-4 h-4" />
                  <span className="text-sm">Exit</span>
                </button>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media Picker Sheet */}
      <Sheet open={showMediaPicker} onOpenChange={setShowMediaPicker}>
        <SheetContent side="bottom" className="h-[70vh] bg-[#1a1a1a] border-t border-white/10 rounded-t-3xl p-0">
          <div className="flex flex-col h-full">
            <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mt-3" />
            
            <SheetHeader className="px-5 pt-5 pb-2">
              <SheetTitle className="text-white text-lg font-bold text-center">
                Select Video
              </SheetTitle>
            </SheetHeader>

            <div className="px-5 pt-3">
              <button
                onClick={handleUploadClick}
                className="w-full py-4 bg-gradient-to-r from-primary to-primary/80 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-primary/30"
              >
                <Upload className="w-6 h-6 text-primary-foreground" />
                <span className="text-primary-foreground text-base font-semibold">
                  Upload New Video
                </span>
              </button>
            </div>

            <div className="px-5 pt-6 pb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/60" />
              <span className="text-white/80 text-sm font-medium">Recent Uploads</span>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-safe">
              {isLoadingRecent ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recentVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-3">
                  <Video className="w-12 h-12 text-white/30" />
                  <p className="text-white/50 text-sm">No recent videos</p>
                  <p className="text-white/30 text-xs">Upload a video to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {recentVideos.map((video, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectRecentVideo(video.url)}
                      className="aspect-square bg-white/10 rounded-xl border border-white/10 overflow-hidden relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                        <PlayCircle className="w-8 h-8 text-white/80 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 rounded text-[9px] text-white font-medium">
                        Video
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Quality Picker Sheet */}
      <Sheet open={showQualityPicker} onOpenChange={setShowQualityPicker}>
        <SheetContent side="bottom" className="bg-[#1a1a1a] border-t border-white/10 rounded-t-3xl p-0">
          <div className="flex flex-col">
            <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mt-3" />
            
            <SheetHeader className="px-5 pt-5 pb-4">
              <SheetTitle className="text-white text-base font-bold text-center">
                Export Quality
              </SheetTitle>
            </SheetHeader>

            <div className="px-2 pb-6">
              {QUALITY_OPTIONS.map((quality) => (
                <button
                  key={quality}
                  onClick={() => {
                    setSelectedQuality(quality);
                    setShowQualityPicker(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    selectedQuality === quality ? "border-primary" : "border-white/30"
                  )}>
                    {selectedQuality === quality && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className={cn(
                    "text-sm",
                    selectedQuality === quality ? "text-white font-medium" : "text-white/70"
                  )}>
                    {quality}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        {videoUrl && (
          <div className="flex items-center gap-3">
            {/* Quality Selector */}
            <button 
              onClick={() => setShowQualityPicker(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 rounded-lg border border-white/20"
            >
              <span className="text-white text-sm font-medium">{selectedQuality}</span>
              <ChevronDown className="w-4 h-4 text-white/70" />
            </button>
            
            {/* Export Button */}
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary/80 rounded-xl shadow-lg shadow-primary/30"
            >
              <Download className="w-4 h-4 text-primary-foreground" />
              <span className="text-primary-foreground text-sm font-semibold">Export</span>
            </button>
          </div>
        )}
      </div>

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
            <p className="mt-4 text-white/60 text-sm">Loading video...</p>
          </div>
        ) : videoUrl ? (
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                playsInline
                muted={isMuted}
              />
              
              <button
                onClick={clearVideo}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <button
              onClick={handleShowMediaPicker}
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

      {/* Video Control Bar - Below video, above timeline */}
      {videoUrl && duration > 0 && (
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
          {/* Time counter */}
          <span className="text-white/60 text-xs font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          
          {/* Control buttons */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => toast({ title: "Undo", description: "Coming soon!" })}
              className="p-2"
            >
              <Undo2 className="w-5 h-5 text-white/70" />
            </button>
            <button 
              onClick={() => toast({ title: "Redo", description: "Coming soon!" })}
              className="p-2"
            >
              <Redo2 className="w-5 h-5 text-white/70" />
            </button>
            <button 
              onClick={togglePlayPause} 
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-2"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>
            <button 
              onClick={toggleFullScreen}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isFullScreen ? "bg-primary/20" : "bg-transparent"
              )}
            >
              <Maximize className={cn(
                "w-5 h-5",
                isFullScreen ? "text-primary" : "text-white/70"
              )} />
            </button>
          </div>
        </div>
      )}

      {/* Timeline Section - Fixed height, only horizontal scroll for frames */}
      {videoUrl && duration > 0 && (
        <div className="h-[150px] shrink-0 bg-background py-3">
          {/* Current position display */}
          <div className="flex justify-center items-center gap-1 mb-3">
            <span className="text-white font-semibold text-sm font-mono">
              {formatTime(currentTime)}
            </span>
            <span className="text-white/50 text-sm font-mono">
              / {formatTime(duration)}
            </span>
          </div>
          
          {/* Timeline tracks */}
          <div className="flex gap-2">
            {/* Left controls */}
            <div className="flex flex-col gap-2 w-14 shrink-0 pl-3">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="flex flex-col items-center justify-center gap-1 p-2 bg-white/5 rounded-lg"
              >
                <VolumeX className={cn("w-4 h-4", isMuted ? "text-primary" : "text-white/60")} />
                <span className="text-[8px] text-white/60 leading-tight text-center">Mute<br/>audio</span>
              </button>
              <button className="flex flex-col items-center justify-center gap-1 p-2 bg-white/5 rounded-lg">
                <Image className="w-4 h-4 text-white/60" />
                <span className="text-[9px] text-white/60">Cover</span>
              </button>
            </div>
            
            {/* Scrollable timeline area with fixed playhead */}
            <div className="flex-1 flex flex-col gap-2 relative">
              {/* Scrollable video track */}
              <div className="relative h-12">
                {/* Fixed centered playhead */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white z-20 -translate-x-1/2 shadow-[0_0_12px_rgba(255,255,255,0.6)]">
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                </div>
                
                {/* Scrollable thumbnail strip */}
                <div 
                  className="overflow-x-auto h-full scrollbar-hide"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <div className="flex items-center h-full" style={{ paddingLeft: 'calc(50% - 8px)', paddingRight: 'calc(50% - 8px)' }}>
                    {/* Video thumbnails */}
                    <div className="flex h-12 rounded-lg overflow-hidden border-2 border-primary/50">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-[60px] h-full border-r border-border/40 last:border-r-0 bg-gradient-to-b from-primary/20 to-primary/10 flex items-center justify-center shrink-0"
                        >
                          <Video className="w-3 h-3 text-white/30" />
                        </div>
                      ))}
                    </div>
                    
                    {/* Add clip button */}
                    <button 
                      onClick={handleShowMediaPicker}
                      className="w-10 h-12 bg-white/10 rounded-lg flex flex-col items-center justify-center hover:bg-white/20 transition-colors border border-white/20 ml-2 shrink-0"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span className="text-[8px] text-white/70 font-medium">Add</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Audio track */}
              <button 
                onClick={handleAddAudio}
                className="h-10 bg-white/[0.03] rounded-xl flex items-center justify-center gap-2.5 hover:bg-white/10 transition-colors border-[1.5px] border-white/15 mr-3"
              >
                <div className="w-6 h-6 bg-white/10 rounded-md flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/50 text-[13px]">Add music or audio</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Toolbar - Fixed, not scrollable vertically */}
      {videoUrl && duration > 0 && (
        <div className="shrink-0 bg-background border-t border-border/10 pb-safe">
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
