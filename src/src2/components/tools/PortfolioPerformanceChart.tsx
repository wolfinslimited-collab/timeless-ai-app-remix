import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, RefreshCw, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceDataPoint {
  date: string;
  timestamp: number;
  price: number;
}

interface AssetPerformance {
  symbol: string;
  assetType: string;
  data: PriceDataPoint[];
  currentPrice: number;
  percentChange: number;
}

// Colors for different assets in the chart
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#8b5cf6",
];

const TIME_PERIODS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

const PortfolioPerformanceChart = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [performances, setPerformances] = useState<AssetPerformance[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceData = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch saved reports to get symbols
      const { data: reports, error: reportsError } = await supabase
        .from("financial_reports")
        .select("symbol, asset_type")
        .eq("user_id", user.id);

      if (reportsError) throw reportsError;

      if (!reports || reports.length === 0) {
        setPerformances([]);
        setIsLoading(false);
        return;
      }

      // Get unique symbols
      const uniqueAssets = Array.from(
        new Map(reports.map((r) => [r.symbol, r])).values()
      );

      // Fetch price data for each asset
      const performancePromises = uniqueAssets.slice(0, 5).map(async (asset) => {
        try {
          const response = await supabase.functions.invoke("crypto-prices", {
            body: { symbol: asset.symbol, days: selectedPeriod },
          });

          if (response.error) {
            console.error(`Error fetching ${asset.symbol}:`, response.error);
            return null;
          }

          const priceData = response.data;
          if (!priceData?.data || priceData.data.length === 0) return null;

          const firstPrice = priceData.data[0]?.price || 0;
          const lastPrice = priceData.data[priceData.data.length - 1]?.price || 0;
          const percentChange = firstPrice > 0 
            ? ((lastPrice - firstPrice) / firstPrice) * 100 
            : 0;

          return {
            symbol: asset.symbol.toUpperCase(),
            assetType: asset.asset_type || priceData.assetType || "crypto",
            data: priceData.data,
            currentPrice: lastPrice,
            percentChange,
          } as AssetPerformance;
        } catch (err) {
          console.error(`Failed to fetch ${asset.symbol}:`, err);
          return null;
        }
      });

      const results = await Promise.all(performancePromises);
      setPerformances(results.filter((r): r is AssetPerformance => r !== null));
    } catch (err: any) {
      console.error("Error fetching performance data:", err);
      setError(err.message || "Failed to load performance data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [user, selectedPeriod]);

  // Normalize data to percentage change for comparison
  const chartData = useMemo(() => {
    if (performances.length === 0) return [];

    // Find the maximum number of data points
    const maxLength = Math.max(...performances.map((p) => p.data.length));
    
    // Get all unique dates
    const allDates = new Set<string>();
    performances.forEach((p) => {
      p.data.forEach((d) => allDates.add(d.date));
    });
    const sortedDates = Array.from(allDates).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    // Build chart data with normalized percentages
    return sortedDates.map((date) => {
      const point: Record<string, number | string> = { date };
      
      performances.forEach((performance) => {
        const dataPoint = performance.data.find((d) => d.date === date);
        const firstPrice = performance.data[0]?.price || 1;
        
        if (dataPoint) {
          // Normalize to percentage change from start
          point[performance.symbol] = Number(
            (((dataPoint.price - firstPrice) / firstPrice) * 100).toFixed(2)
          );
        }
      });
      
      return point;
    });
  }, [performances]);

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </Card>
    );
  }

  if (performances.length === 0) {
    return (
      <Card className="p-6 text-center">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No performance data</h3>
        <p className="text-muted-foreground text-sm">
          Save research reports to track their performance over time
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          <h3 className="text-lg font-semibold">Portfolio Performance</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Time period selector */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {TIME_PERIODS.map((period) => (
              <Button
                key={period.days}
                variant={selectedPeriod === period.days ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-3"
                onClick={() => setSelectedPeriod(period.days)}
              >
                {period.label}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchPerformanceData}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Performance summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {performances.map((perf, index) => (
          <div
            key={perf.symbol}
            className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border"
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{perf.symbol}</p>
              <p
                className={cn(
                  "text-xs font-medium",
                  perf.percentChange >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                {perf.percentChange >= 0 ? "+" : ""}
                {perf.percentChange.toFixed(2)}%
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [`${value.toFixed(2)}%`, ""]}
            />
            <Legend />
            {performances.map((perf, index) => (
              <Line
                key={perf.symbol}
                type="monotone"
                dataKey={perf.symbol}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {error && (
        <p className="text-sm text-destructive mt-4 text-center">{error}</p>
      )}
    </Card>
  );
};

export default PortfolioPerformanceChart;
