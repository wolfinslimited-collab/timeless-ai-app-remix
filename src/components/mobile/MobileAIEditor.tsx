import { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
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
  Plus,
  ChevronDown,
  ChevronLeft,
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
  MessageSquare,
  Video,
  Gauge,
  Copy,
  Replace,
  Layers,
  Sparkles,
  Crop,
  Wand2,
  Waves,
  Image,
  SplitSquareHorizontal,
  Smile,
  RectangleHorizontal,
  Paintbrush,
  Pencil,
  Captions,
  FileText,
  AudioLines,
  Music2
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const EDITOR_TOOLS: EditorTool[] = [
  { id: "edit", name: "Edit", icon: Scissors },
  { id: "audio", name: "Audio", icon: Music },
  { id: "text", name: "Text", icon: Type },
  { id: "effects", name: "Effects", icon: Star },
  { id: "overlay", name: "Overlay", icon: PictureInPicture2 },
  { id: "captions", name: "Captions", icon: MessageSquareText },
  { id: "filters", name: "Filters", icon: Circle },
  { id: "adjust", name: "Adjust", icon: SlidersHorizontal },
  { id: "stickers", name: "Stickers", icon: Smile },
  { id: "aspect", name: "Aspect", icon: RectangleHorizontal },
  { id: "background", name: "Background", icon: Paintbrush },
];

const QUALITY_OPTIONS = ["720p", "1080p", "2K", "4K"];

// Timeline Sync Engine - Global Constants
const PIXELS_PER_SECOND = 80.0; // Master time-to-pixel ratio
const THUMBNAIL_HEIGHT = 48;

// Video clip model for multi-clip timeline with trim support
interface VideoClip {
  id: string;
  url: string;
  duration: number; // Total source duration
  startTime: number; // Position on timeline (auto-calculated when appending)
  inPoint: number; // Trim in point (0 = start of clip)
  outPoint: number; // Trim out point (duration = end of clip)
}

// Helper to get trimmed duration
const getClipTrimmedDuration = (clip: VideoClip) => clip.outPoint - clip.inPoint;

// Editor state snapshot for undo/redo (without React refs/elements)
interface EditorStateSnapshot {
  videoClips: VideoClip[];
  textOverlays: TextOverlayData[];
  audioLayers: AudioLayerSnapshot[];
  captionLayers: CaptionLayerData[];
  effectLayers: EffectLayerData[];
  timestamp: number;
}

// Audio layer snapshot without HTMLAudioElement
interface AudioLayerSnapshot {
  id: string;
  name: string;
  fileUrl: string;
  volume: number;
  startTime: number;
  endTime: number;
}

// Data-only interfaces for snapshots
interface TextOverlayData {
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

interface CaptionLayerData {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

interface EffectLayerData {
  id: string;
  effectId: string;
  name: string;
  category: string;
  intensity: number;
  startTime: number;
  endTime: number;
}

const MAX_HISTORY_LENGTH = 50;

export function MobileAIEditor({ onBack }: MobileAIEditorProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]); // Multi-clip support
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedTool, setSelectedTool] = useState("edit");
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showQualityPicker, setShowQualityPicker] = useState(false);
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
  
  // Video clip selection and trimming state
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [trimmingClipId, setTrimmingClipId] = useState<string | null>(null);
  const [isTrimmingClipStart, setIsTrimmingClipStart] = useState(false);
  const [isTrimmingClipEnd, setIsTrimmingClipEnd] = useState(false);
  
  // Video clip editing panel state
  const [showClipEditPanel, setShowClipEditPanel] = useState(false);
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [clipSpeed, setClipSpeed] = useState(1.0);
  const [clipVolume, setClipVolume] = useState(1.0);
  
  // Additional editing panel states
  const [showAnimationsPanel, setShowAnimationsPanel] = useState(false);
  const [showBeatsPanel, setShowBeatsPanel] = useState(false);
  const [showCropPanel, setShowCropPanel] = useState(false);
  const [isEditToolbarMode, setIsEditToolbarMode] = useState(false); // Edit toolbar replaces main toolbar

  // Undo/Redo history stacks
  const [undoStack, setUndoStack] = useState<EditorStateSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditorStateSnapshot[]>([]);
  const isRestoringRef = useRef(false);

  // Text overlay state (using top-level interface)
  const [textOverlays, setTextOverlays] = useState<TextOverlayData[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textTab, setTextTab] = useState<'input' | 'font' | 'style' | 'background' | 'align'>('input');
  const [textInput, setTextInput] = useState('');
  const [isEditingTextInline, setIsEditingTextInline] = useState(false);
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  
  // Adjust panel state
  const [adjustPanelTab, setAdjustPanelTab] = useState<'filters' | 'adjust'>('adjust');
  const [adjustSubTab, setAdjustSubTab] = useState<'smart' | 'customize'>('customize');
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<keyof typeof adjustments>('brightness');
  
  // Stickers, Aspect Ratio, Background state
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'9:16' | '1:1' | '16:9' | '4:5' | '21:9'>('16:9');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [backgroundBlur, setBackgroundBlur] = useState(0);
  const [showStickersPanel, setShowStickersPanel] = useState(false);
  
  // Text menu mode state - activated by clicking "+ Add text" row
  const [isTextMenuMode, setIsTextMenuMode] = useState(false);
  const [textMenuTab, setTextMenuTab] = useState<'add-text' | 'auto-captions' | 'stickers' | 'draw'>('add-text');
  
  // Sticker presets
  const stickerCategories = [
    { id: 'emoji', name: 'Emoji', stickers: ['😀', '😂', '🥰', '😎', '🔥', '💯', '⭐', '❤️', '👍', '🎉', '✨', '🚀'] },
    { id: 'shapes', name: 'Shapes', stickers: ['⬤', '◆', '★', '▲', '◯', '□', '♦', '♠', '♥', '♣', '●', '■'] },
    { id: 'arrows', name: 'Arrows', stickers: ['→', '←', '↑', '↓', '↗', '↘', '↙', '↖', '⇒', '⇐', '⇑', '⇓'] },
  ];
  const [selectedStickerCategory, setSelectedStickerCategory] = useState('emoji');
  
  // Aspect ratio presets
  const aspectRatioPresets = [
    { id: '9:16', label: '9:16', width: 9, height: 16, description: 'Vertical' },
    { id: '1:1', label: '1:1', width: 1, height: 1, description: 'Square' },
    { id: '16:9', label: '16:9', width: 16, height: 9, description: 'Landscape' },
    { id: '4:5', label: '4:5', width: 4, height: 5, description: 'Portrait' },
    { id: '21:9', label: '21:9', width: 21, height: 9, description: 'Cinematic' },
  ] as const;
  
  // Background color presets
  const backgroundColorPresets = [
    '#000000', '#FFFFFF', '#1A1A1A', '#2D2D2D', 
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
  ];

  // Caption/Subtitle layer state (using top-level interface)
  const [captionLayers, setCaptionLayers] = useState<CaptionLayerData[]>([]);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [selectedCaptionStyle, setSelectedCaptionStyle] = useState('classic');

  const selectedCaptionLayer = captionLayers.find(c => c.id === selectedCaptionId);

  // Effect layer state (using top-level interface)
  const [effectLayers, setEffectLayers] = useState<EffectLayerData[]>([]);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null);

  const selectedEffectLayer = effectLayers.find(e => e.id === selectedEffectId);

  // Available effects - expanded with filter presets
  const effectPresets = [
    { id: 'bw', name: 'B&W', category: 'Filter', icon: '🖤' },
    { id: 'sepia', name: 'Sepia', category: 'Filter', icon: '🟤' },
    { id: 'vintage', name: 'Vintage', category: 'Filter', icon: '📷' },
    { id: 'blur', name: 'Blur', category: 'Basic', icon: '🌫️' },
    { id: 'glow', name: 'Glow', category: 'Basic', icon: '✨' },
    { id: 'vignette', name: 'Vignette', category: 'Basic', icon: '🔲' },
    { id: 'shake', name: 'Shake', category: 'Motion', icon: '📳' },
    { id: 'zoom-pulse', name: 'Zoom Pulse', category: 'Motion', icon: '🔍' },
    { id: 'film-grain', name: 'Film Grain', category: 'Cinematic', icon: '🎞️' },
    { id: 'vhs', name: 'VHS', category: 'Retro', icon: '📼' },
    { id: 'glitch', name: 'Glitch', category: 'Retro', icon: '⚡' },
    { id: 'chromatic', name: 'Chromatic', category: 'Retro', icon: '🌈' },
    { id: 'letterbox', name: 'Letterbox', category: 'Cinematic', icon: '🎬' },
    { id: 'light-leak', name: 'Light Leak', category: 'Cinematic', icon: '☀️' },
    { id: 'flash', name: 'Flash', category: 'Motion', icon: '💥' },
  ];

  // ============================================
  // UNDO/REDO HISTORY MANAGEMENT
  // ============================================
  
  // Create a snapshot of current editor state
  const createStateSnapshot = (): EditorStateSnapshot => ({
    videoClips: videoClips.map(c => ({ ...c })),
    textOverlays: textOverlays.map(t => ({ ...t })),
    audioLayers: audioLayers.map(a => ({
      id: a.id,
      name: a.name,
      fileUrl: a.fileUrl,
      volume: a.volume,
      startTime: a.startTime,
      endTime: a.endTime,
    })),
    captionLayers: captionLayers.map(c => ({ ...c })),
    effectLayers: effectLayers.map(e => ({ ...e })),
    timestamp: Date.now(),
  });

  // Save current state to undo history (call BEFORE making changes)
  const saveStateToHistory = () => {
    if (isRestoringRef.current) return;
    
    const snapshot = createStateSnapshot();
    setUndoStack(prev => {
      const newStack = [...prev, snapshot];
      if (newStack.length > MAX_HISTORY_LENGTH) {
        return newStack.slice(1);
      }
      return newStack;
    });
    // Clear redo stack when new action is performed
    setRedoStack([]);
  };

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  // Undo last action
  const handleUndo = () => {
    if (!canUndo) {
      toast({ title: "Nothing to undo" });
      return;
    }

    // Save current state to redo stack
    setRedoStack(prev => [...prev, createStateSnapshot()]);

    // Pop and restore previous state
    const previousState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    restoreState(previousState);
    toast({ title: "Undo" });
  };

  // Redo last undone action
  const handleRedo = () => {
    if (!canRedo) {
      toast({ title: "Nothing to redo" });
      return;
    }

    // Save current state to undo stack
    setUndoStack(prev => [...prev, createStateSnapshot()]);

    // Pop and restore redo state
    const redoState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    restoreState(redoState);
    toast({ title: "Redo" });
  };

  // Restore editor state from a snapshot
  const restoreState = (snapshot: EditorStateSnapshot) => {
    isRestoringRef.current = true;

    // Restore video clips
    setVideoClips(snapshot.videoClips.map(c => ({ ...c })));

    // Restore text overlays
    setTextOverlays(snapshot.textOverlays.map(t => ({ ...t })));

    // Restore audio layers (preserve existing audio elements for matching IDs)
    const existingAudioMap = new Map<string, HTMLAudioElement>();
    audioRefs.current.forEach((el, id) => existingAudioMap.set(id, el));

    setAudioLayers(snapshot.audioLayers.map(a => ({ ...a })));

    // Clean up audio elements for removed layers
    existingAudioMap.forEach((el, id) => {
      if (!snapshot.audioLayers.some(a => a.id === id)) {
        el.pause();
        URL.revokeObjectURL(el.src);
        audioRefs.current.delete(id);
      }
    });

    // Restore caption layers
    setCaptionLayers(snapshot.captionLayers.map(c => ({ ...c })));

    // Restore effect layers
    setEffectLayers(snapshot.effectLayers.map(e => ({ ...e })));

    // Clear selections
    setSelectedClipId(null);
    setSelectedTextId(null);
    setSelectedAudioId(null);
    setSelectedCaptionId(null);
    setSelectedEffectId(null);

    setTimeout(() => {
      isRestoringRef.current = false;
    }, 0);
  };

  // ============================================
  // EFFECT LAYER FUNCTIONS (with history)
  // ============================================

  const addEffectLayer = (effectId: string) => {
    const preset = effectPresets.find(e => e.id === effectId);
    if (!preset) return;
    
    saveStateToHistory();
    const newEffect: EffectLayerData = {
      id: Date.now().toString(),
      effectId: preset.id,
      name: preset.name,
      category: preset.category,
      intensity: 0.7,
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, duration || 10),
    };
    setEffectLayers(prev => [...prev, newEffect]);
    setSelectedEffectId(newEffect.id);
    setSelectedTool('effects');
  };

  const updateSelectedEffect = (updates: Partial<EffectLayerData>) => {
    if (!selectedEffectId) return;
    setEffectLayers(prev => prev.map(e => 
      e.id === selectedEffectId ? { ...e, ...updates } : e
    ));
  };

  const deleteEffectLayer = (id: string) => {
    saveStateToHistory();
    setEffectLayers(prev => prev.filter(e => e.id !== id));
    if (selectedEffectId === id) setSelectedEffectId(null);
  };

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
      saveStateToHistory();
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
    saveStateToHistory();
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

  // ============================================
  // UNIFIED PLAYBACK CONTROLLER
  // Multi-layer synchronization engine
  // ============================================
  
  // Calculate total timeline duration from all clips (using trimmed durations)
  // This must be defined BEFORE the playback loop that uses it
  const totalTimelineDuration = videoClips.length > 0 
    ? videoClips.reduce((sum, clip) => sum + getClipTrimmedDuration(clip), 0)
    : duration;
  
  // Track which clip is currently active
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const clipVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // Get the active clip based on current timeline position
  const getActiveClipAtTime = (time: number): { clip: VideoClip; localTime: number } | null => {
    for (const clip of videoClips) {
      const clipEnd = clip.startTime + getClipTrimmedDuration(clip);
      if (time >= clip.startTime && time < clipEnd) {
        const localTime = clip.inPoint + (time - clip.startTime);
        return { clip, localTime };
      }
    }
    // Return last clip if past all clips
    if (videoClips.length > 0) {
      const lastClip = videoClips[videoClips.length - 1];
      return { clip: lastClip, localTime: lastClip.outPoint };
    }
    return null;
  };
  
  // Unified playback - sync all layers to timeline position
  const syncAllLayersToTime = (timelineTime: number) => {
    // 1. Sync video clips - determine which clip should be visible/playing
    const activeResult = getActiveClipAtTime(timelineTime);
    
    if (activeResult) {
      const { clip, localTime } = activeResult;
      const activeIndex = videoClips.findIndex(c => c.id === clip.id);
      
      // Switch video source if different clip
      if (activeIndex !== activeClipIndex && videoRef.current) {
        setActiveClipIndex(activeIndex);
        // Only change source if it's actually different
        if (videoRef.current.src !== clip.url) {
          videoRef.current.src = clip.url;
          videoRef.current.load();
        }
      }
      
      // Seek to correct position within clip
      if (videoRef.current && Math.abs(videoRef.current.currentTime - localTime) > 0.1) {
        videoRef.current.currentTime = localTime;
      }
    }
    
    // 2. Sync audio layers
    audioLayers.forEach(audio => {
      const audioEl = audioRefs.current.get(audio.id);
      if (!audioEl) return;
      
      // Check if current time is within audio range
      if (timelineTime >= audio.startTime && timelineTime <= audio.endTime) {
        const audioTime = timelineTime - audio.startTime;
        
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
  
  // Master playback loop - runs at 60fps for smooth sync
  useEffect(() => {
    if (!isPlaying) return;
    
    let animationId: number;
    let lastTime = performance.now();
    
    const playbackLoop = (now: number) => {
      const deltaMs = now - lastTime;
      lastTime = now;
      
      // Update current time based on real elapsed time
      setCurrentTime(prev => {
        const newTime = prev + (deltaMs / 1000);
        // Loop back to start if past end
        if (newTime >= totalTimelineDuration) {
          return 0;
        }
        return newTime;
      });
      
      animationId = requestAnimationFrame(playbackLoop);
    };
    
    animationId = requestAnimationFrame(playbackLoop);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying, totalTimelineDuration]);
  
  // Sync all layers whenever currentTime changes
  useEffect(() => {
    syncAllLayersToTime(currentTime);
  }, [currentTime, videoClips, audioLayers]);
  
  // Handle unified play/pause for all layers
  const unifiedPlayPause = () => {
    if (isPlaying) {
      // Pause all
      if (videoRef.current) {
        videoRef.current.pause();
      }
      audioLayers.forEach(audio => {
        const audioEl = audioRefs.current.get(audio.id);
        if (audioEl) audioEl.pause();
      });
      setIsPlaying(false);
    } else {
      // Play all - sync first, then play
      syncAllLayersToTime(currentTime);
      
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      
      // Audio layers will be started by the sync function
      setIsPlaying(true);
    }
  };
  
  // Unified seek function
  const unifiedSeekTo = (timelineTime: number) => {
    const clampedTime = Math.max(0, Math.min(timelineTime, totalTimelineDuration));
    setCurrentTime(clampedTime);
    syncAllLayersToTime(clampedTime);
  };

  const availableFonts = ['Roboto', 'Serif', 'Montserrat', 'Impact', 'Comic Sans'];
  const availableColors = ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  const selectedTextOverlay = textOverlays.find(t => t.id === selectedTextId);

  const addTextOverlay = () => {
    saveStateToHistory();
    const newText: TextOverlayData = {
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

  const updateSelectedText = (updates: Partial<TextOverlayData>) => {
    if (!selectedTextId) return;
    setTextOverlays(prev => prev.map(t => 
      t.id === selectedTextId ? { ...t, ...updates } : t
    ));
  };

  const deleteTextOverlay = (id: string) => {
    saveStateToHistory();
    setTextOverlays(prev => prev.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  // Caption/Subtitle functions
  const generateAutoCaptions = async () => {
    if (!videoUrl || !duration) {
      toast({ variant: "destructive", title: "Error", description: "Please load a video first" });
      return;
    }
    
    saveStateToHistory();
    setIsGeneratingCaptions(true);
    toast({ title: "Generating captions", description: "Analyzing audio..." });
    
    try {
      // Mock caption generation - in production this would call a transcription API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate sample captions based on video duration
      const captionDuration = 3; // seconds per caption
      const numCaptions = Math.ceil(duration / captionDuration);
      const newCaptions: CaptionLayerData[] = [];
      
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

  const updateSelectedCaption = (updates: Partial<CaptionLayerData>) => {
    if (!selectedCaptionId) return;
    setCaptionLayers(prev => prev.map(c => 
      c.id === selectedCaptionId ? { ...c, ...updates } : c
    ));
  };

  const deleteCaptionLayer = (id: string) => {
    saveStateToHistory();
    setCaptionLayers(prev => prev.filter(c => c.id !== id));
    if (selectedCaptionId === id) setSelectedCaptionId(null);
  };

  const addCaptionLayer = () => {
    saveStateToHistory();
    const newCaption: CaptionLayerData = {
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

  // Direct local file picking - no server upload
  const handleLocalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setUploadProgress(30);

    try {
      // Create local object URL - no server upload, fully client-side
      const localUrl = URL.createObjectURL(file);
      
      setUploadProgress(70);
      
      // If we already have a video, this is adding a new clip
      if (videoUrl && videoClips.length > 0) {
        // Create a temporary video element to get duration
        const tempVideo = document.createElement('video');
        tempVideo.src = localUrl;
        tempVideo.addEventListener('loadedmetadata', () => {
          addVideoClip(localUrl, tempVideo.duration);
          setIsUploading(false);
        });
        tempVideo.addEventListener('error', () => {
          // Fallback duration
          addVideoClip(localUrl, 10);
          setIsUploading(false);
        });
      } else {
        // First video - set as primary
        setVideoUrl(localUrl);
        setUploadProgress(100);
        toast({
          title: "Video loaded",
          description: "Your video is ready for editing (local)",
        });
        setIsUploading(false);
      }
    } catch (error) {
      console.error("File loading error:", error);
      toast({
        variant: "destructive",
        title: "Load failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Trigger direct file picker
  const handleDirectFilePick = () => {
    fileInputRef.current?.click();
  };

  const togglePlayPause = () => {
    unifiedPlayPause();
  };

  const clearVideo = () => {
    setVideoUrl(null);
    setVideoClips([]);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  };

  // Delete a specific video clip
  const deleteVideoClip = (clipId: string) => {
    saveStateToHistory();
    setVideoClips(prev => {
      const newClips = prev.filter(c => c.id !== clipId);
      // Recalculate start times
      return recalculateClipStartTimes(newClips);
    });
    if (selectedClipId === clipId) setSelectedClipId(null);
    if (editingClipId === clipId) {
      setEditingClipId(null);
      setShowClipEditPanel(false);
    }
    toast({ title: "Clip deleted" });
  };

  // Open clip editing panel
  const openClipEditPanel = (clipId: string) => {
    setEditingClipId(clipId);
    setSelectedClipId(clipId);
    setShowClipEditPanel(true);
    // Initialize clip settings
    const clip = videoClips.find(c => c.id === clipId);
    if (clip) {
      setClipSpeed(1.0);
      setClipVolume(1.0);
    }
  };

  // Split video clip at playhead position
  const splitClipAtPlayhead = (clipId: string) => {
    const clip = videoClips.find(c => c.id === clipId);
    if (!clip) return;
    
    // Calculate local time within the clip
    const localTime = currentTime - clip.startTime;
    if (localTime <= 0.5 || localTime >= getClipTrimmedDuration(clip) - 0.5) {
      toast({ variant: "destructive", title: "Cannot split here", description: "Move playhead to middle of clip" });
      return;
    }
    
    saveStateToHistory();
    
    // Create two clips from the split
    const splitPoint = clip.inPoint + localTime;
    const firstClip: VideoClip = {
      ...clip,
      id: clip.id,
      outPoint: splitPoint,
    };
    const secondClip: VideoClip = {
      id: `${Date.now()}`,
      url: clip.url,
      duration: clip.duration,
      startTime: 0, // Will be recalculated
      inPoint: splitPoint,
      outPoint: clip.outPoint,
    };
    
    setVideoClips(prev => {
      const index = prev.findIndex(c => c.id === clipId);
      if (index === -1) return prev;
      const newClips = [...prev];
      newClips.splice(index, 1, firstClip, secondClip);
      return recalculateClipStartTimes(newClips);
    });
    
    toast({ title: "Clip split" });
    setShowClipEditPanel(false);
  };

  // Duplicate video clip
  const duplicateClip = (clipId: string) => {
    const clip = videoClips.find(c => c.id === clipId);
    if (!clip) return;
    
    saveStateToHistory();
    
    const duplicatedClip: VideoClip = {
      ...clip,
      id: `${Date.now()}`,
      startTime: 0, // Will be recalculated
    };
    
    setVideoClips(prev => {
      const index = prev.findIndex(c => c.id === clipId);
      if (index === -1) return [...prev, duplicatedClip];
      const newClips = [...prev];
      newClips.splice(index + 1, 0, duplicatedClip);
      return recalculateClipStartTimes(newClips);
    });
    
    toast({ title: "Clip duplicated" });
    setShowClipEditPanel(false);
  };

  // Apply clip speed to video
  const applyClipSpeed = () => {
    if (videoRef.current) {
      videoRef.current.playbackRate = clipSpeed;
    }
    toast({ title: "Speed Applied", description: `Playback speed set to ${clipSpeed.toFixed(1)}x` });
  };

  // Apply clip volume to video
  const applyClipVolume = () => {
    if (videoRef.current) {
      videoRef.current.volume = clipVolume;
    }
    toast({ title: "Volume Applied", description: `Clip volume set to ${Math.round(clipVolume * 100)}%` });
  };

  // Animation presets configuration
  const animationPresets = [
    { id: 'fade_in', name: 'Fade In', icon: '🌅' },
    { id: 'fade_out', name: 'Fade Out', icon: '🌆' },
    { id: 'zoom_in', name: 'Zoom In', icon: '🔍' },
    { id: 'zoom_out', name: 'Zoom Out', icon: '🔭' },
    { id: 'slide_left', name: 'Slide Left', icon: '⬅️' },
    { id: 'slide_right', name: 'Slide Right', icon: '➡️' },
    { id: 'rotate', name: 'Rotate', icon: '🔄' },
    { id: 'bounce', name: 'Bounce', icon: '⬆️' },
  ];

  // Beat sync presets configuration
  const beatPresets = [
    { id: 'auto_sync', name: 'Auto Sync', description: 'Sync cuts to beat' },
    { id: 'bass_drop', name: 'Bass Drop', description: 'Emphasize bass hits' },
    { id: 'rhythm', name: 'Rhythm', description: 'Match rhythm pattern' },
    { id: 'tempo', name: 'Tempo', description: 'Match video tempo' },
  ];

  // Crop presets configuration
  const cropPresets = [
    { id: '16:9', name: '16:9', description: 'Landscape' },
    { id: '9:16', name: '9:16', description: 'Portrait' },
    { id: '1:1', name: '1:1', description: 'Square' },
    { id: '4:3', name: '4:3', description: 'Standard' },
    { id: '4:5', name: '4:5', description: 'Instagram' },
    { id: 'free', name: 'Free', description: 'Custom' },
  ];

  // Video clip editing tools configuration
  const clipEditTools = [
    { id: 'split', name: 'Split', icon: SplitSquareHorizontal, action: () => editingClipId && splitClipAtPlayhead(editingClipId) },
    { id: 'volume', name: 'Volume', icon: Volume2, action: () => { applyClipVolume(); } },
    { id: 'animations', name: 'Animations', icon: Sparkles, action: () => { setShowClipEditPanel(false); setShowAnimationsPanel(true); } },
    { id: 'effects', name: 'Effects', icon: Star, action: () => { setSelectedTool('effects'); setShowClipEditPanel(false); } },
    { id: 'delete', name: 'Delete', icon: Trash2, action: () => editingClipId && deleteVideoClip(editingClipId) },
    { id: 'speed', name: 'Speed', icon: Gauge, action: () => { applyClipSpeed(); } },
    { id: 'beats', name: 'Beats', icon: Waves, action: () => { setShowClipEditPanel(false); setShowBeatsPanel(true); } },
    { id: 'crop', name: 'Crop', icon: Crop, action: () => { setShowClipEditPanel(false); setShowCropPanel(true); } },
    { id: 'duplicate', name: 'Duplicate', icon: Copy, action: () => editingClipId && duplicateClip(editingClipId) },
    { id: 'replace', name: 'Replace', icon: Replace, action: () => { handleDirectFilePick(); setShowClipEditPanel(false); } },
    { id: 'overlay', name: 'Overlay', icon: Layers, action: () => { setSelectedTool('overlay'); setShowClipEditPanel(false); } },
    { id: 'adjust', name: 'Adjust', icon: SlidersHorizontal, action: () => { setSelectedTool('adjust'); setShowClipEditPanel(false); } },
    { id: 'filter', name: 'Filter', icon: Wand2, action: () => { setSelectedTool('filters'); setShowClipEditPanel(false); } },
  ];

  // Delete text overlay from timeline
  const deleteTextFromTimeline = (id: string) => {
    saveStateToHistory();
    setTextOverlays(prev => prev.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
    toast({ title: "Text deleted" });
  };

  // Delete caption from timeline  
  const deleteCaptionFromTimeline = (id: string) => {
    saveStateToHistory();
    setCaptionLayers(prev => prev.filter(c => c.id !== id));
    if (selectedCaptionId === id) setSelectedCaptionId(null);
    toast({ title: "Caption deleted" });
  };

  // Delete effect from timeline
  const deleteEffectFromTimeline = (id: string) => {
    saveStateToHistory();
    setEffectLayers(prev => prev.filter(e => e.id !== id));
    if (selectedEffectId === id) setSelectedEffectId(null);
    toast({ title: "Effect deleted" });
  };

  // Delete audio from timeline
  const deleteAudioFromTimeline = (id: string) => {
    saveStateToHistory();
    const audioEl = audioRefs.current.get(id);
    if (audioEl) {
      audioEl.pause();
      URL.revokeObjectURL(audioEl.src);
      audioRefs.current.delete(id);
    }
    setAudioLayers(prev => prev.filter(a => a.id !== id));
    if (selectedAudioId === id) setSelectedAudioId(null);
    toast({ title: "Audio deleted" });
  };

  // Add a new video clip to the end of the timeline
  const addVideoClip = (url: string, clipDuration: number) => {
    const lastClip = videoClips[videoClips.length - 1];
    const startTime = lastClip ? lastClip.startTime + getClipTrimmedDuration(lastClip) : 0;
    
    const newClip: VideoClip = {
      id: Date.now().toString(),
      url,
      duration: clipDuration,
      startTime,
      inPoint: 0,
      outPoint: clipDuration,
    };
    
    setVideoClips(prev => [...prev, newClip]);
    toast({ title: "Video added", description: "Clip appended to timeline" });
  };

  // Recalculate clip start times after a trim operation
  const recalculateClipStartTimes = (clips: VideoClip[]): VideoClip[] => {
    let currentStart = 0;
    return clips.map(clip => {
      const updatedClip = { ...clip, startTime: currentStart };
      currentStart += getClipTrimmedDuration(updatedClip);
      return updatedClip;
    });
  };

  // Initialize first clip when primary video is loaded
  useEffect(() => {
    if (videoUrl && duration > 0 && videoClips.length === 0) {
      setVideoClips([{
        id: 'primary',
        url: videoUrl,
        duration,
        startTime: 0,
        inPoint: 0,
        outPoint: duration,
      }]);
    }
  }, [videoUrl, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToolClick = (tool: EditorTool) => {
    setSelectedTool(tool.id);
    
    // Edit tool switches to edit toolbar mode
    if (tool.id === 'edit') {
      if (videoClips.length > 0) {
        // Select first clip if none selected
        if (!selectedClipId) {
          setSelectedClipId(videoClips[0].id);
          setEditingClipId(videoClips[0].id);
        } else {
          setEditingClipId(selectedClipId);
        }
        setIsEditToolbarMode(true);
      } else {
        toast({ title: "No clip selected", description: "Add a video clip first" });
      }
      return;
    }
    
    // Handle other tools that have implementations
    if (!['adjust', 'text', 'audio', 'captions', 'effects', 'filters', 'overlay'].includes(tool.id)) {
      toast({
        title: tool.name,
        description: "Coming soon!",
      });
    }
  };

  // Handle edit toolbar tool click
  const handleEditToolClick = (toolId: string) => {
    const tool = clipEditTools.find(t => t.id === toolId);
    if (tool) {
      tool.action();
    }
  };

  // Exit edit toolbar mode
  const exitEditToolbarMode = () => {
    setIsEditToolbarMode(false);
    setEditingClipId(null);
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
        onChange={handleLocalFileSelect}
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
                  if (videoRef.current && totalTimelineDuration > 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const progress = clickX / rect.width;
                    const newTime = progress * totalTimelineDuration;
                    videoRef.current.currentTime = newTime;
                    setCurrentTime(newTime);
                  }
                }}
              >
                <div className="relative w-full h-1 bg-white/30 rounded-full">
                  {/* Progress bar */}
                  <div 
                    className="absolute h-full bg-white rounded-full transition-all"
                    style={{ width: `${totalTimelineDuration > 0 ? (currentTime / totalTimelineDuration) * 100 : 0}%` }}
                  />
                  {/* Seek thumb */}
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg transition-all group-hover:scale-125"
                    style={{ left: `calc(${totalTimelineDuration > 0 ? (currentTime / totalTimelineDuration) * 100 : 0}% - 6px)` }}
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
                
                {/* Total duration - uses totalTimelineDuration for multi-clip support */}
                <span className="text-white/60 text-sm font-mono w-[60px] text-right">
                  {formatTime(totalTimelineDuration)}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Video Clip Edit Panel Sheet */}
      <Sheet open={showClipEditPanel} onOpenChange={setShowClipEditPanel}>
        <SheetContent side="bottom" className="bg-[#1a1a1a] border-t border-white/10 rounded-t-3xl p-0 max-h-[60vh]">
          <div className="flex flex-col">
            <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mt-3" />
            
            <SheetHeader className="px-5 pt-4 pb-3">
              <SheetTitle className="text-white text-base font-bold text-center">
                Edit Clip
              </SheetTitle>
            </SheetHeader>

            {/* Speed Control (when editing) */}
            <div className="px-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/70 text-xs">Speed</span>
                <span className="text-white text-xs font-semibold">{clipSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="25"
                max="200"
                value={clipSpeed * 100}
                onChange={(e) => setClipSpeed(Number(e.target.value) / 100)}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] text-white/40 mt-1">
                <span>0.25x</span>
                <span>1x</span>
                <span>2x</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="px-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-white/70" />
                  <span className="text-white/70 text-xs">Clip Volume</span>
                </div>
                <span className="text-white text-xs font-semibold">{Math.round(clipVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={clipVolume * 100}
                onChange={(e) => setClipVolume(Number(e.target.value) / 100)}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>

            {/* Scrollable Tools Grid */}
            <div className="px-4 pb-6 overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 pb-2">
                {clipEditTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={tool.action}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl min-w-[70px] transition-all",
                      tool.id === 'delete' 
                        ? "bg-destructive/15 border border-destructive/30 hover:bg-destructive/25" 
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      tool.id === 'delete' ? "bg-destructive/20" : "bg-white/10"
                    )}>
                      <tool.icon className={cn(
                        "w-5 h-5",
                        tool.id === 'delete' ? "text-destructive" : "text-white"
                      )} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium",
                      tool.id === 'delete' ? "text-destructive" : "text-white/80"
                    )}>
                      {tool.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Animations Panel Sheet */}
      <Sheet open={showAnimationsPanel} onOpenChange={setShowAnimationsPanel}>
        <SheetContent side="bottom" className="bg-card border-t border-border rounded-t-3xl p-0 max-h-[50vh]">
          <div className="flex flex-col">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3" />
            <SheetHeader className="px-5 pt-4 pb-3">
              <SheetTitle className="text-foreground text-base font-bold text-center">
                Animations
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <div className="grid grid-cols-4 gap-3">
                {animationPresets.map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => {
                      toast({ title: anim.name, description: "Animation applied to clip" });
                      setShowAnimationsPanel(false);
                    }}
                    className="flex flex-col items-center gap-2 p-3 bg-secondary rounded-xl border border-border hover:bg-secondary/80 transition-all"
                  >
                    <span className="text-2xl">{anim.icon}</span>
                    <span className="text-[10px] text-foreground/80 font-medium">{anim.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Beats Panel Sheet */}
      <Sheet open={showBeatsPanel} onOpenChange={setShowBeatsPanel}>
        <SheetContent side="bottom" className="bg-card border-t border-border rounded-t-3xl p-0 max-h-[50vh]">
          <div className="flex flex-col">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3" />
            <SheetHeader className="px-5 pt-4 pb-3">
              <SheetTitle className="text-foreground text-base font-bold text-center">
                Beat Sync
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <div className="flex flex-col gap-3">
                {beatPresets.map((beat) => (
                  <button
                    key={beat.id}
                    onClick={() => {
                      toast({ title: beat.name, description: beat.description });
                      setShowBeatsPanel(false);
                    }}
                    className="flex items-center gap-4 p-4 bg-secondary rounded-xl border border-border hover:bg-secondary/80 transition-all"
                  >
                    <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                      <Waves className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-foreground font-semibold text-sm">{beat.name}</p>
                      <p className="text-muted-foreground text-xs">{beat.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Crop Panel Sheet */}
      <Sheet open={showCropPanel} onOpenChange={setShowCropPanel}>
        <SheetContent side="bottom" className="bg-card border-t border-border rounded-t-3xl p-0 max-h-[50vh]">
          <div className="flex flex-col">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3" />
            <SheetHeader className="px-5 pt-4 pb-3">
              <SheetTitle className="text-foreground text-base font-bold text-center">
                Crop & Aspect Ratio
              </SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-6">
              <div className="grid grid-cols-3 gap-3">
                {cropPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      toast({ title: `Crop: ${preset.name}`, description: preset.description });
                      setShowCropPanel(false);
                    }}
                    className="flex flex-col items-center gap-2 p-4 bg-secondary rounded-xl border border-border hover:bg-secondary/80 transition-all"
                  >
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <Crop className="w-5 h-5 text-foreground" />
                    </div>
                    <span className="text-foreground font-semibold text-sm">{preset.name}</span>
                    <span className="text-muted-foreground text-[10px]">{preset.description}</span>
                  </button>
                ))}
              </div>
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
                        <div
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            deleteTextOverlay(overlay.id);
                          }}
                          className="absolute -top-5 -right-5 w-8 h-8 rounded-full bg-destructive flex items-center justify-center shadow-lg cursor-pointer z-50 touch-manipulation"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <X className="w-4 h-4 text-destructive-foreground" />
                        </div>
                        {/* Edit button */}
                        <div
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setIsEditingTextInline(true);
                            setSelectedTool('text');
                          }}
                          className="absolute -top-5 -left-5 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg cursor-pointer z-50 touch-manipulation"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <Type className="w-4 h-4 text-primary-foreground" />
                        </div>
                        {/* Resize handle - interactive scaling */}
                        <div 
                          className="absolute -bottom-4 -right-4 w-7 h-7 rounded-full bg-background border-2 border-primary flex items-center justify-center cursor-se-resize z-50 touch-manipulation"
                          style={{ pointerEvents: 'auto' }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startFontSize = overlay.fontSize;
                            
                            const handleMouseMove = (moveE: MouseEvent) => {
                              const deltaX = moveE.clientX - startX;
                              const deltaY = moveE.clientY - startY;
                              const scaleDelta = (deltaX + deltaY) * 0.3;
                              const newSize = Math.max(12, Math.min(96, startFontSize + scaleDelta));
                              
                              setTextOverlays(prev => prev.map(t => 
                                t.id === overlay.id ? { ...t, fontSize: Math.round(newSize) } : t
                              ));
                            };
                            
                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                            };
                            
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const touch = e.touches[0];
                            const startX = touch.clientX;
                            const startY = touch.clientY;
                            const startFontSize = overlay.fontSize;
                            
                            const handleTouchMove = (moveE: TouchEvent) => {
                              moveE.preventDefault();
                              const currentTouch = moveE.touches[0];
                              const deltaX = currentTouch.clientX - startX;
                              const deltaY = currentTouch.clientY - startY;
                              const scaleDelta = (deltaX + deltaY) * 0.3;
                              const newSize = Math.max(12, Math.min(96, startFontSize + scaleDelta));
                              
                              setTextOverlays(prev => prev.map(t => 
                                t.id === overlay.id ? { ...t, fontSize: Math.round(newSize) } : t
                              ));
                            };
                            
                            const handleTouchEnd = () => {
                              document.removeEventListener('touchmove', handleTouchMove);
                              document.removeEventListener('touchend', handleTouchEnd);
                            };
                            
                            document.addEventListener('touchmove', handleTouchMove, { passive: false });
                            document.addEventListener('touchend', handleTouchEnd);
                          }}
                        >
                          <svg className="w-3 h-3 text-primary" viewBox="0 0 24 24" fill="currentColor">
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
              onClick={handleDirectFilePick}
              className="w-full max-w-sm py-12 bg-white/5 rounded-3xl border-2 border-primary/30 flex flex-col items-center justify-center hover:bg-white/10 transition-colors"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-7">
                <Upload className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-white text-xl font-bold mb-3">Select Video</h2>
              <p className="text-white/50 text-sm text-center mb-3">
                Tap to pick from device
              </p>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20">
                <div className="w-3 h-3 rounded-full bg-emerald-500/50 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-emerald-400 text-xs font-medium">Private • No upload</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Video Control Bar - Below video, above timeline */}
      {videoUrl && duration > 0 && (
        <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
          {/* Time counter - uses totalTimelineDuration for dynamic multi-clip support */}
          <span className="text-white/60 text-xs font-mono">
            {formatTime(currentTime)} / {formatTime(totalTimelineDuration)}
          </span>
          
          {/* Control buttons */}
          <div className="flex items-center gap-1">
            <button 
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-2"
            >
              <Undo2 className={cn(
                "w-5 h-5",
                canUndo ? "text-white/90" : "text-white/30"
              )} />
            </button>
            <button 
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-2"
            >
              <Redo2 className={cn(
                "w-5 h-5",
                canRedo ? "text-white/90" : "text-white/30"
              )} />
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
        (selectedTool === 'text' || selectedTool === 'adjust' || selectedTool === 'audio' || selectedTool === 'captions' || selectedTool === 'effects' || selectedTool === 'stickers' || selectedTool === 'aspect' || selectedTool === 'background') ? (
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
              <span className="text-foreground font-bold text-base">
                {selectedTool === 'text' ? 'Text Editor' : 
                 selectedTool === 'audio' ? 'Audio' : 
                 selectedTool === 'stickers' ? 'Stickers' :
                 selectedTool === 'aspect' ? 'Aspect Ratio' :
                 selectedTool === 'background' ? 'Background' : 'Adjust'}
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
              <div className="flex flex-col">
                {/* Top Tabs: Filters / Adjust */}
                <div className="flex border-b border-border/20">
                  {(['filters', 'adjust'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAdjustPanelTab(tab)}
                      className={cn(
                        "flex-1 py-3 text-sm font-medium capitalize relative transition-colors",
                        adjustPanelTab === tab ? "text-foreground" : "text-foreground/50"
                      )}
                    >
                      {tab}
                      {adjustPanelTab === tab && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
                
                {adjustPanelTab === 'adjust' && (
                  <>
                    {/* Sub-menu: Smart / Customize */}
                    <div className="flex gap-3 px-4 py-3">
                      {(['smart', 'customize'] as const).map((subTab) => (
                        <button
                          key={subTab}
                          onClick={() => setAdjustSubTab(subTab)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-all",
                            adjustSubTab === subTab 
                              ? "bg-primary/20 text-primary border border-primary/40" 
                              : "bg-white/5 text-foreground/60 border border-transparent"
                          )}
                        >
                          {subTab}
                        </button>
                      ))}
                    </div>
                    
                    {/* Horizontal Scrollable Adjustment Icons */}
                    <div className="overflow-x-auto px-2 pb-3">
                      <div className="flex gap-1 min-w-max">
                        {adjustmentTools.map((tool) => {
                          const isSelected = selectedAdjustmentId === tool.id;
                          const value = adjustments[tool.id];
                          const IconComponent = tool.icon;
                          return (
                            <button
                              key={tool.id}
                              onClick={() => setSelectedAdjustmentId(tool.id)}
                              className={cn(
                                "flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-all",
                                isSelected ? "bg-primary/15" : "bg-transparent"
                              )}
                            >
                              <div className={cn(
                                "w-11 h-11 rounded-full flex items-center justify-center mb-1 transition-all",
                                isSelected 
                                  ? "bg-primary text-primary-foreground" 
                                  : value !== 0 
                                    ? "bg-white/15 text-primary" 
                                    : "bg-white/10 text-foreground/70"
                              )}>
                                <IconComponent className="w-5 h-5" />
                              </div>
                              <span className={cn(
                                "text-[10px] font-medium",
                                isSelected ? "text-primary" : value !== 0 ? "text-foreground" : "text-foreground/60"
                              )}>
                                {tool.name}
                              </span>
                              {value !== 0 && (
                                <span className="text-[9px] text-primary font-semibold">
                                  {value >= 0 ? '+' : ''}{Math.round(value * 100)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Single Slider for Selected Adjustment */}
                    <div className="px-4 pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-foreground">
                          {adjustmentTools.find(t => t.id === selectedAdjustmentId)?.name}
                        </span>
                        <span className={cn(
                          "text-sm font-mono px-2 py-0.5 rounded",
                          adjustments[selectedAdjustmentId] !== 0 
                            ? "bg-primary/15 text-primary" 
                            : "bg-white/10 text-foreground/60"
                        )}>
                          {adjustments[selectedAdjustmentId] >= 0 ? '+' : ''}
                          {Math.round(adjustments[selectedAdjustmentId] * 100)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={adjustments[selectedAdjustmentId] * 100}
                        onChange={(e) => setAdjustments(prev => ({
                          ...prev,
                          [selectedAdjustmentId]: Number(e.target.value) / 100
                        }))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, 
                            hsl(var(--primary)) 0%, 
                            hsl(var(--primary)) ${((adjustments[selectedAdjustmentId] + 1) / 2) * 100}%, 
                            rgba(255,255,255,0.1) ${((adjustments[selectedAdjustmentId] + 1) / 2) * 100}%, 
                            rgba(255,255,255,0.1) 100%)`
                        }}
                      />
                    </div>
                    
                    {/* Reset Button - Bottom Left */}
                    <div className="flex justify-start px-4 pb-4">
                      <button
                        onClick={resetAdjustments}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
                      >
                        <svg className="w-5 h-5 text-foreground/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
                
                {adjustPanelTab === 'filters' && (
                  <div className="px-4 py-6 flex flex-col items-center justify-center">
                    <Circle className="w-10 h-10 text-foreground/30 mb-2" />
                    <p className="text-foreground/50 text-sm">Filter presets coming soon</p>
                  </div>
                )}
              </div>
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
                {/* Subtitle Styles Section */}
                <div className="px-4 pb-3">
                  <p className="text-white/70 text-xs mb-2">Subtitle Style</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                      { id: 'classic', name: 'Classic', preview: 'Aa', bgColor: '#000000', textColor: '#FFFFFF' },
                      { id: 'bold', name: 'Bold', preview: 'Aa', bgColor: '#FFFFFF', textColor: '#000000' },
                      { id: 'neon', name: 'Neon', preview: 'Aa', bgColor: '#000000', textColor: '#00FF88' },
                      { id: 'minimal', name: 'Minimal', preview: 'Aa', bgColor: 'transparent', textColor: '#FFFFFF' },
                      { id: 'cinematic', name: 'Cinematic', preview: 'Aa', bgColor: '#1A1A2E', textColor: '#EAB308' },
                      { id: 'karaoke', name: 'Karaoke', preview: 'Aa', bgColor: '#7C3AED', textColor: '#FFFFFF' },
                    ].map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedCaptionStyle(style.id)}
                        className={cn(
                          "flex-shrink-0 w-[70px] h-[70px] rounded-xl flex flex-col items-center justify-center gap-1 border transition-all",
                          selectedCaptionStyle === style.id
                            ? "border-cyan-500 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20"
                            : "border-white/20 hover:border-white/40"
                        )}
                        style={{ backgroundColor: style.bgColor }}
                      >
                        <span className="text-lg font-bold" style={{ color: style.textColor }}>
                          {style.preview}
                        </span>
                        <span className="text-[9px] font-medium" style={{ color: style.textColor, opacity: 0.8 }}>
                          {style.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                
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
                      <Star className="w-5 h-5 text-cyan-400" />
                    )}
                    <span className="text-cyan-400 text-base font-semibold">
                      {isGeneratingCaptions ? 'Generating...' : 'Auto-Generate'}
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
            ) : selectedTool === 'effects' ? (
              // Effects Editor Content
              <>
                {/* Effects Grid */}
                <div className="px-4 pb-4">
                  <p className="text-white/70 text-xs mb-3">Select an effect to add</p>
                  <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                    {effectPresets.map((effect) => (
                      <button
                        key={effect.id}
                        onClick={() => addEffectLayer(effect.id)}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col items-center gap-1"
                      >
                        <span className="text-xl">{effect.icon}</span>
                        <span className="text-[10px] text-white/80 font-medium">{effect.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Selected effect controls */}
                {effectLayers.length > 0 && (
                  <div className="px-4 pb-4 space-y-3">
                    <p className="text-white/70 text-xs">Applied Effects</p>
                    {effectLayers.map((effect) => {
                      const isSelected = effect.id === selectedEffectId;
                      return (
                        <div
                          key={effect.id}
                          onClick={() => setSelectedEffectId(effect.id)}
                          className={cn(
                            "p-3 rounded-xl cursor-pointer transition-all",
                            isSelected 
                              ? "bg-amber-500/20 ring-2 ring-amber-500" 
                              : "bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                isSelected ? "bg-amber-500/30" : "bg-white/10"
                              )}>
                                <Star className={cn("w-4 h-4", isSelected ? "text-amber-400" : "text-white/60")} />
                              </div>
                              <div>
                                <span className="text-white text-sm font-medium block">
                                  {effect.name}
                                </span>
                                <span className="text-white/50 text-[10px]">
                                  {formatTime(effect.startTime)} - {formatTime(effect.endTime)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEffectLayer(effect.id);
                              }}
                              className="p-1.5 rounded-lg bg-destructive/20 hover:bg-destructive/30"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </button>
                          </div>
                          
                          {/* Intensity slider */}
                          {isSelected && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-white/70 text-xs">Intensity</span>
                                <span className="text-white text-xs font-semibold">
                                  {Math.round(effect.intensity * 100)}%
                                </span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={effect.intensity * 100}
                                onChange={(e) => updateSelectedEffect({ intensity: Number(e.target.value) / 100 })}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : selectedTool === 'stickers' ? (
              // Stickers Panel
              <div className="flex flex-col">
                {/* Category tabs */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto">
                  {stickerCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedStickerCategory(cat.id)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                        selectedStickerCategory === cat.id 
                          ? "bg-primary/20 text-primary border border-primary/40" 
                          : "bg-white/5 text-foreground/60 border border-transparent"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                
                {/* Stickers grid */}
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-6 gap-2">
                    {stickerCategories.find(c => c.id === selectedStickerCategory)?.stickers.map((sticker, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          // Add sticker as text overlay
                          const newSticker: TextOverlayData = {
                            id: Date.now().toString(),
                            text: sticker,
                            position: { x: 50, y: 50 },
                            fontSize: 48,
                            textColor: '#FFFFFF',
                            fontFamily: 'Arial',
                            alignment: 'center',
                            hasBackground: false,
                            backgroundColor: '#000000',
                            backgroundOpacity: 0.5,
                            startTime: currentTime,
                            endTime: Math.min(currentTime + 3, duration),
                          };
                          setTextOverlays(prev => [...prev, newSticker]);
                          toast({ title: "Sticker added!" });
                        }}
                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/40 transition-all text-2xl"
                      >
                        {sticker}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedTool === 'aspect' ? (
              // Aspect Ratio Panel
              <div className="flex flex-col px-4 py-4">
                <p className="text-foreground/70 text-xs mb-3">Select aspect ratio</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  {aspectRatioPresets.map((preset) => {
                    const isSelected = selectedAspectRatio === preset.id;
                    // Calculate preview box dimensions
                    const maxSize = 56;
                    const scale = Math.min(maxSize / preset.width, maxSize / preset.height);
                    const previewWidth = preset.width * scale;
                    const previewHeight = preset.height * scale;
                    
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setSelectedAspectRatio(preset.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
                          isSelected 
                            ? "bg-primary/15 ring-2 ring-primary" 
                            : "bg-white/5 hover:bg-white/10"
                        )}
                      >
                        <div 
                          className={cn(
                            "border-2 rounded-sm flex items-center justify-center",
                            isSelected ? "border-primary bg-primary/20" : "border-foreground/30 bg-white/5"
                          )}
                          style={{ width: previewWidth, height: previewHeight }}
                        >
                          <span className="text-[9px] font-semibold text-foreground/70">{preset.label}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-medium",
                          isSelected ? "text-primary" : "text-foreground/60"
                        )}>
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : selectedTool === 'background' ? (
              // Background Panel
              <div className="flex flex-col px-4 py-4">
                {/* Color Presets */}
                <div className="mb-4">
                  <p className="text-foreground/70 text-xs mb-3">Background Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {backgroundColorPresets.map((color) => {
                      const isSelected = backgroundColor === color;
                      return (
                        <button
                          key={color}
                          onClick={() => setBackgroundColor(color)}
                          className={cn(
                            "w-9 h-9 rounded-full transition-all",
                            isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      );
                    })}
                  </div>
                </div>
                
                {/* Blur Slider */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-foreground/70 text-xs">Background Blur</p>
                    <span className="text-foreground text-xs font-mono">{backgroundBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={backgroundBlur}
                    onChange={(e) => setBackgroundBlur(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(backgroundBlur / 50) * 100}%, rgba(255,255,255,0.1) ${(backgroundBlur / 50) * 100}%, rgba(255,255,255,0.1) 100%)`
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          // Normal: Timeline + Toolbar
          <>
            {/* Timeline Section - Multi-Track with Sync Engine (Mobile Optimized) */}
            <div className="h-[200px] shrink-0 bg-[#0D0D0D] overflow-hidden relative">
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
                  const clampedTime = Math.max(0, Math.min(totalTimelineDuration, timeUnderPlayhead));
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
                {/* Calculate dimensions using pixelsPerSecond - use totalTimelineDuration for multi-clip support */}
                {(() => {
                  const trackWidth = totalTimelineDuration * PIXELS_PER_SECOND;
                  
                  return (
                    <div 
                      className="flex flex-col gap-1.5 pt-1"
                      style={{ 
                        paddingLeft: '50%', 
                        paddingRight: '50%',
                        width: trackWidth,
                        boxSizing: 'content-box',
                      }}
                    >
                      {/* Time Ruler using pixelsPerSecond */}
                      <div className="h-6 flex items-end relative" style={{ width: trackWidth }}>
                        {Array.from({ length: Math.ceil(totalTimelineDuration / 2) + 1 }).map((_, i) => {
                          const seconds = i * 2;
                          if (seconds > totalTimelineDuration) return null;
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
                        {Array.from({ length: Math.ceil(totalTimelineDuration) + 1 }).map((_, i) => {
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
                      
                      {/* Video Track Row - multi-clip filmstrip with trim handles */}
                      <div className="flex items-center gap-0">
                        {/* Render all video clips snapped together */}
                        <div className="flex h-[48px]">
                          {videoClips.map((clip, clipIndex) => {
                            const clipWidth = getClipTrimmedDuration(clip) * PIXELS_PER_SECOND;
                            const thumbCount = Math.max(1, Math.ceil(clipWidth / 60));
                            const isFirst = clipIndex === 0;
                            const isLast = clipIndex === videoClips.length - 1;
                            const isSelected = clip.id === selectedClipId;
                            
                            return (
                              <div 
                                key={clip.id}
                                className={cn(
                                  "relative h-[48px] overflow-hidden cursor-pointer transition-all",
                                  isSelected && "ring-2 ring-white shadow-lg"
                                )}
                                style={{ 
                                  borderColor: isSelected ? '#ffffff' : '#AA2222', 
                                  borderWidth: isSelected ? 2.5 : 2,
                                  borderStyle: 'solid',
                                  width: clipWidth,
                                  borderRadius: `${isFirst ? 8 : 0}px ${isLast ? 8 : 0}px ${isLast ? 8 : 0}px ${isFirst ? 8 : 0}px`,
                                  backgroundColor: '#2A1515',
                                  boxShadow: isSelected ? '0 0 12px rgba(170, 34, 34, 0.5)' : undefined,
                                }}
                                onClick={() => setSelectedClipId(clip.id)}
                              >
                                <div className="flex h-full">
                                  {/* Left trim handle */}
                                  <div 
                                    className={cn(
                                      "w-3 h-full flex items-center justify-center cursor-ew-resize z-10 shrink-0",
                                      isSelected ? "bg-white/60" : "bg-[#AA2222]/80"
                                    )}
                                    style={{
                                      borderTopLeftRadius: isFirst ? 6 : 0,
                                      borderBottomLeftRadius: isFirst ? 6 : 0,
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      saveStateToHistory(); // Save before trimming
                                      setTrimmingClipId(clip.id);
                                      setIsTrimmingClipStart(true);
                                      setSelectedClipId(clip.id);
                                      
                                      const startX = e.clientX;
                                      const originalInPoint = clip.inPoint;
                                      
                                      const handleMove = (moveE: MouseEvent) => {
                                        const deltaX = moveE.clientX - startX;
                                        const timeDelta = deltaX / PIXELS_PER_SECOND;
                                        const newInPoint = Math.max(0, Math.min(clip.outPoint - 0.5, originalInPoint + timeDelta));
                                        
                                        setVideoClips(prev => recalculateClipStartTimes(
                                          prev.map(c => c.id === clip.id ? { ...c, inPoint: newInPoint } : c)
                                        ));
                                      };
                                      
                                      const handleUp = () => {
                                        setTrimmingClipId(null);
                                        setIsTrimmingClipStart(false);
                                        document.removeEventListener('mousemove', handleMove);
                                        document.removeEventListener('mouseup', handleUp);
                                      };
                                      
                                      document.addEventListener('mousemove', handleMove);
                                      document.addEventListener('mouseup', handleUp);
                                    }}
                                  >
                                    <div className="w-0.5 h-5 bg-white/90 rounded-full" />
                                  </div>
                                  
                                  {/* Thumbnails content area */}
                                  <div className="flex-1 flex relative overflow-hidden">
                                    {Array.from({ length: thumbCount }).map((_, i) => {
                                      // Adjust thumbTime to account for inPoint
                                      const thumbTime = clip.inPoint + (i / thumbCount) * getClipTrimmedDuration(clip);
                                      return (
                                        <div
                                          key={i}
                                          className="w-[60px] h-full shrink-0 relative overflow-hidden"
                                          style={{
                                            borderRight: i < thumbCount - 1 ? '1px solid rgba(90, 0, 0, 0.4)' : 'none',
                                          }}
                                        >
                                          <div 
                                            className="w-full h-full bg-cover bg-center"
                                            style={{
                                              backgroundImage: `linear-gradient(135deg, rgba(139,0,0,0.3), rgba(90,0,0,0.5))`,
                                              backgroundColor: '#2A1515',
                                            }}
                                          >
                                            <div className="w-full h-full flex items-center justify-center">
                                              <span className="text-[8px] text-white/40 font-mono">
                                                {Math.floor(thumbTime)}s
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    
                                    {/* Clip info overlay when selected */}
                                    {isSelected && (
                                      <div className="absolute left-1 top-0.5 px-1 py-0.5 bg-black/60 rounded text-[9px] text-white font-semibold flex items-center gap-1">
                                        <Video className="w-2.5 h-2.5" />
                                        {getClipTrimmedDuration(clip).toFixed(1)}s
                                      </div>
                                    )}
                                    
                                    {/* Edit button when selected */}
                                    {isSelected && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openClipEditPanel(clip.id);
                                        }}
                                        className="absolute right-7 top-0.5 w-5 h-5 bg-primary/90 hover:bg-primary rounded-full flex items-center justify-center"
                                      >
                                        <Scissors className="w-3 h-3 text-white" />
                                      </button>
                                    )}
                                    
                                    {/* Delete button when selected */}
                                    {isSelected && videoClips.length > 1 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteVideoClip(clip.id);
                                        }}
                                        className="absolute right-1 top-0.5 w-5 h-5 bg-destructive/90 hover:bg-destructive rounded-full flex items-center justify-center"
                                      >
                                        <Trash2 className="w-3 h-3 text-white" />
                                      </button>
                                    )}
                                  </div>
                                  
                                  {/* Right trim handle */}
                                  <div 
                                    className={cn(
                                      "w-3 h-full flex items-center justify-center cursor-ew-resize z-10 shrink-0",
                                      isSelected ? "bg-white/60" : "bg-[#AA2222]/80"
                                    )}
                                    style={{
                                      borderTopRightRadius: isLast ? 6 : 0,
                                      borderBottomRightRadius: isLast ? 6 : 0,
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      saveStateToHistory(); // Save before trimming
                                      setTrimmingClipId(clip.id);
                                      setIsTrimmingClipEnd(true);
                                      setSelectedClipId(clip.id);
                                      
                                      const startX = e.clientX;
                                      const originalOutPoint = clip.outPoint;
                                      
                                      const handleMove = (moveE: MouseEvent) => {
                                        const deltaX = moveE.clientX - startX;
                                        const timeDelta = deltaX / PIXELS_PER_SECOND;
                                        const newOutPoint = Math.min(clip.duration, Math.max(clip.inPoint + 0.5, originalOutPoint + timeDelta));
                                        
                                        setVideoClips(prev => recalculateClipStartTimes(
                                          prev.map(c => c.id === clip.id ? { ...c, outPoint: newOutPoint } : c)
                                        ));
                                      };
                                      
                                      const handleUp = () => {
                                        setTrimmingClipId(null);
                                        setIsTrimmingClipEnd(false);
                                        document.removeEventListener('mousemove', handleMove);
                                        document.removeEventListener('mouseup', handleUp);
                                      };
                                      
                                      document.addEventListener('mousemove', handleMove);
                                      document.addEventListener('mouseup', handleUp);
                                    }}
                                  >
                                    <div className="w-0.5 h-5 bg-white/90 rounded-full" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Fallback for single video without clips array */}
                          {videoClips.length === 0 && videoUrl && (
                            <div 
                              className="relative h-[48px] rounded-lg overflow-hidden border-2 flex"
                              style={{ borderColor: '#AA2222', width: duration * PIXELS_PER_SECOND }}
                            >
                              {Array.from({ length: Math.ceil((duration * PIXELS_PER_SECOND) / 60) }).map((_, i) => {
                                const thumbTime = (i / Math.ceil((duration * PIXELS_PER_SECOND) / 60)) * duration;
                                return (
                                  <div
                                    key={i}
                                    className="w-[60px] h-full shrink-0 relative overflow-hidden"
                                    style={{
                                      borderRight: '1px solid rgba(90, 0, 0, 0.4)',
                                    }}
                                  >
                                    <div 
                                      className="w-full h-full bg-cover bg-center"
                                      style={{
                                        backgroundImage: `linear-gradient(135deg, rgba(139,0,0,0.3), rgba(90,0,0,0.5))`,
                                        backgroundColor: '#2A1515',
                                      }}
                                    >
                                      <div className="w-full h-full flex items-center justify-center">
                                        <span className="text-[8px] text-white/40 font-mono">
                                          {Math.floor(thumbTime)}s
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        
                        {/* Add video button - pinned directly to the right of video clips */}
                        <button 
                          onClick={handleDirectFilePick}
                          className="w-11 h-[48px] bg-white rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.25)] ml-2"
                        >
                          <Plus className="w-6 h-6 text-black" />
                        </button>
                      </div>
                      
                      {/* + Add audio row - sleek semi-transparent track */}
                      <div 
                        className="relative h-10 cursor-pointer group"
                        style={{ width: trackWidth }}
                        onClick={() => audioInputRef.current?.click()}
                      >
                        <div className="h-[34px] mt-[3px] rounded bg-[#2A2A2A] border border-emerald-500/40 hover:border-emerald-500/60 transition-all flex items-center gap-2 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-emerald-500/30 flex items-center justify-center">
                              <Plus className="w-2.5 h-2.5 text-emerald-400" />
                            </div>
                            <span className="text-[11px] text-emerald-400 font-semibold">Add audio</span>
                          </div>
                        </div>
                        {/* Render actual audio layers on top */}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAudioId(audio.id);
                                setSelectedTool('audio');
                              }}
                            >
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
                              
                              <div 
                                className="flex-1 flex items-center gap-1.5 px-1.5 overflow-hidden"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAudioId(audio.id);
                                  setSelectedTool('audio');
                                }}
                              >
                                <Music className="w-3 h-3 text-white/90 shrink-0" />
                                <span className="text-[10px] text-white font-semibold truncate flex-1">
                                  {audio.name}
                                </span>
                                {isSelected && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteAudioFromTimeline(audio.id);
                                    }}
                                    className="w-4 h-4 bg-destructive/90 hover:bg-destructive rounded-full flex items-center justify-center shrink-0"
                                  >
                                    <X className="w-2.5 h-2.5 text-white" />
                                  </button>
                                )}
                              </div>
                              
                              <div className="flex-1 flex items-center justify-center gap-px px-1">
                                {Array.from({ length: Math.min(20, Math.floor(itemWidth / 6)) }).map((_, i) => (
                                  <div 
                                    key={i}
                                    className="w-0.5 bg-white/60 rounded-full"
                                    style={{ height: `${Math.random() * 16 + 4}px` }}
                                  />
                                ))}
                              </div>
                              
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
                      
                      {/* + Add text row - sleek semi-transparent track */}
                      <div 
                        className="relative h-10 cursor-pointer group"
                        style={{ width: trackWidth }}
                        onClick={() => {
                          setIsTextMenuMode(true);
                          setTextMenuTab('add-text');
                        }}
                      >
                        <div className="h-[34px] mt-[3px] rounded bg-[#2A2A2A] border border-primary/40 hover:border-primary/60 transition-all flex items-center gap-2 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-primary/30 flex items-center justify-center">
                              <Plus className="w-2.5 h-2.5 text-primary" />
                            </div>
                            <span className="text-[11px] text-primary font-semibold">Add text</span>
                          </div>
                        </div>
                        {/* Render actual text layers on top */}
                        {textOverlays.map(overlay => {
                          const isSelected = overlay.id === selectedTextId;
                          const leftOffset = overlay.startTime * PIXELS_PER_SECOND;
                          const itemWidth = Math.max(50, (overlay.endTime - overlay.startTime) * PIXELS_PER_SECOND);
                          
                          return (
                            <div
                              key={overlay.id}
                              className={cn(
                                "absolute h-[34px] rounded-md flex items-center cursor-grab transition-all active:cursor-grabbing group",
                                isSelected 
                                  ? "bg-gradient-to-r from-amber-500 to-amber-600 ring-2 ring-white shadow-lg shadow-amber-500/30"
                                  : "bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/30",
                                draggingLayerId === overlay.id && "opacity-90 scale-[1.02] z-10"
                              )}
                              style={{ left: leftOffset, width: itemWidth, top: 3 }}
                              draggable={false}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTextId(overlay.id);
                                setSelectedTool('text');
                              }}
                            >
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
                              
                              <div 
                                className="flex-1 flex items-center gap-1.5 px-1.5 overflow-hidden cursor-grab"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTextId(overlay.id);
                                  setTextInput(overlay.text);
                                  setSelectedTool('text');
                                }}
                              >
                                <Type className="w-3 h-3 text-white/90 shrink-0" />
                                <span className="text-[10px] text-white font-semibold truncate flex-1">
                                  {overlay.text}
                                </span>
                                {isSelected && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTextFromTimeline(overlay.id);
                                    }}
                                    className="w-4 h-4 bg-destructive/90 hover:bg-destructive rounded-full flex items-center justify-center shrink-0"
                                  >
                                    <X className="w-2.5 h-2.5 text-white" />
                                  </button>
                                )}
                              </div>
                              
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
                              <span className="text-[10px] text-white font-semibold truncate flex-1">
                                {caption.text}
                              </span>
                              {/* Delete button when selected */}
                              {isSelected && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCaptionFromTimeline(caption.id);
                                  }}
                                  className="w-4 h-4 bg-destructive/90 hover:bg-destructive rounded-full flex items-center justify-center shrink-0"
                                >
                                  <X className="w-2.5 h-2.5 text-white" />
                                </button>
                              )}
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
                  
                  {/* Effects Track - Amber/Gold themed */}
                  {effectLayers.length > 0 && (
                    <div className="relative h-10" style={{ width: trackWidth }}>
                      {effectLayers.map(effect => {
                        const isSelected = effect.id === selectedEffectId;
                        const leftOffset = effect.startTime * PIXELS_PER_SECOND;
                        const itemWidth = Math.max(50, (effect.endTime - effect.startTime) * PIXELS_PER_SECOND);
                    
                        return (
                          <div
                            key={effect.id}
                            className={cn(
                              "absolute h-[34px] rounded-md flex items-center cursor-grab transition-all active:cursor-grabbing",
                              isSelected 
                                ? "bg-gradient-to-r from-amber-500 to-orange-500 ring-2 ring-white shadow-lg shadow-amber-500/30"
                                : "bg-gradient-to-r from-amber-600 to-orange-600 shadow-md shadow-amber-600/30",
                              draggingLayerId === effect.id && "opacity-90 scale-[1.02] z-10"
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
                                const startTime = effect.startTime;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  const newStart = Math.max(0, Math.min(effect.endTime - 0.5, startTime + timeDelta));
                                  setEffectLayers(prev => prev.map(e => 
                                    e.id === effect.id ? { ...e, startTime: newStart } : e
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
                            
                            {/* Content - Draggable */}
                            <div 
                              className="flex-1 flex items-center gap-1 px-1 overflow-hidden cursor-grab active:cursor-grabbing"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingLayerId(effect.id);
                                setSelectedEffectId(effect.id);
                                
                                const startX = e.clientX;
                                const startTime = effect.startTime;
                                const clipDuration = effect.endTime - effect.startTime;
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
                                  
                                  setEffectLayers(prev => prev.map(e => 
                                    e.id === effect.id 
                                      ? { ...e, startTime: newStart, endTime: newStart + clipDuration } 
                                      : e
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
                                setSelectedEffectId(effect.id);
                                setSelectedTool('effects');
                              }}
                            >
                              <Star className="w-3 h-3 text-white/90 shrink-0" />
                              <span className="text-[10px] text-white font-semibold truncate flex-1">
                                {effect.name}
                              </span>
                              {/* Delete button when selected */}
                              {isSelected && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteEffectFromTimeline(effect.id);
                                  }}
                                  className="w-4 h-4 bg-destructive/90 hover:bg-destructive rounded-full flex items-center justify-center shrink-0"
                                >
                                  <X className="w-2.5 h-2.5 text-white" />
                                </button>
                              )}
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
                                const endTime = effect.endTime;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  const newEnd = Math.min(duration, Math.max(effect.startTime + 0.5, endTime + timeDelta));
                                  setEffectLayers(prev => prev.map(e => 
                                    e.id === effect.id ? { ...e, endTime: newEnd } : e
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
                </div>
              );
            })()}
            </div>
          </div>

          {/* Bottom Toolbar - Switches between main, edit, and text menu mode */}
          <div className="shrink-0 bg-background border-t border-border/10 pb-safe">
            {isTextMenuMode ? (
              /* Text Menu - appears when clicking "+ Add text" on timeline */
              <div className="animate-fade-in">
                {/* Tab Navigation */}
                <div className="flex items-center border-b border-border/20">
                  {/* Back button - Sleek rectangular chevron */}
                  <button
                    onClick={() => setIsTextMenuMode(false)}
                    className="shrink-0 flex items-center justify-center w-8 h-9 ml-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20"
                  >
                    <ChevronLeft className="w-5 h-5 text-primary" />
                  </button>
                  
                  {/* Tab Buttons */}
                  <div className="flex-1 flex px-2">
                    {[
                      { id: 'add-text', label: 'Add text', icon: Type },
                      { id: 'auto-captions', label: 'Auto captions', icon: Subtitles },
                      { id: 'stickers', label: 'Stickers', icon: Smile },
                      { id: 'draw', label: 'Draw', icon: Pencil },
                    ].map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = textMenuTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setTextMenuTab(tab.id as typeof textMenuTab)}
                          className={cn(
                            "flex-1 flex flex-col items-center justify-center py-2.5 relative transition-colors",
                            isActive ? "text-primary" : "text-foreground/60"
                          )}
                        >
                          <TabIcon className="w-4 h-4 mb-1" />
                          <span className="text-[10px] font-medium">{tab.label}</span>
                          {isActive && (
                            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Tab Content */}
                <div className="py-3 px-4">
                  {textMenuTab === 'add-text' && (
                    <div className="flex items-center gap-3">
                      {/* Vertical separator line */}
                      <div className="w-px h-12 bg-border/40" />
                      
                      {/* Text options */}
                      <div className="flex-1 flex gap-2">
                        <button
                          onClick={() => {
                            addTextOverlay();
                            setIsTextMenuMode(false);
                          }}
                          className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <FileText className="w-5 h-5 text-foreground/70" />
                          <span className="text-[11px] text-foreground/80 font-medium">Text template</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            toast({ title: "Text to audio coming soon" });
                          }}
                          className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <AudioLines className="w-5 h-5 text-foreground/70" />
                          <span className="text-[11px] text-foreground/80 font-medium">Text to audio</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            toast({ title: "Auto lyrics coming soon" });
                          }}
                          className="flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <Music2 className="w-5 h-5 text-foreground/70" />
                          <span className="text-[11px] text-foreground/80 font-medium">Auto lyrics</span>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {textMenuTab === 'auto-captions' && (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <Subtitles className="w-8 h-8 text-foreground/50" />
                      <p className="text-sm text-foreground/60 text-center">
                        Auto-generate captions from audio
                      </p>
                      <button
                        onClick={() => {
                          generateAutoCaptions();
                          setIsTextMenuMode(false);
                        }}
                        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm"
                      >
                        Generate Captions
                      </button>
                    </div>
                  )}
                  
                  {textMenuTab === 'stickers' && (
                    <div className="space-y-3">
                      {/* Category tabs */}
                      <div className="flex gap-2">
                        {stickerCategories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedStickerCategory(cat.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                              selectedStickerCategory === cat.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground/70"
                            )}
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                      
                      {/* Sticker grid */}
                      <div className="grid grid-cols-6 gap-2">
                        {stickerCategories
                          .find((c) => c.id === selectedStickerCategory)
                          ?.stickers.map((sticker, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                addTextOverlay();
                                setTextOverlays((prev) => {
                                  const lastOverlay = prev[prev.length - 1];
                                  if (lastOverlay) {
                                    return prev.map((t) =>
                                      t.id === lastOverlay.id ? { ...t, text: sticker, fontSize: 48 } : t
                                    );
                                  }
                                  return prev;
                                });
                                setIsTextMenuMode(false);
                              }}
                              className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-muted rounded-lg transition-colors"
                            >
                              {sticker}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                  
                  {textMenuTab === 'draw' && (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <Pencil className="w-8 h-8 text-foreground/50" />
                      <p className="text-sm text-foreground/60 text-center">
                        Draw on your video
                      </p>
                      <button
                        onClick={() => toast({ title: "Drawing tools coming soon" })}
                        className="px-6 py-2 bg-muted text-foreground/80 rounded-lg font-medium text-sm"
                      >
                        Coming Soon
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : isEditToolbarMode ? (
              /* Edit toolbar with fixed back button */
              <div className="flex items-center py-3 animate-fade-in">
                {/* Fixed Back Icon Button - Sleek rectangular chevron */}
                <button
                  onClick={exitEditToolbarMode}
                  className="shrink-0 flex items-center justify-center w-8 h-9 ml-2 mr-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20"
                >
                  <ChevronLeft className="w-5 h-5 text-primary" />
                </button>
                
                {/* Scrollable Edit Tools */}
                <div className="flex-1 overflow-x-auto">
                  <div className="flex px-1 min-w-max">
                    {clipEditTools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => handleEditToolClick(tool.id)}
                          className={cn(
                            "flex flex-col items-center justify-center w-14 py-1",
                            tool.id === 'delete' && "text-destructive"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-5 h-5 mb-1",
                              tool.id === 'delete' ? "text-destructive" : "text-foreground/80"
                            )}
                          />
                          <span
                            className={cn(
                              "text-[10px]",
                              tool.id === 'delete' ? "text-destructive font-medium" : "text-foreground/70"
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
            ) : (
              /* Main toolbar */
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
                            isSelected ? "text-foreground" : "text-foreground/60"
                          )}
                        />
                        <span
                          className={cn(
                            "text-[11px]",
                            isSelected ? "text-foreground font-medium" : "text-foreground/60"
                          )}
                        >
                          {tool.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            </div>
          </>
        )
      )}
    </div>
  );
}
