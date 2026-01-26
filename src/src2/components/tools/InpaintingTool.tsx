import { useState, useRef, useEffect, useCallback } from "react";
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
  ArrowLeft,
  Paintbrush,
  Eraser,
  RotateCcw
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InpaintingToolProps {
  onBack: () => void;
  mode?: "inpainting" | "object-erase";
}

const InpaintingTool = ({ onBack, mode = "inpainting" }: InpaintingToolProps) => {
  const toolName = mode === "inpainting" ? "Inpainting" : "Object Erase";
  const toolDescription = mode === "inpainting" 
    ? "Paint over areas to replace with AI-generated content" 
    : "Paint over objects to remove them from the image";
  const creditCost = mode === "inpainting" ? 5 : 4;
  const toolId = mode === "inpainting" ? "inpainting" : "object-erase";

  const { user } = useAuth();
  const { credits, hasActiveSubscription, refetch: refetchCredits } = useCredits();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  const [inputImage, setInputImage] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushMode, setBrushMode] = useState<"paint" | "erase">("paint");
  const [imageLoaded, setImageLoaded] = useState(false);

  const hasEnoughCredits = hasActiveSubscription || (credits ?? 0) >= creditCost;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Invalid file" });
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
      setImageLoaded(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload failed", description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Initialize canvas when image loads
  useEffect(() => {
    if (!inputImage || !canvasRef.current || !maskCanvasRef.current) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current!;
      const maskCanvas = maskCanvasRef.current!;
      
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;

      // Draw image on main canvas
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Clear mask canvas
      const maskCtx = maskCanvas.getContext('2d')!;
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      setImageLoaded(true);
    };
    img.src = inputImage;
  }, [inputImage]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !maskCanvasRef.current) return;

    const maskCtx = maskCanvasRef.current.getContext('2d')!;
    const { x, y } = getCanvasCoordinates(e);

    maskCtx.beginPath();
    maskCtx.arc(x, y, brushSize, 0, Math.PI * 2);
    maskCtx.fillStyle = brushMode === "paint" ? 'white' : 'black';
    maskCtx.fill();
  }, [isDrawing, brushSize, brushMode]);

  const clearMask = () => {
    if (!maskCanvasRef.current) return;
    const maskCtx = maskCanvasRef.current.getContext('2d')!;
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
  };

  const handleProcess = async () => {
    if (!inputImage || !maskCanvasRef.current || !user) return;

    if (!hasEnoughCredits) {
      toast({ variant: "destructive", title: "Insufficient credits" });
      return;
    }

    setIsProcessing(true);
    setOutputImage(null);

    try {
      // Convert mask to data URL
      const maskDataUrl = maskCanvasRef.current.toDataURL('image/png');

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
          maskUrl: maskDataUrl,
          prompt: prompt || (mode === "inpainting" ? "seamless blend" : "remove object"),
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
        {/* Input/Mask Side */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <Label className="mb-3 block">Paint Mask</Label>
            
            {!inputImage ? (
              <div
                className={cn(
                  "border-2 border-dashed border-border/50 rounded-xl p-12 text-center cursor-pointer hover:border-primary/50",
                  isUploading && "opacity-50 pointer-events-none"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
                ) : (
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                )}
                <p className="text-muted-foreground">
                  {isUploading ? "Uploading..." : "Upload an image to start"}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-auto rounded-xl pointer-events-none"
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                  <canvas
                    ref={maskCanvasRef}
                    className="w-full h-auto rounded-xl cursor-crosshair"
                    style={{ maxHeight: '400px', objectFit: 'contain', opacity: 0.5, mixBlendMode: 'screen' }}
                    onMouseDown={() => setIsDrawing(true)}
                    onMouseUp={() => setIsDrawing(false)}
                    onMouseLeave={() => setIsDrawing(false)}
                    onMouseMove={draw}
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setInputImage(null);
                      setImageLoaded(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Brush Controls */}
                <div className="flex items-center gap-4">
                  <Button
                    variant={brushMode === "paint" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBrushMode("paint")}
                  >
                    <Paintbrush className="h-4 w-4 mr-2" />
                    Paint
                  </Button>
                  <Button
                    variant={brushMode === "erase" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBrushMode("erase")}
                  >
                    <Eraser className="h-4 w-4 mr-2" />
                    Erase
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearMask}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>

                <div>
                  <Label className="mb-2 block">Brush Size: {brushSize}px</Label>
                  <Slider
                    value={[brushSize]}
                    onValueChange={(v) => setBrushSize(v[0])}
                    min={5}
                    max={100}
                    step={5}
                  />
                </div>

                {mode === "inpainting" && (
                  <div>
                    <Label className="mb-2 block">What to generate</Label>
                    <Textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe what should appear in the masked area..."
                      rows={2}
                    />
                  </div>
                )}

                <Button
                  className="w-full gradient-primary text-primary-foreground"
                  onClick={handleProcess}
                  disabled={isProcessing || !hasEnoughCredits || !imageLoaded}
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
                <Button variant="outline" className="w-full" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-border/50 rounded-xl p-12 text-center">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-primary" />
                    <p className="text-muted-foreground">Processing...</p>
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
    </div>
  );
};

export default InpaintingTool;
