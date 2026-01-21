import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Download, 
  Loader2, 
  Sparkles, 
  Globe, 
  Video,
  Languages,
  Link2,
  Play,
  X,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const POPULAR_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Russian",
  "Japanese",
  "Korean",
  "Chinese",
  "Arabic",
  "Hindi",
  "Farsi",
  "Turkish",
];

interface VideoInfo {
  title: string;
  thumbnail: string;
  channelName: string;
}

const TranslateAITool = () => {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [voiceType, setVoiceType] = useState<"male" | "female">("male");
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  const { credits, refetch, hasActiveSubscription } = useCredits();
  const creditCost = 25;

  const hasEnoughCreditsForTool = (cost: number) => {
    if (hasActiveSubscription) return true;
    if (credits === null) return false;
    return credits >= cost;
  };

  const isValidYoutubeUrl = (url: string) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/;
    return pattern.test(url);
  };

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\s?]+)/,
      /youtube\.com\/embed\/([^&\s?]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const fetchVideoInfo = useCallback(async (url: string) => {
    if (!isValidYoutubeUrl(url)) {
      setVideoInfo(null);
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      setVideoInfo(null);
      return;
    }

    setIsLoadingPreview(true);

    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch video info");
      }

      const data = await response.json();

      setVideoInfo({
        title: data.title,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        channelName: data.author_name,
      });
    } catch (error) {
      console.error("Error fetching video info:", error);
      setVideoInfo({
        title: "YouTube Video",
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        channelName: "",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (youtubeUrl.trim()) {
        fetchVideoInfo(youtubeUrl);
      } else {
        setVideoInfo(null);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [youtubeUrl, fetchVideoInfo]);

  const clearVideo = () => {
    setYoutubeUrl("");
    setVideoInfo(null);
  };

  const filteredLanguages = POPULAR_LANGUAGES.filter((lang) =>
    lang.toLowerCase().includes(targetLanguage.toLowerCase())
  );

  const handleProcess = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }

    if (!isValidYoutubeUrl(youtubeUrl)) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }

    if (!targetLanguage.trim()) {
      toast.error("Please enter a target language");
      return;
    }

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
      const response = await supabase.functions.invoke("translate-video", {
        body: {
          youtubeUrl,
          targetLanguage,
          voiceType,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Translation failed");
      }

      if (response.data?.status === "processing") {
        toast.success("Video is being processed! Check your Library for results.");
        refetch();
      } else if (response.data?.outputUrl) {
        setOutputUrl(response.data.outputUrl);
        toast.success("Translation complete!");
        refetch();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Translation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const canProcess = youtubeUrl.trim() && targetLanguage.trim() && isValidYoutubeUrl(youtubeUrl);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Languages className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Translate AI</h1>
          <p className="text-muted-foreground text-sm">Translate YouTube video audio to any language</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Cost:</span>
            <span className="text-sm font-medium text-primary">{creditCost} credits</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* Input Section */}
          <div className="space-y-6">
            {/* YouTube URL Input */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                YouTube URL
              </Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="pl-10 bg-secondary/50"
                />
                {youtubeUrl && (
                  <button
                    onClick={clearVideo}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Video Preview */}
              {isLoadingPreview && (
                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-32 h-20 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </div>
              )}

              {videoInfo && !isLoadingPreview && (
                <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
                  <div className="flex gap-4 p-3">
                    <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-secondary">
                      <img
                        src={videoInfo.thumbnail}
                        alt={videoInfo.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const videoId = extractVideoId(youtubeUrl);
                          if (videoId) {
                            e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="h-8 w-8 rounded-full bg-primary/90 flex items-center justify-center">
                          <Play className="h-4 w-4 text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-tight">
                        {videoInfo.title}
                      </h4>
                      {videoInfo.channelName && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {videoInfo.channelName}
                        </p>
                      )}
                      <a
                        href={youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open on YouTube
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {!videoInfo && !isLoadingPreview && !youtubeUrl && (
                <div className="aspect-video rounded-xl border-2 border-dashed border-border/50 bg-secondary/30 flex flex-col items-center justify-center gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Video className="h-7 w-7 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground">Paste YouTube URL</p>
                    <p className="text-xs text-muted-foreground">Supports videos and shorts</p>
                  </div>
                </div>
              )}
            </div>

            {/* Target Language */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Target Language
              </Label>
              <div className="relative">
                <Input
                  placeholder="Type or select a language..."
                  value={targetLanguage}
                  onChange={(e) => {
                    setTargetLanguage(e.target.value);
                    setShowLanguageDropdown(true);
                  }}
                  onFocus={() => setShowLanguageDropdown(true)}
                  onBlur={() => setTimeout(() => setShowLanguageDropdown(false), 200)}
                  className="bg-secondary/50"
                />
                {showLanguageDropdown && filteredLanguages.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-48 overflow-auto">
                    {filteredLanguages.map((lang) => (
                      <button
                        key={lang}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        onMouseDown={() => {
                          setTargetLanguage(lang);
                          setShowLanguageDropdown(false);
                        }}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Voice Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                Voice Type
              </Label>
              <div className="flex gap-3">
                <button
                  onClick={() => setVoiceType("male")}
                  className={cn(
                    "flex-1 h-11 rounded-xl border text-sm font-medium transition-all",
                    voiceType === "male"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  Male Voice
                </button>
                <button
                  onClick={() => setVoiceType("female")}
                  className={cn(
                    "flex-1 h-11 rounded-xl border text-sm font-medium transition-all",
                    voiceType === "female"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  Female Voice
                </button>
              </div>
            </div>

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
                  Translate ({creditCost} credits)
                </>
              )}
            </Button>
          </div>

          {/* Output Section */}
          <div className="space-y-4">
            <Label>Output</Label>
            
            {/* Original Video Preview in Output */}
            {videoInfo && (
              <div className="rounded-xl border border-border bg-secondary/50 overflow-hidden">
                <div className="flex gap-4 p-3">
                  <div className="relative w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-secondary">
                    <img
                      src={videoInfo.thumbnail}
                      alt={videoInfo.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h4 className="font-medium text-xs text-foreground line-clamp-2 leading-tight">
                      {videoInfo.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {videoInfo.channelName}
                    </p>
                  </div>
                </div>
                <div className="border-t border-border px-3 py-2 flex gap-2">
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open on YouTube
                    </Button>
                  </a>
                  <a
                    href={`https://www.y2mate.com/youtube/${extractVideoId(youtubeUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Download className="h-3.5 w-3.5" />
                      Download Original
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {/* Translated Output */}
            <div className="aspect-video rounded-xl border border-border bg-secondary/50 flex items-center justify-center overflow-hidden">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    <Sparkles className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-sm">Translating video...</p>
                </div>
              ) : outputUrl ? (
                <video
                  src={outputUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Video className="h-12 w-12 opacity-50" />
                  <p className="text-sm">Translated video will appear here</p>
                </div>
              )}
            </div>

            {/* Download Translated Video Button */}
            {outputUrl && (
              <Button
                variant="default"
                className="w-full gap-2"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = outputUrl;
                  link.download = `translated-video-${targetLanguage.toLowerCase()}.mp4`;
                  link.target = "_blank";
                  link.click();
                }}
              >
                <Download className="h-4 w-4" />
                Download Translated Video
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslateAITool;
