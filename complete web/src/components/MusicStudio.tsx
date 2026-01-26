import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import {
  Music,
  Music2,
  Sparkles,
  Loader2,
  Download,
  RotateCcw,
  AlertCircle,
  Play,
  Pause,
  Share2,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Wand2,
  ChevronDown,
  ChevronRight,
  Coins,
  Zap,
  Star,
  Clock,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Plus,
  X,
  Maximize2,
  SlidersHorizontal,
  Mic,
  User,
  Lightbulb,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AddCreditsDialog from "@/components/AddCreditsDialog";
import ModelSelectorModal from "@/components/ModelSelectorModal";
import { useCredits } from "@/hooks/useCredits";
import { useRecentModels } from "@/hooks/useRecentModels";

// Model types
type ModelTier = "economy" | "hq";
type ModelProvider = "kie" | "fal" | "lovable";

interface BaseModel {
  id: string;
  name: string;
  description: string;
  badge: string;
  credits: number;
  provider: ModelProvider;
  tier: ModelTier;
}

// Music Models (Kie.ai only)
const musicModels: BaseModel[] = [
  { id: "kie-music-v4", name: "Suno V4", description: "Latest Suno music", badge: "TOP", credits: 5, provider: "kie", tier: "economy" },
  { id: "kie-music-v3.5", name: "Suno V3.5", description: "Stable music gen", badge: "FAST", credits: 4, provider: "kie", tier: "economy" },
];

// Style presets for music
const stylePresets = [
  "overdrive", "drunk", "chitarra acustica", "hybrid", "hall",
  "pop", "rock", "jazz", "electronic", "classical", "hip-hop", 
  "r&b", "country", "indie", "metal", "funk", "soul", "blues"
];

interface PendingGeneration {
  id: string;
  prompt: string;
  model: string;
  status: string;
  created_at: string;
}

interface MusicStudioProps {
  prompt: string;
  setPrompt: (value: string) => void;
  lyrics: string;
  setLyrics: (value: string) => void;
  isInstrumental: boolean;
  setIsInstrumental: (value: boolean) => void;
  vocalGender: "male" | "female";
  setVocalGender: (value: "male" | "female") => void;
  duration: number;
  setDuration: (value: number) => void;
  weirdness: number;
  setWeirdness: (value: number) => void;
  styleInfluence: number;
  setStyleInfluence: (value: number) => void;
  isGenerating: boolean;
  generationError: string | null;
  result: { output_url?: string } | null;
  currentCost: number;
  hasEnoughCredits: boolean;
  user: any;
  onGenerate: () => void;
  model: string;
  setModel: (value: string) => void;
  refreshTrigger?: number;
  songTitle: string;
  setSongTitle: (value: string) => void;
}

const MusicStudio = ({
  prompt,
  setPrompt,
  lyrics,
  setLyrics,
  isInstrumental,
  setIsInstrumental,
  vocalGender,
  setVocalGender,
  duration,
  setDuration,
  weirdness,
  setWeirdness,
  styleInfluence,
  setStyleInfluence,
  isGenerating,
  generationError,
  result,
  currentCost,
  hasEnoughCredits,
  user,
  onGenerate,
  model,
  setModel,
  refreshTrigger,
  songTitle,
  setSongTitle,
}: MusicStudioProps) => {
  const { credits } = useCredits();
  const { getRecentModelIds, trackModelUsage } = useRecentModels();
  const recentMusicModels = getRecentModelIds("music");
  
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [customStyleInput, setCustomStyleInput] = useState("");
  
  // Library state
  const [previousGenerations, setPreviousGenerations] = useState<Array<{
    id: string;
    output_url: string | null;
    prompt: string;
    created_at: string;
    model: string | null;
    title: string | null;
  }>>([]);
  const [pendingGenerations, setPendingGenerations] = useState<PendingGeneration[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  const [selectedGeneration, setSelectedGeneration] = useState<{
    id: string;
    output_url: string | null;
    prompt: string;
    created_at: string;
    model: string | null;
    title: string | null;
  } | null>(null);
  
  // Player state
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle generate with credit check
  const handleGenerateClick = () => {
    if (user && !hasEnoughCredits) {
      setShowAddCreditsDialog(true);
      return;
    }
    
    // Build the full prompt with styles
    let fullPrompt = prompt;
    if (selectedStyles.length > 0) {
      fullPrompt += ` Style: ${selectedStyles.join(", ")}`;
    }
    
    onGenerate();
  };

  // Fetch music generations (completed and pending)
  useEffect(() => {
    const fetchGenerations = async () => {
      if (!user) {
        setLoadingGenerations(false);
        return;
      }

      try {
        // Fetch completed generations
        const { data: completedData, error: completedError } = await supabase
          .from("generations")
          .select("id, output_url, prompt, created_at, model, title")
          .eq("user_id", user.id)
          .eq("type", "music")
          .eq("status", "completed")
          .not("output_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(50);

        if (completedError) throw completedError;
        setPreviousGenerations(completedData || []);

        // Fetch pending/processing generations
        const { data: pendingData, error: pendingError } = await supabase
          .from("generations")
          .select("id, prompt, model, status, created_at")
          .eq("user_id", user.id)
          .eq("type", "music")
          .in("status", ["pending", "processing"])
          .order("created_at", { ascending: false });

        if (pendingError) throw pendingError;
        setPendingGenerations(pendingData || []);
      } catch (err) {
        console.error("Error fetching generations:", err);
      } finally {
        setLoadingGenerations(false);
      }
    };

    fetchGenerations();
  }, [user, result, refreshTrigger]);

  const getCurrentModel = () => musicModels.find(m => m.id === model);

  const handleDownload = (url: string, title?: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "music"}.mp3`;
    link.target = "_blank";
    link.click();
  };

  const handleShare = async (url: string, promptText: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out my music!",
          text: promptText,
          url: url,
        });
      } catch (err) {
        navigator.clipboard.writeText(url);
      }
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleRecreate = (promptText: string) => {
    setPrompt(promptText);
    setSelectedGeneration(null);
  };

  const handleCancelGeneration = async (generationId: string) => {
    try {
      // Update the generation status to failed and refund credits
      const { data: gen } = await supabase
        .from("generations")
        .select("credits_used")
        .eq("id", generationId)
        .single();

      // Mark as failed
      await supabase
        .from("generations")
        .update({ status: "failed" })
        .eq("id", generationId);

      // Refund credits if user doesn't have active subscription
      if (gen?.credits_used && user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("credits, subscription_status")
          .eq("user_id", user.id)
          .single();

        if (profile && profile.subscription_status !== "active") {
          await supabase
            .from("profiles")
            .update({ credits: profile.credits + gen.credits_used })
            .eq("user_id", user.id);
        }
      }

      // Remove from pending list
      setPendingGenerations(prev => prev.filter(g => g.id !== generationId));
    } catch (err) {
      console.error("Error cancelling generation:", err);
    }
  };

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter(s => s !== style));
    } else if (selectedStyles.length < 5) {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const playTrack = (url: string) => {
    if (currentlyPlaying === url && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setCurrentlyPlaying(url);
        setIsPlaying(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setAudioProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Left Sidebar - Creation Panel */}
      <div className="w-80 border-r border-border/50 flex flex-col bg-card/30">

        <ScrollArea className="flex-1">
          <div className="space-y-0">
            {/* Lyrics Section - Collapsible */}
            <Collapsible defaultOpen className="border-b border-border/50">
              <div className="bg-secondary/20 p-4">
                <div className="flex items-center justify-between mb-4">
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground">
                    <ChevronDown className="h-4 w-4" />
                    Lyrics
                  </CollapsibleTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full bg-secondary/50 hover:bg-secondary"
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </div>
                <CollapsibleContent>
                  <div className="relative">
                    <Textarea
                      placeholder="Write some lyrics or a prompt — or leave blank for instrumental"
                      value={isInstrumental ? prompt : lyrics || prompt}
                      onChange={(e) => isInstrumental ? setPrompt(e.target.value) : (lyrics ? setLyrics(e.target.value) : setPrompt(e.target.value))}
                      className="min-h-[120px] bg-transparent border-0 resize-none text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 p-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-secondary/50 hover:bg-secondary"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Styles Section - Collapsible */}
            <Collapsible defaultOpen className="border-b border-border/50">
              <div className="bg-secondary/20 p-4">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground mb-3">
                  <ChevronDown className="h-4 w-4" />
                  Styles
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedStyles.length > 0 ? selectedStyles.join(", ") : "Select up to 5 styles or type your own"}
                  </p>
                  
                  {/* Custom style input */}
                  <div className="flex items-center gap-2 mb-4">
                    <Input
                      placeholder="Type a custom style..."
                      value={customStyleInput}
                      onChange={(e) => setCustomStyleInput(e.target.value.slice(0, 50))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customStyleInput.trim() && selectedStyles.length < 5) {
                          const newStyle = customStyleInput.trim().toLowerCase();
                          if (!selectedStyles.includes(newStyle)) {
                            setSelectedStyles([...selectedStyles, newStyle]);
                          }
                          setCustomStyleInput("");
                        }
                      }}
                      className="bg-secondary/50 border-border/50 rounded-full text-sm h-9"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (customStyleInput.trim() && selectedStyles.length < 5) {
                          const newStyle = customStyleInput.trim().toLowerCase();
                          if (!selectedStyles.includes(newStyle)) {
                            setSelectedStyles([...selectedStyles, newStyle]);
                          }
                          setCustomStyleInput("");
                        }
                      }}
                      disabled={!customStyleInput.trim() || selectedStyles.length >= 5}
                      className="h-9 px-3 rounded-full border-border/50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
                    {stylePresets.slice(0, 8).map((style) => (
                      <Button
                        key={style}
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStyle(style)}
                        className={cn(
                          "h-9 px-4 text-sm rounded-full",
                          selectedStyles.includes(style) 
                            ? "bg-secondary border-primary/50 text-foreground" 
                            : "bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                        )}
                      >
                        {!selectedStyles.includes(style) && <Plus className="h-3 w-3 mr-1" />}
                        {style}
                      </Button>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Advanced Options - Collapsible */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="border-b border-border/50">
              <div className="bg-secondary/20 p-4">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground w-full">
                  <ChevronRight className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-90")} />
                  Advanced Options
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {/* Vocal Gender */}
                  {!isInstrumental && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Vocal Gender</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={vocalGender === "male" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVocalGender("male")}
                          className={cn(
                            "flex-1 rounded-full",
                            vocalGender === "male" ? "gradient-primary" : "border-border/50"
                          )}
                        >
                          Male
                        </Button>
                        <Button
                          variant={vocalGender === "female" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVocalGender("female")}
                          className={cn(
                            "flex-1 rounded-full",
                            vocalGender === "female" ? "gradient-primary" : "border-border/50"
                          )}
                        >
                          Female
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Duration */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Duration</Label>
                      <span className="text-xs text-muted-foreground">{duration}s</span>
                    </div>
                    <Slider
                      value={[duration]}
                      onValueChange={([val]) => setDuration(val)}
                      min={15}
                      max={120}
                      step={15}
                      className="w-full"
                    />
                  </div>

                  {/* Weirdness */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Weirdness</Label>
                      <span className="text-xs text-muted-foreground">{weirdness}%</span>
                    </div>
                    <Slider
                      value={[weirdness]}
                      onValueChange={([val]) => setWeirdness(val)}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Style Influence */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Style Influence</Label>
                      <span className="text-xs text-muted-foreground">{styleInfluence}%</span>
                    </div>
                    <Slider
                      value={[styleInfluence]}
                      onValueChange={([val]) => setStyleInfluence(val)}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Model Selector */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Model</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-secondary/50 border-border/50 rounded-full"
                      onClick={() => setModelModalOpen(true)}
                    >
                      <div className="flex items-center gap-2">
                        {(() => {
                          const currentModel = getCurrentModel();
                          if (!currentModel) return null;
                          const isTop = currentModel.badge === "TOP";
                          const isEconomy = currentModel.tier === "economy";
                          return (
                            <>
                              {isTop ? (
                                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                              ) : isEconomy ? (
                                <Coins className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <Zap className="h-4 w-4 text-primary" />
                              )}
                              <span className="text-sm">{currentModel.name}</span>
                            </>
                          );
                        })()}
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Song Title */}
            <div className="bg-secondary/20 p-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <Music2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Song Title (Optional)"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  className="bg-transparent border-0 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 h-auto p-0"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Create Button */}
        <div className="p-4 border-t border-border/50">
          <Button
            onClick={handleGenerateClick}
            disabled={isGenerating || pendingGenerations.length > 0 || (!prompt.trim() && !lyrics.trim())}
            className="w-full h-12 gap-2 gradient-primary text-white font-medium rounded-full"
          >
            {isGenerating || pendingGenerations.length > 0 ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {pendingGenerations.length > 0 ? `Creating (${pendingGenerations.length})...` : "Creating..."}
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Create
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/20 text-white border-0 ml-1">
                  {currentCost}
                </Badge>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right Panel - Library */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">My Library</h2>
            <Badge variant="outline" className="text-xs">
              {previousGenerations.length} tracks
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1 border-border/50">
              <Clock className="h-3.5 w-3.5" />
              Newest
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Track List */}
        <ScrollArea className="flex-1 p-4">
          {loadingGenerations ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 animate-pulse">
                  <div className="h-16 w-16 rounded-lg bg-secondary/50" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 rounded bg-secondary/50" />
                    <div className="h-3 w-2/3 rounded bg-secondary/50" />
                  </div>
                </div>
              ))}
            </div>
          ) : (pendingGenerations.length > 0 || previousGenerations.length > 0) ? (
            <div className="space-y-2">
              {/* Pending/Processing Generations */}
              {pendingGenerations.map((gen) => {
                const createdAt = new Date(gen.created_at).getTime();
                const elapsed = Date.now() - createdAt;
                const elapsedSeconds = Math.floor(elapsed / 1000);
                const elapsedMinutes = Math.floor(elapsedSeconds / 60);
                const remainingSeconds = elapsedSeconds % 60;
                
                return (
                  <div
                    key={gen.id}
                    className="group flex items-center gap-4 p-3 rounded-xl bg-primary/5 border border-primary/20"
                  >
                    {/* Loader animation */}
                    <div className="relative h-16 w-16 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent animate-pulse" />
                    </div>

                    {/* Track info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm truncate text-primary">
                          Creating...
                        </h3>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                          {musicModels.find(m => m.id === gen.model)?.name || "AI"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {gen.prompt}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {elapsedMinutes}:{remainingSeconds.toString().padStart(2, '0')} elapsed
                      </p>
                    </div>

                    {/* Cancel button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleCancelGeneration(gen.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cancel & refund credits</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                );
              })}

              {/* Completed Generations */}
              {previousGenerations.map((gen) => (
                <div
                  key={gen.id}
                  className={cn(
                    "group flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-secondary/50",
                    currentlyPlaying === gen.output_url && "bg-primary/10"
                  )}
                >
                  {/* Album art / Play button */}
                  <button
                    onClick={() => gen.output_url && playTrack(gen.output_url)}
                    className="relative h-16 w-16 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center overflow-hidden group/play"
                  >
                    <Music className="h-6 w-6 text-primary opacity-50" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/play:opacity-100 transition-opacity flex items-center justify-center">
                      {currentlyPlaying === gen.output_url && isPlaying ? (
                        <Pause className="h-6 w-6 text-white" />
                      ) : (
                        <Play className="h-6 w-6 text-white fill-white" />
                      )}
                    </div>
                    {/* Duration badge */}
                    <Badge className="absolute bottom-1 right-1 text-[10px] px-1 py-0 bg-black/60 text-white border-0">
                      {formatTime(duration)}
                    </Badge>
                  </button>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate">
                        {gen.title || `Track ${new Date(gen.created_at).toLocaleDateString()}`}
                      </h3>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {musicModels.find(m => m.id === gen.model)?.name || "AI"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {gen.prompt}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Like</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Dislike</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => gen.output_url && handleShare(gen.output_url, gen.prompt)}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Share</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => gen.output_url && handleDownload(gen.output_url, gen.title || undefined)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRecreate(gen.prompt)}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Recreate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Music className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No tracks yet</p>
              <p className="text-xs mt-1">Create your first track using the panel on the left</p>
            </div>
          )}
        </ScrollArea>

        {/* Bottom Player */}
        {currentlyPlaying && (
          <div className="p-4 border-t border-border/50 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              {/* Track info */}
              <div className="flex items-center gap-3 min-w-0 w-48">
                <div className="h-10 w-10 rounded bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
                  <Music className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">Now Playing</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {previousGenerations.find(g => g.output_url === currentlyPlaying)?.prompt.substring(0, 30)}...
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Shuffle className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-10 w-10 rounded-full gradient-primary"
                    onClick={() => {
                      if (isPlaying) {
                        audioRef.current?.pause();
                        setIsPlaying(false);
                      } else {
                        audioRef.current?.play();
                        setIsPlaying(true);
                      }
                    }}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 text-white" />
                    ) : (
                      <Play className="h-5 w-5 text-white fill-white" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Repeat className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Progress bar */}
                <div className="flex items-center gap-2 w-full max-w-md">
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {formatTime(audioProgress)}
                  </span>
                  <Slider
                    value={[audioProgress]}
                    max={audioDuration || 100}
                    step={1}
                    className="flex-1"
                    onValueChange={([val]) => {
                      if (audioRef.current) {
                        audioRef.current.currentTime = val;
                      }
                    }}
                  />
                  <span className="text-xs text-muted-foreground w-10">
                    {formatTime(audioDuration)}
                  </span>
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-2 w-32">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <Slider
                  defaultValue={[80]}
                  max={100}
                  step={1}
                  className="flex-1"
                  onValueChange={([val]) => {
                    if (audioRef.current) {
                      audioRef.current.volume = val / 100;
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generating Overlay */}
      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-30">
          <div className="flex flex-col items-center gap-4 text-center p-6">
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
              <Music className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="font-medium">Creating your track...</p>
              <p className="text-sm text-muted-foreground mt-1">This may take a minute</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {generationError && !isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-30">
          <div className="flex flex-col items-center gap-4 text-center p-6 max-w-md">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <p className="font-medium text-destructive">Generation failed</p>
              <p className="text-sm text-muted-foreground mt-1">{generationError}</p>
            </div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Model Selector Modal */}
      <ModelSelectorModal
        open={modelModalOpen}
        onOpenChange={setModelModalOpen}
        models={musicModels}
        selectedModel={model}
        onSelectModel={(id) => {
          setModel(id);
          trackModelUsage(id, "music");
        }}
        type="music"
        recentModelIds={recentMusicModels}
      />

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        open={showAddCreditsDialog}
        onOpenChange={setShowAddCreditsDialog}
        requiredCredits={currentCost}
      />
    </div>
  );
};

export default MusicStudio;
