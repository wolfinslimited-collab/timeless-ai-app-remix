import { useState } from "react";
import { ArrowLeft, Image, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, TIMELESS_SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";

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
  
  const { user } = useAuth();
  const { credits, refetch, hasEnoughCreditsForModel } = useCredits();
  const { toast } = useToast();

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
      toast({
        variant: "destructive",
        title: "Insufficient credits",
        description: "Please add more credits to continue",
      });
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

        {/* Prompt Input */}
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-3">
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
    </div>
  );
}
