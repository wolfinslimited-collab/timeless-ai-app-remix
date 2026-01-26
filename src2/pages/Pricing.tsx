import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import TopMenu from "@/components/TopMenu";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Coins, Sparkles, Zap, Crown, Loader2, Star, Calendar, Award, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackSubscribe, trackPurchase, trackInitiateCheckout } from "@/lib/fbPixel";

// 1 credit = $0.01 cost | 50% profit margin for subscriptions
const subscriptionPlans = [
  {
    id: "premium-monthly",
    name: "Premium",
    period: "Monthly",
    credits: 500,
    price: 9.99,
    priceId: "price_1SsTCRCpOaBygRMzaYvMeCVZ",
    features: ["500 credits/month", "~60 image generations", "~12 video clips", "Priority support"],
    icon: Zap,
  },
  {
    id: "premium-yearly",
    name: "Premium",
    period: "Yearly",
    credits: 5000,
    price: 99.99,
    priceId: "price_1SsTCdCpOaBygRMzezP7vu5t",
    popular: true,
    features: ["5,000 credits/year", "~600 image generations", "~125 video clips", "Save $19.89/year", "Priority support"],
    icon: Calendar,
  },
  {
    id: "premium-plus-monthly",
    name: "Premium Plus",
    period: "Monthly",
    credits: 1000,
    price: 19.99,
    priceId: "price_1SsTD3CpOaBygRMz4Zidlmny",
    features: ["1,000 credits/month", "~120 image generations", "~25 video clips", "VIP support", "Early access"],
    icon: Crown,
  },
  {
    id: "premium-plus-yearly",
    name: "Premium Plus",
    period: "Yearly",
    credits: 7500,
    price: 149.99,
    priceId: "price_1SsTDGCpOaBygRMzr08YAnjw",
    bestValue: true,
    features: ["7,500 credits/year", "~900 image generations", "~187 video clips", "Save $89.89/year", "VIP support", "Early access"],
    icon: Award,
  },
];


const Pricing = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, loading: creditsLoading, refetch: refetchCredits, hasActiveSubscription } = useCredits();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"Monthly" | "Yearly">("Monthly");

  const filteredPlans = subscriptionPlans.filter(plan => plan.period === billingPeriod);

  useEffect(() => {
    const success = searchParams.get("success");
    const type = searchParams.get("type");
    const canceled = searchParams.get("canceled");
    
    // Only process once - check if we have params to handle
    if (!success && !canceled) return;
    
    // Clear the URL params immediately to prevent duplicate processing
    const url = new URL(window.location.href);
    url.searchParams.delete("success");
    url.searchParams.delete("type");
    url.searchParams.delete("canceled");
    window.history.replaceState({}, "", url.pathname);
    
    if (success === "true") {
      if (type === "subscription") {
        // Track subscription with Facebook Pixel
        trackSubscribe({
          value: 9.99, // Default to monthly price
          currency: 'USD',
        });
        
        toast({
          title: "Subscription activated!",
          description: "Your credits have been added. Enjoy creating!",
        });
      } else {
        // Track credit purchase with Facebook Pixel
        trackPurchase({
          value: 4.99, // Default value
          currency: 'USD',
          content_name: 'Credit Pack',
          content_type: 'credits',
        });
        
        toast({
          title: "Payment successful!",
          description: "Your credits have been added to your account.",
        });
      }
      refetchCredits();
    } else if (canceled === "true") {
      toast({
        variant: "destructive",
        title: "Payment canceled",
        description: "Your payment was canceled.",
      });
    }
  }, []);

  const handlePurchase = async (packageId: string, priceId: string, isSubscription: boolean) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to make a purchase.",
      });
      navigate("/auth");
      return;
    }

    setLoadingPackage(packageId);

    // Track checkout initiation with Facebook Pixel
    const plan = subscriptionPlans.find(p => p.id === packageId);
    trackInitiateCheckout({
      value: plan?.price,
      currency: 'USD',
      content_name: plan ? `${plan.name} ${plan.period}` : packageId,
    });

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, isSubscription }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({
        variant: "destructive",
        title: "Checkout failed",
        description: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoadingPackage(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      <main className="pb-20 md:pb-8">
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          {/* Header */}
          <div className="mb-8 sm:mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Pricing</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-3">Choose Your Plan</h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Get credits for AI image and video generation with our subscription plans or one-time purchases.
            </p>
            
            {/* Billing Toggle */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setBillingPeriod("Monthly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  billingPeriod === "Monthly"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod("Yearly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  billingPeriod === "Yearly"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <Badge variant="secondary" className="bg-green-500/20 text-green-500 text-xs">
                  Save 17%
                </Badge>
              </button>
            </div>
            
            {user && (
              <div className="mt-6 flex items-center justify-center gap-3 sm:gap-4 flex-wrap px-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 sm:px-6 py-2">
                  <Coins className="h-4 sm:h-5 w-4 sm:w-5 text-accent" />
                  <span className="text-base sm:text-lg font-semibold">
                    {creditsLoading ? "..." : credits ?? 0} credits
                  </span>
                </div>
                {hasActiveSubscription && (
                  <Badge className="gradient-primary text-primary-foreground px-3 sm:px-4 py-2 text-xs sm:text-sm">
                    <Star className="h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                    Active Subscriber
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Subscription Plans Grid */}
          <div className="mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-6">Subscription Plans</h2>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto">
              {filteredPlans.map((plan) => {
                const Icon = plan.icon;
                const isHighlighted = plan.popular || plan.bestValue;
                return (
                  <Card 
                    key={plan.id}
                    className={`relative border-border/50 bg-card transition-all hover:border-primary/50 flex flex-col ${
                      isHighlighted ? "border-primary/50 shadow-lg shadow-primary/10" : ""
                    }`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground text-xs">
                        Popular
                      </Badge>
                    )}
                    {plan.bestValue && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs">
                        Best Value
                      </Badge>
                    )}
                    
                    <CardHeader className="text-center pb-4">
                      <div className={`mx-auto mb-4 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl ${
                        isHighlighted ? "gradient-primary" : "bg-secondary"
                      }`}>
                        <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${isHighlighted ? "text-primary-foreground" : "text-primary"}`} />
                      </div>
                      <CardTitle className="text-lg sm:text-xl">{plan.name}</CardTitle>
                      <CardDescription className="text-sm font-medium text-muted-foreground">
                        {plan.period}
                      </CardDescription>
                      <div className="mt-2">
                        <span className="text-2xl sm:text-3xl font-bold text-foreground">${plan.price}</span>
                        <span className="text-muted-foreground text-sm">/{plan.period === "Monthly" ? "mo" : "yr"}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm font-semibold text-primary">{plan.credits.toLocaleString()} credits</span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col">
                      <ul className="space-y-2 sm:space-y-3 flex-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-3">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-xs sm:text-sm text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button 
                        onClick={() => handlePurchase(plan.id, plan.priceId, true)}
                        disabled={loadingPackage !== null}
                        className={`w-full mt-6 ${isHighlighted ? "gradient-primary text-primary-foreground" : ""}`}
                        variant={isHighlighted ? "default" : "outline"}
                        size="lg"
                      >
                        {loadingPackage === plan.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>Subscribe</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Link to Credit Packs */}
          <div className="mb-8 sm:mb-12 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-4 rounded-xl border border-border/50 bg-secondary/30">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-accent" />
                <span className="text-sm text-muted-foreground">Need a quick top-up?</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/credits")}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Buy Credit Packs
              </Button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-xs sm:text-sm text-muted-foreground px-4">
            <p>All purchases are secure. Subscriptions can be canceled anytime.</p>
            <p className="mt-1">Powered by Stripe.</p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Pricing;
