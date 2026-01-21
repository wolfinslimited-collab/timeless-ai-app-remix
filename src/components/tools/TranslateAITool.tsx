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
  Zap,
  Link2,
  Play,
  Clock,
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
];

interface VideoInfo {
  title: string;
  thumbnail: string;
  channelName: string;
  duration?: string;
}

const TranslateAITool = () => {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("");
  const [voiceType, setVoiceType] = useState<"male" | "female">("male");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
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
      // Use YouTube oEmbed API to get video info
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
      // Fallback: just show thumbnail without title
      setVideoInfo({
        title: "YouTube Video",
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        channelName: "",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  // Debounced URL change handler
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
    setProgress(0);
    setOutputUrl(null);

    // Simulate progress for UX
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 10, 90));
    }, 2000);

    try {
      const response = await supabase.functions.invoke("translate-video", {
        body: {
          youtubeUrl,
          targetLanguage,
          voiceType,
        },
      });

      clearInterval(progressInterval);

      if (response.error) {
        throw new Error(response.error.message || "Translation failed");
      }

      if (response.data?.status === "processing") {
        setProgress(100);
        toast.success("Video is being processed! Check your Library for results.");
        refetch();
      } else if (response.data?.outputUrl) {
        setProgress(100);
        setOutputUrl(response.data.outputUrl);
        toast.success("Translation complete!");
        refetch();
      }
    } catch (error) {
      clearInterval(progressInterval);
      toast.error(error instanceof Error ? error.message : "Translation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const canProcess = youtubeUrl.trim() && targetLanguage.trim() && isValidYoutubeUrl(youtubeUrl);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-xl">
          {/* Card */}
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 md:p-8 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Languages className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground">Translate AI</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{credits ?? 0} cr</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-8">
              Video Translation Engine
            </p>

            {/* Source Video Input */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Video className="h-4 w-4" />
                <span className="uppercase tracking-wide text-xs font-medium">Source Video</span>
              </div>
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="pl-11 h-14 bg-secondary/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                />
                {youtubeUrl && (
                  <button
                    onClick={clearVideo}
                    className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Video Preview */}
              {isLoadingPreview && (
                <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 animate-in fade-in duration-300">
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
                <div className="rounded-xl border border-border/50 bg-secondary/30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex gap-4 p-3">
                    {/* Thumbnail */}
                    <div className="relative w-36 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-secondary">
                      <img
                        src={videoInfo.thumbnail}
                        alt={videoInfo.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to lower quality thumbnail
                          const videoId = extractVideoId(youtubeUrl);
                          if (videoId) {
                            e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                        <div className="h-10 w-10 rounded-full bg-primary/90 flex items-center justify-center">
                          <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0 py-1">
                      <h4 className="font-medium text-sm text-foreground line-clamp-2 leading-tight mb-1">
                        {videoInfo.title}
                      </h4>
                      {videoInfo.channelName && (
                        <p className="text-xs text-muted-foreground truncate">
                          {videoInfo.channelName}
                        </p>
                      )}
                      <a
                        href={youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open on YouTube
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Language & Voice Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Target Language */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span className="uppercase tracking-wide text-xs font-medium">Target Language</span>
                </div>
                <div className="relative">
                  <Input
                    placeholder="Type any language..."
                    value={targetLanguage}
                    onChange={(e) => {
                      setTargetLanguage(e.target.value);
                      setShowLanguageDropdown(true);
                    }}
                    onFocus={() => setShowLanguageDropdown(true)}
                    onBlur={() => setTimeout(() => setShowLanguageDropdown(false), 200)}
                    className="h-12 bg-secondary/30 border-border/50 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                  />
                  {showLanguageDropdown && filteredLanguages.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-xl shadow-lg z-10 max-h-48 overflow-auto">
                      {filteredLanguages.map((lang) => (
                        <button
                          key={lang}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
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

              {/* Audio Voice */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Languages className="h-4 w-4" />
                  <span className="uppercase tracking-wide text-xs font-medium">Audio Voice</span>
                </div>
                <div className="flex rounded-xl overflow-hidden border border-border/50 bg-secondary/30 h-12">
                  <button
                    onClick={() => setVoiceType("male")}
                    className={cn(
                      "flex-1 text-sm font-medium transition-all",
                      voiceType === "male"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    MALE
                  </button>
                  <button
                    onClick={() => setVoiceType("female")}
                    className={cn(
                      "flex-1 text-sm font-medium transition-all",
                      voiceType === "female"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    FEMALE
                  </button>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Processing video...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Process Button */}
            <Button
              onClick={handleProcess}
              disabled={isProcessing || !canProcess || !hasEnoughCreditsForTool(creditCost)}
              className="w-full h-14 text-base font-semibold gap-2 rounded-xl bg-primary hover:bg-primary/90"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing Video...
                </>
              ) : (
                <>
                  ANALYZE VIDEO
                  <Zap className="h-5 w-5" />
                </>
              )}
            </Button>

            {/* Credits info */}
            <p className="text-center text-xs text-muted-foreground mt-4">
              Cost: {creditCost} credits per translation
            </p>
          </div>

          {/* Output Section */}
          {outputUrl && (
            <div className="mt-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-lg font-semibold">Translated Video</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = outputUrl;
                    link.download = `translated-video-${targetLanguage.toLowerCase()}.mp4`;
                    link.target = "_blank";
                    link.click();
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
              <div className="aspect-video rounded-xl overflow-hidden border border-border bg-secondary/50">
                <video
                  src={outputUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslateAITool;
