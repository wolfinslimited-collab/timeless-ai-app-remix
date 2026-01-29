import { useState, useRef } from "react";
import { ArrowLeft, Image, Sparkles, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, TIMELESS_SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";
import AddCreditsDialog from "@/components/AddCreditsDialog";

interface MobileImageCreateProps {
  onBack: () => void;
}

const MODELS = [
  { id: "nano-banana", name: "Nano Banana", credits: 4 },
  { id: "flux-1.1-pro", name: "FLUX Pro", credits: 5 },
  { id: "ideogram-v2", name: "Ideogram", credits: 6 },
];

const ASPECT_RATIOS = ["1:1", "16:9", "9:16"];

export function MobileImageCreate({ onBack }: MobileImageCreateProps) {
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Check file size (max 10MB)
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

  const selectedModel = MODELS.find(m => m.id === model);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white text-lg font-semibold">Create Image</h1>
        <div className="ml-auto text-xs text-gray-400">
          {selectedModel?.credits} credits
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 px-4 py-4">
        <div className={cn(
          "bg-white/5 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center overflow-hidden",
          aspectRatio === "1:1" && "aspect-square",
          aspectRatio === "16:9" && "aspect-video",
          aspectRatio === "9:16" && "aspect-[9/16] max-h-[300px]"
        )}>
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
              <p className="text-gray-400 text-sm">Generating...</p>
            </div>
          ) : generatedImage ? (
            <img 
              src={generatedImage} 
              alt="Generated" 
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <Image className="w-12 h-12 text-gray-500 mb-3" />
              <p className="text-gray-400 text-sm">Your image will appear here</p>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4">
        {/* Model Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => setModel(m.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors",
                model === m.id 
                  ? "bg-purple-500 text-white" 
                  : "bg-white/10 text-gray-300"
              )}
            >
              {m.name}
            </button>
          ))}
        </div>

        {/* Aspect Ratio */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">Ratio:</span>
          {ASPECT_RATIOS.map((ratio) => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={cn(
                "px-2 py-1 rounded text-xs transition-colors",
                aspectRatio === ratio 
                  ? "bg-purple-500/20 text-purple-300" 
                  : "bg-white/10 text-gray-400"
              )}
            >
              {ratio}
            </button>
          ))}
        </div>

        {/* Prompt Input with Reference Button */}
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
          {/* Reference Image Button */}
          <button
            onClick={() => setShowRefDialog(true)}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
              referenceImages.length > 0 
                ? "bg-purple-500/30 border border-purple-500" 
                : "bg-white/10"
            )}
          >
            {referenceImages.length > 0 ? (
              <span className="text-xs font-bold text-purple-300">+{referenceImages.length}</span>
            ) : (
              <Plus className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your image..."
            className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-500 outline-none"
            disabled={isGenerating}
          />
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 text-white" />
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
          <div className="bg-[#1a1a2e] rounded-t-3xl w-full p-6 animate-slide-up">
            <h3 className="text-white text-lg font-semibold mb-2">Reference Images</h3>
            <p className="text-gray-400 text-sm mb-5">
              Add up to 3 reference images for style transfer and consistency.
            </p>
            
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[0, 1, 2].map((index) => {
                const imageUrl = referenceImages[index];
                const isUploadingThis = isUploading && uploadingIndex === index;
                
                return (
                  <div key={index} className="aspect-square relative">
                    {imageUrl ? (
                      <div className="w-full h-full rounded-xl overflow-hidden border border-white/20 relative group">
                        <img src={imageUrl} alt={`Ref ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeReferenceImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                        {index === 0 && (
                          <div className="absolute top-1 left-1 px-2 py-0.5 bg-purple-500 rounded text-[8px] font-bold text-white">
                            PRIMARY
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => triggerFileUpload(index)}
                        disabled={isUploading}
                        className="w-full h-full rounded-xl border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center"
                      >
                        {isUploadingThis ? (
                          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-6 h-6 text-gray-500 mb-1" />
                            <span className="text-gray-500 text-[10px]">
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
              className="w-full py-3 bg-purple-500 rounded-full text-white font-medium"
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
