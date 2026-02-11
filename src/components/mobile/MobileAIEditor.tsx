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
  Image as ImageIcon,
  SplitSquareHorizontal,
  Smile,
  RectangleHorizontal,
  Paintbrush,
  Pencil,
  Captions,
  FileText,
  AudioLines,
  Music2,
  HelpCircle,
  Check,
  Eraser,
  RotateCw,
  FlipHorizontal,
  Mic,
  Square,
  FolderOpen,
  // Animation icons
  Ban,
  Blend,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  ArrowDownToLine,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move3d,
  FlipVertical,
  TrendingDown,
  Vibrate,
  Activity,
  Heart,
  Wind,
  Zap,
  Flame,
  LucideIcon
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
import { TextEditPanel } from "./TextEditPanel";
import { ProjectManager } from "./ai-editor/ProjectManager";
import type { EditorProject } from "./ai-editor/types";
import { saveProject, generateThumbnail, createNewProject } from "./ai-editor/projectStorage";
import { supabase } from "@/integrations/supabase/client";
import { supabase as timelessSupabase, TIMELESS_SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import AddCreditsDialog from "@/components/AddCreditsDialog";

interface MobileAIEditorProps {
  onBack: () => void;
}

interface EditorTool {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  isAI?: boolean;
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
  { id: "aspect", name: "Aspect", icon: RectangleHorizontal },
  { id: "background", name: "Background", icon: Paintbrush },
];

// Export settings removed - coming soon

// Timeline Sync Engine - Global Constants
const PIXELS_PER_SECOND = 80.0; // Master time-to-pixel ratio
const THUMBNAIL_HEIGHT = 80; // Increased for better quality

// Animation preset data
interface ClipAnimation {
  id: string;
  type: 'in' | 'out' | 'combo';
  duration: number; // in seconds
}

// Video clip model for multi-clip timeline with trim support
interface VideoClip {
  id: string;
  url: string;
  duration: number; // Total source duration
  startTime: number; // Position on timeline (auto-calculated when appending)
  inPoint: number; // Trim in point (0 = start of clip)
  outPoint: number; // Trim out point (duration = end of clip)
  thumbnails?: string[]; // Array of data URLs for frame thumbnails
  volume: number; // Clip volume (0-2, where 1=100%, 2=200%)
  speed: number; // Clip playback speed (0.25-4x)
  animationIn?: ClipAnimation; // Entry animation
  animationOut?: ClipAnimation; // Exit animation
  aiEnhanced?: boolean; // Whether AI auto-adjustments have been applied
  hqUpscaled?: boolean; // Whether AI HQ upscale has been applied
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
  drawingLayers: DrawingLayerData[];
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
  waveformData: number[];
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
  bold: boolean;
  italic: boolean;
  underline: boolean;
  lineHeight: number;
  hasBackground: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  backgroundPadding: number;
  backgroundRadius: number;
  startTime: number;
  endTime: number;
  // Extended text styling properties
  opacity: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  glowEnabled: boolean;
  glowColor: string;
  glowIntensity: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowOpacity: number;
  letterSpacing: number;
  curveAmount: number;
  animation: string;
  bubbleStyle: string;
  // Transform properties
  rotation: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  // Layer order (higher = on top)
  layerOrder: number;
}

// Drawing layer interface for canvas drawings
interface DrawingLayerData {
  id: string;
  strokes: DrawingStroke[];
  startTime: number;
  endTime: number;
}

interface DrawingStroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
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
  filterCSS?: string;
  adjustments?: Partial<typeof defaultAdjustments>;
}

const defaultAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  sharpen: 0,
  highlight: 0,
  shadow: 0,
  temp: 0,
  hue: 0,
};

// Video overlay layer for Picture-in-Picture functionality
interface VideoOverlayData {
  id: string;
  url: string;
  duration: number; // Source video duration
  position: { x: number; y: number }; // Normalized position (0-1)
  size: { width: number; height: number }; // Size in pixels (for display)
  scale: number; // Scale factor
  startTime: number; // Timeline start position
  endTime: number; // Timeline end position
  volume: number; // 0-2 (0-200%)
  opacity: number; // 0-1
  thumbnails?: string[]; // Array of data URLs for frame thumbnails
}

const MAX_HISTORY_LENGTH = 50;

export function MobileAIEditor({ onBack }: MobileAIEditorProps) {
  // Auth & credits
  const { user } = useAuth();
  const { credits, refetch: refetchCredits, hasActiveSubscription } = useCredits();
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const AI_EDIT_CREDIT_COST = 5;
  const AI_UPSCALE_CREDIT_COST = 12;

  // AI Upscale state
  const [isAIUpscaleOpen, setIsAIUpscaleOpen] = useState(false);
  const [isAIUpscaleProcessing, setIsAIUpscaleProcessing] = useState(false);
  const [aiUpscaleProgress, setAiUpscaleProgress] = useState(0);
  const [aiUpscaleResolution, setAiUpscaleResolution] = useState<'1080p' | '4k'>('1080p');

  // Project Manager state
  const [showProjectManager, setShowProjectManager] = useState(true);
  const [currentProject, setCurrentProject] = useState<EditorProject | null>(null);
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoClips, setVideoClips] = useState<VideoClip[]>([]); // Multi-clip support
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [selectedTool, setSelectedTool] = useState("edit");
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  // Output/Export settings
  const [showOutputSettings, setShowOutputSettings] = useState(false);
  const [outputResolution, setOutputResolution] = useState<string>('1080p');
  const [outputFrameRate, setOutputFrameRate] = useState<number>(30);
  const [outputBitrate, setOutputBitrate] = useState<number>(10);
  const [opticalFlowEnabled, setOpticalFlowEnabled] = useState(false);
  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState<string>('');
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const isUserScrollingRef = useRef(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const isAutoScrollingRef = useRef(false);
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
  const [dragTooltip, setDragTooltip] = useState<{ time: number; x: number; y: number } | null>(null);
  
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
  
  // Editing layer type: 'clip' for main video clips, 'overlay' for video overlays
  const [editingLayerType, setEditingLayerType] = useState<'clip' | 'overlay'>('clip');
  
  // Additional editing panel states
  const [showAnimationsPanel, setShowAnimationsPanel] = useState(false);
  const [showBeatsPanel, setShowBeatsPanel] = useState(false);
  const [showCropPanel, setShowCropPanel] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropAspectRatio, setCropAspectRatio] = useState<string>('free');
  const [cropRotation, setCropRotation] = useState(0); // 0, 90, 180, 270
  const [cropMirror, setCropMirror] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 }); // Normalized 0-1
  const [cropDragHandle, setCropDragHandle] = useState<string | null>(null);
  const [cropDragStart, setCropDragStart] = useState({ x: 0, y: 0, box: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } });
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
  const [showTextEditPanel, setShowTextEditPanel] = useState(false);
  // Adjust panel state
  const [adjustPanelTab, setAdjustPanelTab] = useState<'filters' | 'adjust'>('adjust');
  const [adjustSubTab, setAdjustSubTab] = useState<'smart' | 'customize'>('customize');
  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<keyof typeof adjustments>('brightness');
  const [isAIEnhancing, setIsAIEnhancing] = useState(false); // AI auto-adjust loading state
  
  // Stickers, Aspect Ratio, Background state
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>('original');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [backgroundBlur, setBackgroundBlur] = useState(0);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundTab, setBackgroundTab] = useState<'main' | 'color' | 'image' | 'blur'>('main');
  const [showStickersPanel, setShowStickersPanel] = useState(false);
  
  // Video position within frame (for drag repositioning)
  const [videoPosition, setVideoPosition] = useState({ x: 0, y: 0 });
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  
  // Text menu mode state - activated by clicking "+ Add text" row
  const [isTextMenuMode, setIsTextMenuMode] = useState(false);
  const [textMenuTab, setTextMenuTab] = useState<'add-text' | 'auto-captions' | 'stickers' | 'draw'>('add-text');
  
  // Audio menu mode state - activated by clicking "Audio" tool
  const [isAudioMenuMode, setIsAudioMenuMode] = useState(false);
  
  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showRecordingOverlay, setShowRecordingOverlay] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  
  // Edit menu mode state - activated by clicking "Edit" tool
  const [isEditMenuMode, setIsEditMenuMode] = useState(false);
  
  // Magic Edit (AI Edit) state
  const [isMagicEditOpen, setIsMagicEditOpen] = useState(false);
  const [magicEditPrompt, setMagicEditPrompt] = useState('');
  const [isMagicEditProcessing, setIsMagicEditProcessing] = useState(false);
  
  // AI Video Analyzer state
  const [isAIAnalyzerOpen, setIsAIAnalyzerOpen] = useState(false);
  const [isAnalyzerScanning, setIsAnalyzerScanning] = useState(false);
  const [analyzerSummary, setAnalyzerSummary] = useState<string | null>(null);
  const [analyzerSuggestions, setAnalyzerSuggestions] = useState<string[]>([]);
  const [analyzerPrompt, setAnalyzerPrompt] = useState('');
  const [isAnalyzerGenerating, setIsAnalyzerGenerating] = useState(false);
  const [analyzerGenerateProgress, setAnalyzerGenerateProgress] = useState(0);
  const AI_ANALYZER_CREDIT_COST = 5;
  const AI_ANALYZER_GENERATE_CREDIT_COST = 15;
  
  // Effects menu mode state - activated by clicking "Effects" tool
  const [isEffectsMenuMode, setIsEffectsMenuMode] = useState(false);
  
  // Overlay menu mode state - activated by clicking "Overlay" tool
  const [isOverlayMenuMode, setIsOverlayMenuMode] = useState(false);
  
  // Captions menu mode state - activated by clicking "Captions" tool
  const [isCaptionsMenuMode, setIsCaptionsMenuMode] = useState(false);
  
  // Aspect ratio menu mode state - activated by clicking "Aspect" tool
  const [isAspectMenuMode, setIsAspectMenuMode] = useState(false);
  
  // Background menu mode state - activated by clicking "Background" tool
  const [isBackgroundMenuMode, setIsBackgroundMenuMode] = useState(false);
  
  // Adjust menu mode state - activated by clicking "Adjust" tool
  const [isAdjustMenuMode, setIsAdjustMenuMode] = useState(false);
  
  // Draw mode state - activated by clicking "Draw" in Text menu
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [drawTool, setDrawTool] = useState<'brush' | 'eraser'>('brush');
  const [drawColor, setDrawColor] = useState('#FFFFFF');
  const [drawSize, setDrawSize] = useState(5);
  const [drawingLayers, setDrawingLayers] = useState<DrawingLayerData[]>([]);
  const [currentStrokes, setCurrentStrokes] = useState<DrawingStroke[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);
  
  // Drawing undo/redo for strokes (local to current drawing session)
  const [drawUndoStack, setDrawUndoStack] = useState<DrawingStroke[][]>([]);
  const [drawRedoStack, setDrawRedoStack] = useState<DrawingStroke[][]>([]);
  
  // Settings panel overlay state - for stickers panel only
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [settingsPanelType, setSettingsPanelType] = useState<'stickers' | null>(null);
  
  // Base overlay check - isAudioEditMode, isDrawMode, isCropMode are added later
  const isAnyOverlayOpenBase = isEditMenuMode || isAudioMenuMode || isTextMenuMode || isEffectsMenuMode || isOverlayMenuMode || isCaptionsMenuMode || isAspectMenuMode || isBackgroundMenuMode || isAdjustMenuMode || isSettingsPanelOpen || isCropMode || isMagicEditOpen || isAIUpscaleOpen || isAIAnalyzerOpen;
  
  // Sticker presets
  const stickerCategories = [
    { id: 'emoji', name: 'Emoji', stickers: ['😀', '😂', '🥰', '😎', '🔥', '💯', '⭐', '❤️', '👍', '🎉', '✨', '🚀'] },
    { id: 'shapes', name: 'Shapes', stickers: ['⬤', '◆', '★', '▲', '◯', '□', '♦', '♠', '♥', '♣', '●', '■'] },
    { id: 'arrows', name: 'Arrows', stickers: ['→', '←', '↑', '↓', '↗', '↘', '↙', '↖', '⇒', '⇐', '⇑', '⇓'] },
  ];
  const [selectedStickerCategory, setSelectedStickerCategory] = useState('emoji');
  
  // Extended aspect ratio presets
  const aspectRatioPresets = [
    { id: 'original', label: 'Original', width: 16, height: 9 },
    { id: '9:16', label: '9:16', width: 9, height: 16 },
    { id: '16:9', label: '16:9', width: 16, height: 9 },
    { id: '1:1', label: '1:1', width: 1, height: 1 },
    { id: '4:3', label: '4:3', width: 4, height: 3 },
    { id: '3:4', label: '3:4', width: 3, height: 4 },
    { id: '5.8"', label: '5.8"', width: 9, height: 19.5 },
    { id: '128:27', label: '128:27', width: 128, height: 27 },
    { id: '2:1', label: '2:1', width: 2, height: 1 },
    { id: '2.35:1', label: '2.35:1', width: 2.35, height: 1 },
    { id: '1.85:1', label: '1.85:1', width: 1.85, height: 1 },
  ];
  
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

  // Video overlay state (Picture-in-Picture)
  const [videoOverlays, setVideoOverlays] = useState<VideoOverlayData[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [draggingOverlayId, setDraggingOverlayId] = useState<string | null>(null);
  const overlayVideoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const selectedVideoOverlay = videoOverlays.find(o => o.id === selectedOverlayId);

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
      waveformData: a.waveformData || [],
    })),
    captionLayers: captionLayers.map(c => ({ ...c })),
    effectLayers: effectLayers.map(e => ({ ...e })),
    drawingLayers: drawingLayers.map(d => ({
      id: d.id,
      strokes: d.strokes.map(s => ({ ...s, points: [...s.points] })),
      startTime: d.startTime,
      endTime: d.endTime,
    })),
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

    setAudioLayers(snapshot.audioLayers.map(a => ({ ...a, fadeIn: 0, fadeOut: 0, waveformData: a.waveformData || [] })));

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

    // Restore drawing layers
    setDrawingLayers((snapshot.drawingLayers || []).map(d => ({
      ...d,
      strokes: d.strokes.map(s => ({ ...s, points: [...s.points] })),
    })));

    // Clear selections
    setSelectedClipId(null);
    setSelectedTextId(null);
    setSelectedAudioId(null);
    setSelectedCaptionId(null);
    setSelectedEffectId(null);
    setSelectedDrawingId(null);

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
    fadeIn: number; // seconds
    fadeOut: number; // seconds
    waveformData: number[]; // Normalized amplitudes 0-1
  }

  const [audioLayers, setAudioLayers] = useState<AudioLayer[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  
  // Audio editing state
  const [isAudioEditMode, setIsAudioEditMode] = useState(false);
  const [audioEditSubPanel, setAudioEditSubPanel] = useState<'none' | 'volume' | 'fade'>('none');
  const [editingAudioVolume, setEditingAudioVolume] = useState(100); // 0-1000
  const [editingAudioFadeIn, setEditingAudioFadeIn] = useState(0);
  const [editingAudioFadeOut, setEditingAudioFadeOut] = useState(0);

  const selectedAudioLayer = audioLayers.find(a => a.id === selectedAudioId);
  
  // Computed: check if any overlay menu is currently open (to hide main toolbar)
  const isAnyOverlayOpen = isAnyOverlayOpenBase || isAudioEditMode || isDrawMode;
  
  // Drawing color presets
  const drawColorPresets = ['#FFFFFF', '#FF4444', '#44FF44', '#4444FF', '#FFFF44', '#FF44FF', '#44FFFF', '#FFA500', '#FF69B4', '#8B5CF6'];
  
  // Drawing functions
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    isDrawingRef.current = true;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    
    currentStrokeRef.current = {
      id: Date.now().toString(),
      points: [{ x, y }],
      color: drawTool === 'eraser' ? 'eraser' : drawColor,
      size: drawSize,
      tool: drawTool,
    };
  };
  
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current || !canvasRef.current || !currentStrokeRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    
    currentStrokeRef.current.points.push({ x, y });
    renderDrawingCanvas();
  };
  
  const endDrawing = () => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;
    
    // Save undo state
    setDrawUndoStack(prev => [...prev, currentStrokes]);
    setDrawRedoStack([]);
    
    setCurrentStrokes(prev => [...prev, currentStrokeRef.current!]);
    currentStrokeRef.current = null;
  };
  
  const renderDrawingCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get actual display dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Render all strokes
    const allStrokes = [...currentStrokes];
    if (currentStrokeRef.current && currentStrokeRef.current.points) {
      allStrokes.push(currentStrokeRef.current);
    }
    
    allStrokes.forEach(stroke => {
      if (!stroke || !stroke.points || stroke.points.length < 2) return;
      
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.size;
      
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }
      
      const firstPoint = stroke.points[0];
      ctx.moveTo(firstPoint.x * canvas.width, firstPoint.y * canvas.height);
      
      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i];
        ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
      }
      ctx.stroke();
    });
  };
  
  // Undo drawing stroke
  const undoDrawStroke = () => {
    if (currentStrokes.length === 0) {
      toast({ title: "Nothing to undo" });
      return;
    }
    setDrawRedoStack(prev => [...prev, currentStrokes]);
    const previousState = drawUndoStack[drawUndoStack.length - 1] || [];
    setDrawUndoStack(prev => prev.slice(0, -1));
    setCurrentStrokes(previousState);
  };
  
  // Redo drawing stroke
  const redoDrawStroke = () => {
    if (drawRedoStack.length === 0) {
      toast({ title: "Nothing to redo" });
      return;
    }
    setDrawUndoStack(prev => [...prev, currentStrokes]);
    const redoState = drawRedoStack[drawRedoStack.length - 1];
    setDrawRedoStack(prev => prev.slice(0, -1));
    setCurrentStrokes(redoState);
  };
  
  // Clear all drawing strokes
  const clearAllDrawing = () => {
    if (currentStrokes.length === 0) {
      toast({ title: "Nothing to clear" });
      return;
    }
    setDrawUndoStack(prev => [...prev, currentStrokes]);
    setDrawRedoStack([]);
    setCurrentStrokes([]);
  };
  
  // Save drawing as layer
  const saveDrawingAsLayer = () => {
    if (currentStrokes.length === 0) {
      toast({ title: "No drawing to save" });
      return;
    }
    
    saveStateToHistory();
    const videoDuration = duration || 10;
    const defaultDuration = 5; // 5 second default duration
    const layerStart = currentTime;
    const layerEnd = Math.min(layerStart + defaultDuration, videoDuration);
    
    const newLayer: DrawingLayerData = {
      id: Date.now().toString(),
      strokes: [...currentStrokes],
      startTime: layerStart,
      endTime: layerEnd,
    };
    setDrawingLayers(prev => [...prev, newLayer]);
    setCurrentStrokes([]);
    setIsDrawMode(false);
    setIsTextMenuMode(false);
    toast({ title: "Drawing saved to timeline" });
  };
  
  // Delete drawing layer
  const deleteDrawingLayer = (id: string) => {
    saveStateToHistory();
    setDrawingLayers(prev => prev.filter(d => d.id !== id));
    if (selectedDrawingId === id) setSelectedDrawingId(null);
    toast({ title: "Drawing deleted" });
  };

  // Effect to render canvas when strokes change
  useEffect(() => {
    if (isDrawMode) {
      renderDrawingCanvas();
    }
  }, [currentStrokes, isDrawMode]);

  const handleAudioImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create local URL for the audio file
    const audioUrl = URL.createObjectURL(file);
    
    // Extract waveform data from audio file
    const extractWaveform = async (audioBuffer: ArrayBuffer): Promise<number[]> => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await audioContext.decodeAudioData(audioBuffer.slice(0));
      const channelData = buffer.getChannelData(0);
      
      // Sample ~100 points from the audio
      const samples = 100;
      const blockSize = Math.floor(channelData.length / samples);
      const waveform: number[] = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        waveform.push(sum / blockSize);
      }
      
      // Normalize to 0-1
      const max = Math.max(...waveform, 0.01);
      return waveform.map(v => v / max);
    };
    
    // Create audio element to get duration
    const audioElement = new Audio(audioUrl);
    
    // Read the file for waveform extraction
    const arrayBuffer = await file.arrayBuffer();
    let waveformData: number[] = [];
    
    try {
      waveformData = await extractWaveform(arrayBuffer);
    } catch (err) {
      console.warn('Could not extract waveform:', err);
      // Generate placeholder waveform
      waveformData = Array.from({ length: 100 }, (_, i) => 
        0.2 + 0.6 * Math.abs(Math.sin(i * 0.3) * Math.sin(i * 0.1))
      );
    }
    
    audioElement.addEventListener('loadedmetadata', () => {
      saveStateToHistory();
      const audioDuration = audioElement.duration;
      const newAudio: AudioLayer = {
        id: Date.now().toString(),
        name: file.name,
        fileUrl: audioUrl,
        volume: 1.0,
        startTime: currentTime,
        endTime: Math.min(currentTime + audioDuration, duration || 10),
        fadeIn: 0,
        fadeOut: 0,
        waveformData,
      };
      setAudioLayers(prev => [...prev, newAudio]);
      setSelectedAudioId(newAudio.id);
      setIsAudioMenuMode(false);
      setSelectedTool('audio');
      
      // Store reference for sync
      audioRefs.current.set(newAudio.id, audioElement);
      toast({ title: `Audio "${file.name}" added` });
    });

    // Reset input
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  };

  const updateAudioLayer = (id: string, updates: Partial<AudioLayer>) => {
    setAudioLayers(prev => prev.map(a => 
      a.id === id ? { ...a, ...updates } : a
    ));
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
    if (selectedAudioId === id) {
      setSelectedAudioId(null);
      setIsAudioEditMode(false);
    }
    toast({ title: "Audio deleted" });
  };
  
  const splitAudioAtPlayhead = (audioId: string) => {
    const audio = audioLayers.find(a => a.id === audioId);
    if (!audio) return;
    
    // Check if playhead is within audio range
    if (currentTime <= audio.startTime || currentTime >= audio.endTime) {
      toast({ title: "Move playhead within audio clip to split" });
      return;
    }
    
    saveStateToHistory();
    
    // Create two new audio clips
    const firstHalf: AudioLayer = {
      ...audio,
      id: Date.now().toString(),
      endTime: currentTime,
    };
    
    const secondHalf: AudioLayer = {
      ...audio,
      id: (Date.now() + 1).toString(),
      startTime: currentTime,
    };
    
    // Clone audio element for second half
    const originalAudioEl = audioRefs.current.get(audioId);
    if (originalAudioEl) {
      const newAudioEl = new Audio(audio.fileUrl);
      audioRefs.current.set(secondHalf.id, newAudioEl);
    }
    
    setAudioLayers(prev => [
      ...prev.filter(a => a.id !== audioId),
      firstHalf,
      secondHalf,
    ]);
    
    setSelectedAudioId(secondHalf.id);
    toast({ title: "Audio split at playhead" });
  };
  
  const applyAudioVolume = () => {
    if (!selectedAudioId) return;
    const newVolume = editingAudioVolume / 100; // Convert 0-1000 to 0-10
    updateAudioLayer(selectedAudioId, { volume: newVolume });
    
    // Apply to audio element (capped at 1.0 for HTML5)
    const audioEl = audioRefs.current.get(selectedAudioId);
    if (audioEl) {
      audioEl.volume = Math.min(1, newVolume);
    }
    toast({ title: `Volume set to ${editingAudioVolume}%` });
  };
  
  const applyAudioFade = () => {
    if (!selectedAudioId) return;
    updateAudioLayer(selectedAudioId, { 
      fadeIn: editingAudioFadeIn, 
      fadeOut: editingAudioFadeOut 
    });
    toast({ title: "Fade applied" });
  };

  // Start recording audio from microphone
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      recordingChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        if (recordingChunksRef.current.length > 0) {
          const mimeType = mediaRecorder.mimeType;
          const audioBlob = new Blob(recordingChunksRef.current, { type: mimeType });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Create audio element to get duration
          const audioElement = new Audio(audioUrl);
          
          // Generate waveform placeholder
          const waveformData = Array.from({ length: 100 }, (_, i) => 
            0.3 + 0.5 * Math.abs(Math.sin(i * 0.2) * Math.sin(i * 0.05))
          );
          
          audioElement.addEventListener('loadedmetadata', () => {
            saveStateToHistory();
            const recordingName = `Recording ${new Date().toLocaleTimeString()}`;
            const audioDuration = audioElement.duration;
            const videoDuration = duration || 10;
            
            const newAudio: AudioLayer = {
              id: Date.now().toString(),
              name: recordingName,
              fileUrl: audioUrl,
              volume: 1.0,
              startTime: currentTime, // Start at playhead position
              endTime: Math.min(currentTime + audioDuration, videoDuration),
              fadeIn: 0,
              fadeOut: 0,
              waveformData,
            };
            
            setAudioLayers(prev => [...prev, newAudio]);
            setSelectedAudioId(newAudio.id);
            audioRefs.current.set(newAudio.id, audioElement);
            toast({ title: `"${recordingName}" added to timeline` });
          });
        }
        
        setShowRecordingOverlay(false);
        setRecordingDuration(0);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
      };
      
      // Start recording
      mediaRecorder.start(100); // Capture in 100ms chunks
      setIsRecording(true);
      setShowRecordingOverlay(true);
      setIsAudioMenuMode(false);
      setRecordingDuration(0);
      
      // Start timer
      const startTime = Date.now();
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast({ 
        title: "Microphone access denied",
        description: "Please allow microphone access to record audio",
        variant: "destructive"
      });
    }
  };
  
  // Stop recording audio
  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };
  
  // Format recording duration
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
    toast({ title: "Fade applied" });
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
      
      // Apply per-clip speed and volume
      if (videoRef.current) {
        videoRef.current.playbackRate = clip.speed;
        videoRef.current.volume = isMuted ? 0 : Math.min(1, clip.volume);
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
    
    // 3. Sync video overlay layers
    videoOverlays.forEach(overlay => {
      const overlayEl = overlayVideoRefs.current[overlay.id];
      if (!overlayEl) return;
      
      // Check if current time is within overlay range
      if (timelineTime >= overlay.startTime && timelineTime <= overlay.endTime) {
        const overlayTime = timelineTime - overlay.startTime;
        
        // Sync position if drifted
        if (Math.abs(overlayEl.currentTime - overlayTime) > 0.1) {
          overlayEl.currentTime = Math.max(0, Math.min(overlayTime, overlay.duration));
        }
        
        overlayEl.volume = isMuted ? 0 : Math.min(1, overlay.volume);
        
        if (isPlaying && overlayEl.paused) {
          overlayEl.play().catch(() => {});
        } else if (!isPlaying && !overlayEl.paused) {
          overlayEl.pause();
        }
      } else {
        // Outside range, pause
        if (!overlayEl.paused) {
          overlayEl.pause();
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
        // Stop at end (no looping)
        if (newTime >= totalTimelineDuration) {
          setIsPlaying(false);
          return totalTimelineDuration;
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
      // Pause overlay videos
      videoOverlays.forEach(overlay => {
        const overlayEl = overlayVideoRefs.current[overlay.id];
        if (overlayEl) overlayEl.pause();
      });
      setIsPlaying(false);
    } else {
      // If at or near the end, reset to beginning before playing
      let playFromTime = currentTime;
      if (currentTime >= totalTimelineDuration - 0.05) {
        playFromTime = 0;
        setCurrentTime(0);
      }
      
      // Play all - sync first, then play
      syncAllLayersToTime(playFromTime);
      
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      
      // Play overlay videos that should be visible at current time
      videoOverlays.forEach(overlay => {
        if (playFromTime >= overlay.startTime && playFromTime <= overlay.endTime) {
          const overlayEl = overlayVideoRefs.current[overlay.id];
          if (overlayEl) {
            const overlayTime = playFromTime - overlay.startTime;
            overlayEl.currentTime = Math.max(0, Math.min(overlayTime, overlay.duration));
            overlayEl.play().catch(() => {});
          }
        }
      });
      
      // Explicitly start audio layers within user gesture context
      audioLayers.forEach(audio => {
        const audioEl = audioRefs.current.get(audio.id);
        if (!audioEl) return;
        if (playFromTime >= audio.startTime && playFromTime <= audio.endTime) {
          const audioTime = playFromTime - audio.startTime;
          audioEl.currentTime = audioTime;
          audioEl.volume = audio.volume;
          audioEl.play().catch(() => {});
        }
      });
      
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
    const maxOrder = textOverlays.reduce((max, t) => Math.max(max, t.layerOrder || 0), 0);
    const newText: TextOverlayData = {
      id: Date.now().toString(),
      text: 'Sample Text',
      position: { x: 0.5, y: 0.5 },
      fontSize: 24,
      textColor: '#ffffff',
      fontFamily: 'Roboto',
      alignment: 'center',
      bold: false,
      italic: false,
      underline: false,
      lineHeight: 1.4,
      hasBackground: false,
      backgroundColor: '#000000',
      backgroundOpacity: 0.5,
      backgroundPadding: 8,
      backgroundRadius: 4,
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, duration || 10),
      // Extended defaults
      opacity: 1,
      strokeEnabled: false,
      strokeColor: '#000000',
      strokeWidth: 2,
      glowEnabled: false,
      glowColor: '#ffffff',
      glowIntensity: 10,
      shadowEnabled: false,
      shadowColor: '#000000',
      shadowBlur: 4,
      shadowOffsetX: 2,
      shadowOffsetY: 2,
      shadowOpacity: 0.5,
      letterSpacing: 0,
      curveAmount: 0,
      animation: 'none',
      bubbleStyle: 'none',
      // Transform properties
      rotation: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      layerOrder: maxOrder + 1,
    };
    setTextOverlays(prev => [...prev, newText]);
    setSelectedTextId(newText.id);
    setTextInput(newText.text);
    setSelectedTool('text');
    setShowTextEditPanel(true);
  };

  const duplicateTextOverlay = (id: string) => {
    const original = textOverlays.find(t => t.id === id);
    if (!original) return;
    saveStateToHistory();
    const maxOrder = textOverlays.reduce((max, t) => Math.max(max, t.layerOrder || 0), 0);
    const duplicate: TextOverlayData = {
      ...original,
      id: Date.now().toString(),
      position: { x: Math.min(0.9, original.position.x + 0.05), y: Math.min(0.9, original.position.y + 0.05) },
      layerOrder: maxOrder + 1,
    };
    setTextOverlays(prev => [...prev, duplicate]);
    setSelectedTextId(duplicate.id);
    setTextInput(duplicate.text);
    setShowTextEditPanel(true);
    toast({ title: "Text duplicated" });
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

  // Video Overlay functions
  const addVideoOverlay = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      saveStateToHistory();
      
      // Create object URL for the overlay video
      const overlayUrl = URL.createObjectURL(file);
      
      // Get video duration
      const tempVideo = document.createElement('video');
      tempVideo.src = overlayUrl;
      tempVideo.preload = 'metadata';
      
      tempVideo.onloadedmetadata = async () => {
        const overlayDuration = tempVideo.duration;
        
        // Generate thumbnails for the overlay
        const thumbnails: string[] = [];
        const numThumbs = Math.min(10, Math.ceil(overlayDuration * 2)); // 2 per second, max 10
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 60;
        canvas.height = 40;
        
        for (let i = 0; i < numThumbs; i++) {
          const thumbTime = (i / numThumbs) * overlayDuration;
          tempVideo.currentTime = thumbTime;
          await new Promise<void>((resolve) => {
            tempVideo.onseeked = () => {
              if (ctx) {
                ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                thumbnails.push(canvas.toDataURL('image/jpeg', 0.7));
              }
              resolve();
            };
          });
        }
        
        const newOverlay: VideoOverlayData = {
          id: `overlay-${Date.now()}`,
          url: overlayUrl,
          duration: overlayDuration,
          position: { x: 0.75, y: 0.25 }, // Top-right quadrant
          size: { width: 150, height: 100 }, // Default PIP size
          scale: 1,
          startTime: currentTime,
          endTime: Math.min(currentTime + overlayDuration, duration || overlayDuration),
          volume: 0.5, // 50% default
          opacity: 1,
          thumbnails,
        };
        
        setVideoOverlays(prev => [...prev, newOverlay]);
        setSelectedOverlayId(newOverlay.id);
        setIsOverlayMenuMode(false);
        toast({ title: "Overlay added", description: "Drag to reposition, resize with corner handles" });
      };
      
      tempVideo.onerror = () => {
        toast({ variant: "destructive", title: "Error", description: "Failed to load overlay video" });
        URL.revokeObjectURL(overlayUrl);
      };
    };
    input.click();
  };
  
  const updateVideoOverlay = (id: string, updates: Partial<VideoOverlayData>) => {
    setVideoOverlays(prev => prev.map(o => 
      o.id === id ? { ...o, ...updates } : o
    ));
  };
  
  const deleteVideoOverlay = (id: string) => {
    saveStateToHistory();
    const overlay = videoOverlays.find(o => o.id === id);
    if (overlay) {
      URL.revokeObjectURL(overlay.url);
    }
    setVideoOverlays(prev => prev.filter(o => o.id !== id));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
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

  // Build CSS filter string from adjustment values + active AI effects
  const buildVideoFilter = () => {
    // Start with base adjustments
    let adj = { ...adjustments };
    
    // Composite active AI effect adjustments for current time
    const activeEffects = effectLayers.filter(e => 
      e.effectId === 'ai-generated' && 
      e.adjustments && 
      currentTime >= e.startTime && currentTime <= e.endTime
    );
    
    activeEffects.forEach(effect => {
      const ea = effect.adjustments!;
      const intensity = effect.intensity;
      if (ea.brightness !== undefined) adj.brightness = adj.brightness + ea.brightness * intensity;
      if (ea.contrast !== undefined) adj.contrast = adj.contrast + ea.contrast * intensity;
      if (ea.saturation !== undefined) adj.saturation = adj.saturation + ea.saturation * intensity;
      if (ea.hue !== undefined) adj.hue = adj.hue + ea.hue * intensity;
      if (ea.exposure !== undefined) adj.exposure = adj.exposure + ea.exposure * intensity;
      if (ea.temp !== undefined) adj.temp = adj.temp + ea.temp * intensity;
      if (ea.sharpen !== undefined) adj.sharpen = adj.sharpen + ea.sharpen * intensity;
      if (ea.shadow !== undefined) adj.shadow = adj.shadow + ea.shadow * intensity;
      if (ea.highlight !== undefined) adj.highlight = adj.highlight + ea.highlight * intensity;
    });

    const brightness = 1 + adj.brightness * 0.5;
    const contrast = 1 + adj.contrast;
    const saturation = 1 + adj.saturation;
    const exposure = 1 + adj.exposure * 0.5;
    const hueRotate = adj.hue * 180;
    const combinedBrightness = brightness * exposure;
    const sepia = adj.temp > 0 ? adj.temp * 0.3 : 0;
    
    let filter = `brightness(${combinedBrightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${hueRotate}deg) sepia(${sepia})`;
    
    // Append any raw filterCSS from active AI effects
    const activeFilterCSS = effectLayers.filter(e => 
      e.effectId === 'ai-generated' && 
      e.filterCSS && 
      currentTime >= e.startTime && currentTime <= e.endTime
    );
    activeFilterCSS.forEach(effect => {
      filter += ` ${effect.filterCSS}`;
    });
    
    return filter;
  };
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalVideoFileRef = useRef<File | null>(null);
  
  const { toast } = useToast();


  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      // Do NOT set currentTime from video.currentTime here.
      // The playbackLoop (requestAnimationFrame) manages currentTime during playback,
      // and manual scroll sets it during scrubbing. Using video.currentTime directly
      // causes desync because it reflects the raw video element time, not the timeline time.
      
      // Auto-scroll timeline when video is playing (not user scrolling)
      if (isPlaying && !isUserScrollingRef.current && !isAutoScrollingRef.current && timelineRef.current) {
        const targetScroll = currentTime * PIXELS_PER_SECOND;
        isAutoScrollingRef.current = true;
        setIsAutoScrolling(true);
        timelineRef.current.scrollLeft = targetScroll;
        setTimeout(() => { isAutoScrollingRef.current = false; setIsAutoScrolling(false); }, 50);
      }
    };
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
    };
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoUrl, isPlaying, currentTime]);

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
        originalVideoFileRef.current = file;
        setVideoUrl(localUrl);
        setUploadProgress(100);
        // Cache file in IndexedDB for the current project
        if (currentProject) {
          import('./ai-editor/projectStorage').then(({ saveVideoFile }) => {
            saveVideoFile(currentProject.id, file);
          });
        }
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
    setVideoDimensions(null);
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
      volume: clip.volume,
      speed: clip.speed,
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

  // Apply clip speed to the selected clip or overlay
  const applyClipSpeed = () => {
    if (!editingClipId) {
      toast({ title: "No layer selected", description: "Select a layer first" });
      return;
    }
    
    if (editingLayerType === 'overlay') {
      // Speed for overlays - show coming soon message since overlay speed needs more work
      toast({ title: "Speed for overlays", description: "Coming soon!" });
    } else {
      // Update the clip's speed in state
      setVideoClips(prev => prev.map(clip => 
        clip.id === editingClipId ? { ...clip, speed: clipSpeed } : clip
      ));
      
      // Apply real-time preview
      if (videoRef.current) {
        videoRef.current.playbackRate = clipSpeed;
      }
      toast({ title: "Speed Applied", description: `Playback speed set to ${clipSpeed.toFixed(1)}x` });
    }
  };

  // Apply clip volume to the selected clip or overlay (clipVolume is 0-2 where 1=100%, 2=200%)
  const applyClipVolume = () => {
    if (!editingClipId) {
      toast({ title: "No layer selected", description: "Select a layer first" });
      return;
    }
    
    if (editingLayerType === 'overlay') {
      // Update the overlay's volume
      updateVideoOverlay(editingClipId, { volume: clipVolume });
      // Apply real-time preview to overlay video element
      const overlayVideoEl = overlayVideoRefs.current[editingClipId];
      if (overlayVideoEl) {
        overlayVideoEl.volume = Math.min(1, clipVolume);
      }
      toast({ title: "Volume Applied", description: `Overlay volume set to ${Math.round(clipVolume * 100)}` });
    } else {
      // Update the clip's volume in state
      setVideoClips(prev => prev.map(clip => 
        clip.id === editingClipId ? { ...clip, volume: clipVolume } : clip
      ));
      
      // Apply real-time preview if this is the currently playing clip
      if (videoRef.current) {
        videoRef.current.volume = Math.min(1, clipVolume);
      }
      toast({ title: "Volume Applied", description: `Clip volume set to ${Math.round(clipVolume * 100)}` });
    }
  };

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

  // Edit menu sub-panel state
  const [editSubPanel, setEditSubPanel] = useState<'none' | 'volume' | 'speed' | 'animations'>('none');
  
  // Animation state
  const [animationTab, setAnimationTab] = useState<'in' | 'out' | 'combo'>('in');
  const [selectedAnimationPreset, setSelectedAnimationPreset] = useState<string | null>(null);
  const [animationDuration, setAnimationDuration] = useState(0.5);
  
  // Animation presets with Lucide icons
  const animationPresets: Record<'in' | 'out' | 'combo', Array<{ id: string; name: string; icon: LucideIcon }>> = {
    in: [
      { id: 'none', name: 'None', icon: Ban },
      { id: 'fade-in', name: 'Fade', icon: Blend },
      { id: 'slide-left', name: 'Slide Left', icon: ArrowLeftToLine },
      { id: 'slide-right', name: 'Slide Right', icon: ArrowRightToLine },
      { id: 'slide-up', name: 'Slide Up', icon: ArrowUpToLine },
      { id: 'slide-down', name: 'Slide Down', icon: ArrowDownToLine },
      { id: 'zoom-in', name: 'Zoom', icon: ZoomIn },
      { id: 'spin-in', name: 'Spin', icon: RotateCw },
      { id: 'bounce-in', name: 'Bounce', icon: Move3d },
      { id: 'flip-in', name: 'Flip', icon: FlipVertical },
    ],
    out: [
      { id: 'none', name: 'None', icon: Ban },
      { id: 'fade-out', name: 'Fade', icon: Blend },
      { id: 'slide-left-out', name: 'Slide Left', icon: ArrowLeftToLine },
      { id: 'slide-right-out', name: 'Slide Right', icon: ArrowRightToLine },
      { id: 'slide-up-out', name: 'Slide Up', icon: ArrowUpToLine },
      { id: 'slide-down-out', name: 'Slide Down', icon: ArrowDownToLine },
      { id: 'zoom-out', name: 'Zoom', icon: ZoomOut },
      { id: 'spin-out', name: 'Spin', icon: RotateCcw },
      { id: 'shrink', name: 'Shrink', icon: TrendingDown },
      { id: 'flip-out', name: 'Flip', icon: FlipVertical },
    ],
    combo: [
      { id: 'none', name: 'None', icon: Ban },
      { id: 'rock', name: 'Rock', icon: Activity },
      { id: 'swing', name: 'Swing', icon: Vibrate },
      { id: 'pulse', name: 'Pulse', icon: Heart },
      { id: 'shake', name: 'Shake', icon: Vibrate },
      { id: 'wobble', name: 'Wobble', icon: Waves },
      { id: 'float', name: 'Float', icon: Wind },
      { id: 'breathe', name: 'Breathe', icon: Wind },
      { id: 'glitch', name: 'Glitch', icon: Zap },
      { id: 'flash', name: 'Flash', icon: Flame },
    ],
  };
  
  // Apply animation to clip
  const applyAnimationToClip = () => {
    if (!editingClipId || !selectedAnimationPreset) return;
    
    setVideoClips(prev => prev.map(clip => {
      if (clip.id !== editingClipId) return clip;
      
      const animation: ClipAnimation | undefined = selectedAnimationPreset === 'none' ? undefined : {
        id: selectedAnimationPreset,
        type: animationTab,
        duration: animationDuration,
      };
      
      if (animationTab === 'in') {
        return { ...clip, animationIn: animation };
      } else if (animationTab === 'out') {
        return { ...clip, animationOut: animation };
      } else {
        // Combo applies to both
        return { ...clip, animationIn: animation, animationOut: animation };
      }
    }));
    
    toast({ title: selectedAnimationPreset === 'none' ? 'Animation removed' : `${selectedAnimationPreset} animation applied` });
    setEditSubPanel('none');
  };
  
  // Speed mode: 'normal' for linear slider, 'curve' for presets
  const [speedMode, setSpeedMode] = useState<'normal' | 'curve'>('normal');
  
  // Speed curve presets
  const speedCurvePresets = [
    { id: 'montage', name: 'Montage', description: 'Quick cuts with varying speed' },
    { id: 'hero', name: 'Hero', description: 'Slow-mo emphasis on action' },
    { id: 'bullet', name: 'Bullet', description: 'Extreme slow-motion effect' },
    { id: 'jump_cut', name: 'Jump Cut', description: 'Sudden speed changes' },
    { id: 'ramp_up', name: 'Ramp Up', description: 'Gradually accelerate' },
    { id: 'ramp_down', name: 'Ramp Down', description: 'Gradually decelerate' },
  ];
  
  const [selectedSpeedCurve, setSelectedSpeedCurve] = useState<string | null>(null);

  // Speed presets for quick selection (legacy, used in curve mode graph)
  const speedPresets = [
    { value: 0.25, label: '0.25x' },
    { value: 0.5, label: '0.5x' },
    { value: 0.75, label: '0.75x' },
    { value: 1.0, label: '1x' },
    { value: 1.25, label: '1.25x' },
    { value: 1.5, label: '1.5x' },
    { value: 2.0, label: '2x' },
    { value: 3.0, label: '3x' },
  ];

  // Split clip at current playhead position (uses selectedClipId or finds clip under playhead)
  const handleSplitAtPlayhead = () => {
    // If editing an overlay, show coming soon (split for overlays is more complex)
    if (editingLayerType === 'overlay') {
      toast({ title: "Split for overlays", description: "Coming soon!" });
      return;
    }
    
    // Find which clip the playhead is currently over
    let targetClipId = selectedClipId;
    
    if (!targetClipId) {
      // Find clip at current playhead position
      const clipAtPlayhead = videoClips.find(clip => {
        const clipEnd = clip.startTime + getClipTrimmedDuration(clip);
        return currentTime >= clip.startTime && currentTime < clipEnd;
      });
      targetClipId = clipAtPlayhead?.id || null;
    }
    
    if (targetClipId) {
      splitClipAtPlayhead(targetClipId);
    } else {
      toast({ variant: "destructive", title: "No clip to split", description: "Move playhead over a video clip" });
    }
  };

  // Delete current clip or overlay
  const handleDeleteClip = () => {
    // If editing an overlay, delete the overlay
    if (editingLayerType === 'overlay' && editingClipId) {
      deleteVideoOverlay(editingClipId);
      setIsEditMenuMode(false);
      setEditingClipId(null);
      setEditingLayerType('clip');
      return;
    }
    
    let targetClipId = selectedClipId;
    
    if (!targetClipId) {
      const clipAtPlayhead = videoClips.find(clip => {
        const clipEnd = clip.startTime + getClipTrimmedDuration(clip);
        return currentTime >= clip.startTime && currentTime < clipEnd;
      });
      targetClipId = clipAtPlayhead?.id || null;
    }
    
    if (targetClipId) {
      deleteVideoClip(targetClipId);
      setIsEditMenuMode(false);
    } else {
      toast({ variant: "destructive", title: "No clip to delete" });
    }
  };

  // Video clip editing tools configuration - core tools for Edit menu
  const clipEditTools = [
    { id: 'split', name: 'Split', icon: SplitSquareHorizontal, action: handleSplitAtPlayhead },
    { id: 'volume', name: 'Volume', icon: Volume2, action: () => setEditSubPanel('volume') },
    { id: 'speed', name: 'Speed', icon: Gauge, action: () => setEditSubPanel('speed') },
    { id: 'animations', name: 'Animations', icon: Sparkles, action: () => { 
      // Initialize with current clip's animation if exists
      const clip = videoClips.find(c => c.id === editingClipId);
      if (clip?.animationIn) {
        setAnimationTab('in');
        setSelectedAnimationPreset(clip.animationIn.id);
        setAnimationDuration(clip.animationIn.duration);
      } else if (clip?.animationOut) {
        setAnimationTab('out');
        setSelectedAnimationPreset(clip.animationOut.id);
        setAnimationDuration(clip.animationOut.duration);
      } else {
        setSelectedAnimationPreset(null);
        setAnimationDuration(0.5);
      }
      setEditSubPanel('animations'); 
    }},
    { id: 'crop', name: 'Crop', icon: Crop, action: () => { setIsEditMenuMode(false); setIsCropMode(true); setCropBox({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 }); } },
    { id: 'magic-edit', name: 'AI Edit', icon: Wand2, isAI: true, action: () => { setIsMagicEditOpen(true); setMagicEditPrompt(''); setIsEditMenuMode(false); } },
    { id: 'ai-upscale', name: 'AI Upscale', icon: ZoomIn, isAI: true, action: () => { setIsAIUpscaleOpen(true); setIsEditMenuMode(false); } },
    { id: 'ai-analyzer', name: 'AI Analyzer', icon: FileText, isAI: true, action: () => { setIsAIAnalyzerOpen(true); setAnalyzerSummary(null); setAnalyzerSuggestions([]); setAnalyzerPrompt(''); setIsEditMenuMode(false); } },
    { id: 'replace', name: 'Replace', icon: Replace, action: () => { handleDirectFilePick(); } },
    { id: 'delete', name: 'Delete', icon: Trash2, action: handleDeleteClip, isDestructive: true },
  ];

  // Handle Magic Edit submission with credit system
  const handleMagicEditSubmit = async () => {
    if (!magicEditPrompt.trim()) {
      toast({ variant: "destructive", title: "Please enter a prompt" });
      return;
    }

    // Credit check
    if (!hasActiveSubscription) {
      if (credits === null || credits < AI_EDIT_CREDIT_COST) {
        setShowAddCreditsDialog(true);
        return;
      }
    }

    // Close bottom sheet, show loading overlay on video
    setIsMagicEditOpen(false);
    setIsMagicEditProcessing(true);

    try {
      // Get auth token for credit deduction
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-video-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ prompt: magicEditPrompt }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      if (!data.success || !data.effect) throw new Error("Invalid AI response");

      const effect = data.effect;
      
      // Deduct credits
      if (user && !hasActiveSubscription) {
        await supabase
          .from('profiles')
          .update({ credits: Math.max(0, (credits || 0) - AI_EDIT_CREDIT_COST) })
          .eq('user_id', user.id);
        refetchCredits();
      }

      // Store AI adjustments and filterCSS on the effect layer (NOT globally)
      saveStateToHistory();
      const newEffect: EffectLayerData = {
        id: `ai-effect-${Date.now()}`,
        effectId: 'ai-generated',
        name: effect.effectName || 'AI Generated Effect',
        category: effect.category || 'ai',
        intensity: effect.intensity || 0.7,
        startTime: currentTime,
        endTime: Math.min(currentTime + 5, duration || 10),
        filterCSS: effect.filterCSS || undefined,
        adjustments: effect.adjustments || undefined,
      };
      setEffectLayers(prev => [...prev, newEffect]);
      setSelectedEffectId(newEffect.id);

      // Mark clip as AI enhanced
      if (editingClipId) {
        const clipIdx = videoClips.findIndex(c => c.id === editingClipId);
        if (clipIdx >= 0) {
          const updated = [...videoClips];
          updated[clipIdx] = { ...updated[clipIdx], aiEnhanced: true };
          setVideoClips(updated);
        }
      }

      setIsMagicEditProcessing(false);
      toast({ title: "AI Edit Applied", description: effect.description || effect.effectName });
    } catch (err: any) {
      console.error("Magic Edit error:", err);
      setIsMagicEditProcessing(false);
      toast({ variant: "destructive", title: "AI Edit Failed", description: err.message || "Please try again" });
    }
  };

  // Handle AI Video Analyzer - Scan
  const handleAnalyzerScan = async () => {
    if (!hasActiveSubscription) {
      if (credits === null || credits < AI_ANALYZER_CREDIT_COST) {
        setShowAddCreditsDialog(true);
        return;
      }
    }

    setIsAnalyzerScanning(true);
    setAnalyzerSummary(null);
    setAnalyzerSuggestions([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Build video description from metadata
      const clipInfo = videoClips.length > 0 
        ? `Video with ${videoClips.length} clip(s), total duration ${duration?.toFixed(1)}s` 
        : `Video duration: ${duration?.toFixed(1)}s`;
      const dims = videoDimensions ? `, resolution: ${videoDimensions.width}x${videoDimensions.height}` : '';
      const videoDescription = `${clipInfo}${dims}. Current playhead at ${currentTime.toFixed(1)}s.`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-video-analyzer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: 'analyze', videoDescription }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      if (!data.success || !data.analysis) throw new Error("Invalid AI response");

      // Deduct credits
      if (user && !hasActiveSubscription) {
        await supabase
          .from('profiles')
          .update({ credits: Math.max(0, (credits || 0) - AI_ANALYZER_CREDIT_COST) })
          .eq('user_id', user.id);
        refetchCredits();
      }

      setAnalyzerSummary(data.analysis.summary || 'Video content analyzed.');
      setAnalyzerSuggestions(data.analysis.suggestions || []);
    } catch (err: any) {
      console.error("AI Analyzer error:", err);
      toast({ variant: "destructive", title: "Analysis Failed", description: err.message || "Please try again" });
    } finally {
      setIsAnalyzerScanning(false);
    }
  };

  // Handle AI Video Analyzer - Generate & Insert
  const handleAnalyzerGenerate = async () => {
    if (!analyzerPrompt.trim()) {
      toast({ variant: "destructive", title: "Please enter a prompt" });
      return;
    }

    if (!hasActiveSubscription) {
      if (credits === null || credits < AI_ANALYZER_GENERATE_CREDIT_COST) {
        setShowAddCreditsDialog(true);
        return;
      }
    }

    setIsAIAnalyzerOpen(false);
    setIsAnalyzerGenerating(true);
    setAnalyzerGenerateProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setAnalyzerGenerateProgress(prev => Math.min(prev + 2, 90));
    }, 500);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      // Step 1: Enhance the prompt
      const promptRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-video-analyzer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: 'generate-prompt', suggestionPrompt: analyzerPrompt }),
      });

      if (!promptRes.ok) {
        const errData = await promptRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to enhance prompt');
      }

      const promptData = await promptRes.json();
      const enhancedPrompt = promptData.enhancedPrompt || analyzerPrompt;

      setAnalyzerGenerateProgress(30);

      // Step 2: Generate video via the generate edge function
      const genRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'video',
          model: 'wan-2.6',
          prompt: enhancedPrompt,
          aspectRatio: '16:9',
          duration: 5,
          quality: '720p',
        }),
      });

      if (!genRes.ok) {
        const errData = await genRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Video generation failed');
      }

      const genData = await genRes.json();
      setAnalyzerGenerateProgress(60);

      // Poll for completion if we got a generationId
      if (genData.generationId) {
        let attempts = 0;
        const maxAttempts = 120;
        let videoUrl: string | null = null;

        while (attempts < maxAttempts && !videoUrl) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          attempts++;
          setAnalyzerGenerateProgress(Math.min(60 + (attempts / maxAttempts) * 35, 95));

          const checkRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-generation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ generationId: genData.generationId }),
          });

          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.status === 'completed' && checkData.output_url) {
              videoUrl = checkData.output_url;
            } else if (checkData.status === 'failed') {
              throw new Error('Video generation failed');
            }
          }
        }

        if (!videoUrl) throw new Error('Video generation timed out');

        // Insert as new clip at playhead position
        setAnalyzerGenerateProgress(100);
        clearInterval(progressInterval);

        saveStateToHistory();
        const newClip: VideoClip = {
          id: `clip-${Date.now()}`,
          url: videoUrl,
          duration: 5,
          startTime: currentTime,
          inPoint: 0,
          outPoint: 5,
          volume: 1,
          speed: 1,
          aiEnhanced: true,
        };

        setVideoClips(prev => {
          const updated = [...prev, newClip];
          // Recalculate start times
          let pos = 0;
          return updated.sort((a, b) => a.startTime - b.startTime).map(c => {
            const clip = { ...c, startTime: pos };
            pos += getClipTrimmedDuration(clip);
            return clip;
          });
        });

        toast({ title: "AI Clip Inserted", description: "New AI-generated clip added to timeline at playhead position." });
      } else {
        throw new Error('No generation ID returned');
      }
    } catch (err: any) {
      console.error("AI Analyzer generate error:", err);
      toast({ variant: "destructive", title: "Generation Failed", description: err.message || "Please try again" });
    } finally {
      clearInterval(progressInterval);
      setIsAnalyzerGenerating(false);
      setAnalyzerGenerateProgress(0);
    }
  };


  const handleAIUpscaleSubmit = async () => {
    // Credit check
    if (!hasActiveSubscription) {
      if (credits === null || credits < AI_UPSCALE_CREDIT_COST) {
        setShowAddCreditsDialog(true);
        return;
      }
    }

    const currentClip = videoClips.find(c => c.id === editingClipId);
    if (!currentClip?.url) {
      toast({ variant: "destructive", title: "No video clip selected" });
      return;
    }

    setIsAIUpscaleOpen(false);
    setIsAIUpscaleProcessing(true);
    setAiUpscaleProgress(0);

    // Simulate progress animation
    const progressInterval = setInterval(() => {
      setAiUpscaleProgress(prev => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 8;
      });
    }, 800);

    try {
      const { data: { session } } = await timelessSupabase.auth.getSession();
      const authToken = session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          tool: 'ai-upscale',
          videoUrl: currentClip.url,
          resolution: aiUpscaleResolution,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${response.status})`);
      }

      const data = await response.json();
      
      setAiUpscaleProgress(100);
      
      // Mark clip as HQ upscaled
      saveStateToHistory();
      if (editingClipId) {
        setVideoClips(prev => prev.map(clip =>
          clip.id === editingClipId
            ? { ...clip, hqUpscaled: true, aiEnhanced: true }
            : clip
        ));
      }

      // Deduct credits locally
      if (user && !hasActiveSubscription) {
        refetchCredits();
      }

      setTimeout(() => {
        setIsAIUpscaleProcessing(false);
        setAiUpscaleProgress(0);
        toast({ 
          title: "AI Upscale Complete", 
          description: `Video enhanced to ${aiUpscaleResolution.toUpperCase()} with Topaz AI` 
        });
      }, 500);

    } catch (err: any) {
      clearInterval(progressInterval);
      console.error("AI Upscale error:", err);
      setIsAIUpscaleProcessing(false);
      setAiUpscaleProgress(0);
      toast({ variant: "destructive", title: "AI Upscale Failed", description: err.message || "Please try again" });
    }
  };

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

  // Extract thumbnails from a video URL
  const extractThumbnails = async (url: string, clipDuration: number, clipId: string, numThumbnails: number = 10): Promise<void> => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = url;
    video.muted = true;
    
    return new Promise((resolve) => {
      video.addEventListener('loadedmetadata', async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve();
          return;
        }
        
        // Set canvas size proportional to thumbnail height
        const aspectRatio = video.videoWidth / video.videoHeight;
        canvas.height = THUMBNAIL_HEIGHT;
        canvas.width = Math.round(THUMBNAIL_HEIGHT * aspectRatio);
        
        const thumbnails: string[] = [];
        const actualThumbnails = Math.min(numThumbnails, Math.ceil(clipDuration * 2)); // At most 2 per second
        
        for (let i = 0; i < actualThumbnails; i++) {
          const time = (i / actualThumbnails) * clipDuration;
          
          try {
            video.currentTime = time;
            await new Promise<void>((seekResolve) => {
              const onSeeked = () => {
                video.removeEventListener('seeked', onSeeked);
                seekResolve();
              };
              video.addEventListener('seeked', onSeeked);
            });
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            thumbnails.push(canvas.toDataURL('image/jpeg', 0.85)); // Higher quality
          } catch (e) {
            console.warn('Failed to extract thumbnail at', time);
          }
        }
        
        // Update the clip with thumbnails
        setVideoClips(prev => prev.map(clip => 
          clip.id === clipId ? { ...clip, thumbnails } : clip
        ));
        
        video.remove();
        resolve();
      });
      
      video.addEventListener('error', () => {
        console.warn('Failed to load video for thumbnails');
        resolve();
      });
    });
  };

  // Add a new video clip to the end of the timeline
  const addVideoClip = (url: string, clipDuration: number) => {
    const lastClip = videoClips[videoClips.length - 1];
    const startTime = lastClip ? lastClip.startTime + getClipTrimmedDuration(lastClip) : 0;
    
    const clipId = Date.now().toString();
    const newClip: VideoClip = {
      id: clipId,
      url,
      duration: clipDuration,
      startTime,
      inPoint: 0,
      outPoint: clipDuration,
      thumbnails: [],
      volume: 1.0,
      speed: 1.0,
    };
    
    setVideoClips(prev => [...prev, newClip]);
    toast({ title: "Video added", description: "Clip appended to timeline" });
    
    // Extract thumbnails async
    extractThumbnails(url, clipDuration, clipId, 15);
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
      const clipId = 'primary';
      setVideoClips([{
        id: clipId,
        url: videoUrl,
        duration,
        startTime: 0,
        inPoint: 0,
        outPoint: duration,
        thumbnails: [],
        volume: 1.0,
        speed: 1.0,
      }]);
      
      // Extract thumbnails for the primary clip
      extractThumbnails(videoUrl, duration, clipId, 15);
    }
  }, [videoUrl, duration, videoClips.length]);

  // Keep primary clip duration in sync.
  // On some browsers, loadedmetadata can initially report ~5s before the full duration is known.
  // If the clip hasn't been trimmed yet (inPoint=0 and outPoint===old duration), update it.
  useEffect(() => {
    if (!videoUrl || duration <= 0) return;

    setVideoClips(prev => {
      if (prev.length !== 1) return prev;
      const clip = prev[0];
      if (clip.id !== 'primary') return prev;
      if (clip.url !== videoUrl) return prev;

      const hasBeenTrimmed = clip.inPoint !== 0 || clip.outPoint !== clip.duration;
      if (hasBeenTrimmed) return prev;

      // Only update if we learned a longer duration
      if (duration > clip.duration + 0.01) {
        return [{ ...clip, duration, outPoint: duration }];
      }

      return prev;
    });
  }, [videoUrl, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToolClick = (tool: EditorTool) => {
    // Audio tool opens the audio menu
    if (tool.id === 'audio') {
      setIsAudioMenuMode(true);
      setSelectedTool('audio');
      return;
    }
    
    // Text tool opens the text menu
    if (tool.id === 'text') {
      setIsTextMenuMode(true);
      setTextMenuTab('add-text');
      setSelectedTool('text');
      return;
    }
    
    // Effects tool opens the effects menu
    if (tool.id === 'effects') {
      setIsEffectsMenuMode(true);
      setSelectedTool('effects');
      return;
    }
    
    // Captions tool opens the captions menu
    if (tool.id === 'captions') {
      setIsCaptionsMenuMode(true);
      setSelectedTool('captions');
      return;
    }
    
    setSelectedTool(tool.id);
    
    // Edit tool opens the edit menu (same style as audio)
    if (tool.id === 'edit') {
      if (videoClips.length > 0) {
        // Always select the first clip (original layer) when clicking Edit button
        const targetClipId = videoClips[0].id;
        setSelectedClipId(targetClipId);
        setEditingClipId(targetClipId);
        setEditingLayerType('clip'); // Editing main video clip
        
        // Load the selected clip's volume and speed
        const targetClip = videoClips[0];
        setClipVolume(targetClip.volume);
        setClipSpeed(targetClip.speed);
        
        setIsEditMenuMode(true);
      } else {
        toast({ title: "No clip selected", description: "Add a video clip first" });
      }
      return;
    }
    
    // Overlay tool opens the overlay menu
    if (tool.id === 'overlay') {
      setIsOverlayMenuMode(true);
      setSelectedTool('overlay');
      return;
    }
    
    // Aspect tool opens the aspect ratio menu
    if (tool.id === 'aspect') {
      setIsAspectMenuMode(true);
      setSelectedTool('aspect');
      return;
    }
    
    // Background tool opens the background menu
    if (tool.id === 'background') {
      setIsBackgroundMenuMode(true);
      setBackgroundTab('main');
      setSelectedTool('background');
      return;
    }
    
    // Adjust tool opens the adjust menu overlay
    if (tool.id === 'adjust') {
      setIsAdjustMenuMode(true);
      setSelectedTool('adjust');
      return;
    }
    
    // Settings panel tools - open as overlay (stickers only now)
    if (tool.id === 'stickers') {
      setSettingsPanelType('stickers');
      setIsSettingsPanelOpen(true);
      return;
    }
    
    // Handle other tools that have implementations
    if (!['filters'].includes(tool.id)) {
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

  const handleExport = async () => {
    if (!videoUrl || videoClips.length === 0) {
      toast({ title: "No video to export" });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportStage('Preparing export...');

    // Variables to track cleanup
    let exportVideo: HTMLVideoElement | null = null;
    let audioContext: AudioContext | null = null;
    let mediaRecorder: MediaRecorder | null = null;

    try {
      // Get resolution dimensions
      const getResolutionDimensions = () => {
        switch (outputResolution) {
          case '480p': return { width: 854, height: 480 };
          case '720p': return { width: 1280, height: 720 };
          case '1080p': return { width: 1920, height: 1080 };
          case '2K/4K': return { width: 3840, height: 2160 };
          default: return { width: 1920, height: 1080 };
        }
      };
      const { width, height } = getResolutionDimensions();

      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      exportCanvasRef.current = canvas;

      // Create a temporary video element for export
      const activeClip = videoClips[0];
      const sourceUrl = activeClip?.url || videoUrl;

      exportVideo = document.createElement('video');
      exportVideo.muted = true; // Start muted, we'll handle audio separately
      exportVideo.playsInline = true;
      exportVideo.setAttribute('playsinline', 'true');
      exportVideo.preload = 'auto';

      // Some browsers (notably mobile Safari) are more reliable when the video is in the DOM
      exportVideo.style.position = 'fixed';
      exportVideo.style.left = '-99999px';
      exportVideo.style.top = '0';
      exportVideo.style.width = '1px';
      exportVideo.style.height = '1px';
      document.body.appendChild(exportVideo);

      // For blob URLs, we can't add query params - use the URL directly
      // For network URLs, we can add cache-busting
      const isBlobUrl = sourceUrl.startsWith('blob:');
      const exportUrl = isBlobUrl
        ? sourceUrl
        : (sourceUrl.includes('?')
            ? `${sourceUrl}&_export=${Date.now()}`
            : `${sourceUrl}?_export=${Date.now()}`);

      // Only set crossOrigin for non-blob URLs
      exportVideo.crossOrigin = isBlobUrl ? undefined : 'anonymous';
      exportVideo.src = exportUrl;

      const loadVideoForExport = async () => {
        // First attempt: normal load
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Video load timeout')), 30000);

            const cleanup = () => {
              clearTimeout(timeout);
              exportVideo?.removeEventListener('loadedmetadata', onReady);
              exportVideo?.removeEventListener('canplay', onReady);
              exportVideo?.removeEventListener('error', onError);
            };

            const onReady = () => {
              cleanup();
              resolve();
            };

            const onError = () => {
              cleanup();
              reject(new Error('Failed to load video for export'));
            };

            exportVideo!.addEventListener('loadedmetadata', onReady, { once: true });
            exportVideo!.addEventListener('canplay', onReady, { once: true });
            exportVideo!.addEventListener('error', onError, { once: true });
            exportVideo!.load();
          });
          return;
        } catch (e) {
          // Retry strategy: for blob URLs, try recreating a fresh blob URL
          if (isBlobUrl) {
            try {
              // Try to recreate blob URL from original File object first
              let freshUrl: string;
              if (originalVideoFileRef.current) {
                freshUrl = URL.createObjectURL(originalVideoFileRef.current);
              } else {
                // Fallback: try fetching the blob URL (may also fail)
                const blob = await fetch(sourceUrl).then(r => r.blob());
                freshUrl = URL.createObjectURL(blob);
              }
              exportVideo!.dataset.tmpObjectUrl = freshUrl;
              exportVideo!.src = freshUrl;
              await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Video load timeout')), 30000);

                const cleanup = () => {
                  clearTimeout(timeout);
                  exportVideo?.removeEventListener('loadedmetadata', onReady);
                  exportVideo?.removeEventListener('canplay', onReady);
                  exportVideo?.removeEventListener('error', onError);
                };

                const onReady = () => {
                  cleanup();
                  resolve();
                };

                const onError = () => {
                  cleanup();
                  reject(new Error('Failed to load video for export'));
                };

                exportVideo!.addEventListener('loadedmetadata', onReady, { once: true });
                exportVideo!.addEventListener('canplay', onReady, { once: true });
                exportVideo!.addEventListener('error', onError, { once: true });
                exportVideo!.load();
              });
              return;
            } catch {
              // Fall through to original error
            }
          }

          throw e;
        }
      };

      await loadVideoForExport();

      // CRITICAL: Use the export video's actual duration as the source of truth
      // Some browsers initially report incorrect duration on loadedmetadata
      // The export video element has the correct duration after loading
      const actualVideoDuration = exportVideo.duration;
      console.log('[Export] Export video duration:', actualVideoDuration, 'Clip outPoint:', activeClip?.outPoint, 'State duration:', duration);

      // Determine if user has explicitly trimmed the clip
      // A clip is "untrimmed" if inPoint=0 and outPoint equals the clip's stored duration
      const clipWasTrimmed = activeClip && (activeClip.inPoint > 0.01 || Math.abs(activeClip.outPoint - activeClip.duration) > 0.01);
      
      // Use the actual video duration unless user explicitly trimmed
      const effectiveInPoint = activeClip?.inPoint || 0;
      const effectiveOutPoint = clipWasTrimmed 
        ? Math.min(activeClip!.outPoint, actualVideoDuration) 
        : actualVideoDuration;

      console.log('[Export] Effective in/out points:', effectiveInPoint, effectiveOutPoint, 'Was trimmed:', clipWasTrimmed);

      // Apply clip speed (use first clip for now)
      const playbackSpeed = activeClip?.speed || 1.0;
      const clipVolume = activeClip?.volume || 1.0;
      exportVideo.playbackRate = playbackSpeed;

      // Calculate total frames based on the effective trimmed duration
      const trimmedDuration = effectiveOutPoint - effectiveInPoint;
      const actualDuration = trimmedDuration / playbackSpeed;
      const totalFrames = Math.floor(actualDuration * outputFrameRate);
      
      console.log('[Export] Trimmed duration:', trimmedDuration, 'Actual duration (with speed):', actualDuration, 'Total frames:', totalFrames);
      
      setExportStage('Recording video...');

      // Use MediaRecorder if available
      const stream = canvas.captureStream(outputFrameRate);
      
      // Add audio track if not muted - create fresh audio context each time
      if (!isMuted && clipVolume > 0) {
        try {
          // Create a separate audio element for audio capture to avoid reuse issues
          const audioElement = document.createElement('video');
          
          // For blob URLs, we can't add query params
          const isBlobUrlAudio = videoUrl.startsWith('blob:');
          const audioUrl = isBlobUrlAudio 
            ? videoUrl 
            : (videoUrl.includes('?') 
                ? `${videoUrl}&_audio=${Date.now()}` 
                : `${videoUrl}?_audio=${Date.now()}`);
          
          audioElement.src = audioUrl;
          audioElement.crossOrigin = isBlobUrlAudio ? undefined : 'anonymous';
          
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => resolve(), 5000); // Don't fail export if audio fails
            audioElement.onloadedmetadata = () => {
              clearTimeout(timeout);
              resolve();
            };
            audioElement.onerror = () => {
              clearTimeout(timeout);
              resolve(); // Continue without audio
            };
            audioElement.load();
          });

          audioContext = new AudioContext();
          const source = audioContext.createMediaElementSource(audioElement);
          const gainNode = audioContext.createGain();
          gainNode.gain.value = Math.min(clipVolume, 1.0);
          const destination = audioContext.createMediaStreamDestination();
          source.connect(gainNode);
          gainNode.connect(destination);
          
          destination.stream.getAudioTracks().forEach(track => {
            stream.addTrack(track);
          });
          
          // Sync audio element with export video
          audioElement.currentTime = effectiveInPoint;
          audioElement.playbackRate = playbackSpeed;
          exportVideo.addEventListener('play', () => audioElement.play());
          exportVideo.addEventListener('pause', () => audioElement.pause());
          exportVideo.addEventListener('seeked', () => {
            audioElement.currentTime = exportVideo!.currentTime;
          });
        } catch (audioErr) {
          console.warn('Could not add audio track:', audioErr);
        }
      }

      // Determine bitrate in bits per second
      const videoBitsPerSecond = outputBitrate * 1000000;
      
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond,
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      // Set video to starting position
      exportVideo.currentTime = effectiveInPoint;
      await new Promise(resolve => setTimeout(resolve, 200));

      // Start recording
      mediaRecorder.start(100); // Request data every 100ms for more reliable capture

      // Listen for video end to ensure we don't miss frames
      let videoEnded = false;
      exportVideo.onended = () => {
        videoEnded = true;
      };

      await exportVideo.play();

      // Render frames using a time-based approach
      let frameCount = 0;
      const frameDuration = 1 / outputFrameRate;
      const startTime = Date.now();
      
      const renderFrame = async () => {
        // Check if we've reached the end based on current position
        const currentPos = exportVideo.currentTime;
        const hasReachedEnd = currentPos >= effectiveOutPoint - 0.05 || videoEnded || frameCount >= totalFrames;
        
        if (hasReachedEnd) {
          // Stop recording
          exportVideo.pause();
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          return;
        }

        // Draw video frame to canvas
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        
        // Calculate video positioning (respect aspect ratio)
        let videoWidth = width;
        let videoHeight = height;
        let videoX = 0;
        let videoY = 0;

        if (selectedAspectRatio !== 'original') {
          const preset = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
          if (preset) {
            const targetRatio = preset.width / preset.height;
            const canvasRatio = width / height;
            
            if (targetRatio > canvasRatio) {
              videoHeight = width / targetRatio;
              videoY = (height - videoHeight) / 2;
            } else {
              videoWidth = height * targetRatio;
              videoX = (width - videoWidth) / 2;
            }
          }
        }

        // Apply position offset
        videoX += videoPosition.x * (width * 0.1);
        videoY += videoPosition.y * (height * 0.1);

        ctx.drawImage(exportVideo, videoX, videoY, videoWidth, videoHeight);

        // Apply adjustments as CSS filter (matching preview buildVideoFilter logic)
        if (Object.values(adjustments).some(v => v !== 0)) {
          const brightness = 1 + adjustments.brightness * 0.5;
          const contrast = 1 + adjustments.contrast;
          const saturation = 1 + adjustments.saturation;
          const exposure = 1 + adjustments.exposure * 0.5;
          const hueRotate = adjustments.hue * 180;
          const combinedBrightness = brightness * exposure;
          const sepia = adjustments.temp > 0 ? adjustments.temp * 0.3 : 0;
          
          // Use a temporary canvas to apply CSS filters (same as preview)
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.filter = `brightness(${combinedBrightness}) contrast(${contrast}) saturate(${saturation}) hue-rotate(${hueRotate}deg) sepia(${sepia})`;
          tempCtx.drawImage(canvas, 0, 0);
          
          // Draw the filtered result back
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(tempCanvas, 0, 0);
        }

        // Draw text overlays that are visible at current time
        const exportCurrentTime = exportVideo.currentTime;
        textOverlays.forEach(overlay => {
          if (exportCurrentTime >= overlay.startTime && exportCurrentTime <= overlay.endTime) {
            const x = overlay.position.x * width;
            const y = overlay.position.y * height;
            const scaledFontSize = overlay.fontSize * (width / 375); // Scale relative to mobile width
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((overlay.rotation || 0) * Math.PI / 180);
            ctx.scale(overlay.scale || 1, overlay.scale || 1);
            
            ctx.font = `${scaledFontSize}px ${overlay.fontFamily}`;
            ctx.textAlign = overlay.alignment;
            ctx.globalAlpha = overlay.opacity;
            
            // Draw background if enabled
            if (overlay.hasBackground) {
              const metrics = ctx.measureText(overlay.text);
              const textWidth = metrics.width;
              const textHeight = scaledFontSize * 1.2;
              ctx.fillStyle = overlay.backgroundColor;
              ctx.globalAlpha = overlay.backgroundOpacity;
              ctx.fillRect(-textWidth / 2 - 8, -textHeight / 2, textWidth + 16, textHeight);
              ctx.globalAlpha = overlay.opacity;
            }
            
            // Draw stroke if enabled
            if (overlay.strokeEnabled) {
              ctx.strokeStyle = overlay.strokeColor;
              ctx.lineWidth = overlay.strokeWidth * (width / 375);
              ctx.strokeText(overlay.text, 0, 0);
            }
            
            // Draw text
            ctx.fillStyle = overlay.textColor;
            ctx.fillText(overlay.text, 0, 0);
            
            ctx.restore();
          }
        });

        frameCount++;
        const progress = Math.min(99, Math.round((currentPos - effectiveInPoint) / (effectiveOutPoint - effectiveInPoint) * 100));
        setExportProgress(progress);

        requestAnimationFrame(renderFrame);
      };

      // Wait for recording to complete
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
        renderFrame();
      });

      setExportStage('Finalizing...');
      
      // Create blob and download
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `ai-editor-export-${timestamp}.webm`;
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Cleanup download URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      toast({
        title: "Export Complete!",
        description: `Video saved as ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An error occurred during export",
      });
    } finally {
      // Cleanup resources
      if (audioContext) {
        try {
          await audioContext.close();
        } catch (e) {
          console.warn('Error closing audio context:', e);
        }
      }
      if (exportVideo) {
        try {
          exportVideo.pause();

          // Revoke any temporary blob URL we created during retry
          const tmpUrl = exportVideo.dataset.tmpObjectUrl;
          if (tmpUrl && tmpUrl.startsWith('blob:')) {
            URL.revokeObjectURL(tmpUrl);
          }

          // Remove from DOM (helps mobile Safari clean up)
          if (exportVideo.parentNode) {
            exportVideo.parentNode.removeChild(exportVideo);
          }

          exportVideo.src = '';
          exportVideo.load();
        } catch (e) {
          console.warn('Error cleaning up export video element:', e);
        }
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch (e) {
          console.warn('Error stopping media recorder:', e);
        }
      }
      
      setIsExporting(false);
      setExportProgress(0);
      setExportStage('');
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const closeFullScreen = () => {
    setIsFullScreen(false);
  };

  // Project Manager handlers
  const handleOpenProject = async (project: EditorProject) => {
    setCurrentProject(project);
    // Restore all project state including overlays
    setVideoPosition(project.videoPosition);
    setSelectedAspectRatio(project.selectedAspectRatio);
    setBackgroundColor(project.backgroundColor);
    setBackgroundBlur(project.backgroundBlur);
    setBackgroundImage(project.backgroundImage);
    setAdjustments(project.adjustments);

    // Restore overlay layers from saved project
    if (project.textOverlays?.length) {
      setTextOverlays(project.textOverlays.map((t, i) => ({ ...t, layerOrder: (t as any).layerOrder ?? i })) as TextOverlayData[]);
    }
    if (project.effectLayers?.length) {
      setEffectLayers(project.effectLayers as EffectLayerData[]);
    }
    if (project.captionLayers?.length) {
      setCaptionLayers(project.captionLayers as CaptionLayerData[]);
    }
    if (project.drawingLayers?.length) {
      setDrawingLayers(project.drawingLayers.map(d => ({
        ...d,
        strokes: d.strokes.map(s => ({ ...s, tool: s.tool as 'brush' | 'eraser', points: s.points.map(p => ({ ...p })) })),
      })));
    }
    if (project.videoOverlays?.length) {
      setVideoOverlays(project.videoOverlays as VideoOverlayData[]);
    }
    // Audio layers need file URLs to be valid — restore metadata only
    if (project.audioLayers?.length) {
      setAudioLayers(project.audioLayers as any[]);
    }

    // Restore video clips
    if (project.videoClips?.length) {
      setVideoClips(project.videoClips.map(c => ({
        ...c,
        animationIn: c.animationIn ? { ...c.animationIn, type: c.animationIn.type as 'in' | 'out' | 'combo' } : null,
        animationOut: c.animationOut ? { ...c.animationOut, type: c.animationOut.type as 'in' | 'out' | 'combo' } : null,
      })));
    }

    // Try to get cached video file from IndexedDB
    const { getVideoFile } = await import('./ai-editor/projectStorage');
    const cachedFile = await getVideoFile(project.id);
    
    if (cachedFile) {
      originalVideoFileRef.current = cachedFile;
      const freshUrl = URL.createObjectURL(cachedFile);
      setVideoUrl(freshUrl);
      setShowProjectManager(false);
    } else {
      // No cached file — prompt to re-select
      setVideoUrl(null);
      setShowProjectManager(false);
      setTimeout(() => {
        toast({
          title: 'Re-select your video',
          description: 'The video file needs to be re-selected for this project.',
        });
        fileInputRef.current?.click();
      }, 300);
    }
  };

  const handleNewProject = async (project: EditorProject, file: File) => {
    setCurrentProject(project);
    originalVideoFileRef.current = file;
    const localUrl = URL.createObjectURL(file);
    setVideoUrl(localUrl);
    setShowProjectManager(false);
  };

  // Auto-save project when state changes
  useEffect(() => {
    if (!currentProject || !videoUrl) return;
    
    const saveTimer = setTimeout(async () => {
      try {
        // Generate new thumbnail if we have video
        const thumbnail = await generateThumbnail(videoUrl);
        
        const updatedProject: EditorProject = {
          ...currentProject,
          videoUrl,
          videoDuration: duration,
          videoDimensions,
          thumbnail: thumbnail || currentProject.thumbnail,
          adjustments,
          selectedAspectRatio,
          backgroundColor,
          backgroundBlur,
          backgroundImage,
          videoPosition,
          videoClips: videoClips.map(clip => ({
            id: clip.id,
            url: clip.url,
            duration: clip.duration,
            startTime: clip.startTime,
            inPoint: clip.inPoint,
            outPoint: clip.outPoint,
            volume: clip.volume,
            speed: clip.speed,
            aiEnhanced: clip.aiEnhanced,
            animationIn: clip.animationIn ? {
              id: clip.animationIn.id,
              type: clip.animationIn.type,
              duration: clip.animationIn.duration,
            } : null,
            animationOut: clip.animationOut ? {
              id: clip.animationOut.id,
              type: clip.animationOut.type,
              duration: clip.animationOut.duration,
            } : null,
          })),
          textOverlays: textOverlays.map(t => ({
            id: t.id,
            text: t.text,
            position: t.position,
            fontSize: t.fontSize,
            textColor: t.textColor,
            fontFamily: t.fontFamily,
            alignment: t.alignment,
            bold: t.bold,
            italic: t.italic,
            underline: t.underline,
            lineHeight: t.lineHeight,
            hasBackground: t.hasBackground,
            backgroundColor: t.backgroundColor,
            backgroundOpacity: t.backgroundOpacity,
            startTime: t.startTime,
            endTime: t.endTime,
            opacity: t.opacity,
            strokeEnabled: t.strokeEnabled,
            strokeColor: t.strokeColor,
            strokeWidth: t.strokeWidth,
            glowEnabled: t.glowEnabled,
            glowColor: t.glowColor,
            glowIntensity: t.glowIntensity,
            shadowEnabled: t.shadowEnabled,
            shadowColor: t.shadowColor,
            letterSpacing: t.letterSpacing,
            curveAmount: t.curveAmount,
            animation: t.animation,
            bubbleStyle: t.bubbleStyle,
            rotation: t.rotation,
            scale: t.scale,
            scaleX: t.scaleX,
            scaleY: t.scaleY,
          })),
          audioLayers: audioLayers.map(a => ({
            id: a.id,
            name: a.name,
            fileUrl: a.fileUrl,
            volume: a.volume,
            startTime: a.startTime,
            endTime: a.endTime,
            fadeIn: a.fadeIn,
            fadeOut: a.fadeOut,
            waveformData: a.waveformData || [],
          })),
          effectLayers: effectLayers.map(e => ({
            id: e.id,
            effectId: e.effectId,
            name: e.name,
            category: e.category,
            intensity: e.intensity,
            startTime: e.startTime,
            endTime: e.endTime,
          })),
          captionLayers: captionLayers.map(c => ({
            id: c.id,
            text: c.text,
            startTime: c.startTime,
            endTime: c.endTime,
          })),
          drawingLayers: drawingLayers.map(d => ({
            id: d.id,
            strokes: d.strokes.map(s => ({
              id: s.id,
              points: s.points.map(p => ({ x: p.x, y: p.y })),
              color: s.color,
              size: s.size,
              tool: s.tool,
            })),
            startTime: d.startTime,
            endTime: d.endTime,
          })),
          videoOverlays: videoOverlays.map(o => ({
            id: o.id,
            url: o.url,
            duration: o.duration,
            position: o.position,
            size: o.size,
            scale: o.scale,
            startTime: o.startTime,
            endTime: o.endTime,
            volume: o.volume,
            opacity: o.opacity,
          })),
        };
        
        await saveProject(updatedProject);
        setCurrentProject(updatedProject);
      } catch (error) {
        console.error('Failed to auto-save project:', error);
      }
    }, 2000); // Debounce 2 seconds
    
    return () => clearTimeout(saveTimer);
  }, [videoUrl, duration, adjustments, selectedAspectRatio, backgroundColor, backgroundBlur, backgroundImage, videoPosition, videoClips, textOverlays, audioLayers, effectLayers, captionLayers, drawingLayers, videoOverlays]);

  // Show Project Manager when no video is loaded
  if (showProjectManager) {
    return (
      <ProjectManager
        onBack={onBack}
        onOpenProject={handleOpenProject}
        onNewProject={handleNewProject}
      />
    );
  }

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

      {/* Export Progress Overlay */}
      {isExporting && (
        <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-6 p-8">
            {/* Animated export icon */}
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="44"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - exportProgress / 100)}`}
                  className="text-primary transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-foreground font-bold text-xl">{exportProgress}%</span>
              </div>
            </div>

            {/* Stage text */}
            <div className="text-center">
              <p className="text-foreground font-semibold text-lg">Exporting Video</p>
              <p className="text-muted-foreground text-sm mt-1">{exportStage}</p>
            </div>

            {/* Settings summary */}
            <div className="flex items-center gap-3 px-4 py-2 bg-secondary/50 rounded-lg">
              <span className="text-muted-foreground text-xs">{outputResolution}</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-muted-foreground text-xs">{outputFrameRate}fps</span>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-muted-foreground text-xs">{outputBitrate}Mbps</span>
            </div>

            {/* Cancel button */}
            <button
              onClick={() => {
                setIsExporting(false);
                toast({ title: "Export cancelled" });
              }}
              className="px-6 py-2 bg-destructive/20 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add Credits Dialog */}
      <AddCreditsDialog open={showAddCreditsDialog} onOpenChange={setShowAddCreditsDialog} />

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
                  onClick={() => unifiedPlayPause()}
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
                  onClick={() => unifiedPlayPause()}
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

      {/* Quality Picker Sheet removed - coming soon */}

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

      {/* Animations Panel Sheet - Legacy, now uses Edit sub-panel */}
      <Sheet open={showAnimationsPanel} onOpenChange={setShowAnimationsPanel}>
        <SheetContent side="bottom" className="bg-card border-t border-border rounded-t-3xl p-0 max-h-[60vh]">
          <div className="flex flex-col">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mt-3" />
            <SheetHeader className="px-5 pt-4 pb-3">
              <SheetTitle className="text-foreground text-base font-bold text-center">
                Animations
              </SheetTitle>
            </SheetHeader>
            {/* Tabs */}
            <div className="flex gap-2 px-4 mb-3">
              {(['in', 'out', 'combo'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAnimationTab(tab)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium transition-all border",
                    animationTab === tab
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/20 text-foreground/70 border-border/30 hover:bg-muted/40"
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            {/* Grid of animations */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-5 gap-2">
                {animationPresets[animationTab].map((anim) => (
                  <button
                    key={anim.id}
                    onClick={() => setSelectedAnimationPreset(anim.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                      selectedAnimationPreset === anim.id
                        ? "bg-primary/20 border-primary"
                        : "bg-secondary border-border hover:bg-secondary/80"
                    )}
                  >
                    <anim.icon className="w-5 h-5 text-foreground/80" />
                    <span className="text-[9px] text-foreground/80 font-medium">{anim.name}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Duration slider */}
            {selectedAnimationPreset && selectedAnimationPreset !== 'none' && (
              <div className="px-4 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <div className="flex-1 relative h-1.5">
                    <div className="absolute inset-0 bg-muted/30 rounded-full" />
                    <div className="absolute left-0 top-0 h-full bg-primary rounded-full" style={{ width: `${(animationDuration / 2) * 100}%` }} />
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={animationDuration}
                      onChange={(e) => setAnimationDuration(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <span className="text-xs font-medium text-primary w-10 text-right">{animationDuration.toFixed(1)}s</span>
                </div>
              </div>
            )}
            {/* Apply button */}
            <div className="px-4 pb-6">
              <button
                onClick={() => {
                  applyAnimationToClip();
                  setShowAnimationsPanel(false);
                }}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
              >
                Apply Animation
              </button>
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
          onClick={() => {
            // Go back to project manager instead of leaving editor
            setShowProjectManager(true);
          }}
          className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        
        {videoUrl && (
          <div className="flex items-center gap-2">
            {/* Output Settings Button */}
            <button 
              onClick={() => setShowOutputSettings(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-lg"
            >
              <span className="text-white text-xs font-semibold">{outputResolution.toUpperCase()}</span>
              <ChevronDown className="w-3.5 h-3.5 text-white" />
            </button>
            {/* Export Button */}
            <button 
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary to-primary/80 rounded-lg shadow-lg shadow-primary/30"
            >
              <Download className="w-3.5 h-3.5 text-primary-foreground" />
              <span className="text-primary-foreground text-xs font-semibold">Export</span>
            </button>
          </div>
        )}
      </div>

      {/* Video Preview Area - Flex to fill remaining space, scales down when text panel is open */}
      <div 
        className="flex-1 flex flex-col min-h-0 overflow-hidden transition-all duration-300"
        style={{ 
          maxHeight: showTextEditPanel ? '35%' : undefined,
          minHeight: showTextEditPanel ? '120px' : '180px'
        }}
      >
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
          <div 
            className="flex-1 flex items-center justify-center px-4 overflow-hidden min-h-0"
          >
            {/* Video container - uses BoxFit.contain to scale down when text panel is open */}
            <div 
              className={cn(
                "relative w-full h-full flex items-center justify-center overflow-hidden bg-black transition-all duration-300",
                showTextEditPanel ? "max-h-full" : "max-h-[280px]"
              )}
            >
              {/* Container with BoxFit.contain behavior - video fits within available bounds */}
              {(() => {
                // Calculate container dimensions using BoxFit.contain logic
                // Adjusts dynamically when text edit panel is open
                const getContainedDimensions = () => {
                  // When text panel is open, use smaller height constraint
                  const maxContainerHeight = showTextEditPanel 
                    ? Math.min(window.innerHeight * 0.22, 160) 
                    : Math.min(window.innerHeight * 0.32, 260);
                  const containerWidth = window.innerWidth - 32; // Account for padding
                  
                  if (selectedAspectRatio === 'original') {
                    // Original uses actual video dimensions
                    const ratio = videoDimensions ? videoDimensions.width / videoDimensions.height : 16 / 9;
                    // BoxFit.contain: fit within container while maintaining actual aspect ratio
                    let width = maxContainerHeight * ratio;
                    let height = maxContainerHeight;
                    if (width > containerWidth) {
                      width = containerWidth;
                      height = width / ratio;
                    }
                    return { width: `${width}px`, height: `${height}px`, widthNum: width, heightNum: height };
                  }
                  
                  const preset = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
                  if (preset) {
                    const targetRatio = preset.width / preset.height;
                    // BoxFit.contain: fit within container while maintaining aspect ratio
                    let width = maxContainerHeight * targetRatio;
                    let height = maxContainerHeight;
                    
                    // If width exceeds container, scale down
                    if (width > containerWidth) {
                      width = containerWidth;
                      height = width / targetRatio;
                    }
                    
                    return { width: `${width}px`, height: `${height}px`, widthNum: width, heightNum: height };
                  }
                  return { width: '100%', height: '100%', widthNum: containerWidth, heightNum: maxContainerHeight };
                };
                const dimensions = getContainedDimensions();
                
                // Calculate video dimensions within the container (Aspect Fit)
                const getVideoFitDimensions = () => {
                  if (selectedAspectRatio === 'original' || !videoDimensions) {
                    return { width: '100%', height: '100%', scale: 1 };
                  }
                  
                  const videoRatio = videoDimensions.width / videoDimensions.height;
                  const preset = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
                  const containerRatio = preset ? preset.width / preset.height : 16 / 9;
                  
                  // Aspect Fit: scale video to fit entirely within container
                  let scale: number;
                  if (videoRatio > containerRatio) {
                    // Video is wider than container - fit by width
                    scale = 1; // Video width matches container width
                  } else {
                    // Video is taller than container - fit by height
                    scale = containerRatio / videoRatio;
                  }
                  
                  // Calculate actual video size as percentage of container
                  let widthPercent: number;
                  let heightPercent: number;
                  
                  if (videoRatio > containerRatio) {
                    // Video is wider - width is 100%, height is smaller
                    widthPercent = 100;
                    heightPercent = (containerRatio / videoRatio) * 100;
                  } else {
                    // Video is taller - height is 100%, width is smaller
                    heightPercent = 100;
                    widthPercent = (videoRatio / containerRatio) * 100;
                  }
                  
                  return { 
                    width: `${widthPercent}%`, 
                    height: `${heightPercent}%`,
                    widthPercent,
                    heightPercent
                  };
                };
                const videoFit = getVideoFitDimensions();
                
                // Build background style based on user selection
                const getBackgroundStyle = (): React.CSSProperties => {
                  if (selectedAspectRatio === 'original') {
                    return { backgroundColor: '#000000' };
                  }
                  
                  if (backgroundBlur > 0 && videoRef.current) {
                    // Blur effect - use video as background with blur
                    return { backgroundColor: '#000000' };
                  }
                  
                  if (backgroundImage) {
                    return {
                      backgroundImage: `url(${backgroundImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    };
                  }
                  
                  return { backgroundColor: backgroundColor };
                };
                
                return (
                  <div 
                    className="relative flex items-center justify-center z-10"
                    style={{
                      width: dimensions.width,
                      height: dimensions.height,
                      overflow: 'hidden',
                      ...getBackgroundStyle(),
                    }}
                    onClick={() => {
                      if (selectedTextId) {
                        setSelectedTextId(null);
                        setShowTextEditPanel(false);
                      }
                    }}
                  >
                    {/* Blurred video background layer */}
                    {selectedAspectRatio !== 'original' && backgroundBlur > 0 && (
                      <video
                        src={videoUrl}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        style={{ 
                          filter: `blur(${backgroundBlur * 2}px) brightness(0.7)`,
                          transform: 'scale(1.1)', // Prevent blur edges from showing
                        }}
                        muted
                        playsInline
                        ref={(el) => {
                          if (el && videoRef.current) {
                            el.currentTime = videoRef.current.currentTime;
                            if (!videoRef.current.paused) {
                              el.play().catch(() => {});
                            }
                          }
                        }}
                      />
                    )}
                    
                    {/* Main video layer - Aspect Fit with drag repositioning */}
                    <div
                      className="relative flex items-center justify-center"
                      style={{
                        width: selectedAspectRatio === 'original' ? '100%' : videoFit.width,
                        height: selectedAspectRatio === 'original' ? '100%' : videoFit.height,
                        transform: selectedAspectRatio === 'original' 
                          ? 'none' 
                          : `translate(${videoPosition.x}px, ${videoPosition.y}px)`,
                        cursor: selectedAspectRatio === 'original' ? 'default' : (isDraggingVideo ? 'grabbing' : 'grab'),
                        zIndex: 1,
                      }}
                      onMouseDown={(e) => {
                        if (selectedAspectRatio === 'original') return;
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingVideo(true);
                        dragStartRef.current = {
                          x: e.clientX,
                          y: e.clientY,
                          posX: videoPosition.x,
                          posY: videoPosition.y,
                        };
                      }}
                      onMouseMove={(e) => {
                        if (!isDraggingVideo || selectedAspectRatio === 'original') return;
                        const deltaX = e.clientX - dragStartRef.current.x;
                        const deltaY = e.clientY - dragStartRef.current.y;
                        // Calculate bounds based on how much the video can move within container
                        const maxOffset = dimensions.widthNum ? dimensions.widthNum * 0.3 : 100;
                        const newX = Math.max(-maxOffset, Math.min(maxOffset, dragStartRef.current.posX + deltaX));
                        const newY = Math.max(-maxOffset, Math.min(maxOffset, dragStartRef.current.posY + deltaY));
                        setVideoPosition({ x: newX, y: newY });
                      }}
                      onMouseUp={() => setIsDraggingVideo(false)}
                      onMouseLeave={() => setIsDraggingVideo(false)}
                      onTouchStart={(e) => {
                        if (selectedAspectRatio === 'original') return;
                        const touch = e.touches[0];
                        setIsDraggingVideo(true);
                        dragStartRef.current = {
                          x: touch.clientX,
                          y: touch.clientY,
                          posX: videoPosition.x,
                          posY: videoPosition.y,
                        };
                      }}
                      onTouchMove={(e) => {
                        if (!isDraggingVideo || selectedAspectRatio === 'original') return;
                        const touch = e.touches[0];
                        const deltaX = touch.clientX - dragStartRef.current.x;
                        const deltaY = touch.clientY - dragStartRef.current.y;
                        const maxOffset = dimensions.widthNum ? dimensions.widthNum * 0.3 : 100;
                        const newX = Math.max(-maxOffset, Math.min(maxOffset, dragStartRef.current.posX + deltaX));
                        const newY = Math.max(-maxOffset, Math.min(maxOffset, dragStartRef.current.posY + deltaY));
                        setVideoPosition({ x: newX, y: newY });
                      }}
                      onTouchEnd={() => setIsDraggingVideo(false)}
                    >
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        className="w-full h-full object-contain"
                        style={{ 
                          filter: buildVideoFilter(),
                        }}
                        playsInline
                        muted={isMuted}
                      />
                      
                      {/* Drag indicator when not original aspect ratio */}
                      {selectedAspectRatio !== 'original' && !isDraggingVideo && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                          <div className="bg-black/50 rounded-full p-2">
                            <Move3d className="w-5 h-5 text-white/70" />
                          </div>
                        </div>
                      )}
                    </div>
              
              {/* Video Overlays - PiP with freeform transform */}
              {videoOverlays.filter(overlay => 
                currentTime >= overlay.startTime && currentTime <= overlay.endTime
              ).map(overlay => {
                const isSelected = overlay.id === selectedOverlayId;
                return (
                  <div
                    key={overlay.id}
                    className="absolute select-none"
                    style={{
                      left: `${overlay.position.x * 100}%`,
                      top: `${overlay.position.y * 100}%`,
                      transform: `translate(-50%, -50%) scale(${overlay.scale})`,
                      width: overlay.size.width,
                      height: overlay.size.height,
                      cursor: draggingOverlayId === overlay.id ? 'grabbing' : 'grab',
                      opacity: overlay.opacity,
                      zIndex: 10,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOverlayId(overlay.id);
                    }}
                    // Drag support with mouse - with boundary constraints
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      setDraggingOverlayId(overlay.id);
                      setSelectedOverlayId(overlay.id);
                      
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const startPosX = overlay.position.x;
                      const startPosY = overlay.position.y;
                      const containerRect = e.currentTarget.parentElement?.getBoundingClientRect();
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        if (!containerRect) return;
                        const deltaX = (moveEvent.clientX - startX) / containerRect.width;
                        const deltaY = (moveEvent.clientY - startY) / containerRect.height;
                        // Boundary constraints: keep overlay within 5%-95% of video area
                        const newX = Math.max(0.05, Math.min(0.95, startPosX + deltaX));
                        const newY = Math.max(0.05, Math.min(0.95, startPosY + deltaY));
                        
                        updateVideoOverlay(overlay.id, { position: { x: newX, y: newY } });
                      };
                      
                      const handleMouseUp = () => {
                        setDraggingOverlayId(null);
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    // Touch support for mobile
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      setDraggingOverlayId(overlay.id);
                      setSelectedOverlayId(overlay.id);
                      
                      const startX = touch.clientX;
                      const startY = touch.clientY;
                      const startPosX = overlay.position.x;
                      const startPosY = overlay.position.y;
                      const containerRect = e.currentTarget.parentElement?.getBoundingClientRect();
                      
                      const handleTouchMove = (moveEvent: TouchEvent) => {
                        moveEvent.preventDefault();
                        if (!containerRect) return;
                        const currentTouch = moveEvent.touches[0];
                        const deltaX = (currentTouch.clientX - startX) / containerRect.width;
                        const deltaY = (currentTouch.clientY - startY) / containerRect.height;
                        const newX = Math.max(0.05, Math.min(0.95, startPosX + deltaX));
                        const newY = Math.max(0.05, Math.min(0.95, startPosY + deltaY));
                        
                        updateVideoOverlay(overlay.id, { position: { x: newX, y: newY } });
                      };
                      
                      const handleTouchEnd = () => {
                        setDraggingOverlayId(null);
                        document.removeEventListener('touchmove', handleTouchMove);
                        document.removeEventListener('touchend', handleTouchEnd);
                      };
                      
                      document.addEventListener('touchmove', handleTouchMove, { passive: false });
                      document.addEventListener('touchend', handleTouchEnd);
                    }}
                  >
                    {/* Video element */}
                    <video
                      ref={(el) => { overlayVideoRefs.current[overlay.id] = el; }}
                      src={overlay.url}
                      className={cn(
                        "w-full h-full object-cover rounded-lg transition-all",
                        isSelected && "ring-2 ring-white"
                      )}
                      muted={overlay.volume === 0}
                      playsInline
                      loop
                    />
                    
                    {/* Transform handles - only when selected */}
                    {isSelected && !draggingOverlayId && (
                      <>
                        {/* Delete button - top left */}
                        <div
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            deleteVideoOverlay(overlay.id);
                          }}
                          className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-black/80 border border-white/50 flex items-center justify-center cursor-pointer z-50 touch-manipulation backdrop-blur-sm"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </div>
                        
                        {/* Resize handle - bottom right */}
                        <div 
                          className="absolute -bottom-3 -right-3 w-7 h-7 rounded-full bg-black/80 border border-white/50 flex items-center justify-center cursor-se-resize z-50 touch-manipulation backdrop-blur-sm"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startWidth = overlay.size.width;
                            const startHeight = overlay.size.height;
                            
                            const handleMouseMove = (moveE: MouseEvent) => {
                              const deltaX = moveE.clientX - startX;
                              const deltaY = moveE.clientY - startY;
                              
                              // Independent width/height scaling with constraints
                              const newWidth = Math.max(80, Math.min(400, startWidth + deltaX));
                              const newHeight = Math.max(60, Math.min(300, startHeight + deltaY));
                              
                              updateVideoOverlay(overlay.id, { 
                                size: { width: newWidth, height: newHeight } 
                              });
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
                            const startWidth = overlay.size.width;
                            const startHeight = overlay.size.height;
                            
                            const handleTouchMove = (moveE: TouchEvent) => {
                              moveE.preventDefault();
                              const currentTouch = moveE.touches[0];
                              const deltaX = currentTouch.clientX - startX;
                              const deltaY = currentTouch.clientY - startY;
                              
                              const newWidth = Math.max(80, Math.min(400, startWidth + deltaX));
                              const newHeight = Math.max(60, Math.min(300, startHeight + deltaY));
                              
                              updateVideoOverlay(overlay.id, { 
                                size: { width: newWidth, height: newHeight } 
                              });
                            };
                            
                            const handleTouchEnd = () => {
                              document.removeEventListener('touchmove', handleTouchMove);
                              document.removeEventListener('touchend', handleTouchEnd);
                            };
                            
                            document.addEventListener('touchmove', handleTouchMove, { passive: false });
                            document.addEventListener('touchend', handleTouchEnd);
                          }}
                        >
                          <Maximize className="w-3.5 h-3.5 text-white rotate-90" />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              
              {/* Text Overlays - with dragging support, sorted by layerOrder */}
              {[...textOverlays].sort((a, b) => (a.layerOrder || 0) - (b.layerOrder || 0)).filter(overlay => 
                currentTime >= overlay.startTime && currentTime <= overlay.endTime
              ).map(overlay => {
                const isSelected = overlay.id === selectedTextId;
                return (
                  <div
                    key={overlay.id}
                    className="absolute select-none"
                    style={{
                      left: `${overlay.position.x * 100}%`,
                      top: `${overlay.position.y * 100}%`,
                      transform: `translate(-50%, -50%) rotate(${overlay.rotation || 0}deg) scaleX(${overlay.scaleX || 1}) scaleY(${overlay.scaleY || 1})`,
                      cursor: draggingTextId === overlay.id ? 'grabbing' : 'grab',
                      zIndex: 20 + (overlay.layerOrder || 0),
                    }}
                    // Click to select - automatically show text edit panel
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTextId(overlay.id);
                      setTextInput(overlay.text);
                      setShowTextEditPanel(true);
                      setSelectedTool('text');
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setSelectedTextId(overlay.id);
                      setTextInput(overlay.text);
                      setShowTextEditPanel(true);
                      setSelectedTool('text');
                    }}
                    // Drag support with mouse - with boundary constraints
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
                        // Boundary constraints: keep text within 2%-98% of video area
                        const newX = Math.max(0.02, Math.min(0.98, startPosX + deltaX));
                        const newY = Math.max(0.02, Math.min(0.98, startPosY + deltaY));
                        
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
                    {/* Text content container with thin white border when selected */}
                    <div
                      className={cn(
                        "px-3 py-2 rounded transition-all",
                        isSelected && "border border-white/90"
                      )}
                      style={{
                        backgroundColor: overlay.hasBackground 
                          ? `${overlay.backgroundColor}${Math.round(overlay.backgroundOpacity * 255).toString(16).padStart(2, '0')}`
                          : 'transparent',
                        opacity: overlay.opacity,
                      }}
                    >
                      <span
                        style={{
                          color: overlay.textColor,
                          fontSize: overlay.fontSize,
                          fontFamily: overlay.fontFamily,
                          fontWeight: overlay.bold ? 'bold' : 'normal',
                          fontStyle: overlay.italic ? 'italic' : 'normal',
                          textDecoration: overlay.underline ? 'underline' : 'none',
                          lineHeight: overlay.lineHeight,
                          textAlign: overlay.alignment,
                          letterSpacing: overlay.letterSpacing ? `${overlay.letterSpacing}px` : undefined,
                        }}
                      >
                        {overlay.text}
                      </span>
                    </div>
                    
                    {/* Transform handles - only when selected and not dragging */}
                    {isSelected && !draggingTextId && (
                      <>
                        {/* X Delete button - top left corner */}
                        <div
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            deleteTextOverlay(overlay.id);
                          }}
                          className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-black/80 border border-white/50 flex items-center justify-center cursor-pointer z-50 touch-manipulation backdrop-blur-sm"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </div>
                        
                        {/* Duplicate button - top right corner */}
                        <div
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            duplicateTextOverlay(overlay.id);
                          }}
                          className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-black/80 border border-white/50 flex items-center justify-center cursor-pointer z-50 touch-manipulation backdrop-blur-sm"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <Copy className="w-3 h-3 text-white" />
                        </div>
                        
                        {/* Free-form Resize handle - bottom right corner */}
                        <div 
                          className="absolute -bottom-3 -right-3 w-7 h-7 rounded-full bg-black/80 border border-white/50 flex items-center justify-center cursor-se-resize z-50 touch-manipulation backdrop-blur-sm"
                          style={{ pointerEvents: 'auto' }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const containerRect = e.currentTarget.closest('.relative')?.getBoundingClientRect();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startScaleX = overlay.scaleX || 1;
                            const startScaleY = overlay.scaleY || 1;
                            
                            const handleMouseMove = (moveE: MouseEvent) => {
                              // Independent width/height scaling
                              const deltaX = (moveE.clientX - startX) * 0.01;
                              const deltaY = (moveE.clientY - startY) * 0.01;
                              
                              // Calculate new scales with boundary constraints
                              let newScaleX = Math.max(0.3, Math.min(3, startScaleX + deltaX));
                              let newScaleY = Math.max(0.3, Math.min(3, startScaleY + deltaY));
                              
                              // Boundary constraints: prevent text from going outside video
                              if (containerRect) {
                                const textWidth = 100 * newScaleX; // Approximate
                                const textHeight = 30 * newScaleY; // Approximate
                                const posX = overlay.position.x * containerRect.width;
                                const posY = overlay.position.y * containerRect.height;
                                
                                // Constrain if text would exceed boundaries
                                if (posX + textWidth / 2 > containerRect.width) {
                                  newScaleX = Math.min(newScaleX, (containerRect.width - posX) * 2 / 100);
                                }
                                if (posY + textHeight / 2 > containerRect.height) {
                                  newScaleY = Math.min(newScaleY, (containerRect.height - posY) * 2 / 30);
                                }
                              }
                              
                              setTextOverlays(prev => prev.map(t => 
                                t.id === overlay.id ? { ...t, scaleX: newScaleX, scaleY: newScaleY } : t
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
                            const containerRect = e.currentTarget.closest('.relative')?.getBoundingClientRect();
                            const touch = e.touches[0];
                            const startX = touch.clientX;
                            const startY = touch.clientY;
                            const startScaleX = overlay.scaleX || 1;
                            const startScaleY = overlay.scaleY || 1;
                            
                            const handleTouchMove = (moveE: TouchEvent) => {
                              moveE.preventDefault();
                              const currentTouch = moveE.touches[0];
                              
                              // Independent width/height scaling
                              const deltaX = (currentTouch.clientX - startX) * 0.01;
                              const deltaY = (currentTouch.clientY - startY) * 0.01;
                              
                              // Calculate new scales with boundary constraints
                              let newScaleX = Math.max(0.3, Math.min(3, startScaleX + deltaX));
                              let newScaleY = Math.max(0.3, Math.min(3, startScaleY + deltaY));
                              
                              // Boundary constraints
                              if (containerRect) {
                                const textWidth = 100 * newScaleX;
                                const textHeight = 30 * newScaleY;
                                const posX = overlay.position.x * containerRect.width;
                                const posY = overlay.position.y * containerRect.height;
                                
                                if (posX + textWidth / 2 > containerRect.width) {
                                  newScaleX = Math.min(newScaleX, (containerRect.width - posX) * 2 / 100);
                                }
                                if (posY + textHeight / 2 > containerRect.height) {
                                  newScaleY = Math.min(newScaleY, (containerRect.height - posY) * 2 / 30);
                                }
                              }
                              
                              setTextOverlays(prev => prev.map(t => 
                                t.id === overlay.id ? { ...t, scaleX: newScaleX, scaleY: newScaleY } : t
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
                          {/* 4-way diagonal resize arrow icon */}
                          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 14l-2 2m0 0l2 2m-2-2h6" />
                            <path d="M20 10l2-2m0 0l-2-2m2 2h-6" />
                            <path d="M10 4l-2-2m0 0L6 4m2-2v6" />
                            <path d="M14 20l2 2m0 0l2-2m-2 2v-6" />
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
                    zIndex: 18,
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
              
              {/* Drawing Layers - Render saved drawings on video */}
              {drawingLayers.filter(layer => 
                currentTime >= layer.startTime && currentTime <= layer.endTime
              ).map(layer => (
                <canvas
                  key={`drawing-layer-${layer.id}`}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ zIndex: 15 }}
                  ref={(el) => {
                    if (el) {
                      // Set canvas resolution to match actual display size
                      const rect = el.getBoundingClientRect();
                      if (rect.width > 0 && rect.height > 0) {
                        el.width = rect.width;
                        el.height = rect.height;
                      }
                      const ctx = el.getContext('2d');
                      if (ctx) {
                        ctx.clearRect(0, 0, el.width, el.height);
                        layer.strokes.forEach(stroke => {
                          if (!stroke || !stroke.points || stroke.points.length < 2) return;
                          ctx.beginPath();
                          ctx.lineCap = 'round';
                          ctx.lineJoin = 'round';
                          ctx.lineWidth = stroke.size;
                          if (stroke.tool === 'eraser') {
                            ctx.globalCompositeOperation = 'destination-out';
                            ctx.strokeStyle = 'rgba(0,0,0,1)';
                          } else {
                            ctx.globalCompositeOperation = 'source-over';
                            ctx.strokeStyle = stroke.color;
                          }
                          const firstPoint = stroke.points[0];
                          ctx.moveTo(firstPoint.x * el.width, firstPoint.y * el.height);
                          for (let i = 1; i < stroke.points.length; i++) {
                            const point = stroke.points[i];
                            ctx.lineTo(point.x * el.width, point.y * el.height);
                          }
                          ctx.stroke();
                        });
                      }
                    }
                  }}
                />
              ))}
              
              {/* Drawing Canvas Overlay - Active when in draw mode */}
              {isDrawMode && (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
                  style={{ zIndex: 100 }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={endDrawing}
                />
              )}
              
              {/* AI Processing Loading Overlay */}
              {isMagicEditProcessing && (
                <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                  {/* Pulsing glow ring */}
                  <div className="relative w-20 h-20 mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                    <div className="absolute inset-1 rounded-full border-2 border-primary/50 animate-pulse" />
                    <div className="absolute inset-2 rounded-full border border-primary/40 animate-[spin_3s_linear_infinite]" 
                      style={{ borderTopColor: 'hsl(var(--primary))' }} 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Wand2 className="w-7 h-7 text-primary animate-pulse" />
                    </div>
                  </div>
                  {/* Scanning line effect */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60 animate-[scan_2s_ease-in-out_infinite]"
                    style={{
                      animation: 'scan 2s ease-in-out infinite',
                    }}
                  />
                  <style>{`
                    @keyframes scan {
                      0%, 100% { top: 10%; opacity: 0; }
                      50% { top: 90%; opacity: 0.8; }
                    }
                  `}</style>
                  <p className="text-primary font-semibold text-sm">AI Processing...</p>
                  <p className="text-muted-foreground text-xs mt-1">Applying your edit</p>
                  <button
                    onClick={() => setIsMagicEditProcessing(false)}
                    className="mt-4 px-4 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* AI Upscale Processing Overlay */}
              {isAIUpscaleProcessing && (
                <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
                    <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-[spin_2s_linear_infinite]"
                      style={{ borderTopColor: 'hsl(var(--primary))', borderRightColor: 'hsl(var(--primary))' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ZoomIn className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-48 h-1.5 bg-muted/30 rounded-full overflow-hidden mb-3">
                    <div 
                      className="h-full bg-gradient-to-r from-primary via-primary to-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, aiUpscaleProgress)}%` }}
                    />
                  </div>
                  <p className="text-primary font-semibold text-sm">High-Quality Enhancement</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {aiUpscaleProgress < 30 ? 'Analyzing video...' : aiUpscaleProgress < 60 ? 'Enhancing resolution...' : aiUpscaleProgress < 90 ? 'Applying Topaz AI...' : 'Finalizing...'}
                  </p>
                  <p className="text-primary/80 text-xs mt-1 font-mono">{Math.round(aiUpscaleProgress)}%</p>
                  <button
                    onClick={() => { setIsAIUpscaleProcessing(false); setAiUpscaleProgress(0); }}
                    className="mt-4 px-4 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* AI Video Analyzer - Scanning Overlay */}
              {isAnalyzerScanning && (
                <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                  <div className="relative w-20 h-20 mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
                    <div className="absolute inset-1 rounded-full border-2 border-primary/50 animate-pulse" />
                    <div className="absolute inset-2 rounded-full border border-primary/40 animate-[spin_3s_linear_infinite]" 
                      style={{ borderTopColor: 'hsl(var(--primary))' }} 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60"
                    style={{ animation: 'scan 2s ease-in-out infinite' }}
                  />
                  <p className="text-primary font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Scanning Video...
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">AI is analyzing your content</p>
                  <button
                    onClick={() => setIsAnalyzerScanning(false)}
                    className="mt-4 px-4 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* AI Video Analyzer - Generating Overlay */}
              {isAnalyzerGenerating && (
                <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="relative w-24 h-24 mb-6">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
                    <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-[spin_2s_linear_infinite]"
                      style={{ borderTopColor: 'hsl(var(--primary))', borderRightColor: 'hsl(var(--primary))' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  <p className="text-primary font-semibold text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Generating New Clip...
                  </p>
                  {/* Progress bar */}
                  <div className="w-48 h-2 bg-muted/30 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                      style={{ width: `${analyzerGenerateProgress}%` }}
                    />
                  </div>
                  <p className="text-primary/80 text-xs mt-1 font-mono">{Math.round(analyzerGenerateProgress)}%</p>
                  <button
                    onClick={() => { setIsAnalyzerGenerating(false); setAnalyzerGenerateProgress(0); }}
                    className="mt-4 px-4 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {isCropMode && (
                <>
                  {/* Dim overlay outside crop box */}
                  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 110 }}>
                    {/* Top dim */}
                    <div 
                      className="absolute left-0 right-0 top-0 bg-black/60"
                      style={{ height: `${cropBox.y * 100}%` }}
                    />
                    {/* Bottom dim */}
                    <div 
                      className="absolute left-0 right-0 bottom-0 bg-black/60"
                      style={{ height: `${(1 - cropBox.y - cropBox.height) * 100}%` }}
                    />
                    {/* Left dim */}
                    <div 
                      className="absolute left-0 bg-black/60"
                      style={{ 
                        top: `${cropBox.y * 100}%`, 
                        width: `${cropBox.x * 100}%`,
                        height: `${cropBox.height * 100}%`
                      }}
                    />
                    {/* Right dim */}
                    <div 
                      className="absolute right-0 bg-black/60"
                      style={{ 
                        top: `${cropBox.y * 100}%`, 
                        width: `${(1 - cropBox.x - cropBox.width) * 100}%`,
                        height: `${cropBox.height * 100}%`
                      }}
                    />
                  </div>
                  
                  {/* Crop box with handles */}
                  <div 
                    className="absolute border-2 border-white"
                    style={{ 
                      zIndex: 120,
                      left: `${cropBox.x * 100}%`,
                      top: `${cropBox.y * 100}%`,
                      width: `${cropBox.width * 100}%`,
                      height: `${cropBox.height * 100}%`,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setCropDragHandle('move');
                      const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                      if (rect) {
                        setCropDragStart({ 
                          x: e.clientX, 
                          y: e.clientY, 
                          box: { ...cropBox } 
                        });
                      }
                    }}
                    onMouseMove={(e) => {
                      if (!cropDragHandle || cropDragHandle === 'move') return;
                    }}
                  >
                    {/* Grid lines (rule of thirds) */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                    </div>
                    
                    {/* Corner handles */}
                    {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => {
                      const isTop = corner.includes('top');
                      const isLeft = corner.includes('left');
                      return (
                        <div
                          key={corner}
                          className="absolute w-5 h-5 bg-white rounded-sm cursor-nwse-resize"
                          style={{
                            [isTop ? 'top' : 'bottom']: -10,
                            [isLeft ? 'left' : 'right']: -10,
                            cursor: corner === 'top-left' || corner === 'bottom-right' ? 'nwse-resize' : 'nesw-resize',
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setCropDragHandle(corner);
                            const rect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                            if (rect) {
                              setCropDragStart({ 
                                x: e.clientX, 
                                y: e.clientY, 
                                box: { ...cropBox } 
                              });
                            }
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            const touch = e.touches[0];
                            setCropDragHandle(corner);
                            setCropDragStart({ 
                              x: touch.clientX, 
                              y: touch.clientY, 
                              box: { ...cropBox } 
                            });
                          }}
                        />
                      );
                    })}
                    
                    {/* Edge handles (mid-edge) */}
                    {['top', 'bottom', 'left', 'right'].map((edge) => {
                      const isHorizontal = edge === 'top' || edge === 'bottom';
                      return (
                        <div
                          key={edge}
                          className="absolute bg-white rounded-sm"
                          style={{
                            ...(isHorizontal 
                              ? { left: '50%', transform: 'translateX(-50%)', width: 24, height: 5 }
                              : { top: '50%', transform: 'translateY(-50%)', width: 5, height: 24 }),
                            [edge]: -3,
                            cursor: isHorizontal ? 'ns-resize' : 'ew-resize',
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setCropDragHandle(edge);
                            setCropDragStart({ 
                              x: e.clientX, 
                              y: e.clientY, 
                              box: { ...cropBox } 
                            });
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            const touch = e.touches[0];
                            setCropDragHandle(edge);
                            setCropDragStart({ 
                              x: touch.clientX, 
                              y: touch.clientY, 
                              box: { ...cropBox } 
                            });
                          }}
                        />
                      );
                    })}
                  </div>
                  
                  {/* Global mouse/touch handlers for crop dragging */}
                  {cropDragHandle && (
                    <div 
                      className="fixed inset-0"
                      style={{ zIndex: 999 }}
                      onMouseMove={(e) => {
                        if (!cropDragHandle) return;
                        const containerRect = e.currentTarget.previousElementSibling?.previousElementSibling?.parentElement?.getBoundingClientRect();
                        if (!containerRect) return;
                        
                        const deltaX = (e.clientX - cropDragStart.x) / containerRect.width;
                        const deltaY = (e.clientY - cropDragStart.y) / containerRect.height;
                        const aspectRatioMap: Record<string, number | null> = {
                          'free': null,
                          '1:1': 1,
                          '4:5': 4/5,
                          '16:9': 16/9,
                          '9:16': 9/16,
                          '3:4': 3/4,
                        };
                        const lockedRatio = aspectRatioMap[cropAspectRatio];
                        
                        let newBox = { ...cropDragStart.box };
                        
                        if (cropDragHandle === 'move') {
                          newBox.x = Math.max(0, Math.min(1 - newBox.width, cropDragStart.box.x + deltaX));
                          newBox.y = Math.max(0, Math.min(1 - newBox.height, cropDragStart.box.y + deltaY));
                        } else if (cropDragHandle === 'top-left') {
                          const newX = Math.max(0, cropDragStart.box.x + deltaX);
                          const newY = Math.max(0, cropDragStart.box.y + deltaY);
                          newBox.width = cropDragStart.box.x + cropDragStart.box.width - newX;
                          newBox.height = cropDragStart.box.y + cropDragStart.box.height - newY;
                          newBox.x = newX;
                          newBox.y = newY;
                          if (lockedRatio) newBox.height = newBox.width / lockedRatio;
                        } else if (cropDragHandle === 'top-right') {
                          const newY = Math.max(0, cropDragStart.box.y + deltaY);
                          newBox.width = Math.min(1 - newBox.x, cropDragStart.box.width + deltaX);
                          newBox.height = cropDragStart.box.y + cropDragStart.box.height - newY;
                          newBox.y = newY;
                          if (lockedRatio) newBox.height = newBox.width / lockedRatio;
                        } else if (cropDragHandle === 'bottom-left') {
                          const newX = Math.max(0, cropDragStart.box.x + deltaX);
                          newBox.width = cropDragStart.box.x + cropDragStart.box.width - newX;
                          newBox.height = Math.min(1 - newBox.y, cropDragStart.box.height + deltaY);
                          newBox.x = newX;
                          if (lockedRatio) newBox.height = newBox.width / lockedRatio;
                        } else if (cropDragHandle === 'bottom-right') {
                          newBox.width = Math.min(1 - newBox.x, cropDragStart.box.width + deltaX);
                          newBox.height = Math.min(1 - newBox.y, cropDragStart.box.height + deltaY);
                          if (lockedRatio) newBox.height = newBox.width / lockedRatio;
                        } else if (cropDragHandle === 'top') {
                          const newY = Math.max(0, cropDragStart.box.y + deltaY);
                          newBox.height = cropDragStart.box.y + cropDragStart.box.height - newY;
                          newBox.y = newY;
                        } else if (cropDragHandle === 'bottom') {
                          newBox.height = Math.min(1 - newBox.y, cropDragStart.box.height + deltaY);
                        } else if (cropDragHandle === 'left') {
                          const newX = Math.max(0, cropDragStart.box.x + deltaX);
                          newBox.width = cropDragStart.box.x + cropDragStart.box.width - newX;
                          newBox.x = newX;
                        } else if (cropDragHandle === 'right') {
                          newBox.width = Math.min(1 - newBox.x, cropDragStart.box.width + deltaX);
                        }
                        
                        // Minimum size constraints
                        newBox.width = Math.max(0.1, newBox.width);
                        newBox.height = Math.max(0.1, newBox.height);
                        
                        setCropBox(newBox);
                      }}
                      onMouseUp={() => setCropDragHandle(null)}
                      onTouchMove={(e) => {
                        if (!cropDragHandle) return;
                        const touch = e.touches[0];
                        // Similar logic as mouse
                        const deltaX = (touch.clientX - cropDragStart.x) / 350; // Approximate
                        const deltaY = (touch.clientY - cropDragStart.y) / 250;
                        
                        let newBox = { ...cropDragStart.box };
                        
                        if (cropDragHandle === 'move') {
                          newBox.x = Math.max(0, Math.min(1 - newBox.width, cropDragStart.box.x + deltaX));
                          newBox.y = Math.max(0, Math.min(1 - newBox.height, cropDragStart.box.y + deltaY));
                        } else {
                          // Simplified corner/edge handling for touch
                          if (cropDragHandle.includes('right')) {
                            newBox.width = Math.max(0.1, Math.min(1 - newBox.x, cropDragStart.box.width + deltaX));
                          }
                          if (cropDragHandle.includes('left')) {
                            const newX = Math.max(0, cropDragStart.box.x + deltaX);
                            newBox.width = cropDragStart.box.x + cropDragStart.box.width - newX;
                            newBox.x = newX;
                          }
                          if (cropDragHandle.includes('bottom')) {
                            newBox.height = Math.max(0.1, Math.min(1 - newBox.y, cropDragStart.box.height + deltaY));
                          }
                          if (cropDragHandle.includes('top')) {
                            const newY = Math.max(0, cropDragStart.box.y + deltaY);
                            newBox.height = cropDragStart.box.y + cropDragStart.box.height - newY;
                            newBox.y = newY;
                          }
                        }
                        
                        setCropBox(newBox);
                      }}
                      onTouchEnd={() => setCropDragHandle(null)}
                    />
                  )}
                </>
              )}
                  </div>
                );
              })()}
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

      {/* Timeline + Toolbar Section (always rendered when video loaded) */}
      {videoUrl && duration > 0 && (
        <>
          {/* Settings Panel Overlay - covers timeline when active */}
          {isSettingsPanelOpen && (
            <div 
              className="fixed inset-0 z-50 flex flex-col justify-end animate-in slide-in-from-bottom duration-300"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
            >
              {/* Tap to close area */}
              <div className="flex-1" onClick={() => setIsSettingsPanelOpen(false)} />
              
              {/* Settings Panel Content */}
              <div className="bg-background border-t border-border/20 rounded-t-2xl max-h-[70vh] overflow-hidden">
                {/* Header with Cancel (X) and Done (checkmark) buttons */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
                  {/* Cancel button (X) */}
                  <button
                    onClick={() => setIsSettingsPanelOpen(false)}
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-white/80" />
                  </button>
                  
                  {/* Title */}
                  <span className="text-foreground font-bold text-base">
                    {settingsPanelType === 'stickers' ? 'Stickers' : 'Adjust'}
                  </span>
                  
                  {/* Done button (checkmark) */}
                  <button
                    onClick={() => {
                      setIsSettingsPanelOpen(false);
                      toast({ title: "Done", description: "Changes applied" });
                    }}
                    className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/40"
                  >
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
                
                {/* Settings Content - scrollable */}
                <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
                  {settingsPanelType === 'stickers' && (
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
                      <div className="px-4 pb-6">
                        <div className="grid grid-cols-6 gap-2">
                          {stickerCategories.find(c => c.id === selectedStickerCategory)?.stickers.map((sticker, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                const newSticker: TextOverlayData = {
                                  id: Date.now().toString(),
                                  text: sticker,
                                  position: { x: 50, y: 50 },
                                  fontSize: 48,
                                  textColor: '#FFFFFF',
                                  fontFamily: 'Inter',
                                  alignment: 'center',
                                  bold: false,
                                  italic: false,
                                  underline: false,
                                  lineHeight: 1.4,
                                  hasBackground: false,
                                  backgroundColor: '#000000',
                                  backgroundOpacity: 0.5,
                                  backgroundPadding: 8,
                                  backgroundRadius: 4,
                                  opacity: 1,
                                  rotation: 0,
                                  scale: 1,
                                  scaleX: 1,
                                  scaleY: 1,
                                  strokeEnabled: false,
                                  strokeColor: '#000000',
                                  strokeWidth: 2,
                                  glowEnabled: false,
                                  glowColor: '#FFFFFF',
                                  glowIntensity: 10,
                                  shadowEnabled: false,
                                  shadowColor: '#000000',
                                  shadowBlur: 4,
                                  shadowOffsetX: 2,
                                  shadowOffsetY: 2,
                                  shadowOpacity: 0.5,
                                  letterSpacing: 0,
                                  curveAmount: 0,
                                  animation: 'none',
                                  bubbleStyle: 'none',
                                  startTime: currentTime,
                                  endTime: Math.min(currentTime + 3, duration),
                                  layerOrder: textOverlays.reduce((max, t) => Math.max(max, t.layerOrder || 0), 0) + 1,
                                };
                                setTextOverlays(prev => [...prev, newSticker]);
                                setSelectedTextId(newSticker.id);
                                setIsSettingsPanelOpen(false);
                                toast({ title: "Sticker added" });
                              }}
                              className="w-11 h-11 flex items-center justify-center text-2xl hover:bg-white/10 rounded-lg transition-colors"
                            >
                              {sticker}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Timeline Section - Multi-Track with Sync Engine (Mobile Optimized) */}
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
              
              {/* Drag tooltip for text layer repositioning */}
              {dragTooltip !== null && (
                <div 
                  className="fixed z-50 px-2 py-1 rounded bg-black/80 text-white text-[10px] font-medium pointer-events-none whitespace-nowrap"
                  style={{ left: dragTooltip.x, top: dragTooltip.y - 32 }}
                >
                  Starts at {Math.floor(dragTooltip.time / 60).toString().padStart(2, '0')}:{(dragTooltip.time % 60).toFixed(1).padStart(4, '0')}
                </div>
              )}
              
              {/* Scrollable Timeline Content using pixelsPerSecond */}
              <div 
                ref={timelineRef}
                className="h-full overflow-x-auto scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onScroll={(e) => {
                  if (!isUserScrollingRef.current || isAutoScrollingRef.current) return;
                  const scrollLeft = e.currentTarget.scrollLeft;
                  const timeUnderPlayhead = scrollLeft / PIXELS_PER_SECOND;
                  const clampedTime = Math.max(0, Math.min(totalTimelineDuration, timeUnderPlayhead));
                  
                  // Pause playback and seek all layers to scrubbed position
                  if (isPlaying) {
                    // Pause all layers
                    if (videoRef.current) videoRef.current.pause();
                    audioLayers.forEach(audio => {
                      const audioEl = audioRefs.current.get(audio.id);
                      if (audioEl) audioEl.pause();
                    });
                    videoOverlays.forEach(overlay => {
                      const overlayEl = overlayVideoRefs.current[overlay.id];
                      if (overlayEl) overlayEl.pause();
                    });
                    setIsPlaying(false);
                  }
                  
                  setCurrentTime(clampedTime);
                  
                  // Directly seek the video element for immediate visual feedback
                  if (videoRef.current) {
                    const activeResult = getActiveClipAtTime(clampedTime);
                    if (activeResult) {
                      videoRef.current.currentTime = activeResult.localTime;
                    }
                  }
                }}
                onMouseDown={() => { isUserScrollingRef.current = true; setIsUserScrolling(true); }}
                onMouseUp={() => { isUserScrollingRef.current = false; setIsUserScrolling(false); }}
                onMouseLeave={() => { isUserScrollingRef.current = false; setIsUserScrolling(false); }}
                onTouchStart={() => { isUserScrollingRef.current = true; setIsUserScrolling(true); }}
                onTouchEnd={() => { isUserScrollingRef.current = false; setIsUserScrolling(false); }}
              >
                {/* Calculate dimensions using pixelsPerSecond - use totalTimelineDuration for multi-clip support */}
                {(() => {
                  const safeDuration = isFinite(totalTimelineDuration) && totalTimelineDuration > 0 ? totalTimelineDuration : 10;
                  const trackWidth = safeDuration * PIXELS_PER_SECOND;
                  
                  return (
                    <div 
                      className="flex flex-col gap-1.5 pt-1"
                      style={{ 
                        paddingLeft: '50%', 
                        paddingRight: '50%',
                        width: trackWidth,
                        boxSizing: 'content-box',
                      }}
                      onClick={(e) => {
                        // Deselect clip when clicking on empty timeline area
                        if (e.target === e.currentTarget) {
                          setSelectedClipId(null);
                          setIsEditMenuMode(false);
                          setEditSubPanel('none');
                        }
                      }}
                    >
                      {/* Time Ruler using pixelsPerSecond */}
                      <div className="h-6 flex items-end relative" style={{ width: trackWidth }}>
                        {totalTimelineDuration > 0 && isFinite(totalTimelineDuration) && Array.from({ length: Math.max(1, Math.min(1000, Math.ceil(totalTimelineDuration / 2) + 1)) }).map((_, i) => {
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
                        {totalTimelineDuration > 0 && isFinite(totalTimelineDuration) && Array.from({ length: Math.max(1, Math.min(2000, Math.ceil(totalTimelineDuration) + 1)) }).map((_, i) => {
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
                        <div className="flex h-[32px]">
                          {videoClips.map((clip, clipIndex) => {
                            const clipDuration = getClipTrimmedDuration(clip);
                            const clipWidth = isFinite(clipDuration) ? clipDuration * PIXELS_PER_SECOND : 0;
                            const thumbCount = Math.max(1, Math.min(100, Math.ceil(clipWidth / 60)));
                            const isFirst = clipIndex === 0;
                            const isLast = clipIndex === videoClips.length - 1;
                            const isSelected = clip.id === selectedClipId;
                            
                            return (
                              <div 
                                key={clip.id}
                                className="relative flex flex-col"
                                style={{ width: clipWidth }}
                              >
                                {/* Main clip container */}
                                <div 
                                  className="relative h-[32px] overflow-hidden cursor-pointer transition-all"
                                  style={{ 
                                    backgroundColor: '#1a1a1a',
                                    border: isSelected ? '2px solid white' : 'none',
                                    borderRadius: isSelected ? '4px' : '0',
                                  }}
                                  onClick={() => {
                                    setSelectedClipId(clip.id);
                                    // Open edit menu when clicking on video clip
                                    setIsEditMenuMode(true);
                                    setEditSubPanel('none');
                                  }}
                                >
                                <div className="flex h-full">
                                  {/* Left trim handle - white box with black line when selected */}
                                  <div 
                                    className={cn(
                                      "h-full flex items-center justify-center cursor-ew-resize z-10 shrink-0",
                                      isSelected ? "w-[10px] bg-white" : "w-3 bg-white/20"
                                    )}
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
                                    {/* Black line indicator when selected */}
                                    {isSelected && <div className="w-[2px] h-3 bg-black rounded-full" />}
                                  </div>
                                  
                                  {/* Thumbnails content area */}
                                  <div className="flex-1 flex relative overflow-hidden">
                                    {Array.from({ length: thumbCount }).map((_, i) => {
                                      // Adjust thumbTime to account for inPoint
                                      const thumbTime = clip.inPoint + (i / thumbCount) * getClipTrimmedDuration(clip);
                                      // Get corresponding thumbnail from clip thumbnails array
                                      const thumbIndex = clip.thumbnails && clip.thumbnails.length > 0
                                        ? Math.floor((i / thumbCount) * clip.thumbnails.length)
                                        : -1;
                                      const thumbnailSrc = thumbIndex >= 0 && clip.thumbnails 
                                        ? clip.thumbnails[thumbIndex] 
                                        : null;
                                      
                                      return (
                                        <div
                                          key={i}
                                          className="w-[60px] h-full shrink-0 relative overflow-hidden"
                                          style={{
                                            borderRight: i < thumbCount - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                                          }}
                                        >
                                          {thumbnailSrc ? (
                                            <img 
                                              src={thumbnailSrc} 
                                              alt="" 
                                              className="w-full h-full object-cover"
                                              draggable={false}
                                            />
                                          ) : (
                                            <div 
                                              className="w-full h-full bg-cover bg-center"
                                              style={{
                                                backgroundImage: `linear-gradient(135deg, rgba(60,60,60,0.3), rgba(40,40,40,0.5))`,
                                                backgroundColor: '#1a1a1a',
                                              }}
                                            >
                                              <div className="w-full h-full flex items-center justify-center">
                                                <span className="text-[8px] text-white/40 font-mono">
                                                  {Math.floor(thumbTime)}s
                                                </span>
                                              </div>
                                            </div>
                                          )}
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
                                    
                                  </div>
                                  
                                  {/* Right trim handle - white box with black line when selected */}
                                  <div 
                                    className={cn(
                                      "h-full flex items-center justify-center cursor-ew-resize z-10 shrink-0",
                                      isSelected ? "w-[10px] bg-white" : "w-3 bg-white/20"
                                    )}
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
                                    {/* Black line indicator when selected */}
                                    {isSelected && <div className="w-[2px] h-3 bg-black rounded-full" />}
                                  </div>
                                </div>
                                </div>
                                
                                {/* Animation indicators below the clip */}
                                {(clip.animationIn || clip.animationOut) && (
                                  <div className="flex h-[6px] mt-0.5 rounded overflow-hidden">
                                    {/* In animation indicator */}
                                    {clip.animationIn && (
                                      <div 
                                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-l flex items-center justify-center"
                                        style={{ 
                                          width: Math.max(16, (clip.animationIn.duration / getClipTrimmedDuration(clip)) * clipWidth),
                                        }}
                                        title={`In: ${animationPresets.in.find(a => a.id === clip.animationIn?.id)?.name || clip.animationIn.id} (${clip.animationIn.duration.toFixed(1)}s)`}
                                      >
                                        <Sparkles className="w-2.5 h-2.5 text-white/80" />
                                      </div>
                                    )}
                                    {/* Spacer between indicators */}
                                    {clip.animationIn && clip.animationOut && (
                                      <div className="flex-1" />
                                    )}
                                    {/* Out animation indicator */}
                                    {clip.animationOut && (
                                      <div 
                                        className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-r flex items-center justify-center ml-auto"
                                        style={{ 
                                          width: Math.max(16, (clip.animationOut.duration / getClipTrimmedDuration(clip)) * clipWidth),
                                        }}
                                        title={`Out: ${animationPresets.out.find(a => a.id === clip.animationOut?.id)?.name || clip.animationOut.id} (${clip.animationOut.duration.toFixed(1)}s)`}
                                      >
                                        <Sparkles className="w-2.5 h-2.5 text-white/80" />
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {/* AI Enhancement indicator */}
                                {clip.aiEnhanced && (
                                  <div 
                                    className="flex h-[5px] mt-0.5 rounded-full overflow-hidden bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"
                                    style={{ width: clipWidth }}
                                    title="AI Enhanced"
                                  >
                                    <div className="flex-1 flex items-center justify-center">
                                      <Wand2 className="w-2 h-2 text-white/90" />
                                    </div>
                                  </div>
                                )}
                                
                                {/* HQ Upscale badge */}
                                {clip.hqUpscaled && (
                                  <div 
                                    className="absolute top-0.5 right-1 px-1 py-0.5 rounded text-[7px] font-bold tracking-wider bg-primary/90 text-primary-foreground shadow-sm"
                                    title="AI Upscaled"
                                  >
                                    HQ
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* Fallback for single video without clips array */}
                          {videoClips.length === 0 && videoUrl && (
                            <div 
                              className="relative h-[32px] rounded-lg overflow-hidden border-2 flex"
                              style={{ borderColor: 'transparent', width: duration * PIXELS_PER_SECOND }}
                            >
                              {duration > 0 && isFinite(duration) && Array.from({ length: Math.max(1, Math.min(100, Math.ceil((duration * PIXELS_PER_SECOND) / 60))) }).map((_, i) => {
                                const thumbTime = (i / Math.max(1, Math.ceil((duration * PIXELS_PER_SECOND) / 60))) * duration;
                                return (
                                  <div
                                    key={i}
                                    className="w-[60px] h-full shrink-0 relative overflow-hidden"
                                    style={{
                                      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}
                                  >
                                    <div 
                                      className="w-full h-full bg-cover bg-center"
                                      style={{
                                        backgroundImage: `linear-gradient(135deg, rgba(60,60,60,0.3), rgba(40,40,40,0.5))`,
                                        backgroundColor: '#1a1a1a',
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
                      </div>
                      
                      {/* Video Overlay Tracks - each overlay gets its own row */}
                      {videoOverlays.map(overlay => {
                          const isSelected = overlay.id === selectedOverlayId;
                          const leftOffset = overlay.startTime * PIXELS_PER_SECOND;
                          const itemWidth = Math.max(50, (overlay.endTime - overlay.startTime) * PIXELS_PER_SECOND);
                          
                          return (
                        <div key={overlay.id} className="relative h-10" style={{ width: trackWidth }}>
                            <div
                              key={overlay.id}
                              className={cn(
                                "absolute h-[34px] mt-[3px] rounded flex items-center group/item transition-all",
                                isSelected 
                                  ? "bg-gradient-to-r from-purple-600/40 to-pink-600/40 border-2 border-white" 
                                  : "bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/30 hover:border-purple-400/50"
                              )}
                              style={{
                                left: leftOffset,
                                width: itemWidth,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Select the overlay and open edit menu for it
                                setSelectedOverlayId(overlay.id);
                                setEditingClipId(overlay.id);
                                setEditingLayerType('overlay');
                                setClipVolume(overlay.volume);
                                setClipSpeed(1.0); // Overlays don't have speed yet, default to 1
                                setIsEditMenuMode(true);
                              }}
                            >
                              {/* Left trim handle */}
                              <div 
                                className="w-2 h-full flex items-center justify-center cursor-ew-resize opacity-0 group-hover/item:opacity-100 transition-opacity"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const startX = e.clientX;
                                  const startTime = overlay.startTime;
                                  
                                  const handleMove = (moveE: MouseEvent) => {
                                    const deltaX = moveE.clientX - startX;
                                    const timeDelta = deltaX / PIXELS_PER_SECOND;
                                    const newStart = Math.max(0, Math.min(overlay.endTime - 0.5, startTime + timeDelta));
                                    updateVideoOverlay(overlay.id, { startTime: newStart });
                                  };
                                  
                                  const handleUp = () => {
                                    document.removeEventListener('mousemove', handleMove);
                                    document.removeEventListener('mouseup', handleUp);
                                  };
                                  
                                  document.addEventListener('mousemove', handleMove);
                                  document.addEventListener('mouseup', handleUp);
                                }}
                              >
                                <div className="w-0.5 h-3 bg-white/60 rounded-full" />
                              </div>
                              
                              {/* Thumbnails content */}
                              <div className="flex-1 flex h-full overflow-hidden cursor-grab">
                                {(() => {
                                  const overlayWidth = itemWidth - 16; // Subtract trim handle widths
                                  const thumbWidth = 40;
                                  const thumbCount = Math.max(1, Math.min(10, Math.floor(overlayWidth / thumbWidth)));
                                  
                                  return Array.from({ length: thumbCount }).map((_, i) => {
                                    const thumbIndex = overlay.thumbnails && overlay.thumbnails.length > 0
                                      ? Math.floor((i / thumbCount) * overlay.thumbnails.length)
                                      : -1;
                                    const thumbnailSrc = thumbIndex >= 0 && overlay.thumbnails 
                                      ? overlay.thumbnails[thumbIndex] 
                                      : null;
                                    
                                    return (
                                      <div
                                        key={i}
                                        className="h-full shrink-0 relative overflow-hidden"
                                        style={{
                                          width: overlayWidth / thumbCount,
                                          borderRight: i < thumbCount - 1 ? '1px solid rgba(139, 92, 246, 0.3)' : 'none',
                                        }}
                                      >
                                        {thumbnailSrc ? (
                                          <img 
                                            src={thumbnailSrc} 
                                            alt="" 
                                            className="w-full h-full object-cover"
                                            draggable={false}
                                          />
                                        ) : (
                                          <div 
                                            className="w-full h-full bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center"
                                          >
                                            {i === 0 && <Video className="w-3 h-3 text-white/50" />}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                              
                              {/* Right trim handle */}
                              <div 
                                className="w-2 h-full flex items-center justify-center cursor-ew-resize opacity-0 group-hover/item:opacity-100 transition-opacity"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  const startX = e.clientX;
                                  const endTime = overlay.endTime;
                                  
                                  const handleMove = (moveE: MouseEvent) => {
                                    const deltaX = moveE.clientX - startX;
                                    const timeDelta = deltaX / PIXELS_PER_SECOND;
                                    const maxEnd = duration || totalTimelineDuration;
                                    const newEnd = Math.min(maxEnd, Math.max(overlay.startTime + 0.5, endTime + timeDelta));
                                    updateVideoOverlay(overlay.id, { endTime: newEnd });
                                  };
                                  
                                  const handleUp = () => {
                                    document.removeEventListener('mousemove', handleMove);
                                    document.removeEventListener('mouseup', handleUp);
                                  };
                                  
                                  document.addEventListener('mousemove', handleMove);
                                  document.addEventListener('mouseup', handleUp);
                                }}
                              >
                                <div className="w-0.5 h-3 bg-white/60 rounded-full" />
                              </div>
                            </div>
                        </div>
                          );
                        })}
                      
                      {/* + Add text row - only show placeholder when no text overlays */}
                      {textOverlays.length === 0 && (
                      <div 
                        className="relative h-10 cursor-pointer group"
                        style={{ width: trackWidth }}
                        onClick={() => {
                          setIsTextMenuMode(true);
                          setTextMenuTab('add-text');
                        }}
                      >
                          <div className="h-[34px] mt-[3px] rounded bg-[#2A2A2A] border border-border/30 hover:border-border/50 transition-all flex items-center gap-2 px-2" style={{ maxWidth: 180 }}>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded bg-[#3A3A3A] flex items-center justify-center">
                                <Plus className="w-2.5 h-2.5 text-foreground" />
                              </div>
                              <span className="text-[11px] text-foreground font-semibold">Add text</span>
                            </div>
                          </div>
                      </div>
                      )}
                      {/* Render each text layer as its own separate track row */}
                      {textOverlays.map(overlay => {
                          const isSelected = overlay.id === selectedTextId;
                          const leftOffset = overlay.startTime * PIXELS_PER_SECOND;
                          const itemWidth = Math.max(50, (overlay.endTime - overlay.startTime) * PIXELS_PER_SECOND);
                          
                          return (
                        <div key={overlay.id} className="relative h-10" style={{ width: trackWidth }}>
                            <div
                              key={overlay.id}
                              className={cn(
                                "absolute h-[34px] rounded flex items-center cursor-grab transition-all active:cursor-grabbing group",
                                isSelected 
                                  ? "border border-white/90 bg-purple-600"
                                  : "bg-purple-700/80",
                                draggingLayerId === overlay.id && "opacity-90 scale-[1.02] z-10"
                              )}
                              style={{ left: leftOffset, width: itemWidth, top: 3 }}
                              draggable={false}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTextId(overlay.id);
                                setTextInput(overlay.text);
                                setSelectedTool('text');
                              }}
                            >
                              {/* Left trim handle - minimal styling */}
                              <div 
                                className="w-2 h-full flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
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
                                <div className="w-0.5 h-3 bg-white/60 rounded-full" />
                              </div>
                              
                              {/* Content - Draggable center area */}
                              <div 
                                className="flex-1 flex items-center gap-1.5 px-1 overflow-hidden cursor-grab active:cursor-grabbing"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setDraggingLayerId(overlay.id);
                                  setSelectedTextId(overlay.id);
                                  setTextInput(overlay.text);
                                  
                                  // Haptic feedback on drag start
                                  if (navigator.vibrate) navigator.vibrate(10);
                                  
                                  const startX = e.clientX;
                                  const origStart = overlay.startTime;
                                  const layerDuration = overlay.endTime - overlay.startTime;
                                  const snapThreshold = 10 / PIXELS_PER_SECOND;
                                  
                                  const getSnapTargets = () => {
                                    const targets: number[] = [currentTime]; // playhead
                                    videoClips.forEach(c => { targets.push(c.startTime, c.startTime + getClipTrimmedDuration(c)); });
                                    textOverlays.filter(t => t.id !== overlay.id).forEach(t => { targets.push(t.startTime, t.endTime); });
                                    return targets;
                                  };
                                  
                                  const handleMove = (moveE: MouseEvent) => {
                                    const deltaX = moveE.clientX - startX;
                                    const timeDelta = deltaX / PIXELS_PER_SECOND;
                                    let newStart = Math.max(0, Math.min(totalTimelineDuration - layerDuration, origStart + timeDelta));
                                    
                                    // Magnetic snapping
                                    let snapped = false;
                                    const targets = getSnapTargets();
                                    for (const t of targets) {
                                      if (Math.abs(newStart - t) < snapThreshold) {
                                        newStart = t; snapped = true; break;
                                      }
                                      if (Math.abs(newStart + layerDuration - t) < snapThreshold) {
                                        newStart = t - layerDuration; snapped = true; break;
                                      }
                                    }
                                    
                                    if (snapped) {
                                      setSnapLinePosition(window.innerWidth / 2);
                                      if (navigator.vibrate) navigator.vibrate(5);
                                    } else {
                                      setSnapLinePosition(null);
                                    }
                                    
                                    setDragTooltip({ time: newStart, x: moveE.clientX, y: moveE.clientY });
                                    setTextOverlays(prev => prev.map(t => 
                                      t.id === overlay.id ? { ...t, startTime: newStart, endTime: newStart + layerDuration } : t
                                    ));
                                  };
                                  
                                  const handleUp = () => {
                                    setDraggingLayerId(null);
                                    setSnapLinePosition(null);
                                    setDragTooltip(null);
                                    document.removeEventListener('mousemove', handleMove);
                                    document.removeEventListener('mouseup', handleUp);
                                  };
                                  
                                  document.addEventListener('mousemove', handleMove);
                                  document.addEventListener('mouseup', handleUp);
                                }}
                                onTouchStart={(e) => {
                                  e.stopPropagation();
                                  const touch = e.touches[0];
                                  setDraggingLayerId(overlay.id);
                                  setSelectedTextId(overlay.id);
                                  setTextInput(overlay.text);
                                  
                                  if (navigator.vibrate) navigator.vibrate(10);
                                  
                                  const startX = touch.clientX;
                                  const origStart = overlay.startTime;
                                  const layerDuration = overlay.endTime - overlay.startTime;
                                  const snapThreshold = 10 / PIXELS_PER_SECOND;
                                  
                                  const getSnapTargets = () => {
                                    const targets: number[] = [currentTime];
                                    videoClips.forEach(c => { targets.push(c.startTime, c.startTime + getClipTrimmedDuration(c)); });
                                    textOverlays.filter(t => t.id !== overlay.id).forEach(t => { targets.push(t.startTime, t.endTime); });
                                    return targets;
                                  };
                                  
                                  const handleTouchMove = (moveE: TouchEvent) => {
                                    moveE.preventDefault();
                                    const t = moveE.touches[0];
                                    const deltaX = t.clientX - startX;
                                    const timeDelta = deltaX / PIXELS_PER_SECOND;
                                    let newStart = Math.max(0, Math.min(totalTimelineDuration - layerDuration, origStart + timeDelta));
                                    
                                    let snapped = false;
                                    const targets = getSnapTargets();
                                    for (const st of targets) {
                                      if (Math.abs(newStart - st) < snapThreshold) {
                                        newStart = st; snapped = true; break;
                                      }
                                      if (Math.abs(newStart + layerDuration - st) < snapThreshold) {
                                        newStart = st - layerDuration; snapped = true; break;
                                      }
                                    }
                                    
                                    if (snapped) {
                                      setSnapLinePosition(window.innerWidth / 2);
                                      if (navigator.vibrate) navigator.vibrate(5);
                                    } else {
                                      setSnapLinePosition(null);
                                    }
                                    
                                    setDragTooltip({ time: newStart, x: t.clientX, y: t.clientY });
                                    setTextOverlays(prev => prev.map(tx => 
                                      tx.id === overlay.id ? { ...tx, startTime: newStart, endTime: newStart + layerDuration } : tx
                                    ));
                                  };
                                  
                                  const handleTouchEnd = () => {
                                    setDraggingLayerId(null);
                                    setSnapLinePosition(null);
                                    setDragTooltip(null);
                                    document.removeEventListener('touchmove', handleTouchMove);
                                    document.removeEventListener('touchend', handleTouchEnd);
                                  };
                                  
                                  document.addEventListener('touchmove', handleTouchMove, { passive: false });
                                  document.addEventListener('touchend', handleTouchEnd);
                                }}
                              >
                                <Type className="w-3 h-3 text-white/70 shrink-0" />
                                <span className="text-[10px] text-white/90 font-medium truncate flex-1">
                                  {overlay.text}
                                </span>
                              </div>
                              
                              {/* Right trim handle - minimal styling */}
                              <div 
                                className="w-2 h-full flex items-center justify-center cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
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
                                <div className="w-0.5 h-3 bg-white/60 rounded-full" />
                              </div>
                            </div>
                        </div>
                          );
                        })}
                      
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
                              effect.effectId === 'ai-generated'
                                ? isSelected 
                                  ? "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 ring-2 ring-white shadow-lg shadow-violet-500/30"
                                  : "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 shadow-md shadow-violet-600/30"
                                : isSelected 
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
                              {effect.effectId === 'ai-generated' ? (
                                <Wand2 className="w-3 h-3 text-white/90 shrink-0" />
                              ) : (
                                <Star className="w-3 h-3 text-white/90 shrink-0" />
                              )}
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
                  
                  {/* Audio Tracks - each audio layer gets its own row */}
                  {audioLayers.length === 0 && (
                  <div 
                    className="relative h-10 cursor-pointer group"
                    style={{ width: trackWidth }}
                    onClick={() => setIsAudioMenuMode(true)}
                  >
                      <div className="h-[34px] mt-[3px] rounded bg-[#2A2A2A] border border-border/30 hover:border-border/50 transition-all flex items-center gap-2 px-2" style={{ maxWidth: 180 }}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-[#3A3A3A] flex items-center justify-center">
                            <Music className="w-2.5 h-2.5 text-foreground" />
                          </div>
                          <span className="text-[11px] text-foreground font-semibold">Add audio</span>
                        </div>
                      </div>
                  </div>
                  )}
                  {audioLayers.map(audio => {
                      const isSelected = audio.id === selectedAudioId;
                      const leftOffset = audio.startTime * PIXELS_PER_SECOND;
                      const itemWidth = Math.max(50, (audio.endTime - audio.startTime) * PIXELS_PER_SECOND);
                      
                      return (
                    <div key={audio.id} className="relative h-10" style={{ width: trackWidth }}>
                        <div
                          key={audio.id}
                          className={cn(
                            "absolute h-[34px] rounded flex items-center cursor-grab transition-all active:cursor-grabbing group/audio",
                            isSelected 
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 border-2 border-white shadow-lg shadow-emerald-500/30"
                              : "bg-gradient-to-r from-emerald-600 to-emerald-700 border border-emerald-500/30 hover:border-emerald-400/50"
                          )}
                          style={{ left: leftOffset, width: itemWidth, top: 3 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAudioId(audio.id);
                            setEditingAudioVolume(Math.round(audio.volume * 100));
                            setEditingAudioFadeIn(audio.fadeIn);
                            setEditingAudioFadeOut(audio.fadeOut);
                            setIsAudioEditMode(true);
                            setAudioEditSubPanel('none');
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            // Horizontal drag to move
                            const startX = e.clientX;
                            const startTime = audio.startTime;
                            const audioDuration = audio.endTime - audio.startTime;
                            
                            const handleMove = (moveE: MouseEvent) => {
                              const deltaX = moveE.clientX - startX;
                              const timeDelta = deltaX / PIXELS_PER_SECOND;
                              let newStart = Math.max(0, Math.min(duration - audioDuration, startTime + timeDelta));
                              
                              updateAudioLayer(audio.id, { 
                                startTime: newStart, 
                                endTime: newStart + audioDuration 
                              });
                            };
                            
                            const handleUp = () => {
                              document.removeEventListener('mousemove', handleMove);
                              document.removeEventListener('mouseup', handleUp);
                            };
                            
                            document.addEventListener('mousemove', handleMove);
                            document.addEventListener('mouseup', handleUp);
                          }}
                        >
                          {/* Left trim handle */}
                          <div 
                            className={cn(
                              "w-2.5 h-full rounded-l flex items-center justify-center cursor-ew-resize",
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
                                updateAudioLayer(audio.id, { startTime: newStart });
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
                          
                          {/* Content - waveform and label */}
                          <div className="flex-1 h-full flex flex-col overflow-hidden cursor-grab relative">
                            {/* Waveform visualization */}
                            <div className="absolute inset-0 flex items-center justify-center px-1">
                              <svg 
                                viewBox="0 0 100 24" 
                                preserveAspectRatio="none" 
                                className="w-full h-full"
                              >
                                {audio.waveformData && audio.waveformData.length > 0 ? (
                                  audio.waveformData.map((amp, i) => {
                                    const x = (i / audio.waveformData.length) * 100;
                                    const height = Math.max(2, amp * 20);
                                    return (
                                      <rect
                                        key={i}
                                        x={x}
                                        y={12 - height / 2}
                                        width={0.8}
                                        height={height}
                                        fill="rgba(255, 255, 255, 0.7)"
                                        rx={0.2}
                                      />
                                    );
                                  })
                                ) : (
                                  // Placeholder waveform
                                  Array.from({ length: 50 }, (_, i) => {
                                    const height = 3 + Math.abs(Math.sin(i * 0.4)) * 10;
                                    return (
                                      <rect
                                        key={i}
                                        x={i * 2}
                                        y={12 - height / 2}
                                        width={1.2}
                                        height={height}
                                        fill="rgba(255, 255, 255, 0.4)"
                                        rx={0.3}
                                      />
                                    );
                                  })
                                )}
                              </svg>
                            </div>
                            {/* Audio name overlay */}
                            <div className="absolute top-0 left-1 right-1 flex items-center gap-1 h-full">
                              <Music className="w-3 h-3 text-white/90 shrink-0 drop-shadow-sm" />
                              <span className="text-[10px] text-white font-semibold truncate drop-shadow-sm">
                                {audio.name.length > 10 ? audio.name.substring(0, 10) + '...' : audio.name}
                              </span>
                            </div>
                          </div>
                          
                          {/* Right trim handle */}
                          <div 
                            className={cn(
                              "w-2.5 h-full rounded-r flex items-center justify-center cursor-ew-resize",
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
                                updateAudioLayer(audio.id, { endTime: newEnd });
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
                    </div>
                      );
                    })}
                  
                  {/* Drawing Track - Pink/Magenta themed */}
                  {drawingLayers.length > 0 && (
                    <div 
                      className="relative h-10 cursor-pointer group"
                      style={{ width: trackWidth }}
                    >
                      {/* Render drawing layers */}
                      {drawingLayers.map(layer => {
                        const isSelected = layer.id === selectedDrawingId;
                        const leftOffset = layer.startTime * PIXELS_PER_SECOND;
                        const itemWidth = Math.max(50, (layer.endTime - layer.startTime) * PIXELS_PER_SECOND);
                        
                        return (
                          <div
                            key={layer.id}
                            className={cn(
                              "absolute h-[34px] rounded flex items-center cursor-grab transition-all active:cursor-grabbing group/drawing",
                              isSelected 
                                ? "bg-gradient-to-r from-pink-500 to-fuchsia-500 border-2 border-white shadow-lg shadow-pink-500/30"
                                : "bg-gradient-to-r from-pink-600 to-fuchsia-600 border border-pink-500/30 hover:border-pink-400/50"
                            )}
                            style={{ left: leftOffset, width: itemWidth, top: 3 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDrawingId(layer.id);
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              // Horizontal drag to move
                              const startX = e.clientX;
                              const startTime = layer.startTime;
                              const layerDuration = layer.endTime - layer.startTime;
                              
                              const handleMove = (moveE: MouseEvent) => {
                                const deltaX = moveE.clientX - startX;
                                const timeDelta = deltaX / PIXELS_PER_SECOND;
                                let newStart = Math.max(0, Math.min(duration - layerDuration, startTime + timeDelta));
                                
                                setDrawingLayers(prev => prev.map(d => 
                                  d.id === layer.id 
                                    ? { ...d, startTime: newStart, endTime: newStart + layerDuration }
                                    : d
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
                            {/* Left trim handle */}
                            <div 
                              className={cn(
                                "w-2.5 h-full rounded-l flex items-center justify-center cursor-ew-resize",
                                isSelected ? "bg-white/50" : "bg-white/30"
                              )}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const startTime = layer.startTime;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  const newStart = Math.max(0, Math.min(layer.endTime - 0.5, startTime + timeDelta));
                                  setDrawingLayers(prev => prev.map(d => 
                                    d.id === layer.id ? { ...d, startTime: newStart } : d
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
                            
                            {/* Content */}
                            <div className="flex-1 flex items-center gap-1 px-1 overflow-hidden cursor-grab">
                              <Pencil className="w-3 h-3 text-white/90 shrink-0" />
                              <span className="text-[10px] text-white font-semibold truncate flex-1">
                                Drawing
                              </span>
                              {/* Delete button when selected */}
                              {isSelected && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDrawingLayer(layer.id);
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
                                "w-2.5 h-full rounded-r flex items-center justify-center cursor-ew-resize",
                                isSelected ? "bg-white/50" : "bg-white/30"
                              )}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const endTime = layer.endTime;
                                
                                const handleMove = (moveE: MouseEvent) => {
                                  const deltaX = moveE.clientX - startX;
                                  const timeDelta = deltaX / PIXELS_PER_SECOND;
                                  const newEnd = Math.min(duration, Math.max(layer.startTime + 0.5, endTime + timeDelta));
                                  setDrawingLayers(prev => prev.map(d => 
                                    d.id === layer.id ? { ...d, endTime: newEnd } : d
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
            
            {/* Fixed Add Video Button - Sticky on right side */}
            {videoUrl && (
              <button 
                onClick={handleDirectFilePick}
                className="absolute right-2 top-[34px] w-[32px] h-[32px] bg-white rounded flex items-center justify-center z-20"
              >
                <Plus className="w-4 h-4 text-black" />
              </button>
            )}
          </div>

          {/* Bottom Toolbar - Fixed height, always pinned to bottom */}
          <div className="shrink-0 bg-background border-t border-border/10 pb-safe relative" style={{ maxHeight: showTextEditPanel ? '55vh' : '200px', minHeight: showTextEditPanel ? '340px' : undefined }}>
            {/* Main toolbar - always rendered, fades out when overlay is open */}
            <div 
              className={cn(
                "overflow-x-auto transition-all duration-200",
                isAnyOverlayOpen ? "opacity-0 pointer-events-none" : "opacity-100"
              )}
            >
              <div className="flex px-2 py-3 min-w-max">
                {EDITOR_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  const isSelected = selectedTool === tool.id;

                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleToolClick(tool)}
                      className="flex flex-col items-center justify-center w-16 py-1 relative"
                      title={tool.isAI ? 'Uses AI Credits' : undefined}
                    >
                      <div className="relative">
                        <Icon
                          className={cn(
                            "w-6 h-6 mb-1",
                            isSelected ? "text-foreground" : "text-foreground/60"
                          )}
                        />
                        {tool.isAI && (
                          <Sparkles className="w-2.5 h-2.5 text-amber-400 absolute -top-1 -right-1.5" />
                        )}
                      </div>
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
            
            {/* Overlay menus - absolute positioned, slide up with fade */}
            {showTextEditPanel && selectedTextOverlay && (
              <div className="fixed left-0 right-0 bottom-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-50 flex flex-col" style={{ height: '55vh', maxHeight: '420px', minHeight: '320px' }}>
                <TextEditPanel
                  onBack={() => setShowTextEditPanel(false)}
                  text={selectedTextOverlay.text}
                  onTextChange={(text) => updateSelectedText({ text })}
                  fontSize={selectedTextOverlay.fontSize}
                  onFontSizeChange={(fontSize) => updateSelectedText({ fontSize })}
                  textColor={selectedTextOverlay.textColor}
                  onTextColorChange={(textColor) => updateSelectedText({ textColor })}
                  fontFamily={selectedTextOverlay.fontFamily}
                  onFontFamilyChange={(fontFamily) => updateSelectedText({ fontFamily })}
                  opacity={selectedTextOverlay.opacity}
                  onOpacityChange={(opacity) => updateSelectedText({ opacity })}
                  strokeEnabled={selectedTextOverlay.strokeEnabled}
                  onStrokeEnabledChange={(strokeEnabled) => updateSelectedText({ strokeEnabled })}
                  strokeColor={selectedTextOverlay.strokeColor}
                  onStrokeColorChange={(strokeColor) => updateSelectedText({ strokeColor })}
                  strokeWidth={selectedTextOverlay.strokeWidth}
                  onStrokeWidthChange={(strokeWidth) => updateSelectedText({ strokeWidth })}
                  glowEnabled={selectedTextOverlay.glowEnabled}
                  onGlowEnabledChange={(glowEnabled) => updateSelectedText({ glowEnabled })}
                  glowColor={selectedTextOverlay.glowColor}
                  onGlowColorChange={(glowColor) => updateSelectedText({ glowColor })}
                  glowIntensity={selectedTextOverlay.glowIntensity}
                  onGlowIntensityChange={(glowIntensity) => updateSelectedText({ glowIntensity })}
                  shadowEnabled={selectedTextOverlay.shadowEnabled}
                  onShadowEnabledChange={(shadowEnabled) => updateSelectedText({ shadowEnabled })}
                  shadowColor={selectedTextOverlay.shadowColor}
                  onShadowColorChange={(shadowColor) => updateSelectedText({ shadowColor })}
                  shadowBlur={selectedTextOverlay.shadowBlur}
                  onShadowBlurChange={(shadowBlur) => updateSelectedText({ shadowBlur })}
                  shadowOffsetX={selectedTextOverlay.shadowOffsetX}
                  onShadowOffsetXChange={(shadowOffsetX) => updateSelectedText({ shadowOffsetX })}
                  shadowOffsetY={selectedTextOverlay.shadowOffsetY}
                  onShadowOffsetYChange={(shadowOffsetY) => updateSelectedText({ shadowOffsetY })}
                  shadowOpacity={selectedTextOverlay.shadowOpacity}
                  onShadowOpacityChange={(shadowOpacity) => updateSelectedText({ shadowOpacity })}
                  letterSpacing={selectedTextOverlay.letterSpacing}
                  onLetterSpacingChange={(letterSpacing) => updateSelectedText({ letterSpacing })}
                  curveAmount={selectedTextOverlay.curveAmount}
                  onCurveAmountChange={(curveAmount) => updateSelectedText({ curveAmount })}
                  animation={selectedTextOverlay.animation}
                  onAnimationChange={(animation) => updateSelectedText({ animation })}
                  bubbleStyle={selectedTextOverlay.bubbleStyle}
                  onBubbleStyleChange={(bubbleStyle) => updateSelectedText({ bubbleStyle })}
                  bold={selectedTextOverlay.bold}
                  onBoldChange={(bold) => updateSelectedText({ bold })}
                  italic={selectedTextOverlay.italic}
                  onItalicChange={(italic) => updateSelectedText({ italic })}
                  underline={selectedTextOverlay.underline}
                  onUnderlineChange={(underline) => updateSelectedText({ underline })}
                  lineHeight={selectedTextOverlay.lineHeight}
                  onLineHeightChange={(lineHeight) => updateSelectedText({ lineHeight })}
                  alignment={selectedTextOverlay.alignment}
                  onAlignmentChange={(alignment) => updateSelectedText({ alignment: alignment as 'left' | 'center' | 'right' })}
                  hasBackground={selectedTextOverlay.hasBackground}
                  onHasBackgroundChange={(hasBackground) => updateSelectedText({ hasBackground })}
                  backgroundColor={selectedTextOverlay.backgroundColor}
                  onBackgroundColorChange={(backgroundColor) => updateSelectedText({ backgroundColor })}
                  backgroundOpacity={selectedTextOverlay.backgroundOpacity}
                  onBackgroundOpacityChange={(backgroundOpacity) => updateSelectedText({ backgroundOpacity })}
                  backgroundPadding={selectedTextOverlay.backgroundPadding}
                  onBackgroundPaddingChange={(backgroundPadding) => updateSelectedText({ backgroundPadding })}
                  backgroundRadius={selectedTextOverlay.backgroundRadius}
                  onBackgroundRadiusChange={(backgroundRadius) => updateSelectedText({ backgroundRadius })}
                  onDelete={() => {
                    const id = selectedTextId;
                    if (!id) return;
                    setTextOverlays(prev => prev.filter(t => t.id !== id));
                    setSelectedTextId(null);
                    setShowTextEditPanel(false);
                  }}
                />
              </div>
            )}
            
            {/* AI Prompt Edit Bottom Sheet */}
            {isMagicEditOpen && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col rounded-t-2xl border-t border-border/20" style={{ height: '260px' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20">
                  <button
                    onClick={() => setIsMagicEditOpen(false)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </button>
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">AI Prompt Edit</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary">{AI_EDIT_CREDIT_COST} credits</span>
                  </div>
                </div>

                {/* Prompt input */}
                <div className="flex-1 px-4 py-3 flex flex-col gap-3 overflow-hidden">
                  <textarea
                    value={magicEditPrompt}
                    onChange={(e) => setMagicEditPrompt(e.target.value)}
                    placeholder="Describe the visual changes you want..."
                    className="w-full flex-1 min-h-[60px] rounded-xl border border-border/30 bg-muted/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    rows={2}
                  />

                  {/* Example prompt chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    {[
                      'Cinematic color grading',
                      'Vintage film look',
                      'Sunset sky',
                      'Neon glow',
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => setMagicEditPrompt(example)}
                        className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Send button */}
                <div className="px-4 pb-4">
                  <button
                    onClick={handleMagicEditSubmit}
                    disabled={!magicEditPrompt.trim()}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            )}

            {/* AI Video Analyzer Bottom Sheet */}
            {isAIAnalyzerOpen && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col rounded-t-2xl border-t border-border/20" style={{ height: analyzerSummary ? '380px' : '200px' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20">
                  <button
                    onClick={() => setIsAIAnalyzerOpen(false)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </button>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">AI Video Analyzer</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary">{AI_ANALYZER_CREDIT_COST} cr</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                  {/* Scan button - if not yet analyzed */}
                  {!analyzerSummary && !isAnalyzerScanning && (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <p className="text-xs text-muted-foreground text-center">Tap below to let AI analyze your video content</p>
                      <button
                        onClick={handleAnalyzerScan}
                        className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-purple-500 text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Scan Video
                      </button>
                    </div>
                  )}

                  {/* Analysis Result */}
                  {analyzerSummary && (
                    <>
                      {/* Summary */}
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-semibold text-primary">Analysis</span>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed">{analyzerSummary}</p>
                      </div>

                      {/* AI Suggestions */}
                      {analyzerSuggestions.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                          {analyzerSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => setAnalyzerPrompt(suggestion)}
                              className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* AI Suggestion Input */}
                      <div className="p-3 rounded-xl bg-muted/10 border border-border/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-semibold text-foreground">AI Suggestion</span>
                        </div>
                        <textarea
                          value={analyzerPrompt}
                          onChange={(e) => setAnalyzerPrompt(e.target.value)}
                          placeholder="e.g., Add a 3-second clip of a golden retriever running towards the person"
                          className="w-full min-h-[50px] rounded-lg border border-border/30 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Generate & Insert button */}
                {analyzerSummary && (
                  <div className="px-4 pb-4">
                    <button
                      onClick={handleAnalyzerGenerate}
                      disabled={!analyzerPrompt.trim()}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:opacity-90 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Generate & Insert</span>
                      <span className="text-[10px] opacity-70">({AI_ANALYZER_GENERATE_CREDIT_COST} credits)</span>
                    </button>
                  </div>
                )}
              </div>
            )}


            {isAIUpscaleOpen && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col rounded-t-2xl border-t border-border/20" style={{ height: '280px' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20">
                  <button
                    onClick={() => setIsAIUpscaleOpen(false)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </button>
                  <div className="flex items-center gap-2">
                    <ZoomIn className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">AI Upscale</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary">{AI_UPSCALE_CREDIT_COST} credits</span>
                  </div>
                </div>

                {/* Resolution options */}
                <div className="flex-1 px-4 py-4 flex flex-col gap-4">
                  <p className="text-xs text-muted-foreground">Select target resolution (Topaz AI model)</p>
                  
                  <div className="flex gap-3">
                    {(['1080p', '4k'] as const).map((res) => (
                      <button
                        key={res}
                        onClick={() => setAiUpscaleResolution(res)}
                        className={cn(
                          "flex-1 py-3 rounded-xl border text-sm font-semibold transition-all flex flex-col items-center gap-1",
                          aiUpscaleResolution === res
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/30 bg-muted/10 text-muted-foreground hover:border-border/50"
                        )}
                      >
                        <span>{res.toUpperCase()}</span>
                        <span className="text-[10px] font-normal opacity-70">
                          {res === '1080p' ? '1920×1080' : '3840×2160'}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <Loader2 className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-amber-200/80 leading-relaxed">
                      This process may take a few minutes. Your video will be enhanced using the Topaz AI model for maximum quality.
                    </p>
                  </div>
                </div>

                {/* Submit button */}
                <div className="px-4 pb-4">
                  <button
                    onClick={handleAIUpscaleSubmit}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
                  >
                    <ZoomIn className="w-4 h-4" />
                    <span>Upscale to {aiUpscaleResolution.toUpperCase()}</span>
                  </button>
                </div>
              </div>
            )}
            
            {isEditMenuMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: editSubPanel === 'animations' ? '280px' : editSubPanel !== 'none' ? '200px' : '160px' }}>
                {/* Header with back button and title */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
                  <button
                    onClick={() => {
                      if (editSubPanel !== 'none') {
                        setEditSubPanel('none');
                      } else {
                        setIsEditMenuMode(false);
                        setEditSubPanel('none');
                      }
                    }}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    {editSubPanel !== 'none' ? (
                      <ChevronLeft className="w-5 h-5 text-primary" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-primary" />
                    )}
                  </button>
                  <span className="flex-1 text-sm font-medium text-foreground text-center">
                    {editSubPanel === 'volume' ? 'Volume' : editSubPanel === 'speed' ? 'Speed' : editSubPanel === 'animations' ? 'Animations' : (editingLayerType === 'overlay' ? 'Edit Overlay' : 'Edit')}
                  </span>
                  {editSubPanel !== 'none' && (
                    <button
                      onClick={() => {
                        if (editSubPanel === 'volume') {
                          applyClipVolume();
                        } else if (editSubPanel === 'speed') {
                          applyClipSpeed();
                        } else if (editSubPanel === 'animations') {
                          applyAnimationToClip();
                        }
                        setEditSubPanel('none');
                      }}
                      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white hover:bg-white/90 transition-colors"
                    >
                      <Check className="w-5 h-5 text-background" />
                    </button>
                  )}
                  {editSubPanel === 'none' && <div className="w-8" />}
                </div>
                
                {/* Sub-panel content or main tools */}
                {editSubPanel === 'volume' ? (
                  /* Volume Slider Sub-panel - 0 to 200 range with purple slider */
                  <div className="flex-1 flex flex-col justify-center px-4 py-2">
                    {/* Slider container */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative h-1.5">
                        {/* Track background */}
                        <div className="absolute inset-0 h-full bg-muted/30 rounded-full" />
                        {/* Active track - purple color */}
                        <div 
                          className="absolute left-0 top-0 h-full rounded-full transition-all bg-primary"
                          style={{ width: `${(clipVolume / 2) * 100}%` }}
                        />
                        {/* Thumb indicator */}
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border border-primary transition-all"
                          style={{ left: `calc(${(clipVolume / 2) * 100}% - 7px)` }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="200"
                          step="1"
                          value={Math.round(clipVolume * 100)}
                          onChange={(e) => {
                            const displayValue = parseInt(e.target.value);
                            const newVolume = displayValue / 100; // Convert 0-200 to 0-2
                            setClipVolume(newVolume);
                            // Real-time volume update (capped at 1.0 for HTML5)
                            if (videoRef.current) {
                              videoRef.current.volume = Math.min(1, newVolume);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                    {/* Labels */}
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground font-medium">0</span>
                      <span className="text-sm font-bold text-primary">
                        {Math.round(clipVolume * 100)}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">200</span>
                    </div>
                  </div>
                ) : editSubPanel === 'speed' ? (
                  /* Speed Sub-panel with Normal/Curve modes */
                  <div className="flex-1 flex flex-col px-4 py-3 overflow-hidden">
                    {/* Mode Toggle Buttons */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setSpeedMode('normal')}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-sm font-medium transition-all border",
                          speedMode === 'normal'
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/20 text-foreground/70 border-border/30 hover:bg-muted/40"
                        )}
                      >
                        Normal
                      </button>
                      <button
                        onClick={() => setSpeedMode('curve')}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-sm font-medium transition-all border",
                          speedMode === 'curve'
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/20 text-foreground/70 border-border/30 hover:bg-muted/40"
                        )}
                      >
                        Curve
                      </button>
                    </div>
                    
                    {/* Content with fade transition */}
                    <div className="flex-1 relative overflow-hidden">
                      {/* Normal Mode - Linear Speed Slider */}
                      <div 
                        className={cn(
                          "absolute inset-0 transition-opacity duration-200",
                          speedMode === 'normal' ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                      >
                        {/* Speed info header */}
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-lg font-bold text-primary">{clipSpeed.toFixed(1)}x</span>
                          <span className="text-xs text-muted-foreground">
                            Duration: {(() => {
                              const clip = videoClips.find(c => c.id === editingClipId);
                              if (!clip) return '--';
                              const originalDuration = getClipTrimmedDuration(clip);
                              const newDuration = originalDuration / clipSpeed;
                              return `${originalDuration.toFixed(1)}s → ${newDuration.toFixed(1)}s`;
                            })()}
                          </span>
                        </div>
                        
                        {/* Slider */}
                        <div className="relative h-2 mb-2">
                          <div className="absolute inset-0 h-full bg-muted/30 rounded-full" />
                          <div 
                            className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all"
                            style={{ width: `${((Math.log10(clipSpeed) + 1) / (Math.log10(100) + 1)) * 100}%` }}
                          />
                          <div 
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border border-primary"
                            style={{ left: `calc(${((Math.log10(clipSpeed) + 1) / (Math.log10(100) + 1)) * 100}% - 8px)` }}
                          />
                          <input
                            type="range"
                            min="-1"
                            max={Math.log10(100)}
                            step="0.01"
                            value={Math.log10(clipSpeed)}
                            onChange={(e) => {
                              const logValue = parseFloat(e.target.value);
                              const newSpeed = Math.pow(10, logValue);
                              setClipSpeed(Math.max(0.1, Math.min(100, newSpeed)));
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                        
                        {/* Markers */}
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>0.1x</span>
                          <span>1x</span>
                          <span>2x</span>
                          <span>5x</span>
                          <span>10x</span>
                          <span>100x</span>
                        </div>
                      </div>
                      
                      {/* Curve Mode - Preset Cards */}
                      <div 
                        className={cn(
                          "absolute inset-0 transition-opacity duration-200 overflow-x-auto",
                          speedMode === 'curve' ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                        style={{ WebkitOverflowScrolling: 'touch' }}
                      >
                        <div className="flex gap-2 min-w-max pb-2">
                          {speedCurvePresets.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => setSelectedSpeedCurve(preset.id)}
                              className={cn(
                                "flex flex-col items-center p-2 rounded-xl border transition-all w-20",
                                selectedSpeedCurve === preset.id
                                  ? "bg-primary/20 border-primary"
                                  : "bg-muted/20 border-border/30 hover:bg-muted/40"
                              )}
                            >
                              {/* Mini graph thumbnail */}
                              <div className="w-14 h-10 mb-1 rounded-lg bg-muted/30 flex items-end justify-center overflow-hidden">
                                <svg viewBox="0 0 56 32" className="w-full h-full">
                                  {preset.id === 'montage' && (
                                    <path d="M4 28 L14 8 L24 20 L34 4 L44 16 L52 8" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
                                  )}
                                  {preset.id === 'hero' && (
                                    <path d="M4 8 Q20 8 28 24 Q36 8 52 8" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
                                  )}
                                  {preset.id === 'bullet' && (
                                    <path d="M4 4 L20 4 L24 28 L32 28 L36 4 L52 4" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
                                  )}
                                  {preset.id === 'jump_cut' && (
                                    <path d="M4 20 L16 20 L16 8 L28 8 L28 24 L40 24 L40 12 L52 12" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
                                  )}
                                  {preset.id === 'ramp_up' && (
                                    <path d="M4 28 Q28 28 52 4" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
                                  )}
                                  {preset.id === 'ramp_down' && (
                                    <path d="M4 4 Q28 4 52 28" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
                                  )}
                                </svg>
                              </div>
                              <span className={cn(
                                "text-[10px] font-medium text-center leading-tight",
                                selectedSpeedCurve === preset.id ? "text-primary" : "text-foreground/70"
                              )}>
                                {preset.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : editSubPanel === 'animations' ? (
                  /* Animations Sub-panel with In/Out/Combo tabs */
                  <div className="flex-1 flex flex-col px-4 py-2 overflow-hidden">
                    {/* Tab Buttons */}
                    <div className="flex gap-2 mb-3">
                      {(['in', 'out', 'combo'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => {
                            setAnimationTab(tab);
                            // Check if clip has animation for this tab
                            const clip = videoClips.find(c => c.id === editingClipId);
                            if (tab === 'in' && clip?.animationIn) {
                              setSelectedAnimationPreset(clip.animationIn.id);
                              setAnimationDuration(clip.animationIn.duration);
                            } else if (tab === 'out' && clip?.animationOut) {
                              setSelectedAnimationPreset(clip.animationOut.id);
                              setAnimationDuration(clip.animationOut.duration);
                            } else {
                              setSelectedAnimationPreset(null);
                            }
                          }}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-sm font-medium transition-all border",
                            animationTab === tab
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/20 text-foreground/70 border-border/30 hover:bg-muted/40"
                          )}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                    
                    {/* Animation Grid */}
                    <div className="flex-1 overflow-x-auto">
                      <div className="flex gap-2 min-w-max pb-2">
                        {animationPresets[animationTab].map((anim) => (
                          <button
                            key={anim.id}
                            onClick={() => setSelectedAnimationPreset(anim.id)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all w-14 shrink-0",
                              selectedAnimationPreset === anim.id
                                ? "bg-primary/20 border-primary"
                                : "bg-muted/20 border-border/30 hover:bg-muted/40"
                            )}
                          >
                            <anim.icon className="w-4 h-4 text-foreground/80" />
                            <span className="text-[8px] text-foreground/80 font-medium text-center leading-tight">{anim.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Duration Slider - only show when an animation is selected */}
                    {selectedAnimationPreset && selectedAnimationPreset !== 'none' && (
                      <div className="flex items-center gap-3 pt-2 border-t border-border/20 mt-2">
                        <span className="text-xs text-muted-foreground shrink-0">Duration</span>
                        <div className="flex-1 relative h-1.5">
                          <div className="absolute inset-0 bg-muted/30 rounded-full" />
                          <div 
                            className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all" 
                            style={{ width: `${(animationDuration / 2) * 100}%` }} 
                          />
                          <div 
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md border border-primary transition-all"
                            style={{ left: `calc(${(animationDuration / 2) * 100}% - 6px)` }}
                          />
                          <input
                            type="range"
                            min="0.1"
                            max="2"
                            step="0.1"
                            value={animationDuration}
                            onChange={(e) => setAnimationDuration(parseFloat(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                        <span className="text-xs font-medium text-primary w-10 text-right shrink-0">{animationDuration.toFixed(1)}s</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Main Edit Tools - Horizontal Scroll */
                  <div className="flex-1 flex items-start pt-4 overflow-x-auto px-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="flex gap-2 min-w-max">
                      {clipEditTools.map((tool) => {
                        const IconComponent = tool.icon;
                        const isDelete = tool.id === 'delete';
                        return (
                          <button
                            key={tool.id}
                            onClick={() => {
                              tool.action();
                              // Only close for actions that don't open sub-panels
                              if (!['volume', 'speed', 'animations', 'crop'].includes(tool.id)) {
                                if (tool.id !== 'replace') {
                                  // Keep menu open for replace (file picker)
                                }
                              }
                            }}
                            className="flex flex-col items-center justify-center w-16 rounded-xl transition-all hover:bg-muted/50"
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center mb-1.5 relative",
                              isDelete ? "bg-destructive/20" : "bg-muted/30"
                            )}>
                              <IconComponent className={cn(
                                "w-5 h-5",
                                isDelete ? "text-destructive" : "text-foreground"
                              )} />
                              {tool.isAI && (
                                <Sparkles className="w-2.5 h-2.5 text-amber-400 absolute -top-0.5 -right-0.5" />
                              )}
                            </div>
                            <span className={cn(
                              "text-[10px] font-medium",
                              isDelete ? "text-destructive" : "text-foreground/60"
                            )}>
                              {tool.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Text Menu Overlay */}
            {isTextMenuMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: '160px' }}>
                {/* Header with back button and title */}
                <div className="flex items-center px-4 py-2 border-b border-border/20">
                  <button
                    onClick={() => setIsTextMenuMode(false)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </button>
                  <span className="flex-1 text-sm font-medium text-foreground text-center pr-8">
                    Text
                  </span>
                </div>
                
                {/* Horizontal Scrollable Text Tools */}
                <div className="flex-1 flex items-start pt-4 overflow-x-auto px-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div className="flex gap-2 min-w-max">
                    {[
                      { id: 'add-text', name: 'Add text', icon: Type, action: () => { addTextOverlay(); setIsTextMenuMode(false); } },
                      { id: 'auto-captions', name: 'Auto captions', icon: Subtitles, action: () => { generateAutoCaptions(); setIsTextMenuMode(false); } },
                      { id: 'stickers', name: 'Stickers', icon: Smile, action: () => { setTextMenuTab('stickers'); } },
                      { id: 'draw', name: 'Draw', icon: Pencil, action: () => { setIsDrawMode(true); setIsTextMenuMode(false); } },
                      { id: 'text-template', name: 'Text template', icon: FileText, action: () => { addTextOverlay(); setIsTextMenuMode(false); } },
                      { id: 'text-to-audio', name: 'Text to audio', icon: AudioLines, action: () => toast({ title: "Text to audio coming soon" }) },
                      { id: 'auto-lyrics', name: 'Auto lyrics', icon: Music2, action: () => toast({ title: "Auto lyrics coming soon" }) },
                    ].map((tool) => {
                      const IconComponent = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={tool.action}
                          className="flex flex-col items-center justify-center w-16 rounded-xl transition-all hover:bg-muted/50"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-muted/30">
                            <IconComponent className="w-5 h-5 text-foreground" />
                          </div>
                          <span className="text-[10px] font-medium text-foreground/60">
                            {tool.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Sticker Grid - shows when stickers is selected */}
                {textMenuTab === 'stickers' && (
                  <div className="px-3 pb-3 border-t border-border/20 pt-3">
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                      {stickerCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedStickerCategory(cat.id)}
                          className={cn(
                            "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            selectedStickerCategory === cat.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/30 text-foreground/70"
                          )}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-8 gap-2">
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
                            className="w-9 h-9 flex items-center justify-center text-xl hover:bg-muted/30 rounded-lg transition-colors"
                          >
                            {sticker}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Effects Menu Overlay */}
            {isEffectsMenuMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: '160px' }}>
                {/* Header with back button and title */}
                <div className="flex items-center px-4 py-2 border-b border-border/20">
                  <button
                    onClick={() => setIsEffectsMenuMode(false)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </button>
                  <span className="flex-1 text-sm font-medium text-foreground text-center pr-8">
                    Effects
                  </span>
                </div>
                
                {/* Horizontal Scrollable Effects Tools */}
                <div className="flex-1 flex items-start pt-4 overflow-x-auto px-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div className="flex gap-2 min-w-max">
                    {[
                      { id: 'video-effects', name: 'Video effects', icon: Video, action: () => toast({ title: "Video effects coming soon" }) },
                      { id: 'body-effects', name: 'Body effects', icon: Star, isAI: true, action: () => toast({ title: "Body effects coming soon" }) },
                      { id: 'photo-effects', name: 'Photo effects', icon: ImageIcon, action: () => toast({ title: "Photo effects coming soon" }) },
                    ].map((tool) => {
                      const IconComponent = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={tool.action}
                          className="flex flex-col items-center justify-center w-16 rounded-xl transition-all hover:bg-muted/50"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-muted/30 relative">
                            <IconComponent className="w-5 h-5 text-foreground" />
                            {tool.isAI && (
                              <Sparkles className="w-2.5 h-2.5 text-amber-400 absolute -top-0.5 -right-0.5" />
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-foreground/60">
                            {tool.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {/* Overlay Menu Overlay */}
            {isOverlayMenuMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: '160px' }}>
                {/* Header with back button and title */}
                <div className="flex items-center px-4 py-2 border-b border-border/20">
                  <button
                    onClick={() => setIsOverlayMenuMode(false)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </button>
                  <span className="flex-1 text-sm font-medium text-foreground text-center pr-8">
                    Overlay
                  </span>
                </div>
                
                {/* Horizontal Scrollable Overlay Tools */}
                <div className="flex-1 flex items-start pt-4 overflow-x-auto px-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div className="flex gap-2 min-w-max">
                    <button
                      onClick={addVideoOverlay}
                      className="flex flex-col items-center justify-center w-16 rounded-xl transition-all hover:bg-muted/50"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-muted/30">
                        <Plus className="w-5 h-5 text-foreground" />
                      </div>
                      <span className="text-[10px] font-medium text-foreground/60">
                        Add video
                      </span>
                    </button>
                    
                    {/* Show existing overlays */}
                    {videoOverlays.map((overlay) => (
                      <button
                        key={overlay.id}
                        onClick={() => {
                          setSelectedOverlayId(overlay.id);
                          setIsOverlayMenuMode(false);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center w-16 rounded-xl transition-all",
                          selectedOverlayId === overlay.id ? "bg-primary/20" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-1.5 bg-muted/30 overflow-hidden">
                          <Video className="w-5 h-5 text-foreground" />
                        </div>
                        <span className="text-[10px] font-medium text-foreground/60 truncate max-w-[56px]">
                          Overlay
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Captions Menu Overlay */}
            {isCaptionsMenuMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: '160px' }}>
                {/* Header with back button and title */}
                <div className="flex items-center px-4 py-2 border-b border-border/20">
                  <button
                    onClick={() => setIsCaptionsMenuMode(false)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </button>
                  <span className="flex-1 text-sm font-medium text-foreground text-center pr-8">
                    Captions
                  </span>
                </div>
                
                {/* Horizontal Scrollable Caption Tools */}
                <div className="flex-1 flex items-start pt-4 overflow-x-auto px-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div className="flex gap-2 min-w-max">
                    {[
                      { id: 'enter-captions', name: 'Enter captions', icon: Type, action: () => toast({ title: "Enter captions coming soon" }) },
                      { id: 'auto-captions', name: 'Auto captions', icon: Subtitles, action: () => { generateAutoCaptions(); setIsCaptionsMenuMode(false); } },
                      { id: 'caption-templates', name: 'Caption templates', icon: FileText, action: () => toast({ title: "Caption templates coming soon" }) },
                      { id: 'auto-lyrics', name: 'Auto lyrics', icon: Music2, action: () => toast({ title: "Auto lyrics coming soon" }) },
                      { id: 'import-captions', name: 'Import captions', icon: Download, action: () => toast({ title: "Import captions coming soon" }) },
                    ].map((tool) => {
                      const IconComponent = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={tool.action}
                          className="flex flex-col items-center justify-center w-16 rounded-xl transition-all hover:bg-muted/50"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-muted/30">
                            <IconComponent className="w-5 h-5 text-foreground" />
                          </div>
                          <span className="text-[10px] font-medium text-foreground/60">
                            {tool.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {/* Aspect Ratio Menu Overlay */}
            {isAspectMenuMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: '200px' }}>
                {/* Header with back button and title */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
                  <button
                    onClick={() => setIsAspectMenuMode(false)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </button>
                  <span className="flex-1 text-sm font-medium text-foreground text-center">
                    Aspect Ratio
                  </span>
                  <button
                    onClick={() => {
                      setIsAspectMenuMode(false);
                      toast({ title: "Aspect ratio applied" });
                    }}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-5 h-5 text-primary-foreground" />
                  </button>
                </div>
                
                {/* Horizontal Scrollable Aspect Ratio Options */}
                <div className="flex-1 flex items-start pt-4 overflow-x-auto px-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div className="flex gap-3 min-w-max">
                    {[
                      { id: 'original', label: 'Original', width: 24, height: 24 },
                      { id: '9:16', label: '9:16', width: 18, height: 32 },
                      { id: '16:9', label: '16:9', width: 32, height: 18 },
                      { id: '1:1', label: '1:1', width: 24, height: 24 },
                      { id: '4:5', label: '4:5', width: 20, height: 25 },
                      { id: '4:3', label: '4:3', width: 28, height: 21 },
                      { id: '21:9', label: '21:9', width: 35, height: 15 },
                      { id: '2.35:1', label: '2.35:1', width: 38, height: 16 },
                    ].map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => {
                          setSelectedAspectRatio(ratio.id);
                          setVideoPosition({ x: 0, y: 0 }); // Reset position on aspect change
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-all border",
                          selectedAspectRatio === ratio.id 
                            ? "bg-primary/20 border-primary/40" 
                            : "bg-muted/20 border-transparent hover:bg-muted/40"
                        )}
                      >
                        {/* Visual aspect ratio rectangle */}
                        <div 
                          className={cn(
                            "rounded-sm border-2 mb-1",
                            selectedAspectRatio === ratio.id 
                              ? "border-primary bg-primary/20" 
                              : "border-foreground/40 bg-foreground/10"
                          )}
                          style={{ width: ratio.width, height: ratio.height }}
                        />
                        <span className={cn(
                          "text-xs font-medium",
                          selectedAspectRatio === ratio.id ? "text-primary" : "text-foreground/70"
                        )}>
                          {ratio.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Background Menu Overlay */}
            {isBackgroundMenuMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: '200px' }}>
                {/* Header with back button and title */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
                  <button
                    onClick={() => {
                      if (backgroundTab === 'main') {
                        setIsBackgroundMenuMode(false);
                      } else {
                        setBackgroundTab('main');
                      }
                    }}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </button>
                  <span className="flex-1 text-sm font-medium text-foreground text-center">
                    {backgroundTab === 'main' ? 'Background' : backgroundTab.charAt(0).toUpperCase() + backgroundTab.slice(1)}
                  </span>
                  <button
                    onClick={() => {
                      setIsBackgroundMenuMode(false);
                      setBackgroundTab('main');
                      toast({ title: "Background applied" });
                    }}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-5 h-5 text-primary-foreground" />
                  </button>
                </div>
                
                {/* Content based on tab */}
                <div className="flex-1 overflow-y-auto">
                  {backgroundTab === 'main' && (
                    <div className="flex items-start pt-4 overflow-x-auto px-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <div className="flex gap-3 min-w-max">
                        {[
                          { id: 'color', label: 'Color', icon: Palette },
                          { id: 'image', label: 'Image', icon: ImageIcon },
                          { id: 'blur', label: 'Blur', icon: Focus },
                        ].map((option) => {
                          const IconComponent = option.icon;
                          return (
                            <button
                              key={option.id}
                              onClick={() => setBackgroundTab(option.id as 'color' | 'image' | 'blur')}
                              className="flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-all border bg-muted/20 border-transparent hover:bg-muted/40"
                            >
                              <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center mb-1">
                                <IconComponent className="w-5 h-5 text-foreground/70" />
                              </div>
                              <span className="text-xs font-medium text-foreground/70">
                                {option.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {backgroundTab === 'color' && (
                    <div className="px-4 pt-4">
                      <div className="flex flex-wrap gap-2">
                        {['#000000', '#1A1A2E', '#16213E', '#1F1F1F', '#2D2D2D', '#3D3D3D', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'].map((color) => (
                          <button
                            key={color}
                            onClick={() => setBackgroundColor(color)}
                            className={cn(
                              "w-10 h-10 rounded-lg border-2 transition-all",
                              backgroundColor === color ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {backgroundTab === 'image' && (
                    <div className="px-4 pt-4">
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'gradient-sunset', colors: ['#FF6B6B', '#FFA07A'] },
                          { id: 'gradient-ocean', colors: ['#4ECDC4', '#45B7D1'] },
                          { id: 'gradient-forest', colors: ['#96CEB4', '#2E8B57'] },
                          { id: 'gradient-night', colors: ['#1A1A2E', '#16213E'] },
                          { id: 'gradient-purple', colors: ['#667eea', '#764ba2'] },
                          { id: 'gradient-pink', colors: ['#f093fb', '#f5576c'] },
                          { id: 'gradient-gold', colors: ['#f7971e', '#ffd200'] },
                          { id: 'gradient-mint', colors: ['#56ab2f', '#a8e063'] },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => setBackgroundImage(preset.id)}
                            className={cn(
                              "aspect-square rounded-lg border-2 transition-all",
                              backgroundImage === preset.id ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                            )}
                            style={{ background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]})` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {backgroundTab === 'blur' && (
                    <div className="px-4 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-foreground/70">Blur Intensity</span>
                        <span className="text-sm font-mono text-foreground/50">{backgroundBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={backgroundBlur}
                        onChange={(e) => setBackgroundBlur(Number(e.target.value))}
                        className="w-full h-2 bg-foreground/10 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex gap-2 mt-4">
                        {[
                          { label: 'None', value: 0 },
                          { label: 'Light', value: 10 },
                          { label: 'Medium', value: 25 },
                          { label: 'Heavy', value: 50 },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => setBackgroundBlur(preset.value)}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                              backgroundBlur === preset.value 
                                ? "bg-primary/20 text-primary border border-primary/40" 
                                : "bg-muted/20 text-foreground/70 border border-transparent"
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Adjust Menu Overlay */}
            {isAdjustMenuMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: '280px' }}>
                {/* Header with back button, title and confirm */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
                  <button
                    onClick={() => setIsAdjustMenuMode(false)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </button>
                  <span className="flex-1 text-sm font-medium text-foreground text-center">
                    Adjust
                  </span>
                  <button
                    onClick={() => {
                      setIsAdjustMenuMode(false);
                      toast({ title: "Adjustments applied" });
                    }}
                    className="w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </button>
                </div>
                
                {/* Top Tabs: Filters / Adjust */}
                <div className="flex border-b border-border/20">
                  {(['filters', 'adjust'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAdjustPanelTab(tab)}
                      className={cn(
                        "flex-1 py-2.5 text-sm font-medium capitalize relative transition-colors",
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
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Sub-menu: Smart / Customize + AI Enhance Button */}
                    <div className="flex items-center gap-2 px-3 py-2">
                      {(['smart', 'customize'] as const).map((subTab) => (
                        <button
                          key={subTab}
                          onClick={() => setAdjustSubTab(subTab)}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium capitalize transition-all",
                            adjustSubTab === subTab 
                              ? "bg-primary/20 text-primary border border-primary/40" 
                              : "bg-muted/30 text-foreground/60 border border-transparent"
                          )}
                        >
                          {subTab}
                        </button>
                      ))}
                      <div className="flex-1" />
                      {/* AI Enhance Button */}
                      <button
                        onClick={async () => {
                          setIsAIEnhancing(true);
                          await new Promise(resolve => setTimeout(resolve, 1500));
                          setAdjustments({
                            brightness: 0.08,
                            contrast: 0.12,
                            saturation: 0.15,
                            exposure: 0.05,
                            sharpen: 0.18,
                            highlight: -0.1,
                            shadow: 0.12,
                            temp: 0.02,
                            hue: 0,
                          });
                          if (selectedClipId) {
                            setVideoClips(prev => prev.map(clip => 
                              clip.id === selectedClipId 
                                ? { ...clip, aiEnhanced: true }
                                : clip
                            ));
                          }
                          setIsAIEnhancing(false);
                          toast({ title: "AI Enhancement applied" });
                        }}
                        disabled={isAIEnhancing}
                        title="Uses AI Credits"
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                          "bg-gradient-to-r from-violet-500 to-purple-500 text-white",
                          "disabled:opacity-60"
                        )}
                      >
                        {isAIEnhancing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            <Wand2 className="w-3 h-3" />
                            <span>AI Enhance</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Horizontal Scrollable Adjustment Icons */}
                    <div className="overflow-x-auto px-2 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
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
                                "flex flex-col items-center justify-center w-14 py-1.5 rounded-xl transition-all",
                                isSelected ? "bg-primary/15" : "bg-transparent"
                              )}
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all",
                                isSelected 
                                  ? "bg-primary text-primary-foreground" 
                                  : value !== 0 
                                    ? "bg-muted/50 text-primary" 
                                    : "bg-muted/30 text-foreground/70"
                              )}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <span className={cn(
                                "text-[9px] font-medium",
                                isSelected ? "text-primary" : value !== 0 ? "text-foreground" : "text-foreground/60"
                              )}>
                                {tool.name}
                              </span>
                              {value !== 0 && (
                                <span className="text-[8px] text-primary font-semibold">
                                  {value >= 0 ? '+' : ''}{Math.round(value * 100)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Single Slider for Selected Adjustment */}
                    <div className="px-4 pb-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-foreground">
                          {adjustmentTools.find(t => t.id === selectedAdjustmentId)?.name}
                        </span>
                        <span className={cn(
                          "text-xs font-mono px-2 py-0.5 rounded",
                          adjustments[selectedAdjustmentId] !== 0 
                            ? "bg-primary/15 text-primary" 
                            : "bg-muted/30 text-foreground/60"
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
                        className="w-full h-1.5 bg-muted/30 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                    
                    {/* Reset Button */}
                    <div className="flex justify-start px-4 pb-2">
                      <button
                        onClick={resetAdjustments}
                        className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors"
                      >
                        <RotateCcw className="w-4 h-4 text-foreground/70" />
                      </button>
                    </div>
                  </div>
                )}
                
                {adjustPanelTab === 'filters' && (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <Circle className="w-8 h-8 text-foreground/30 mb-2" />
                    <p className="text-foreground/50 text-xs">Filter presets coming soon</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Audio Menu Overlay */}
            {isAudioMenuMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: '160px' }}>
                {/* Header with back button and title */}
                <div className="flex items-center px-4 py-2 border-b border-border/20">
                  <button
                    onClick={() => setIsAudioMenuMode(false)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <ChevronDown className="w-5 h-5 text-primary" />
                  </button>
                  <span className="flex-1 text-sm font-medium text-foreground text-center pr-8">
                    Audio
                  </span>
                </div>
                
                {/* Horizontal Scrollable Audio Tools */}
                <div className="flex-1 flex items-start pt-4 overflow-x-auto px-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div className="flex gap-2 min-w-max">
                    {/* Upload - File Picker for audio files */}
                    <button
                      onClick={() => audioInputRef.current?.click()}
                      className="flex flex-col items-center justify-center w-16 rounded-xl transition-all hover:bg-muted/50"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-primary/20 border border-primary/30">
                        <FolderOpen className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-[10px] font-medium text-foreground/60">
                        Upload
                      </span>
                    </button>
                    {/* Record - Voice recording */}
                    <button
                      onClick={startAudioRecording}
                      className="flex flex-col items-center justify-center w-16 rounded-xl transition-all hover:bg-muted/50"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-destructive/20 border border-destructive/30">
                        <Mic className="w-5 h-5 text-destructive" />
                      </div>
                      <span className="text-[10px] font-medium text-foreground/60">
                        Record
                      </span>
                    </button>
                    {/* Music - Music library */}
                    <button
                      onClick={() => toast({ title: "Music library coming soon" })}
                      className="flex flex-col items-center justify-center w-16 rounded-xl transition-all hover:bg-muted/50"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-emerald-500/20 border border-emerald-500/30">
                        <Music className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] font-medium text-foreground/60">
                        Music
                      </span>
                    </button>
                    {/* Sound FX */}
                    <button
                      onClick={() => toast({ title: "Sound FX library coming soon" })}
                      className="flex flex-col items-center justify-center w-16 rounded-xl transition-all hover:bg-muted/50"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-muted/30">
                        <Sparkles className="w-5 h-5 text-foreground" />
                      </div>
                      <span className="text-[10px] font-medium text-foreground/60">
                        Sound FX
                      </span>
                    </button>
                    {/* Other tools */}
                    {[
                      { id: 'extract', name: 'Extract', icon: Waves, action: () => toast({ title: "Extract coming soon" }) },
                      { id: 'text-to-audio', name: 'Text to audio', icon: AudioLines, action: () => toast({ title: "Text to audio coming soon" }) },
                    ].map((tool) => {
                      const IconComponent = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={tool.action}
                          className="flex flex-col items-center justify-center w-16 rounded-xl transition-all hover:bg-muted/50"
                        >
                          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5 bg-muted/30">
                            <IconComponent className="w-5 h-5 text-foreground" />
                          </div>
                          <span className="text-[10px] font-medium text-foreground/60">
                            {tool.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Hidden audio input */}
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioImport}
                  className="hidden"
                />
              </div>
            )}
            
            {/* Audio Recording Overlay */}
            {showRecordingOverlay && (
              <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-in fade-in duration-200">
                {/* Recording animation */}
                <div className="relative mb-8">
                  {/* Pulsing rings */}
                  <div className="absolute inset-0 -m-4 rounded-full bg-destructive/20 animate-ping" />
                  <div className="absolute inset-0 -m-8 rounded-full bg-destructive/10 animate-pulse" style={{ animationDelay: '0.5s' }} />
                  
                  {/* Center mic button */}
                  <button
                    onClick={stopAudioRecording}
                    className="relative w-24 h-24 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-colors"
                  >
                    {isRecording ? (
                      <Square className="w-10 h-10 text-white fill-white" />
                    ) : (
                      <Mic className="w-10 h-10 text-white" />
                    )}
                  </button>
                </div>
                
                {/* Timer */}
                <div className="text-3xl font-mono font-bold text-foreground mb-3">
                  {formatRecordingTime(recordingDuration)}
                </div>
                
                {/* Status text */}
                <p className="text-muted-foreground text-sm mb-6">
                  {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
                </p>
                
                {/* Cancel button */}
                <button
                  onClick={() => {
                    stopAudioRecording();
                    recordingChunksRef.current = []; // Discard recording
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {/* Audio Edit Menu Overlay */}
            {isAudioEditMode && selectedAudioLayer && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: audioEditSubPanel !== 'none' ? '220px' : '160px' }}>
                {/* Header with back button, title and confirm */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
                  <button
                    onClick={() => {
                      if (audioEditSubPanel !== 'none') {
                        setAudioEditSubPanel('none');
                      } else {
                        setIsAudioEditMode(false);
                        setSelectedAudioId(null);
                      }
                    }}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    {audioEditSubPanel !== 'none' ? (
                      <ChevronLeft className="w-5 h-5 text-primary" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-primary" />
                    )}
                  </button>
                  <span className="flex-1 text-sm font-medium text-foreground text-center">
                    {audioEditSubPanel === 'volume' ? 'Volume' : audioEditSubPanel === 'fade' ? 'Fade In/Out' : 'Edit Audio'}
                  </span>
                  {audioEditSubPanel !== 'none' && (
                    <button
                      onClick={() => {
                        if (audioEditSubPanel === 'volume') {
                          applyAudioVolume();
                        } else if (audioEditSubPanel === 'fade') {
                          applyAudioFade();
                        }
                        setAudioEditSubPanel('none');
                      }}
                      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white hover:bg-white/90 transition-colors"
                    >
                      <Check className="w-5 h-5 text-background" />
                    </button>
                  )}
                  {audioEditSubPanel === 'none' && <div className="w-8" />}
                </div>
                
                {/* Sub-panel content or main tools */}
                {audioEditSubPanel === 'volume' ? (
                  /* Volume Slider Sub-panel - 0 to 1000 range */
                  <div className="flex-1 flex flex-col justify-center px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Volume2 className="w-5 h-5 text-emerald-400" />
                      <div className="flex-1 relative h-2">
                        <div className="absolute inset-0 h-full bg-muted/30 rounded-full" />
                        <div 
                          className="absolute left-0 top-0 h-full rounded-full transition-all bg-emerald-500"
                          style={{ width: `${(editingAudioVolume / 1000) * 100}%` }}
                        />
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md border border-emerald-500 transition-all"
                          style={{ left: `calc(${(editingAudioVolume / 1000) * 100}% - 8px)` }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="1000"
                          step="10"
                          value={editingAudioVolume}
                          onChange={(e) => setEditingAudioVolume(parseInt(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground font-medium">0</span>
                      <span className="text-sm font-bold text-emerald-400">{editingAudioVolume}%</span>
                      <span className="text-xs text-muted-foreground font-medium">1000</span>
                    </div>
                  </div>
                ) : audioEditSubPanel === 'fade' ? (
                  /* Fade In/Out Sub-panel */
                  <div className="flex-1 flex flex-col justify-center px-4 py-3 gap-4">
                    {/* Fade In */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-foreground/70">Fade In</span>
                        <span className="text-xs font-bold text-emerald-400">{editingAudioFadeIn.toFixed(1)}s</span>
                      </div>
                      <div className="relative h-2">
                        <div className="absolute inset-0 h-full bg-muted/30 rounded-full" />
                        <div 
                          className="absolute left-0 top-0 h-full rounded-full transition-all bg-emerald-500"
                          style={{ width: `${(editingAudioFadeIn / 5) * 100}%` }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.1"
                          value={editingAudioFadeIn}
                          onChange={(e) => setEditingAudioFadeIn(parseFloat(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                    {/* Fade Out */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-foreground/70">Fade Out</span>
                        <span className="text-xs font-bold text-emerald-400">{editingAudioFadeOut.toFixed(1)}s</span>
                      </div>
                      <div className="relative h-2">
                        <div className="absolute inset-0 h-full bg-muted/30 rounded-full" />
                        <div 
                          className="absolute left-0 top-0 h-full rounded-full transition-all bg-emerald-500"
                          style={{ width: `${(editingAudioFadeOut / 5) * 100}%` }}
                        />
                        <input
                          type="range"
                          min="0"
                          max="5"
                          step="0.1"
                          value={editingAudioFadeOut}
                          onChange={(e) => setEditingAudioFadeOut(parseFloat(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Main Audio Edit Tools */
                  <div className="flex-1 flex items-start pt-4 overflow-x-auto px-3" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="flex gap-2 min-w-max">
                      {[
                        { id: 'volume', name: 'Volume', icon: Volume2, action: () => setAudioEditSubPanel('volume') },
                        { id: 'fade', name: 'Fade In/Out', icon: Sunrise, action: () => setAudioEditSubPanel('fade') },
                        { id: 'split', name: 'Split', icon: Scissors, action: () => { splitAudioAtPlayhead(selectedAudioId!); setIsAudioEditMode(false); } },
                        { id: 'delete', name: 'Delete', icon: Trash2, isDestructive: true, action: () => { deleteAudioLayer(selectedAudioId!); setIsAudioEditMode(false); } },
                      ].map((tool) => {
                        const IconComponent = tool.icon;
                        const isDestructive = 'isDestructive' in tool && tool.isDestructive;
                        return (
                          <button
                            key={tool.id}
                            onClick={tool.action}
                            className="flex flex-col items-center justify-center w-16 rounded-xl transition-all hover:bg-muted/50"
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center mb-1.5",
                              isDestructive ? "bg-destructive/20" : "bg-emerald-500/20"
                            )}>
                              <IconComponent className={cn(
                                "w-5 h-5",
                                isDestructive ? "text-destructive" : "text-emerald-400"
                              )} />
                            </div>
                            <span className={cn(
                              "text-[10px] font-medium",
                              isDestructive ? "text-destructive" : "text-foreground/60"
                            )}>
                              {tool.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Draw Mode Menu Overlay */}
            {isDrawMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: '220px' }}>
                {/* Header with Undo/Redo and title and save button */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={undoDrawStroke}
                      disabled={currentStrokes.length === 0 && drawUndoStack.length === 0}
                      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted/20 hover:bg-muted/40 transition-colors disabled:opacity-30"
                    >
                      <Undo2 className="w-4 h-4 text-foreground" />
                    </button>
                    <button
                      onClick={redoDrawStroke}
                      disabled={drawRedoStack.length === 0}
                      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted/20 hover:bg-muted/40 transition-colors disabled:opacity-30"
                    >
                      <Redo2 className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                  <span className="flex-1 text-sm font-medium text-foreground text-center">
                    Draw
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setCurrentStrokes([]);
                        setIsDrawMode(false);
                      }}
                      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <X className="w-4 h-4 text-foreground" />
                    </button>
                    <button
                      onClick={saveDrawingAsLayer}
                      className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary hover:bg-primary/90 transition-colors"
                    >
                      <Check className="w-5 h-5 text-primary-foreground" />
                    </button>
                  </div>
                </div>
                
                {/* Tools Row - Brush, Eraser, Clear */}
                <div className="flex items-center justify-center gap-3 px-4 py-3 border-b border-border/10">
                  <button
                    onClick={() => setDrawTool('brush')}
                    className={cn(
                      "flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-all border",
                      drawTool === 'brush' 
                        ? "bg-primary/20 border-primary/40" 
                        : "bg-muted/20 border-transparent hover:bg-muted/40"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center mb-1",
                      drawTool === 'brush' ? "bg-primary/30" : "bg-muted/30"
                    )}>
                      <Pencil className={cn("w-4 h-4", drawTool === 'brush' ? "text-primary" : "text-foreground")} />
                    </div>
                    <span className={cn("text-[10px] font-medium", drawTool === 'brush' ? "text-primary" : "text-foreground/60")}>
                      Brush
                    </span>
                  </button>
                  <button
                    onClick={() => setDrawTool('eraser')}
                    className={cn(
                      "flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-all border",
                      drawTool === 'eraser' 
                        ? "bg-primary/20 border-primary/40" 
                        : "bg-muted/20 border-transparent hover:bg-muted/40"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center mb-1",
                      drawTool === 'eraser' ? "bg-primary/30" : "bg-muted/30"
                    )}>
                      <Eraser className={cn("w-4 h-4", drawTool === 'eraser' ? "text-primary" : "text-foreground")} />
                    </div>
                    <span className={cn("text-[10px] font-medium", drawTool === 'eraser' ? "text-primary" : "text-foreground/60")}>
                      Eraser
                    </span>
                  </button>
                  <button
                    onClick={clearAllDrawing}
                    className="flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-all border bg-muted/20 border-transparent hover:bg-destructive/20"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1 bg-muted/30">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </div>
                    <span className="text-[10px] font-medium text-destructive">
                      Clear All
                    </span>
                  </button>
                </div>
                
                {/* Color Picker Row */}
                <div className="px-4 py-2">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {drawColorPresets.map((color) => (
                      <button
                        key={color}
                        onClick={() => { setDrawColor(color); setDrawTool('brush'); }}
                        className={cn(
                          "w-7 h-7 rounded-full shrink-0 border-2 transition-all",
                          drawColor === color && drawTool === 'brush' 
                            ? "border-primary ring-2 ring-primary/30 scale-110" 
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Size Slider */}
                <div className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-foreground/60 w-8">Size</span>
                    <div className="flex-1 relative h-2">
                      <div className="absolute inset-0 h-full bg-muted/30 rounded-full" />
                      <div 
                        className="absolute left-0 top-0 h-full rounded-full transition-all bg-primary"
                        style={{ width: `${((drawSize - 1) / 29) * 100}%` }}
                      />
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-md transition-all"
                        style={{ left: `calc(${((drawSize - 1) / 29) * 100}% - 8px)` }}
                      />
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={drawSize}
                        onChange={(e) => setDrawSize(parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-xs text-foreground font-medium w-6">{drawSize}px</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Crop Mode Menu Overlay */}
            {isCropMode && (
              <div className="absolute bottom-0 left-0 right-0 bg-background animate-in fade-in slide-in-from-bottom duration-200 z-30 flex flex-col" style={{ height: '180px' }}>
                {/* Header with back and save buttons */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
                  <button
                    onClick={() => {
                      setIsCropMode(false);
                      setCropRotation(0);
                      setCropMirror(false);
                    }}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-foreground" />
                  </button>
                  <span className="flex-1 text-sm font-medium text-foreground text-center">
                    Crop
                  </span>
                  <button
                    onClick={() => {
                      saveStateToHistory();
                      toast({ 
                        title: "Crop applied", 
                        description: `${cropAspectRatio === 'free' ? 'Free' : cropAspectRatio} crop, ${cropRotation}° rotation${cropMirror ? ', mirrored' : ''}` 
                      });
                      setIsCropMode(false);
                    }}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary hover:bg-primary/90 transition-colors"
                  >
                    <Check className="w-5 h-5 text-primary-foreground" />
                  </button>
                </div>
                
                {/* Aspect Ratio Presets Row */}
                <div className="px-4 py-3 border-b border-border/10">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                    {[
                      { id: 'free', label: 'Free' },
                      { id: '1:1', label: '1:1' },
                      { id: '4:5', label: '4:5' },
                      { id: '16:9', label: '16:9' },
                      { id: '9:16', label: '9:16' },
                      { id: '3:4', label: '3:4' },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setCropAspectRatio(preset.id);
                          // Reset crop box to match aspect ratio
                          if (preset.id !== 'free') {
                            const [w, h] = preset.id.split(':').map(Number);
                            const ratio = w / h;
                            const newWidth = Math.min(0.8, 0.8);
                            const newHeight = newWidth / ratio;
                            setCropBox({
                              x: (1 - newWidth) / 2,
                              y: (1 - Math.min(0.8, newHeight)) / 2,
                              width: newWidth,
                              height: Math.min(0.8, newHeight),
                            });
                          }
                        }}
                        className={cn(
                          "px-4 py-2 rounded-lg shrink-0 border transition-all",
                          cropAspectRatio === preset.id 
                            ? "bg-primary/20 border-primary text-primary" 
                            : "bg-muted/20 border-transparent text-foreground/70 hover:bg-muted/40"
                        )}
                      >
                        <span className="text-xs font-semibold">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Rotate and Mirror Row */}
                <div className="flex items-center justify-center gap-6 px-4 py-4">
                  <button
                    onClick={() => setCropRotation((prev) => (prev + 90) % 360)}
                    className="flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors">
                      <RotateCw className="w-5 h-5 text-foreground" />
                    </div>
                    <span className="text-[10px] font-medium text-foreground/60">
                      Rotate {cropRotation > 0 ? `(${cropRotation}°)` : ''}
                    </span>
                  </button>
                  
                  <button
                    onClick={() => setCropMirror((prev) => !prev)}
                    className="flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                      cropMirror ? "bg-primary/30" : "bg-muted/30 hover:bg-muted/50"
                    )}>
                      <FlipHorizontal className={cn("w-5 h-5", cropMirror ? "text-primary" : "text-foreground")} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium",
                      cropMirror ? "text-primary" : "text-foreground/60"
                    )}>
                      Mirror
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
          </>
        )
      }
      {/* Output Settings Drawer - Opens from top */}
      {showOutputSettings && (
        <div className="fixed inset-0 z-50 flex items-start justify-center">
          {/* Backdrop with fade animation */}
          <div 
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setShowOutputSettings(false)}
          />
          
          {/* Drawer Content - slides from top */}
          <div className="relative w-full bg-[#0A0A0A] rounded-b-xl p-3 shadow-2xl animate-in slide-in-from-top duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-semibold">Output Settings</span>
                <div className="h-0.5 w-5 bg-primary rounded-full" />
              </div>
              <button 
                onClick={() => setShowOutputSettings(false)}
                className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
            
            {/* Vertical Stack Layout */}
            <div className="space-y-2.5">
              {/* Resolution */}
              <div className="bg-white/5 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-white text-[10px] font-medium">Resolution</span>
                    <HelpCircle className="w-2.5 h-2.5 text-white/40" />
                  </div>
                  <span className="text-primary text-[9px] font-medium">{outputResolution}</span>
                </div>
                <div className="relative h-1 bg-white/20 rounded-full">
                  <div 
                    className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(['480p', '720p', '1080p', '2K/4K'].indexOf(outputResolution) / 3) * 100}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={3}
                    value={['480p', '720p', '1080p', '2K/4K'].indexOf(outputResolution)}
                    onChange={(e) => setOutputResolution(['480p', '720p', '1080p', '2K/4K'][parseInt(e.target.value)])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-all"
                    style={{ left: `calc(${(['480p', '720p', '1080p', '2K/4K'].indexOf(outputResolution) / 3) * 100}% - 6px)` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  {['480p', '720p', '1080p', '4K'].map((r) => (
                    <span key={r} className="text-white/50 text-[8px]">{r}</span>
                  ))}
                </div>
              </div>
              
              {/* Frame Rate */}
              <div className="bg-white/5 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-[10px] font-medium">Frame Rate</span>
                  <span className="text-primary text-[9px] font-medium">{outputFrameRate}fps</span>
                </div>
                <div className="relative h-1 bg-white/20 rounded-full">
                  <div 
                    className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all"
                    style={{ width: `${([24, 25, 30, 50, 60].indexOf(outputFrameRate) / 4) * 100}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={4}
                    value={[24, 25, 30, 50, 60].indexOf(outputFrameRate)}
                    onChange={(e) => setOutputFrameRate([24, 25, 30, 50, 60][parseInt(e.target.value)])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-all"
                    style={{ left: `calc(${([24, 25, 30, 50, 60].indexOf(outputFrameRate) / 4) * 100}% - 6px)` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  {[24, 25, 30, 50, 60].map((r) => (
                    <span key={r} className="text-white/50 text-[8px]">{r}</span>
                  ))}
                </div>
              </div>
              
              {/* Bitrate */}
              <div className="bg-white/5 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-[10px] font-medium">Bitrate (Mbps)</span>
                  <span className="text-primary text-[9px] font-medium">{outputBitrate} Mbps</span>
                </div>
                <div className="relative h-1 bg-white/20 rounded-full">
                  <div 
                    className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all"
                    style={{ width: `${([5, 10, 20, 50, 100].indexOf(outputBitrate) / 4) * 100}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={4}
                    value={[5, 10, 20, 50, 100].indexOf(outputBitrate)}
                    onChange={(e) => setOutputBitrate([5, 10, 20, 50, 100][parseInt(e.target.value)])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transition-all"
                    style={{ left: `calc(${([5, 10, 20, 50, 100].indexOf(outputBitrate) / 4) * 100}% - 6px)` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  {[5, 10, 20, 50, 100].map((r) => (
                    <span key={r} className="text-white/50 text-[8px]">{r}</span>
                  ))}
                </div>
              </div>
              
              {/* Optical Flow */}
              <div className="bg-white/5 rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-white text-[10px] font-medium">Optical Flow</span>
                  <p className="text-white/40 text-[8px] mt-0.5">Smoother playback</p>
                </div>
                <button
                  onClick={() => setOpticalFlowEnabled(!opticalFlowEnabled)}
                  className={cn(
                    "w-8 h-4 rounded-full transition-all duration-200 relative",
                    opticalFlowEnabled ? "bg-primary" : "bg-white/20"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200",
                    opticalFlowEnabled ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              
              {/* Estimated File Size */}
              <div className="text-center py-1">
                <span className="text-white/40 text-[9px]">Estimated file size: ~{Math.round((outputBitrate * (duration || 10)) / 8)} MB</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
