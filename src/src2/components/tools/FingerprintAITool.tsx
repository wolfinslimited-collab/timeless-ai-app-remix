import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Loader2,
  ExternalLink,
  Link2,
  Sparkles,
  User,
  AlertCircle,
  Coins,
  Upload,
  Camera,
  X,
  Image as ImageIcon,
  Mail,
  Phone,
  Share2,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { SearchHistory } from "./fingerprint/SearchHistory";
import { ProfileCard } from "./fingerprint/ProfileCard";
import { PlatformFilters, PLATFORM_IDS } from "./fingerprint/PlatformFilters";
import type { SearchResult, FingerprintSearch, SocialProfile } from "./fingerprint/types";
import { TEXT_CREDIT_COST, IMAGE_CREDIT_COST } from "./fingerprint/types";

const FingerprintAITool = () => {
  const { user } = useAuth();
  const { credits, hasActiveSubscription, refetch: refetchCredits } = useCredits();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mainTab, setMainTab] = useState<"search" | "history">("search");
  const [searchMode, setSearchMode] = useState<"text" | "image" | "email">("text");
  const [searchQuery, setSearchQuery] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(PLATFORM_IDS);
  const [showFilters, setShowFilters] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please upload an image under 10MB.",
      });
      return;
    }

    setUploadedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setUploadedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${user!.id}/fingerprint/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("generation-inputs")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("generation-inputs")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const saveSearchToHistory = async (searchResult: SearchResult, imageUrl?: string) => {
    if (!user) return;

    const isImageSearch = searchMode === "image";
    const creditCost = isImageSearch ? IMAGE_CREDIT_COST : TEXT_CREDIT_COST;

    await supabase.from("fingerprint_searches").insert([{
      user_id: user.id,
      search_query: isImageSearch ? null : searchQuery.trim(),
      search_mode: isImageSearch ? "image" : "text",
      image_url: imageUrl || null,
      additional_info: additionalInfo.trim() || null,
      summary: searchResult.summary,
      profiles: searchResult.profiles as any,
      sources: searchResult.sources as any,
      credits_used: creditCost,
    }]);
  };

  const handleSearch = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to use Fingerprint AI.",
      });
      return;
    }

    const isImageSearch = searchMode === "image";
    const creditCost = isImageSearch ? IMAGE_CREDIT_COST : TEXT_CREDIT_COST;

    if (isImageSearch && !uploadedImage) {
      toast({
        variant: "destructive",
        title: "Image required",
        description: "Please upload an image to search.",
      });
      return;
    }

    if (!isImageSearch && !searchQuery.trim()) {
      toast({
        variant: "destructive",
        title: searchMode === "email" ? "Email/Phone required" : "Name required",
        description: `Please enter ${searchMode === "email" ? "an email or phone number" : "a name"} to search.`,
      });
      return;
    }

    if (!hasActiveSubscription && credits < creditCost) {
      toast({
        variant: "destructive",
        title: "Insufficient credits",
        description: `This search costs ${creditCost} credits. Please add more credits.`,
      });
      return;
    }

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      let imageUrl: string | undefined;
      
      if (isImageSearch && uploadedImage) {
        setIsUploading(true);
        imageUrl = await uploadImageToStorage(uploadedImage);
        setIsUploading(false);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fingerprint-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: isImageSearch ? undefined : searchQuery.trim(),
            additionalInfo: additionalInfo.trim() || undefined,
            imageUrl: imageUrl,
            searchMode: searchMode,
            platforms: selectedPlatforms,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 402) {
          throw new Error("Insufficient credits. Please add more credits to continue.");
        }
        if (response.status === 429) {
          throw new Error("Search service is busy. Please try again in a moment.");
        }
        
        throw new Error(errorData.error || "Search failed");
      }

      const data = await response.json();
      setResult(data);
      refetchCredits();

      // Save to history
      await saveSearchToHistory(data, imageUrl);

      toast({
        title: "Search complete",
        description: isImageSearch 
          ? "Found information based on the image" 
          : `Found information about "${searchQuery}"`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
      toast({
        variant: "destructive",
        title: "Search failed",
        description: message,
      });
    } finally {
      setIsSearching(false);
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isSearching) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleLoadFromHistory = (search: FingerprintSearch) => {
    setResult({
      summary: search.summary || "",
      profiles: search.profiles || [],
      sources: search.sources || [],
    });
    setSearchQuery(search.search_query || "");
    setAdditionalInfo(search.additional_info || "");
    setSearchMode(search.search_mode);
    setMainTab("search");
  };

  const handleExportResults = async () => {
    if (!result) return;

    const exportData = {
      query: searchQuery,
      searchMode,
      timestamp: new Date().toISOString(),
      summary: result.summary,
      profiles: result.profiles,
      sources: result.sources,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fingerprint-search-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Search results downloaded as JSON.",
    });
  };

  const handleShareResults = async () => {
    if (!result) return;

    const shareText = `Fingerprint AI Search Results:\n\n${result.summary}\n\nFound ${result.profiles.length} profiles.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Fingerprint AI Results",
          text: shareText,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied to clipboard",
        description: "Results summary copied.",
      });
    }
  };

  const currentCreditCost = searchMode === "image" ? IMAGE_CREDIT_COST : TEXT_CREDIT_COST;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500/20 to-zinc-500/20 mb-4">
          <Sparkles className="h-8 w-8 text-foreground" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Fingerprint AI</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Discover publicly available social profiles and information about anyone.
          Search by name, email, phone, or upload a photo.
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "search" | "history")} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            New Search
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Sparkles className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="flex-1">
          <SearchHistory onLoadSearch={handleLoadFromHistory} />
        </TabsContent>

        <TabsContent value="search" className="flex-1 flex flex-col space-y-4">
          {/* Search Form */}
          <Card className="border-0">
            <CardContent className="p-4 md:p-6 space-y-4">
              <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as "text" | "image" | "email")}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="text" className="gap-2">
                    <User className="h-4 w-4" />
                    Name
                  </TabsTrigger>
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Email/Phone
                  </TabsTrigger>
                  <TabsTrigger value="image" className="gap-2">
                    <Camera className="h-4 w-4" />
                    Photo
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name to search</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g., John Smith, @username, etc."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="pl-10"
                        disabled={isSearching}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="email" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email or Phone Number</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="email@example.com or +1234567890"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="pl-10"
                        disabled={isSearching}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Search for profiles linked to a specific email or phone number
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="image" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Upload a photo</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    
                    {!imagePreview ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">Click to upload</p>
                            <p className="text-sm text-muted-foreground">
                              JPG, PNG up to 10MB
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative rounded-xl overflow-hidden border border-border">
                        <img
                          src={imagePreview}
                          alt="Uploaded"
                          className="w-full h-48 object-cover"
                        />
                        <button
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              {/* Platform Filters Toggle */}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                  Platform Filters
                  {selectedPlatforms.length < PLATFORM_IDS.length && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedPlatforms.length}
                    </Badge>
                  )}
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                
                {showFilters && (
                  <div className="mt-3 p-3 rounded-lg bg-secondary/30">
                    <PlatformFilters
                      selectedPlatforms={selectedPlatforms}
                      onChange={setSelectedPlatforms}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Additional context <span className="text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  placeholder={searchMode === "image" 
                    ? "Add any known details: name hints, location, profession, etc." 
                    : "Add any helpful details: location, company, profession, etc."}
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  rows={2}
                  disabled={isSearching}
                />
              </div>

              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="gap-1">
                  <Coins className="h-3 w-3" />
                  {currentCreditCost} credits
                </Badge>
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || (searchMode === "image" ? !uploadedImage : !searchQuery.trim())}
                  className="gap-2"
                  size="lg"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isUploading ? "Uploading..." : "Searching..."}
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Search failed</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {isSearching && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-24 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && !isSearching && (
            <ScrollArea className="flex-1">
              <div className="space-y-4">
                {/* Export/Share Actions */}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleExportResults}>
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleShareResults}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>

                {/* Summary */}
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI Summary
                    </h2>
                    <div className="space-y-4">
                      {result.summary.split("\n").map((paragraph, i) => {
                        const trimmed = paragraph.trim();
                        if (!trimmed) return null;
                        
                        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
                          return (
                            <h3 key={i} className="font-semibold text-foreground mt-4 first:mt-0">
                              {trimmed.replace(/\*\*/g, "")}
                            </h3>
                          );
                        }
                        
                        if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
                          const bulletContent = trimmed.replace(/^[•\-*]\s*/, "");
                          return (
                            <div key={i} className="flex gap-2 text-muted-foreground leading-relaxed">
                              <span className="text-primary shrink-0">•</span>
                              <span>{bulletContent}</span>
                            </div>
                          );
                        }
                        
                        if (trimmed.endsWith(":") && trimmed.length < 50) {
                          return (
                            <h3 key={i} className="font-semibold text-foreground mt-4 first:mt-0">
                              {trimmed.replace(/\*\*/g, "")}
                            </h3>
                          );
                        }
                        
                        return (
                          <p key={i} className="text-muted-foreground leading-relaxed">
                            {trimmed.replace(/\*\*/g, "")}
                          </p>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Social Profiles */}
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-primary" />
                      Social Profiles Found
                      {result.profiles.length > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {result.profiles.length}
                        </Badge>
                      )}
                    </h2>
                    {result.profiles.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {result.profiles.map((profile, i) => (
                          <ProfileCard key={i} profile={profile} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No social profiles found</p>
                        <p className="text-sm mt-1">Try adding more context or details to your search</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sources */}
                {result.sources.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-lg font-semibold mb-3">Sources</h2>
                      <div className="flex flex-wrap gap-2">
                        {result.sources.slice(0, 10).map((source, i) => (
                          <a
                            key={i}
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-secondary/50 hover:bg-secondary rounded-full transition-colors truncate max-w-[200px]"
                          >
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {new URL(source).hostname.replace("www.", "")}
                            </span>
                          </a>
                        ))}
                        {result.sources.length > 10 && (
                          <span className="px-3 py-1.5 text-xs text-muted-foreground">
                            +{result.sources.length - 10} more
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Not what you're looking for? Suggestions */}
                <Alert className="bg-secondary/30 border-secondary">
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription className="ml-2">
                    <p className="font-medium text-foreground mb-2">Not what you're looking for?</p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary shrink-0">•</span>
                        <span>Try a different search mode — switch between <strong>Name</strong>, <strong>Email/Phone</strong>, or <strong>Photo</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary shrink-0">•</span>
                        <span>Add more context — include location, workplace, or profession in the additional info</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary shrink-0">•</span>
                        <span>Adjust platform filters — focus on specific platforms where the person is more active</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary shrink-0">•</span>
                        <span>Try alternate spellings or nicknames — people often use variations of their name online</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary shrink-0">•</span>
                        <span>Upload a clearer photo — if using image search, a front-facing photo works best</span>
                      </li>
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={() => {
                        setResult(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Try a New Search
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            </ScrollArea>
          )}

          {/* Empty State */}
          {!result && !isSearching && !error && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Enter a name, email, phone, or upload a photo to search</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FingerprintAITool;
