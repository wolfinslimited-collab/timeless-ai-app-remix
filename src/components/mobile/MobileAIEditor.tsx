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

      {/* Timeline Section - CapCut Style with Stack layout */}
      {videoUrl && duration > 0 && (
        <div className="h-[220px] shrink-0 bg-background overflow-hidden">
          <div className="h-full flex">
            {/* Fixed Left Panel */}
            <div className="w-[70px] shrink-0 pt-6 pl-2 flex flex-col gap-2">
              {/* Mute clip audio button */}
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border transition-colors",
                  isMuted 
                    ? "bg-primary/15 border-primary/40" 
                    : "bg-white/5 border-white/10"
                )}
              >
                <VolumeX className={cn("w-5 h-5", isMuted ? "text-primary" : "text-white/70")} />
                <span className={cn(
                  "text-[9px] leading-tight text-center",
                  isMuted ? "text-primary" : "text-white/50"
                )}>Mute<br/>audio</span>
              </button>
              
              {/* Cover button */}
              <button className="flex flex-col items-center justify-center gap-1 p-2.5 bg-white/5 rounded-xl border border-white/10">
                <div className="relative">
                  <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
                    <Image className="w-4 h-4 text-white/60" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-background rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-white/60" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M9 1L11 3L4 10L1 11L2 8L9 1Z" />
                    </svg>
                  </div>
                </div>
                <span className="text-[9px] text-white/50">Cover</span>
              </button>
            </div>
            
            {/* Main Timeline Area with Stack for playhead */}
            <div className="flex-1 relative">
              {/* Fixed Centered Playhead (Top Layer) */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white z-20 -translate-x-1/2 shadow-[0_0_12px_rgba(255,255,255,0.5)]">
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
              </div>
              
              {/* Scrollable Timeline Content */}
              <div 
                className="h-full overflow-x-auto scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div 
                  className="flex flex-col gap-2 pt-1"
                  style={{ 
                    paddingLeft: 'calc(50% - 35px)', 
                    paddingRight: 'calc(50% - 35px)',
                    width: 'fit-content',
                    minWidth: '100%'
                  }}
                >
                  {/* Time Ruler */}
                  <div className="h-5 flex items-end relative" style={{ width: `${20 * 60 + 54}px` }}>
                    {Array.from({ length: Math.ceil(duration / 2) + 1 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="absolute flex flex-col items-center"
                        style={{ left: `${(i * 2 / duration) * (20 * 60)}px` }}
                      >
                        <div className="w-px h-2 bg-white/30" />
                        <span className="text-[8px] text-white/40 font-mono mt-0.5">
                          {String(Math.floor((i * 2) / 60)).padStart(2, '0')}:{String((i * 2) % 60).padStart(2, '0')}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Video Track - Dark Red with Progress Bar */}
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      {/* Dark red video container */}
                      <div 
                        className="flex h-[52px] rounded-lg overflow-hidden border-2"
                        style={{ 
                          backgroundColor: '#8B0000',
                          borderColor: '#AA2222'
                        }}
                      >
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-[60px] h-full flex items-center justify-center shrink-0"
                            style={{
                              borderRight: i < 19 ? '1px solid rgba(90, 0, 0, 0.8)' : 'none',
                              background: 'linear-gradient(to bottom, #8B0000, #5A0000)'
                            }}
                          >
                            <Video className="w-3.5 h-3.5 text-white/30" />
                          </div>
                        ))}
                      </div>
                      
                      {/* White progress bar at bottom */}
                      <div 
                        className="absolute bottom-0.5 left-0.5 h-[3px] bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.5)]"
                        style={{ width: `${(currentTime / duration) * 100}%`, maxWidth: 'calc(100% - 4px)' }}
                      />
                    </div>
                    
                    {/* White + Add button */}
                    <button 
                      onClick={handleShowMediaPicker}
                      className="w-11 h-[52px] bg-white rounded-xl flex items-center justify-center hover:bg-white/90 transition-colors shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.25)]"
                    >
                      <Plus className="w-6 h-6 text-black" />
                    </button>
                  </div>
                  
                  {/* Extracted Audio Track (Teal with Waveform) */}
                  <div 
                    className="h-10 rounded-lg overflow-hidden border-[1.5px] relative"
                    style={{ 
                      width: `${20 * 60}px`,
                      backgroundColor: '#008080',
                      borderColor: '#00A0A0'
                    }}
                  >
                    {/* Waveform bars */}
                    <div className="absolute inset-0 flex items-center justify-evenly px-1">
                      {Array.from({ length: 80 }).map((_, i) => {
                        const seed1 = Math.sin(i * 0.7 + 0.5) * 0.5 + 0.5;
                        const seed2 = Math.cos(i * 0.3 + 1.2) * 0.5 + 0.5;
                        const height = 4 + (seed1 * 0.5 + seed2 * 0.5) * 24;
                        return (
                          <div 
                            key={i}
                            className="w-0.5 rounded-full"
                            style={{ 
                              height: `${height}px`,
                              backgroundColor: '#00E5E5'
                            }}
                          />
                        );
                      })}
                    </div>
                    
                    {/* Extracted label */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0, 128, 128, 0.9)' }}>
                      <Music className="w-3 h-3 text-white/90" />
                      <span className="text-[10px] font-semibold text-white/90">Extracted</span>
                    </div>
                  </div>
                  
                  {/* Add Text Button - Gray container */}
                  <button 
                    onClick={() => toast({ title: "Text", description: "Text editor coming soon!" })}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg w-fit"
                    style={{ backgroundColor: '#2A2A2A', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div className="w-4 h-4 bg-white/15 rounded flex items-center justify-center">
                      <Plus className="w-3 h-3 text-white/70" />
                    </div>
                    <span className="text-xs text-white/70 font-medium">Add text</span>
                  </button>
                </div>
              </div>
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
