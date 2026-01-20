import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits, getModelCost } from "@/hooks/useCredits";
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
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const imageModels = [
  // Kie.ai Image Models - with credit costs
  { id: "ideogram-v2-turbo", name: "Ideogram V2 Turbo", description: "Fast text generation", badge: "FAST", credits: 3 },
  { id: "stable-diffusion-3.5", name: "SD 3.5 Large", description: "Stable Diffusion latest", badge: "NEW", credits: 4 },
  { id: "flux-1.1-pro", name: "Flux 1.1 Pro", description: "High quality creative", badge: "PRO", credits: 5 },
  { id: "ideogram-v2", name: "Ideogram V2", description: "Best for text in images", badge: "NEW", credits: 5 },
  { id: "recraft-v3", name: "Recraft V3", description: "Design & illustration", badge: "PRO", credits: 5 },
  { id: "dall-e-3", name: "DALL-E 3", description: "OpenAI's image model", badge: "TOP", credits: 8 },
  { id: "flux-1.1-pro-ultra", name: "Flux 1.1 Pro Ultra", description: "Ultra HD 4K images", badge: "TOP", credits: 10 },
  { id: "midjourney", name: "Midjourney", description: "Artistic style images", badge: "PRO", credits: 10 },
];

const videoModels = [
  // Kie.ai Video Models - with credit costs
  { id: "wan-2.1", name: "Alibaba Wan 2.1", description: "480p fast videos", badge: "FAST", credits: 8 },
  { id: "minimax-video", name: "MiniMax Video", description: "Fast generation", badge: "FAST", credits: 10 },
  { id: "veo-3-fast", name: "Google Veo 3 Fast", description: "Quick generation", badge: "FAST", credits: 12 },
  { id: "wan-2.1-pro", name: "Alibaba Wan 2.1 Pro", description: "720p quality", badge: "PRO", credits: 12 },
  { id: "pika-2.0", name: "Pika 2.0", description: "Creative animations", badge: "NEW", credits: 12 },
  { id: "runway-gen3-5s", name: "Runway Gen-3 (5s)", description: "5s cinematic", badge: "NEW", credits: 15 },
  { id: "luma-ray2", name: "Luma Ray 2", description: "Cinematic quality", badge: "NEW", credits: 15 },
  { id: "kling-1.6-pro", name: "Kling 1.6 Pro", description: "5s high quality", badge: "TOP", credits: 18 },
  { id: "veo-3", name: "Google Veo 3", description: "Audio sync, lip-sync", badge: "PRO", credits: 20 },
  { id: "runway-gen3-10s", name: "Runway Gen-3 (10s)", description: "10s cinematic", badge: "TOP", credits: 25 },
  { id: "kling-1.6-pro-10s", name: "Kling 1.6 Pro (10s)", description: "10s extended", badge: "PRO", credits: 30 },
];

const Create = () => {
  const { user, loading } = useAuth();
  const { credits, loading: creditsLoading, refetch: refetchCredits, hasEnoughCreditsForModel, hasActiveSubscription } = useCredits();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [type, setType] = useState<"image" | "video">("image");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("ideogram-v2-turbo");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("720p");
  const [startingImage, setStartingImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ output_url?: string; storyboard?: string } | null>(null);

  const currentCost = type === "video" ? getModelCost(model, quality) : getModelCost(model);

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

    try {
      const { data, error } = await supabase.functions.invoke("generate", {
        body: { prompt, type, model, aspectRatio, quality, imageUrl: startingImage }
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
        description: type === "image" 
          ? `Your image has been created. ${data.credits_remaining} credits remaining.` 
          : `Your video has been created. ${data.credits_remaining} credits remaining.`,
      });

    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error.message || "Something went wrong. Please try again.",
      });
      refetchCredits();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTypeChange = (newType: string) => {
    setType(newType as "image" | "video");
    setModel(newType === "image" ? "ideogram-v2-turbo" : "wan-2.1");
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
                    className="min-h-[150px] bg-secondary border-border/50 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific and descriptive for best results
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
                      : ["16:9", "9:16", "1:1", "4:3"]
                    ).map((ratio) => (
                      <Button
                        key={ratio}
                        type="button"
                        variant={aspectRatio === ratio ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAspectRatio(ratio)}
                        className={aspectRatio === ratio ? "gradient-primary" : "border-border/50"}
                      >
                        {ratio}
                      </Button>
                    ))}
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
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                        <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <p className="text-sm">
                        {type === "video" ? "Generating video... This may take up to 2 minutes" : "Creating your masterpiece..."}
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
