import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Line,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PriceDataPoint {
  timestamp?: number;
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FinancialChartsProps {
  asset: string;
  sentiment: "bullish" | "bearish" | "neutral";
  realData?: PriceDataPoint[] | null;
  isLoading?: boolean;
}

// Generate simulated technical data based on sentiment
const generatePriceData = (sentiment: "bullish" | "bearish" | "neutral") => {
  const data = [];
  let basePrice = 100;
  const trendFactor = sentiment === "bullish" ? 1.02 : sentiment === "bearish" ? 0.98 : 1.0;
  
  for (let i = 0; i < 30; i++) {
    const volatility = (Math.random() - 0.5) * 4;
    basePrice = basePrice * trendFactor + volatility;
    basePrice = Math.max(basePrice, 50);
    
    const high = basePrice + Math.random() * 3;
    const low = basePrice - Math.random() * 3;
    const open = basePrice + (Math.random() - 0.5) * 2;
    const close = basePrice;
    
    data.push({
      day: i + 1,
      date: `Day ${i + 1}`,
      price: Number(basePrice.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      open: Number(open.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000) + 500000,
    });
  }
  return data;
};

// Calculate Simple Moving Average
const calculateSMA = (priceData: { price: number }[], period: number) => {
  return priceData.map((_, index) => {
    if (index < period - 1) return null;
    const slice = priceData.slice(index - period + 1, index + 1);
    const sum = slice.reduce((acc, d) => acc + d.price, 0);
    return Number((sum / period).toFixed(2));
  });
};

// Calculate Exponential Moving Average
const calculateEMA = (priceData: { price: number }[], period: number) => {
  const k = 2 / (period + 1);
  const emaData: (number | null)[] = [];
  
  for (let i = 0; i < priceData.length; i++) {
    if (i < period - 1) {
      emaData.push(null);
    } else if (i === period - 1) {
      // First EMA is SMA
      const slice = priceData.slice(0, period);
      const sma = slice.reduce((acc, d) => acc + d.price, 0) / period;
      emaData.push(Number(sma.toFixed(2)));
    } else {
      const prevEma = emaData[i - 1] as number;
      const ema = priceData[i].price * k + prevEma * (1 - k);
      emaData.push(Number(ema.toFixed(2)));
    }
  }
  return emaData;
};

// Calculate Bollinger Bands
const calculateBollingerBands = (priceData: { price: number }[], period = 20, multiplier = 2) => {
  return priceData.map((_, index) => {
    if (index < period - 1) {
      return { upper: null, middle: null, lower: null };
    }
    
    const slice = priceData.slice(index - period + 1, index + 1);
    const prices = slice.map(d => d.price);
    
    // Calculate SMA (middle band)
    const sma = prices.reduce((acc, p) => acc + p, 0) / period;
    
    // Calculate Standard Deviation
    const squaredDiffs = prices.map(p => Math.pow(p - sma, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, d) => acc + d, 0) / period;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    // Calculate bands
    const upper = sma + (multiplier * stdDev);
    const lower = sma - (multiplier * stdDev);
    
    return {
      upper: Number(upper.toFixed(2)),
      middle: Number(sma.toFixed(2)),
      lower: Number(lower.toFixed(2)),
    };
  });
};

// Calculate RSI
const calculateRSI = (priceData: { price: number }[], period = 14) => {
  const rsiData = [];
  
  for (let i = 0; i < priceData.length; i++) {
    if (i < period) {
      rsiData.push({ day: i + 1, rsi: 50 + (Math.random() - 0.5) * 20 });
    } else {
      let gains = 0;
      let losses = 0;
      
      for (let j = i - period + 1; j <= i; j++) {
        const change = priceData[j].price - priceData[j - 1].price;
        if (change > 0) gains += change;
        else losses -= change;
      }
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      
      rsiData.push({
        day: i + 1,
        date: `Day ${i + 1}`,
        rsi: Number(Math.min(100, Math.max(0, rsi)).toFixed(2)),
      });
    }
  }
  return rsiData;
};

// Calculate MACD
const calculateMACD = (priceData: { price: number }[]) => {
  const ema12: number[] = [];
  const ema26: number[] = [];
  const macdData = [];
  
  const k12 = 2 / (12 + 1);
  const k26 = 2 / (26 + 1);
  
  for (let i = 0; i < priceData.length; i++) {
    if (i === 0) {
      ema12.push(priceData[i].price);
      ema26.push(priceData[i].price);
    } else {
      ema12.push(priceData[i].price * k12 + ema12[i - 1] * (1 - k12));
      ema26.push(priceData[i].price * k26 + ema26[i - 1] * (1 - k26));
    }
    
    const macd = ema12[i] - ema26[i];
    const signal = i < 9 ? macd : macd * 0.2 + (macdData[i - 1]?.signal || macd) * 0.8;
    const histogram = macd - signal;
    
    macdData.push({
      day: i + 1,
      date: `Day ${i + 1}`,
      macd: Number(macd.toFixed(3)),
      signal: Number(signal.toFixed(3)),
      histogram: Number(histogram.toFixed(3)),
    });
  }
  return macdData;
};

// Calculate support and resistance levels
const calculateSupportResistance = (priceData: { price: number; high: number; low: number }[]) => {
  const prices = priceData.map(d => d.price);
  const highs = priceData.map(d => d.high);
  const lows = priceData.map(d => d.low);
  
  // Find key resistance levels (recent highs)
  const sortedHighs = [...highs].sort((a, b) => b - a);
  const resistance1 = sortedHighs[0]; // Highest high
  const resistance2 = sortedHighs[Math.floor(sortedHighs.length * 0.2)]; // 80th percentile
  
  // Find key support levels (recent lows)
  const sortedLows = [...lows].sort((a, b) => a - b);
  const support1 = sortedLows[0]; // Lowest low
  const support2 = sortedLows[Math.floor(sortedLows.length * 0.2)]; // 20th percentile
  
  // Calculate pivot point (classic formula)
  const lastHigh = highs[highs.length - 1];
  const lastLow = lows[lows.length - 1];
  const lastClose = prices[prices.length - 1];
  const pivot = (lastHigh + lastLow + lastClose) / 3;
  
  return {
    resistance1: Number(resistance1.toFixed(2)),
    resistance2: Number(resistance2.toFixed(2)),
    support1: Number(support1.toFixed(2)),
    support2: Number(support2.toFixed(2)),
    pivot: Number(pivot.toFixed(2)),
  };
};

const FinancialCharts = ({ asset, sentiment, realData, isLoading }: FinancialChartsProps) => {
  // Use real data if available, otherwise generate simulated data
  const priceData = useMemo(() => {
    if (realData && realData.length > 0) {
      return realData;
    }
    return generatePriceData(sentiment);
  }, [realData, sentiment]);
  
  const rsiData = useMemo(() => calculateRSI(priceData), [priceData]);
  const macdData = useMemo(() => calculateMACD(priceData), [priceData]);
  const levels = useMemo(() => calculateSupportResistance(priceData), [priceData]);
  
  // Calculate moving averages and Bollinger Bands, add to price data
  const priceDataWithMA = useMemo(() => {
    const sma20 = calculateSMA(priceData, 20);
    const sma50 = calculateSMA(priceData, 7); // Using 7 for demo since we have 30 days
    const ema12 = calculateEMA(priceData, 12);
    const ema26 = calculateEMA(priceData, 9); // Using 9 for demo
    const bollingerBands = calculateBollingerBands(priceData, 20, 2);
    
    return priceData.map((d, i) => ({
      ...d,
      sma20: sma20[i],
      sma7: sma50[i],
      ema12: ema12[i],
      ema9: ema26[i],
      bbUpper: bollingerBands[i].upper,
      bbMiddle: bollingerBands[i].middle,
      bbLower: bollingerBands[i].lower,
    }));
  }, [priceData]);
  
  const currentRSI = rsiData[rsiData.length - 1]?.rsi || 50;
  const currentMACD = macdData[macdData.length - 1]?.macd || 0;
  const priceChange = priceData.length > 1 
    ? ((priceData[priceData.length - 1].price - priceData[0].price) / priceData[0].price * 100).toFixed(2)
    : "0";

  const getRSIStatus = (rsi: number) => {
    if (rsi >= 70) return { label: "Overbought", color: "text-red-500", bg: "bg-red-500/10" };
    if (rsi <= 30) return { label: "Oversold", color: "text-green-500", bg: "bg-green-500/10" };
    return { label: "Neutral", color: "text-yellow-500", bg: "bg-yellow-500/10" };
  };

  const getMACDStatus = (macd: number) => {
    if (macd > 0.5) return { label: "Bullish", color: "text-green-500", bg: "bg-green-500/10" };
    if (macd < -0.5) return { label: "Bearish", color: "text-red-500", bg: "bg-red-500/10" };
    return { label: "Neutral", color: "text-yellow-500", bg: "bg-yellow-500/10" };
  };

  const rsiStatus = getRSIStatus(currentRSI);
  const macdStatus = getMACDStatus(currentMACD);

  const chartConfig = {
    price: { label: "Price", color: "hsl(var(--primary))" },
    sma20: { label: "SMA 20", color: "hsl(280, 87%, 65%)" },
    sma7: { label: "SMA 7", color: "hsl(320, 87%, 55%)" },
    ema12: { label: "EMA 12", color: "hsl(200, 95%, 55%)" },
    ema9: { label: "EMA 9", color: "hsl(170, 75%, 45%)" },
    bbUpper: { label: "BB Upper", color: "hsl(45, 93%, 47%)" },
    bbMiddle: { label: "BB Middle", color: "hsl(45, 93%, 60%)" },
    bbLower: { label: "BB Lower", color: "hsl(45, 93%, 47%)" },
    rsi: { label: "RSI", color: "hsl(142, 76%, 36%)" },
    macd: { label: "MACD", color: "hsl(217, 91%, 60%)" },
    signal: { label: "Signal", color: "hsl(24, 100%, 50%)" },
    histogram: { label: "Histogram", color: "hsl(var(--primary))" },
    volume: { label: "Volume", color: "hsl(var(--muted-foreground))" },
  };

  return (
    <div className="space-y-6">
      {/* Price Action Chart with Support/Resistance */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h4 className="font-semibold">Price Action with S/R Levels</h4>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              Number(priceChange) >= 0 ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
            )}
          >
            {Number(priceChange) >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {priceChange}%
          </Badge>
        </div>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <ComposedChart data={priceDataWithMA}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bollingerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.15} />
                <stop offset="50%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.05} />
                <stop offset="100%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            
            {/* Resistance Levels */}
            <ReferenceLine 
              y={levels.resistance1} 
              stroke="hsl(0, 84%, 60%)" 
              strokeDasharray="5 5" 
              strokeWidth={1.5}
            />
            <ReferenceLine 
              y={levels.resistance2} 
              stroke="hsl(0, 84%, 70%)" 
              strokeDasharray="3 3" 
              strokeWidth={1}
            />
            
            {/* Pivot Point */}
            <ReferenceLine 
              y={levels.pivot} 
              stroke="hsl(45, 93%, 47%)" 
              strokeDasharray="8 4" 
              strokeWidth={1}
            />
            
            {/* Support Levels */}
            <ReferenceLine 
              y={levels.support2} 
              stroke="hsl(142, 76%, 46%)" 
              strokeDasharray="3 3" 
              strokeWidth={1}
            />
            <ReferenceLine 
              y={levels.support1} 
              stroke="hsl(142, 76%, 36%)" 
              strokeDasharray="5 5" 
              strokeWidth={1.5}
            />
            
            {/* Bollinger Bands */}
            <Area
              type="monotone"
              dataKey="bbUpper"
              stroke="hsl(45, 93%, 47%)"
              strokeWidth={1}
              fill="none"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="bbLower"
              stroke="hsl(45, 93%, 47%)"
              strokeWidth={1}
              fill="url(#bollingerGradient)"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="bbMiddle"
              stroke="hsl(45, 93%, 60%)"
              strokeWidth={1}
              strokeDasharray="2 2"
              dot={false}
              connectNulls={false}
            />
            
            {/* Price Area */}
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
            
            {/* Moving Averages */}
            <Line
              type="monotone"
              dataKey="sma20"
              stroke="hsl(280, 87%, 65%)"
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="sma7"
              stroke="hsl(320, 87%, 55%)"
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="ema12"
              stroke="hsl(200, 95%, 55%)"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="ema9"
              stroke="hsl(170, 75%, 45%)"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="4 2"
              connectNulls={false}
            />
          </ComposedChart>
        </ChartContainer>
        <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsla(45, 93%, 47%, 0.2)', border: '1px solid hsl(45, 93%, 47%)' }} /> BB
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: 'hsl(280, 87%, 65%)' }} /> SMA 20
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: 'hsl(320, 87%, 55%)' }} /> SMA 7
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: 'hsl(200, 95%, 55%)' }} /> EMA 12
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: 'hsl(170, 75%, 45%)' }} /> EMA 9
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-500/70" /> R
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500/70" /> S
          </span>
        </div>
      </Card>

      {/* RSI Chart */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-500" />
            <h4 className="font-semibold">RSI (14)</h4>
          </div>
          <Badge variant="outline" className={cn(rsiStatus.color, rsiStatus.bg)}>
            {currentRSI.toFixed(1)} - {rsiStatus.label}
          </Badge>
        </div>
        <ChartContainer config={chartConfig} className="h-[150px] w-full">
          <ComposedChart data={rsiData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              ticks={[0, 30, 50, 70, 100]}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine y={70} stroke="hsl(0, 84%, 60%)" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="hsl(142, 76%, 36%)" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="rsi"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
        <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-500" /> Overbought (70)
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-green-500" /> Oversold (30)
          </span>
        </div>
      </Card>

      {/* MACD Chart */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            <h4 className="font-semibold">MACD (12, 26, 9)</h4>
          </div>
          <Badge variant="outline" className={cn(macdStatus.color, macdStatus.bg)}>
            {currentMACD > 0 ? "+" : ""}{currentMACD.toFixed(3)} - {macdStatus.label}
          </Badge>
        </div>
        <ChartContainer config={chartConfig} className="h-[150px] w-full">
          <ComposedChart data={macdData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.5} />
            <Bar 
              dataKey="histogram" 
              fill="hsl(var(--primary))"
              opacity={0.5}
            />
            <Line
              type="monotone"
              dataKey="macd"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="signal"
              stroke="hsl(24, 100%, 50%)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
        <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-500" /> MACD Line
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-orange-500" /> Signal Line
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-primary/50 rounded-sm" /> Histogram
          </span>
        </div>
      </Card>

      {/* Volume Chart */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-semibold">Volume</h4>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[100px] w-full">
          <BarChart data={priceData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10 }} 
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar 
              dataKey="volume" 
              fill="hsl(var(--muted-foreground))"
              opacity={0.5}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </Card>
    </div>
  );
};

export default FinancialCharts;
