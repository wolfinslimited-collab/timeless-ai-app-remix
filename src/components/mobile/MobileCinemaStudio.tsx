import { useState, useRef } from "react";
import { 
  ArrowLeft, 
  Upload, 
  Video, 
  Image, 
  Sparkles, 
  Settings, 
  Play,
  X,
  Loader2,
  ChevronDown,
  Move3d
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";
import { supabase, TIMELESS_SUPABASE_URL, TIMELESS_ANON_KEY } from "@/lib/supabase";

interface MobileCinemaStudioProps {
  onBack: () => void;
}

// Camera Movement Presets
const movements = [
  { id: "static", label: "Static", icon: "📷" },
  { id: "dolly-in", label: "Dolly In", icon: "➡️" },
  { id: "dolly-out", label: "Dolly Out", icon: "⬅️" },
  { id: "pan-left", label: "Pan Left", icon: "↩️" },
  { id: "pan-right", label: "Pan Right", icon: "↪️" },
  { id: "tilt-up", label: "Tilt Up", icon: "⬆️" },
  { id: "tilt-down", label: "Tilt Down", icon: "⬇️" },
  { id: "zoom-in", label: "Zoom In", icon: "🔍" },
  { id: "zoom-out", label: "Zoom Out", icon: "🔎" },
  { id: "orbit", label: "Orbit", icon: "🔄" },
];

const aspectRatios = ["16:9", "9:16", "1:1", "21:9", "4:3"];
const durations = [3, 5, 7, 10];

const cinemaModels = [
  { id: "wan-2.6-cinema", name: "Wan Cinema", credits: 20 },
  { id: "kling-3.0-cinema", name: "Kling v3.0 Cinema", credits: 30 },
  { id: "veo-3-cinema", name: "Veo 3 Cinema", credits: 35 },
  { id: "luma-cinema", name: "Luma Cinema", credits: 28 },
];

export function MobileCinemaStudio({ onBack }: MobileCinemaStudioProps) {
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<"video" | "image">("video");
  const [prompt, setPrompt] = useState("");
  const [startFrame, setStartFrame] = useState<string | null>(null);
  const [endFrame, setEndFrame] = useState<string | null>(null);
  const [selectedMovements, setSelectedMovements] = useState<string[]>(["static"]);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState(5);
  const [model, setModel] = useState(cinemaModels[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);

  const currentModel = cinemaModels.find(m => m.id === model) || cinemaModels[0];
  const currentCost = currentModel.credits;
  const hasEnoughCredits = (credits ?? 0) >= currentCost;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "start" | "end") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "start") {
        setStartFrame(reader.result as string);
      } else {
        setEndFrame(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleMovement = (id: string) => {
    if (selectedMovements.includes(id)) {
      if (selectedMovements.length > 1) {
        setSelectedMovements(selectedMovements.filter(m => m !== id));
      }
    } else if (selectedMovements.length < 3) {
      setSelectedMovements([...selectedMovements, id]);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Please sign in to generate" });
      return;
    }
    if (!hasEnoughCredits) {
      toast({ variant: "destructive", title: "Not enough credits" });
      return;
    }
    if (!prompt.trim() && !startFrame) {
      toast({ variant: "destructive", title: "Add a prompt or reference image" });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch(`${TIMELESS_SUPABASE_URL}/functions/v1/cinema-tools`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TIMELESS_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: "generate",
          prompt,
          model,
          aspectRatio,
          duration,
          movements: selectedMovements,
          startFrame,
          endFrame,
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const data = await response.json();
      
      if (data.output_url) {
        setResult(data.output_url);
        refetchCredits();
      } else if (data.task_id) {
        // Poll for result
        const pollResult = async () => {
          const checkResponse = await fetch(`${TIMELESS_SUPABASE_URL}/functions/v1/check-generation`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${TIMELESS_ANON_KEY}`,
            },
            body: JSON.stringify({ task_id: data.task_id }),
          });
          
          const checkData = await checkResponse.json();
          
          if (checkData.status === "completed" && checkData.output_url) {
            setResult(checkData.output_url);
            setIsGenerating(false);
            refetchCredits();
          } else if (checkData.status === "failed") {
            throw new Error("Generation failed");
          } else {
            setTimeout(pollResult, 3000);
          }
        };
        
        pollResult();
        return;
      }
    } catch (error) {
      console.error("Cinema generation error:", error);
      toast({ variant: "destructive", title: "Generation failed" });
    }

    setIsGenerating(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-white text-lg font-semibold">Cinema Studio</h1>
            <p className="text-gray-400 text-xs">{currentModel.name} • {currentCost} credits</p>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full bg-white/10"
        >
          <Settings className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="px-4 py-3 flex gap-2">
        <button
          onClick={() => setMode("video")}
          className={cn(
            "flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all",
            mode === "video" 
              ? "bg-purple-500 text-white" 
              : "bg-white/5 text-gray-400"
          )}
        >
          <Video className="w-4 h-4" />
          <span className="text-sm font-medium">Video</span>
        </button>
        <button
          onClick={() => setMode("image")}
          className={cn(
            "flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all",
            mode === "image" 
              ? "bg-purple-500 text-white" 
              : "bg-white/5 text-gray-400"
          )}
        >
          <Image className="w-4 h-4" />
          <span className="text-sm font-medium">Image</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-4">
        {/* Preview Area */}
        <div className="aspect-video rounded-2xl bg-white/5 border border-white/10 overflow-hidden relative">
          {result ? (
            <video 
              src={result} 
              className="w-full h-full object-contain"
              controls
              autoPlay
              loop
            />
          ) : startFrame ? (
            <div className="relative w-full h-full">
              <img src={startFrame} alt="Start frame" className="w-full h-full object-contain" />
              <button
                onClick={() => setStartFrame(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <Video className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">Your video will appear here</p>
            </div>
          )}
          
          {isGenerating && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                <p className="text-white text-sm">Generating...</p>
              </div>
            </div>
          )}
        </div>

        {/* Frame Uploads */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Start Frame</label>
            <input
              ref={startInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, "start")}
            />
            <button
              onClick={() => startInputRef.current?.click()}
              className="w-full aspect-video rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-all"
            >
              {startFrame ? (
                <img src={startFrame} alt="Start" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <>
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-400">Upload</span>
                </>
              )}
            </button>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">End Frame (Optional)</label>
            <input
              ref={endInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e, "end")}
            />
            <button
              onClick={() => endInputRef.current?.click()}
              className="w-full aspect-video rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-all"
            >
              {endFrame ? (
                <img src={endFrame} alt="End" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <>
                  <Upload className="w-5 h-5 text-gray-400" />
                  <span className="text-xs text-gray-400">Upload</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Camera Movements */}
        <div>
          <button 
            onClick={() => setShowMovements(!showMovements)}
            className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10"
          >
            <div className="flex items-center gap-2">
              <Move3d className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white">
                Camera: {selectedMovements.map(id => movements.find(m => m.id === id)?.label).join(", ")}
              </span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", showMovements && "rotate-180")} />
          </button>
          
          {showMovements && (
            <div className="mt-2 p-3 bg-white/5 rounded-xl border border-white/10 grid grid-cols-3 gap-2">
              {movements.map((movement) => (
                <button
                  key={movement.id}
                  onClick={() => toggleMovement(movement.id)}
                  className={cn(
                    "p-2 rounded-lg text-center transition-all",
                    selectedMovements.includes(movement.id)
                      ? "bg-purple-500/20 border border-purple-500"
                      : "bg-white/5 border border-white/10"
                  )}
                >
                  <span className="text-lg">{movement.icon}</span>
                  <p className="text-[10px] text-white mt-0.5">{movement.label}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
            {/* Model */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Model</label>
              <div className="grid grid-cols-2 gap-2">
                {cinemaModels.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={cn(
                      "p-2 rounded-lg text-xs transition-all",
                      model === m.id
                        ? "bg-purple-500/20 border border-purple-500 text-white"
                        : "bg-white/5 border border-white/10 text-gray-400"
                    )}
                  >
                    {m.name}
                    <span className="block text-[10px] opacity-60">{m.credits} credits</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Aspect Ratio</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {aspectRatios.map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all",
                      aspectRatio === ar
                        ? "bg-purple-500 text-white"
                        : "bg-white/5 text-gray-400"
                    )}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Duration</label>
              <div className="flex gap-2">
                {durations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-xs transition-all",
                      duration === d
                        ? "bg-purple-500 text-white"
                        : "bg-white/5 text-gray-400"
                    )}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Prompt Input */}
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your cinematic scene..."
            className="w-full h-24 p-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-500 resize-none focus:outline-none focus:border-purple-500/50"
          />
        </div>
      </div>

      {/* Generate Button */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !hasEnoughCredits}
          className={cn(
            "w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all",
            isGenerating || !hasEnoughCredits
              ? "bg-gray-600 text-gray-400"
              : "bg-purple-500 text-white hover:bg-purple-600"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Generate ({currentCost} credits)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
