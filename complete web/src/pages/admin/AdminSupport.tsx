import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Send,
  RefreshCw
} from "lucide-react";

type TicketPriority = "low" | "medium" | "high" | "urgent";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

const priorityConfig: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "text-muted-foreground" },
  medium: { label: "Medium", color: "text-blue-400" },
  high: { label: "High", color: "text-orange-400" },
  urgent: { label: "Urgent", color: "text-destructive" }
};

const statusConfig: Record<TicketStatus, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "Open", icon: <AlertCircle className="h-3 w-3" />, variant: "secondary" },
  in_progress: { label: "In Progress", icon: <Clock className="h-3 w-3" />, variant: "default" },
  resolved: { label: "Resolved", icon: <CheckCircle2 className="h-3 w-3" />, variant: "outline" },
  closed: { label: "Closed", icon: <CheckCircle2 className="h-3 w-3" />, variant: "outline" }
};

const AdminSupport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch all tickets
  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Ticket[];
    }
  });

  // Fetch replies for selected ticket
  const { data: replies } = useQuery({
    queryKey: ["ticket-replies", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [];
      const { data, error } = await supabase
        .from("ticket_replies")
        .select("*")
        .eq("ticket_id", selectedTicket.id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as TicketReply[];
    },
    enabled: !!selectedTicket
  });

  // Update ticket status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, newStatus }: { ticketId: string; newStatus: TicketStatus }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", ticketId);
      
      if (error) throw error;

      // Send notification email
      await supabase.functions.invoke("ticket-notification", {
        body: { ticketId, newStatus }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast({ title: "Status updated", description: "The ticket status has been changed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("ticket_replies").insert({
        ticket_id: ticketId,
        user_id: user.id,
        message,
        is_admin: true
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-replies"] });
      setReplyMessage("");
      toast({ title: "Reply sent", description: "Your reply has been added to the ticket." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleStatusChange = (ticketId: string, newStatus: TicketStatus) => {
    updateStatusMutation.mutate({ ticketId, newStatus });
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status: newStatus });
    }
  };

  const handleSendReply = () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    sendReplyMutation.mutate({ ticketId: selectedTicket.id, message: replyMessage.trim() });
  };

  // Filter tickets
  const filteredTickets = tickets?.filter(t => 
    statusFilter === "all" || t.status === statusFilter
  );

  // Stats
  const stats = {
    total: tickets?.length || 0,
    open: tickets?.filter(t => t.status === "open").length || 0,
    inProgress: tickets?.filter(t => t.status === "in_progress").length || 0,
    resolved: tickets?.filter(t => t.status === "resolved" || t.status === "closed").length || 0
  };

  return (
    <AdminLayout title="Support Requests" description="View and manage all support requests">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card/80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-secondary border-border">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Tickets List */}
      <Card className="border-0 shadow-sm bg-card/80">
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
          <CardDescription>
            {filteredTickets?.length || 0} tickets found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredTickets || filteredTickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No tickets found.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => {
                const priority = priorityConfig[ticket.priority];
                const status = statusConfig[ticket.status];
                return (
                  <div
                    key={ticket.id}
                    className="p-4 rounded-lg bg-muted/50 border border-border/50 hover:border-border transition-colors cursor-pointer"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{ticket.subject}</h4>
                          {ticket.priority === "urgent" && (
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {ticket.message}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className={priority.color}>{priority.label} priority</span>
                          <span>•</span>
                          <span>{format(new Date(ticket.created_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={ticket.status}
                          onValueChange={(v) => handleStatusChange(ticket.id, v as TicketStatus)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                            <Badge variant={status.variant} className="gap-1">
                              {status.icon}
                              {status.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              Created {selectedTicket && format(new Date(selectedTicket.created_at), "MMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTicket && (
            <>
              <div className="flex items-center gap-4 py-2">
                <Badge variant={statusConfig[selectedTicket.status].variant} className="gap-1">
                  {statusConfig[selectedTicket.status].icon}
                  {statusConfig[selectedTicket.status].label}
                </Badge>
                <span className={`text-sm ${priorityConfig[selectedTicket.priority].color}`}>
                  {priorityConfig[selectedTicket.priority].label} Priority
                </span>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm">{selectedTicket.message}</p>
              </div>

              <ScrollArea className="flex-1 min-h-32 max-h-60">
                <div className="space-y-3 pr-4">
                  {replies?.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-3 rounded-lg ${
                        reply.is_admin 
                          ? "bg-primary/10 border border-primary/20 ml-8" 
                          : "bg-muted/50 border border-border mr-8"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {reply.is_admin ? "Admin" : "User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reply.created_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm">{reply.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="min-h-20 bg-secondary border-border"
                />
                <Button 
                  className="gradient-primary text-primary-foreground shrink-0"
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim() || sendReplyMutation.isPending}
                >
                  {sendReplyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSupport;
