import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import TopMenu from "@/components/TopMenu";
import BottomNav from "@/components/BottomNav";
import CreditsHistory from "@/components/CreditsHistory";
import CreditPackageSkeleton from "@/components/CreditPackageSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Loader2, CreditCard, Plus, Crown, ArrowLeft, Sparkles, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// 1 credit = $0.01 cost | 30% profit margin for one-time purchases
const creditPackages = [
  {
    id: "starter-credits",
    name: "Starter",
    credits: 350,
    price: 5.00,
    priceId: "price_1SskytCpOaBygRMzKn3QRWI8",
    description: "Perfect for trying out new features",
    icon: CreditCard,
  },
  {
    id: "plus-credits",
    name: "Plus",
    credits: 700,
    price: 10.00,
    priceId: "price_1Sskz8CpOaBygRMzhfTitmx9",
    popular: true,
    description: "Great value for regular creators",
    icon: Plus,
  },
  {
    id: "pro-credits",
    name: "Pro",
    credits: 1400,
    price: 20.00,
    priceId: "price_1SskzeCpOaBygRMzxFMSYoPK",
    bestValue: true,
    description: "Best savings for power users",
    icon: Crown,
  },
];

const Credits = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, loading: creditsLoading } = useCredits();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);

  const handlePurchase = async (packageId: string, priceId: string) => {
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
        body: { priceId, isSubscription: false }
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

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
      <div className="min-h-screen bg-background">
        <TopMenu />
        <main className="pb-20 md:pb-8">
          <div className="max-w-4xl mx-auto p-4 sm:p-6">
            {/* Skeleton header */}
            <div className="mb-8 sm:mb-10 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Credit Packs</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-3">Top Up Your Credits</h1>
              <p className="text-base text-muted-foreground max-w-lg mx-auto">
                Need extra credits? Purchase a one-time credit pack anytime.
              </p>
            </div>
            
            {/* Skeleton packages grid */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 mb-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <CreditPackageSkeleton key={i} />
              ))}
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopMenu />

      <main className="pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          {/* Back Button */}
          <button
            onClick={() => navigate("/pricing")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Plans</span>
          </button>

          {/* Header */}
          <div className="mb-8 sm:mb-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 mb-4">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Credit Packs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">Top Up Your Credits</h1>
            <p className="text-base text-muted-foreground max-w-lg mx-auto">
              Need extra credits? Purchase a one-time credit pack anytime.
            </p>
            
            {/* Current Balance */}
            {user && (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-5 py-2">
                <Coins className="h-5 w-5 text-accent" />
                <span className="text-base font-semibold">
                  {creditsLoading ? "..." : credits ?? 0} credits
                </span>
              </div>
            )}
          </div>

          {/* Credit Packages Grid */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3 mb-8">
            {creditPackages.map((pkg) => {
              const Icon = pkg.icon;
              const isHighlighted = pkg.popular || pkg.bestValue;
              const pricePerCredit = (pkg.price / pkg.credits * 100).toFixed(2);
              
              return (
                <Card 
                  key={pkg.id}
                  className={`relative border-border/50 bg-card transition-all hover:border-primary/50 ${
                    isHighlighted ? "border-primary/50 shadow-lg shadow-primary/10" : ""
                  }`}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-primary-foreground text-xs">
                      Popular
                    </Badge>
                  )}
                  {pkg.bestValue && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs">
                      Best Value
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <div className={`mx-auto mb-3 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl ${
                      isHighlighted ? "gradient-primary" : "bg-secondary"
                    }`}>
                      <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${isHighlighted ? "text-primary-foreground" : "text-primary"}`} />
                    </div>
                    <CardTitle className="text-lg sm:text-xl">{pkg.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
                    <div className="mt-3">
                      <span className="text-2xl sm:text-3xl font-bold text-foreground">${pkg.price.toFixed(2)}</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-base font-semibold text-primary">{pkg.credits.toLocaleString()} credits</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ${pricePerCredit}¢ per credit
                    </p>
                  </CardHeader>
                  
                  <CardContent className="pt-2">
                    <Button 
                      onClick={() => handlePurchase(pkg.id, pkg.priceId)}
                      disabled={loadingPackage !== null}
                      className={`w-full ${isHighlighted ? "gradient-primary text-primary-foreground" : ""}`}
                      variant={isHighlighted ? "default" : "outline"}
                      size="lg"
                    >
                      {loadingPackage === pkg.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>Buy Now</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Referral Program Link */}
          {user && (
            <Card className="mb-8 border-border/50 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Gift className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Referral Program</h3>
                    <p className="text-sm text-muted-foreground">Earn 50 credits for each friend who subscribes</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => navigate("/referrals")}>
                  View Program
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Credits History Section */}
          <div className="mb-8">
            <CreditsHistory />
          </div>

          {/* Info Footer */}
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Credits never expire. Use them anytime for AI generations.
            </p>
            <button 
              onClick={() => navigate("/pricing")}
              className="text-sm text-primary hover:underline"
            >
              Looking for subscription plans? View all plans →
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Credits;
