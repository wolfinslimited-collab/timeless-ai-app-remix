import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import TopMenu from "@/components/TopMenu";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

type TicketPriority = "low" | "medium" | "high" | "urgent";
type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

const statusConfig: Record<TicketStatus, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "Open", icon: <AlertCircle className="h-3 w-3" />, variant: "default" },
  in_progress: { label: "In Progress", icon: <Clock className="h-3 w-3" />, variant: "secondary" },
  resolved: { label: "Resolved", icon: <CheckCircle className="h-3 w-3" />, variant: "outline" },
  closed: { label: "Closed", icon: <CheckCircle className="h-3 w-3" />, variant: "outline" },
};

const Support = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: myTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSubmitTicket = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to submit a support request.",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a subject and message.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
        priority,
        status: "open" as TicketStatus,
      });

      if (error) throw error;

      toast({
        title: "Request submitted",
        description: "We'll get back to you as soon as possible.",
      });

      setSubject("");
      setMessage("");
      setPriority("medium");
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />
      
      <main className="container px-4 py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Support</h1>
          <p className="text-muted-foreground">
            Need help? Submit a support request and we'll assist you.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Submit Request Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                New Support Request
              </CardTitle>
              <CardDescription>
                Describe your issue and we'll help you resolve it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">Sign in to submit a request</p>
                  <Button onClick={() => navigate("/auth")}>Sign In</Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subject</label>
                    <Input
                      placeholder="Brief description of your issue"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Textarea
                      placeholder="Describe your issue in detail..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                    />
                  </div>
                  <Button 
                    onClick={handleSubmitTicket} 
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Request
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* My Requests */}
          <Card>
            <CardHeader>
              <CardTitle>My Requests</CardTitle>
              <CardDescription>Track the status of your support requests</CardDescription>
            </CardHeader>
            <CardContent>
              {!user ? (
                <p className="text-muted-foreground text-center py-6">
                  Sign in to view your requests
                </p>
              ) : ticketsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : myTickets && myTickets.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {myTickets.map((ticket) => {
                    const status = statusConfig[ticket.status as TicketStatus];
                    return (
                      <div
                        key={ticket.id}
                        className="p-3 rounded-lg border border-border bg-secondary/30"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-sm line-clamp-1">{ticket.subject}</h4>
                          <Badge variant={status.variant} className="shrink-0 gap-1">
                            {status.icon}
                            {status.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {ticket.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">
                  No requests yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Support;
