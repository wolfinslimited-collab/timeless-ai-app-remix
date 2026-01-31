import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Sparkles, Loader2, X, Zap, ChevronDown, Upload, User, Palette, Infinity, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";
import AddCreditsDialog from "@/components/AddCreditsDialog";
import { Switch } from "@/components/ui/switch";

interface MobileVisualStylesProps {
  onBack: () => void;
}

interface StyleItem {
  id: string;
  name: string;
  prompt: string;
  category: string;
  hot: boolean;
  preview_image: string | null;
  display_order: number;
}

interface CharacterItem {
  id: string;
  name: string;
  thumbnail_url: string | null;
  status: string;
}

const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1", description: "Square" },
  { id: "16:9", label: "16:9", description: "Landscape" },
  { id: "9:16", label: "9:16", description: "Portrait" },
  { id: "4:3", label: "4:3", description: "Classic" },
  { id: "3:4", label: "3:4", description: "Portrait" },
  { id: "21:9", label: "21:9", description: "Cinematic" },
];

const QUALITY_OPTIONS = [
  { id: "1024", label: "Standard", description: "1024px", credits: 4 },
  { id: "2K", label: "High", description: "2048px", credits: 6 },
  { id: "4K", label: "Ultra", description: "4096px", credits: 10 },
];

const BATCH_SIZES = [1, 2, 3, 4];

export function MobileVisualStyles({ onBack }: MobileVisualStylesProps) {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("1024");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState("none");
  const [batchSize, setBatchSize] = useState(1);
  const [unlimited, setUnlimited] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [showAddCreditsDialog, setShowAddCreditsDialog] = useState(false);
  const [showAspectRatioDropdown, setShowAspectRatioDropdown] = useState(false);
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);
  const [showCharacterDropdown, setShowCharacterDropdown] = useState(false);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [styles, setStyles] = useState<StyleItem[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterItem[]>([]);
  const [isLoadingCharacters, setIsLoadingCharacters] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { credits, refetch } = useCredits();
  const { toast } = useToast();

  // Fetch styles from database
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const { data, error } = await supabase
          .from("trending_styles")
          .select("id, name, prompt, category, hot, preview_image, display_order")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (error) throw error;
        setStyles(data || []);
        // Set first category as active
        if (data && data.length > 0) {
          const categories = [...new Set(data.map(s => s.category))];
          setActiveCategory(categories[0]);
        }
      } catch (error) {
        console.error("Error fetching styles:", error);
      } finally {
        setIsLoadingStyles(false);
      }
    };

    fetchStyles();
  }, []);

  // Fetch user's trained characters
  useEffect(() => {
    const fetchCharacters = async () => {
      if (!user) {
        setIsLoadingCharacters(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("characters")
          .select("id, name, thumbnail_url, status")
          .eq("user_id", user.id)
          .eq("status", "ready")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setCharacters(data || []);
      } catch (error) {
        console.error("Error fetching characters:", error);
      } finally {
        setIsLoadingCharacters(false);
      }
    };

    fetchCharacters();
  }, [user]);

  // Get selected character data
  const selectedCharacterData = characters.find(c => c.id === selectedCharacter);

  // Group styles by category
  const stylesByCategory = styles.reduce((acc, style) => {
    if (!acc[style.category]) {
      acc[style.category] = [];
    }
    acc[style.category].push(style);
    return acc;
  }, {} as Record<string, StyleItem[]>);

  const categories = Object.keys(stylesByCategory);

  const selectedQualityData = QUALITY_OPTIONS.find(q => q.id === quality);
  const totalCredits = (selectedQualityData?.credits || 4) * batchSize;

  const toggleStyle = (styleId: string) => {
    setSelectedStyles(prev => 
      prev.includes(styleId) 
        ? prev.filter(s => s !== styleId) 
        : [...prev, styleId]
    );
  };

  const getFinalPrompt = () => {
    const basePrompt = prompt.trim();
    if (selectedStyles.length === 0) return basePrompt;

    const stylePrompts = selectedStyles
      .map(id => styles.find(s => s.id === id)?.prompt)
      .filter(Boolean)
      .join(", ");

    return basePrompt ? `${basePrompt}, ${stylePrompts}` : stylePrompts;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 10MB",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/visual-styles-ref-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("generation-inputs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("generation-inputs")
        .getPublicUrl(fileName);

      setReferenceImage(publicUrl);
      toast({
        title: "Image uploaded",
        description: "Reference image added successfully",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleGenerate = async () => {
    const finalPrompt = getFinalPrompt();
    if (!finalPrompt) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a prompt or select a style",
      });
      return;
    }

    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please sign in to generate images",
      });
      return;
    }

    if ((credits || 0) < totalCredits) {
      setShowAddCreditsDialog(true);
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      // Get selected style names and prompts for API
      const selectedStyleData = selectedStyles
        .map(id => styles.find(s => s.id === id))
        .filter(Boolean);
      const styleName = selectedStyleData.map(s => s!.name).join(", ") || undefined;
      const stylePrompt = selectedStyleData.map(s => s!.prompt).filter(Boolean).join(", ") || undefined;

      // Generate multiple images if batch size > 1
      const promises = Array.from({ length: batchSize }, async () => {
        const { data, error } = await supabase.functions.invoke("trending-generate", {
          body: {
            prompt: prompt.trim() || undefined,
            aspectRatio,
            quality,
            enhance: unlimited, // Use enhance mode if unlimited toggle is on
            ...(referenceImage && { referenceImageUrl: referenceImage }),
            ...(selectedCharacter !== "none" && { characterId: selectedCharacter }),
            ...(styleName && { styleName }),
            ...(stylePrompt && { stylePrompt }),
          },
        });

        if (error) throw error;
        return data?.output_url || data?.outputUrl || data?.result?.output_url;
      });

      const results = await Promise.all(promises);
      const validResults = results.filter(Boolean) as string[];
      
      setGeneratedImages(validResults);
      
      if (validResults.length > 0) {
        toast({
          title: `${validResults.length} image${validResults.length > 1 ? 's' : ''} generated!`,
          description: "Your images have been created successfully",
        });
        refetch();
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        variant: "destructive",
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-foreground text-base font-semibold">Visual Styles</h1>
            <span className="px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground rounded bg-primary">
              NEW
            </span>
          </div>
          <p className="text-muted-foreground text-xs">Ultra-realistic fashion visuals with AI styling</p>
        </div>
        <div className="flex items-center gap-1 bg-primary/15 px-2 py-1 rounded-lg">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-primary text-xs font-semibold">{totalCredits}</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        
        {/* Preview Area */}
        <div className={cn(
          "bg-secondary rounded-2xl border border-border flex items-center justify-center overflow-hidden min-h-[200px]",
          aspectRatio === "1:1" && "aspect-square",
          aspectRatio === "16:9" && "aspect-video",
          aspectRatio === "9:16" && "aspect-[9/16] max-h-[300px]",
          aspectRatio === "4:3" && "aspect-[4/3]",
          aspectRatio === "3:4" && "aspect-[3/4] max-h-[300px]",
          aspectRatio === "21:9" && "aspect-[21/9]"
        )}>
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">Generating {batchSize} image{batchSize > 1 ? 's' : ''}...</p>
            </div>
          ) : generatedImages.length > 0 ? (
            <div className={cn(
              "w-full h-full grid gap-1",
              generatedImages.length === 1 && "grid-cols-1",
              generatedImages.length === 2 && "grid-cols-2",
              generatedImages.length === 4 && "grid-cols-2",
              generatedImages.length === 9 && "grid-cols-3"
            )}>
              {generatedImages.map((url, i) => (
                <img key={i} src={url} alt={`Generated ${i + 1}`} className="w-full h-full object-cover" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Palette className="w-10 h-10 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">Your styled images will appear here</p>
            </div>
          )}
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Aspect Ratio Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowAspectRatioDropdown(!showAspectRatioDropdown)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary border border-border"
            >
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Aspect Ratio</p>
                <p className="text-sm font-medium text-foreground">{aspectRatio}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
            {showAspectRatioDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => { setAspectRatio(ratio.id); setShowAspectRatioDropdown(false); }}
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-secondary transition-colors",
                      aspectRatio === ratio.id && "bg-primary/10"
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{ratio.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">{ratio.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quality Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowQualityDropdown(!showQualityDropdown)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary border border-border"
            >
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Quality</p>
                <p className="text-sm font-medium text-foreground">{selectedQualityData?.label}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
            {showQualityDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                {QUALITY_OPTIONS.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => { setQuality(q.id); setShowQualityDropdown(false); }}
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-secondary transition-colors flex justify-between items-center",
                      quality === q.id && "bg-primary/10"
                    )}
                  >
                    <div>
                      <span className="text-sm font-medium text-foreground">{q.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{q.description}</span>
                    </div>
                    <span className="text-xs text-primary font-medium">{q.credits} credits</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Character Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCharacterDropdown(!showCharacterDropdown)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary border border-border"
            >
              <div className="flex items-center gap-2">
                {selectedCharacterData?.thumbnail_url ? (
                  <img src={selectedCharacterData.thumbnail_url} className="w-6 h-6 rounded-full object-cover" alt={selectedCharacterData.name} />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="text-left">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Character</p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedCharacter === "none" ? "None" : selectedCharacterData?.name || "None"}
                  </p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
            {showCharacterDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                {/* None option */}
                <button
                  onClick={() => { setSelectedCharacter("none"); setShowCharacterDropdown(false); }}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-secondary transition-colors flex items-center gap-2",
                    selectedCharacter === "none" && "bg-primary/10"
                  )}
                >
                  <User className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">None</span>
                </button>

                {isLoadingCharacters ? (
                  <div className="px-3 py-2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : characters.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No trained characters yet
                  </div>
                ) : (
                  characters.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => { setSelectedCharacter(char.id); setShowCharacterDropdown(false); }}
                      className={cn(
                        "w-full px-3 py-2 text-left hover:bg-secondary transition-colors flex items-center gap-2",
                        selectedCharacter === char.id && "bg-primary/10"
                      )}
                    >
                      {char.thumbnail_url ? (
                        <img src={char.thumbnail_url} className="w-6 h-6 rounded-full object-cover" alt={char.name} />
                      ) : (
                        <User className="w-6 h-6 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium text-foreground">{char.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Batch Size Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowBatchDropdown(!showBatchDropdown)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary border border-border"
            >
              <div className="text-left">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Batch Size</p>
                <p className="text-sm font-medium text-foreground">{batchSize} image{batchSize > 1 ? 's' : ''}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
            {showBatchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                {BATCH_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => { setBatchSize(size); setShowBatchDropdown(false); }}
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-secondary transition-colors",
                      batchSize === size && "bg-primary/10"
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{size} image{size > 1 ? 's' : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reference Image Upload */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Reference Image</p>
          <div className="flex items-center gap-3">
            {referenceImage ? (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                <button
                  onClick={() => setReferenceImage(null)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-20 h-20 rounded-xl border border-dashed border-border bg-secondary flex flex-col items-center justify-center"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                  </>
                )}
              </button>
            )}
            <p className="text-xs text-muted-foreground flex-1">
              Optional: Add a reference image for style consistency
            </p>
          </div>
        </div>

        {/* Style Presets */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Styles</p>
          
          {isLoadingStyles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <>
              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                      activeCategory === category
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground border border-border"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Style Grid */}
              {activeCategory && stylesByCategory[activeCategory] && (
                <div className="grid grid-cols-3 gap-2">
                  {stylesByCategory[activeCategory].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => toggleStyle(style.id)}
                      className={cn(
                        "relative rounded-xl overflow-hidden border-2 transition-all aspect-square",
                        selectedStyles.includes(style.id)
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-transparent"
                      )}
                    >
                      {style.preview_image ? (
                        <img
                          src={style.preview_image}
                          alt={style.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <Palette className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      {/* Overlay with name */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2">
                        <span className="text-white text-[10px] font-medium leading-tight line-clamp-2">
                          {style.name}
                        </span>
                        {style.hot && (
                          <Flame className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-orange-400" />
                        )}
                      </div>
                      {/* Selection checkmark */}
                      {selectedStyles.includes(style.id) && (
                        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected styles summary */}
              {selectedStyles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selectedStyles.map((styleId) => {
                    const style = styles.find(s => s.id === styleId);
                    return style ? (
                      <span
                        key={styleId}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-medium"
                      >
                        {style.name}
                        <button onClick={() => toggleStyle(styleId)} className="hover:text-primary/70">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Unlimited Mode Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border">
          <div className="flex items-center gap-3">
            <Infinity className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Unlimited Mode</p>
              <p className="text-[10px] text-muted-foreground">Relax queue for unlimited runs (slower)</p>
            </div>
          </div>
          <Switch checked={unlimited} onCheckedChange={setUnlimited} />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Prompt Input */}
        <div className="flex items-center gap-2 bg-secondary rounded-full px-4 py-2 border border-border">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your visual style..."
            className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
            disabled={isGenerating}
          />
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || (!prompt.trim() && selectedStyles.length === 0)}
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Add Credits Dialog */}
      <AddCreditsDialog
        open={showAddCreditsDialog}
        onOpenChange={setShowAddCreditsDialog}
        currentCredits={credits ?? 0}
        requiredCredits={totalCredits}
      />
    </div>
  );
}
