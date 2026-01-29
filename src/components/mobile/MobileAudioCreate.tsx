import { useState, useEffect } from "react";
import { 
  ArrowLeft, Music, Wand2, Mic2, Zap, SlidersHorizontal,
  Disc3, Radio, Gauge, Play, Pause, ChevronDown, ChevronUp, Plus, X, Sparkles, Info, Timer, Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCredits } from "@/hooks/useCredits";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddCreditsDialog from "@/components/AddCreditsDialog";
import { ToolSelector, type ToolItem } from "./ToolSelector";

interface MobileAudioCreateProps {
  onBack: () => void;
  initialTool?: string;
}

const TOOLS: ToolItem[] = [
  { id: "generate", name: "Generate", description: "Create music from text prompts", icon: Music, credits: 5, isGenerate: true },
  { id: "stems", name: "Stems", description: "Separate audio into stems", icon: Disc3, credits: 8 },
  { id: "remix", name: "Remix", description: "AI-powered remixes", icon: Wand2, credits: 12 },
  { id: "audio-enhance", name: "Enhance", description: "Clean up audio", icon: SlidersHorizontal, credits: 4 },
  { id: "sound-effects", name: "SFX", description: "Generate sound effects", icon: Radio, credits: 5 },
  { id: "vocals", name: "Vocals", description: "Generate AI vocals", icon: Mic2, credits: 15 },
  { id: "mastering", name: "Master", description: "AI mastering", icon: Gauge, credits: 6 },
  { id: "tempo-pitch", name: "Tempo", description: "Adjust speed and pitch", icon: Timer, credits: 3 },
];

const musicModels = [
  { id: "kie-music-v4", name: "Suno V4", credits: 5, badge: "TOP" },
  { id: "kie-music-v3.5", name: "Suno V3.5", credits: 4, badge: "FAST" },
];

const styleOptions = [
  "overdrive", "drunk", "chitarra acustica", "hybrid", "hall",
  "pop", "rock", "jazz", "electronic", "ambient",
  "cinematic", "lofi", "trap", "classical", "reggae", "hip-hop", "r&b"
];

interface Track {
  id: string;
  title?: string;
  prompt: string;
  output_url?: string;
  status: string;
  created_at: string;
}

export function MobileAudioCreate({ onBack, initialTool = "generate" }: MobileAudioCreateProps) {
  const { credits, refetch } = useCredits();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedToolId, setSelectedToolId] = useState(initialTool);
  const [selectedModel, setSelectedModel] = useState("kie-music-v4");
  const [lyrics, setLyrics] = useState("");
  const [title, setTitle] = useState("");
  const [customStyle, setCustomStyle] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<Set<string>>(new Set());
  const [stylesExpanded, setStylesExpanded] = useState(true);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [vocalGender, setVocalGender] = useState<"male" | "female">("female");
  const [duration, setDuration] = useState(30);
  const [weirdness, setWeirdness] = useState(50);
  const [styleInfluence, setStyleInfluence] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  
  // Library tracks
  const [libraryTracks, setLibraryTracks] = useState<Track[]>([]);
  const [pendingTracks, setPendingTracks] = useState<Track[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);
  
  // Audio player state
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const selectedTool = TOOLS.find(t => t.id === selectedToolId) || TOOLS[0];
  const selectedModelData = musicModels.find(m => m.id === selectedModel) || musicModels[0];

  const handleToolSelected = (tool: ToolItem) => {
    setSelectedToolId(tool.id);
  };

  useEffect(() => {
    loadTracks();
  }, [user]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const loadTracks = async () => {
    if (!user) {
      setIsLoadingTracks(false);
      return;
    }

    try {
      const { data: completed } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "music")
        .eq("status", "completed")
        .not("output_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: pending } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "music")
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false });

      setLibraryTracks((completed || []) as Track[]);
      setPendingTracks((pending || []) as Track[]);
    } catch (e) {
      console.error("Error loading tracks:", e);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const toggleStyle = (style: string) => {
    const newStyles = new Set(selectedStyles);
    if (newStyles.has(style)) {
      newStyles.delete(style);
    } else if (newStyles.size < 5) {
      newStyles.add(style);
    } else {
      toast({ title: "Maximum 5 styles allowed", variant: "destructive" });
    }
    setSelectedStyles(newStyles);
  };

  const addCustomStyle = () => {
    const style = customStyle.trim();
    if (style && selectedStyles.size < 5) {
      const newStyles = new Set(selectedStyles);
      newStyles.add(style);
      setSelectedStyles(newStyles);
      setCustomStyle("");
    }
  };

  const removeStyle = (style: string) => {
    const newStyles = new Set(selectedStyles);
    newStyles.delete(style);
    setSelectedStyles(newStyles);
  };

  const playTrack = (url: string) => {
    if (currentPlayingUrl === url && isPlaying) {
      audioElement?.pause();
      setIsPlaying(false);
    } else {
      if (audioElement) {
        audioElement.pause();
      }
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentPlayingUrl(null);
      };
      setAudioElement(audio);
      setCurrentPlayingUrl(url);
      setIsPlaying(true);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      toast({ title: "Please sign in to generate music", variant: "destructive" });
      return;
    }

    const modelCredits = selectedModelData?.credits ?? 5;
    if ((credits ?? 0) < modelCredits) {
      setShowAddCreditsDialog(true);
      return;
    }

    setIsGenerating(true);

    try {
      const prompt = [
        lyrics || "Create an instrumental track",
        selectedStyles.size > 0 ? `Style: ${Array.from(selectedStyles).join(", ")}` : ""
      ].filter(Boolean).join("\n\n");

      const { data, error } = await supabase.functions.invoke("generate", {
        body: {
          prompt,
          type: "music",
          model: selectedModel,
          duration,
          lyrics,
          instrumental: isInstrumental,
          vocalGender,
          weirdness,
          styleInfluence,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "🎵 Music is being generated!", description: "Check the library for results." });
      loadTracks();
      refetch();
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
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
          <span className="text-primary text-xs font-semibold">{credits ?? 0}</span>
        </div>
      </div>

      {/* Tool Selector */}
      <ToolSelector
        tools={TOOLS}
        selectedToolId={selectedToolId}
        onToolSelected={handleToolSelected}
      />
      <div className="h-px bg-border" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="pb-24">
          {/* My Library Section */}
          {isLoadingTracks ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (pendingTracks.length > 0 || libraryTracks.length > 0) ? (
            <div className="mb-4">
              <div className="px-4 py-2 flex items-center gap-2">
                <span className="text-foreground font-semibold">My Library</span>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                  {libraryTracks.length} tracks
                </span>
              </div>

              {/* Pending tracks */}
              {pendingTracks.map(track => (
                <div key={track.id} className="mx-4 mb-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-primary font-medium text-sm">Creating...</p>
                      <p className="text-muted-foreground text-xs truncate">{track.prompt}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Completed tracks carousel */}
              <div className="overflow-x-auto">
                <div className="flex gap-3 px-4 py-2" style={{ width: "max-content" }}>
                  {libraryTracks.slice(0, 10).map(track => {
                    const isCurrentTrack = currentPlayingUrl === track.output_url;
                    const isTrackPlaying = isCurrentTrack && isPlaying;
                    
                    return (
                      <button
                        key={track.id}
                        onClick={() => track.output_url && playTrack(track.output_url)}
                        className="w-32 flex-shrink-0"
                      >
                        <div className={cn(
                          "h-28 rounded-xl flex items-center justify-center relative",
                          isCurrentTrack 
                            ? "bg-gradient-to-br from-primary to-purple-500" 
                            : "bg-gradient-to-br from-primary/30 to-primary/10"
                        )}>
                          <Music className="w-8 h-8 text-white/50" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
                              {isTrackPlaying ? (
                                <Pause className="w-4 h-4 text-white" />
                              ) : (
                                <Play className="w-4 h-4 text-white ml-0.5" />
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-foreground text-xs font-medium mt-2 truncate">
                          {track.title || "AI Track"}
                        </p>
                        <p className="text-muted-foreground text-[10px] truncate">AI Generated</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="h-px bg-border mx-4 mt-2" />
            </div>
          ) : null}

          {/* Generation Form */}
          <div className="px-4 space-y-5">
            {/* Model Selector */}
            <div>
              <label className="text-foreground text-sm font-semibold mb-3 block">Model</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {musicModels.map(model => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={cn(
                      "flex-shrink-0 px-4 py-3 rounded-xl border transition-all",
                      selectedModel === model.id
                        ? "bg-primary/10 border-primary"
                        : "bg-card border-border"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-semibold text-sm",
                        selectedModel === model.id ? "text-primary" : "text-foreground"
                      )}>
                        {model.name}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent text-white">
                        {model.badge}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">{model.credits} credits</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Lyrics / Prompt */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-foreground text-sm font-semibold">Lyrics / Prompt</label>
                <button className="text-muted-foreground hover:text-primary">
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Write some lyrics or a prompt — or leave blank for instrumental..."
                className="w-full h-28 p-4 bg-card rounded-xl text-foreground text-sm placeholder:text-muted-foreground resize-none border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Styles Section */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setStylesExpanded(!stylesExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-card"
              >
                <div>
                  <span className="text-foreground font-semibold text-sm">Styles</span>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {selectedStyles.size === 0 ? "Select up to 5 styles" : Array.from(selectedStyles).join(", ")}
                  </p>
                </div>
                {stylesExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              
              {stylesExpanded && (
                <div className="px-4 pb-4 pt-2 bg-card/50">
                  {/* Custom style input */}
                  <div className="flex gap-2 mb-4">
                    <input
                      value={customStyle}
                      onChange={(e) => setCustomStyle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomStyle()}
                      placeholder="Type a custom style..."
                      className="flex-1 px-4 py-2.5 bg-card rounded-full text-foreground text-sm placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      onClick={addCustomStyle}
                      className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Style chips */}
                  <div className="flex flex-wrap gap-2">
                    {/* Selected styles first */}
                    {Array.from(selectedStyles).map(style => (
                      <button
                        key={style}
                        onClick={() => removeStyle(style)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground flex items-center gap-1"
                      >
                        {style}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                    {/* Available styles */}
                    {styleOptions.filter(s => !selectedStyles.has(s)).map(style => (
                      <button
                        key={style}
                        onClick={() => toggleStyle(style)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border"
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={cn(
                "w-full py-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2",
                !isGenerating
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
                  <Sparkles className="w-4 h-4" />
                  Create Music
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {selectedModelData.credits}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        open={showAddCreditsDialog}
        onOpenChange={setShowAddCreditsDialog}
        currentCredits={credits ?? 0}
        requiredCredits={selectedModelData?.credits ?? 5}
      />
    </div>
  );
}
