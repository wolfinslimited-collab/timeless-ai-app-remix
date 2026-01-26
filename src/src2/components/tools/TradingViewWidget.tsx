import { useEffect, useRef, memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, LineChart, Activity, TrendingUp } from "lucide-react";

interface TradingViewWidgetProps {
  symbol: string;
  assetType?: "crypto" | "stock";
}

// Format symbol for TradingView
const formatTradingViewSymbol = (symbol: string, assetType?: "crypto" | "stock"): string => {
  const upperSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Crypto symbols need BINANCE or COINBASE prefix
  const cryptoSymbols = [
    "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "DOT", "MATIC", "LINK", "AVAX",
    "LTC", "UNI", "ATOM", "XLM", "SHIB", "PEPE", "SUI", "APT", "ARB", "OP", "BNB"
  ];
  
  if (assetType === "crypto" || cryptoSymbols.includes(upperSymbol)) {
    return `BINANCE:${upperSymbol}USDT`;
  }
  
  // Stock symbols - add NASDAQ or NYSE prefix
  const nasdaqStocks = [
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "META", "NVDA", "TSLA", "NFLX",
    "AMD", "INTC", "ORCL", "ADBE", "PYPL", "SQ", "SHOP", "UBER", "COST",
    "SBUX", "PEP", "MRNA", "GILD", "AMGN", "QQQ"
  ];
  
  if (nasdaqStocks.includes(upperSymbol)) {
    return `NASDAQ:${upperSymbol}`;
  }
  
  // Default to NYSE for other stocks
  return `NYSE:${upperSymbol}`;
};

// Advanced Chart Widget
const AdvancedChartWidget = memo(({ symbol, assetType }: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tradingViewSymbol = formatTradingViewSymbol(symbol, assetType);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing widget
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tradingViewSymbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
      studies: [
        "RSI@tv-basicstudies",
        "MASimple@tv-basicstudies",
        "MACD@tv-basicstudies"
      ]
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tradingViewSymbol]);

  return (
    <div className="tradingview-widget-container h-[500px]" ref={containerRef}>
      <div className="tradingview-widget-container__widget h-full"></div>
    </div>
  );
});

AdvancedChartWidget.displayName = "AdvancedChartWidget";

// Technical Analysis Widget
const TechnicalAnalysisWidget = memo(({ symbol, assetType }: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tradingViewSymbol = formatTradingViewSymbol(symbol, assetType);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: "1D",
      width: "100%",
      isTransparent: true,
      height: "450",
      symbol: tradingViewSymbol,
      showIntervalTabs: true,
      displayMode: "single",
      locale: "en",
      colorTheme: "dark"
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tradingViewSymbol]);

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
});

TechnicalAnalysisWidget.displayName = "TechnicalAnalysisWidget";

// Symbol Overview Widget
const SymbolOverviewWidget = memo(({ symbol, assetType }: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tradingViewSymbol = formatTradingViewSymbol(symbol, assetType);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [[tradingViewSymbol, tradingViewSymbol]],
      chartOnly: false,
      width: "100%",
      height: "400",
      locale: "en",
      colorTheme: "dark",
      autosize: false,
      showVolume: true,
      showMA: true,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      maLineColor: "#2962FF",
      maLineWidth: 1,
      maLength: 9,
      lineWidth: 2,
      lineType: 0,
      dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"]
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tradingViewSymbol]);

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
});

SymbolOverviewWidget.displayName = "SymbolOverviewWidget";

// Main TradingView Component
const TradingViewWidget = ({ symbol, assetType }: TradingViewWidgetProps) => {
  const tradingViewSymbol = formatTradingViewSymbol(symbol, assetType);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">TradingView Analysis</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {tradingViewSymbol}
        </Badge>
      </div>

      <Tabs defaultValue="advanced" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="advanced" className="gap-2 text-xs sm:text-sm">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Advanced</span> Chart
          </TabsTrigger>
          <TabsTrigger value="technical" className="gap-2 text-xs sm:text-sm">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Technical</span> Analysis
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2 text-xs sm:text-sm">
            <LineChart className="h-3 w-3 sm:h-4 sm:w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="advanced" className="mt-4">
          <Card className="p-2 overflow-hidden">
            <AdvancedChartWidget symbol={symbol} assetType={assetType} />
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="mt-4">
          <Card className="p-4">
            <TechnicalAnalysisWidget symbol={symbol} assetType={assetType} />
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="mt-4">
          <Card className="p-4">
            <SymbolOverviewWidget symbol={symbol} assetType={assetType} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradingViewWidget;
