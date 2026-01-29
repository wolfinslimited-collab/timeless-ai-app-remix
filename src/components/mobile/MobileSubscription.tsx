import { useState } from "react";
import { ArrowLeft, Crown, Loader2, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MobileSubscriptionProps {
  onBack: () => void;
}

export function MobileSubscription({ onBack }: MobileSubscriptionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const { user } = useAuth();
  const { credits, hasActiveSubscription, refetch } = useCredits();

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setIsLoading(true);

    try {
      if (hasActiveSubscription) {
        // Open customer portal for managing subscription
        const { data, error } = await supabase.functions.invoke("create-portal-session");
        if (error) throw new Error(error.message);
        if (data.error) throw new Error(data.error);
        if (data.url) window.location.href = data.url;
      } else {
        // Navigate to pricing for new subscription
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { priceId: "price_1SsTCRCpOaBygRMzaYvMeCVZ", isSubscription: true }
        });
        if (error) throw new Error(error.message);
        if (data.error) throw new Error(data.error);
        if (data.url) window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);

    try {
      // Simulate restore for web (native IAP would handle this)
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Purchases restored successfully");
      refetch?.();
    } catch (error: any) {
      toast.error(error.message || "Restore failed");
    } finally {
      setIsRestoring(false);
    }
  };

  const displayName = user?.email?.split("@")[0] || "User";
  const userInitial = displayName[0]?.toUpperCase() || "U";

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-2 flex items-center gap-3 border-b border-border">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-foreground text-base font-semibold">Account</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-4 flex flex-col">
        {/* Profile Card: Avatar + Email */}
        <div className="bg-card rounded-2xl p-5 border border-border mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{userInitial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">
                {displayName}
              </h2>
              <p className="text-muted-foreground text-sm truncate">
                {user?.email || ""}
              </p>
            </div>
          </div>
        </div>

        {/* Credits & Plan Card */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-foreground">
                {hasActiveSubscription ? "∞ credits" : `${credits ?? 0} credits`}
              </p>
              <p className="text-muted-foreground text-xs">
                {hasActiveSubscription ? "Timeless Pro" : "Free plan"}
              </p>
            </div>
            <div
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold",
                hasActiveSubscription
                  ? "bg-gradient-to-r from-primary to-pink-500 text-white"
                  : "bg-secondary text-foreground"
              )}
            >
              {hasActiveSubscription ? "Pro" : "Free"}
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Action Card */}
        <div className="bg-card/95 rounded-3xl p-4 border border-border mb-6">
          {/* Subscribe/Manage Button */}
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className={cn(
              "w-full py-4 rounded-2xl font-semibold text-base text-white transition-all flex items-center justify-center gap-2",
              hasActiveSubscription
                ? "bg-gradient-to-r from-green-600 to-emerald-600"
                : "bg-gradient-to-r from-primary to-pink-500"
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {hasActiveSubscription && <Check className="w-5 h-5" />}
                {hasActiveSubscription ? "Manage Subscription" : "Subscribe Now"}
              </>
            )}
          </button>

          {/* Restore & Cancel info */}
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className="text-primary text-sm font-medium flex items-center gap-1.5"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Restoring...
                </>
              ) : (
                "Restore Purchases"
              )}
            </button>
            <p className="text-muted-foreground text-xs">Cancel anytime</p>
          </div>
        </div>
      </div>
    </div>
  );
}
