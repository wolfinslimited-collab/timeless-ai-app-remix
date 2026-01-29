import { useState, useRef } from "react";
import { ArrowLeft, Image, Sparkles, Loader2, Plus, X, Sun, Maximize, Grid3X3, Brush, Eraser, Scissors, Palette, User, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, TIMELESS_SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";
import AddCreditsDialog from "@/components/AddCreditsDialog";
import { ToolSelector, type ToolItem } from "./ToolSelector";

interface MobileImageCreateProps {
  onBack: () => void;
  initialTool?: string;
}

const TOOLS: ToolItem[] = [
  { id: "generate", name: "Generate", description: "Create images from text prompts", icon: Sparkles, credits: 4, isGenerate: true },
  { id: "relight", name: "Relight", description: "AI-powered relighting", icon: Sun, credits: 2 },
  { id: "upscale", name: "Upscale", description: "Enhance resolution up to 4x", icon: Maximize, credits: 3 },
  { id: "shots", name: "Shots", description: "9 cinematic angles", icon: Grid3X3, credits: 10 },
  { id: "inpainting", name: "Inpainting", description: "Paint to replace areas", icon: Brush, credits: 5 },
  { id: "object-erase", name: "Erase", description: "Remove unwanted objects", icon: Eraser, credits: 4 },
  { id: "background-remove", name: "Remove BG", description: "Remove backgrounds", icon: Scissors, credits: 2 },
  { id: "style-transfer", name: "Style", description: "Apply artistic styles", icon: Palette, credits: 4 },
  { id: "skin-enhancer", name: "Skin", description: "Portrait retouching", icon: User, credits: 3 },
  { id: "angle", name: "Angle", description: "View from new perspectives", icon: RotateCcw, credits: 4 },
];

const MODELS = [
  { id: "nano-banana", name: "Nano Banana", credits: 4 },
  { id: "flux-1.1-pro", name: "FLUX Pro", credits: 5 },
  { id: "ideogram-v2", name: "Ideogram", credits: 6 },
];

const ASPECT_RATIOS = ["1:1", "16:9", "9:16"];

export function MobileImageCreate({ onBack, initialTool = "generate" }: MobileImageCreateProps) {
  const [selectedToolId, setSelectedToolId] = useState(initialTool);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("nano-banana");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [showRefDialog, setShowRefDialog] = useState(false);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadIndex = useRef<number>(0);
  
  const { user } = useAuth();
  const { credits, refetch, hasEnoughCreditsForModel } = useCredits();
  const { toast } = useToast();

  const selectedTool = TOOLS.find(t => t.id === selectedToolId) || TOOLS[0];
  const selectedModel = MODELS.find(m => m.id === model);

  const handleToolSelected = (tool: ToolItem) => {
    if (tool.isGenerate) {
      setSelectedToolId(tool.id);
    } else {
      // For other tools, you could navigate to dedicated screens
      // For now, just select them
      setSelectedToolId(tool.id);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 10MB",
      });
      return;
    }

    setIsUploading(true);
    setUploadingIndex(index);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/ref-${Date.now()}-${index}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("generation-inputs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("generation-inputs")
        .getPublicUrl(fileName);

      setReferenceImages(prev => {
        const newImages = [...prev];
        newImages[index] = publicUrl;
        return newImages.filter(Boolean);
      });

      toast({
        title: "Image uploaded",
        description: "Reference image added successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
      });
    } finally {
      setIsUploading(false);
      setUploadingIndex(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileUpload = (index: number) => {
    currentUploadIndex.current = index;
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a prompt",
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please sign in to generate images",
      });
      return;
    }

    if (!hasEnoughCreditsForModel(model)) {
      setShowAddCreditsDialog(true);
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate", {
        body: {
          prompt,
          type: "image",
          model,
          aspectRatio,
          stream: false,
          background: false,
          ...(referenceImages.length > 0 && { imageUrl: referenceImages[0] }),
        },
      });

      if (error) throw error;

      if (data?.output_url) {
        setGeneratedImage(data.output_url);
        toast({
          title: "Image generated!",
          description: "Your image has been created successfully",
        });
        refetch();
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Compact Header */}
      <div className="px-4 py-2 flex items-center gap-3 border-b border-border">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-foreground text-sm font-semibold truncate">{selectedTool.name}</h1>
          <p className="text-muted-foreground text-[10px] truncate">{selectedTool.description}</p>
        </div>
        <div className="flex items-center gap-1 bg-primary/15 px-2 py-1 rounded-lg">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-primary text-xs font-semibold">{selectedTool.credits}</span>
        </div>
      </div>

      {/* Tool Selector */}
      <ToolSelector
        tools={TOOLS}
        selectedToolId={selectedToolId}
        onToolSelected={handleToolSelected}
      />
      <div className="h-px bg-border" />

      {/* Preview Area */}
      <div className="flex-1 px-4 py-4">
        <div className={cn(
          "bg-secondary rounded-2xl border border-border flex flex-col items-center justify-center overflow-hidden",
          aspectRatio === "1:1" && "aspect-square",
          aspectRatio === "16:9" && "aspect-video",
          aspectRatio === "9:16" && "aspect-[9/16] max-h-[300px]"
        )}>
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">Generating...</p>
            </div>
          ) : generatedImage ? (
            <img 
              src={generatedImage} 
              alt="Generated" 
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <Image className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Your image will appear here</p>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4 border-t border-border">
        {/* Model Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors",
                model === m.id 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* Aspect Ratio */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Ratio:</span>
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                aspectRatio === ratio 
                  ? "bg-primary/20 text-primary" 
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {ratio}
            </button>
          ))}
        </div>

        {/* Prompt Input with Reference Button */}
        <div className="flex items-center gap-2 bg-secondary rounded-full px-3 py-2 border border-border">
          {/* Reference Image Button */}
          <button
            onClick={() => setShowRefDialog(true)}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
              referenceImages.length > 0 
                ? "bg-primary/30 border border-primary" 
                : "bg-background border border-border"
            )}
          >
            {referenceImages.length > 0 ? (
              <span className="text-xs font-bold text-primary">+{referenceImages.length}</span>
            ) : (
              <Plus className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your image..."
            className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
            disabled={isGenerating}
          />
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleImageUpload(e, currentUploadIndex.current)}
      />

      {/* Reference Images Dialog */}
      {showRefDialog && (
        <div className="absolute inset-0 bg-black/80 flex items-end z-50">
          <div className="bg-card rounded-t-3xl w-full p-6 animate-slide-up">
            <h3 className="text-foreground text-lg font-semibold mb-2">Reference Images</h3>
            <p className="text-muted-foreground text-sm mb-5">
              Add up to 3 reference images for style transfer and consistency.
            </p>
            
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[0, 1, 2].map((index) => {
                const imageUrl = referenceImages[index];
                const isUploadingThis = isUploading && uploadingIndex === index;
                
                return (
                  <div key={index} className="aspect-square relative">
                    {imageUrl ? (
                      <div className="w-full h-full rounded-xl overflow-hidden border border-border relative group">
                        <img src={imageUrl} alt={`Ref ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeReferenceImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                        {index === 0 && (
                          <div className="absolute top-1 left-1 px-2 py-0.5 bg-primary rounded text-[8px] font-bold text-primary-foreground">
                            PRIMARY
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerFileUpload(index)}
                        disabled={isUploading}
                        className="w-full h-full rounded-xl border border-dashed border-border bg-secondary flex flex-col items-center justify-center"
                      >
                        {isUploadingThis ? (
                          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-6 h-6 text-muted-foreground mb-1" />
                            <span className="text-muted-foreground text-[10px]">
                              {index === 0 ? 'Primary' : 'Optional'}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={() => setShowRefDialog(false)}
              className="w-full py-3 bg-primary rounded-full text-primary-foreground font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        open={showAddCreditsDialog}
        onOpenChange={setShowAddCreditsDialog}
        currentCredits={credits ?? 0}
        requiredCredits={selectedModel?.credits ?? 4}
      />
    </div>
  );
}
