import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AddCreditsDialog from "@/components/AddCreditsDialog";
import { 
  Upload, 
  Download, 
  Loader2, 
  Sparkles, 
  X, 
  Video,
  ImageIcon,
  Play,
  RefreshCw
} from "lucide-react";

interface CinemaToolLayoutProps {
  title: string;
  description: string;
  toolId: string;
  creditCost: number;
  showPrompt?: boolean;
  promptPlaceholder?: string;
  showVideoUpload?: boolean;
  showImageUpload?: boolean;
  showIntensity?: boolean;
  showDuration?: boolean;
  children?: React.ReactNode;
}

const CinemaToolLayout = ({
  title,
  description,
  toolId,
  creditCost,
  showPrompt = false,
  promptPlaceholder = "Describe the effect...",
  showVideoUpload = true,
  showImageUpload = false,
  showIntensity = false,
  showDuration = false,
  children,
}: CinemaToolLayoutProps) => {
  const [inputVideo, setInputVideo] = useState<string | null>(null);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("Processing...");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [intensity, setIntensity] = useState(50);
  const [duration, setDuration] = useState(5);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { credits, refetch, hasActiveSubscription } = useCredits();
  
  const hasEnoughCreditsForTool = (cost: number) => {
    if (hasActiveSubscription) return true;
    if (credits === null) return false;
    return credits >= cost;
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll for generation status
  const pollForResult = useCallback(async (genId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      // Call check-generation to poll the status
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ generationId: genId }),
      });

      const data = await response.json();
      console.log(`[CinemaToolLayout] Poll result for ${genId}:`, data);

      // The check-generation returns { results: [...] }
      const result = data.results?.[0];
      if (!result) {
        console.log("No result found in response");
        return;
      }

      if (result.status === 'completed' && result.output_url) {
        // Success! Stop polling and show result
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setOutputUrl(result.output_url);
        setIsProcessing(false);
        setGenerationId(null);
        toast.success("Processing complete!");
        refetch();
      } else if (result.status === 'failed') {
        // Failed - stop polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsProcessing(false);
        setGenerationId(null);
        toast.error(result.error || "Processing failed");
        refetch();
      } else {
        // Still processing - update status message
        const providerStatus = result.provider_status || '';
        if (providerStatus === 'IN_QUEUE') {
          setProcessingStatus("Waiting in queue...");
        } else if (providerStatus === 'IN_PROGRESS') {
          setProcessingStatus("Processing video...");
        } else {
          setProcessingStatus("Processing...");
        }
      }
    } catch (error) {
      console.error("Poll error:", error);
    }
  }, [refetch]);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Video must be under 100MB");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to upload");
      return;
    }

    const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("generation-inputs")
      .upload(fileName, file);

    if (error) {
      toast.error("Failed to upload video");
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("generation-inputs")
      .getPublicUrl(data.path);

    setInputVideo(publicUrl);
    toast.success("Video uploaded");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to upload");
      return;
    }

    const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("generation-inputs")
      .upload(fileName, file);

    if (error) {
      toast.error("Failed to upload image");
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("generation-inputs")
      .getPublicUrl(data.path);

    setInputImage(publicUrl);
    toast.success("Image uploaded");
  };

  const handleProcess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to use this tool");
      return;
    }

    if (!hasEnoughCreditsForTool(creditCost)) {
      toast.error(`Insufficient credits. Need ${creditCost} credits.`);
      return;
    }

    setIsProcessing(true);
    setOutputUrl(null);
    setProcessingStatus("Starting...");

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cinema-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tool: toolId,
          videoUrl: inputVideo,
          imageUrl: inputImage,
          prompt: prompt || undefined,
          intensity,
          duration,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Processing failed");
      }

      if (result.status === 'processing' && result.generationId) {
        // Start polling for results
        setGenerationId(result.generationId);
        setProcessingStatus("Processing video...");
        
        // Poll every 3 seconds
        pollIntervalRef.current = setInterval(() => {
          pollForResult(result.generationId);
        }, 3000);
        
        // Also poll immediately after a short delay
        setTimeout(() => pollForResult(result.generationId), 2000);
        
      } else if (result.outputUrl) {
        setOutputUrl(result.outputUrl);
        setIsProcessing(false);
        toast.success("Processing complete!");
        refetch();
      }
    } catch (error) {
      setIsProcessing(false);
      toast.error(error instanceof Error ? error.message : "Processing failed");
    }
  };

  const canProcess = (showVideoUpload ? inputVideo : true) || 
                     (showImageUpload ? inputImage : true) ||
                     (showPrompt ? prompt.trim() : true);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">Cost:</span>
          <span className="text-sm font-medium text-primary">{creditCost} credits</span>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Video Upload */}
            {showVideoUpload && (
              <div className="space-y-2">
                <Label>Input Video</Label>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                {inputVideo ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-secondary/50">
                    <video
                      src={inputVideo}
                      controls
                      className="w-full h-full object-contain"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => setInputVideo(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-colors flex flex-col items-center justify-center gap-3"
                  >
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Video className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Upload Video</p>
                      <p className="text-xs text-muted-foreground">Max 100MB</p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Image Upload */}
            {showImageUpload && (
              <div className="space-y-2">
                <Label>Input Image</Label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {inputImage ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-secondary/50">
                    <img
                      src={inputImage}
                      alt="Input"
                      className="w-full h-full object-contain"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => setInputImage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full aspect-video rounded-xl border-2 border-dashed border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-colors flex flex-col items-center justify-center gap-3"
                  >
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <ImageIcon className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Upload Image</p>
                      <p className="text-xs text-muted-foreground">Max 10MB</p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Prompt */}
            {showPrompt && (
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Input
                  placeholder={promptPlaceholder}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
            )}

            {/* Intensity */}
            {showIntensity && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Intensity</Label>
                  <span className="text-sm text-muted-foreground">{intensity}%</span>
                </div>
                <Slider
                  value={[intensity]}
                  onValueChange={([val]) => setIntensity(val)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            )}

            {/* Duration */}
            {showDuration && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Duration</Label>
                  <span className="text-sm text-muted-foreground">{duration}s</span>
                </div>
                <Slider
                  value={[duration]}
                  onValueChange={([val]) => setDuration(val)}
                  min={3}
                  max={10}
                  step={1}
                />
              </div>
            )}

            {/* Custom children (additional controls) */}
            {children}

            {/* Process Button */}
            <Button
              onClick={handleProcess}
              disabled={isProcessing || !canProcess || !hasEnoughCreditsForTool(creditCost)}
              className="w-full gap-2"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Process ({creditCost} credits)
                </>
              )}
            </Button>
          </div>

          {/* Output Section */}
          <div className="space-y-2">
            <Label>Output</Label>
            <div className="aspect-video rounded-xl border border-border bg-secondary/50 flex items-center justify-center overflow-hidden">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-sm font-medium">{processingStatus}</p>
                  <p className="text-xs text-muted-foreground/70">This may take a few minutes</p>
                </div>
              ) : outputUrl ? (
                <video
                  src={outputUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Video className="h-12 w-12 opacity-50" />
                  <p className="text-sm">Result will appear here</p>
                </div>
              )}
            </div>

            {/* Download Button */}
            {outputUrl && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = outputUrl;
                  link.download = `${toolId}-output.mp4`;
                  link.target = "_blank";
                  link.click();
                }}
              >
                <Download className="h-4 w-4" />
                Download Video
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CinemaToolLayout;
