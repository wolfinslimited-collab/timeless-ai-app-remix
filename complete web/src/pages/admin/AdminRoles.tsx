import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, Shield, ShieldCheck, User, Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "moderator" | "user";
  created_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface Profile {
  user_id: string;
  display_name: string | null;
}

export default function AdminRoles() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<string>("moderator");

  const fetchRoles = async () => {
    try {
      // Fetch all roles (only visible to admins due to RLS)
      const { data: rolesData, error: rolesError } = await (supabase
        .from("user_roles" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      } else {
        setRoles((rolesData as unknown as UserRole[]) || []);
      }

      // Fetch all users for the dropdown
      const { data: usersData, error: usersError } = await (supabase.rpc as any)("admin_get_all_profiles");
      
      if (!usersError && usersData) {
        setAllUsers(usersData as Profile[]);
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAddRole = async () => {
    if (!newUserId || !newRole) return;
    
    setIsAdding(true);
    
    try {
      const { error } = await supabase
        .from("user_roles" as any)
        .insert({
          user_id: newUserId,
          role: newRole,
        });

      if (error) {
        if (error.code === "23505") {
          throw new Error("This user already has this role");
        }
        throw error;
      }

      toast({
        title: "Role added",
        description: `Successfully added ${newRole} role`,
      });

      setDialogOpen(false);
      setNewUserId("");
      setNewRole("moderator");
      fetchRoles();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to add role",
        description: err.message || "An error occurred",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles" as any)
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      toast({
        title: "Role removed",
        description: "Successfully removed the role",
      });

      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to remove role",
        description: err.message || "An error occurred",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500"><ShieldCheck className="h-3 w-3 mr-1" />Admin</Badge>;
      case "moderator":
        return <Badge className="bg-blue-500"><Shield className="h-3 w-3 mr-1" />Moderator</Badge>;
      default:
        return <Badge variant="secondary"><User className="h-3 w-3 mr-1" />{role}</Badge>;
    }
  };

  const filteredRoles = roles.filter((role) => {
    const searchLower = search.toLowerCase();
    return role.user_id.toLowerCase().includes(searchLower);
  });

  // Get display name for a user_id
  const getUserName = (userId: string) => {
    const user = allUsers.find((u) => u.user_id === userId);
    return user?.display_name || `User ${userId.slice(0, 8)}...`;
  };

  return (
    <AdminLayout title="Role Management" description="Manage admin and moderator access">
      <Card className="border-0 shadow-sm bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>Control who has elevated privileges</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add User Role</DialogTitle>
                  <DialogDescription>
                    Grant elevated privileges to a user
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select User</Label>
                    <Select value={newUserId} onValueChange={setNewUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {allUsers.map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.display_name || `User ${user.user_id.slice(0, 8)}...`}
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin (Full Access)</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddRole} disabled={isAdding || !newUserId}>
                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Role
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="icon" onClick={fetchRoles}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {search ? "No roles match your search" : "No roles assigned yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getUserName(role.user_id)}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {role.user_id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(role.role)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(role.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
