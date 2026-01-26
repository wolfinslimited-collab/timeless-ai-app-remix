import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, 
  X, 
  Loader2, 
  Download, 
  Sparkles,
  RotateCcw,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddCreditsDialog from "@/components/AddCreditsDialog";

interface ImageToolLayoutProps {
  toolId: string;
  toolName: string;
  toolDescription: string;
  creditCost: number;
  onBack: () => void;
  // Optional customization
  showPrompt?: boolean;
  promptLabel?: string;
  promptPlaceholder?: string;
  showIntensity?: boolean;
  intensityLabel?: string;
  showScale?: boolean;
  showStyleSelector?: boolean;
  styleOptions?: { id: string; label: string }[];
  showMaskEditor?: boolean;
  previewVideo?: string;
  children?: React.ReactNode;
}

const ImageToolLayout = ({
  toolId,
  toolName,
  toolDescription,
  creditCost,
  onBack,
  showPrompt = false,
  promptLabel = "Prompt",
  promptPlaceholder = "Describe the desired result...",
  showIntensity = false,
  intensityLabel = "Intensity",
  showScale = false,
  showStyleSelector = false,
  styleOptions = [],
  showMaskEditor = false,
  previewVideo,
}: ImageToolLayoutProps) => {
  const { user } = useAuth();
  const { credits, hasActiveSubscription, refetch: refetchCredits } = useCredits();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputImage, setInputImage] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [intensity, setIntensity] = useState(50);
  const [scale, setScale] = useState(2);
  const [selectedStyle, setSelectedStyle] = useState(styleOptions[0]?.id || "");
  const [maskImage, setMaskImage] = useState<string | null>(null);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);

  const hasEnoughCredits = hasActiveSubscription || (credits ?? 0) >= creditCost;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please upload an image." });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: "destructive", title: "File too large", description: "Max 10MB." });
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
      setOutputImage(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload failed", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!inputImage || !user) return;

    if (!hasEnoughCredits) {
      setShowAddCreditsDialog(true);
      return;
    }

    setIsProcessing(true);
    setOutputImage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          tool: toolId,
          imageUrl: inputImage,
          maskUrl: maskImage,
          prompt: prompt || undefined,
          intensity,
          scale,
          style: selectedStyle,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Processing failed');
      }

      setOutputImage(result.outputUrl);
      refetchCredits();
      toast({ title: "Success!", description: `${toolName} completed.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Processing failed", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!outputImage) return;
    
    try {
      const response = await fetch(outputImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${toolId}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({ variant: "destructive", title: "Download failed" });
    }
  };

  const handleReset = () => {
    setInputImage(null);
    setOutputImage(null);
    setMaskImage(null);
    setPrompt("");
    setIntensity(50);
    setScale(2);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{toolName}</h1>
          <p className="text-muted-foreground">{toolDescription}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{creditCost} credits per use</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Side */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <Label className="mb-3 block">Input Image</Label>
            
            {!inputImage ? (
              <div
                className={cn(
                  "border-2 border-dashed border-border/50 rounded-xl text-center cursor-pointer hover:border-primary/50 transition-colors relative overflow-hidden",
                  previewVideo ? "aspect-[4/5]" : "p-12",
                  isUploading && "opacity-50 pointer-events-none"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {previewVideo && (
                  <video
                    src={previewVideo}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                )}
                <div className={cn(
                  "flex flex-col items-center justify-center",
                  previewVideo ? "absolute inset-0 z-10" : ""
                )}>
                  {isUploading ? (
                    <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  )}
                  <p className="text-muted-foreground">
                    {isUploading ? "Uploading..." : "Click or drag to upload"}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={inputImage}
                  alt="Input"
                  className="w-full rounded-xl object-contain max-h-[400px]"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleReset}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Controls */}
            {inputImage && (
              <div className="mt-6 space-y-4">
                {showPrompt && (
                  <div>
                    <Label className="mb-2 block">{promptLabel}</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={promptPlaceholder}
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                )}

                {showIntensity && (
                  <div>
                    <Label className="mb-2 block">{intensityLabel}: {intensity}%</Label>
                    <Slider
                      value={[intensity]}
                      onValueChange={(v) => setIntensity(v[0])}
                      min={10}
                      max={100}
                      step={10}
                    />
                  </div>
                )}

                {showScale && (
                  <div>
                    <Label className="mb-2 block">Scale: {scale}x</Label>
                    <Slider
                      value={[scale]}
                      onValueChange={(v) => setScale(v[0])}
                      min={2}
                      max={4}
                      step={1}
                    />
                  </div>
                )}

                {showStyleSelector && styleOptions.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Style</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {styleOptions.map((style) => (
                        <Button
                          key={style.id}
                          variant={selectedStyle === style.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedStyle(style.id)}
                        >
                          {style.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full gradient-primary text-primary-foreground"
                  onClick={handleProcess}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Apply {toolName}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Output Side */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <Label className="mb-3 block">Result</Label>
            
            {outputImage ? (
              <div className="space-y-4">
                <img
                  src={outputImage}
                  alt="Output"
                  className="w-full rounded-xl object-contain max-h-[400px]"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setInputImage(outputImage);
                      setOutputImage(null);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Use as Input
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border/50 rounded-xl p-12 text-center">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
                    <p className="text-muted-foreground">Processing your image...</p>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">Result will appear here</p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        open={showAddCreditsDialog}
        onOpenChange={setShowAddCreditsDialog}
        currentCredits={credits ?? 0}
        requiredCredits={creditCost}
      />
    </div>
  );
};

export default ImageToolLayout;
