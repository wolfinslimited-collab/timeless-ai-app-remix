import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Image, 
  CreditCard, 
  Crown, 
  TrendingUp,
  Video,
  Music,
  Film,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  RefreshCw,
  Smartphone,
  Apple,
  Globe,
  Zap,
  Sparkles,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format, subDays } from "date-fns";

interface Stats {
  total_users: number;
  total_generations: number;
  total_credits_used: number;
  active_subscriptions: number;
  generations_today: number;
  new_users_today: number;
  generations_by_type: Record<string, number> | null;
  android_users: number;
  ios_users: number;
  web_users: number;
  kie_generations: number;
  kie_credits_used: number;
  fal_generations: number;
  fal_credits_used: number;
}

interface WeeklyData {
  date: string;
  generations: number;
  users: number;
  credits: number;
}

interface BalanceInfo {
  provider: string;
  balance: number;
  maxBalance: number;
  percentage: number;
  isLow: boolean;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketCount, setTicketCount] = useState(0);
  const [apiBalances, setApiBalances] = useState<BalanceInfo[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all-time stats (no date filter)
      const { data: statsData, error: statsError } = await (supabase.rpc as any)(
        "admin_get_stats_by_range",
        { p_start_date: null, p_end_date: null }
      );
      if (statsError) {
        console.error("Error fetching stats:", statsError);
      } else {
        setStats(statsData as Stats);
      }

      // Fetch last 30 days for chart
      const { data: weeklyDataResult, error: weeklyError } = await (supabase.rpc as any)(
        "admin_get_weekly_stats_by_range",
        { p_start_date: format(subDays(new Date(), 29), "yyyy-MM-dd"), p_end_date: format(new Date(), "yyyy-MM-dd") }
      );
      if (weeklyError) {
        console.error("Error fetching weekly stats:", weeklyError);
      } else if (weeklyDataResult) {
        setWeeklyData(weeklyDataResult);
      }

      // Fetch open ticket count
      const { count, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      
      if (!ticketError && count !== null) {
        setTicketCount(count);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    checkApiBalances();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const checkApiBalances = async () => {
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("balance-monitor", {
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`,
        } : undefined,
      });

      if (error) throw error;
      
      if (data?.balances) {
        setApiBalances(data.balances);
      }
    } catch (err: any) {
      console.error("Error checking API balances:", err);
      setBalanceError(err.message || "Failed to check balances");
    } finally {
      setBalanceLoading(false);
    }
  };

  // Calculate trends (comparing today vs average)
  const getTrend = (todayValue: number, total: number, days: number = 7) => {
    const average = total / days;
    if (average === 0) return 0;
    return Math.round(((todayValue - average) / average) * 100);
  };

  const generationTrend = stats ? getTrend(stats.generations_today, stats.total_generations) : 0;
  const userTrend = stats ? getTrend(stats.new_users_today, stats.total_users) : 0;

  const statCards = [
    {
      title: "Total Users",
      value: stats?.total_users ?? 0,
      icon: Users,
      description: `+${stats?.new_users_today ?? 0} today`,
      trend: userTrend,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Generations",
      value: stats?.total_generations ?? 0,
      icon: Image,
      description: `+${stats?.generations_today ?? 0} today`,
      trend: generationTrend,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Credits Used",
      value: stats?.total_credits_used ?? 0,
      icon: CreditCard,
      description: "In selected period",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Pro Subscribers",
      value: stats?.active_subscriptions ?? 0,
      icon: Crown,
      description: "Active subscriptions",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  const typeIcons: Record<string, any> = {
    image: Image,
    video: Video,
    music: Music,
    cinema: Film,
    chat: MessageSquare,
  };

  // Prepare pie chart data
  const pieData = stats?.generations_by_type
    ? Object.entries(stats.generations_by_type).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
    : [];

  // Format chart data for display
  const formattedWeeklyData = weeklyData.map((d) => ({
    ...d,
    displayDate: format(new Date(d.date), "MMM d"),
    fullDate: format(new Date(d.date), "MMM d, yyyy"),
  }));

  return (
    <AdminLayout title="Dashboard" description="Overview of your platform analytics">
      {/* Refresh Button */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden border-0 shadow-sm bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`h-8 w-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {stat.trend !== undefined && stat.trend !== 0 && (
                      <span className={`flex items-center text-xs font-medium ${
                        stat.trend > 0 ? "text-green-500" : "text-red-500"
                      }`}>
                        {stat.trend > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(stat.trend)}%
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Android Users</p>
                  {loading ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-xl font-bold">{(stats?.android_users ?? 0).toLocaleString()}</p>
                  )}
                </div>
              </div>
              {!loading && stats && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(((stats.android_users ?? 0) / (stats.total_users || 1)) * 100)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                  <Apple className="h-5 w-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">iOS Users</p>
                  {loading ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-xl font-bold">{(stats?.ios_users ?? 0).toLocaleString()}</p>
                  )}
                </div>
              </div>
              {!loading && stats && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(((stats.ios_users ?? 0) / (stats.total_users || 1)) * 100)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Web Users</p>
                  {loading ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-xl font-bold">{(stats?.web_users ?? 0).toLocaleString()}</p>
                  )}
                </div>
              </div>
              {!loading && stats && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(((stats.web_users ?? 0) / (stats.total_users || 1)) * 100)}%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Usage Stats */}
      <Card className="border-0 shadow-sm bg-card/80 mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                API Provider Stats
              </CardTitle>
              <CardDescription>Usage statistics and live API balances</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={checkApiBalances}
              disabled={balanceLoading}
              className="gap-2"
            >
              {balanceLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Check Balance
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {balanceError && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {balanceError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Kie AI Card */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium">Kie AI</p>
                    <p className="text-xs text-muted-foreground">Economy Tier</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Generations</span>
                  {loading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    <span className="font-medium">{(stats?.kie_generations ?? 0).toLocaleString()}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Credits Used</span>
                  {loading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    <span className="font-medium text-orange-500">{(stats?.kie_credits_used ?? 0).toLocaleString()}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Credits Left</span>
                  {balanceLoading ? (
                    <Skeleton className="h-4 w-20" />
                  ) : apiBalances.find(b => b.provider === "Kie AI") ? (
                    <div className="flex items-center gap-2">
                      {apiBalances.find(b => b.provider === "Kie AI")?.isLow ? (
                        <AlertTriangle className="h-3 w-3 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      )}
                      <span className={cn(
                        "font-medium",
                        apiBalances.find(b => b.provider === "Kie AI")?.isLow ? "text-destructive" : "text-green-500"
                      )}>
                        {apiBalances.find(b => b.provider === "Kie AI")?.balance.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </div>
                {apiBalances.find(b => b.provider === "Kie AI") && (
                  <>
                    <div className="border-t border-border/50 my-2 pt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">API Balance</span>
                        <div className="flex items-center gap-2">
                          {apiBalances.find(b => b.provider === "Kie AI")?.isLow ? (
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          )}
                          <span className={cn(
                            "font-medium",
                            apiBalances.find(b => b.provider === "Kie AI")?.isLow ? "text-destructive" : "text-green-500"
                          )}>
                            {apiBalances.find(b => b.provider === "Kie AI")?.balance.toFixed(2)} credits
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all",
                              apiBalances.find(b => b.provider === "Kie AI")?.isLow ? "bg-destructive" : "bg-green-500"
                            )}
                            style={{ width: `${Math.min((apiBalances.find(b => b.provider === "Kie AI")?.percentage ?? 0) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {((apiBalances.find(b => b.provider === "Kie AI")?.percentage ?? 0) * 100).toFixed(1)}% remaining
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Fal AI Card */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-medium">Fal AI</p>
                    <p className="text-xs text-muted-foreground">High Quality Tier</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Generations</span>
                  {loading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    <span className="font-medium">{(stats?.fal_generations ?? 0).toLocaleString()}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Credits Used</span>
                  {loading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    <span className="font-medium text-violet-500">{(stats?.fal_credits_used ?? 0).toLocaleString()}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Credits Left</span>
                  <a 
                    href="https://fal.ai/dashboard/billing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Check Dashboard
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {ticketCount > 0 && (
        <Card className="mb-6 border-0 shadow-sm bg-orange-500/10">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">{ticketCount} Open Support Ticket{ticketCount > 1 ? "s" : ""}</p>
                  <p className="text-sm text-muted-foreground">Requires attention</p>
                </div>
              </div>
              <a
                href="/admin/support"
                className="text-sm font-medium text-primary hover:underline"
              >
                View Tickets →
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Activity Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Activity Trend
            </CardTitle>
            <CardDescription>Generations and credits over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : formattedWeeklyData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedWeeklyData}>
                    <defs>
                      <linearGradient id="colorGenerations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="displayDate" 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      className="text-xs fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))"
                      }}
                      labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ""}
                    />
                    <Area
                      type="monotone"
                      dataKey="generations"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorGenerations)"
                      name="Generations"
                    />
                    <Area
                      type="monotone"
                      dataKey="credits"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCredits)"
                      name="Credits Used"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <p className="text-muted-foreground">No data for selected period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generation Types Pie Chart */}
        <Card className="border-0 shadow-sm bg-card/80">
          <CardHeader>
            <CardTitle>Content Distribution</CardTitle>
            <CardDescription>Generations by type</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : pieData.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 -mt-4">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <p className="text-muted-foreground text-center">
                  No generation data available
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generations by Type Bar */}
        <Card className="border-0 shadow-sm bg-card/80">
          <CardHeader>
            <CardTitle>Generations by Type</CardTitle>
            <CardDescription>Detailed breakdown of content types</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.generations_by_type ? (
                  Object.entries(stats.generations_by_type)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => {
                      const Icon = typeIcons[type] || Image;
                      const total = stats.total_generations || 1;
                      const percentage = Math.round((count / total) * 100);
                      
                      return (
                        <div key={type} className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium capitalize">{type}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{count.toLocaleString()}</Badge>
                                <span className="text-xs text-muted-foreground">{percentage}%</span>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No generation data available
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-0 shadow-sm bg-card/80">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/admin/users"
                className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center group"
              >
                <Users className="h-6 w-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium">Manage Users</p>
              </a>
              <a
                href="/admin/credits"
                className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center group"
              >
                <CreditCard className="h-6 w-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium">Adjust Credits</p>
              </a>
              <a
                href="/admin/support"
                className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center group relative"
              >
                <MessageSquare className="h-6 w-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium">Support</p>
                {ticketCount > 0 && (
                  <span className="absolute top-2 right-2 h-5 w-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                    {ticketCount}
                  </span>
                )}
              </a>
              <a
                href="/admin/roles"
                className="p-4 rounded-lg border border-border hover:bg-muted transition-colors text-center group"
              >
                <Crown className="h-6 w-6 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium">Manage Roles</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
