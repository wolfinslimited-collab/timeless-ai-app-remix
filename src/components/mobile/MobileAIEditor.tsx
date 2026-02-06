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
  Download,
  Sun,
  Contrast,
  Palette,
  Aperture,
  Focus,
  Sunrise,
  Moon,
  Thermometer,
  Droplets
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
  
  // Adjustment values (range -1.0 to 1.0, default 0)
  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    sharpen: 0,
    highlight: 0,
    shadow: 0,
    temp: 0,
    hue: 0,
  });

  // Text overlay state
  interface TextOverlay {
    id: string;
    text: string;
    position: { x: number; y: number };
    fontSize: number;
    textColor: string;
    fontFamily: string;
    alignment: 'left' | 'center' | 'right';
    hasBackground: boolean;
    backgroundColor: string;
    backgroundOpacity: number;
    startTime: number;
    endTime: number;
  }

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textTab, setTextTab] = useState<'input' | 'font' | 'style' | 'background' | 'align'>('input');
  const [textInput, setTextInput] = useState('');

  const availableFonts = ['Roboto', 'Serif', 'Montserrat', 'Impact', 'Comic Sans'];
  const availableColors = ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  const selectedTextOverlay = textOverlays.find(t => t.id === selectedTextId);

  const addTextOverlay = () => {
    const newText: TextOverlay = {
      id: Date.now().toString(),
      text: 'Sample Text',
      position: { x: 0.5, y: 0.5 },
      fontSize: 24,
      textColor: '#ffffff',
      fontFamily: 'Roboto',
      alignment: 'center',
      hasBackground: false,
      backgroundColor: '#000000',
      backgroundOpacity: 0.5,
      startTime: 0,
      endTime: Math.min(5, duration || 10),
    };
    setTextOverlays(prev => [...prev, newText]);
    setSelectedTextId(newText.id);
    setTextInput(newText.text);
    setSelectedTool('text');
  };

  const updateSelectedText = (updates: Partial<TextOverlay>) => {
    if (!selectedTextId) return;
    setTextOverlays(prev => prev.map(t => 
      t.id === selectedTextId ? { ...t, ...updates } : t
    ));
  };

  const deleteTextOverlay = (id: string) => {
    setTextOverlays(prev => prev.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const adjustmentTools: { id: keyof typeof adjustments; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'brightness', name: 'Brightness', icon: Sun },
    { id: 'contrast', name: 'Contrast', icon: Contrast },
    { id: 'saturation', name: 'Saturation', icon: Palette },
    { id: 'exposure', name: 'Exposure', icon: Aperture },
    { id: 'sharpen', name: 'Sharpen', icon: Focus },
    { id: 'highlight', name: 'Highlight', icon: Sunrise },
    { id: 'shadow', name: 'Shadow', icon: Moon },
    { id: 'temp', name: 'Temp', icon: Thermometer },
    { id: 'hue', name: 'Hue', icon: Droplets },
  ];

  const resetAdjustments = () => {
    setAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      sharpen: 0,
      highlight: 0,
      shadow: 0,
      temp: 0,
      hue: 0,
    });
    toast({ title: "Reset", description: "All adjustments reset to default" });
  };

  // Build CSS filter string from adjustment values
  const buildVideoFilter = () => {
    const brightness = 1 + adjustments.brightness * 0.5;
    const contrast = 1 + adjustments.contrast;
    const saturation = 1 + adjustments.saturation;
    const exposure = 1 + adjustments.exposure * 0.5;
    const hueRotate = adjustments.hue * 180; // -180 to 180 degrees
    
    // Combine brightness and exposure
    const combinedBrightness = brightness * exposure;
    
    // Temperature affects sepia for warmth
    const sepia = adjustments.temp > 0 ? adjustments.temp * 0.3 : 0;
    
    return `brightness(${combinedBrightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${hueRotate}deg) sepia(${sepia})`;
  };
  
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
    if (tool.id !== 'adjust') {
      toast({
        title: tool.name,
        description: "Coming soon!",
      });
    }
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
        <DialogContent className="max-w-none w-full h-full max-h-[100dvh] p-0 border-0 bg-black [&>button]:hidden rounded-none">
          <div className="relative w-full h-full flex flex-col">
            {/* Floating close button at top right */}
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={closeFullScreen}
                className="w-11 h-11 rounded-full bg-black/60 border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            
            {/* Fullscreen Video - expands to fill vertical space */}
            <div className="flex-1 flex items-center justify-center px-4">
              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  playsInline
                  muted={isMuted}
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                        setIsPlaying(true);
                      } else {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      }
                    }
                  }}
                />
              )}
            </div>
            
            {/* Bottom control bar with semi-transparent background */}
            <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-8 pb-6 px-4">
              {/* Seek bar */}
              <div 
                className="mb-4 h-6 flex items-center cursor-pointer group"
                onClick={(e) => {
                  if (videoRef.current && duration > 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const progress = clickX / rect.width;
                    const newTime = progress * duration;
                    videoRef.current.currentTime = newTime;
                    setCurrentTime(newTime);
                  }
                }}
              >
                <div className="relative w-full h-1 bg-white/30 rounded-full">
                  {/* Progress bar */}
                  <div 
                    className="absolute h-full bg-white rounded-full transition-all"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                  {/* Seek thumb */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all group-hover:scale-125"
                    style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 6px)` }}
                  />
                </div>
              </div>
              
              {/* Control row: Time | Play/Pause | Duration */}
              <div className="flex items-center">
                {/* Current time */}
                <span className="text-white text-sm font-mono w-[60px]">
                  {formatTime(currentTime)}
                </span>
                
                <div className="flex-1" />
                
                {/* Large central play/pause button */}
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                        setIsPlaying(true);
                      } else {
                        videoRef.current.pause();
                        setIsPlaying(false);
                      }
                    }
                  }}
                  className="w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center hover:bg-white/25 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </button>
                
                <div className="flex-1" />
                
                {/* Total duration */}
                <span className="text-white/60 text-sm font-mono w-[60px] text-right">
                  {formatTime(duration)}
                </span>
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
                style={{ filter: buildVideoFilter() }}
                playsInline
                muted={isMuted}
              />
              
              {/* Text Overlays */}
              {textOverlays.filter(overlay => 
                currentTime >= overlay.startTime && currentTime <= overlay.endTime
              ).map(overlay => {
                const isSelected = overlay.id === selectedTextId;
                return (
                  <div
                    key={overlay.id}
                    className={cn(
                      "absolute cursor-move px-3 py-2 rounded-lg transition-all",
                      isSelected && "ring-2 ring-primary"
                    )}
                    style={{
                      left: `${overlay.position.x * 100}%`,
                      top: `${overlay.position.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: overlay.hasBackground 
                        ? `${overlay.backgroundColor}${Math.round(overlay.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
                        : 'transparent',
                    }}
                    onClick={() => {
                      setSelectedTextId(overlay.id);
                      setTextInput(overlay.text);
                    }}
                  >
                    <span
                      style={{
                        color: overlay.textColor,
                        fontSize: overlay.fontSize,
                        fontFamily: overlay.fontFamily,
                        fontWeight: 'bold',
                      }}
                    >
                      {overlay.text}
                    </span>
                    
                    {/* Selection controls */}
                    {isSelected && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTextOverlay(overlay.id);
                          }}
                          className="absolute -top-4 -right-4 w-6 h-6 rounded-full bg-destructive flex items-center justify-center"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTool('text');
                          }}
                          className="absolute -top-4 -left-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Type className="w-3.5 h-3.5 text-white" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
              
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

      {/* Timeline Section - CapCut Style with Stack layout (No audio track) */}
      {videoUrl && duration > 0 && (
        <div className="h-[160px] shrink-0 bg-background overflow-hidden">
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
                  {/* Time Ruler - 2-second major ticks */}
                  <div className="h-6 flex items-end relative" style={{ width: `${20 * 60 + 54}px` }}>
                    {/* Major ticks every 2 seconds */}
                    {Array.from({ length: Math.ceil(duration / 2) + 1 }).map((_, i) => {
                      const seconds = i * 2;
                      if (seconds > duration) return null;
                      return (
                        <div 
                          key={`major-${i}`} 
                          className="absolute flex flex-col items-center"
                          style={{ left: `${(seconds / duration) * (20 * 60)}px` }}
                        >
                          <div className="w-px h-2.5 bg-white/50" />
                          <span className="text-[10px] text-white/60 font-mono font-medium mt-0.5">
                            {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
                          </span>
                        </div>
                      );
                    })}
                    {/* Minor ticks every 1 second (smaller) */}
                    {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => {
                      if (i % 2 === 0) return null; // Skip major tick positions
                      return (
                        <div 
                          key={`minor-${i}`} 
                          className="absolute"
                          style={{ left: `${(i / duration) * (20 * 60)}px` }}
                        >
                          <div className="w-px h-1.5 bg-white/25" />
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Video Track - Dark Red with Center Progress Bar */}
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
                      
                      {/* White progress bar in the center of the track */}
                      <div 
                        className="absolute left-0.5 top-1/2 -translate-y-1/2 h-[3px] bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.6)]"
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
                  
                  {/* Add Text Button - Gray container */}
                  <button 
                    onClick={addTextOverlay}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg w-fit"
                    style={{ backgroundColor: '#2A2A2A', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div className="w-4 h-4 bg-white/15 rounded flex items-center justify-center">
                      <Plus className="w-3 h-3 text-white/70" />
                    </div>
                    <span className="text-xs text-white/70 font-medium">Add text</span>
                  </button>
                  
                  {/* Text track items */}
                  {textOverlays.length > 0 && (
                    <div className="flex items-center gap-2 ml-2">
                      {textOverlays.map(overlay => {
                        const isSelected = overlay.id === selectedTextId;
                        const trackWidth = 20 * 60; // thumbnailCount * thumbnailWidth
                        const dur = duration || 10;
                        const startPercent = overlay.startTime / dur;
                        const widthPercent = (overlay.endTime - overlay.startTime) / dur;
                        const itemWidth = Math.max(40, trackWidth * widthPercent);
                        
                        return (
                          <div
                            key={overlay.id}
                            onClick={() => {
                              setSelectedTextId(overlay.id);
                              setTextInput(overlay.text);
                            }}
                            className={cn(
                              "h-8 rounded-md flex items-center px-2 gap-1 cursor-pointer transition-all",
                              isSelected 
                                ? "bg-gradient-to-r from-amber-500 to-amber-600 ring-2 ring-white"
                                : "bg-gradient-to-r from-primary to-primary/80"
                            )}
                            style={{ width: itemWidth }}
                          >
                            <Type className="w-3 h-3 text-white/90" />
                            <span className="text-[10px] text-white font-semibold truncate">
                              {overlay.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Toolbar - Fixed, not scrollable vertically */}
      {videoUrl && duration > 0 && (
        selectedTool === 'adjust' ? (
          // Adjust Panel with sliders
          <div className="shrink-0 bg-background border-t border-border/10 pb-safe">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3">
              <button
                onClick={() => setSelectedTool('edit')}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-sm font-medium">Back</span>
              </button>
              <span className="text-white font-bold">Adjust</span>
              <button
                onClick={resetAdjustments}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary/15 border border-primary/40 rounded-lg"
              >
                <span className="text-primary text-sm font-semibold">Reset</span>
              </button>
            </div>
            
            {/* Sliders */}
            <div className="max-h-[200px] overflow-y-auto px-4 pb-4 space-y-4">
              {adjustmentTools.map((tool) => {
                const value = adjustments[tool.id as keyof typeof adjustments];
                const IconComponent = tool.icon;
                return (
                  <div key={tool.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4 text-white/80" />
                        <span className={cn(
                          "text-sm",
                          value !== 0 ? "text-white font-semibold" : "text-white/70"
                        )}>
                          {tool.name}
                        </span>
                      </div>
                      <span className={cn(
                        "text-xs font-mono px-2 py-1 rounded",
                        value !== 0 ? "bg-primary/15 text-primary" : "bg-white/10 text-white/60"
                      )}>
                        {value >= 0 ? '+' : ''}{Math.round(value * 100)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={value * 100}
                      onChange={(e) => setAdjustments(prev => ({
                        ...prev,
                        [tool.id]: Number(e.target.value) / 100
                      }))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                      style={{
                        background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((value + 1) / 2) * 100}%, rgba(255,255,255,0.1) ${((value + 1) / 2) * 100}%, rgba(255,255,255,0.1) 100%)`
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : selectedTool === 'text' ? (
          // Text Editor Panel
          <div className="shrink-0 bg-background border-t border-border/10 pb-safe">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-3">
              <button
                onClick={() => setSelectedTool('edit')}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/10 rounded-lg"
              >
                <ArrowLeft className="w-4 h-4 text-white/80" />
                <span className="text-white/80 text-sm font-medium">Back</span>
              </button>
              <span className="text-white font-bold">Text Editor</span>
              <button
                onClick={addTextOverlay}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary/15 border border-primary/40 rounded-lg"
              >
                <Plus className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm font-semibold">Add</span>
              </button>
            </div>
            
            {/* Tab bar */}
            <div className="flex gap-1 px-3 overflow-x-auto">
              {(['input', 'font', 'style', 'background', 'align'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTextTab(tab)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                    textTab === tab ? "bg-primary text-white" : "bg-white/10 text-white/60"
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            
            {/* Tab content */}
            <div className="p-4 max-h-[200px] overflow-y-auto">
              {!selectedTextId ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Type className="w-10 h-10 text-white/30" />
                  <p className="text-white/50 text-sm">Add text to get started</p>
                </div>
              ) : textTab === 'input' ? (
                <div className="space-y-4">
                  <textarea
                    value={textInput}
                    onChange={(e) => {
                      setTextInput(e.target.value);
                      updateSelectedText({ text: e.target.value });
                    }}
                    className="w-full bg-white/10 text-white rounded-lg p-3 border-0 focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                    placeholder="Enter your text..."
                  />
                  {selectedTextId && (
                    <button
                      onClick={() => deleteTextOverlay(selectedTextId)}
                      className="w-full py-3 bg-destructive/20 text-destructive rounded-lg font-semibold flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Delete Text
                    </button>
                  )}
                </div>
              ) : textTab === 'font' ? (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {availableFonts.map((font) => {
                    const isSelected = selectedTextOverlay?.fontFamily === font;
                    return (
                      <button
                        key={font}
                        onClick={() => updateSelectedText({ fontFamily: font })}
                        className={cn(
                          "w-20 h-16 rounded-xl flex flex-col items-center justify-center shrink-0",
                          isSelected ? "bg-primary/20 ring-2 ring-primary" : "bg-white/10"
                        )}
                      >
                        <span className={cn("text-lg font-bold", isSelected ? "text-primary" : "text-white")}>Aa</span>
                        <span className="text-[9px] text-white/70 mt-1">{font}</span>
                      </button>
                    );
                  })}
                </div>
              ) : textTab === 'style' ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-white/70 text-xs mb-2">Text Color</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {availableColors.map((color) => {
                        const isSelected = selectedTextOverlay?.textColor === color;
                        return (
                          <button
                            key={color}
                            onClick={() => updateSelectedText({ textColor: color })}
                            className={cn(
                              "w-9 h-9 rounded-full shrink-0",
                              isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/70 text-xs">Font Size</p>
                      <span className="text-white text-xs font-semibold">{selectedTextOverlay?.fontSize || 24}</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="72"
                      value={selectedTextOverlay?.fontSize || 24}
                      onChange={(e) => updateSelectedText({ fontSize: Number(e.target.value) })}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              ) : textTab === 'background' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-white/70 text-xs">Enable Background</p>
                    <button
                      onClick={() => updateSelectedText({ hasBackground: !selectedTextOverlay?.hasBackground })}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors",
                        selectedTextOverlay?.hasBackground ? "bg-primary" : "bg-white/20"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full bg-white transition-transform",
                        selectedTextOverlay?.hasBackground ? "translate-x-6" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                  {selectedTextOverlay?.hasBackground && (
                    <>
                      <div>
                        <p className="text-white/70 text-xs mb-2">Background Color</p>
                        <div className="flex gap-2">
                          {availableColors.map((color) => (
                            <button
                              key={color}
                              onClick={() => updateSelectedText({ backgroundColor: color })}
                              className={cn(
                                "w-8 h-8 rounded-full shrink-0",
                                selectedTextOverlay?.backgroundColor === color && "ring-2 ring-primary"
                              )}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white/70 text-xs">Opacity</p>
                          <span className="text-white text-xs">{Math.round((selectedTextOverlay?.backgroundOpacity || 0.5) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={(selectedTextOverlay?.backgroundOpacity || 0.5) * 100}
                          onChange={(e) => updateSelectedText({ backgroundOpacity: Number(e.target.value) / 100 })}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : textTab === 'align' ? (
                <div>
                  <p className="text-white/70 text-xs mb-3">Text Alignment</p>
                  <div className="flex gap-4 justify-center">
                    {(['left', 'center', 'right'] as const).map((align) => {
                      const isSelected = selectedTextOverlay?.alignment === align;
                      return (
                        <button
                          key={align}
                          onClick={() => updateSelectedText({ alignment: align })}
                          className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center",
                            isSelected ? "bg-primary/20 ring-2 ring-primary" : "bg-white/10"
                          )}
                        >
                          {align === 'left' && <svg className={cn("w-6 h-6", isSelected ? "text-primary" : "text-white/70")} fill="currentColor" viewBox="0 0 24 24"><path d="M3 5h18v2H3V5zm0 4h12v2H3V9zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>}
                          {align === 'center' && <svg className={cn("w-6 h-6", isSelected ? "text-primary" : "text-white/70")} fill="currentColor" viewBox="0 0 24 24"><path d="M3 5h18v2H3V5zm3 4h12v2H6V9zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z"/></svg>}
                          {align === 'right' && <svg className={cn("w-6 h-6", isSelected ? "text-primary" : "text-white/70")} fill="currentColor" viewBox="0 0 24 24"><path d="M3 5h18v2H3V5zm6 4h12v2H9V9zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z"/></svg>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          // Normal tool bar
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
        )
      )}
    </div>
  );
}
