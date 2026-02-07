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
  Volume2,
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
  Droplets,
  Trash2,
  Subtitles,
  Loader2,
  MessageSquare
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

// Timeline Sync Engine - Global Constants
const PIXELS_PER_SECOND = 80.0; // Master time-to-pixel ratio
const THUMBNAIL_HEIGHT = 48;

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
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
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
  
  // Layer management state for multi-track timeline
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [trimmingLayerId, setTrimmingLayerId] = useState<string | null>(null);
  const [isTrimmingStart, setIsTrimmingStart] = useState(false);
  const [snapLinePosition, setSnapLinePosition] = useState<number | null>(null);

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
  const [isEditingTextInline, setIsEditingTextInline] = useState(false);
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);

  // Caption/Subtitle layer state
  interface CaptionLayer {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
  }

  const [captionLayers, setCaptionLayers] = useState<CaptionLayer[]>([]);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);

  const selectedCaptionLayer = captionLayers.find(c => c.id === selectedCaptionId);

  // Audio layer state
  interface AudioLayer {
    id: string;
    name: string;
    fileUrl: string;
    volume: number;
    startTime: number;
    endTime: number;
  }

  const [audioLayers, setAudioLayers] = useState<AudioLayer[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const selectedAudioLayer = audioLayers.find(a => a.id === selectedAudioId);

  const handleAudioImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local URL for the audio file
    const audioUrl = URL.createObjectURL(file);
    
    // Create audio element to get duration
    const audioElement = new Audio(audioUrl);
    audioElement.addEventListener('loadedmetadata', () => {
      const audioDuration = audioElement.duration;
      const newAudio: AudioLayer = {
        id: Date.now().toString(),
        name: file.name,
        fileUrl: audioUrl,
        volume: 1.0,
        startTime: 0,
        endTime: Math.min(audioDuration, duration || 10),
      };
      setAudioLayers(prev => [...prev, newAudio]);
      setSelectedAudioId(newAudio.id);
      setSelectedTool('audio');
      
      // Store reference for sync
      audioRefs.current.set(newAudio.id, audioElement);
    });

    // Reset input
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  const updateSelectedAudio = (updates: Partial<AudioLayer>) => {
    if (!selectedAudioId) return;
    setAudioLayers(prev => prev.map(a => 
      a.id === selectedAudioId ? { ...a, ...updates } : a
    ));
  };

  const deleteAudioLayer = (id: string) => {
    // Clean up audio element
    const audioEl = audioRefs.current.get(id);
    if (audioEl) {
      audioEl.pause();
      URL.revokeObjectURL(audioEl.src);
      audioRefs.current.delete(id);
    }
    setAudioLayers(prev => prev.filter(a => a.id !== id));
    if (selectedAudioId === id) setSelectedAudioId(null);
  };

  // Sync audio with video playback
  useEffect(() => {
    if (!videoRef.current) return;
    
    const syncAudio = () => {
      const videoTime = videoRef.current?.currentTime || 0;
      
      audioLayers.forEach(audio => {
        const audioEl = audioRefs.current.get(audio.id);
        if (!audioEl) return;
        
        // Check if current time is within audio range
        if (videoTime >= audio.startTime && videoTime <= audio.endTime) {
          const audioTime = videoTime - audio.startTime;
          
          // Sync position if drifted
          if (Math.abs(audioEl.currentTime - audioTime) > 0.1) {
            audioEl.currentTime = audioTime;
          }
          
          audioEl.volume = audio.volume;
          
          if (isPlaying && audioEl.paused) {
            audioEl.play().catch(() => {});
          } else if (!isPlaying && !audioEl.paused) {
            audioEl.pause();
          }
        } else {
          // Outside range, pause
          if (!audioEl.paused) {
            audioEl.pause();
          }
        }
      });
    };

    const interval = setInterval(syncAudio, 100);
    return () => clearInterval(interval);
  }, [audioLayers, isPlaying]);

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

  // Caption/Subtitle functions
  const generateAutoCaptions = async () => {
    if (!videoUrl || !duration) {
      toast({ variant: "destructive", title: "Error", description: "Please load a video first" });
      return;
    }
    
    setIsGeneratingCaptions(true);
    toast({ title: "Generating captions", description: "Analyzing audio..." });
    
    try {
      // Mock caption generation - in production this would call a transcription API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate sample captions based on video duration
      const captionDuration = 3; // seconds per caption
      const numCaptions = Math.ceil(duration / captionDuration);
      const newCaptions: CaptionLayer[] = [];
      
      for (let i = 0; i < numCaptions; i++) {
        newCaptions.push({
          id: `caption-${Date.now()}-${i}`,
          text: `Caption ${i + 1}`,
          startTime: i * captionDuration,
          endTime: Math.min((i + 1) * captionDuration, duration),
        });
      }
      
      setCaptionLayers(newCaptions);
      setSelectedTool('captions');
      toast({ title: "Captions generated", description: `${numCaptions} captions created` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to generate captions" });
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  const updateSelectedCaption = (updates: Partial<CaptionLayer>) => {
    if (!selectedCaptionId) return;
    setCaptionLayers(prev => prev.map(c => 
      c.id === selectedCaptionId ? { ...c, ...updates } : c
    ));
  };

  const deleteCaptionLayer = (id: string) => {
    setCaptionLayers(prev => prev.filter(c => c.id !== id));
    if (selectedCaptionId === id) setSelectedCaptionId(null);
  };

  const addCaptionLayer = () => {
    const newCaption: CaptionLayer = {
      id: `caption-${Date.now()}`,
      text: 'New caption',
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, duration || 10),
    };
    setCaptionLayers(prev => [...prev, newCaption]);
    setSelectedCaptionId(newCaption.id);
    setSelectedTool('captions');
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

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      
      // Auto-scroll timeline when video is playing (not user scrolling)
      if (!isUserScrolling && !isAutoScrolling && timelineRef.current) {
        const halfScreen = window.innerWidth / 2;
        const targetScroll = video.currentTime * PIXELS_PER_SECOND;
        setIsAutoScrolling(true);
        timelineRef.current.scrollLeft = targetScroll;
        setTimeout(() => setIsAutoScrolling(false), 50);
      }
    };
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
  }, [videoUrl, isUserScrolling, isAutoScrolling]);

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
    // Handle tools that have implementations
    if (!['adjust', 'text', 'audio', 'captions'].includes(tool.id)) {
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

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioImport}
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
              
              {/* Text Overlays - with dragging support */}
              {textOverlays.filter(overlay => 
                currentTime >= overlay.startTime && currentTime <= overlay.endTime
              ).map(overlay => {
                const isSelected = overlay.id === selectedTextId;
                return (
                  <div
                    key={overlay.id}
                    className={cn(
                      "absolute px-3 py-2 rounded-lg transition-all select-none",
                      isSelected && "ring-2 ring-primary shadow-lg shadow-primary/30",
                      draggingTextId === overlay.id && "cursor-grabbing"
                    )}
                    style={{
                      left: `${overlay.position.x * 100}%`,
                      top: `${overlay.position.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: overlay.hasBackground 
                        ? `${overlay.backgroundColor}${Math.round(overlay.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
                        : 'transparent',
                      cursor: draggingTextId === overlay.id ? 'grabbing' : 'grab',
                    }}
                    // Click to select, double-click to edit inline
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelected) {
                        // Already selected - open inline editor
                        setIsEditingTextInline(true);
                        setSelectedTool('text');
                      } else {
                        setSelectedTextId(overlay.id);
                        setTextInput(overlay.text);
                      }
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setSelectedTextId(overlay.id);
                      setTextInput(overlay.text);
                      setIsEditingTextInline(true);
                      setSelectedTool('text');
                    }}
                    // Drag support with mouse
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      setDraggingTextId(overlay.id);
                      setSelectedTextId(overlay.id);
                      
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startPosX = overlay.position.x;
                      const startPosY = overlay.position.y;
                      const containerRect = e.currentTarget.parentElement?.getBoundingClientRect();
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        if (!containerRect) return;
                        const deltaX = (moveEvent.clientX - startX) / containerRect.width;
                        const deltaY = (moveEvent.clientY - startY) / containerRect.height;
                        const newX = Math.max(0.05, Math.min(0.95, startPosX + deltaX));
                        const newY = Math.max(0.05, Math.min(0.95, startPosY + deltaY));
                        
                        setTextOverlays(prev => prev.map(t => 
                          t.id === overlay.id ? { ...t, position: { x: newX, y: newY } } : t
                        ));
                      };
                      
                      const handleMouseUp = () => {
                        setDraggingTextId(null);
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
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
                    
                    {/* Selection handles - only when selected and not dragging */}
                    {isSelected && !draggingTextId && (
                      <>
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTextOverlay(overlay.id);
                          }}
                          className="absolute -top-4 -right-4 w-7 h-7 rounded-full bg-destructive flex items-center justify-center shadow-lg"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                        {/* Edit button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingTextInline(true);
                            setSelectedTool('text');
                          }}
                          className="absolute -top-4 -left-4 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg"
                        >
                          <Type className="w-4 h-4 text-white" />
                        </button>
                        {/* Resize handle */}
                        <div className="absolute -bottom-3 -right-3 w-5 h-5 rounded-full bg-white border-2 border-primary flex items-center justify-center cursor-se-resize">
                          <svg className="w-2.5 h-2.5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z"/>
                          </svg>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              
              {/* Caption Overlays - Display at bottom of video */}
              {captionLayers.filter(caption => 
                currentTime >= caption.startTime && currentTime <= caption.endTime
              ).map(caption => (
                <div
                  key={`caption-overlay-${caption.id}`}
                  className={cn(
                    "absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg max-w-[90%] text-center transition-all",
                    caption.id === selectedCaptionId && "ring-2 ring-cyan-500"
                  )}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  }}
                  onClick={() => {
                    setSelectedCaptionId(caption.id);
                    setSelectedTool('captions');
                  }}
                >
                  <span className="text-white text-sm font-medium">
                    {caption.text}
                  </span>
                </div>
              ))}
              
              <button
                onClick={clearVideo}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-8 py-20">
            <button
              onClick={handleShowMediaPicker}
              className="w-full max-w-sm py-12 bg-white/5 rounded-3xl border-2 border-primary/30 flex flex-col items-center justify-center hover:bg-white/10 transition-colors"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-7">
                <Video className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-white text-xl font-bold mb-3">Upload Video</h2>
              <p className="text-white/50 text-sm text-center">
                Tap anywhere to select a video
              </p>
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

      {/* Dynamic Bottom Area - Timeline OR Settings Panel */}
      {videoUrl && duration > 0 && (
        (selectedTool === 'text' || selectedTool === 'adjust' || selectedTool === 'audio') ? (
          // Contextual Settings Panel - OVERLAYS the timeline area
          <div className="shrink-0 bg-background border-t border-border/10 pb-safe">
            {/* Header with Cancel (X) and Done (checkmark) buttons */}
            <div className="flex items-center justify-between px-4 py-3">
              {/* Cancel button (X) */}
              <button
                onClick={() => {
                  setSelectedTool('edit');
                  setSelectedTextId(null);
                  setSelectedAudioId(null);
                  setIsEditingTextInline(false);
                }}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white/80" />
              </button>
              
              {/* Title */}
              <span className="text-white font-bold text-base">
                {selectedTool === 'text' ? 'Text Editor' : selectedTool === 'audio' ? 'Audio' : 'Adjust'}
              </span>
              
              {/* Done button (checkmark) */}
              <button
                onClick={() => {
                  setSelectedTool('edit');
                  setIsEditingTextInline(false);
                  toast({ title: "Done", description: "Changes applied" });
                }}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40"
              >
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
            
            {/* Settings Content */}
            {selectedTool === 'adjust' ? (
              <>
                {/* Reset button */}
                <div className="flex justify-end px-4 pb-2">
                  <button
                    onClick={resetAdjustments}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/40 rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                    <span className="text-primary text-xs font-semibold">Reset</span>
                  </button>
                </div>
                
                {/* Sliders */}
                <div className="max-h-[180px] overflow-y-auto px-4 pb-4 space-y-4">
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
              </>
            ) : selectedTool === 'text' ? (
              // Text Editor Content
              <>
                {/* Add text button if no text selected */}
                {!selectedTextId && (
                  <div className="px-4 pb-2">
                    <button
                      onClick={addTextOverlay}
                      className="w-full py-4 bg-primary/15 border border-primary/40 rounded-xl flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5 text-primary" />
                      <span className="text-primary text-base font-semibold">Add Text</span>
                    </button>
                  </div>
                )}
                
                {/* Tab bar */}
                <div className="flex gap-1 px-3 overflow-x-auto">
                  {(['input', 'font', 'style', 'background', 'align'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setTextTab(tab)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                        textTab === tab ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/60"
                      )}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                
                {/* Tab content */}
                <div className="p-4 max-h-[140px] overflow-y-auto">
                  {!selectedTextId ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                      <Type className="w-8 h-8 text-white/30" />
                      <p className="text-white/50 text-sm">Select or add text</p>
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
                        rows={2}
                        placeholder="Enter your text..."
                        autoFocus={isEditingTextInline}
                      />
                      {selectedTextId && (
                        <button
                          onClick={() => deleteTextOverlay(selectedTextId)}
                          className="w-full py-2.5 bg-destructive/20 text-destructive rounded-lg font-semibold flex items-center justify-center gap-2"
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
                              "w-20 h-14 rounded-xl flex flex-col items-center justify-center shrink-0",
                              isSelected ? "bg-primary/20 ring-2 ring-primary" : "bg-white/10"
                            )}
                          >
                            <span className={cn("text-lg font-bold", isSelected ? "text-primary" : "text-white")}>Aa</span>
                            <span className="text-[9px] text-white/70 mt-0.5">{font}</span>
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
                                  "w-8 h-8 rounded-full shrink-0",
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
                                    "w-7 h-7 rounded-full shrink-0",
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
                                "w-12 h-12 rounded-xl flex items-center justify-center",
                                isSelected ? "bg-primary/20 ring-2 ring-primary" : "bg-white/10"
                              )}
                            >
                              {align === 'left' && <svg className={cn("w-5 h-5", isSelected ? "text-primary" : "text-white/70")} fill="currentColor" viewBox="0 0 24 24"><path d="M3 5h18v2H3V5zm0 4h12v2H3V9zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>}
                              {align === 'center' && <svg className={cn("w-5 h-5", isSelected ? "text-primary" : "text-white/70")} fill="currentColor" viewBox="0 0 24 24"><path d="M3 5h18v2H3V5zm3 4h12v2H6V9zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z"/></svg>}
                              {align === 'right' && <svg className={cn("w-5 h-5", isSelected ? "text-primary" : "text-white/70")} fill="currentColor" viewBox="0 0 24 24"><path d="M3 5h18v2H3V5zm6 4h12v2H9V9zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z"/></svg>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            ) : selectedTool === 'audio' ? (
              // Audio Editor Content
              <>
                {/* Add audio button */}
                <div className="px-4 pb-3">
                  <button
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full py-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 text-base font-semibold">Add Audio</span>
                  </button>
                </div>
                
                {/* Audio layers list */}
                <div className="max-h-[200px] overflow-y-auto px-4 pb-4 space-y-3">
                  {audioLayers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                      <Music className="w-8 h-8 text-white/30" />
                      <p className="text-white/50 text-sm">No audio layers added</p>
                    </div>
                  ) : (
                    audioLayers.map((audio) => {
                      const isSelected = audio.id === selectedAudioId;
                      return (
                        <div
                          key={audio.id}
                          onClick={() => setSelectedAudioId(audio.id)}
                          className={cn(
                            "p-3 rounded-xl cursor-pointer transition-all",
                            isSelected 
                              ? "bg-emerald-500/20 ring-2 ring-emerald-500" 
                              : "bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                isSelected ? "bg-emerald-500/30" : "bg-white/10"
                              )}>
                                <Music className={cn("w-4 h-4", isSelected ? "text-emerald-400" : "text-white/60")} />
                              </div>
                              <span className="text-white text-sm font-medium truncate max-w-[150px]">
                                {audio.name}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAudioLayer(audio.id);
                              }}
                              className="p-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/30"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                          
                          {/* Volume slider */}
                          {isSelected && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Volume2 className="w-4 h-4 text-white/70" />
                                  <span className="text-white/70 text-xs">Volume</span>
                                </div>
                                <span className="text-white text-xs font-semibold">
                                  {Math.round(audio.volume * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={audio.volume * 100}
                                onChange={(e) => updateSelectedAudio({ volume: Number(e.target.value) / 100 })}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : selectedTool === 'captions' ? (
              // Captions Editor Content
              <>
                {/* Auto-Caption button */}
                <div className="px-4 pb-3">
                  <button
                    onClick={generateAutoCaptions}
                    disabled={isGeneratingCaptions}
                    className="w-full py-4 bg-cyan-500/15 border border-cyan-500/40 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingCaptions ? (
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    ) : (
                      <Subtitles className="w-5 h-5 text-cyan-400" />
                    )}
                    <span className="text-cyan-400 text-base font-semibold">
                      {isGeneratingCaptions ? 'Generating...' : 'Auto-Caption'}
                    </span>
                  </button>
                </div>
                
                {/* Add caption button */}
                <div className="px-4 pb-3">
                  <button
                    onClick={addCaptionLayer}
                    className="w-full py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-400 text-sm font-semibold">Add Caption</span>
                  </button>
                </div>
                
                {/* Caption layers list */}
                <div className="max-h-[200px] overflow-y-auto px-4 pb-4 space-y-3">
                  {captionLayers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                      <Subtitles className="w-8 h-8 text-white/30" />
                      <p className="text-white/50 text-sm">No captions added</p>
                      <p className="text-white/30 text-xs">Use Auto-Caption or add manually</p>
                    </div>
                  ) : (
                    captionLayers.map((caption) => {
                      const isSelected = caption.id === selectedCaptionId;
                      return (
                        <div
                          key={caption.id}
                          onClick={() => setSelectedCaptionId(caption.id)}
                          className={cn(
                            "p-3 rounded-xl cursor-pointer transition-all",
                            isSelected 
                              ? "bg-cyan-500/20 ring-2 ring-cyan-500" 
                              : "bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                isSelected ? "bg-cyan-500/30" : "bg-white/10"
                              )}>
                                <MessageSquare className={cn("w-4 h-4", isSelected ? "text-cyan-400" : "text-white/60")} />
                              </div>
                              <div>
                                <span className="text-white text-sm font-medium block truncate max-w-[150px]">
                                  {caption.text}
                                </span>
                                <span className="text-white/50 text-[10px]">
                                  {formatTime(caption.startTime)} - {formatTime(caption.endTime)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCaptionLayer(caption.id);
                              }}
                              className="p-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/30"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                          
                          {/* Edit caption text */}
                          {isSelected && (
                            <div className="space-y-3">
                              <textarea
                                value={caption.text}
                                onChange={(e) => updateSelectedCaption({ text: e.target.value })}
                                className="w-full bg-white/10 text-white rounded-lg p-2 border-0 focus:ring-2 focus:ring-cyan-500 resize-none text-sm"
                                rows={2}
                                placeholder="Enter caption text..."
                              />
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <label className="text-white/50 text-[10px] block mb-1">Start (s)</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={caption.startTime.toFixed(1)}
                                    onChange={(e) => updateSelectedCaption({ 
                                      startTime: Math.max(0, Math.min(caption.endTime - 0.5, Number(e.target.value))) 
                                    })}
                                    className="w-full bg-white/10 text-white rounded-lg px-2 py-1 text-sm text-center"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-white/50 text-[10px] block mb-1">End (s)</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={caption.endTime.toFixed(1)}
                                    onChange={(e) => updateSelectedCaption({ 
                                      endTime: Math.min(duration, Math.max(caption.startTime + 0.5, Number(e.target.value))) 
                                    })}
                                    className="w-full bg-white/10 text-white rounded-lg px-2 py-1 text-sm text-center"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          // Normal: Timeline + Toolbar
          <>
            {/* Timeline Section - Multi-Track with Sync Engine */}
            <div className="h-[200px] shrink-0 bg-[#0D0D0D] overflow-hidden relative">
              {/* Fixed Mute/Cover buttons at very beginning (outside scroll) */}
              <div className="absolute left-0 top-8 z-30 flex flex-col gap-1 bg-[#0D0D0D] pr-1">
                {/* Mute button */}
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className={cn(
                    "w-11 h-[24px] rounded-md flex items-center justify-center gap-1 border transition-colors",
                    isMuted 
                      ? "bg-primary/15 border-primary/40" 
                      : "bg-white/5 border-white/10"
                  )}
                >
                  <VolumeX className={cn("w-3 h-3", isMuted ? "text-primary" : "text-white/70")} />
                  <span className={cn("text-[7px]", isMuted ? "text-primary" : "text-white/50")}>Mute</span>
                </button>
                
                {/* Cover button */}
                <button 
                  onClick={() => toast({ title: "Cover", description: "Coming soon!" })}
                  className="w-11 h-[24px] bg-white/5 rounded-md flex items-center justify-center gap-1 border border-white/10"
                >
                  <Image className="w-3 h-3 text-white/60" />
                  <span className="text-[7px] text-white/50">Cover</span>
                </button>
              </div>

              {/* Fixed Centered Playhead (Top Layer) */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white z-20 -translate-x-1/2 shadow-[0_0_12px_rgba(255,255,255,0.5)]">
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
              </div>
              
              {/* Snap line indicator */}
              {snapLinePosition !== null && (
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-30"
                  style={{ left: snapLinePosition }}
                />
              )}
              
              {/* Scrollable Timeline Content using pixelsPerSecond */}
              <div 
                ref={timelineRef}
                className="h-full overflow-x-auto scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onScroll={(e) => {
                  if (!isUserScrolling || isAutoScrolling) return;
                  const scrollLeft = e.currentTarget.scrollLeft;
                  // Convert scroll to time using pixelsPerSecond
                  const timeUnderPlayhead = scrollLeft / PIXELS_PER_SECOND;
                  const clampedTime = Math.max(0, Math.min(duration, timeUnderPlayhead));
                  if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.currentTime = clampedTime;
                    setIsPlaying(false);
                  }
                }}
                onMouseDown={() => setIsUserScrolling(true)}
                onMouseUp={() => setIsUserScrolling(false)}
                onMouseLeave={() => setIsUserScrolling(false)}
                onTouchStart={() => setIsUserScrolling(true)}
                onTouchEnd={() => setIsUserScrolling(false)}
              >
                {/* Calculate dimensions using pixelsPerSecond */}
                {(() => {
                  const trackWidth = duration * PIXELS_PER_SECOND;
                  const thumbCount = Math.ceil(trackWidth / 60);
                  const halfScreen = typeof window !== 'undefined' ? window.innerWidth / 2 : 200;
                  
                  return (
                    <div 
                      className="flex flex-col gap-1.5 pt-1"
                      style={{ 
                        paddingLeft: halfScreen, 
                        paddingRight: halfScreen,
                        width: trackWidth + halfScreen * 2,
                      }}
                    >
                      {/* Time Ruler using pixelsPerSecond */}
                      <div className="h-6 flex items-end relative" style={{ width: trackWidth }}>
                        {Array.from({ length: Math.ceil(duration / 2) + 1 }).map((_, i) => {
                          const seconds = i * 2;
                          if (seconds > duration) return null;
                          // Position using global constant
                          const position = seconds * PIXELS_PER_SECOND;
                          return (
                            <div 
                              key={`major-${i}`} 
                              className="absolute flex flex-col items-center"
                              style={{ left: position }}
                            >
                              <div className="w-px h-2.5 bg-white/50" />
                              <span className="text-[10px] text-white/60 font-mono font-medium mt-0.5">
                                {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
                              </span>
                            </div>
                          );
                        })}
                        {/* Minor ticks */}
                        {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => {
                          if (i % 2 === 0) return null;
                          const position = i * PIXELS_PER_SECOND;
                          return (
                            <div 
                              key={`minor-${i}`}
                              className="absolute w-px h-1.5 bg-white/25"
                              style={{ left: position }}
                            />
                          );
                        })}
                      </div>
                      
                      {/* Video Track Row - filmstrip with thumbnails */}
                      <div className="flex items-center gap-2">
                        {/* Video Track Filmstrip - using pixelsPerSecond with actual thumbnails */}
                        <div className="relative">
                          <div 
                            className="flex h-[48px] rounded-lg overflow-hidden border-2"
                            style={{ borderColor: '#AA2222', width: trackWidth }}
                          >
                            {Array.from({ length: thumbCount }).map((_, i) => {
                              // Calculate the time position for this thumbnail
                              const thumbTime = (i / thumbCount) * duration;
                              // Use video element to extract frame (simulated with gradient for now)
                              return (
                                <div
                                  key={i}
                                  className="w-[60px] h-full shrink-0 relative overflow-hidden"
                                  style={{
                                    borderRight: i < thumbCount - 1 ? '1px solid rgba(90, 0, 0, 0.4)' : 'none',
                                  }}
                                >
                                  {/* Video thumbnail frame - uses canvas extraction in production */}
                                  {videoUrl ? (
                                    <div 
                                      className="w-full h-full bg-cover bg-center"
                                      style={{
                                        backgroundImage: `linear-gradient(135deg, rgba(139,0,0,0.3), rgba(90,0,0,0.5))`,
                                        backgroundColor: '#2A1515',
                                      }}
                                    >
                                      {/* Simulated frame with time indicator */}
                                      <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-[8px] text-white/40 font-mono">
                                          {Math.floor(thumbTime)}s
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div 
                                      className="w-full h-full flex items-center justify-center"
                                      style={{ background: 'linear-gradient(to bottom, #8B0000, #5A0000)' }}
                                    >
                                      <Video className="w-3.5 h-3.5 text-white/30" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Add video button */}
                        <button 
                          onClick={handleShowMediaPicker}
                          className="w-11 h-[48px] bg-white rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.25)]"
                        >
                          <Plus className="w-6 h-6 text-black" />
                        </button>
                      </div>
                      
                      {/* Text Track - using pixelsPerSecond for positioning */}
                      {textOverlays.length > 0 && (
                        <div className="relative h-10" style={{ width: trackWidth }}>
                          {textOverlays.map(overlay => {
                            const isSelected = overlay.id === selectedTextId;
                            // Use pixelsPerSecond for consistent positioning
                            const leftOffset = overlay.startTime * PIXELS_PER_SECOND;
                            const itemWidth = Math.max(50, (overlay.endTime - overlay.startTime) * PIXELS_PER_SECOND);
                        
                        return (
                          <div
                            key={overlay.id}
                            className={cn(
                              "absolute h-[34px] rounded-md flex items-center cursor-grab transition-all active:cursor-grabbing",
                              isSelected 
                                ? "bg-gradient-to-r from-amber-500 to-amber-600 ring-2 ring-white shadow-lg shadow-amber-500/30"
                                : "bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/30",
                              draggingLayerId === overlay.id && "opacity-90 scale-[1.02] z-10"
                            )}
                            style={{ left: leftOffset, width: itemWidth, top: 3 }}
                            draggable={false}
                          >
                            {/* Left trim handle */}
                            <div 
                              className={cn(
                                "w-2.5 h-full rounded-l-md flex items-center justify-center cursor-ew-resize",
                                isSelected ? "bg-white/50" : "bg-white/30"
                              )}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setTrimmingLayerId(overlay.id);
                                setIsTrimmingStart(true);
                                
                                const startX = e.clientX;
                                const startTime = overlay.startTime;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  // Use PIXELS_PER_SECOND for time conversion
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  const newStart = Math.max(0, Math.min(overlay.endTime - 0.5, startTime + timeDelta));
                                  setTextOverlays(prev => prev.map(t => 
                                    t.id === overlay.id ? { ...t, startTime: newStart } : t
                                  ));
                                };
                                
                                const handleUp = () => {
                                  setTrimmingLayerId(null);
                                  setIsTrimmingStart(false);
                                  document.removeEventListener('mousemove', handleMove);
                                  document.removeEventListener('mouseup', handleUp);
                                };
                                
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                              }}
                            >
                              <div className="w-0.5 h-4 bg-white/80 rounded-full" />
                            </div>
                            
                            {/* Content - Draggable center area for moving entire clip */}
                            <div 
                              className="flex-1 flex items-center gap-1 px-1 overflow-hidden cursor-grab active:cursor-grabbing"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingLayerId(overlay.id);
                                setSelectedTextId(overlay.id);
                                setTextInput(overlay.text);
                                
                                const startX = e.clientX;
                                const startTime = overlay.startTime;
                                const clipDuration = overlay.endTime - overlay.startTime;
                                const snapThreshold = 10 / PIXELS_PER_SECOND; // 10px snap threshold
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  let newStart = Math.max(0, Math.min(duration - clipDuration, startTime + timeDelta));
                                  
                                  // Snap to playhead
                                  const playheadTime = currentTime;
                                  if (Math.abs(newStart - playheadTime) < snapThreshold) {
                                    newStart = playheadTime;
                                    setSnapLinePosition(window.innerWidth / 2);
                                  } else if (Math.abs(newStart + clipDuration - playheadTime) < snapThreshold) {
                                    newStart = playheadTime - clipDuration;
                                    setSnapLinePosition(window.innerWidth / 2);
                                  } else {
                                    // Snap to other text clips
                                    let snapped = false;
                                    for (const other of textOverlays) {
                                      if (other.id === overlay.id) continue;
                                      if (Math.abs(newStart - other.endTime) < snapThreshold) {
                                        newStart = other.endTime;
                                        snapped = true;
                                        break;
                                      }
                                      if (Math.abs(newStart + clipDuration - other.startTime) < snapThreshold) {
                                        newStart = other.startTime - clipDuration;
                                        snapped = true;
                                        break;
                                      }
                                    }
                                    if (!snapped) {
                                      setSnapLinePosition(null);
                                    }
                                  }
                                  
                                  setTextOverlays(prev => prev.map(t => 
                                    t.id === overlay.id 
                                      ? { ...t, startTime: newStart, endTime: newStart + clipDuration } 
                                      : t
                                  ));
                                };
                                
                                const handleUp = () => {
                                  setDraggingLayerId(null);
                                  setSnapLinePosition(null);
                                  document.removeEventListener('mousemove', handleMove);
                                  document.removeEventListener('mouseup', handleUp);
                                };
                                
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                              }}
                              onClick={() => {
                                setSelectedTextId(overlay.id);
                                setTextInput(overlay.text);
                                setSelectedTool('text');
                              }}
                            >
                              <Type className="w-3 h-3 text-white/90 shrink-0" />
                              <span className="text-[10px] text-white font-semibold truncate">
                                {overlay.text}
                              </span>
                            </div>
                            
                            {/* Right trim handle */}
                            <div 
                              className={cn(
                                "w-2.5 h-full rounded-r-md flex items-center justify-center cursor-ew-resize",
                                isSelected ? "bg-white/50" : "bg-white/30"
                              )}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setTrimmingLayerId(overlay.id);
                                
                                const startX = e.clientX;
                                const endTime = overlay.endTime;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  // Use PIXELS_PER_SECOND for time conversion
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  const newEnd = Math.min(duration, Math.max(overlay.startTime + 0.5, endTime + timeDelta));
                                  setTextOverlays(prev => prev.map(t => 
                                    t.id === overlay.id ? { ...t, endTime: newEnd } : t
                                  ));
                                };
                                
                                const handleUp = () => {
                                  setTrimmingLayerId(null);
                                  document.removeEventListener('mousemove', handleMove);
                                  document.removeEventListener('mouseup', handleUp);
                                };
                                
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                              }}
                            >
                              <div className="w-0.5 h-4 bg-white/80 rounded-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Audio Track - Green themed */}
                  {audioLayers.length > 0 && (
                    <div className="relative h-10" style={{ width: trackWidth }}>
                      {audioLayers.map(audio => {
                        const isSelected = audio.id === selectedAudioId;
                        const leftOffset = audio.startTime * PIXELS_PER_SECOND;
                        const itemWidth = Math.max(50, (audio.endTime - audio.startTime) * PIXELS_PER_SECOND);
                    
                        return (
                          <div
                            key={audio.id}
                            className={cn(
                              "absolute h-[34px] rounded-md flex items-center cursor-grab transition-all active:cursor-grabbing",
                              isSelected 
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 ring-2 ring-white shadow-lg shadow-emerald-500/30"
                                : "bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-md shadow-emerald-600/30",
                              draggingLayerId === audio.id && "opacity-90 scale-[1.02] z-10"
                            )}
                            style={{ left: leftOffset, width: itemWidth, top: 3 }}
                          >
                            {/* Left trim handle */}
                            <div 
                              className={cn(
                                "w-2.5 h-full rounded-l-md flex items-center justify-center cursor-ew-resize",
                                isSelected ? "bg-white/50" : "bg-white/30"
                              )}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const startTime = audio.startTime;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  const newStart = Math.max(0, Math.min(audio.endTime - 0.5, startTime + timeDelta));
                                  setAudioLayers(prev => prev.map(a => 
                                    a.id === audio.id ? { ...a, startTime: newStart } : a
                                  ));
                                };
                                
                                const handleUp = () => {
                                  document.removeEventListener('mousemove', handleMove);
                                  document.removeEventListener('mouseup', handleUp);
                                };
                                
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                              }}
                            >
                              <div className="w-0.5 h-4 bg-white/80 rounded-full" />
                            </div>
                            
                            {/* Content - Draggable center area for moving entire clip */}
                            <div 
                              className="flex-1 flex items-center gap-1 px-1 overflow-hidden cursor-grab active:cursor-grabbing"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingLayerId(audio.id);
                                setSelectedAudioId(audio.id);
                                
                                const startX = e.clientX;
                                const startTime = audio.startTime;
                                const clipDuration = audio.endTime - audio.startTime;
                                const snapThreshold = 10 / PIXELS_PER_SECOND;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  let newStart = Math.max(0, Math.min(duration - clipDuration, startTime + timeDelta));
                                  
                                  // Snap to playhead
                                  const playheadTime = currentTime;
                                  if (Math.abs(newStart - playheadTime) < snapThreshold) {
                                    newStart = playheadTime;
                                    setSnapLinePosition(window.innerWidth / 2);
                                  } else if (Math.abs(newStart + clipDuration - playheadTime) < snapThreshold) {
                                    newStart = playheadTime - clipDuration;
                                    setSnapLinePosition(window.innerWidth / 2);
                                  } else {
                                    // Snap to other audio clips
                                    let snapped = false;
                                    for (const other of audioLayers) {
                                      if (other.id === audio.id) continue;
                                      if (Math.abs(newStart - other.endTime) < snapThreshold) {
                                        newStart = other.endTime;
                                        snapped = true;
                                        break;
                                      }
                                      if (Math.abs(newStart + clipDuration - other.startTime) < snapThreshold) {
                                        newStart = other.startTime - clipDuration;
                                        snapped = true;
                                        break;
                                      }
                                    }
                                    if (!snapped) {
                                      setSnapLinePosition(null);
                                    }
                                  }
                                  
                                  setAudioLayers(prev => prev.map(a => 
                                    a.id === audio.id 
                                      ? { ...a, startTime: newStart, endTime: newStart + clipDuration } 
                                      : a
                                  ));
                                };
                                
                                const handleUp = () => {
                                  setDraggingLayerId(null);
                                  setSnapLinePosition(null);
                                  document.removeEventListener('mousemove', handleMove);
                                  document.removeEventListener('mouseup', handleUp);
                                };
                                
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                              }}
                              onClick={() => {
                                setSelectedAudioId(audio.id);
                                setSelectedTool('audio');
                              }}
                            >
                              <Music className="w-3 h-3 text-white/90 shrink-0" />
                              <span className="text-[10px] text-white font-semibold truncate">
                                {audio.name}
                              </span>
                            </div>
                            
                            {/* Audio waveform visualization */}
                            <div className="flex-1 flex items-center justify-center gap-px px-1">
                              {Array.from({ length: Math.min(20, Math.floor(itemWidth / 6)) }).map((_, i) => (
                                <div 
                                  key={i}
                                  className="w-0.5 bg-white/60 rounded-full"
                                  style={{ height: `${Math.random() * 16 + 4}px` }}
                                />
                              ))}
                            </div>
                            
                            {/* Right trim handle */}
                            <div 
                              className={cn(
                                "w-2.5 h-full rounded-r-md flex items-center justify-center cursor-ew-resize",
                                isSelected ? "bg-white/50" : "bg-white/30"
                              )}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const endTime = audio.endTime;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  const newEnd = Math.min(duration, Math.max(audio.startTime + 0.5, endTime + timeDelta));
                                  setAudioLayers(prev => prev.map(a => 
                                    a.id === audio.id ? { ...a, endTime: newEnd } : a
                                  ));
                                };
                                
                                const handleUp = () => {
                                  document.removeEventListener('mousemove', handleMove);
                                  document.removeEventListener('mouseup', handleUp);
                                };
                                
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                              }}
                            >
                              <div className="w-0.5 h-4 bg-white/80 rounded-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Caption/Subtitle Track - Cyan themed */}
                  {captionLayers.length > 0 && (
                    <div className="relative h-10" style={{ width: trackWidth }}>
                      {captionLayers.map(caption => {
                        const isSelected = caption.id === selectedCaptionId;
                        const leftOffset = caption.startTime * PIXELS_PER_SECOND;
                        const itemWidth = Math.max(50, (caption.endTime - caption.startTime) * PIXELS_PER_SECOND);
                    
                        return (
                          <div
                            key={caption.id}
                            className={cn(
                              "absolute h-[34px] rounded-md flex items-center cursor-grab transition-all active:cursor-grabbing",
                              isSelected 
                                ? "bg-gradient-to-r from-cyan-500 to-cyan-600 ring-2 ring-white shadow-lg shadow-cyan-500/30"
                                : "bg-gradient-to-r from-cyan-600 to-cyan-700 shadow-md shadow-cyan-600/30",
                              draggingLayerId === caption.id && "opacity-90 scale-[1.02] z-10"
                            )}
                            style={{ left: leftOffset, width: itemWidth, top: 3 }}
                          >
                            {/* Left trim handle */}
                            <div 
                              className={cn(
                                "w-2.5 h-full rounded-l-md flex items-center justify-center cursor-ew-resize",
                                isSelected ? "bg-white/50" : "bg-white/30"
                              )}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const startTime = caption.startTime;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  const newStart = Math.max(0, Math.min(caption.endTime - 0.5, startTime + timeDelta));
                                  setCaptionLayers(prev => prev.map(c => 
                                    c.id === caption.id ? { ...c, startTime: newStart } : c
                                  ));
                                };
                                
                                const handleUp = () => {
                                  document.removeEventListener('mousemove', handleMove);
                                  document.removeEventListener('mouseup', handleUp);
                                };
                                
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                              }}
                            >
                              <div className="w-0.5 h-4 bg-white/80 rounded-full" />
                            </div>
                            
                            {/* Content - Draggable center area */}
                            <div 
                              className="flex-1 flex items-center gap-1 px-1 overflow-hidden cursor-grab active:cursor-grabbing"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingLayerId(caption.id);
                                setSelectedCaptionId(caption.id);
                                
                                const startX = e.clientX;
                                const startTime = caption.startTime;
                                const clipDuration = caption.endTime - caption.startTime;
                                const snapThreshold = 10 / PIXELS_PER_SECOND;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  let newStart = Math.max(0, Math.min(duration - clipDuration, startTime + timeDelta));
                                  
                                  // Snap to playhead
                                  const playheadTime = currentTime;
                                  if (Math.abs(newStart - playheadTime) < snapThreshold) {
                                    newStart = playheadTime;
                                    setSnapLinePosition(window.innerWidth / 2);
                                  } else if (Math.abs(newStart + clipDuration - playheadTime) < snapThreshold) {
                                    newStart = playheadTime - clipDuration;
                                    setSnapLinePosition(window.innerWidth / 2);
                                  } else {
                                    setSnapLinePosition(null);
                                  }
                                  
                                  setCaptionLayers(prev => prev.map(c => 
                                    c.id === caption.id 
                                      ? { ...c, startTime: newStart, endTime: newStart + clipDuration } 
                                      : c
                                  ));
                                };
                                
                                const handleUp = () => {
                                  setDraggingLayerId(null);
                                  setSnapLinePosition(null);
                                  document.removeEventListener('mousemove', handleMove);
                                  document.removeEventListener('mouseup', handleUp);
                                };
                                
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                              }}
                              onClick={() => {
                                setSelectedCaptionId(caption.id);
                                setSelectedTool('captions');
                              }}
                            >
                              <Subtitles className="w-3 h-3 text-white/90 shrink-0" />
                              <span className="text-[10px] text-white font-semibold truncate">
                                {caption.text}
                              </span>
                            </div>
                            
                            {/* Right trim handle */}
                            <div 
                              className={cn(
                                "w-2.5 h-full rounded-r-md flex items-center justify-center cursor-ew-resize",
                                isSelected ? "bg-white/50" : "bg-white/30"
                              )}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const endTime = caption.endTime;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  const newEnd = Math.min(duration, Math.max(caption.startTime + 0.5, endTime + timeDelta));
                                  setCaptionLayers(prev => prev.map(c => 
                                    c.id === caption.id ? { ...c, endTime: newEnd } : c
                                  ));
                                };
                                
                                const handleUp = () => {
                                  document.removeEventListener('mousemove', handleMove);
                                  document.removeEventListener('mouseup', handleUp);
                                };
                                
                                document.addEventListener('mousemove', handleMove);
                                document.addEventListener('mouseup', handleUp);
                              }}
                            >
                              <div className="w-0.5 h-4 bg-white/80 rounded-full" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Add Layer Buttons Row */}
                  <div className="flex items-center gap-2" style={{ marginLeft: '110px' }}>
                    {/* Add text */}
                    <button 
                      onClick={addTextOverlay}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: '#2A2A2A', border: '1px solid rgba(139, 92, 246, 0.4)' }}
                    >
                      <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(139, 92, 246, 0.3)' }}>
                        <Plus className="w-3 h-3" style={{ color: '#8B5CF6' }} />
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: '#8B5CF6' }}>Add text</span>
                    </button>
                    
                    {/* Add audio */}
                    <button 
                      onClick={() => audioInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: '#2A2A2A', border: '1px solid rgba(16, 185, 129, 0.4)' }}
                    >
                      <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(16, 185, 129, 0.3)' }}>
                        <Plus className="w-3 h-3" style={{ color: '#10B981' }} />
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: '#10B981' }}>Add audio</span>
                    </button>
                    
                    {/* Add sticker */}
                    <button 
                      onClick={() => toast({ title: "Add Sticker", description: "Coming soon!" })}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: '#2A2A2A', border: '1px solid rgba(236, 72, 153, 0.4)' }}
                    >
                      <div className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(236, 72, 153, 0.3)' }}>
                        <Plus className="w-3 h-3" style={{ color: '#EC4899' }} />
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: '#EC4899' }}>Add sticker</span>
                    </button>
                  </div>
                </div>
                  );
                })()}
              </div>
            </div>

            {/* Bottom Toolbar - Normal tool bar */}
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
          </>
        )
      )}
    </div>
  );
}
