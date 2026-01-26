import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Upload, 
  X, 
  Loader2, 
  Download, 
  Sparkles,
  RotateCcw,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Plus,
  Coins,
  Settings2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddCreditsDialog from "@/components/AddCreditsDialog";

interface RelightToolProps {
  onBack: () => void;
}

const LIGHT_DIRECTIONS = [
  { id: "top", label: "Top" },
  { id: "front", label: "Front" },
  { id: "right", label: "Right" },
  { id: "left", label: "Left" },
  { id: "back", label: "Back" },
  { id: "bottom", label: "Bottom" },
];

const LIGHT_MODES = [
  { id: "soft", label: "Soft" },
  { id: "hard", label: "Hard" },
];

const CREDIT_COST = 2;

const RelightTool = ({ onBack }: RelightToolProps) => {
  const { user } = useAuth();
  const { credits, hasActiveSubscription, refetch: refetchCredits } = useCredits();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lightPadRef = useRef<HTMLDivElement>(null);

  const [inputImage, setInputImage] = useState<string | null>(null);
  const [outputImage, setOutputImage] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<string[]>([]); // Store all generated images
  const [selectedPreview, setSelectedPreview] = useState<'original' | number>('original'); // Track which preview is shown
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);

  // Light controls
  const [selectedDirection, setSelectedDirection] = useState("front");
  const [lightMode, setLightMode] = useState("soft");
  const [brightness, setBrightness] = useState(50);
  const [lightColor, setLightColor] = useState("#FFFFFF");
  
  // Light position for drag control (normalized -1 to 1)
  const [lightPosition, setLightPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  const hasEnoughCredits = hasActiveSubscription || (credits ?? 0) >= CREDIT_COST;

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

  const updateLightPositionFromDirection = (direction: string) => {
    const positions: Record<string, { x: number; y: number }> = {
      top: { x: 0, y: -0.8 },
      bottom: { x: 0, y: 0.8 },
      left: { x: -0.8, y: 0 },
      right: { x: 0.8, y: 0 },
      front: { x: 0, y: 0 },
      back: { x: 0, y: 0.5 },
    };
    setLightPosition(positions[direction] || { x: 0, y: 0 });
    setSelectedDirection(direction);
  };

  const handleLightPadMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    updateLightPositionFromClient(e.clientX, e.clientY);
  }, []);

  const handleLightPadTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    updateLightPositionFromClient(touch.clientX, touch.clientY);
  }, []);

  const updateLightPositionFromClient = (clientX: number, clientY: number) => {
    if (!lightPadRef.current) return;
    
    const rect = lightPadRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = ((clientY - rect.top) / rect.height) * 2 - 1;
    
    // Clamp values between -1 and 1
    const clampedX = Math.max(-1, Math.min(1, x));
    const clampedY = Math.max(-1, Math.min(1, y));
    
    setLightPosition({ x: clampedX, y: clampedY });
    setSelectedDirection(""); // Clear preset selection when dragging
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      updateLightPositionFromClient(e.clientX, e.clientY);
    }
  }, [isDragging]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isDragging && e.touches.length > 0) {
      e.preventDefault();
      const touch = e.touches[0];
      updateLightPositionFromClient(touch.clientX, touch.clientY);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove event listeners for dragging (mouse and touch)
  useState(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  });

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

      // Build the prompt from the settings
      const lightingPrompt = `${lightMode} ${selectedDirection || 'custom'} lighting, brightness ${brightness}%, light color ${lightColor}`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          tool: 'relight',
          imageUrl: inputImage,
          prompt: lightingPrompt,
          intensity: brightness,
          lightDirection: selectedDirection || `x:${lightPosition.x.toFixed(2)},y:${lightPosition.y.toFixed(2)}`,
          lightMode,
          lightColor,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Processing failed');
      }

      setOutputImage(result.outputUrl);
      setGenerationHistory(prev => [...prev, result.outputUrl]);
      setSelectedPreview(generationHistory.length); // Select the new generation
      refetchCredits();
      toast({ title: "Success!", description: "Relight completed." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Processing failed", description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    const imageToDownload = selectedPreview === 'original' ? inputImage : generationHistory[selectedPreview as number];
    if (!imageToDownload) return;
    
    try {
      const response = await fetch(imageToDownload);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relight-${Date.now()}.png`;
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
    setGenerationHistory([]);
    setSelectedPreview('original');
    setSelectedDirection("front");
    setLightMode("soft");
    setBrightness(50);
    setLightColor("#FFFFFF");
    setLightPosition({ x: 0, y: 0 });
  };

  // Get currently displayed image based on selection
  const getDisplayedImage = () => {
    if (selectedPreview === 'original') {
      return inputImage;
    }
    return generationHistory[selectedPreview] || inputImage;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 px-4 py-2 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-muted-foreground">Apps</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Relight</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-28">
        <div className="max-w-6xl mx-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Upload Area */}
            <div className="space-y-3">
              <Card className="border-border/50 bg-card/50">
                <CardContent className="p-3 lg:p-4">
                  {!inputImage ? (
                    <div
                      className={cn(
                        "aspect-[4/3] border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors relative overflow-hidden",
                        isUploading && "opacity-50 pointer-events-none"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {/* Video Preview */}
                      <video
                        src="/videos/relight-preview.mp4"
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                      />
                      
                      {/* Add button */}
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                        <div className="w-10 h-10 rounded-lg bg-card border border-border/50 flex items-center justify-center">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
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
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-black/50">
                      <img
                        src={getDisplayedImage() || inputImage}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                      {selectedPreview !== 'original' && generationHistory[selectedPreview as number] && (
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8"
                          onClick={handleDownload}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Add button */}
                      <div 
                        className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <div className="w-10 h-10 rounded-lg bg-card/80 backdrop-blur border border-border/50 flex items-center justify-center hover:bg-card transition-colors">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Title - Mobile only shows compact version */}
              <div className="text-center lg:hidden">
                <h1 className="text-xl font-bold tracking-tight">RELIGHT</h1>
              </div>
              <div className="hidden lg:block text-center space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">RELIGHT</h1>
                <p className="text-sm text-muted-foreground">
                  Adjust lighting position, color, and brightness
                </p>
              </div>

              {/* Upload/Reset Button */}
              {!inputImage ? (
                <Button
                  variant="outline"
                  className="w-full h-10 gap-2 lg:hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full lg:hidden"
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Over
                </Button>
              )}
            </div>

            {/* Controls - Collapsible on mobile */}
            <Collapsible open={controlsOpen} onOpenChange={setControlsOpen} className="lg:contents">
              <Card className="border-border/50 bg-card/50 h-fit">
                {/* Mobile collapsible header */}
                <CollapsibleTrigger asChild className="lg:hidden">
                  <button className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Light Controls</span>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      controlsOpen && "rotate-180"
                    )} />
                  </button>
                </CollapsibleTrigger>

                {/* Desktop header */}
                <div className="hidden lg:flex items-center gap-2 py-3 px-4 border-b border-border/50">
                  <Lightbulb className="h-4 w-4" />
                  <span className="font-medium text-base">Relight Controls</span>
                </div>

                <CollapsibleContent className="lg:block">
                  <CardContent className="space-y-3 p-3 lg:p-4">
                    {/* Quick Select */}
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs">Quick select</Label>
                      <div className="grid grid-cols-6 lg:grid-cols-3 gap-1.5">
                        {LIGHT_DIRECTIONS.map((dir) => (
                          <Button
                            key={dir.id}
                            variant={selectedDirection === dir.id ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs px-2"
                            onClick={() => updateLightPositionFromDirection(dir.id)}
                          >
                            {dir.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Light Direction Pad - Hidden on mobile, shown on desktop */}
                    <div className="hidden lg:block space-y-2">
                      <Label className="text-muted-foreground text-xs text-center block">
                        Drag to change light direction
                      </Label>
                      <div 
                        ref={lightPadRef}
                        className="relative aspect-[3/2] bg-secondary/30 rounded-xl border border-border/50 cursor-crosshair overflow-hidden touch-none"
                  onMouseDown={handleLightPadMouseDown}
                  onTouchStart={handleLightPadTouchStart}
                >
                  {/* Direction indicators */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 text-muted-foreground/50">
                    <ChevronUp className="h-5 w-5" />
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-muted-foreground/50">
                    <ChevronDown className="h-5 w-5" />
                  </div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                    <ChevronLeft className="h-5 w-5" />
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/50">
                    <ChevronRight className="h-5 w-5" />
                  </div>

                  {/* Light beam visualization */}
                  {inputImage && (
                    <svg 
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient 
                          id="lightBeamGradient" 
                          x1="0%" y1="0%" x2="0%" y2="100%"
                        >
                          <stop offset="0%" stopColor={lightColor} stopOpacity="0.6" />
                          <stop offset="100%" stopColor={lightColor} stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                      {/* Light beam cone from light source to image center */}
                      <polygon
                        points={`
                          ${50 + lightPosition.x * 35},${50 + lightPosition.y * 35}
                          ${50 - 8},${50 + 8}
                          ${50 + 8},${50 + 8}
                        `}
                        fill="url(#lightBeamGradient)"
                        style={{
                          transform: `rotate(${Math.atan2(-lightPosition.y, -lightPosition.x) * (180 / Math.PI) + 90}deg)`,
                          transformOrigin: '50% 50%',
                        }}
                      />
                      {/* Alternative: simpler beam that always points to center */}
                      <path
                        d={`
                          M ${50 + lightPosition.x * 38} ${50 + lightPosition.y * 38}
                          L ${50 - 6} ${50 + 6}
                          L ${50 + 6} ${50 + 6}
                          Z
                        `}
                        fill={lightColor}
                        opacity={brightness / 200}
                        style={{
                          filter: lightMode === 'soft' ? 'blur(2px)' : 'none',
                        }}
                      />
                    </svg>
                  )}

                  {/* Image thumbnail in center */}
                  {inputImage && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-border/50 shadow-lg">
                        <img 
                          src={inputImage} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* Light source indicator */}
                  <div
                    className="absolute w-6 h-6 bg-foreground/20 border-2 border-foreground/60 rounded-md transition-all duration-75 flex items-center justify-center"
                    style={{
                      left: `calc(50% + ${lightPosition.x * 38}% - 12px)`,
                      top: `calc(50% + ${lightPosition.y * 38}% - 12px)`,
                      boxShadow: `0 0 ${brightness / 5}px ${lightColor}`,
                    }}
                  >
                    {/* Inner glow */}
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: lightColor, opacity: brightness / 100 }}
                    />
                  </div>
                    </div>
                  </div>

                    {/* Light Settings */}
                    <div className="space-y-3">
                      <Label className="text-muted-foreground text-xs">Light settings</Label>
                      
                      {/* Soft/Hard Toggle */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {LIGHT_MODES.map((mode) => (
                          <Button
                            key={mode.id}
                            variant={lightMode === mode.id ? "default" : "outline"}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setLightMode(mode.id)}
                          >
                            {mode.label}
                          </Button>
                        ))}
                      </div>

                      {/* Brightness */}
                      <div className="flex items-center gap-3 p-2.5 bg-secondary/30 rounded-lg">
                        <span className="text-xs text-muted-foreground min-w-14 lg:min-w-16">Brightness</span>
                        <Slider
                          value={[brightness]}
                          onValueChange={(v) => setBrightness(v[0])}
                          min={0}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <span className="text-xs font-medium min-w-8 lg:min-w-10 text-right">{brightness}%</span>
                      </div>

                      {/* Color */}
                      <div className="flex items-center gap-3 p-2.5 bg-secondary/30 rounded-lg">
                        <span className="text-xs text-muted-foreground min-w-14 lg:min-w-16">Color</span>
                        <div className="flex-1" />
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={lightColor}
                            onChange={(e) => setLightColor(e.target.value)}
                            className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent"
                          />
                          <Input
                            value={lightColor}
                            onChange={(e) => setLightColor(e.target.value)}
                            className="w-20 h-7 text-xs font-mono bg-transparent border-0 p-0 text-right"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button
                      className="w-full h-10 lg:h-11 text-sm font-semibold gradient-primary text-white"
                      onClick={handleProcess}
                      disabled={!inputImage || isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Generate
                          <Sparkles className="h-4 w-4 ml-2" />
                          <span className="ml-2">{CREDIT_COST}</span>
                        </>
                      )}
                    </Button>

                    {!hasActiveSubscription && (
                      <p className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                        <Coins className="h-3 w-3" />
                        {credits ?? 0} credits available
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>
      </div>

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        open={showAddCreditsDialog}
        onOpenChange={setShowAddCreditsDialog}
        currentCredits={credits ?? 0}
        requiredCredits={CREDIT_COST}
      />

      {/* Results Footer Strip */}
      {inputImage && (generationHistory.length > 0 || inputImage) && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/50 py-3 z-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-center gap-2">
              {/* Original Image */}
              <button
                onClick={() => setSelectedPreview('original')}
                className={cn(
                  "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all duration-200",
                  selectedPreview === 'original' 
                    ? "ring-2 ring-[#c8ff00] ring-offset-2 ring-offset-background" 
                    : "ring-1 ring-border/50 hover:ring-border"
                )}
              >
                <img 
                  src={inputImage} 
                  alt="Original" 
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] py-0.5 text-center">
                  Original
                </span>
              </button>

              {/* Generated Images */}
              {generationHistory.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPreview(index)}
                  className={cn(
                    "relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all duration-200",
                    selectedPreview === index 
                      ? "ring-2 ring-[#c8ff00] ring-offset-2 ring-offset-background" 
                      : "ring-1 ring-border/50 hover:ring-border"
                  )}
                >
                  <img 
                    src={url} 
                    alt={`Generation ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}

              {/* Loading indicator for in-progress generation */}
              {isProcessing && (
                <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-secondary/50 border border-border/50 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelightTool;
