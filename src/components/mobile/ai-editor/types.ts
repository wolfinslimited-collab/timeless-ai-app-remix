// AI Editor Project Types

export interface EditorProject {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  thumbnail: string | null;
  
  // Video state
  videoUrl: string | null;
  videoDuration: number;
  videoDimensions: { width: number; height: number } | null;
  
  // Clip state
  videoClips: SavedVideoClip[];
  
  // Overlay state
  textOverlays: SavedTextOverlay[];
  audioLayers: SavedAudioLayer[];
  effectLayers: SavedEffectLayer[];
  captionLayers: SavedCaptionLayer[];
  drawingLayers: SavedDrawingLayer[];
  videoOverlays: SavedVideoOverlay[];
  
  // Adjustments
  adjustments: {
    brightness: number;
    contrast: number;
    saturation: number;
    exposure: number;
    sharpen: number;
    highlight: number;
    shadow: number;
    temp: number;
    hue: number;
  };
  
  // Background state
  selectedAspectRatio: string;
  backgroundColor: string;
  backgroundBlur: number;
  backgroundImage: string | null;
  videoPosition: { x: number; y: number };
}

export interface SavedVideoClip {
  id: string;
  url: string;
  duration: number;
  startTime: number;
  inPoint: number;
  outPoint: number;
  volume: number;
  speed: number;
  aiEnhanced?: boolean;
  animationIn?: { id: string; type: string; duration: number } | null;
  animationOut?: { id: string; type: string; duration: number } | null;
}

export interface SavedTextOverlay {
  id: string;
  text: string;
  position: { x: number; y: number };
  fontSize: number;
  textColor: string;
  fontFamily: string;
  alignment: string;
  hasBackground: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  startTime: number;
  endTime: number;
  opacity: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  glowEnabled: boolean;
  glowColor: string;
  glowIntensity: number;
  shadowEnabled: boolean;
  shadowColor: string;
  letterSpacing: number;
  curveAmount: number;
  animation: string;
  bubbleStyle: string;
  rotation: number;
  scale: number;
  scaleX: number;
  scaleY: number;
}

export interface SavedAudioLayer {
  id: string;
  name: string;
  fileUrl: string;
  volume: number;
  startTime: number;
  endTime: number;
  fadeIn: number;
  fadeOut: number;
  waveformData: number[];
}

export interface SavedEffectLayer {
  id: string;
  effectId: string;
  name: string;
  category: string;
  intensity: number;
  startTime: number;
  endTime: number;
}

export interface SavedCaptionLayer {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface SavedDrawingLayer {
  id: string;
  strokes: Array<{
    id: string;
    points: Array<{ x: number; y: number }>;
    color: string;
    size: number;
    tool: string;
  }>;
  startTime: number;
  endTime: number;
}

export interface SavedVideoOverlay {
  id: string;
  url: string;
  duration: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  scale: number;
  startTime: number;
  endTime: number;
  volume: number;
  opacity: number;
}
