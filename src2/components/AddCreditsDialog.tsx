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
import { Coins, Crown, Loader2, Sparkles, CreditCard, Plus } from "lucide-react";
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
    icon: CreditCard,
  },
  {
    id: "plus-credits",
    name: "Plus",
    credits: 700,
    price: 10.00,
    priceId: "price_1Sskz8CpOaBygRMzhfTitmx9",
    popular: true,
    icon: Plus,
  },
  {
    id: "pro-credits",
    name: "Pro",
    credits: 1400,
    price: 20.00,
    priceId: "price_1SskzeCpOaBygRMzxFMSYoPK",
    bestValue: true,
    icon: Crown,
  },
];

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

  const handlePurchase = async (packageId: string, priceId: string) => {
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
        body: { priceId, isSubscription: true }
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
              "Top up your credits instantly."
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

          {/* Credit Packages */}
          <div className="grid grid-cols-3 gap-2">
            {creditPackages.map((pkg) => {
              const Icon = pkg.icon;
              const isHighlighted = pkg.popular || pkg.bestValue;
              return (
                <button
                  key={pkg.id}
                  onClick={() => handlePurchase(pkg.id, pkg.priceId)}
                  disabled={loadingPackage !== null}
                  className={`relative p-3 rounded-xl border-2 transition-all text-center ${
                    isHighlighted 
                      ? "border-primary/50 bg-primary/5 hover:bg-primary/10" 
                      : "border-border/50 hover:border-border hover:bg-secondary/50"
                  }`}
                >
                  {pkg.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
                      Popular
                    </Badge>
                  )}
                  {pkg.bestValue && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-1.5 py-0 bg-amber-500 text-white">
                      Best
                    </Badge>
                  )}
                  <div className={`mx-auto mb-2 h-8 w-8 rounded-lg flex items-center justify-center ${
                    isHighlighted ? "bg-primary" : "bg-secondary"
                  }`}>
                    {loadingPackage === pkg.id ? (
                      <Loader2 className={`h-4 w-4 animate-spin ${isHighlighted ? "text-primary-foreground" : "text-primary"}`} />
                    ) : (
                      <Icon className={`h-4 w-4 ${isHighlighted ? "text-primary-foreground" : "text-primary"}`} />
                    )}
                  </div>
                  <p className="font-semibold text-sm">{pkg.name}</p>
                  <p className="text-sm font-semibold text-primary mt-1">{pkg.credits.toLocaleString()} credits</p>
                  <p className="text-sm font-medium">${pkg.price.toFixed(2)}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-border/50">
          <button 
            onClick={() => {
              onOpenChange(false);
              navigate("/credits");
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all packs →
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
