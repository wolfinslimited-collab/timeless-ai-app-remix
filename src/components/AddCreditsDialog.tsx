import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Coins, Zap, Crown, Infinity, Loader2, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const creditPackages = [
  {
    id: "starter",
    name: "Starter",
    credits: 50,
    price: 4.99,
    priceId: "price_1SrcTeCpOaBygRMzLIWgPj5N",
    icon: Coins,
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 150,
    price: 9.99,
    priceId: "price_1SrcTpCpOaBygRMzleZEbBV6",
    popular: true,
    icon: Zap,
  },
  {
    id: "ultimate",
    name: "Ultimate",
    credits: 500,
    price: 19.99,
    priceId: "price_1SrcU0CpOaBygRMzYAhHRnqv",
    icon: Crown,
  },
];

const subscriptionPlan = {
  id: "unlimited",
  name: "Timeless Pro",
  price: 19.99,
  priceId: "price_1SrcXaCpOaBygRMz5atgcaW3",
  icon: Infinity,
};

interface AddCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCredits?: number;
  requiredCredits?: number;
}

export const AddCreditsDialog = ({
  open,
  onOpenChange,
  currentCredits = 0,
  requiredCredits = 0,
}: AddCreditsDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);

  const handlePurchase = async (packageId: string, priceId: string, isSubscription = false) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "Please sign in to make a purchase.",
      });
      onOpenChange(false);
      navigate("/auth");
      return;
    }

    setLoadingPackage(packageId);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId, isSubscription }
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

  const creditsNeeded = requiredCredits - currentCredits;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Add Credits to Continue
          </DialogTitle>
          <DialogDescription className="text-base">
            {creditsNeeded > 0 ? (
              <>You need <span className="font-semibold text-foreground">{creditsNeeded} more credits</span> for this generation.</>
            ) : (
              "Choose a credit package or go unlimited with Pro."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current balance */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
            <span className="text-sm text-muted-foreground">Current Balance</span>
            <div className="flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="font-semibold">{currentCredits} credits</span>
            </div>
          </div>

          {/* Pro Subscription - Quick Option */}
          <button
            onClick={() => handlePurchase(subscriptionPlan.id, subscriptionPlan.priceId, true)}
            disabled={loadingPackage !== null}
            className="w-full p-4 rounded-xl border-2 border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <Infinity className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{subscriptionPlan.name}</p>
                  <p className="text-xs text-muted-foreground">Unlimited generations</p>
                </div>
              </div>
              <div className="text-right">
                {loadingPackage === subscriptionPlan.id ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <>
                    <p className="font-bold text-lg">${subscriptionPlan.price}</p>
                    <p className="text-xs text-muted-foreground">/month</p>
                  </>
                )}
              </div>
            </div>
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">or buy credits</span>
            </div>
          </div>

          {/* Credit Packages */}
          <div className="grid grid-cols-3 gap-2">
            {creditPackages.map((pkg) => {
              const Icon = pkg.icon;
              return (
                <button
                  key={pkg.id}
                  onClick={() => handlePurchase(pkg.id, pkg.priceId)}
                  disabled={loadingPackage !== null}
                  className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                    pkg.popular 
                      ? "border-primary/50 bg-primary/5 hover:bg-primary/10" 
                      : "border-border/50 hover:border-border hover:bg-secondary/50"
                  }`}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
                      Best
                    </Badge>
                  )}
                  <div className={`mx-auto mb-2 h-8 w-8 rounded-lg flex items-center justify-center ${
                    pkg.popular ? "bg-primary" : "bg-secondary"
                  }`}>
                    {loadingPackage === pkg.id ? (
                      <Loader2 className={`h-4 w-4 animate-spin ${pkg.popular ? "text-primary-foreground" : "text-primary"}`} />
                    ) : (
                      <Icon className={`h-4 w-4 ${pkg.popular ? "text-primary-foreground" : "text-primary"}`} />
                    )}
                  </div>
                  <p className="font-semibold text-sm">{pkg.credits}</p>
                  <p className="text-xs text-muted-foreground">credits</p>
                  <p className="text-sm font-medium mt-1">${pkg.price}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-border/50">
          <button 
            onClick={() => navigate("/pricing")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all plans →
          </button>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddCreditsDialog;
