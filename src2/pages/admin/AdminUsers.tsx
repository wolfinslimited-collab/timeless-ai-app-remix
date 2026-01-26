import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, Crown, User, RefreshCw, ChevronLeft, ChevronRight, Calendar, CreditCard, Mail, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  credits: number;
  plan: string;
  subscription_status: string | null;
  subscription_end_date: string | null;
  created_at: string;
  updated_at: string;
  total_count: number;
}

const USERS_PER_PAGE = 20;

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Stats (fetched once)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalCredits: 0,
    proUsers: 0,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStats = async () => {
    try {
      // Use admin RPC which has SECURITY DEFINER to bypass RLS
      const { data, error } = await (supabase.rpc as any)("admin_get_stats");
      
      if (error) {
        console.error("Error fetching stats:", error);
        return;
      }

      if (data) {
        setStats({
          totalUsers: data.total_users ?? 0,
          activeSubscriptions: data.active_subscriptions ?? 0,
          totalCredits: data.total_credits_used ?? 0,
          proUsers: data.active_subscriptions ?? 0, // Pro users = active subscriptions
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchUsers = useCallback(async (page: number, searchTerm: string) => {
    setLoading(true);
    try {
      const offset = (page - 1) * USERS_PER_PAGE;
      
      const { data, error } = await (supabase.rpc as any)("admin_get_all_profiles", {
        p_limit: USERS_PER_PAGE,
        p_offset: offset,
        p_search: searchTerm || null,
      });
      
      if (error) {
        console.error("Error fetching users:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch users. Make sure you have admin privileges.",
        });
        setUsers([]);
        setTotalCount(0);
      } else {
        const profileData = (data as Profile[]) || [];
        setUsers(profileData);
        // Get total count from first result
        if (profileData.length > 0) {
          setTotalCount(Number(profileData[0].total_count) || 0);
        } else if (searchTerm) {
          setTotalCount(0);
        }
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch, fetchUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchUsers(currentPage, debouncedSearch);
  };

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / USERS_PER_PAGE);

  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const startIndex = (currentPage - 1) * USERS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * USERS_PER_PAGE, totalCount);

  return (
    <AdminLayout title="Users" description="Manage platform users">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
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
                <p className="text-2xl font-bold">{stats.activeSubscriptions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Active Subs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCredits.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Credits</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.proUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Pro Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            All Users
            <Badge variant="secondary" className="ml-2">
              {debouncedSearch ? `${totalCount} found` : totalCount.toLocaleString()}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64 md:w-80"
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">User</TableHead>
                  <TableHead className="min-w-[100px]">Credits</TableHead>
                  <TableHead className="min-w-[80px]">Plan</TableHead>
                  <TableHead className="min-w-[100px]">Subscription</TableHead>
                  <TableHead className="min-w-[120px]">Sub Ends</TableHead>
                  <TableHead className="min-w-[120px]">Joined</TableHead>
                  <TableHead className="min-w-[100px]">Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: USERS_PER_PAGE }).map((_, i) => (
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
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      {debouncedSearch ? "No users match your search" : "No users found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} className="group hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10">
                              <User className="h-4 w-4 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[180px]">
                              {user.display_name || "Unnamed User"}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[200px]">
                                {user.email || "No email"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold text-primary">
                          {user.credits.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.plan === "pro" ? "default" : "secondary"}
                          className={user.plan === "pro" ? "bg-gradient-to-r from-yellow-500 to-orange-500" : ""}
                        >
                          {user.plan === "pro" && <Crown className="h-3 w-3 mr-1" />}
                          {user.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.subscription_status === "active" ? (
                          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                            Active
                          </Badge>
                        ) : user.subscription_status === "trialing" ? (
                          <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">
                            Trial
                          </Badge>
                        ) : user.subscription_status === "canceled" ? (
                          <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                            Canceled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            None
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.subscription_end_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>{format(new Date(user.subscription_end_date), "MMM d, yyyy")}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(user.created_at), "MMM d, yyyy")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="truncate max-w-[80px]">
                            {formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && totalCount > USERS_PER_PAGE && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground">
                Showing {startIndex}–{endIndex} of {totalCount.toLocaleString()} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-9"
                        onClick={() => goToPage(pageNum)}
                      >
                        {pageNum}
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
                  Next
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