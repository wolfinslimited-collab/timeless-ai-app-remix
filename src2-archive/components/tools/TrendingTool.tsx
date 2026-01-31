import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Flame,
  TrendingUp,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  X,
  Coins,
  RatioIcon,
  SlidersHorizontal,
  Wand2,
  Layers,
  Infinity,
  UserCircle,
  Palette,
  Plus,
  Check,
  ChevronDown,
  Search,
  Calendar,
  Download,
  Copy,
  Clock,
  Eye,
  EyeOff,
  Heart,
  MoreVertical,
  Maximize2,
} from "lucide-react";
import GenerationContextMenu from "@/components/GenerationContextMenu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";

interface TrendingToolProps {
  onBack: () => void;
  onSelectPrompt?: (prompt: string) => void;
}

// Trending model identifier
const TRENDING_MODEL = "trend";
const TRENDING_CREDITS = 3;

// Aspect ratio options
const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"];

// Quality options
interface QualityOption {
  id: string;
  name: string;
  description: string;
}

const QUALITY_OPTIONS: Record<string, QualityOption> = {
  "1024": { id: "1024", name: "Standard", description: "Fast generation, good for previews" },
  "2K": { id: "2K", name: "High", description: "Sharp details, ideal for sharing" },
  "4K": { id: "4K", name: "Ultra", description: "Maximum quality for prints & large displays" },
};

// Batch size options
const BATCH_SIZES = [1, 2, 3, 4];

// Trend styles for popup
interface TrendStyle {
  id: string;
  name: string;
  prompt: string;
  hot?: boolean;
  category: string;
  previewImage?: string;
}

// Style categories
const STYLE_CATEGORIES = ["All", "New", "TikTok Core", "Instagram Aesthetics", "Camera Presets", "Beauty", "Mood", "Surreal", "Fashion"];

// Default fallback style
const DEFAULT_STYLE: TrendStyle = {
  id: "general",
  name: "General",
  prompt: "A professional high-quality photograph of the person, natural lighting, confident pose, clean background",
  category: "All",
  previewImage: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=500&fit=crop"
};


interface Generation {
  id: string;
  prompt: string;
  model: string;
  status: string;
  output_url: string | null;
  created_at: string;
  aspect_ratio?: string | null;
  quality?: string | null;
  credits_used?: number;
  title?: string | null;
}

interface Character {
  id: string;
  name: string;
  thumbnail_url: string | null;
  status: string;
}

const TrendingTool = ({ onBack, onSelectPrompt }: TrendingToolProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  
  // Form state
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("1024");
  const [promptEnhance, setPromptEnhance] = useState(false);
  const [batchSize, setBatchSize] = useState(1);
  const [unlimited, setUnlimited] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<TrendStyle>(DEFAULT_STYLE);
  const [trendStyles, setTrendStyles] = useState<TrendStyle[]>([DEFAULT_STYLE]);
  const [loadingStyles, setLoadingStyles] = useState(true);
  const [loadingMoreStyles, setLoadingMoreStyles] = useState(false);
  const [stylesPage, setStylesPage] = useState(0);
  const [hasMoreStyles, setHasMoreStyles] = useState(true);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  
  // Pagination constants
  const STYLES_PAGE_SIZE = 20;
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingGenerations, setLoadingGenerations] = useState(true);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [stylesDialogOpen, setStylesDialogOpen] = useState(false);
  const [styleSearch, setStyleSearch] = useState("");
  const [styleCategory, setStyleCategory] = useState("All");
  const [characterDialogOpen, setCharacterDialogOpen] = useState(false);
  const [characterSearch, setCharacterSearch] = useState("");
  const [showBadges, setShowBadges] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  
  // File input ref
  const fileInputRef = useState<HTMLInputElement | null>(null);

  const hasEnoughCredits = credits >= TRENDING_CREDITS * batchSize;
  const selectedCharacterData = characters.find(c => c.id === selectedCharacter);

  // Fetch user's characters
  useEffect(() => {
    const fetchCharacters = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("characters")
          .select("id, name, thumbnail_url, status")
          .eq("user_id", user.id)
          .eq("status", "ready")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCharacters(data || []);
      } catch (err) {
        console.error("Error fetching characters:", err);
      }
    };

    fetchCharacters();
  }, [user]);

  // Fetch trending styles from database with pagination
  const fetchStyles = async (page: number = 0, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMoreStyles(true);
      } else {
        setLoadingStyles(true);
      }
      
      const from = page * STYLES_PAGE_SIZE;
      const to = from + STYLES_PAGE_SIZE - 1;
      
      const { data, error, count } = await supabase
        .from("trending_styles")
        .select("id, name, prompt, category, hot, preview_image, display_order", { count: "exact" })
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .range(from, to);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const mappedStyles: TrendStyle[] = data.map((s) => ({
          id: s.id,
          name: s.name,
          prompt: s.prompt,
          category: s.category,
          hot: s.hot || false,
          previewImage: s.preview_image || undefined,
        }));
        
        if (append) {
          setTrendStyles((prev) => [...prev, ...mappedStyles]);
        } else {
          setTrendStyles(mappedStyles);
          setSelectedStyle(mappedStyles[0]);
        }
        
        // Check if there are more styles to load
        const totalLoaded = (page + 1) * STYLES_PAGE_SIZE;
        setHasMoreStyles(count ? totalLoaded < count : data.length === STYLES_PAGE_SIZE);
        setStylesPage(page);
      } else if (!append) {
        setHasMoreStyles(false);
      } else {
        setHasMoreStyles(false);
      }
    } catch (err) {
      console.error("Error fetching styles:", err);
      if (!append) {
        setHasMoreStyles(false);
      }
    } finally {
      setLoadingStyles(false);
      setLoadingMoreStyles(false);
    }
  };

  // Initial fetch of styles
  useEffect(() => {
    fetchStyles(0, false);
  }, []);
  // Fetch user's trending model generations
  useEffect(() => {
    const fetchGenerations = async () => {
      if (!user) {
        setLoadingGenerations(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("generations")
          .select("id, prompt, model, status, output_url, created_at, aspect_ratio, quality, credits_used, title")
          .eq("user_id", user.id)
          .eq("type", "image")
          .eq("model", TRENDING_MODEL)
          .eq("status", "completed")
          .not("output_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setGenerations(data || []);
      } catch (err) {
        console.error("Error fetching generations:", err);
      } finally {
        setLoadingGenerations(false);
      }
    };

    fetchGenerations();
  }, [user]);

  // Fetch liked generation IDs
  useEffect(() => {
    const fetchLikes = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("generation_likes")
          .select("generation_id")
          .eq("user_id", user.id);

        if (error) throw error;
        setLikedIds(new Set(data?.map((l) => l.generation_id) || []));
      } catch (err) {
        console.error("Error fetching likes:", err);
      }
    };

    fetchLikes();
  }, [user]);

  const handleSelectTrendingPrompt = (selectedPrompt: string) => {
    setPrompt(selectedPrompt);
  };

  const selectStyle = (style: TrendStyle) => {
    setSelectedStyle(style);
    // Style is stored separately and passed to API on generation - not shown in input
    setStylesDialogOpen(false);
  };

  const toggleCharacter = (charId: string) => {
    if (selectedCharacter === charId) {
      setSelectedCharacter(null);
    } else {
      setSelectedCharacter(charId);
    }
  };

  const handleLikeToggle = async (id: string, liked: boolean) => {
    if (!user) return;
    
    try {
      if (liked) {
        await supabase
          .from("generation_likes")
          .insert({ generation_id: id, user_id: user.id });
        setLikedIds((prev) => new Set([...prev, id]));
      } else {
        await supabase
          .from("generation_likes")
          .delete()
          .eq("generation_id", id)
          .eq("user_id", user.id);
        setLikedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  const handleDeleteGeneration = async (id: string) => {
    try {
      await supabase.from("generations").delete().eq("id", id);
      setGenerations((prev) => prev.filter((g) => g.id !== id));
      if (selectedGeneration?.id === id) {
        setSelectedGeneration(null);
      }
      toast({ title: "Generation deleted" });
    } catch (err) {
      console.error("Error deleting generation:", err);
      toast({ variant: "destructive", title: "Failed to delete" });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file.",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image smaller than 10MB.",
      });
      return;
    }

    setReferenceFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setReferenceImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeReferenceImage = () => {
    setReferenceImage(null);
    setReferenceFile(null);
  };

  const handleGenerate = async () => {
    // Allow generation with either prompt OR (style + character)
    const hasPrompt = prompt.trim().length > 0;
    const hasStyleAndCharacter = selectedStyle && selectedCharacter;
    
    if (!hasPrompt && !hasStyleAndCharacter) {
      toast({
        variant: "destructive",
        title: "Missing requirements",
        description: "Please enter a prompt, or select both a style and character.",
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Not logged in",
        description: "Please log in to generate images.",
      });
      return;
    }

    if (!hasEnoughCredits) {
      toast({
        variant: "destructive",
        title: "Not enough credits",
        description: "Please add more credits to continue.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Upload reference image if present
      let referenceImageUrl: string | undefined;
      if (referenceFile) {
        const fileName = `${user.id}/${Date.now()}-${referenceFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('generation-inputs')
          .upload(fileName, referenceFile);
        
        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('generation-inputs')
            .getPublicUrl(fileName);
          referenceImageUrl = publicUrl;
        }
      }

      // Generate multiple images based on batch size (parallel requests)
      const generatePromises = Array.from({ length: batchSize }, () =>
        supabase.functions.invoke("trending-generate", {
          body: {
            prompt: prompt.trim() || `Create a stunning photo in ${selectedStyle?.name} style`,
            stylePrompt: selectedStyle?.prompt,
            styleName: selectedStyle?.name,
            characterId: selectedCharacter,
            aspectRatio,
            quality,
            enhance: promptEnhance,
            referenceImageUrl,
          },
        })
      );

      const results = await Promise.allSettled(generatePromises);
      
      // Count successes and failures
      let successCount = 0;
      let failCount = 0;
      let lastError: string | null = null;

      for (const result of results) {
        if (result.status === "fulfilled") {
          const { data, error } = result.value;
          if (error || data?.error) {
            failCount++;
            lastError = error?.message || data?.error || "Unknown error";
          } else {
            successCount++;
          }
        } else {
          failCount++;
          lastError = result.reason?.message || "Request failed";
        }
      }

      // Show appropriate toast based on results
      if (successCount > 0 && failCount === 0) {
        toast({
          title: `${successCount} image${successCount > 1 ? "s" : ""} generated!`,
          description: "Your trending images have been created.",
        });
      } else if (successCount > 0 && failCount > 0) {
        toast({
          title: `${successCount} of ${batchSize} images generated`,
          description: `${failCount} failed: ${lastError}`,
        });
      } else {
        throw new Error(lastError || "All generations failed");
      }

      // Refetch credits after successful generation (with small delay for DB propagation)
      setTimeout(() => {
        refetchCredits();
      }, 100);

      // Refetch generations to show the new ones
      const { data: newData } = await supabase
        .from("generations")
        .select("id, prompt, model, status, output_url, created_at")
        .eq("user_id", user.id)
        .eq("type", "image")
        .eq("model", TRENDING_MODEL)
        .eq("status", "completed")
        .not("output_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (newData) {
        setGenerations(newData);
      }

      // Reset all form values to defaults
      setPrompt("");
      setReferenceImage(null);
      setReferenceFile(null);
      setAspectRatio("1:1");
      setQuality("1024");
      setPromptEnhance(false);
      setBatchSize(1);
      setUnlimited(false);
      setSelectedCharacter(null);
      setSelectedStyle(trendStyles[0] || DEFAULT_STYLE);
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate image.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative h-[calc(100vh-78px)] overflow-hidden">
      {/* Full-Screen Grid Background */}
      <div className="absolute inset-0 overflow-y-auto overflow-x-hidden pb-72 md:pb-64">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border/20">
          <div className="flex items-center gap-2 pl-14 pr-4 py-3 md:px-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">Trending</span>
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              {generations.length} generations
            </div>
          </div>
          {/* Loading progress bar for like/download actions */}
          {(likingIds.size > 0 || downloadingIds.size > 0) && (
            <Progress value={100} className="h-0.5 rounded-none [&>div]:animate-pulse" />
          )}
        </div>

        {/* Image Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 p-1">
          {/* Generating placeholder - shows when generating */}
          {isGenerating && (
            <div className="aspect-square bg-secondary/80 rounded-sm flex flex-col items-center justify-center gap-3 border border-primary/30 animate-pulse">
              <div className="relative">
                <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <Sparkles className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <span className="text-xs text-muted-foreground">Generating...</span>
            </div>
          )}
          {/* Loading state - Skeleton Grid */}
          {loadingGenerations ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square bg-secondary/50 animate-pulse rounded-sm" />
            ))
          ) : generations.length > 0 ? (
            generations.map((gen) => (
              <div
                key={gen.id}
                className={cn(
                  "relative aspect-square overflow-hidden group rounded-sm",
                  selectedGeneration?.id === gen.id && "ring-2 ring-primary"
                )}
              >
                {gen.output_url && (
                  <img
                    src={gen.output_url}
                    alt="Generated image"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Hover action buttons */}
                <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Open button */}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                    onClick={() => setSelectedGeneration(gen)}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </Button>
                  
                  {/* Like button */}
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                    disabled={likingIds.has(gen.id)}
                    onClick={async () => {
                      const isLiked = likedIds.has(gen.id);
                      setLikingIds(prev => new Set(prev).add(gen.id));
                      try {
                        await handleLikeToggle(gen.id, !isLiked);
                      } finally {
                        setLikingIds(prev => {
                          const next = new Set(prev);
                          next.delete(gen.id);
                          return next;
                        });
                      }
                    }}
                  >
                    {likingIds.has(gen.id) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Heart className={cn("h-3.5 w-3.5", likedIds.has(gen.id) && "fill-destructive text-destructive")} />
                    )}
                  </Button>
                  
                  {/* Download button */}
                  {gen.output_url && (
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                      disabled={downloadingIds.has(gen.id)}
                      onClick={async () => {
                        setDownloadingIds(prev => new Set(prev).add(gen.id));
                        try {
                          const response = await fetch(gen.output_url || "");
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `trending-${gen.id}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          window.URL.revokeObjectURL(url);
                        } catch (err) {
                          console.error("Download failed:", err);
                        } finally {
                          setDownloadingIds(prev => {
                            const next = new Set(prev);
                            next.delete(gen.id);
                            return next;
                          });
                        }
                      }}
                    >
                      {downloadingIds.has(gen.id) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}

                  {/* More button with context menu */}
                  <GenerationContextMenu
                    generation={{
                      id: gen.id,
                      prompt: gen.prompt,
                      type: "image",
                      model: gen.model,
                      output_url: gen.output_url,
                    }}
                    isLiked={likedIds.has(gen.id)}
                    onDelete={handleDeleteGeneration}
                    onLikeToggle={handleLikeToggle}
                  >
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 bg-background/80 backdrop-blur-sm"
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </GenerationContextMenu>
                </div>
              </div>
            ))
          ) : (
            // Empty state with placeholder grid
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
              <div className="grid grid-cols-3 gap-2 mb-6 opacity-30">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="w-12 h-12 rounded bg-secondary" />
                ))}
              </div>
              <ImageIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">
                No trending images yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Generate your first image using trending styles
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-3 md:p-4 bg-gradient-to-t from-background via-background to-transparent pt-12">
                <div className="max-w-5xl mx-auto">

          {/* Main Input Bar - Horizontal Layout matching reference design */}
          <div className="bg-secondary/95 backdrop-blur-xl rounded-2xl border border-border shadow-xl p-3">
            <div className="flex">
              <div className="flex-1">
                {/* Top Row: Input + Right Side Buttons */}
                <div className="flex items-center gap-3">
                  {/* Reference Image Upload */}
                  {referenceImage ? (
                    <div className="relative h-9 w-9 rounded-lg border border-border">
                      <img 
                        src={referenceImage} 
                        alt="Reference" 
                        className="w-full h-full object-cover rounded-sm"
                      />
                      <button
                        onClick={removeReferenceImage}
                        className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full flex items-center justify-center"
                      >
                        <X className="h-2.5 w-2.5 text-destructive-foreground" />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="h-9 w-9 rounded-full border border-border bg-transparent hover:bg-muted flex items-center justify-center transition-colors"
                      onClick={() => document.getElementById("reference-image-upload")?.click()}
                    >
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}

                  {/* Text Input */}
                  <Input
                    type="text"
                    placeholder="Describe the scene you imagine"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="flex-1 h-12 bg-transparent border-0 focus-visible:ring-0 text-sm text-foreground placeholder:text-muted-foreground min-w-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                  />

                  {/* Hidden file input */}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="reference-image-upload"
                    onChange={handleImageUpload}
                  />
                </div>

                {/* Bottom Row: Controls */}
                <div className="flex items-center gap-1.5 md:gap-3 mt-2 md:mt-3 flex-wrap">
                  {/* Aspect Ratio Selector */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 md:gap-2 h-7 md:h-9 px-2 md:px-3 rounded-full bg-card border border-border hover:bg-muted transition-colors">
                        <RatioIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                        <span className="text-xs md:text-sm font-medium text-foreground">{aspectRatio}</span>
                        <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-3 bg-card border-border" align="start">
                      <Label className="text-xs text-muted-foreground mb-2 block">Aspect Ratio</Label>
                      <RadioGroup value={aspectRatio} onValueChange={setAspectRatio} className="grid gap-1">
                        {ASPECT_RATIOS.map((ratio) => (
                          <div key={ratio} className="flex items-center space-x-2">
                            <RadioGroupItem value={ratio} id={`ratio-${ratio}`} />
                            <Label htmlFor={`ratio-${ratio}`} className="text-sm font-medium cursor-pointer flex-1">
                              {ratio}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </PopoverContent>
                  </Popover>

                  {/* Quality Selector */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-1 md:gap-2 h-7 md:h-9 px-2 md:px-3 rounded-full bg-card border border-border hover:bg-muted transition-colors">
                        <SlidersHorizontal className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                        <span className="text-xs md:text-sm font-medium text-foreground">{QUALITY_OPTIONS[quality]?.name || quality}</span>
                        <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 bg-card border-border" align="start">
                      <Label className="text-xs text-muted-foreground mb-2 block">Quality</Label>
                      <RadioGroup value={quality} onValueChange={setQuality} className="grid gap-2">
                        {Object.values(QUALITY_OPTIONS).map((option) => (
                          <div key={option.id} className="flex items-start space-x-2">
                            <RadioGroupItem value={option.id} id={`quality-${option.id}`} className="mt-0.5" />
                            <div className="flex-1">
                              <Label htmlFor={`quality-${option.id}`} className="text-sm font-medium cursor-pointer block">
                                {option.name}
                              </Label>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </PopoverContent>
                  </Popover>

                  {/* Batch Size Control */}
                  <div className="flex items-center h-7 md:h-9 rounded-full bg-card border border-border overflow-hidden">
                    <button
                      onClick={() => setBatchSize(Math.max(1, batchSize - 1))}
                      className="h-full px-2 md:px-3 hover:bg-muted transition-colors text-muted-foreground"
                      disabled={batchSize <= 1}
                    >
                      <span className="text-xs md:text-sm font-medium">−</span>
                    </button>
                    <span className="px-1 md:px-2 text-xs md:text-sm font-medium text-foreground min-w-[24px] md:min-w-[32px] text-center">
                      {batchSize}/4
                    </span>
                    <button
                      onClick={() => setBatchSize(Math.min(4, batchSize + 1))}
                      className="h-full px-2 md:px-3 hover:bg-muted transition-colors text-muted-foreground"
                      disabled={batchSize >= 4}
                    >
                      <span className="text-xs md:text-sm font-medium">+</span>
                    </button>
                  </div>

                  {/* Unlimited Toggle */}
                  <div className="flex items-center gap-1.5 md:gap-2 h-7 md:h-9 px-2 md:px-3 rounded-full bg-card border border-border">
                    <span className="text-xs md:text-sm font-medium text-foreground">Unlim</span>
                    <Switch
                      checked={unlimited}
                      onCheckedChange={setUnlimited}
                      className="data-[state=checked]:bg-primary scale-75 md:scale-100"
                    />
                  </div>

                  <div className="flex-1" />
                </div>
              </div>
              <div className="flex gap-1">
                {/* CHARACTER Button */}
                  <Dialog open={characterDialogOpen} onOpenChange={setCharacterDialogOpen}>
                    <div className="relative h-full group">
                      <DialogTrigger asChild>
                        <button className={cn(
                          "h-full w-20 rounded-xl border border-border flex flex-col overflow-hidden transition-colors shrink-0 relative",
                          selectedCharacterData ? "p-0" : "p-2 bg-card hover:bg-muted/50"
                        )}>
                          {selectedCharacterData && selectedCharacterData.thumbnail_url ? (
                            <>
                              <img 
                                src={selectedCharacterData.thumbnail_url} 
                                alt={selectedCharacterData.name}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <span className="absolute bottom-1.5 right-1.5 text-[10px] font-medium text-white uppercase tracking-wide text-right leading-tight max-w-[90%] line-clamp-2">
                                {selectedCharacterData.name}
                              </span>
                            </>
                          ) : (
                            <>
                              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                                <Plus className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <span className="mt-auto text-[10px] font-medium text-muted-foreground uppercase tracking-wide text-right self-end">
                                Character
                              </span>
                            </>
                          )}
                        </button>
                      </DialogTrigger>
                      {/* Remove button on hover */}
                      {selectedCharacterData && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCharacter(null);
                          }}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col bg-secondary border-border p-0 overflow-hidden [&>button]:top-4 [&>button]:right-4 [&>button]:h-10 [&>button]:w-10 [&>button]:rounded-full [&>button]:bg-muted [&>button]:hover:bg-muted/80 [&>button]:border-0 [&>button]:opacity-100">
                      {/* Header with Title */}
                      <div className="flex items-center p-5 pb-4 shrink-0">
                        <DialogTitle className="text-2xl font-bold text-foreground">Characters</DialogTitle>
                      </div>

                      {/* Characters Grid */}
                      <div className="flex-1 overflow-y-auto px-5 pb-5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {/* Create New Card */}
                          <a
                            href="/character"
                            className="aspect-[3/4] rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col p-4 transition-colors bg-background/50"
                          >
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <Plus className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="mt-auto">
                              <p className="text-sm font-medium text-foreground">Create new</p>
                              <p className="text-xs text-muted-foreground">Build your own AI character</p>
                            </div>
                          </a>

                          {/* Character Cards */}
                          {characters
                            .map((char) => {
                              const isSelected = selectedCharacter === char.id;
                              return (
                                <button
                                  key={char.id}
                                  onClick={() => {
                                    setSelectedCharacter(char.id);
                                    setCharacterDialogOpen(false);
                                  }}
                                  className={cn(
                                    "relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-200 group",
                                    isSelected 
                                      ? "border-primary ring-2 ring-primary/20" 
                                      : "border-transparent hover:border-primary/50"
                                  )}
                                >
                                  {char.thumbnail_url ? (
                                    <img
                                      src={char.thumbnail_url}
                                      alt={char.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center">
                                      <UserCircle className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                  )}
                                  {/* Gradient overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                  
                                  {/* Character name */}
                                  <div className="absolute bottom-0 left-0 right-0 p-3">
                                    <span className="text-sm font-bold text-white uppercase tracking-wide line-clamp-2">
                                      {char.name}
                                    </span>
                                  </div>
                                  
                                  {/* Selection check */}
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                      <Check className="h-4 w-4 text-primary-foreground" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}

                          {/* Empty state */}
                          {characters.length === 0 && (
                            <div className="col-span-full py-12 text-center">
                              <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                              <p className="text-muted-foreground">No characters yet</p>
                              <p className="text-sm text-muted-foreground mt-1">Create your first AI character to get started</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Style Selector Button with Preview */}
                  <Dialog open={stylesDialogOpen} onOpenChange={setStylesDialogOpen}>
                    <DialogTrigger asChild>
                      <button className="relative h-full rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-colors shrink-0 group">
                        {/* Style Preview Image */}
                        <div className="h-full w-20 relative">
                          {selectedStyle?.previewImage ? (
                            <img
                              src={selectedStyle.previewImage}
                              alt={selectedStyle.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full bg-muted flex items-center justify-center">
                              <Palette className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          {/* Overlay gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          
                          {/* Change label at top */}
                          <div className="absolute top-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/40 backdrop-blur-sm">
                            <Palette className="h-2.5 w-2.5 text-white" />
                            <span className="text-[9px] text-white font-medium">Change</span>
                          </div>
                          
                          {/* Style name badge at bottom */}
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                            <Badge 
                              className="bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border-0"
                            >
                              {selectedStyle?.name || "Style"}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col bg-secondary border-border p-0 overflow-hidden [&>button]:top-4 [&>button]:right-4 [&>button]:h-10 [&>button]:w-10 [&>button]:rounded-full [&>button]:bg-muted [&>button]:hover:bg-muted/80 [&>button]:border-0 [&>button]:opacity-100">
                      {/* Header with Title and Search */}
                      <div className="flex items-center gap-3 p-5 pb-4 shrink-0 pr-16">
                        <DialogTitle className="text-2xl font-semibold text-foreground shrink-0">Visual Styles</DialogTitle>
                        <div className="relative flex-1 max-w-xs">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search styles..."
                            value={styleSearch}
                            onChange={(e) => setStyleSearch(e.target.value)}
                            className="pl-9 h-9 bg-muted/50 border-border text-sm"
                          />
                        </div>
                      </div>
                      
                      {/* Category Buttons */}
                      <div className="px-5 pb-4 shrink-0 overflow-hidden">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {STYLE_CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setStyleCategory(cat);
                              }}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                                styleCategory === cat
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              )}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* Masonry Grid - Takes remaining space */}
                      <div className="flex-1 overflow-y-auto px-5 pb-5">
                        {(() => {
                          const filteredStyles = trendStyles.filter(
                            (style) => {
                              const matchesCategory = styleCategory === "All" || style.category === styleCategory;
                              const matchesSearch = !styleSearch.trim() || 
                                style.name.toLowerCase().includes(styleSearch.toLowerCase()) ||
                                style.category.toLowerCase().includes(styleSearch.toLowerCase());
                              return matchesCategory && matchesSearch;
                            }
                          );
                          
                          return (
                            <>
                              <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                                {filteredStyles.map((style) => {
                                  const isSelected = selectedStyle?.id === style.id;
                                  return (
                                    <button
                                      key={style.id}
                                      onClick={() => selectStyle(style)}
                                      className={cn(
                                        "relative w-full break-inside-avoid rounded-xl overflow-hidden transition-all group",
                                        isSelected && "ring-2 ring-primary"
                                      )}
                                    >
                                      {/* Image */}
                                      <div className="relative">
                                        <img
                                          src={style.previewImage}
                                          alt={style.name}
                                          className="w-full h-auto object-cover"
                                        />
                                        {/* Gradient overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                                        
                                        {/* Style name */}
                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                          <span className="text-sm font-bold text-white uppercase tracking-wide">
                                            {style.name}
                                          </span>
                                        </div>
                                        
                                        {/* Selection check */}
                                        {isSelected && (
                                          <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="h-4 w-4 text-primary-foreground" />
                                          </div>
                                        )}
                                        
                                        {/* Hot badge */}
                                        {style.hot && showBadges && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div>
                                                <Badge 
                                                  variant="destructive" 
                                                  className="absolute top-2 left-2 px-3 py-1 text-xs font-bold uppercase cursor-default"
                                                >
                                                  <Flame className="h-3 w-3 mr-1" />
                                                  Hot
                                                </Badge>
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                              <p>Trending style - Popular right now!</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              
                              {/* Load More Button - fetches next page from API */}
                              {hasMoreStyles && !styleSearch.trim() && styleCategory === "All" && (
                                <div className="flex justify-center mt-6">
                                  <Button
                                    variant="outline"
                                    onClick={() => fetchStyles(stylesPage + 1, true)}
                                    disabled={loadingMoreStyles}
                                    className="rounded-full px-6"
                                  >
                                    {loadingMoreStyles ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Loading...
                                      </>
                                    ) : (
                                      "Load more styles"
                                    )}
                                  </Button>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Generate Button - Primary theme color */}
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !hasEnoughCredits || (!prompt.trim() && !(selectedStyle && selectedCharacter))}
                    className="h-full px-4 rounded-xl gradient-primary text-primary-foreground flex flex-col items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span className="text-xs font-semibold">Generate</span>
                        <div className="flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          <span className="text-xs">{TRENDING_CREDITS * batchSize}</span>
                        </div>
                      </>
                    )}
                  </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Details Dialog */}
      {selectedGeneration && selectedGeneration.output_url && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex flex-col md:flex-row"
          onClick={() => setSelectedGeneration(null)}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={() => setSelectedGeneration(null)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Image Section */}
          <div className="flex-1 flex items-center justify-center p-4 md:p-8" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedGeneration.output_url}
              alt="Preview"
              className="max-w-full max-h-[60vh] md:max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Details Panel */}
          <div 
            className="w-full md:w-96 bg-card/95 backdrop-blur-xl border-t md:border-l md:border-t-0 border-border p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-1">Image Details</h2>
                <p className="text-sm text-muted-foreground">
                  Generated with Trending model
                </p>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-muted-foreground">Prompt</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedGeneration.prompt || "");
                      toast({ description: "Prompt copied to clipboard" });
                    }}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-3 leading-relaxed">
                  {selectedGeneration.prompt || "No prompt available"}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Model */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Model</Label>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground capitalize">
                      {selectedGeneration.model || "Trending"}
                    </span>
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
                  <div className="flex items-center gap-2">
                    <RatioIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {selectedGeneration.aspect_ratio || "1:1"}
                    </span>
                  </div>
                </div>

                {/* Quality */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Quality</Label>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {QUALITY_OPTIONS[selectedGeneration.quality || "1024"]?.name || "Standard"}
                    </span>
                  </div>
                </div>

                {/* Credits */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Credits Used</Label>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {selectedGeneration.credits_used ?? TRENDING_CREDITS} credits
                    </span>
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {new Date(selectedGeneration.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border space-y-3">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    if (selectedGeneration.output_url) {
                      window.open(selectedGeneration.output_url, "_blank");
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Image
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setPrompt(selectedGeneration.prompt || "");
                    setSelectedGeneration(null);
                    toast({ description: "Prompt loaded. Ready to regenerate!" });
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Use This Prompt
                </Button>
              </div>

              {/* ID for reference */}
              <div className="pt-4 border-t border-border">
                <Label className="text-xs text-muted-foreground">Generation ID</Label>
                <p className="text-xs text-muted-foreground/60 font-mono mt-1 break-all">
                  {selectedGeneration.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendingTool;
