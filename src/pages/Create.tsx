import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCredits, getModelCost } from "@/hooks/useCredits";
import { useBackgroundGenerations } from "@/hooks/useBackgroundGenerations";
import TopMenu from "@/components/TopMenu";
import AppsSidebar, { AppId } from "@/components/AppsSidebar";
import BottomNav from "@/components/BottomNav";
import AudioWaveform from "@/components/AudioWaveform";
import CinemaStudio from "@/components/CinemaStudio";
// Image Tool components
import UpscaleTool from "@/components/tools/UpscaleTool";
import BackgroundRemoveTool from "@/components/tools/BackgroundRemoveTool";
import RelightTool from "@/components/tools/RelightTool";
import AngleTool from "@/components/tools/AngleTool";
import SkinEnhancerTool from "@/components/tools/SkinEnhancerTool";
import ColorizeTool from "@/components/tools/ColorizeTool";
import StyleTransferTool from "@/components/tools/StyleTransferTool";
import InpaintingTool from "@/components/tools/InpaintingTool";
// Video Tool components
import VideoUpscaleTool from "@/components/tools/VideoUpscaleTool";
import LipSyncTool from "@/components/tools/LipSyncTool";
import ExtendVideoTool from "@/components/tools/ExtendVideoTool";
import InterpolateTool from "@/components/tools/InterpolateTool";
import SketchToVideoTool from "@/components/tools/SketchToVideoTool";
import DrawToVideoTool from "@/components/tools/DrawToVideoTool";
import SoraTrendsTool from "@/components/tools/SoraTrendsTool";
import ClickToAdTool from "@/components/tools/ClickToAdTool";
import UGCFactoryTool from "@/components/tools/UGCFactoryTool";
import MixedMediaTool from "@/components/tools/MixedMediaTool";
// Music Tool components
import StemsTool from "@/components/tools/StemsTool";
import RemixTool from "@/components/tools/RemixTool";
import VocalsTool from "@/components/tools/VocalsTool";
import MasteringTool from "@/components/tools/MasteringTool";
import SoundEffectsTool from "@/components/tools/SoundEffectsTool";
import AudioEnhanceTool from "@/components/tools/AudioEnhanceTool";
import TempoPitchTool from "@/components/tools/TempoPitchTool";
// Cinema Tool components
import CameraControlTool from "@/components/tools/CameraControlTool";
import MotionPathTool from "@/components/tools/MotionPathTool";
import DepthControlTool from "@/components/tools/DepthControlTool";
import LensEffectsTool from "@/components/tools/LensEffectsTool";
import ColorGradeTool from "@/components/tools/ColorGradeTool";
import StabilizeTool from "@/components/tools/StabilizeTool";
// Chat components
import ChatToolLayout from "@/components/tools/ChatToolLayout";
import GenerationCard from "@/components/GenerationCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Image as ImageIcon,
  Video, 
  Sparkles, 
  Loader2, 
  Download,
  Wand2,
  Zap,
  Coins,
  Infinity,
  Upload,
  X,
  Lightbulb,
  Clock,
  RotateCcw,
  AlertCircle,
  Play,
  RefreshCw,
  Music,
  Pause,
  ChevronDown,
  Info,
  Clapperboard,
  Camera,
  Focus,
  Film,
  Move3d,
  Star
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddCreditsDialog from "@/components/AddCreditsDialog";

// Image Models (Fal.ai + Lovable AI)
const imageModels = [
  // Premium Models
  { id: "gpt-image-1.5", name: "GPT Image 1.5", description: "OpenAI multimodal gen", badge: "TOP", credits: 10, provider: "fal" },
  { id: "nano-banana", name: "Nano Banana", description: "Google Gemini image gen", badge: "TOP", credits: 4, provider: "lovable" },
  { id: "nano-banana-pro", name: "Nano Banana Pro", description: "Next-gen Gemini image", badge: "TOP", credits: 6, provider: "lovable" },
  { id: "flux-1.1-pro", name: "Flux 1.1 Pro", description: "High quality creative", badge: "PRO", credits: 5, provider: "fal" },
  { id: "flux-pro-ultra", name: "Flux Pro Ultra", description: "Ultimate quality", badge: "TOP", credits: 8, provider: "fal" },
  { id: "ideogram-v2", name: "Ideogram V2", description: "Best for text in images", badge: "TOP", credits: 6, provider: "fal" },
  { id: "recraft-v3", name: "Recraft V3", description: "Design & illustration", badge: "PRO", credits: 5, provider: "fal" },
  // Fast Models
  { id: "flux-dev", name: "Flux Dev", description: "Fast development model", badge: "FAST", credits: 3, provider: "fal" },
  { id: "flux-schnell", name: "Flux Schnell", description: "Ultra fast generation", badge: "FAST", credits: 2, provider: "fal" },
  // Stable Diffusion
  { id: "stable-diffusion-3", name: "SD 3 Medium", description: "Stable Diffusion 3", badge: "NEW", credits: 4, provider: "fal" },
  { id: "sdxl", name: "SDXL", description: "High-res Stable Diffusion", badge: "HD", credits: 3, provider: "fal" },
  { id: "sdxl-lightning", name: "SDXL Lightning", description: "Fast SDXL variant", badge: "FAST", credits: 2, provider: "fal" },
  // Specialized
  { id: "aura-flow", name: "Aura Flow", description: "Artistic flow model", badge: "ART", credits: 4, provider: "fal" },
  { id: "playground-v2.5", name: "Playground v2.5", description: "Aesthetic focused", badge: "ART", credits: 4, provider: "fal" },
];

// Fal.ai Video Models
const videoModels = [
  { id: "wan-2.6", name: "Wan 2.6", description: "Latest Alibaba model", badge: "NEW", credits: 15 },
  { id: "kling-2.6", name: "Kling 2.6 Pro", description: "Cinematic with audio", badge: "TOP", credits: 25 },
  { id: "veo-3", name: "Veo 3", description: "Google's best with audio", badge: "TOP", credits: 30 },
  { id: "veo-3-fast", name: "Veo 3 Fast", description: "Faster Veo 3", badge: "PRO", credits: 20 },
  { id: "hailuo-02", name: "Hailuo-02", description: "MiniMax video model", badge: "NEW", credits: 18 },
  { id: "seedance-1.5", name: "Seedance 1.5", description: "With audio support", badge: "NEW", credits: 20 },
  { id: "luma", name: "Luma Dream Machine", description: "Creative video", badge: "PRO", credits: 22 },
  { id: "hunyuan-1.5", name: "Hunyuan 1.5", description: "Tencent video model", badge: "NEW", credits: 18 },
];

// Fal.ai Music Models
const musicModels = [
  { id: "sonauto", name: "Sonauto (Suno)", description: "Full songs with lyrics", badge: "TOP", credits: 15 },
  { id: "lyria2", name: "Lyria 2", description: "Google's best music AI", badge: "PRO", credits: 12 },
  { id: "cassetteai", name: "CassetteAI", description: "Fast professional tracks", badge: "FAST", credits: 10 },
  { id: "stable-audio", name: "Stable Audio", description: "Open source audio gen", badge: "NEW", credits: 8 },
];

// Cinema Studio Models (optimized for cinematic camera control)
const cinemaModels = [
  { id: "wan-2.6-cinema", name: "Wan Cinema", description: "Best for camera control", badge: "TOP", credits: 20 },
  { id: "kling-3.0-cinema", name: "Kling v3.0 Cinema", description: "Premium cinematic", badge: "PRO", credits: 30 },
  { id: "veo-3-cinema", name: "Veo 3 Cinema", description: "Google cinematic AI", badge: "TOP", credits: 35 },
  { id: "luma-cinema", name: "Luma Cinema", description: "Dream machine pro", badge: "PRO", credits: 28 },
];

// Camera Movement Presets (Higgsfield-style)
const cameraMovements = {
  classic: [
    { id: "static", label: "Static", icon: "📷", description: "Fixed camera, no movement" },
    { id: "dolly-in", label: "Dolly In", icon: "➡️", description: "Move camera toward subject" },
    { id: "dolly-out", label: "Dolly Out", icon: "⬅️", description: "Move camera away from subject" },
    { id: "pan-left", label: "Pan Left", icon: "↩️", description: "Rotate camera left" },
    { id: "pan-right", label: "Pan Right", icon: "↪️", description: "Rotate camera right" },
    { id: "tilt-up", label: "Tilt Up", icon: "⬆️", description: "Rotate camera upward" },
    { id: "tilt-down", label: "Tilt Down", icon: "⬇️", description: "Rotate camera downward" },
  ],
  dynamic: [
    { id: "zoom-in", label: "Zoom In", icon: "🔍", description: "Zoom lens toward subject" },
    { id: "zoom-out", label: "Zoom Out", icon: "🔎", description: "Zoom lens away from subject" },
    { id: "crash-zoom", label: "Crash Zoom", icon: "💥", description: "Fast dramatic zoom" },
    { id: "dolly-zoom", label: "Dolly Zoom", icon: "🌀", description: "Vertigo effect" },
    { id: "tracking-left", label: "Track Left", icon: "⏪", description: "Move camera left with subject" },
    { id: "tracking-right", label: "Track Right", icon: "⏩", description: "Move camera right with subject" },
    { id: "arc-left", label: "Arc Left", icon: "↺", description: "Arc around subject left" },
    { id: "arc-right", label: "Arc Right", icon: "↻", description: "Arc around subject right" },
  ],
  specialty: [
    { id: "crane-up", label: "Crane Up", icon: "🏗️", description: "Crane movement upward" },
    { id: "crane-down", label: "Crane Down", icon: "⬇️", description: "Crane movement downward" },
    { id: "handheld", label: "Handheld", icon: "🤚", description: "Realistic handheld shake" },
    { id: "360-orbit", label: "360 Orbit", icon: "🔄", description: "Full rotation around subject" },
    { id: "fpv-drone", label: "FPV Drone", icon: "🚁", description: "First person drone sweep" },
    { id: "bullet-time", label: "Bullet Time", icon: "⏱️", description: "Frozen spin effect" },
  ],
};

// Shot Types
const shotTypes = [
  { id: "extreme-wide", label: "Extreme Wide", icon: "🏔️", description: "Vast landscape shot" },
  { id: "wide", label: "Wide Shot", icon: "🖼️", description: "Full scene view" },
  { id: "medium-wide", label: "Medium Wide", icon: "👥", description: "Full body shot" },
  { id: "medium", label: "Medium Shot", icon: "👤", description: "Waist up" },
  { id: "medium-close", label: "Medium Close", icon: "🎭", description: "Chest up" },
  { id: "close-up", label: "Close Up", icon: "😊", description: "Face/detail shot" },
  { id: "extreme-close", label: "Extreme Close", icon: "👁️", description: "Eye/detail macro" },
];

// Camera Sensors (Film Simulation)
const cameraSensors = [
  { id: "digital-cinema", label: "Digital Cinema", description: "Clean modern look" },
  { id: "arri-alexa", label: "ARRI Alexa 35", description: "Hollywood standard" },
  { id: "red-komodo", label: "RED Komodo", description: "Sharp cinematic" },
  { id: "film-35mm", label: "35mm Film", description: "Classic film grain" },
  { id: "film-16mm", label: "16mm Film", description: "Indie film look" },
  { id: "vhs", label: "VHS", description: "Retro analog" },
];

// Lens Types
const lensTypes = [
  { id: "12mm", label: "12mm Ultra Wide", description: "Dramatic perspective" },
  { id: "24mm", label: "24mm Wide", description: "Environmental storytelling" },
  { id: "35mm", label: "35mm Standard", description: "Natural perspective" },
  { id: "50mm", label: "50mm Normal", description: "Human eye perspective" },
  { id: "85mm", label: "85mm Portrait", description: "Flattering compression" },
  { id: "135mm", label: "135mm Telephoto", description: "Strong compression" },
];

// Cinema Templates
const cinemaTemplates = [
  { label: "Epic Reveal", prompt: "Cinematic crane shot revealing a massive sci-fi cityscape at golden hour, dramatic lighting, IMAX quality" },
  { label: "Action Sequence", prompt: "Dynamic FPV drone shot following a car chase through narrow streets, adrenaline-pumping, fast paced" },
  { label: "Emotional Portrait", prompt: "Slow dolly in on a person's face showing deep emotion, shallow depth of field, intimate lighting" },
  { label: "Nature Documentary", prompt: "Smooth tracking shot through a dense rainforest, wildlife, National Geographic style, 4K" },
  { label: "Product Commercial", prompt: "360 orbit around a luxury product with dramatic lighting, high-end commercial quality" },
  { label: "Film Noir", prompt: "Moody tracking shot through rain-soaked streets at night, high contrast, venetian blind shadows" },
];

const VIDEO_DEFAULT_ASPECT_RATIOS = ["16:9", "9:16", "1:1"];
const VIDEO_DEFAULT_QUALITIES = ["480p", "720p", "1080p"];

// Fal.ai model capabilities
const VIDEO_MODEL_CAPABILITIES: Record<
  string,
  {
    aspectRatios?: string[];
    qualities?: string[];
    durations?: number[];
    slow?: boolean;
    requiresImage?: boolean;
  }
> = {
  "wan-2.6": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["480p", "720p"],
    durations: [3, 5, 7]
  },
  "kling-2.6": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["720p", "1080p"],
    durations: [5, 10],
    slow: true
  },
  "veo-3": { 
    aspectRatios: ["16:9", "9:16"],
    qualities: ["720p", "1080p"],
    durations: [5, 8],
    slow: true 
  },
  "veo-3-fast": { 
    aspectRatios: ["16:9", "9:16"],
    qualities: ["720p", "1080p"],
    durations: [5, 8]
  },
  "hailuo-02": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["720p"],
    durations: [5, 6]
  },
  "seedance-1.5": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["480p", "720p"],
    durations: [5, 10]
  },
  "luma": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["720p", "1080p"],
    durations: [5, 9]
  },
  "hunyuan-1.5": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["480p", "720p", "1080p"],
    durations: [5, 10]
  },
};

const imageTemplates = [
  { label: "Cyberpunk City", prompt: "A futuristic cyberpunk cityscape at night, neon lights reflecting on wet streets, flying cars, holographic advertisements, ultra detailed, 8K" },
  { label: "Fantasy Portrait", prompt: "An elegant fantasy portrait of a mystical elf warrior, intricate golden armor, ethereal lighting, magical forest background, highly detailed" },
  { label: "Product Shot", prompt: "Professional product photography, minimalist white background, soft studio lighting, high-end commercial style, sharp focus" },
  { label: "Abstract Art", prompt: "Abstract digital art with flowing organic shapes, vibrant gradient colors, dynamic composition, modern contemporary style" },
  { label: "Anime Style", prompt: "Beautiful anime illustration, Studio Ghibli inspired, soft pastel colors, detailed background, cinematic lighting" },
  { label: "Photorealistic", prompt: "Photorealistic image, ultra high resolution, natural lighting, professional DSLR quality, sharp details" },
];

const videoTemplates = [
  { label: "Cinematic Landscape", prompt: "Cinematic drone shot flying over majestic mountains at golden hour, smooth camera movement, epic scale, film grain" },
  { label: "Product Showcase", prompt: "Elegant product reveal with smooth 360 rotation, studio lighting, professional commercial style, premium feel" },
  { label: "Nature Scene", prompt: "Peaceful nature scene with gentle breeze moving through grass, soft sunlight, serene atmosphere, slow motion" },
  { label: "Urban Life", prompt: "Dynamic urban street scene, people walking, city lights, evening atmosphere, cinematic color grading" },
  { label: "Abstract Motion", prompt: "Abstract fluid motion graphics, morphing geometric shapes, vibrant colors, smooth transitions, mesmerizing loop" },
  { label: "Talking Portrait", prompt: "Professional talking head video, person speaking directly to camera, clean background, natural expressions" },
];

const musicTemplates = [
  { label: "Cinematic Epic", prompt: "An epic orchestral track for a movie trailer, dramatic build-up, brass and strings, heroic theme" },
  { label: "Lo-Fi Beats", prompt: "Chill lo-fi hip hop beat for studying, vinyl crackle, soft piano, mellow drums, relaxing vibes" },
  { label: "Acoustic Folk", prompt: "Warm acoustic folk song about traveling, fingerpicked guitar, soft vocals, storytelling" },
  { label: "Ambient Chill", prompt: "Ambient atmospheric soundscape, soft pads, gentle textures, peaceful and meditative" },
];

// Genre presets for music
const musicGenrePresets = [
  { label: "Pop", icon: "🎤", prompt: "A catchy upbeat pop song, 120 BPM, major key, modern production with synths, drums, and hooks" },
  { label: "Rock", icon: "🎸", prompt: "A powerful rock song with electric guitars, driving drums, bass, energetic and raw sound" },
  { label: "Jazz", icon: "🎷", prompt: "Smooth jazz track with saxophone, piano chords, walking bass line, brushed drums, sophisticated vibe" },
  { label: "Electronic", icon: "🎹", prompt: "Electronic dance music, 128 BPM, synthesizers, heavy bass drops, festival-ready production" },
  { label: "Classical", icon: "🎻", prompt: "Classical orchestral piece with strings, woodwinds, brass, elegant and timeless composition" },
  { label: "Hip-Hop", icon: "🎧", prompt: "Hip-hop beat with punchy drums, 808 bass, trap hi-hats, modern urban production" },
  { label: "R&B", icon: "💜", prompt: "Smooth R&B track with soulful vocals, lush harmonies, groovy rhythm, romantic mood" },
  { label: "Country", icon: "🤠", prompt: "Country song with acoustic guitar, steel guitar, fiddle, heartfelt storytelling lyrics" },
];

const Create = () => {
  const { user, loading } = useAuth();
  const { credits, loading: creditsLoading, refetch: refetchCredits, hasEnoughCreditsForModel, hasActiveSubscription } = useCredits();
  const { 
    pendingGenerations, 
    completedGenerations, 
    isChecking, 
    checkPendingGenerations,
    fetchPendingGenerations,
    dismissCompleted,
    hasPending 
  } = useBackgroundGenerations();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Read type from URL params
  const urlType = searchParams.get("type") as "chat" | "image" | "video" | "music" | "cinema" | null;
  const [type, setType] = useState<"chat" | "image" | "video" | "music" | "cinema">(urlType || "chat");
  
  // Sync type with URL params
  useEffect(() => {
    const newType = searchParams.get("type") as "chat" | "image" | "video" | "music" | "cinema" | null;
    if (newType && newType !== type) {
      handleTypeChange(newType);
    }
  }, [searchParams]);
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  // Load saved models from localStorage
  const getSavedModel = (genType: string): string => {
    const saved = localStorage.getItem(`timeless_${genType}_model`);
    const defaults: Record<string, string> = {
      image: "flux-1.1-pro",
      video: "wan-2.6",
      cinema: "wan-2.6-cinema",
      music: "sonauto",
    };
    return saved || defaults[genType] || "flux-1.1-pro";
  };

  const [model, setModel] = useState(() => getSavedModel(urlType || "image"));
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("720p");

  // Persist model selection to localStorage
  useEffect(() => {
    if (type === "image" || type === "video" || type === "cinema" || type === "music") {
      localStorage.setItem(`timeless_${type}_model`, model);
    }
  }, [model, type]);
  const [startingImage, setStartingImage] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [cinemaReferenceImages, setCinemaReferenceImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingRefIndex, setUploadingRefIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoDuration, setVideoDuration] = useState(5);
  
  // Music-specific state
  const [lyrics, setLyrics] = useState("");
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [vocalGender, setVocalGender] = useState<"male" | "female">("female");
  const [weirdness, setWeirdness] = useState(50);
  const [styleInfluence, setStyleInfluence] = useState(50);
  const [duration, setDuration] = useState(30);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  // Cinema Studio state
  const [selectedMovements, setSelectedMovements] = useState<string[]>([]);
  const [shotType, setShotType] = useState("medium");
  const [cameraSensor, setCameraSensor] = useState("digital-cinema");
  const [lensType, setLensType] = useState("35mm");
  const [movementIntensity, setMovementIntensity] = useState(50);
  const [cinematicDuration, setCinematicDuration] = useState(5);
  
  // Selected app in sidebar
  const [selectedApp, setSelectedApp] = useState<AppId>("generate");
  
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [result, setResult] = useState<{ output_url?: string; storyboard?: string } | null>(null);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);

  // User's video generations for the video page
  interface VideoGeneration {
    id: string;
    title: string | null;
    prompt: string;
    type: string;
    model: string;
    status: string;
    output_url: string | null;
    thumbnail_url: string | null;
    credits_used: number;
    created_at: string;
  }
  const [userVideos, setUserVideos] = useState<VideoGeneration[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

  // Fetch user videos when on video page
  useEffect(() => {
    if (type === "video" && user) {
      fetchUserVideos();
    }
  }, [type, user]);

  const fetchUserVideos = async () => {
    if (!user) return;
    setIsLoadingVideos(true);
    try {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("type", "video")
        .neq("model", "Translate-Ai")
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      setUserVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const deleteUserVideo = async (id: string) => {
    try {
      const { error } = await supabase
        .from("generations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setUserVideos(prev => prev.filter(v => v.id !== id));
      toast({
        title: "Deleted",
        description: "Video removed from library.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete video.",
      });
    }
  };

  const currentCost = type === "video" ? getModelCost(model, quality) : getModelCost(model);

  const allowedVideoAspectRatios =
    VIDEO_MODEL_CAPABILITIES[model]?.aspectRatios ?? VIDEO_DEFAULT_ASPECT_RATIOS;
  const allowedVideoQualities =
    VIDEO_MODEL_CAPABILITIES[model]?.qualities ?? VIDEO_DEFAULT_QUALITIES;
  const allowedVideoDurations =
    VIDEO_MODEL_CAPABILITIES[model]?.durations ?? [5];


  useEffect(() => {
    if (type !== "video") return;

    if (!allowedVideoAspectRatios.includes(aspectRatio)) {
      setAspectRatio(allowedVideoAspectRatios[0]);
    }

    if (!allowedVideoQualities.includes(quality)) {
      setQuality(allowedVideoQualities[0]);
    }

    if (!allowedVideoDurations.includes(videoDuration)) {
      setVideoDuration(allowedVideoDurations[0]);
    }
    // Only react to model/type changes; user selections are constrained by UI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, model]);
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt required",
        description: "Please enter a description for your creation.",
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to generate content.",
      });
      navigate("/auth");
      return;
    }

    // Guard against provider-rejected combinations (quality/aspect can be model-specific)
    if (type === "video") {
      // Check if I2V model requires starting image
      const modelCaps = VIDEO_MODEL_CAPABILITIES[model];
      if (modelCaps?.requiresImage && !startingImage) {
        toast({
          variant: "destructive",
          title: "Starting image required",
          description: "This Image-to-Video model requires you to upload a starting image first.",
        });
        return;
      }

      if (!allowedVideoAspectRatios.includes(aspectRatio)) {
        toast({
          variant: "destructive",
          title: "Unsupported aspect ratio",
          description: `This model supports: ${allowedVideoAspectRatios.join(", ")}.`,
        });
        return;
      }

      if (!allowedVideoQualities.includes(quality)) {
        toast({
          variant: "destructive",
          title: "Unsupported quality",
          description: `This model supports: ${allowedVideoQualities.join(", ")}.`,
        });
        return;
      }
    }

    if (!hasEnoughCreditsForModel(model)) {
      setShowAddCreditsDialog(true);
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setGenerationError(null);

    try {
      // Use streaming for video/cinema generation
      if (type === "video" || type === "cinema") {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        
        // Build cinema-specific parameters
        const cinemaParams = type === "cinema" ? {
          cameraMovements: selectedMovements,
          shotType,
          cameraSensor,
          lensType,
          movementIntensity,
          duration: cinematicDuration,
        } : {};
        
        // Determine image URL(s) for the request
        // For cinema mode: use first reference image as primary, pass all as referenceImageUrls
        // For video mode: use startingImage
        const primaryImageUrl = type === "cinema" 
          ? (cinemaReferenceImages.length > 0 ? cinemaReferenceImages[0] : null)
          : startingImage;
        
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ 
            prompt, 
            negativePrompt: negativePrompt.trim() || undefined, 
            type: type === "cinema" ? "video" : type, // Backend treats cinema as video with extra params
            model: type === "cinema" ? model.replace("-cinema", "") : model, // Use base video model
            aspectRatio, 
            quality,
            duration: type === "video" ? videoDuration : undefined,
            imageUrl: primaryImageUrl,
            referenceImageUrls: type === "cinema" ? cinemaReferenceImages : undefined,
            stream: true,
            background: false,
            ...cinemaParams,
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const apiError = errorData?.error || errorData?.msg || errorData?.message;
          throw new Error(apiError || `HTTP error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let buffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                const eventMatch = line.match(/event: (\w+)/);
                const dataMatch = line.match(/data: (.+)/);
                
                if (eventMatch && dataMatch) {
                  const eventType = eventMatch[1];
                  const data = JSON.parse(dataMatch[1]);

                  if (eventType === 'complete') {
                    setResult(data.result);
                    refetchCredits();
                    if (type === "video") fetchUserVideos();
                    toast({
                      title: "Generation complete!",
                      description: `Your video has been created. ${data.credits_remaining} credits remaining.`,
                    });
                  } else if (eventType === 'background') {
                    // Background mode - generation will continue in background
                    fetchPendingGenerations();
                    refetchCredits();
                    toast({
                      title: "Generation started!",
                      description: "Your video is generating in the background. You can leave this page.",
                      duration: 8000,
                    });
                    setIsGenerating(false);
                    setPrompt("");
                  } else if (eventType === 'timeout_pending') {
                    // Timeout but saved as pending
                    fetchPendingGenerations();
                    toast({
                      title: "Generation continuing...",
                      description: "Taking longer than expected. We'll notify you when it's ready.",
                      duration: 8000,
                    });
                    setIsGenerating(false);
                  } else if (eventType === 'error') {
                    throw new Error(data.message);
                  }
                }
              }
            }
          }
        }
      } else {
        // Non-streaming for images and music
        const body: Record<string, unknown> = { 
          prompt, 
          type, 
          model, 
          aspectRatio, 
          quality, 
        };
        
        if (type === "music") {
          body.lyrics = lyrics.trim() || undefined;
          body.instrumental = isInstrumental;
          body.vocalGender = vocalGender;
          body.weirdness = weirdness;
          body.styleInfluence = styleInfluence;
          body.duration = duration;
        } else {
          body.negativePrompt = negativePrompt.trim() || undefined;
          body.imageUrl = startingImage;
          // Pass reference images for image-to-image / style transfer
          if (type === "image" && referenceImages.length > 0) {
            body.referenceImageUrls = referenceImages;
          }
        }

        const { data, error } = await supabase.functions.invoke("generate", { body });

        if (error) {
          throw new Error(error.message);
        }

        if (data.error) {
          if (data.required && data.available !== undefined) {
            throw new Error(`Insufficient credits. Need ${data.required}, have ${data.available}`);
          }
          throw new Error(data.error);
        }

        setResult(data.result);
        refetchCredits();
        
        toast({
          title: "Generation complete!",
          description: `Your ${type} has been created. ${data.credits_remaining} credits remaining.`,
        });
      }

    } catch (error: any) {
      console.error("Generation error:", error);
      const errorMessage = error.message || "Something went wrong. Please try again.";
      setGenerationError(errorMessage);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: errorMessage,
      });
      refetchCredits();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTypeChange = (newType: string) => {
    setType(newType as "chat" | "image" | "video" | "music" | "cinema");
    if (newType === "chat") {
      setSelectedApp("grok-3"); // Default to Grok 3 for chat
    } else {
      setSelectedApp("generate"); // Reset to generate when switching types
    }
    if (newType === "image") {
      setModel(getSavedModel("image"));
      setAspectRatio("1:1");
    } else if (newType === "video") {
      setModel(getSavedModel("video"));
      setAspectRatio("16:9");
    } else if (newType === "cinema") {
      setModel(getSavedModel("cinema"));
      setAspectRatio("21:9");
      setSelectedMovements([]);
      setShotType("medium");
    } else if (newType === "music") {
      setModel(getSavedModel("music"));
    }
    setQuality("720p");
    setStartingImage(null);
    setResult(null);
    setLyrics("");
    setIsInstrumental(false);
    // Clean up audio
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
    setIsAudioPlaying(false);
  };

  const handleAppSelect = (appId: AppId) => {
    setSelectedApp(appId);
  };

  const handleBackToGenerate = () => {
    setSelectedApp("generate");
  };

  // Render tool component based on selected app
  const renderImageTool = () => {
    switch (selectedApp) {
      case "upscale":
        return <UpscaleTool onBack={handleBackToGenerate} />;
      case "inpainting":
        return <InpaintingTool onBack={handleBackToGenerate} mode="inpainting" />;
      case "object-erase":
        return <InpaintingTool onBack={handleBackToGenerate} mode="object-erase" />;
      case "relight":
        return <RelightTool onBack={handleBackToGenerate} />;
      case "angle":
        return <AngleTool onBack={handleBackToGenerate} />;
      case "skin-enhancer":
        return <SkinEnhancerTool onBack={handleBackToGenerate} />;
      case "background-remove":
        return <BackgroundRemoveTool onBack={handleBackToGenerate} />;
      case "colorize":
        return <ColorizeTool onBack={handleBackToGenerate} />;
      case "style-transfer":
        return <StyleTransferTool onBack={handleBackToGenerate} />;
      default:
        return null;
    }
  };

  // Render video tool component based on selected app
  const renderVideoTool = () => {
    switch (selectedApp) {
      case "video-upscale":
        return <VideoUpscaleTool />;
      case "lip-sync":
        return <LipSyncTool />;
      case "extend":
        return <ExtendVideoTool />;
      case "interpolate":
        return <InterpolateTool />;
      case "sketch-to-video":
        return <SketchToVideoTool />;
      case "draw-to-video":
        return <DrawToVideoTool />;
      case "sora-trends":
        return <SoraTrendsTool />;
      case "click-to-ad":
        return <ClickToAdTool />;
      case "ugc-factory":
        return <UGCFactoryTool />;
      case "mixed-media":
        return <MixedMediaTool />;
      default:
        return null;
    }
  };

  // Render music tool component based on selected app
  const renderMusicTool = () => {
    switch (selectedApp) {
      case "stems":
        return <StemsTool />;
      case "remix":
        return <RemixTool />;
      case "vocals":
        return <VocalsTool />;
      case "master":
        return <MasteringTool />;
      case "sound-effects":
        return <SoundEffectsTool />;
      case "audio-enhance":
        return <AudioEnhanceTool />;
      case "tempo-pitch":
        return <TempoPitchTool />;
      default:
        return null;
    }
  };

  // Render cinema tool component based on selected app
  const renderCinemaTool = () => {
    switch (selectedApp) {
      case "camera-control":
        return <CameraControlTool />;
      case "motion-path":
        return <MotionPathTool />;
      case "depth-control":
        return <DepthControlTool />;
      case "lens-effects":
        return <LensEffectsTool />;
      case "color-grade":
        return <ColorGradeTool />;
      case "stabilize":
        return <StabilizeTool />;
      default:
        return null;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload an image file.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image under 10MB.",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('generation-inputs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('generation-inputs')
        .getPublicUrl(fileName);

      setStartingImage(publicUrl);
      toast({
        title: "Image uploaded",
        description: "Your starting frame is ready for video generation.",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload image.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const removeStartingImage = () => {
    setStartingImage(null);
  };

  const handleReferenceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload an image file.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image under 10MB.",
      });
      return;
    }

    setIsUploading(true);
    setUploadingRefIndex(index);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/ref-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('generation-inputs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('generation-inputs')
        .getPublicUrl(fileName);

      setReferenceImages(prev => {
        const updated = [...prev];
        if (index < updated.length) {
          updated[index] = publicUrl;
        } else {
          updated.push(publicUrl);
        }
        return updated;
      });
      toast({
        title: "Reference uploaded",
        description: `Reference image ${index + 1} is ready.`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload image.",
      });
    } finally {
      setIsUploading(false);
      setUploadingRefIndex(null);
    }
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  // Cinema-specific multi-image upload handler
  const handleCinemaImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload an image file.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image under 10MB.",
      });
      return;
    }

    setIsUploading(true);
    setUploadingRefIndex(index);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/cinema-ref-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('generation-inputs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('generation-inputs')
        .getPublicUrl(fileName);

      setCinemaReferenceImages(prev => {
        const updated = [...prev];
        if (index < updated.length) {
          updated[index] = publicUrl;
        } else {
          updated.push(publicUrl);
        }
        return updated;
      });
      toast({
        title: "Frame uploaded",
        description: `Reference frame ${index + 1} is ready.`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload image.",
      });
    } finally {
      setIsUploading(false);
      setUploadingRefIndex(null);
    }
  };

  const currentModels = type === "image" ? imageModels : type === "video" ? videoModels : type === "cinema" ? cinemaModels : musicModels;
  const currentTemplates = type === "image" ? imageTemplates : type === "video" ? videoTemplates : type === "cinema" ? cinemaTemplates : musicTemplates;
  
  const toggleMovement = (movementId: string) => {
    if (selectedMovements.includes(movementId)) {
      setSelectedMovements(selectedMovements.filter(m => m !== movementId));
    } else if (selectedMovements.length < 3) {
      setSelectedMovements([...selectedMovements, movementId]);
    }
  };

  const toggleAudioPlayback = () => {
    if (audioElement) {
      if (isAudioPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      setIsAudioPlaying(!isAudioPlaying);
    } else if (result?.output_url) {
      const audio = new Audio(result.output_url);
      audio.addEventListener('ended', () => setIsAudioPlaying(false));
      audio.play();
      setAudioElement(audio);
      setIsAudioPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
  );
  }

  // Chat models definitions for rendering
  const chatModels: Record<string, { id: string; name: string; description: string; icon: string; badge?: string }> = {
    "grok-3": { id: "grok-3", name: "Grok 3", description: "xAI's most capable model", icon: "🤖", badge: "TOP" },
    "grok-3-mini": { id: "grok-3-mini", name: "Grok 3 Mini", description: "Fast and efficient Grok", icon: "⚡", badge: "NEW" },
    "chatgpt-5.2": { id: "chatgpt-5.2", name: "ChatGPT 5.2", description: "OpenAI's latest reasoning", icon: "💬", badge: "TOP" },
    "chatgpt-5": { id: "chatgpt-5", name: "ChatGPT 5", description: "Powerful all-rounder", icon: "🧠" },
    "chatgpt-5-mini": { id: "chatgpt-5-mini", name: "GPT-5 Mini", description: "Fast and cost-effective", icon: "🚀" },
    "gemini-3-pro": { id: "gemini-3-pro", name: "Gemini 3 Pro", description: "Google's next-gen AI", icon: "✨", badge: "NEW" },
    "gemini-3-flash": { id: "gemini-3-flash", name: "Gemini 3 Flash", description: "Fast multimodal AI", icon: "⚡" },
    "gemini-2.5-pro": { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Top-tier reasoning", icon: "🌟" },
    "deepseek-r1": { id: "deepseek-r1", name: "DeepSeek R1", description: "Deep reasoning model", icon: "🔬", badge: "AI" },
    "deepseek-v3": { id: "deepseek-v3", name: "DeepSeek V3", description: "Powerful open model", icon: "🎯" },
    "llama-3.3": { id: "llama-3.3", name: "Llama 3.3", description: "Meta's open AI model", icon: "🦙" },
    "llama-3.3-large": { id: "llama-3.3-large", name: "Llama 3.3 Large", description: "Extended capabilities", icon: "🦙" },
  };

  // Chat - render chat interface
  if (type === "chat") {
    const chatModel = chatModels[selectedApp] || chatModels["grok-3"];
    return (
      <div className="min-h-screen bg-background">
        <TopMenu />
        <div className="flex">
          <AppsSidebar currentType={type} selectedApp={selectedApp} onSelectApp={handleAppSelect} />
          <main className="flex-1 pb-20 md:pb-0">
            <ChatToolLayout model={chatModel} />
          </main>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Cinema Studio - render tools or main studio
  if (type === "cinema") {
    // Render cinema tool if not on "generate"
    if (selectedApp !== "generate") {
      const toolComponent = renderCinemaTool();
      if (toolComponent) {
        return (
          <div className="min-h-screen bg-background">
            <TopMenu />
            <div className="flex">
              <AppsSidebar currentType={type} selectedApp={selectedApp} onSelectApp={handleAppSelect} />
              <main className="flex-1 pb-20 md:pb-0">
                {toolComponent}
              </main>
            </div>
            <BottomNav />
          </div>
        );
      }
    }
    
    // Default Cinema Studio layout
    return (
      <div className="min-h-screen bg-background">
        <TopMenu />
        <div className="flex">
          <AppsSidebar currentType={type} selectedApp={selectedApp} onSelectApp={handleAppSelect} />
          <main className="flex-1 pb-20 md:pb-0">
            <CinemaStudio
              prompt={prompt}
              setPrompt={setPrompt}
              referenceImages={cinemaReferenceImages}
              setReferenceImages={setCinemaReferenceImages}
              isUploading={isUploading}
              uploadingIndex={uploadingRefIndex}
              isGenerating={isGenerating}
              generationError={generationError}
              result={result}
              currentCost={currentCost}
              hasEnoughCredits={hasEnoughCreditsForModel(model)}
              user={user}
              onGenerate={handleGenerate}
              onImageUpload={handleCinemaImageUpload}
              selectedMovements={selectedMovements}
              setSelectedMovements={setSelectedMovements}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              cinematicDuration={cinematicDuration}
              setCinematicDuration={setCinematicDuration}
              model={model}
              setModel={setModel}
              quality={quality}
              setQuality={setQuality}
            />
          </main>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Render video tool if not on "generate"
  if (type === "video" && selectedApp !== "generate" && selectedApp !== "cinema-studio") {
    const toolComponent = renderVideoTool();
    if (toolComponent) {
      return (
        <div className="min-h-screen bg-background">
          <TopMenu />
          <div className="flex">
            <AppsSidebar currentType={type} selectedApp={selectedApp} onSelectApp={handleAppSelect} />
            <main className="flex-1 pb-20 md:pb-0">
              {toolComponent}
            </main>
          </div>
          <BottomNav />
        </div>
      );
    }
  }

  // Render image tool if not on "generate"
  if (type === "image" && selectedApp !== "generate") {
    const toolComponent = renderImageTool();
    if (toolComponent) {
      return (
        <div className="min-h-screen bg-background">
          <TopMenu />
          <div className="flex">
            <AppsSidebar currentType={type} selectedApp={selectedApp} onSelectApp={handleAppSelect} />
            <main className="flex-1 pb-20 md:pb-0">
              {toolComponent}
            </main>
          </div>
          <BottomNav />
        </div>
      );
    }
  }

  // Render music tool if not on "generate"
  if (type === "music" && selectedApp !== "generate") {
    const toolComponent = renderMusicTool();
    if (toolComponent) {
      return (
        <div className="min-h-screen bg-background">
          <TopMenu />
          <div className="flex">
            <AppsSidebar currentType={type} selectedApp={selectedApp} onSelectApp={handleAppSelect} />
            <main className="flex-1 pb-20 md:pb-0">
              {toolComponent}
            </main>
          </div>
          <BottomNav />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      <div className="flex">
        <AppsSidebar currentType={type} selectedApp={selectedApp} onSelectApp={handleAppSelect} />

        <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto p-6">
          {/* Pending Generations Banner */}
          {hasPending && (
            <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {pendingGenerations.length} video{pendingGenerations.length !== 1 ? 's' : ''} generating in background
                    </p>
                    <p className="text-xs text-muted-foreground">
                      We'll notify you when they're ready
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={checkPendingGenerations}
                  disabled={isChecking}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                  Check Now
                </Button>
              </div>
            </div>
          )}

          {/* Completed Generations Notifications */}
          {completedGenerations.length > 0 && (
            <div className="mb-6 space-y-3">
              {completedGenerations.map((gen) => (
                <div 
                  key={gen.id}
                  className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Play className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-green-500">Video Ready!</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {gen.prompt.substring(0, 60)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setResult({ output_url: gen.output_url });
                        dismissCompleted(gen.id);
                      }}
                      className="gap-2 border-green-500/50 text-green-500 hover:bg-green-500/10"
                    >
                      <Play className="h-4 w-4" />
                      View
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => dismissCompleted(gen.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI Generation Studio</span>
              </div>
              
              {user && (
                hasActiveSubscription ? (
                  <div className="flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-4 py-1.5">
                    <Infinity className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Unlimited</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-full border border-border/50 bg-secondary px-4 py-1.5">
                    <Coins className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium">
                      {creditsLoading ? "..." : credits ?? 0} credits
                    </span>
                  </div>
                )
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2 text-center">Create Something Amazing</h1>
            <p className="text-muted-foreground text-center">
              Describe what you want to create and let AI bring it to life
            </p>
          </div>


          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Panel */}
            <Card className="border-border/50 bg-card">
              <CardContent className="p-6 space-y-6">
                {/* Prompt Templates */}
                {/* Genre Presets - Music only */}
                {type === "music" && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary" />
                      Choose a genre
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {musicGenrePresets.map((genre) => (
                        <Button
                          key={genre.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPrompt(genre.prompt)}
                          className="flex flex-col items-center gap-1 h-auto py-3 border-border/50 hover:bg-primary/10 hover:border-primary/50"
                        >
                          <span className="text-lg">{genre.icon}</span>
                          <span className="text-xs">{genre.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Combined Prompt Section */}
                <div className="space-y-3">
                  <Label htmlFor="prompt" className="text-base">
                    {type === "music" ? "Describe your song" : `Describe your ${type}`}
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder={
                      type === "image" 
                        ? "A majestic dragon flying over a neon-lit cyberpunk city at sunset, 4K cinematic..." 
                        : type === "video"
                        ? "A short cinematic video of waves crashing on a tropical beach during golden hour..."
                        : "An upbeat pop song about summer adventures, 120 BPM, with catchy synth hooks..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[140px] bg-secondary border-border/50 resize-none text-base"
                  />
                  
                  {/* Quick templates inline with popover for more */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />
                      Try:
                    </span>
                    {currentTemplates.slice(0, 3).map((template) => (
                      <Button
                        key={template.label}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPrompt(template.prompt)}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-primary/10"
                      >
                        {template.label}
                      </Button>
                    ))}
                    {currentTemplates.length > 3 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-primary/10"
                          >
                            +{currentTemplates.length - 3} more
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2 bg-popover border-border" align="start">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground px-2 py-1">
                              All Templates
                            </p>
                            {currentTemplates.map((template) => (
                              <Button
                                key={template.label}
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setPrompt(template.prompt)}
                                className="w-full justify-start h-8 px-2 text-sm hover:bg-primary/10"
                              >
                                {template.label}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>

                {/* Negative Prompt - not for music */}
                {type !== "music" && (
                  <div className="space-y-2">
                    <Label htmlFor="negative-prompt" className="flex items-center gap-2">
                      Negative prompt
                      <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="negative-prompt"
                      placeholder="blur, low quality, distorted, watermark, text..."
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      className="min-h-[60px] bg-secondary border-border/50 resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe what to avoid in the generated content
                    </p>
                  </div>
                )}

                {/* Reference Images - Image generation only (up to 3) */}
                {type === "image" && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Reference Images
                      <span className="text-xs text-muted-foreground font-normal">(optional, up to 3)</span>
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 1, 2].map((index) => {
                        const imageUrl = referenceImages[index];
                        const isUploadingThis = isUploading && uploadingRefIndex === index;
                        
                        return (
                          <div key={index} className="relative">
                            {imageUrl ? (
                              <div className="relative rounded-lg overflow-hidden border border-primary/30 bg-primary/5 aspect-square">
                                <img 
                                  src={imageUrl} 
                                  alt={`Reference ${index + 1}`} 
                                  className="w-full h-full object-cover"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-1 right-1 h-5 w-5"
                                  onClick={() => removeReferenceImage(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                {index === 0 && (
                                  <div className="absolute bottom-1 left-1 bg-background/80 rounded px-1.5 py-0.5">
                                    <span className="text-[10px] text-foreground flex items-center gap-0.5">
                                      <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                                      Primary
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <label className={cn(
                                "flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                                index <= referenceImages.length 
                                  ? "border-primary/30 bg-primary/5 hover:bg-primary/10" 
                                  : "border-border/30 bg-secondary/50 opacity-50 cursor-not-allowed"
                              )}>
                                <div className="flex flex-col items-center justify-center p-2">
                                  {isUploadingThis ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                  ) : (
                                    <>
                                      <Upload className="h-5 w-5 text-primary/70 mb-1" />
                                      <p className="text-[10px] text-muted-foreground text-center">
                                        {index === 0 ? "Add ref" : `+${index + 1}`}
                                      </p>
                                    </>
                                  )}
                                </div>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={(e) => handleReferenceImageUpload(e, index)}
                                  disabled={isUploading || !user || index > referenceImages.length}
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI will blend styles from your reference images
                    </p>
                  </div>
                )}

                {/* Lyrics Input - Music only */}
                {type === "music" && !isInstrumental && (
                  <div className="space-y-2">
                    <Label htmlFor="lyrics" className="flex items-center gap-2">
                      Custom Lyrics
                      <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="lyrics"
                      placeholder="Verse 1:&#10;Walking down the street...&#10;&#10;Chorus:&#10;This is the life I want..."
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      className="min-h-[100px] bg-secondary border-border/50 resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for AI-generated lyrics based on your prompt
                    </p>
                  </div>
                )}

                {/* Advanced Options - Music only */}
                {type === "music" && (
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      className="w-full justify-between text-muted-foreground hover:text-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4" />
                        Advanced Options
                      </span>
                      <ChevronDown className={cn(
                        "h-4 w-4 transition-transform",
                        showAdvancedOptions && "rotate-180"
                      )} />
                    </Button>
                    
                    {showAdvancedOptions && (
                      <div className="space-y-3 animate-fade-in">
                        {/* Instrumental Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="instrumental" className="cursor-pointer">Instrumental Only</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Generate music without vocals</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Switch
                            id="instrumental"
                            checked={isInstrumental}
                            onCheckedChange={setIsInstrumental}
                          />
                        </div>

                        {/* Vocal Gender - only when not instrumental */}
                        {!isInstrumental && (
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary">
                            <div className="flex items-center gap-2">
                              <Label>Vocal Gender</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Choose the voice type for vocals</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant={vocalGender === "male" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setVocalGender("male")}
                                className={cn(
                                  "text-xs",
                                  vocalGender === "male" ? "gradient-primary" : "border-border/50"
                                )}
                              >
                                Male
                              </Button>
                              <Button
                                type="button"
                                variant={vocalGender === "female" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setVocalGender("female")}
                                className={cn(
                                  "text-xs",
                                  vocalGender === "female" ? "gradient-primary" : "border-border/50"
                                )}
                              >
                                Female
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Duration */}
                        <div className="p-3 rounded-lg border border-border/50 bg-secondary space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label>Duration</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Length of the generated track</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <span className="text-sm font-medium">{duration}s</span>
                          </div>
                          <Slider
                            value={[duration]}
                            onValueChange={([val]) => setDuration(val)}
                            min={15}
                            max={120}
                            step={15}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>15s</span>
                            <span>120s</span>
                          </div>
                        </div>

                        {/* Weirdness */}
                        <div className="p-3 rounded-lg border border-border/50 bg-secondary space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label>Weirdness</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Higher values create more experimental sounds</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <span className="text-sm font-medium">{weirdness}%</span>
                          </div>
                          <Slider
                            value={[weirdness]}
                            onValueChange={([val]) => setWeirdness(val)}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </div>

                        {/* Style Influence */}
                        <div className="p-3 rounded-lg border border-border/50 bg-secondary space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label>Style Influence</Label>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>How closely to follow genre conventions</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <span className="text-sm font-medium">{styleInfluence}%</span>
                          </div>
                          <Slider
                            value={[styleInfluence]}
                            onValueChange={([val]) => setStyleInfluence(val)}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {type === "video" && (
                  <div className="space-y-2">
                    <Label>Starting Frame (Optional)</Label>
                    {startingImage ? (
                      <div className="relative rounded-lg overflow-hidden border border-border/50">
                        <img 
                          src={startingImage} 
                          alt="Starting frame" 
                          className="w-full h-auto object-contain max-h-[300px]"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={removeStartingImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="absolute bottom-2 left-2 bg-background/80 rounded px-2 py-1">
                          <span className="text-xs text-foreground">Image-to-Video mode</span>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border/50 rounded-lg cursor-pointer bg-secondary hover:bg-secondary/80 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-2 pb-3">
                          {isUploading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                              <p className="text-xs text-muted-foreground">
                                Upload image to animate
                              </p>
                            </>
                          )}
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploading || !user}
                        />
                      </label>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload an image to use as the first frame of your video
                    </p>
                  </div>
                )}

                {/* Model Selection */}
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="bg-secondary border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {currentModels.map((m) => (
                        <SelectItem 
                          key={m.id} 
                          value={m.id}
                          className={cn(
                            m.badge === "TOP" && "relative bg-gradient-to-r from-primary/5 to-amber-500/5"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {m.badge === "TOP" ? (
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            ) : (
                              <Zap className="h-4 w-4 text-primary" />
                            )}
                            <span className={cn(m.badge === "TOP" && "font-medium")}>{m.name}</span>
                            {m.badge === "TOP" && (
                              <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                                TOP
                              </Badge>
                            )}
                            <Badge variant="outline" className="ml-1 text-xs px-1.5 py-0">
                              {m.credits}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {m.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Aspect Ratio Selection - not for music */}
                {type !== "music" && (
                  <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {(type === "image"
                        ? ["1:1", "16:9", "9:16", "4:3"]
                        : ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"]
                      ).map((ratio) => {
                        const disabled =
                          type === "video" && !allowedVideoAspectRatios.includes(ratio);

                        return (
                          <Button
                            key={ratio}
                            type="button"
                            variant={aspectRatio === ratio ? "default" : "outline"}
                            size="sm"
                            disabled={disabled}
                            onClick={() => setAspectRatio(ratio)}
                            className={cn(
                              aspectRatio === ratio
                                ? "gradient-primary"
                                : "border-border/50",
                              disabled && "opacity-40 cursor-not-allowed"
                            )}
                            title={disabled ? `Not available for this model` : ratio}
                          >
                            {ratio}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quality Selection - Video only */}
                {type === "video" && (
                  <div className="space-y-2">
                    <Label>Quality</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "480p", label: "480p", multiplier: "0.8×" },
                        { id: "720p", label: "720p", multiplier: "1×" },
                        { id: "1080p", label: "1080p", multiplier: "1.5×" },
                      ].map((q) => (
                        <Button
                          key={q.id}
                          type="button"
                          variant={quality === q.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setQuality(q.id)}
                          className={quality === q.id ? "gradient-primary" : "border-border/50"}
                        >
                          <span>{q.label}</span>
                          <span className="ml-1 text-xs opacity-70">{q.multiplier}</span>
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Higher quality = more credits (multiplier shown)
                    </p>
                  </div>
                )}

                {/* Duration Selection - Video only */}
                {type === "video" && (
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {allowedVideoDurations.map((d) => (
                        <Button
                          key={d}
                          type="button"
                          variant={videoDuration === d ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVideoDuration(d)}
                          className={videoDuration === d ? "gradient-primary" : "border-border/50"}
                        >
                          {d}s
                        </Button>
                      ))}
                    </div>
                  </div>
                )}


                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full gradient-primary text-primary-foreground gap-2"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-5 w-5" />
                      Generate {type === "image" ? "Image" : type === "video" ? "Video" : "Music"}
                      <span className="text-primary-foreground/80 text-sm">
                        ({currentCost} credits)
                      </span>
                    </>
                  )}
                </Button>

                {!user && (
                  <p className="text-center text-sm text-muted-foreground">
                    <button 
                      onClick={() => navigate("/auth")}
                      className="text-primary hover:underline"
                    >
                      Sign in
                    </button>
                    {" "}to save your creations
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card className="border-border/50 bg-card">
              <CardContent className="p-6">
                <Label className="mb-4 block">Preview</Label>
                
                <div className={cn(
                  "rounded-xl bg-secondary border border-border/50 flex items-center justify-center overflow-hidden",
                  // Dynamic aspect ratio based on type and selection
                  type === "image" ? (
                    aspectRatio === "1:1" ? "aspect-square" :
                    aspectRatio === "16:9" ? "aspect-video" :
                    aspectRatio === "9:16" ? "aspect-[9/16] max-h-[500px]" :
                    aspectRatio === "4:3" ? "aspect-[4/3]" :
                    aspectRatio === "3:4" ? "aspect-[3/4] max-h-[500px]" :
                    "aspect-video"
                  ) : "aspect-video"
                )}>
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground w-full px-8">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                        <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      
                      <p className="text-sm">
                        {type === "video" ? "Generating video..." : type === "music" ? "Composing music..." : "Generating image..."}
                      </p>
                    </div>
                  ) : result?.output_url ? (
                    type === "video" ? (
                      <video 
                        src={result.output_url} 
                        controls
                        autoPlay
                        loop
                        className="w-full h-full object-contain"
                      />
                    ) : type === "music" ? (
                      <div className="flex flex-col items-center gap-4 p-6 w-full">
                        <div className="relative">
                          <div className={cn(
                            "h-16 w-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center",
                            isAudioPlaying && "animate-pulse"
                          )}>
                            <Music className="h-8 w-8 text-primary" />
                          </div>
                          {isAudioPlaying && (
                            <div className="absolute -inset-2 rounded-full border-2 border-primary/50 animate-ping" />
                          )}
                        </div>
                        
                        <p className="text-sm font-medium text-foreground">Music Generated!</p>
                        
                        {/* Waveform Visualization */}
                        <AudioWaveform
                          audioUrl={result.output_url}
                          isPlaying={isAudioPlaying}
                          onPlayPause={toggleAudioPlayback}
                          className="w-full max-w-xs"
                        />
                        
                        <Button
                          onClick={toggleAudioPlayback}
                          className="gap-2 gradient-primary"
                          size="lg"
                        >
                          {isAudioPlaying ? (
                            <>
                              <Pause className="h-5 w-5" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-5 w-5" />
                              Play
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <img 
                        src={result.output_url} 
                        alt="Generated image"
                        className="w-full h-full object-contain"
                      />
                    )
                  ) : generationError ? (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground px-6 text-center">
                      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Generation Failed</p>
                        <p className="text-xs text-muted-foreground max-w-xs">{generationError}</p>
                      </div>
                      <Button 
                        onClick={handleGenerate}
                        disabled={!prompt.trim()}
                        className="gap-2"
                        variant="outline"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry Generation
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {type === "image" ? (
                        <ImageIcon className="h-12 w-12" />
                      ) : type === "video" ? (
                        <Video className="h-12 w-12" />
                      ) : (
                        <Music className="h-12 w-12" />
                      )}
                      <p className="text-sm">Your creation will appear here</p>
                    </div>
                  )}
                </div>

                {result?.output_url && (
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 gap-2 border-border/50"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = result.output_url!;
                      link.download = type === "video" ? 'generation.mp4' : type === "music" ? 'generation.mp3' : 'generation.png';
                      link.target = '_blank';
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download {type === "video" ? "Video" : type === "music" ? "Music" : "Image"}
                  </Button>
                )}

                {/* Your Videos Section - Inside preview column for video page */}
                {type === "video" && user && (
                  <div className="mt-6 pt-6 border-t border-border/50">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-primary" />
                        Your Videos
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/library")}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        View All
                      </Button>
                    </div>
                    
                    {isLoadingVideos ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : userVideos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Video className="h-10 w-10 mb-2 opacity-50" />
                        <p className="text-sm">No videos yet</p>
                        <p className="text-xs">Generate your first video above!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {userVideos.slice(0, 3).map((video) => (
                          <GenerationCard
                            key={video.id}
                            gen={video}
                            onDelete={deleteUserVideo}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </main>
      </div>

      <BottomNav />

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        open={showAddCreditsDialog}
        onOpenChange={setShowAddCreditsDialog}
        currentCredits={credits ?? 0}
        requiredCredits={currentCost}
      />
    </div>
  );
};

export default Create;
