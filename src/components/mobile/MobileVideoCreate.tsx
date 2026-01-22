import { useState } from "react";
import { ArrowLeft, Video, Sparkles, Loader2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";

interface MobileVideoCreateProps {
  onBack: () => void;
}

const MODELS = [
  { id: "kling-2.6", name: "Kling 2.1", credits: 25 },
  { id: "wan-2.6", name: "Wan 2.1", credits: 15 },
  { id: "veo-3-fast", name: "Veo 3", credits: 20 },
];

const ASPECT_RATIOS = ["16:9", "9:16", "1:1"];
const QUALITIES = ["720p", "1080p"];

export function MobileVideoCreate({ onBack }: MobileVideoCreateProps) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("kling-2.6");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [quality, setQuality] = useState("1080p");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  
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
        description: "Please sign in to generate videos",
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
    setGeneratedVideo(null);

    try {
      // Start background generation
      const { data, error } = await supabase.functions.invoke("generate", {
        body: {
          prompt,
          type: "video",
          model,
          aspectRatio,
          quality,
          stream: false,
          background: true,
        },
      });

      if (error) throw error;

      if (data?.generationId) {
        setTaskId(data.generationId);
        toast({
          title: "Video generation started",
          description: "This may take a few minutes. Check your library for the result.",
        });
        refetch();
        // Poll for completion
        pollForCompletion(data.generationId);
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
      setIsGenerating(false);
    }
  };

  const pollForCompletion = async (generationId: string) => {
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;

    const poll = async () => {
      const { data } = await supabase
        .from("generations")
        .select("status, output_url")
        .eq("id", generationId)
        .single();

      if (data?.status === "completed" && data?.output_url) {
        setGeneratedVideo(data.output_url);
        setIsGenerating(false);
        toast({
          title: "Video ready!",
          description: "Your video has been generated",
        });
        return;
      }

      if (data?.status === "failed") {
        setIsGenerating(false);
        toast({
          variant: "destructive",
          title: "Generation failed",
          description: "The video could not be generated",
        });
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000);
      } else {
        setIsGenerating(false);
        toast({
          title: "Still processing",
          description: "Check your library later for the result",
        });
      }
    };

    setTimeout(poll, 5000);
  };

  const selectedModel = MODELS.find(m => m.id === model);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2 flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white text-lg font-semibold">Create Video</h1>
        <div className="ml-auto text-xs text-gray-400">
          {selectedModel?.credits} credits
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 px-4 py-4">
        <div className="aspect-video bg-white/5 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
              <p className="text-gray-400 text-sm">Generating video...</p>
              <p className="text-gray-500 text-xs">This may take a few minutes</p>
            </div>
          ) : generatedVideo ? (
            <video 
              src={generatedVideo}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <Video className="w-12 h-12 text-gray-500 mb-3" />
              <p className="text-gray-400 text-sm">Your video will appear here</p>
              <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
                <Camera className="w-4 h-4 text-gray-300" />
                <span className="text-gray-300 text-xs">Add reference</span>
              </button>
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

        {/* Settings Row */}
        <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">Quality:</span>
            {QUALITIES.map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={cn(
                  "px-2 py-1 rounded text-xs transition-colors",
                  quality === q 
                    ? "bg-purple-500/20 text-purple-300" 
                    : "bg-white/10 text-gray-400"
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video..."
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
