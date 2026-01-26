import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Calendar, Infinity, Settings, RefreshCw, Loader2, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const CANCELLATION_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_using", label: "Not using it enough" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "found_alternative", label: "Found a better alternative" },
  { value: "technical_issues", label: "Technical issues" },
  { value: "temporary", label: "Taking a break, will return" },
  { value: "other", label: "Other reason" },
];

const Subscription = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { credits, subscriptionStatus, subscriptionEndDate, hasActiveSubscription, isCancelling, loading: creditsLoading, refetch } = useCredits();
  const [managingPortal, setManagingPortal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelFeedback, setCancelFeedback] = useState("");

  const handleReactivateSubscription = async () => {
    if (!user) {
      toast.error("Please sign in to reactivate your subscription");
      return;
    }

    setReactivating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("reactivate-subscription", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Subscription reactivated! Your subscription will continue as normal.");
        await refetch();
      } else {
        throw new Error(data?.error || "Failed to reactivate subscription");
      }
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      toast.error("Failed to reactivate subscription. Please try again.");
    } finally {
      setReactivating(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      toast.error("Please sign in to manage your subscription");
      return;
    }

    setManagingPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("Failed to get portal URL");
      }
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast.error("Failed to open subscription management. Please try again.");
    } finally {
      setManagingPortal(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !cancelReason) {
      toast.error("Please select a reason for cancellation");
      return;
    }

    setCancelling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: {
          reason: cancelReason,
          feedback: cancelFeedback,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Subscription cancelled successfully. You'll have access until the end of your billing period.");
        setCancelDialogOpen(false);
        setCancelReason("");
        setCancelFeedback("");
        await refetch();
      } else {
        throw new Error(data?.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast.error("Failed to cancel subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast.success("Subscription status refreshed");
  };

  if (authLoading || creditsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-muted-foreground">Please sign in to view your subscription</p>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Subscription</h1>
            <p className="text-muted-foreground">Manage your plan and billing</p>
          </div>
        </div>

        {/* Current Plan Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasActiveSubscription ? (
              <>
                <div className={`flex items-center justify-between p-4 rounded-lg border ${isCancelling ? 'bg-amber-500/10 border-amber-500/20' : 'bg-primary/10 border-primary/20'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isCancelling ? 'bg-amber-500/20' : 'bg-primary/20'}`}>
                      <Infinity className={`h-5 w-5 ${isCancelling ? 'text-amber-500' : 'text-primary'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Timeless Pro</h3>
                      <p className="text-sm text-muted-foreground">Unlimited generations</p>
                    </div>
                  </div>
                  <Badge className={isCancelling ? 'bg-amber-500 text-white' : 'bg-primary text-primary-foreground'}>
                    {isCancelling ? 'Cancelling' : 'Active'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {isCancelling && subscriptionEndDate ? (
                    <span>Access until {new Date(subscriptionEndDate).toLocaleDateString()}</span>
                  ) : (
                    <span>$19.99/month • Auto-renews monthly</span>
                  )}
                </div>
                {isCancelling && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm">
                    <p className="text-amber-200">Your subscription is set to cancel. You'll still have access until the end of your billing period.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-semibold text-foreground">Free Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      {credits !== null ? `${credits} credits remaining` : "Loading..."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage Subscription
            </CardTitle>
            <CardDescription>
              {hasActiveSubscription
                ? "Update payment method, view billing history, or cancel"
                : "Upgrade to unlock unlimited generations"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasActiveSubscription ? (
              <>
                <Button 
                  onClick={handleManageSubscription} 
                  disabled={managingPortal}
                  className="w-full"
                >
                  {managingPortal ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opening Portal...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Billing
                    </>
                  )}
                </Button>
                {isCancelling ? (
                  <Button 
                    variant="outline"
                    onClick={handleReactivateSubscription}
                    disabled={reactivating}
                    className="w-full border-primary text-primary hover:bg-primary/10"
                  >
                    {reactivating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Reactivating...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reactivate Subscription
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    variant="destructive"
                    onClick={() => setCancelDialogOpen(true)}
                    className="w-full"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Subscription
                  </Button>
                )}
              </>
            ) : (
              <Button 
                onClick={() => navigate("/pricing")}
                className="w-full"
              >
                View Plans
              </Button>
            )}
            
            <p className="text-xs text-center text-muted-foreground">
              {hasActiveSubscription 
                ? "You'll be redirected to our secure billing portal powered by Stripe"
                : "Purchase credits or subscribe for unlimited access"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              We're sorry to see you go. Please let us know why you're cancelling so we can improve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for cancellation</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {CANCELLATION_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Additional feedback (optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Tell us more about your experience..."
                value={cancelFeedback}
                onChange={(e) => setCancelFeedback(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <p>Your subscription will remain active until the end of your current billing period. You won't be charged again.</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelling || !cancelReason}
              className="w-full sm:w-auto"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscription;
