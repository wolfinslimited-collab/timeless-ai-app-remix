import { useState } from "react";
import { ArrowLeft, DollarSign, Search, Camera, TrendingUp, TrendingDown, Minus, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileFinancialAIProps {
  onBack: () => void;
}

interface AnalysisResult {
  symbol: string;
  name: string;
  sentiment: "bullish" | "bearish" | "neutral";
  score: number;
  technicalSummary: string;
  keyLevels: { support: string; resistance: string };
  recommendation: string;
}

export function MobileFinancialAI({ onBack }: MobileFinancialAIProps) {
  const [searchMode, setSearchMode] = useState<"text" | "image">("text");
  const [query, setQuery] = useState("");
  const [deepMode, setDeepMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setResult({
        symbol: query.toUpperCase(),
        name: query.toUpperCase() === "BTC" ? "Bitcoin" : query.toUpperCase(),
        sentiment: "bullish",
        score: 78,
        technicalSummary: "Strong upward momentum with increasing volume. RSI at 62 suggests room for further growth. MACD shows bullish crossover.",
        keyLevels: { support: "$42,500", resistance: "$48,000" },
        recommendation: "Consider accumulating on pullbacks to support levels. Set stop-loss below $41,000.",
      });
      setIsLoading(false);
    }, 2000);
  };

  const quickAssets = [
    { symbol: "BTC", label: "₿ Bitcoin" },
    { symbol: "ETH", label: "Ξ Ethereum" },
    { symbol: "SOL", label: "◎ Solana" },
    { symbol: "AAPL", label: "🍎 Apple" },
    { symbol: "TSLA", label: "📈 Tesla" },
    { symbol: "NVDA", label: "🔍 Nvidia" },
  ];

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "bullish": return TrendingUp;
      case "bearish": return TrendingDown;
      default: return Minus;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "bullish": return "text-green-500";
      case "bearish": return "text-red-500";
      default: return "text-amber-500";
    }
  };

  if (result) {
    const SentimentIcon = getSentimentIcon(result.sentiment);
    
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
          <button onClick={() => setResult(null)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground flex-1">Analysis Results</h1>
          <button className="p-2">
            <Bookmark className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Symbol Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
              <DollarSign className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{result.symbol}</h2>
              <p className="text-sm text-muted-foreground">{result.name}</p>
            </div>
          </div>

          {/* Sentiment Score */}
          <div className={cn(
            "p-5 rounded-2xl border",
            result.sentiment === "bullish" && "bg-green-500/10 border-green-500/30",
            result.sentiment === "bearish" && "bg-red-500/10 border-red-500/30",
            result.sentiment === "neutral" && "bg-amber-500/10 border-amber-500/30"
          )}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Overall Sentiment</span>
              <div className={cn("flex items-center gap-1", getSentimentColor(result.sentiment))}>
                <SentimentIcon className="w-4 h-4" />
                <span className="text-sm font-medium capitalize">{result.sentiment}</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">{result.score}</span>
              <span className="text-muted-foreground">/100</span>
            </div>
          </div>

          {/* Key Levels */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">Support</p>
              <p className="text-lg font-bold text-green-500">{result.keyLevels.support}</p>
            </div>
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-xs text-muted-foreground mb-1">Resistance</p>
              <p className="text-lg font-bold text-red-500">{result.keyLevels.resistance}</p>
            </div>
          </div>

          {/* Technical Summary */}
          <div className="p-4 bg-secondary rounded-xl">
            <h3 className="text-sm font-semibold text-foreground mb-2">Technical Analysis</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.technicalSummary}</p>
          </div>

          {/* Recommendation */}
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <h3 className="text-sm font-semibold text-primary mb-2">Recommendation</h3>
            <p className="text-sm text-foreground leading-relaxed">{result.recommendation}</p>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={() => setResult(null)}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            New Analysis
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
        <h1 className="text-base font-semibold text-foreground">Financial AI</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Hero Card */}
        <div className="p-5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Financial AI</h2>
              <p className="text-sm text-white/70">AI-powered market analysis</p>
            </div>
          </div>
          <div className="inline-block px-3 py-1 bg-white/20 rounded-full">
            <span className="text-xs text-white font-medium">
              {deepMode ? "🔬 Deep Research: 15 credits" : "📊 Standard: 5 credits"}
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
            Symbol Search
          </button>
          <button
            onClick={() => setSearchMode("image")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
              searchMode === "image" ? "bg-card text-foreground" : "text-muted-foreground"
            )}
          >
            <Camera className="w-4 h-4" />
            Chart Analysis
          </button>
        </div>

        {/* Search Input */}
        {searchMode === "text" ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g., BTC, ETH, AAPL)"
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button className="p-6 bg-card border border-dashed border-border rounded-xl flex flex-col items-center gap-2">
              <Camera className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Gallery</span>
            </button>
            <button className="p-6 bg-card border border-dashed border-border rounded-xl flex flex-col items-center gap-2">
              <Camera className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Camera</span>
            </button>
          </div>
        )}

        {/* Deep Mode Toggle */}
        <div className="p-4 bg-card border border-border rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <span className="text-lg">🔬</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Deep Research Mode</p>
              <p className="text-xs text-muted-foreground">Institutional-grade analysis</p>
            </div>
            <button
              onClick={() => setDeepMode(!deepMode)}
              className={cn(
                "w-12 h-7 rounded-full transition-colors relative",
                deepMode ? "bg-primary" : "bg-muted"
              )}
            >
              <div className={cn(
                "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform",
                deepMode ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>
        </div>

        {/* Analyze Button */}
        <button
          onClick={handleAnalyze}
          disabled={!query.trim() || isLoading}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50"
        >
          {isLoading ? "Analyzing..." : "Generate Analysis"}
        </button>

        {/* Quick Assets */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Popular Assets</h3>
          <div className="flex flex-wrap gap-2">
            {quickAssets.map((asset) => (
              <button
                key={asset.symbol}
                onClick={() => setQuery(asset.symbol)}
                className="px-3 py-1.5 bg-secondary rounded-full text-sm text-muted-foreground"
              >
                {asset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
