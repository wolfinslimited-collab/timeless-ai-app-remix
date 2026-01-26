import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Briefcase,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  GitCompare,
  X,
  LineChart as LineChartIcon,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import PortfolioPerformanceChart from "./PortfolioPerformanceChart";

interface PriceData {
  currentPrice?: number;
  priceChange24h?: number;
}

interface TechnicalData {
  overallSentiment?: "bullish" | "bearish" | "neutral";
  priceTarget?: string;
  keyPoints?: string[];
}

interface SavedReport {
  id: string;
  symbol: string;
  asset_type: string;
  analysis_content: string;
  price_data: PriceData | null;
  technical_data: TechnicalData | null;
  created_at: string;
}

interface FinancialPortfolioProps {
  onViewReport?: (report: SavedReport) => void;
}

const FinancialPortfolio = ({ onViewReport }: FinancialPortfolioProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  const fetchReports = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("financial_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Cast the data to our interface since we know the shape of the JSONB data
      const typedReports = (data || []).map(report => ({
        ...report,
        price_data: report.price_data as PriceData | null,
        technical_data: report.technical_data as TechnicalData | null,
      }));
      setReports(typedReports);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error loading portfolio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("financial_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setReports(reports.filter((r) => r.id !== id));
      setSelectedReports(selectedReports.filter((rid) => rid !== id));
      toast({
        title: "Report deleted",
        description: "The report has been removed from your portfolio",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleReportSelection = (id: string) => {
    setSelectedReports((prev) =>
      prev.includes(id)
        ? prev.filter((rid) => rid !== id)
        : [...prev, id]
    );
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

  const selectedReportData = reports.filter((r) => selectedReports.includes(r.id));

  if (!user) {
    return (
      <Card className="p-8 text-center">
        <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sign in to view portfolio</h3>
        <p className="text-muted-foreground">
          Save and compare research reports across multiple assets
        </p>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="performance" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">My Portfolio</h2>
          <Badge variant="outline" className="ml-2">
            {reports.length} reports
          </Badge>
        </div>
        <div className="flex gap-2">
          <TabsList className="h-9">
            <TabsTrigger value="performance" className="gap-1.5 px-3">
              <LineChartIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="holdings" className="gap-1.5 px-3">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Holdings</span>
            </TabsTrigger>
          </TabsList>
          {selectedReports.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareDialogOpen(true)}
              className="gap-2"
            >
              <GitCompare className="h-4 w-4" />
              Compare ({selectedReports.length})
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchReports}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Performance Chart Tab */}
      <TabsContent value="performance" className="mt-4">
        <PortfolioPerformanceChart />
      </TabsContent>

      {/* Holdings Tab */}
      <TabsContent value="holdings" className="mt-4">

      {/* Reports Table */}
      {isLoading ? (
        <Card className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : reports.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No saved reports</h3>
          <p className="text-muted-foreground">
            Analyze an asset and save the report to build your portfolio
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedReports.includes(report.id)}
                      onCheckedChange={() => toggleReportSelection(report.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {report.asset_type === "stock" ? "📈" : "🪙"}
                      </Badge>
                      <span className="font-semibold">{report.symbol}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        getSentimentBg(report.technical_data?.overallSentiment),
                        getSentimentColor(report.technical_data?.overallSentiment)
                      )}
                    >
                      {getSentimentIcon(report.technical_data?.overallSentiment)}
                      <span className="capitalize">
                        {report.technical_data?.overallSentiment || "neutral"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {report.price_data?.currentPrice ? (
                      <span className="font-mono">
                        ${report.price_data.currentPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: report.price_data.currentPrice < 1 ? 6 : 2,
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {report.price_data?.priceChange24h !== undefined ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          report.price_data.priceChange24h >= 0
                            ? "text-green-500 bg-green-500/10"
                            : "text-red-500 bg-red-500/10"
                        )}
                      >
                        {report.price_data.priceChange24h >= 0 ? "+" : ""}
                        {report.price_data.priceChange24h.toFixed(2)}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(report.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onViewReport?.(report)}
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(report.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      </TabsContent>

      {/* Comparison Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-emerald-500" />
              Compare Assets ({selectedReportData.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
              {selectedReportData.map((report) => (
                <Card
                  key={report.id}
                  className={cn(
                    "p-4 border-2",
                    getSentimentBg(report.technical_data?.overallSentiment)
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {report.asset_type === "stock" ? "📈" : "🪙"}
                      </Badge>
                      <span className="font-bold text-lg">{report.symbol}</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        getSentimentColor(report.technical_data?.overallSentiment)
                      )}
                    >
                      {getSentimentIcon(report.technical_data?.overallSentiment)}
                      <span className="capitalize text-sm font-medium">
                        {report.technical_data?.overallSentiment || "neutral"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Price</span>
                      <span className="font-mono font-semibold">
                        {report.price_data?.currentPrice
                          ? `$${report.price_data.currentPrice.toLocaleString()}`
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">24h Change</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          report.price_data?.priceChange24h !== undefined &&
                            report.price_data.priceChange24h >= 0
                            ? "text-green-500 bg-green-500/10"
                            : "text-red-500 bg-red-500/10"
                        )}
                      >
                        {report.price_data?.priceChange24h !== undefined
                          ? `${report.price_data.priceChange24h >= 0 ? "+" : ""}${report.price_data.priceChange24h.toFixed(2)}%`
                          : "-"}
                      </Badge>
                    </div>
                    {report.technical_data?.priceTarget && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Target</span>
                        <span className="font-medium">{report.technical_data.priceTarget}</span>
                      </div>
                    )}
                  </div>

                  {report.technical_data?.keyPoints && report.technical_data.keyPoints.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Key Points</p>
                      <ul className="space-y-1">
                        {report.technical_data.keyPoints.slice(0, 3).map((point, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                            <span className="text-primary">•</span>
                            <span className="line-clamp-2">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-3">
                    Saved {format(new Date(report.created_at), "MMM d, yyyy")}
                  </p>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default FinancialPortfolio;
