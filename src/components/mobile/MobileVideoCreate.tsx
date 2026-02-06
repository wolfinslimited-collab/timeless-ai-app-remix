import { useState } from "react";
import { ArrowLeft, Video, Sparkles, Loader2, Camera, Play, Layers, TrendingUp, Mic, Brush, Maximize, PlusCircle, Timer, Zap, ChevronDown, Wand2, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, TIMELESS_SUPABASE_URL } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";
import AddCreditsDialog from "@/components/AddCreditsDialog";
import { ToolSelector, type ToolItem } from "./ToolSelector";
import { ModelSelectorModal, type ModelOption } from "./ModelSelectorModal";
import { ModelBrandLogo } from "./ModelBrandLogo";
import { MobileAIEditor } from "./MobileAIEditor";

interface MobileVideoCreateProps {
  onBack: () => void;
  initialTool?: string;
}

const TOOLS: ToolItem[] = [
  { id: "generate", name: "Generate", description: "Create videos from text prompts", icon: Play, credits: 15, isGenerate: true },
  { id: "mixed-media", name: "Mixed", description: "Create mixed media projects", icon: Layers, credits: 15, badge: "NEW" },
  { id: "sora-trends", name: "Trends", description: "Turn ideas into viral videos", icon: TrendingUp, credits: 25 },
  { id: "lip-sync", name: "Lipsync", description: "Create talking clips", icon: Mic, credits: 15 },
  { id: "draw-to-video", name: "Draw", description: "Sketch to cinematic video", icon: Brush, credits: 18 },
  { id: "video-upscale", name: "Upscale", description: "Enhance video quality", icon: Maximize, credits: 8 },
  { id: "extend", name: "Extend", description: "Extend video length", icon: PlusCircle, credits: 12 },
  { id: "interpolate", name: "Smooth", description: "Smooth frame rate", icon: Timer, credits: 6 },
  { id: "ai-editor", name: "AI Editor", description: "AI-powered video editing", icon: Film, credits: 12, badge: "NEW" },
];

const MODELS: ModelOption[] = [
  { id: "kling-2.6", name: "Kling 2.6 Pro", description: "Cinematic with audio", credits: 25, badge: "TOP", tier: "hq" },
  { id: "wan-2.6", name: "Wan 2.6", description: "Latest Alibaba model", credits: 15, badge: "NEW", tier: "hq" },
  { id: "veo-3", name: "Veo 3", description: "Google's best with audio", credits: 30, badge: "TOP", tier: "hq" },
  { id: "veo-3-fast", name: "Veo 3 Fast", description: "Faster Veo 3", credits: 20, badge: "PRO", tier: "hq" },
  { id: "luma", name: "Luma Dream Machine", description: "Creative video", credits: 22, badge: "PRO", tier: "hq" },
  { id: "hailuo-02", name: "Hailuo-02", description: "MiniMax video model", credits: 18, badge: "NEW", tier: "hq" },
  { id: "seedance-1.5", name: "Seedance 1.5", description: "With audio support", credits: 20, badge: "NEW", tier: "hq" },
  { id: "hunyuan-1.5", name: "Hunyuan 1.5", description: "Tencent video model", credits: 18, badge: "NEW", tier: "hq" },
  { id: "runway", name: "Runway Gen", description: "Industry standard", credits: 8, tier: "economy" },
  { id: "sora-2", name: "Sora 2", description: "OpenAI video gen", credits: 12, tier: "economy" },
];

const ASPECT_RATIOS = ["16:9", "9:16", "1:1"];
const QUALITIES = ["720p", "1080p"];

export function MobileVideoCreate({ onBack, initialTool = "generate" }: MobileVideoCreateProps) {
  const [selectedToolId, setSelectedToolId] = useState(initialTool);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("kling-2.6");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [quality, setQuality] = useState("1080p");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  const { user } = useAuth();
  const { credits, refetch, hasEnoughCreditsForModel } = useCredits();
  const { toast } = useToast();

  const selectedTool = TOOLS.find(t => t.id === selectedToolId) || TOOLS[0];
  const selectedModelData = MODELS.find(m => m.id === model);

  const handleToolSelected = (tool: ToolItem) => {
    setSelectedToolId(tool.id);
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
        description: "Please sign in to generate videos",
      });
      return;
    }

    if (!hasEnoughCreditsForModel(model)) {
      setShowAddCreditsDialog(true);
      return;
    }

    setIsGenerating(true);
    setGeneratedVideo(null);

    try {
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
    const maxAttempts = 60;
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

  // Render MobileAIEditor when ai-editor tool is selected
  if (selectedToolId === "ai-editor") {
    return <MobileAIEditor onBack={() => setSelectedToolId("generate")} />;
  }

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
          <span className="text-primary text-xs font-semibold">{selectedModelData?.credits ?? 15}</span>
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
        <div className="aspect-video bg-secondary rounded-2xl border border-border flex flex-col items-center justify-center overflow-hidden">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">Generating video...</p>
              <p className="text-muted-foreground text-xs">This may take a few minutes</p>
            </div>
          ) : generatedVideo ? (
            <video 
              src={generatedVideo}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <Video className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Your video will appear here</p>
              <button className="mt-4 flex items-center gap-2 px-4 py-2 bg-secondary rounded-full border border-border">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">Add reference</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4 border-t border-border">
        {/* Model Selector Button */}
        <button
          onClick={() => setShowModelSelector(true)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary border border-border hover:bg-secondary/80 transition-colors"
        >
          <ModelBrandLogo modelId={model} size="md" />
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">
                {selectedModelData?.name || "Select Model"}
              </span>
              {selectedModelData?.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold text-white rounded bg-primary">
                  {selectedModelData.badge}
                </span>
              )}
            </div>
            {selectedModelData?.description && (
              <span className="text-xs text-muted-foreground">{selectedModelData.description}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-background rounded-lg flex items-center gap-1">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold text-primary">{selectedModelData?.credits || 15}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </button>

        {/* Settings Row */}
        <div className="flex items-center gap-4">
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
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Quality:</span>
            {QUALITIES.map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={cn(
                  "px-2 py-1 rounded text-xs transition-colors",
                  quality === q 
                    ? "bg-primary/20 text-primary" 
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-3 border border-border">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video..."
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

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        open={showAddCreditsDialog}
        onOpenChange={setShowAddCreditsDialog}
        currentCredits={credits ?? 0}
        requiredCredits={selectedModelData?.credits ?? 15}
      />

      {/* Model Selector Modal */}
      <ModelSelectorModal
        isOpen={showModelSelector}
        onClose={() => setShowModelSelector(false)}
        models={MODELS}
        selectedModel={model}
        onSelectModel={setModel}
        title="Select Video Model"
        type="video"
      />
    </div>
  );
}
