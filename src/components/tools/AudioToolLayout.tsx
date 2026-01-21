import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Upload, 
  Download, 
  Loader2, 
  Sparkles, 
  X, 
  Music,
  Play,
  Pause
} from "lucide-react";

interface AudioToolLayoutProps {
  title: string;
  description: string;
  toolId: string;
  creditCost: number;
  showPrompt?: boolean;
  promptPlaceholder?: string;
  showAudioUpload?: boolean;
  showDuration?: boolean;
  showTempo?: boolean;
  showPitch?: boolean;
  children?: React.ReactNode;
}

const AudioToolLayout = ({
  title,
  description,
  toolId,
  creditCost,
  showPrompt = false,
  promptPlaceholder = "Describe what you want...",
  showAudioUpload = true,
  showDuration = false,
  showTempo = false,
  showPitch = false,
  children,
}: AudioToolLayoutProps) => {
  const [inputAudio, setInputAudio] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(30);
  const [tempo, setTempo] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isOutputPlaying, setIsOutputPlaying] = useState(false);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const inputAudioRef = useRef<HTMLAudioElement>(null);
  const outputAudioRef = useRef<HTMLAudioElement>(null);
  
  const { credits, refetch, hasActiveSubscription } = useCredits();
  
  const hasEnoughCreditsForTool = (cost: number) => {
    if (hasActiveSubscription) return true;
    if (credits === null) return false;
    return credits >= cost;
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Audio must be under 50MB");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to upload");
      return;
    }

    const fileName = `${session.user.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("generation-inputs")
      .upload(fileName, file);

    if (error) {
      toast.error("Failed to upload audio");
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("generation-inputs")
      .getPublicUrl(data.path);

    setInputAudio(publicUrl);
    toast.success("Audio uploaded");
  };

  const handleProcess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to use this tool");
      return;
    }

    if (!hasEnoughCreditsForTool(creditCost)) {
      toast.error(`Insufficient credits. Need ${creditCost} credits.`);
      return;
    }

    setIsProcessing(true);
    setOutputUrl(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/music-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tool: toolId,
          audioUrl: inputAudio,
          prompt: prompt || undefined,
          duration,
          tempo: showTempo ? tempo : undefined,
          pitch: showPitch ? pitch : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Processing failed");
      }

      if (result.status === 'processing') {
        toast.success("Audio is being processed! Check your Library for results.");
        refetch();
      } else if (result.outputUrl) {
        setOutputUrl(result.outputUrl);
        toast.success("Processing complete!");
        refetch();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleInputPlayback = () => {
    if (inputAudioRef.current) {
      if (isPlaying) {
        inputAudioRef.current.pause();
      } else {
        inputAudioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleOutputPlayback = () => {
    if (outputAudioRef.current) {
      if (isOutputPlaying) {
        outputAudioRef.current.pause();
      } else {
        outputAudioRef.current.play();
      }
      setIsOutputPlaying(!isOutputPlaying);
    }
  };

  const canProcess = showAudioUpload ? inputAudio : (showPrompt ? prompt.trim() : true);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">Cost:</span>
          <span className="text-sm font-medium text-primary">{creditCost} credits</span>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Audio Upload */}
            {showAudioUpload && (
              <div className="space-y-2">
                <Label>Input Audio</Label>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
                {inputAudio ? (
                  <div className="relative p-4 rounded-xl border border-border bg-secondary/50">
                    <div className="flex items-center gap-4">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={toggleInputPlayback}
                        className="h-12 w-12 rounded-full"
                      >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      </Button>
                      <div className="flex-1">
                        <div className="h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <div className="flex items-end gap-1 h-8">
                            {[...Array(20)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-primary rounded-full animate-pulse"
                                style={{
                                  height: `${Math.random() * 100}%`,
                                  animationDelay: `${i * 0.1}s`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <audio
                      ref={inputAudioRef}
                      src={inputAudio}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => setInputAudio(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full h-32 rounded-xl border-2 border-dashed border-border/50 bg-secondary/30 hover:bg-secondary/50 transition-colors flex flex-col items-center justify-center gap-3"
                  >
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Music className="h-7 w-7 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="font-medium">Upload Audio</p>
                      <p className="text-xs text-muted-foreground">MP3, WAV, FLAC - Max 50MB</p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {/* Prompt */}
            {showPrompt && (
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Input
                  placeholder={promptPlaceholder}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
            )}

            {/* Duration */}
            {showDuration && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Duration</Label>
                  <span className="text-sm text-muted-foreground">{duration}s</span>
                </div>
                <Slider
                  value={[duration]}
                  onValueChange={([val]) => setDuration(val)}
                  min={5}
                  max={120}
                  step={5}
                />
              </div>
            )}

            {/* Tempo */}
            {showTempo && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Tempo</Label>
                  <span className="text-sm text-muted-foreground">{(tempo * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[tempo]}
                  onValueChange={([val]) => setTempo(val)}
                  min={0.5}
                  max={2}
                  step={0.05}
                />
              </div>
            )}

            {/* Pitch */}
            {showPitch && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Pitch Shift</Label>
                  <span className="text-sm text-muted-foreground">{pitch > 0 ? '+' : ''}{pitch} semitones</span>
                </div>
                <Slider
                  value={[pitch]}
                  onValueChange={([val]) => setPitch(val)}
                  min={-12}
                  max={12}
                  step={1}
                />
              </div>
            )}

            {/* Custom children (additional controls) */}
            {children}

            {/* Process Button */}
            <Button
              onClick={handleProcess}
              disabled={isProcessing || !canProcess || !hasEnoughCreditsForTool(creditCost)}
              className="w-full gap-2"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Process ({creditCost} credits)
                </>
              )}
            </Button>
          </div>

          {/* Output Section */}
          <div className="space-y-2">
            <Label>Output</Label>
            <div className="h-64 rounded-xl border border-border bg-secondary/50 flex items-center justify-center overflow-hidden">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-sm">Processing audio...</p>
                </div>
              ) : outputUrl ? (
                <div className="w-full p-6">
                  <div className="flex items-center gap-4">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={toggleOutputPlayback}
                      className="h-14 w-14 rounded-full"
                    >
                      {isOutputPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                    </Button>
                    <div className="flex-1">
                      <div className="h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                        <div className="flex items-end gap-1 h-12">
                          {[...Array(30)].map((_, i) => (
                            <div
                              key={i}
                              className="w-1.5 bg-primary rounded-full transition-all"
                              style={{
                                height: isOutputPlaying ? `${Math.random() * 100}%` : '20%',
                                animationDelay: `${i * 0.05}s`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <audio
                    ref={outputAudioRef}
                    src={outputUrl}
                    onEnded={() => setIsOutputPlaying(false)}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Music className="h-12 w-12 opacity-50" />
                  <p className="text-sm">Result will appear here</p>
                </div>
              )}
            </div>

            {/* Download Button */}
            {outputUrl && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = outputUrl;
                  link.download = `${toolId}-output.mp3`;
                  link.target = "_blank";
                  link.click();
                }}
              >
                <Download className="h-4 w-4" />
                Download Audio
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioToolLayout;
