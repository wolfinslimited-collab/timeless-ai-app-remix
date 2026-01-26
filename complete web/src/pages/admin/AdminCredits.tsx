import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, User, CreditCard, Plus, Minus, RefreshCw, Loader2, Crown, TrendingUp, Coins, ChevronLeft, ChevronRight, Flame, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  credits: number;
  plan: string;
  subscription_status: string | null;
  created_at: string;
}

interface UsageUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_credits_used: number;
  generation_count: number;
  plan: string;
  subscription_status: string | null;
}

const USERS_PER_PAGE = 20;

export default function AdminCredits() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [topUsers, setTopUsers] = useState<Profile[]>([]);
  const [topUsageUsers, setTopUsageUsers] = useState<UsageUser[]>([]);
  const [usageLoading, setUsageLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  
  // Date range for usage
  const [usageDateRange, setUsageDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  
  // Stats
  const [stats, setStats] = useState({
    totalCredits: 0,
    averageCredits: 0,
    usersWithCredits: 0,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCreditStats = useCallback(async () => {
    try {
      const { data, error } = await (supabase.rpc as any)("admin_get_credit_stats");

      if (error) throw error;

      if (data) {
        setStats({
          totalCredits: data.total_credits || 0,
          averageCredits: data.average_credits || 0,
          usersWithCredits: data.users_with_credits || 0,
        });

        // Set top users from the stats response
        const topUsersData = (data.top_users || []).map((u: any) => ({
          id: u.id,
          user_id: u.user_id,
          email: u.email,
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          credits: u.credits,
          plan: u.plan,
          subscription_status: u.subscription_status,
          created_at: "",
        }));
        setTopUsers(topUsersData);
      }
    } catch (err) {
      console.error("Error fetching credit stats:", err);
    }
  }, []);

  const fetchTopUsage = useCallback(async () => {
    setUsageLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("admin_get_top_credit_usage", {
        p_start_date: startOfDay(usageDateRange.from).toISOString(),
        p_end_date: endOfDay(usageDateRange.to).toISOString(),
        p_limit: 10,
      });

      if (error) throw error;
      setTopUsageUsers(data || []);
    } catch (err) {
      console.error("Error fetching top usage:", err);
    } finally {
      setUsageLoading(false);
    }
  }, [usageDateRange]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("admin_get_users_by_credits", {
        p_limit: USERS_PER_PAGE,
        p_offset: (currentPage - 1) * USERS_PER_PAGE,
        p_search: debouncedSearch || null,
      });
      
      if (error) {
        console.error("Error fetching users:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch users.",
        });
      } else {
        setUsers((data as Profile[]) || []);
        setTotalCount(data?.length > 0 ? Number(data[0]?.total_count) || 0 : 0);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    fetchCreditStats();
  }, [fetchCreditStats]);

  useEffect(() => {
    fetchTopUsage();
  }, [fetchTopUsage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCreditStats();
    fetchTopUsage();
    fetchUsers();
  };

  const handleUpdateCredits = async (action: "set" | "add" | "subtract") => {
    if (!selectedUser || !creditAmount) return;
    
    setIsUpdating(true);
    
    try {
      let newCredits = parseInt(creditAmount);
      
      if (action === "add") {
        newCredits = selectedUser.credits + parseInt(creditAmount);
      } else if (action === "subtract") {
        newCredits = Math.max(0, selectedUser.credits - parseInt(creditAmount));
      }

      const { error } = await (supabase.rpc as any)("admin_update_credits", {
        p_user_id: selectedUser.user_id,
        p_credits: newCredits,
      });

      if (error) throw error;

      toast({
        title: "Credits updated",
        description: `Set ${selectedUser.display_name || selectedUser.email?.split("@")[0] || "User"}'s credits to ${newCredits}`,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === selectedUser.user_id ? { ...u, credits: newCredits } : u
        )
      );
      setTopUsers((prev) =>
        prev.map((u) =>
          u.user_id === selectedUser.user_id ? { ...u, credits: newCredits } : u
        )
      );
      
      setDialogOpen(false);
      setCreditAmount("");
      setSelectedUser(null);
      
      // Refresh stats if credits changed
      fetchCreditStats();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err.message || "Failed to update credits",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const totalPages = Math.ceil(totalCount / USERS_PER_PAGE);

  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const getPlanBadge = (plan: string, subscriptionStatus: string | null) => {
    if (subscriptionStatus === "active") {
      return (
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <Crown className="h-3 w-3 mr-1" />
          {plan}
        </Badge>
      );
    }
    return <Badge variant="secondary">{plan}</Badge>;
  };

  const getUserName = (user: Profile) => {
    return user.display_name || (user.email ? user.email.split("@")[0] : "Unnamed User");
  };

  return (
    <AdminLayout title="Credits Management" description="View top credit holders and adjust user balances">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCredits.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Credits in System</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.averageCredits.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Average per User</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.usersWithCredits.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Users with Credits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Credit Users */}
      <Card className="border-0 shadow-sm bg-card/80 mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Top Credit Holders
          </CardTitle>
          <CardDescription>Users with the highest credit balances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {topUsers.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
                  <Skeleton className="h-12 w-12 rounded-full mb-2" />
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))
            ) : (
              topUsers.map((user, index) => (
                <div
                  key={user.id}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-lg transition-colors",
                    index === 0 ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/50"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    {index === 0 && (
                      <Crown className="absolute -top-1 -right-1 h-4 w-4 text-amber-500" />
                    )}
                  </div>
                  <p className="font-medium text-sm mt-2 text-center truncate max-w-full">
                    {getUserName(user)}
                  </p>
                  <Badge variant="outline" className="font-mono mt-1">
                    <CreditCard className="h-3 w-3 mr-1" />
                    {user.credits.toLocaleString()}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Credit Usage with Date Range */}
      <Card className="border-0 shadow-sm bg-card/80 mb-6">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Top Credit Usage
            </CardTitle>
            <CardDescription>Users who spent the most credits in the selected period</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(usageDateRange.from, "MMM d")} - {format(usageDateRange.to, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: usageDateRange.from, to: usageDateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setUsageDateRange({ from: range.from, to: range.to });
                    } else if (range?.from) {
                      setUsageDateRange({ from: range.from, to: range.from });
                    }
                  }}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUsageDateRange({ from: subDays(new Date(), 7), to: new Date() })}
              >
                7d
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUsageDateRange({ from: subDays(new Date(), 30), to: new Date() })}
              >
                30d
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUsageDateRange({ from: subDays(new Date(), 90), to: new Date() })}
              >
                90d
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Credits Used</TableHead>
                <TableHead className="text-right">Generations</TableHead>
                <TableHead>Plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : topUsageUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No usage data for selected period
                  </TableCell>
                </TableRow>
              ) : (
                topUsageUsers.map((user, index) => (
                  <TableRow key={user.user_id} className="group">
                    <TableCell className="font-medium text-muted-foreground">
                      {index === 0 ? <Flame className="h-4 w-4 text-orange-500" /> : index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate max-w-[200px]">
                            {user.display_name || user.email?.split("@")[0] || "Unknown"}
                          </p>
                          {user.email && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="font-mono">
                        -{user.total_credits_used.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {user.generation_count.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {getPlanBadge(user.plan, user.subscription_status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Users Table */}
      <Card className="border-0 shadow-sm bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle>All Users</CardTitle>
            <CardDescription>View and modify user credit balances</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
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
                  <TableHead className="min-w-[120px]">Credits</TableHead>
                  <TableHead className="min-w-[100px]">Plan</TableHead>
                  <TableHead className="min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[180px]">
                              {getUserName(user)}
                            </p>
                            {user.email && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-base px-3 py-1">
                          <CreditCard className="h-4 w-4 mr-2" />
                          {user.credits.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getPlanBadge(user.plan, user.subscription_status)}
                      </TableCell>
                      <TableCell>
                        <Dialog open={dialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (!open) {
                            setSelectedUser(null);
                            setCreditAmount("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              Adjust
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adjust Credits</DialogTitle>
                              <DialogDescription>
                                Modify credit balance for {selectedUser ? getUserName(selectedUser) : "this user"}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="flex items-center justify-center gap-4 p-4 bg-muted rounded-lg">
                                <span className="text-muted-foreground">Current:</span>
                                <span className="text-2xl font-bold font-mono">
                                  {selectedUser?.credits.toLocaleString()}
                                </span>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="credits">Amount</Label>
                                <Input
                                  id="credits"
                                  type="number"
                                  placeholder="Enter amount"
                                  value={creditAmount}
                                  onChange={(e) => setCreditAmount(e.target.value)}
                                  min="0"
                                />
                              </div>
                            </div>
                            <DialogFooter className="flex-col sm:flex-row gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleUpdateCredits("subtract")}
                                disabled={isUpdating || !creditAmount}
                                className="w-full sm:w-auto"
                              >
                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4 mr-1" />}
                                Subtract
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleUpdateCredits("add")}
                                disabled={isUpdating || !creditAmount}
                                className="w-full sm:w-auto"
                              >
                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                                Add
                              </Button>
                              <Button
                                onClick={() => handleUpdateCredits("set")}
                                disabled={isUpdating || !creditAmount}
                                className="w-full sm:w-auto"
                              >
                                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Set Exact
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
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
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(page)}
                        className="w-8 h-8 p-0"
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
