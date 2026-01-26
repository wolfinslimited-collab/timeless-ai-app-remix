import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import {
  Search,
  TrendingUp,
  BarChart3,
  LineChart,
  Activity,
  Globe,
  Twitter,
  Wallet,
  FileText,
  Target,
  CheckCircle,
  Loader2,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  CandlestickChart,
  Wifi,
  WifiOff,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Camera,
  X,
  Brain,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import FinancialCharts, { PriceDataPoint } from "./FinancialCharts";

import FinancialPortfolio from "./FinancialPortfolio";

interface AnalysisSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  status: "pending" | "loading" | "complete";
  content?: string;
  sentiment?: "bullish" | "bearish" | "neutral";
  keyPoints?: string[];
}

interface ResearchResult {
  asset: string;
  timestamp: string;
  overallSentiment: "bullish" | "bearish" | "neutral";
  priceTarget?: string;
  sections: AnalysisSection[];
}

interface RealPriceData {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  assetType?: 'crypto' | 'stock';
  isSimulated?: boolean;
  data: PriceDataPoint[];
}

const CREDIT_COST_STANDARD = 5;
const CREDIT_COST_DEEP = 15;

const FinancialAITool = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const [query, setQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [realPriceData, setRealPriceData] = useState<RealPriceData | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [priceDataError, setPriceDataError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"research" | "portfolio">("research");
  
  // New state for image upload and deep mode
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deepMode, setDeepMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sectionTemplates: Omit<AnalysisSection, "content" | "keyPoints">[] = [
    { id: "executive", title: "Executive Summary", icon: <FileText className="h-4 w-4" />, status: "pending" },
    { id: "technical", title: "Technical Outlook", icon: <LineChart className="h-4 w-4" />, status: "pending" },
    { id: "derivatives", title: "Derivatives & Sentiment", icon: <BarChart3 className="h-4 w-4" />, status: "pending" },
    { id: "onchain", title: "OnChain & Fundamental", icon: <Activity className="h-4 w-4" />, status: "pending" },
    { id: "news", title: "Market Structure & News", icon: <Globe className="h-4 w-4" />, status: "pending" },
    { id: "social", title: "Social & Twitter Sentiment", icon: <Twitter className="h-4 w-4" />, status: "pending" },
    { id: "whale", title: "Whale Activity", icon: <Wallet className="h-4 w-4" />, status: "pending" },
    { id: "actionable", title: "Actionable Trading Plan", icon: <Target className="h-4 w-4" />, status: "pending" },
    { id: "conclusion", title: "Conclusion", icon: <CheckCircle className="h-4 w-4" />, status: "pending" },
  ];

  const currentCreditCost = deepMode ? CREDIT_COST_DEEP : CREDIT_COST_STANDARD;

  // Extract crypto/stock symbol from natural language query
  const extractSymbol = (text: string): string | null => {
    const upperText = text.toUpperCase();
    
    // Common crypto/stock symbols to look for
    const knownSymbols = [
      // Crypto
      'BTC', 'BITCOIN', 'ETH', 'ETHEREUM', 'SOL', 'SOLANA', 'XRP', 'RIPPLE',
      'ADA', 'CARDANO', 'DOGE', 'DOGECOIN', 'BNB', 'DOT', 'POLKADOT',
      'MATIC', 'POLYGON', 'LINK', 'CHAINLINK', 'AVAX', 'AVALANCHE',
      'LTC', 'LITECOIN', 'UNI', 'UNISWAP', 'ATOM', 'COSMOS', 'XLM', 'STELLAR',
      'SHIB', 'PEPE', 'SUI', 'APT', 'APTOS', 'ARB', 'ARBITRUM', 'OP', 'OPTIMISM',
      // Common stocks
      'AAPL', 'TSLA', 'GOOGL', 'GOOG', 'MSFT', 'AMZN', 'NVDA', 'META', 'NFLX',
      'AMD', 'INTC', 'ORCL', 'IBM', 'CRM', 'ADBE', 'PYPL', 'SQ', 'SHOP', 'UBER',
      'DIS', 'WMT', 'TGT', 'COST', 'HD', 'NKE', 'SBUX', 'MCD', 'KO', 'PEP',
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'V', 'MA', 'AXP',
      'JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'LLY', 'BMY', 'GILD', 'AMGN', 'MRNA',
      'XOM', 'CVX', 'BA', 'LMT', 'RTX', 'GE', 'CAT',
      'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'ARKK'
    ];
    
    // First, try to find a known symbol in the text
    for (const symbol of knownSymbols) {
      // Match whole word only
      const regex = new RegExp(`\\b${symbol}\\b`, 'i');
      if (regex.test(upperText)) {
        // Return the shorter ticker version
        const tickerMap: Record<string, string> = {
          'BITCOIN': 'BTC', 'ETHEREUM': 'ETH', 'SOLANA': 'SOL', 'RIPPLE': 'XRP',
          'CARDANO': 'ADA', 'DOGECOIN': 'DOGE', 'POLKADOT': 'DOT', 'POLYGON': 'MATIC',
          'CHAINLINK': 'LINK', 'AVALANCHE': 'AVAX', 'LITECOIN': 'LTC', 'UNISWAP': 'UNI',
          'COSMOS': 'ATOM', 'STELLAR': 'XLM', 'APTOS': 'APT', 'ARBITRUM': 'ARB', 'OPTIMISM': 'OP'
        };
        return tickerMap[symbol] || symbol;
      }
    }
    
    // If no known symbol, check if it's a short alphanumeric (likely a ticker)
    const words = upperText.split(/\s+/);
    for (const word of words) {
      // Match 2-5 letter words that look like tickers
      if (/^[A-Z]{2,5}$/.test(word) && !['THE', 'AND', 'FOR', 'NOW', 'NOT', 'YES', 'LONG', 'SHORT', 'BUY', 'SELL', 'HOLD'].includes(word)) {
        return word;
      }
    }
    
    return null;
  };

  // Handle image file selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Fetch real price data when query changes
  const fetchRealPriceData = async (symbol: string) => {
    // Extract the actual ticker symbol from the query
    const extractedSymbol = extractSymbol(symbol);
    
    if (!extractedSymbol) {
      setPriceDataError("Could not identify asset symbol");
      setRealPriceData(null);
      return;
    }
    
    setIsLoadingPrices(true);
    setPriceDataError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke("crypto-prices", {
        body: { symbol: extractedSymbol, days: 30 },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setRealPriceData({
          symbol: data.symbol,
          currentPrice: data.currentPrice,
          priceChange24h: data.priceChange24h,
          assetType: data.assetType,
          isSimulated: data.isSimulated,
          data: data.data,
        });
        console.log(`Fetched ${data.data.length} price points for ${data.symbol}`);
      } else {
        setPriceDataError(data?.error || "Failed to fetch price data");
        setRealPriceData(null);
      }
    } catch (error: any) {
      console.error("Price data fetch error:", error);
      setPriceDataError(error.message || "Failed to fetch live prices");
      setRealPriceData(null);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Fetch price data when analysis starts
  useEffect(() => {
    if (result?.asset) {
      fetchRealPriceData(result.asset);
      setIsSaved(false); // Reset saved state for new analysis
    }
  }, [result?.asset]);

  // Save report to portfolio
  const handleSaveReport = async () => {
    if (!user || !result) return;

    setIsSaving(true);
    try {
      const extractedSymbol = extractSymbol(result.asset) || result.asset;
      
      // Collect all key points from sections
      const allKeyPoints = result.sections
        .flatMap(s => s.keyPoints || [])
        .slice(0, 10);

      const { error } = await supabase.from("financial_reports").insert({
        user_id: user.id,
        symbol: extractedSymbol,
        asset_type: realPriceData?.assetType || "crypto",
        analysis_content: result.sections.map(s => s.content || "").join("\n\n"),
        price_data: realPriceData ? {
          currentPrice: realPriceData.currentPrice,
          priceChange24h: realPriceData.priceChange24h,
        } : null,
        technical_data: {
          overallSentiment: result.overallSentiment,
          priceTarget: result.priceTarget,
          keyPoints: allKeyPoints,
        },
      });

      if (error) throw error;

      setIsSaved(true);
      toast({
        title: "Report saved",
        description: `${extractedSymbol} analysis added to your portfolio`,
      });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Failed to save",
        description: error.message || "Could not save the report",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!query.trim() && !selectedImage) {
      toast({
        title: "Enter an asset or upload an image",
        description: "Please enter a cryptocurrency/stock symbol or upload a chart image to analyze",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to use Financial AI",
        variant: "destructive",
      });
      return;
    }

    if ((credits ?? 0) < currentCreditCost) {
      toast({
        title: "Insufficient credits",
        description: `You need ${currentCreditCost} credits for this analysis`,
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setActiveSection("executive");
    
    // Initialize result with pending sections
    const assetLabel = query.trim() ? query.toUpperCase() : "CHART ANALYSIS";
    const initialResult: ResearchResult = {
      asset: assetLabel,
      timestamp: new Date().toISOString(),
      overallSentiment: "neutral",
      sections: sectionTemplates.map(s => ({ ...s, status: "pending" as const })),
    };
    setResult(initialResult);

    try {
      const { data, error } = await supabase.functions.invoke("financial-ai", {
        body: { 
          query: query.trim(),
          deepMode,
          image: selectedImage,
        },
      });

      if (error) throw error;

      if (data?.analysis) {
        setResult({
          asset: assetLabel,
          timestamp: new Date().toISOString(),
          overallSentiment: data.analysis.overallSentiment || "neutral",
          priceTarget: data.analysis.priceTarget,
          sections: sectionTemplates.map(template => ({
            ...template,
            status: "complete" as const,
            content: data.analysis.sections?.[template.id]?.content || "",
            sentiment: data.analysis.sections?.[template.id]?.sentiment,
            keyPoints: data.analysis.sections?.[template.id]?.keyPoints || [],
          })),
        });
        refetchCredits();
        toast({
          title: "Analysis complete",
          description: `${deepMode ? "Deep research" : "Research"} report for ${assetLabel} is ready`,
        });
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze. Please try again.",
        variant: "destructive",
      });
      setResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSentimentColor = (sentiment?: "bullish" | "bearish" | "neutral") => {
    switch (sentiment) {
      case "bullish": return "text-green-500";
      case "bearish": return "text-red-500";
      default: return "text-yellow-500";
    }
  };

  const getSentimentIcon = (sentiment?: "bullish" | "bearish" | "neutral") => {
    switch (sentiment) {
      case "bullish": return <ArrowUpRight className="h-4 w-4" />;
      case "bearish": return <ArrowDownRight className="h-4 w-4" />;
      default: return <Minus className="h-4 w-4" />;
    }
  };

  const getSentimentBg = (sentiment?: "bullish" | "bearish" | "neutral") => {
    switch (sentiment) {
      case "bullish": return "bg-green-500/10 border-green-500/20";
      case "bearish": return "bg-red-500/10 border-red-500/20";
      default: return "bg-yellow-500/10 border-yellow-500/20";
    }
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-500">Financial AI Research</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Market Intelligence</h1>
        <p className="text-muted-foreground">
          AI-powered research reports with technical, fundamental, and sentiment analysis
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "research" | "portfolio")} className="flex-1 flex flex-col">
        <TabsList className="mx-auto mb-6 w-fit">
          <TabsTrigger value="research" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Research
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="research" className="flex-1 flex flex-col mt-0">

      {/* Search Input with Image Upload and Deep Mode */}
      <Card className="p-4 mb-6 space-y-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        
        {/* Image Preview */}
        {selectedImage && (
          <div className="relative inline-block">
            <img 
              src={selectedImage} 
              alt="Chart preview" 
              className="max-h-32 rounded-lg border border-border"
            />
            <Button
              variant="secondary"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={clearImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={selectedImage ? "Add context (optional)" : "Enter asset (e.g., BTC, ETH, AAPL, TSLA)"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isAnalyzing && handleAnalyze()}
              className="pl-10"
              disabled={isAnalyzing}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            title="Upload chart image"
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (!query.trim() && !selectedImage)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {deepMode ? "Deep analyzing..." : "Analyzing..."}
              </>
            ) : (
              <>
                {deepMode ? <Brain className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                Analyze ({currentCreditCost} credits)
              </>
            )}
          </Button>
        </div>

        {/* Deep Mode Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3">
            <Switch
              id="deep-mode"
              checked={deepMode}
              onCheckedChange={setDeepMode}
              disabled={isAnalyzing}
            />
            <Label htmlFor="deep-mode" className="flex items-center gap-2 cursor-pointer">
              <Brain className={cn("h-4 w-4", deepMode ? "text-purple-500" : "text-muted-foreground")} />
              <span className={cn("font-medium", deepMode && "text-purple-500")}>Deep Research Mode</span>
            </Label>
          </div>
          {deepMode && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="gap-1 bg-purple-500/10 text-purple-500 border-purple-500/20">
                <Brain className="h-3 w-3" />
                {CREDIT_COST_DEEP} credits
              </Badge>
              <span>Institutional-grade analysis</span>
            </div>
          )}
        </div>
      </Card>

      {/* Results Dashboard */}
      {result && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          {/* Sections Navigation */}
          <Card className="lg:col-span-4 xl:col-span-3 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Sections of Research</h2>
              {!isAnalyzing && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAnalyze}
                  className="h-8 w-8"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Overall Sentiment */}
            <div className={cn(
              "p-3 rounded-lg border mb-4",
              getSentimentBg(result.overallSentiment)
            )}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{result.asset}</span>
                <div className={cn("flex items-center gap-1", getSentimentColor(result.overallSentiment))}>
                  {getSentimentIcon(result.overallSentiment)}
                  <span className="text-sm font-medium capitalize">{result.overallSentiment}</span>
                </div>
              </div>
              {result.priceTarget && (
                <p className="text-xs text-muted-foreground mt-1">Target: {result.priceTarget}</p>
              )}
            </div>

            {/* Save to Portfolio Button */}
            <Button
              variant={isSaved ? "secondary" : "outline"}
              size="sm"
              onClick={handleSaveReport}
              disabled={isSaving || isSaved || !user}
              className="w-full mb-4 gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isSaved ? (
                <>
                  <BookmarkCheck className="h-4 w-4 text-green-500" />
                  Saved to Portfolio
                </>
              ) : (
                <>
                  <Bookmark className="h-4 w-4" />
                  Save to Portfolio
                </>
              )}
            </Button>

            <ScrollArea className="h-[400px] lg:h-[calc(100vh-450px)]">
              <div className="space-y-1 pr-3">
                {result.sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                      activeSection === section.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-secondary/50"
                    )}
                  >
                    <span className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold",
                      activeSection === section.id
                        ? "bg-primary text-primary-foreground"
                        : section.status === "complete"
                        ? getSentimentBg(section.sentiment)
                        : "bg-secondary"
                    )}>
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        activeSection === section.id && "text-primary"
                      )}>
                        {section.title}
                      </p>
                    </div>
                    {section.status === "loading" && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {section.status === "complete" && section.sentiment && (
                      <span className={getSentimentColor(section.sentiment)}>
                        {getSentimentIcon(section.sentiment)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Section Content with Charts */}
          <Card className="lg:col-span-8 xl:col-span-9 p-6 overflow-hidden">
            <Tabs defaultValue="analysis" className="h-full flex flex-col">
              <TabsList className="mb-4 w-fit">
                <TabsTrigger value="analysis" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Analysis
                </TabsTrigger>
                <TabsTrigger value="charts" className="gap-2">
                  <CandlestickChart className="h-4 w-4" />
                  Charts
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="analysis" className="flex-1 mt-0">
                <ScrollArea className="h-[450px] lg:h-[calc(100vh-400px)]">
                  {activeSection && (
                    <div className="pr-4">
                      {(() => {
                        const section = result.sections.find(s => s.id === activeSection);
                        if (!section) return null;

                        if (isAnalyzing || section.status === "loading") {
                          return (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-lg bg-primary/10">
                                  {section.icon}
                                </div>
                                <div>
                                  <Skeleton className="h-6 w-48 mb-2" />
                                  <Skeleton className="h-4 w-32" />
                                </div>
                              </div>
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-5/6" />
                              <Skeleton className="h-4 w-4/6" />
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-4 w-3/4" />
                            </div>
                          );
                        }

                        return (
                          <div>
                            <div className="flex items-center gap-3 mb-6">
                              <div className={cn(
                                "p-2.5 rounded-lg",
                                getSentimentBg(section.sentiment)
                              )}>
                                {section.icon}
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold">{section.title}</h3>
                                {section.sentiment && (
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "mt-1",
                                      getSentimentColor(section.sentiment),
                                      getSentimentBg(section.sentiment)
                                    )}
                                  >
                                    {getSentimentIcon(section.sentiment)}
                                    <span className="ml-1 capitalize">{section.sentiment}</span>
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {section.keyPoints && section.keyPoints.length > 0 && (
                              <div className="mb-6 p-4 rounded-lg bg-secondary/30 border border-border/50">
                                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                  <Target className="h-4 w-4 text-primary" />
                                  Key Points
                                </h4>
                                <ul className="space-y-2">
                                  {section.keyPoints.map((point, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                      <span className="text-primary mt-0.5">•</span>
                                      <span className="text-muted-foreground">{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="prose prose-sm prose-invert max-w-none">
                              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {section.content || "No analysis available for this section."}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="charts" className="flex-1 mt-0">
                <ScrollArea className="h-[450px] lg:h-[calc(100vh-400px)]">
                  <div className="pr-4">
                    {/* Live data indicator */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        {realPriceData ? (
                          <>
                            {realPriceData.isSimulated ? (
                              <WifiOff className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <Wifi className="h-4 w-4 text-green-500" />
                            )}
                            <span className={cn(
                              "text-sm",
                              realPriceData.isSimulated ? "text-yellow-500" : "text-green-500"
                            )}>
                              {realPriceData.isSimulated ? "Simulated" : "Live Data"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {realPriceData.assetType === 'stock' ? '📈 Stock' : '🪙 Crypto'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ${realPriceData.currentPrice.toLocaleString(undefined, { 
                                minimumFractionDigits: realPriceData.currentPrice < 1 ? 4 : 2,
                                maximumFractionDigits: realPriceData.currentPrice < 1 ? 6 : 2 
                              })}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs",
                                realPriceData.priceChange24h >= 0 
                                  ? "text-green-500 bg-green-500/10" 
                                  : "text-red-500 bg-red-500/10"
                              )}
                            >
                              {realPriceData.priceChange24h >= 0 ? "+" : ""}
                              {realPriceData.priceChange24h}%
                            </Badge>
                          </>
                        ) : isLoadingPrices ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Loading live prices...</span>
                          </>
                        ) : priceDataError ? (
                          <>
                            <WifiOff className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-yellow-500">Simulated Data</span>
                            <span className="text-xs text-muted-foreground">({priceDataError})</span>
                          </>
                        ) : null}
                      </div>
                      {priceDataError && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => fetchRealPriceData(result.asset)}
                          className="gap-1 text-xs"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retry
                        </Button>
                      )}
                    </div>
                    
                    <FinancialCharts 
                      asset={result.asset} 
                      sentiment={result.overallSentiment}
                      realData={realPriceData?.data}
                      isLoading={isLoadingPrices}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

            </Tabs>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!result && !isAnalyzing && (
        <Card className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Start Your Research</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Enter any cryptocurrency or stock symbol to get a comprehensive AI-powered research report
            with technical analysis, on-chain metrics, social sentiment, and trading recommendations.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["BTC", "ETH", "SOL", "AAPL", "TSLA", "NVDA"].map((symbol) => (
              <Button
                key={symbol}
                variant="outline"
                size="sm"
                onClick={() => setQuery(symbol)}
                className="gap-1"
              >
                {symbol}
              </Button>
            ))}
          </div>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="portfolio" className="flex-1 mt-0">
          <FinancialPortfolio 
            onViewReport={(report) => {
              setQuery(report.symbol);
              setActiveTab("research");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialAITool;
