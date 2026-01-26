import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Sparkles, Check, Download, Loader2, Maximize2, ChevronRight, Grid3X3, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddCreditsDialog from "@/components/AddCreditsDialog";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ShotsToolProps {
  onBack: () => void;
}

type Step = "upload" | "grid" | "upscale";

// 9 unique shots - each MUST be visually distinct in zoom, pose, angle, or framing
const CINEMATIC_ANGLES = [
  { prompt: "SHOT 1 - MEDIUM PORTRAIT: Front-facing, head and shoulders visible, warm smile, standard headshot with space around the head", label: "Portrait" },
  { prompt: "SHOT 2 - CONFIDENT POSE: Three-quarter body angle, ARMS FOLDED ACROSS CHEST, confident smirk, showing torso to waist level", label: "Confident" },
  { prompt: "SHOT 3 - MACRO FACE CROP: EXTREME CLOSE-UP - crop so the face FILLS the entire frame edge to edge, forehead cropped off, chin cropped off, only showing from eyebrows to mouth, face must touch all edges", label: "Macro Face" },
  { prompt: "SHOT 4 - LEFT SIDE PROFILE: Pure 90-degree left profile silhouette, neutral expression, artistic side view showing ear", label: "Profile" },
  { prompt: "SHOT 5 - LOOKING UP AT SKY: Subject tilting head far UP looking at ceiling, shot from below showing underside of chin, contemplative mood", label: "Looking Up" },
  { prompt: "SHOT 6 - TOP DOWN AERIAL: Camera directly ABOVE looking DOWN at top of head, subject looking up at camera, bird's eye foreshortened view", label: "Top Down" },
  { prompt: "SHOT 7 - GLANCE BACK: View from BEHIND, subject looking back over shoulder at camera, showing back of head and partial face", label: "Over Shoulder" },
  { prompt: "SHOT 8 - COMPLETE BACK: Full back of head and shoulders, subject facing completely AWAY, no face visible at all", label: "Back View" },
  { prompt: "SHOT 9 - EYES ONLY CROP: Ultra tight crop showing ONLY eyes and glasses, no nose, no mouth, just eyes filling the frame horizontally", label: "Eyes Detail" },
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1", description: "Square" },
  { id: "16:9", label: "16:9", description: "Landscape" },
  { id: "9:16", label: "9:16", description: "Portrait" },
  { id: "4:3", label: "4:3", description: "Classic" },
  { id: "3:4", label: "3:4", description: "Portrait Classic" },
];

const CREDIT_COST = 10; // 9 angles generated

const ShotsTool = ({ onBack }: ShotsToolProps) => {
  const { user } = useAuth();
  const { credits, hasActiveSubscription, refetch } = useCredits();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaledImages, setUpscaledImages] = useState<string[]>([]);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileName = file.name.toLowerCase();
    const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif');
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (isHeic || (!supportedTypes.includes(file.type) && !file.type.startsWith('image/'))) {
      toast({
        variant: "destructive",
        title: "Unsupported format",
        description: "Please use PNG, JPEG, WebP, or GIF images.",
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

      setInputImage(publicUrl);
      toast({
        title: "Image uploaded",
        description: "Click Generate to create 9 cinematic angles.",
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

  const handleGenerate = async () => {
    if (!inputImage || !user) return;

    // Check credits
    if (!hasActiveSubscription && credits < CREDIT_COST) {
      setShowAddCreditsDialog(true);
      return;
    }

    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      // Helper to generate a single angle with retry
      const generateAngle = async (angle: typeof CINEMATIC_ANGLES[0], retries = 2): Promise<string | null> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-tools`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                tool: "shots",
                imageUrl: inputImage,
                prompt: angle.prompt,
                aspectRatio,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              if (attempt < retries && response.status >= 500) {
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                continue;
              }
              throw new Error(errorData.error || `Failed (${response.status})`);
            }

            const data = await response.json();
            return data.outputUrl || null;
          } catch (error) {
            if (attempt < retries) {
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
              continue;
            }
            console.error(`Failed to generate ${angle.label}:`, error);
            return null;
          }
        }
        return null;
      };

      // Stagger requests in batches of 3 to avoid overwhelming the AI gateway
      const batchSize = 3;
      const allResults: (string | null)[] = [];
      
      for (let i = 0; i < CINEMATIC_ANGLES.length; i += batchSize) {
        const batch = CINEMATIC_ANGLES.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(angle => generateAngle(angle)));
        allResults.push(...batchResults);
        
        if (i + batchSize < CINEMATIC_ANGLES.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      const successfulResults = allResults.filter(Boolean) as string[];
      
      if (successfulResults.length === 0) {
        throw new Error("All angle generations failed");
      }
      
      setGeneratedImages(successfulResults);
      setStep("grid");
      refetch();
      
      const failedCount = 9 - successfulResults.length;
      toast({
        title: "Shots generated!",
        description: failedCount > 0 
          ? `${successfulResults.length} of 9 angles generated. Select favorites to upscale.`
          : "Select your favorites to upscale to 4K.",
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      let errorMessage = "Failed to generate angles.";
      if (error.message?.includes("Unsupported") || error.message?.includes("format")) {
        errorMessage = "Unsupported image format. Please use PNG, JPEG, WebP, or GIF.";
      }
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleImageSelection = (index: number) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleUpscale = async () => {
    if (selectedImages.size === 0) {
      toast({
        variant: "destructive",
        title: "No images selected",
        description: "Please select at least one image to upscale.",
      });
      return;
    }

    const upscaleCost = selectedImages.size * 3; // 3 credits per upscale
    if (!hasActiveSubscription && credits < upscaleCost) {
      setShowAddCreditsDialog(true);
      return;
    }

    setIsUpscaling(true);
    setStep("upscale");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const selectedUrls = Array.from(selectedImages).map(i => generatedImages[i]);
      
      const promises = selectedUrls.map(async (imageUrl) => {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-tools`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            tool: "upscale",
            imageUrl,
            scale: 4,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upscale failed");
        }

        const data = await response.json();
        return data.outputUrl;
      });

      const upscaledUrls = await Promise.all(promises);
      setUpscaledImages(upscaledUrls.filter(Boolean));
      refetch();
      
      toast({
        title: "Upscale complete!",
        description: `${upscaledUrls.length} images upscaled to 4K.`,
      });
    } catch (error: any) {
      console.error("Upscale error:", error);
      toast({
        variant: "destructive",
        title: "Upscale failed",
        description: error.message || "Failed to upscale images.",
      });
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleDownload = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shot-${index + 1}-4k.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Failed to download image.",
      });
    }
  };

  const downloadImages = async (urls: string[], prefix: string = "shot") => {
    for (let i = 0; i < urls.length; i++) {
      try {
        const response = await fetch(urls[i]);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${prefix}-${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        // Small delay between downloads
        await new Promise(r => setTimeout(r, 200));
      } catch (error) {
        console.error(`Failed to download image ${i + 1}`);
      }
    }
    toast({
      title: "Download complete",
      description: `${urls.length} images downloaded.`,
    });
  };

  const handleDownloadFullGrid = () => {
    downloadImages(generatedImages, "shot");
  };

  const handleDownloadSelected = () => {
    if (selectedImages.size === 0) {
      toast({
        variant: "destructive",
        title: "No images selected",
        description: "Please select at least one image to download.",
      });
      return;
    }
    const selectedUrls = Array.from(selectedImages).map(i => generatedImages[i]);
    downloadImages(selectedUrls, "shot-selected");
  };

  const handleReset = () => {
    setStep("upload");
    setInputImage(null);
    setGeneratedImages([]);
    setSelectedImages(new Set());
    setUpscaledImages([]);
    setAspectRatio("1:1");
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case "16:9": return "aspect-video";
      case "9:16": return "aspect-[9/16]";
      case "4:3": return "aspect-[4/3]";
      case "3:4": return "aspect-[3/4]";
      default: return "aspect-square";
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="font-semibold">Shots</h2>
          <p className="text-sm text-muted-foreground">
            Upload one image, get 9 cinematic angles
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span>{CREDIT_COST} credits</span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 py-6 px-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-colors",
            step === "upload" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            1
          </div>
          <span className={cn(
            "text-sm font-medium",
            step === "upload" ? "text-foreground" : "text-muted-foreground"
          )}>
            Upload
          </span>
        </div>
        
        <div className="w-8 h-px bg-border" />
        
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-colors",
            step === "grid" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            2
          </div>
          <span className={cn(
            "text-sm font-medium",
            step === "grid" ? "text-foreground" : "text-muted-foreground"
          )}>
            Grid
          </span>
        </div>
        
        <div className="w-8 h-px bg-border" />
        
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-colors",
            step === "upscale" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            3
          </div>
          <span className={cn(
            "text-sm font-medium",
            step === "upscale" ? "text-foreground" : "text-muted-foreground"
          )}>
            Upscale
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {step === "upload" && (
          <div className="w-full max-w-lg flex flex-col items-center gap-6">
            {/* Preview Card */}
            <div className="relative w-full aspect-video bg-card rounded-2xl border border-border/50 overflow-hidden flex items-center justify-center">
              {inputImage ? (
                <>
                  <img 
                    src={inputImage} 
                    alt="Input" 
                    className="w-full h-full object-contain"
                  />
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="absolute inset-x-4 bottom-4 md:inset-auto md:bottom-auto bg-background/90 hover:bg-background text-foreground border border-border"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        GENERATE <Sparkles className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No image uploaded yet</p>
                </div>
              )}
            </div>

            {/* Title & Description */}
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">SHOTS</h3>
              <p className="text-muted-foreground max-w-sm">
                Upload one image, get 9 cinematic angles. Select your favorites and upscale to 4K.
              </p>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="w-full max-w-sm">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Output Aspect Ratio
              </label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                      aspectRatio === ratio.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:bg-secondary"
                    )}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Button */}
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full max-w-sm h-12"
              variant="secondary"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload image
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        )}

        {step === "grid" && (
          <div className="w-full max-w-4xl flex flex-col items-center gap-6">
            <div className="text-center mb-2">
              <h3 className="text-xl font-semibold mb-1">Select your favorites</h3>
              <p className="text-sm text-muted-foreground">
                {selectedImages.size} selected • Click to select, then upscale to 4K
              </p>
            </div>

            {/* 3x3 Grid */}
            <div className="grid grid-cols-3 gap-3 w-full">
              {generatedImages.map((url, index) => (
                <button
                  key={index}
                  onClick={() => toggleImageSelection(index)}
                  className={cn(
                    "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                    selectedImages.has(index) 
                      ? "border-primary ring-2 ring-primary/30" 
                      : "border-border/50 hover:border-border"
                  )}
                >
                  <img 
                    src={url} 
                    alt={`Angle ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {selectedImages.has(index) && (
                    <div className="absolute top-2 right-2 h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-background/80 rounded text-xs font-medium">
                    {CINEMATIC_ANGLES[index]?.label || `Angle ${index + 1}`}
                  </div>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full max-w-md">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                Start Over
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56">
                  <DropdownMenuItem onClick={handleDownloadFullGrid}>
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Download full grid
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDownloadSelected}
                    disabled={selectedImages.size === 0}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Download selected images
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={handleUpscale}
                disabled={selectedImages.size === 0}
                className="flex-1"
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                Upscale ({selectedImages.size})
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === "upscale" && (
          <div className="w-full max-w-4xl flex flex-col items-center gap-6">
            <div className="text-center mb-2">
              <h3 className="text-xl font-semibold mb-1">
                {isUpscaling ? "Upscaling to 4K..." : "4K Images Ready"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isUpscaling 
                  ? "This may take a moment" 
                  : `${upscaledImages.length} images upscaled successfully`
                }
              </p>
            </div>

            {isUpscaling ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                  {upscaledImages.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-xl overflow-hidden border border-border/50 group"
                    >
                      <img 
                        src={url} 
                        alt={`4K Shot ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="sm"
                          onClick={() => handleDownload(url, index)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-primary/90 rounded text-xs font-medium text-primary-foreground">
                        4K
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="mt-4"
                >
                  Create New Shots
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <AddCreditsDialog
        open={showAddCreditsDialog}
        onOpenChange={setShowAddCreditsDialog}
        currentCredits={credits}
        requiredCredits={CREDIT_COST}
      />
    </div>
  );
};

export default ShotsTool;
