import { useState } from "react";
import { ArrowLeft, Check, Crown, Sparkles, Zap, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { cn } from "@/lib/utils";

interface MobileSubscriptionProps {
  onBack: () => void;
}

type PlanType = "premium" | "premiumPlus";
type BillingCycle = "monthly" | "yearly";

interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyProductId: string;
  yearlyProductId: string;
  features: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const plans: Record<PlanType, SubscriptionPlan> = {
  premium: {
    id: "premium",
    name: "Premium",
    monthlyPrice: 9.99,
    yearlyPrice: 79.99,
    monthlyProductId: "com.timelessai.premium.monthly",
    yearlyProductId: "com.timelessai.premium.yearly",
    features: [
      "500 credits monthly",
      "HD quality exports",
      "Priority processing",
      "Basic AI models",
    ],
    icon: Crown,
  },
  premiumPlus: {
    id: "premiumPlus",
    name: "Premium+",
    monthlyPrice: 19.99,
    yearlyPrice: 149.99,
    monthlyProductId: "com.timelessai.premiumplus.monthly",
    yearlyProductId: "com.timelessai.premiumplus.yearly",
    features: [
      "Unlimited credits",
      "4K quality exports",
      "Faster responses & priority lanes",
      "Advanced AI models",
      "Early access to new features",
    ],
    icon: Sparkles,
  },
};

export function MobileSubscription({ onBack }: MobileSubscriptionProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("premiumPlus");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { hasActiveSubscription, subscriptionStatus } = useCredits();

  const currentPlan = plans[selectedPlan];
  const price = billingCycle === "monthly" ? currentPlan.monthlyPrice : currentPlan.yearlyPrice;
  const productId = billingCycle === "monthly" ? currentPlan.monthlyProductId : currentPlan.yearlyProductId;
  const yearlySavings = Math.round(((currentPlan.monthlyPrice * 12 - currentPlan.yearlyPrice) / (currentPlan.monthlyPrice * 12)) * 100);

  const handleSubscribe = async () => {
    setIsLoading(true);
    // This will be handled by native in-app purchase
    // For web preview, we'll show a message
    console.log("Subscribe to:", productId);
    
    // Simulate purchase flow
    setTimeout(() => {
      setIsLoading(false);
      alert(`In-app purchase would be triggered for: ${productId}\n\nThis requires native iOS/Android integration.`);
    }, 1000);
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-[#0a0a0f] to-[#0f0f18]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white text-lg font-semibold">Subscription</h1>
      </div>

      {/* Current Status */}
      {hasActiveSubscription && (
        <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-2xl border border-purple-500/30">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-medium">Active Subscription</span>
          </div>
          <p className="text-gray-400 text-sm mt-1">You're currently on the Pro plan</p>
        </div>
      )}

      {/* Plan Toggle */}
      <div className="px-4 mb-4">
        <div className="bg-white/5 rounded-full p-1 flex">
          <button
            onClick={() => setSelectedPlan("premium")}
            className={cn(
              "flex-1 py-3 rounded-full text-sm font-medium transition-all",
              selectedPlan === "premium"
                ? "bg-white text-black"
                : "text-gray-400"
            )}
          >
            Premium
          </button>
          <button
            onClick={() => setSelectedPlan("premiumPlus")}
            className={cn(
              "flex-1 py-3 rounded-full text-sm font-medium transition-all",
              selectedPlan === "premiumPlus"
                ? "bg-white text-black"
                : "text-gray-400"
            )}
          >
            Premium+
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-center text-gray-400 text-sm px-4 mb-6">
        {selectedPlan === "premium" 
          ? "Perfect for casual creators and hobbyists."
          : "Unlocks faster responses and deeper capabilities."}
      </p>

      {/* Billing Cycle Cards */}
      <div className="px-4 space-y-3 mb-6">
        {/* Monthly Card */}
        <button
          onClick={() => setBillingCycle("monthly")}
          className={cn(
            "w-full p-4 rounded-2xl border-2 transition-all text-left",
            billingCycle === "monthly"
              ? "bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500"
              : "bg-white/5 border-transparent"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white font-semibold text-sm uppercase tracking-wide">Monthly Access</p>
              <p className="text-gray-400 text-xs uppercase">Flexible monthly billing</p>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center",
              billingCycle === "monthly" ? "border-purple-500 bg-purple-500" : "border-gray-600"
            )}>
              {billingCycle === "monthly" && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-white text-3xl font-bold">${currentPlan.monthlyPrice}</span>
            <span className="text-gray-400 text-sm">/mo</span>
          </div>
        </button>

        {/* Yearly Card */}
        <button
          onClick={() => setBillingCycle("yearly")}
          className={cn(
            "w-full p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden",
            billingCycle === "yearly"
              ? "bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500"
              : "bg-white/5 border-transparent"
          )}
        >
          {/* Best Value Badge */}
          <div className="absolute top-3 right-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            Save {yearlySavings}%
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white font-semibold text-sm uppercase tracking-wide">Yearly Access</p>
              <p className="text-gray-400 text-xs uppercase">Best value</p>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center",
              billingCycle === "yearly" ? "border-purple-500 bg-purple-500" : "border-gray-600"
            )}>
              {billingCycle === "yearly" && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-white text-3xl font-bold">${currentPlan.yearlyPrice}</span>
            <span className="text-gray-400 text-sm">/year</span>
          </div>
          <p className="text-purple-400 text-xs mt-1">
            ${(currentPlan.yearlyPrice / 12).toFixed(2)}/mo billed annually
          </p>
        </button>
      </div>

      {/* Features List */}
      <div className="px-4 mb-6">
        <div className="bg-white/5 rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <currentPlan.icon className="w-5 h-5 text-purple-400" />
            What's included
          </h3>
          <div className="space-y-3">
            {currentPlan.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-purple-400" />
                </div>
                <span className="text-gray-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscribe Button */}
      <div className="px-4 pb-6">
        <button
          onClick={handleSubscribe}
          disabled={isLoading || hasActiveSubscription}
          className={cn(
            "w-full py-4 rounded-2xl font-semibold text-white transition-all",
            hasActiveSubscription
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-600 to-pink-600 active:scale-[0.98]"
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : hasActiveSubscription ? (
            "Already Subscribed"
          ) : (
            `Subscribe for $${price}/${billingCycle === "monthly" ? "mo" : "year"}`
          )}
        </button>
        
        <p className="text-center text-gray-500 text-xs mt-3">
          Cancel anytime. Subscription renews automatically.
        </p>
      </div>

      {/* Restore Purchases */}
      <div className="px-4 pb-8">
        <button className="w-full py-3 text-purple-400 text-sm font-medium">
          Restore Purchases
        </button>
      </div>
    </div>
  );
}
