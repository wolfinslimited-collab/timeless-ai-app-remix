import { useState } from "react";
import { 
  ArrowLeft, Music, Wand2, Mic2, Zap, SlidersHorizontal,
  Disc3, Radio, Gauge, Play, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCredits } from "@/hooks/useCredits";

interface MobileAudioCreateProps {
  onBack: () => void;
}

const audioTools = [
  { id: "stems", name: "Stems", description: "Separate audio into stems", icon: Disc3, credits: 8 },
  { id: "remix", name: "Remix", description: "AI-powered remixes", icon: Wand2, credits: 12 },
  { id: "audio-enhance", name: "Enhance", description: "Clean up audio", icon: SlidersHorizontal, credits: 4 },
  { id: "sound-effects", name: "SFX", description: "Generate sound effects", icon: Radio, credits: 5 },
  { id: "vocals", name: "Vocals", description: "Generate AI vocals", icon: Mic2, credits: 15 },
  { id: "mastering", name: "Master", description: "AI mastering", icon: Gauge, credits: 6 },
];

const genres = [
  "Pop", "Electronic", "Hip Hop", "Rock", "Jazz", "Classical", 
  "R&B", "Country", "Ambient", "Lo-Fi"
];

export function MobileAudioCreate({ onBack }: MobileAudioCreateProps) {
  const { credits } = useCredits();
  const [activeTab, setActiveTab] = useState<"create" | "tools">("create");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("30");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    // Simulate generation
    setTimeout(() => {
      setIsGenerating(false);
    }, 3000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-1.5 bg-primary/20 px-3 py-1.5 rounded-full">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary text-xs font-semibold">{credits ?? 0}</span>
          </div>
        </div>

        <h1 className="text-foreground text-2xl font-bold">Music Studio</h1>
        <p className="text-muted-foreground text-sm">Create music, vocals, and audio with AI</p>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3">
        <div className="flex gap-2 p-1 bg-secondary rounded-xl">
          <button
            onClick={() => setActiveTab("create")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === "create"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            Create
          </button>
          <button
            onClick={() => setActiveTab("tools")}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === "tools"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            Tools
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {activeTab === "create" ? (
          <div className="space-y-5">
            {/* Prompt Input */}
            <div>
              <label className="text-foreground text-sm font-medium mb-2 block">
                Describe your music
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Upbeat electronic dance track with synth leads and driving bass..."
                className="w-full h-24 p-4 bg-secondary rounded-xl text-foreground text-sm placeholder:text-muted-foreground resize-none border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Genre Selection */}
            <div>
              <label className="text-foreground text-sm font-medium mb-2 block">
                Genre (optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {genres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      selectedGenre === genre
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground border border-border"
                    )}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-foreground text-sm font-medium mb-2 block">
                Duration
              </label>
              <div className="flex gap-2">
                {["15", "30", "60", "120"].map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                      duration === d
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground border border-border"
                    )}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>

            {/* Instrumental Toggle */}
            <div className="flex items-center justify-between p-4 bg-secondary rounded-xl border border-border">
              <div>
                <p className="text-foreground text-sm font-medium">Instrumental Only</p>
                <p className="text-muted-foreground text-xs">No vocals</p>
              </div>
              <button
                onClick={() => setIsInstrumental(!isInstrumental)}
                className={cn(
                  "w-12 h-7 rounded-full transition-all relative",
                  isInstrumental ? "bg-primary" : "bg-muted"
                )}
              >
                <div className={cn(
                  "w-5 h-5 bg-white rounded-full absolute top-1 transition-all",
                  isInstrumental ? "left-6" : "left-1"
                )} />
              </button>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={cn(
                "w-full py-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
                prompt.trim() && !isGenerating
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Music className="w-4 h-4" />
                  Generate Music • 10 credits
                </>
              )}
            </button>
          </div>
        ) : (
          /* Tools Grid */
          <div className="grid grid-cols-2 gap-3">
            {audioTools.map(tool => (
              <button
                key={tool.id}
                className="flex flex-col p-4 bg-card rounded-xl border border-border text-left hover:bg-card/80 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
                  <tool.icon className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="text-foreground text-sm font-semibold">{tool.name}</h3>
                <p className="text-muted-foreground text-xs mt-0.5">{tool.description}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Zap className="w-3 h-3 text-primary" />
                  <span className="text-primary text-xs font-medium">{tool.credits} credits</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
