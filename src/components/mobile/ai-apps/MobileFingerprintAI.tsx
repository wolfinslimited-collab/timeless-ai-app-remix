import { useState } from "react";
import { ArrowLeft, Fingerprint, Search, Camera, Image, Shield, ExternalLink, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileFingerprintAIProps {
  onBack: () => void;
}

interface SearchResult {
  summary: string;
  profiles: {
    platform: string;
    name: string;
    username?: string;
    url: string;
    confidence: "high" | "medium" | "low";
  }[];
}

export function MobileFingerprintAI({ onBack }: MobileFingerprintAIProps) {
  const [searchMode, setSearchMode] = useState<"text" | "image">("text");
  const [query, setQuery] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);

  const handleSearch = () => {
    if (searchMode === "text" && !query.trim()) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setResult({
        summary: `Found multiple social profiles potentially associated with "${query}". The most likely matches are from LinkedIn and Twitter based on name correlation and public data.`,
        profiles: [
          { platform: "LinkedIn", name: query || "John Doe", username: "johndoe", url: "https://linkedin.com/in/johndoe", confidence: "high" },
          { platform: "Twitter", name: query || "John Doe", username: "@johndoe", url: "https://twitter.com/johndoe", confidence: "high" },
          { platform: "Instagram", name: query || "John", url: "https://instagram.com/john.doe", confidence: "medium" },
          { platform: "Facebook", name: query || "John Doe", url: "https://facebook.com/johndoe123", confidence: "low" },
        ],
      });
      setIsLoading(false);
    }, 2000);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "linkedin": return "💼";
      case "instagram": return "📸";
      case "twitter": return "🐦";
      case "facebook": return "📘";
      case "tiktok": return "🎵";
      case "youtube": return "📺";
      default: return "🔗";
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high": return "bg-green-500/20 text-green-500";
      case "medium": return "bg-amber-500/20 text-amber-500";
      case "low": return "bg-red-500/20 text-red-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (result) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
          <button onClick={() => setResult(null)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Search Results</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Summary */}
          <div className="p-4 bg-card border border-border rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Summary</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
          </div>

          {/* Profiles */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Found Profiles ({result.profiles.length})</h3>
            <div className="space-y-2">
              {result.profiles.map((profile, i) => (
                <button
                  key={i}
                  className="w-full p-4 bg-card border border-border rounded-xl flex items-center gap-3 text-left"
                >
                  <span className="text-2xl">{getPlatformIcon(profile.platform)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{profile.name}</p>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium uppercase",
                        getConfidenceColor(profile.confidence)
                      )}>
                        {profile.confidence}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{profile.platform}</p>
                    {profile.username && (
                      <p className="text-xs text-primary">{profile.username}</p>
                    )}
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-green-500">Privacy Note</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Only publicly available information was accessed. No private data is stored.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={() => setResult(null)}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            New Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Fingerprint AI</h1>
        <div className="flex-1" />
        <button className="p-2">
          <History className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Hero Card */}
        <div className="p-5 bg-gradient-to-br from-violet-500 to-pink-500 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Fingerprint className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Fingerprint AI</h2>
              <p className="text-sm text-white/70">Find anyone's digital footprint</p>
            </div>
          </div>
          <div className="inline-block px-3 py-1 bg-white/20 rounded-full">
            <span className="text-xs text-white font-medium">
              {searchMode === "image" ? "📸 Image: 3 credits" : "🔍 Text: 2 credits"}
            </span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="p-1 bg-secondary rounded-xl flex">
          <button
            onClick={() => setSearchMode("text")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              searchMode === "text" ? "bg-card text-foreground" : "text-muted-foreground"
            )}
          >
            <Search className="w-4 h-4" />
            Search by Name
          </button>
          <button
            onClick={() => setSearchMode("image")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              searchMode === "image" ? "bg-card text-foreground" : "text-muted-foreground"
            )}
          >
            <Camera className="w-4 h-4" />
            Search by Photo
          </button>
        </div>

        {/* Search Input */}
        {searchMode === "text" ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter full name (e.g., John Doe)"
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button className="p-6 bg-card border border-dashed border-border rounded-xl flex flex-col items-center gap-2">
              <Image className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Gallery</span>
            </button>
            <button className="p-6 bg-card border border-dashed border-border rounded-xl flex flex-col items-center gap-2">
              <Camera className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Camera</span>
            </button>
          </div>
        )}

        {/* Additional Info */}
        <input
          type="text"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder="Additional info (job, location, company...)"
          className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
        />

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={searchMode === "text" && !query.trim() || isLoading}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            "Searching..."
          ) : (
            <>
              <Search className="w-4 h-4" />
              Find Digital Footprint
            </>
          )}
        </button>

        {/* Privacy Card */}
        <div className="p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-foreground">Privacy First</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We only search publicly available information. No private data is accessed or stored.
          </p>
        </div>
      </div>
    </div>
  );
}
