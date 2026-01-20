import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, Calendar, Infinity, Settings, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Subscription = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { credits, subscriptionStatus, hasActiveSubscription, loading: creditsLoading, refetch } = useCredits();
  const [managingPortal, setManagingPortal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
                <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/20">
                      <Infinity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Timeless Pro</h3>
                      <p className="text-sm text-muted-foreground">Unlimited generations</p>
                    </div>
                  </div>
                  <Badge className="bg-primary text-primary-foreground">Active</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>$19.99/month • Auto-renews monthly</span>
                </div>
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
                ? "Update payment method, cancel, or view billing history"
                : "Upgrade to unlock unlimited generations"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasActiveSubscription ? (
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
                    Manage Billing & Cancel
                  </>
                )}
              </Button>
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
    </div>
  );
};

export default Subscription;
