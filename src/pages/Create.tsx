import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCredits, getModelCost } from "@/hooks/useCredits";
import { useBackgroundGenerations } from "@/hooks/useBackgroundGenerations";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Image, 
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
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Image Models (Fal.ai + Lovable AI)
const imageModels = [
  // Premium Models
  { id: "gpt-image-1.5", name: "GPT Image 1.5", description: "OpenAI multimodal gen", badge: "TOP", credits: 10, provider: "fal" },
  { id: "nano-banana", name: "Nano Banana", description: "Google Gemini image gen", badge: "AI", credits: 4, provider: "lovable" },
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

const VIDEO_DEFAULT_ASPECT_RATIOS = ["16:9", "9:16", "1:1"];
const VIDEO_DEFAULT_QUALITIES = ["480p", "720p", "1080p"];

// Fal.ai model capabilities
const VIDEO_MODEL_CAPABILITIES: Record<
  string,
  {
    aspectRatios?: string[];
    qualities?: string[];
    slow?: boolean;
    requiresImage?: boolean;
  }
> = {
  "wan-2.6": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["480p", "720p"]
  },
  "kling-2.6": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["720p", "1080p"],
    slow: true
  },
  "veo-3": { 
    aspectRatios: ["16:9", "9:16"],
    qualities: ["720p", "1080p"],
    slow: true 
  },
  "veo-3-fast": { 
    aspectRatios: ["16:9", "9:16"],
    qualities: ["720p", "1080p"]
  },
  "hailuo-02": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["720p"]
  },
  "seedance-1.5": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["480p", "720p"]
  },
  "luma": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["720p", "1080p"]
  },
  "hunyuan-1.5": { 
    aspectRatios: ["16:9", "9:16", "1:1"],
    qualities: ["480p", "720p", "1080p"]
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
  const { toast } = useToast();
  
  const [type, setType] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [model, setModel] = useState("flux-1.1-pro");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("720p");
  const [startingImage, setStartingImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [result, setResult] = useState<{ output_url?: string; storyboard?: string } | null>(null);

  const currentCost = type === "video" ? getModelCost(model, quality) : getModelCost(model);

  const allowedVideoAspectRatios =
    VIDEO_MODEL_CAPABILITIES[model]?.aspectRatios ?? VIDEO_DEFAULT_ASPECT_RATIOS;
  const allowedVideoQualities =
    VIDEO_MODEL_CAPABILITIES[model]?.qualities ?? VIDEO_DEFAULT_QUALITIES;


  useEffect(() => {
    if (type !== "video") return;

    if (!allowedVideoAspectRatios.includes(aspectRatio)) {
      setAspectRatio(allowedVideoAspectRatios[0]);
    }

    if (!allowedVideoQualities.includes(quality)) {
      setQuality(allowedVideoQualities[0]);
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
      toast({
        variant: "destructive",
        title: "Insufficient credits",
        description: `You need ${currentCost} credits for ${currentModels.find(m => m.id === model)?.name}. Current balance: ${credits ?? 0}`,
      });
      return;
    }

    setIsGenerating(true);
    setResult(null);
    setGenerationError(null);

    try {
      // Use streaming for video generation
      if (type === "video") {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        
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
            type, 
            model, 
            aspectRatio, 
            quality, 
            imageUrl: startingImage,
            stream: true,
            background: false
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
        // Non-streaming for images
        const { data, error } = await supabase.functions.invoke("generate", {
          body: { prompt, negativePrompt: negativePrompt.trim() || undefined, type, model, aspectRatio, quality, imageUrl: startingImage }
        });

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
          description: `Your image has been created. ${data.credits_remaining} credits remaining.`,
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
    setType(newType as "image" | "video");
    setModel(newType === "image" ? "flux-1.1-pro" : "wan-2.6");
    setAspectRatio(newType === "image" ? "1:1" : "16:9");
    setQuality("720p");
    setStartingImage(null);
    setResult(null);
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

  const currentModels = type === "image" ? imageModels : videoModels;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

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

          {/* Type Selector */}
          <Tabs value={type} onValueChange={handleTypeChange} className="mb-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="image" className="gap-2">
                <Image className="h-4 w-4" />
                Image
                <Badge variant="secondary" className="ml-1 text-xs">
                  3-10 credits
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-2">
                <Video className="h-4 w-4" />
                Video
                <Badge variant="secondary" className="ml-1 text-xs">
                  8-30 credits
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input Panel */}
            <Card className="border-border/50 bg-card">
              <CardContent className="p-6 space-y-6">
                {/* Prompt Templates */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-accent" />
                    Quick templates
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {(type === "image" ? imageTemplates : videoTemplates).map((template) => (
                      <Button
                        key={template.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt(template.prompt)}
                        className="text-xs border-border/50 hover:bg-primary/10 hover:border-primary/50"
                      >
                        {template.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Prompt Input */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">Describe your {type}</Label>
                  <Textarea
                    id="prompt"
                    placeholder={type === "image" 
                      ? "A majestic dragon flying over a neon-lit cyberpunk city at sunset, 4K cinematic..." 
                      : "A short cinematic video of waves crashing on a tropical beach during golden hour..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[120px] bg-secondary border-border/50 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific and descriptive for best results
                  </p>
                </div>

                {/* Negative Prompt */}
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

                {/* Starting Image Upload - Video only */}
                {type === "video" && (
                  <div className="space-y-2">
                    <Label>Starting Frame (Optional)</Label>
                    {startingImage ? (
                      <div className="relative rounded-lg overflow-hidden border border-border/50">
                        <img 
                          src={startingImage} 
                          alt="Starting frame" 
                          className="w-full h-32 object-cover"
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
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            <span>{m.name}</span>
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

                {/* Aspect Ratio Selection */}
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


                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim() || (user && !hasEnoughCreditsForModel(model))}
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
                      Generate {type === "image" ? "Image" : "Video"}
                      <span className="text-primary-foreground/80 text-sm">
                        ({currentCost} credits)
                      </span>
                    </>
                  )}
                </Button>

                {user && !hasEnoughCreditsForModel(model) && (
                  <p className="text-center text-sm text-destructive">
                    Insufficient credits. You need {currentCost} credits but have {credits ?? 0}.
                  </p>
                )}

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
                
                <div className="aspect-video rounded-xl bg-secondary border border-border/50 flex items-center justify-center overflow-hidden">
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-4 text-muted-foreground w-full px-8">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                        <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      
                      <p className="text-sm">
                        {type === "video" ? "Generating video..." : "Generating image..."}
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
                    ) : (
                      <img 
                        src={result.output_url} 
                        alt="Generated image"
                        className="w-full h-full object-cover"
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
                        disabled={!prompt.trim() || !hasEnoughCreditsForModel(model)}
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
                        <Image className="h-12 w-12" />
                      ) : (
                        <Video className="h-12 w-12" />
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
                      link.download = type === "video" ? 'generation.mp4' : 'generation.png';
                      link.target = '_blank';
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download {type === "video" ? "Video" : "Image"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Create;
