import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Coins, Sparkles, Zap, Crown, Loader2, Infinity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const creditPackages = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 50,
    price: 4.99,
    priceId: "price_1SrcTeCpOaBygRMzLIWgPj5N",
    features: ["50 credits", "~10 image generations", "~5 video storyboards"],
    icon: Coins,
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 150,
    price: 9.99,
    priceId: "price_1SrcTpCpOaBygRMzleZEbBV6",
    popular: true,
    features: ["150 credits", "~30 image generations", "~15 video storyboards", "Best value per credit"],
    icon: Zap,
  },
  {
    id: "ultimate",
    name: "Ultimate Pack",
    credits: 500,
    price: 19.99,
    priceId: "price_1SrcU0CpOaBygRMzYAhHRnqv",
    features: ["500 credits", "~100 image generations", "~50 video storyboards", "Priority support"],
    icon: Crown,
  },
];

const subscriptionPlan = {
  id: "unlimited",
  name: "Timeless Pro",
  price: 19.99,
  priceId: "price_1SrcXaCpOaBygRMz5atgcaW3",
  features: [
    "Unlimited image generations",
    "Unlimited video storyboards",
    "Priority processing",
    "Early access to new features",
    "Cancel anytime",
  ],
  icon: Infinity,
};

const Pricing = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, loading: creditsLoading, refetch: refetchCredits, hasActiveSubscription } = useCredits();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const type = searchParams.get("type");
    
    if (success === "true") {
      if (type === "subscription") {
        toast({
          title: "Subscription activated!",
          description: "You now have unlimited generations. Enjoy creating!",
        });
      } else {
        toast({
          title: "Payment successful!",
          description: "Your credits have been added to your account.",
        });
      }
      refetchCredits();
    } else if (searchParams.get("canceled") === "true") {
      toast({
        variant: "destructive",
        title: "Payment canceled",
        description: "Your payment was canceled.",
      });
    }
  }, [searchParams, toast, refetchCredits]);

  const handlePurchase = async (packageId: string, priceId: string, isSubscription = false) => {
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
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Pricing</span>
            </div>
            <h1 className="text-4xl font-bold mb-3">Choose Your Plan</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get credits for one-time use or go unlimited with a Pro subscription.
            </p>
            
            {user && (
              <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-6 py-2">
                  <Coins className="h-5 w-5 text-accent" />
                  <span className="text-lg font-semibold">
                    {creditsLoading ? "..." : credits ?? 0} credits
                  </span>
                </div>
                {hasActiveSubscription && (
                  <Badge className="gradient-primary text-primary-foreground px-4 py-2 text-sm">
                    <Infinity className="h-4 w-4 mr-1" />
                    Pro Subscriber
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Subscription Card */}
          <div className="mb-12">
            <Card className="relative border-primary/50 bg-gradient-to-br from-card to-primary/5 shadow-xl shadow-primary/10 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
              
              <Badge className="absolute top-4 right-4 gradient-primary text-primary-foreground">
                Best Value
              </Badge>
              
              <div className="grid md:grid-cols-2 gap-8 p-8">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary">
                      <Infinity className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{subscriptionPlan.name}</h2>
                      <p className="text-muted-foreground">Unlimited everything</p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <span className="text-5xl font-bold">${subscriptionPlan.price}</span>
                    <span className="text-xl text-muted-foreground">/month</span>
                  </div>
                  
                  <Button 
                    onClick={() => handlePurchase(subscriptionPlan.id, subscriptionPlan.priceId, true)}
                    disabled={loadingPackage !== null || hasActiveSubscription}
                    className="gradient-primary text-primary-foreground w-full md:w-auto px-8"
                    size="lg"
                  >
                    {loadingPackage === subscriptionPlan.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : hasActiveSubscription ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Currently Subscribed
                      </>
                    ) : (
                      "Subscribe Now"
                    )}
                  </Button>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-4">What's included:</h3>
                  <ul className="space-y-3">
                    {subscriptionPlan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full gradient-primary">
                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Separator */}
          <div className="flex items-center gap-4 mb-12">
            <Separator className="flex-1" />
            <span className="text-muted-foreground font-medium">Or buy credit packs</span>
            <Separator className="flex-1" />
          </div>

          {/* Credit Packages */}
          <div className="grid gap-6 md:grid-cols-3 mb-12">
            {creditPackages.map((pkg) => {
              const Icon = pkg.icon;
              return (
                <Card 
                  key={pkg.id}
                  className={`relative border-border/50 bg-card transition-all hover:border-primary/50 ${
                    pkg.popular ? "border-primary/50 shadow-lg shadow-primary/10" : ""
                  }`}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground">
                      Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${
                      pkg.popular ? "gradient-primary" : "bg-secondary"
                    }`}>
                      <Icon className={`h-7 w-7 ${pkg.popular ? "text-primary-foreground" : "text-primary"}`} />
                    </div>
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <CardDescription className="text-base">
                      <span className="text-3xl font-bold text-foreground">${pkg.price}</span>
                      <span className="text-muted-foreground"> one-time</span>
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <ul className="space-y-3">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-3">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                            <Check className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button 
                      onClick={() => handlePurchase(pkg.id, pkg.priceId)}
                      disabled={loadingPackage !== null}
                      className={`w-full ${pkg.popular ? "gradient-primary text-primary-foreground" : ""}`}
                      variant={pkg.popular ? "default" : "outline"}
                      size="lg"
                    >
                      {loadingPackage === pkg.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>Purchase {pkg.credits} Credits</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="text-center text-sm text-muted-foreground">
            <p>All purchases are secure. Credits never expire. Subscriptions can be canceled anytime.</p>
            <p className="mt-1">Powered by Stripe.</p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Pricing;
