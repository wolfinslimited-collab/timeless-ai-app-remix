import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, RefreshCw, Crown, ChevronLeft, ChevronRight, DollarSign, CreditCard, Smartphone, Apple } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Plan pricing configuration based on memory
const PLAN_CONFIG: Record<string, { name: string; price: number; period: string }> = {
  "premium-monthly": { name: "Premium", price: 9.99, period: "Monthly" },
  "premium-yearly": { name: "Premium", price: 99.99, period: "Yearly" },
  "premium-plus-monthly": { name: "Premium Plus", price: 19.99, period: "Monthly" },
  "premium-plus-yearly": { name: "Premium Plus", price: 149.99, period: "Yearly" },
  // Mobile-specific plans (iOS/Android)
  "ios_premium_monthly": { name: "Premium", price: 9.99, period: "Monthly" },
  "ios_premium_yearly": { name: "Premium", price: 99.99, period: "Yearly" },
  "ios_premium_plus_monthly": { name: "Premium Plus", price: 19.99, period: "Monthly" },
  "ios_premium_plus_yearly": { name: "Premium Plus", price: 149.99, period: "Yearly" },
  "android_premium_monthly": { name: "Premium", price: 9.99, period: "Monthly" },
  "android_premium_yearly": { name: "Premium", price: 99.99, period: "Yearly" },
  "android_premium_plus_monthly": { name: "Premium Plus", price: 19.99, period: "Monthly" },
  "android_premium_plus_yearly": { name: "Premium Plus", price: 149.99, period: "Yearly" },
  "unknown-paid-plan": { name: "Paid Plan", price: 9.99, period: "Monthly" },
};

interface SubscribedUser {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  plan: string;
  subscription_status: string | null;
  subscription_end_date: string | null;
  source: string | null;
  created_at: string;
}

const USERS_PER_PAGE = 20;

export default function AdminSubscriptions() {
  const [users, setUsers] = useState<SubscribedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gatewayFilter, setGatewayFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Stats
  const [stats, setStats] = useState({
    total_subscribed: 0,
    active_count: 0,
    canceled_count: 0,
    total_mrr: 0,
    stripe_count: 0,
    apple_count: 0,
    android_count: 0,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const getPlanInfo = (plan: string) => {
    return PLAN_CONFIG[plan] || { name: plan, price: 9.99, period: "Monthly" };
  };

  const getGateway = (source: string | null): string => {
    switch (source) {
      case "ios": return "Apple";
      case "android": return "Android";
      case "web": return "Stripe";
      default: return "Stripe";
    }
  };

  const getGatewayIcon = (source: string | null) => {
    switch (source) {
      case "ios": return <Apple className="h-4 w-4" />;
      case "android": return <Smartphone className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getGatewayBadge = (source: string | null) => {
    const gateway = getGateway(source);
    const variants: Record<string, string> = {
      "Apple": "bg-gray-500/20 text-gray-300 border-gray-500/30",
      "Android": "bg-green-500/20 text-green-400 border-green-500/30",
      "Stripe": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    };
    return (
      <Badge className={cn("gap-1", variants[gateway] || variants["Stripe"])}>
        {getGatewayIcon(source)}
        {gateway}
      </Badge>
    );
  };

  // Fetch stats (all subscribed users without filters for accurate counts)
  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await (supabase.rpc as any)("admin_get_subscribed_users", {
        p_limit: 10000,
        p_offset: 0,
        p_search: null,
        p_status: null,
        p_source: null,
      });

      if (error) throw error;

      const allSubscribed = data || [];
      const totalSubscribed = allSubscribed.length > 0 ? Number(allSubscribed[0]?.total_count) || allSubscribed.length : 0;
      
      const activeUsers = allSubscribed.filter((u: any) => u.subscription_status === "active");
      const canceledUsers = allSubscribed.filter((u: any) => u.subscription_status === "canceled" || u.subscription_status === "expired");
      
      // Count by gateway
      const stripeUsers = allSubscribed.filter((u: any) => !u.source || u.source === "web");
      const appleUsers = allSubscribed.filter((u: any) => u.source === "ios");
      const androidUsers = allSubscribed.filter((u: any) => u.source === "android");

      let totalMrr = 0;
      for (const user of activeUsers) {
        const planInfo = getPlanInfo(user.plan);
        if (planInfo.period === "Yearly") {
          totalMrr += planInfo.price / 12;
        } else {
          totalMrr += planInfo.price;
        }
      }

      setStats({
        total_subscribed: totalSubscribed,
        active_count: activeUsers.length,
        canceled_count: canceledUsers.length,
        total_mrr: totalMrr,
        stripe_count: stripeUsers.length,
        apple_count: appleUsers.length,
        android_count: androidUsers.length,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  // Fetch paginated users with filters
  const fetchSubscribedUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("admin_get_subscribed_users", {
        p_limit: USERS_PER_PAGE,
        p_offset: (currentPage - 1) * USERS_PER_PAGE,
        p_search: debouncedSearch || null,
        p_status: statusFilter === "all" ? null : statusFilter,
        p_source: gatewayFilter === "all" ? null : gatewayFilter,
      });

      if (error) throw error;

      const subscribedUsers = (data || []).map((user: any) => ({
        id: user.id,
        user_id: user.user_id,
        email: user.email,
        display_name: user.display_name,
        plan: user.plan,
        subscription_status: user.subscription_status,
        subscription_end_date: user.subscription_end_date,
        source: user.source,
        created_at: user.created_at,
      }));

      setUsers(subscribedUsers);
      setTotalCount(data?.length > 0 ? Number(data[0]?.total_count) || 0 : 0);
    } catch (err: any) {
      console.error("Error fetching subscribed users:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch subscriptions. Make sure you have admin privileges.",
      });
      setUsers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, debouncedSearch, statusFilter, gatewayFilter]);

  // Initial stats fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch users when filters/page change
  useEffect(() => {
    fetchSubscribedUsers();
  }, [fetchSubscribedUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchSubscribedUsers();
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case "canceled":
      case "cancelling":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Canceling</Badge>;
      case "past_due":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Past Due</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Trial</Badge>;
      case "expired":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Expired</Badge>;
      // Mobile-specific statuses
      case "grace_period":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Grace Period</Badge>;
      case "on_hold":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">On Hold</Badge>;
      case "paused":
        return <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30">Paused</Badge>;
      case "pending":
        return <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">{status || "Unknown"}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    const planInfo = getPlanInfo(plan);
    if (plan.includes("premium-plus")) {
      return (
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <Crown className="h-3 w-3 mr-1" />
          {planInfo.name}
        </Badge>
      );
    }
    if (plan.includes("premium") || plan.includes("pro")) {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <Crown className="h-3 w-3 mr-1" />
          {planInfo.name}
        </Badge>
      );
    }
    return <Badge variant="outline">{planInfo.name}</Badge>;
  };

  // Server-side pagination
  const totalPages = Math.ceil(totalCount / USERS_PER_PAGE);

  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  return (
    <AdminLayout title="Subscription Manager" description="View subscribed users and their payment details">
      {/* Stats Cards - Row 1: Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_subscribed.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Subscribed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.canceled_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Canceled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.total_mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground">Est. MRR</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - Row 2: By Gateway */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.stripe_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Stripe (Web)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-500/10 flex items-center justify-center">
                <Apple className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.apple_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Apple (iOS)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.android_count.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Android (Play)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              Subscribed Users
              <Badge variant="secondary" className="ml-2">
                {totalCount.toLocaleString()}
              </Badge>
            </CardTitle>
            <CardDescription>Users with active or past subscriptions</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-56"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="cancelling">Canceling</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="grace_period">Grace Period</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={gatewayFilter} onValueChange={(v) => { setGatewayFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Gateway" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Gateways</SelectItem>
                <SelectItem value="web">Stripe</SelectItem>
                <SelectItem value="ios">Apple</SelectItem>
                <SelectItem value="android">Android</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">User</TableHead>
                  <TableHead className="min-w-[80px]">Amount</TableHead>
                  <TableHead className="min-w-[120px]">Plan</TableHead>
                  <TableHead className="min-w-[80px]">Period</TableHead>
                  <TableHead className="min-w-[100px]">Gateway</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[120px]">End Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      {search || statusFilter !== "all" || gatewayFilter !== "all"
                        ? "No subscriptions match your filters" 
                        : "No subscribed users found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const planInfo = getPlanInfo(user.plan);
                    return (
                      <TableRow key={user.id} className="group hover:bg-muted/50">
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[180px]">
                              {user.display_name || (user.email ? user.email.split("@")[0] : "Unnamed User")}
                            </p>
                            {user.email && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono font-semibold text-green-400">
                            ${planInfo.price.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>{getPlanBadge(user.plan)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{planInfo.period}</span>
                        </TableCell>
                        <TableCell>{getGatewayBadge(user.source)}</TableCell>
                        <TableCell>{getStatusBadge(user.subscription_status)}</TableCell>
                        <TableCell>
                          {user.subscription_end_date ? (
                            <span className="text-sm">
                              {format(new Date(user.subscription_end_date), "MMM d, yyyy")}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * USERS_PER_PAGE) + 1}-{Math.min(currentPage * USERS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(page)}
                        className="w-8"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
