import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Coins, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
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

const Pricing = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, loading: creditsLoading, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({
        title: "Payment successful!",
        description: "Your credits have been added to your account.",
      });
      refetchCredits();
    } else if (searchParams.get("canceled") === "true") {
      toast({
        variant: "destructive",
        title: "Payment canceled",
        description: "Your payment was canceled. No credits were added.",
      });
    }
  }, [searchParams, toast, refetchCredits]);

  const handlePurchase = async (packageId: string, priceId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to purchase credits.",
      });
      navigate("/auth");
      return;
    }

    setLoadingPackage(packageId);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId }
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
        <div className="max-w-5xl mx-auto p-6">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Credit Packages</span>
            </div>
            <h1 className="text-4xl font-bold mb-3">Get More Credits</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Purchase credits to generate stunning AI images and videos. 
              Choose the package that fits your creative needs.
            </p>
            
            {user && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-6 py-2">
                <Coins className="h-5 w-5 text-accent" />
                <span className="text-lg font-semibold">
                  Current Balance: {creditsLoading ? "..." : credits ?? 0} credits
                </span>
              </div>
            )}
          </div>

          {/* Pricing Cards */}
          <div className="grid gap-6 md:grid-cols-3">
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
                      Most Popular
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
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>All purchases are one-time payments. Credits never expire.</p>
            <p className="mt-1">Secure payment powered by Stripe.</p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Pricing;
