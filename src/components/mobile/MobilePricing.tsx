import { useState, useRef, TouchEvent } from "react";
import { ArrowLeft, Crown, Loader2, Check, Zap, Plus, Lock, Star, Award, Sparkles, Coins, Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MobilePricingProps {
  onBack: () => void;
}

interface PlanFeature {
  text: string;
  included: boolean;
  badge?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  period: string;
  credits: number;
  price: number;
  priceId: string;
  popular?: boolean;
  bestValue?: boolean;
  icon: string;
  features: PlanFeature[];
  displayOrder: number;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  priceId: string;
  popular?: boolean;
  icon: string;
  displayOrder: number;
}

// Plans matching the create-checkout edge function price IDs
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "premium-monthly",
    name: "Premium",
    period: "Monthly",
    credits: 500,
    price: 9.99,
    priceId: "price_1SsTCRCpOaBygRMzaYvMeCVZ",
    popular: true,
    icon: "Crown",
    displayOrder: 1,
    features: [
      { text: "500 credits per month", included: true },
      { text: "Access to all AI tools", included: true },
      { text: "HD image generation", included: true },
      { text: "Priority processing", included: true },
      { text: "No watermarks", included: true },
    ],
  },
  {
    id: "premium-plus-monthly",
    name: "Premium Plus",
    period: "Monthly",
    credits: 1000,
    price: 19.99,
    priceId: "price_1SsTD3CpOaBygRMz4Zidlmny",
    bestValue: true,
    icon: "Star",
    displayOrder: 2,
    features: [
      { text: "1,000 credits per month", included: true },
      { text: "Access to all AI tools", included: true },
      { text: "4K image generation", included: true, badge: "New" },
      { text: "Priority processing", included: true },
      { text: "No watermarks", included: true },
      { text: "Early access to new features", included: true },
    ],
  },
];

const YEARLY_PLANS: SubscriptionPlan[] = [
  {
    id: "premium-yearly",
    name: "Premium",
    period: "Yearly",
    credits: 5000,
    price: 99.99,
    priceId: "price_1SsTCdCpOaBygRMzezP7vu5t",
    popular: true,
    icon: "Crown",
    displayOrder: 1,
    features: [
      { text: "5,000 credits per year", included: true },
      { text: "Access to all AI tools", included: true },
      { text: "HD image generation", included: true },
      { text: "Priority processing", included: true },
      { text: "No watermarks", included: true },
    ],
  },
  {
    id: "premium-plus-yearly",
    name: "Premium Plus",
    period: "Yearly",
    credits: 7500,
    price: 199.99,
    priceId: "price_1SsTDGCpOaBygRMzr08YAnjw",
    bestValue: true,
    icon: "Star",
    displayOrder: 2,
    features: [
      { text: "7,500 credits per year", included: true },
      { text: "Access to all AI tools", included: true },
      { text: "4K image generation", included: true, badge: "New" },
      { text: "Priority processing", included: true },
      { text: "No watermarks", included: true },
      { text: "Early access to new features", included: true },
    ],
  },
];

const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "credits_350", name: "Starter", credits: 350, price: 4.99, priceId: "price_1SskytCpOaBygRMzKn3QRWI8", icon: "Coins", displayOrder: 1 },
  { id: "credits_700", name: "Plus", credits: 700, price: 9.99, priceId: "price_1Sskz8CpOaBygRMzhfTitmx9", popular: true, icon: "Sparkles", displayOrder: 2 },
  { id: "credits_1400", name: "Pro", credits: 1400, price: 19.99, priceId: "price_1SskzeCpOaBygRMzxFMSYoPK", icon: "Star", displayOrder: 3 },
];

const ALL_PLANS = [...SUBSCRIPTION_PLANS, ...YEARLY_PLANS];

function getIcon(iconName: string) {
  switch (iconName) {
    case "Zap": return Zap;
    case "Crown": return Crown;
    case "Star": return Star;
    case "Award": return Award;
    case "Sparkles": return Sparkles;
    case "Coins": return Coins;
    default: return Zap;
  }
}

/** Get plan rank for upgrade/downgrade comparison. Higher = better. */
function getPlanRank(planId: string): number {
  const plan = ALL_PLANS.find(p => p.id.toLowerCase() === planId.toLowerCase());
  if (!plan) return 0;
  let rank = plan.displayOrder * 10;
  if (plan.period === "Yearly") rank += 5;
  return rank;
}

function isPlanDowngrade(currentPlanId: string, targetPlanId: string): boolean {
  return getPlanRank(targetPlanId) < getPlanRank(currentPlanId);
}

export function MobilePricing({ onBack }: MobilePricingProps) {
  const [activeTab, setActiveTab] = useState<"subscriptions" | "credits">("subscriptions");
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [isSubscribeLoading, setIsSubscribeLoading] = useState(false);

  const { user } = useAuth();
  const { credits, hasActiveSubscription, currentPlan, refetch } = useCredits();

  const plans = isYearly ? YEARLY_PLANS : SUBSCRIPTION_PLANS;

  const isCurrentPlan = (planId: string) => {
    if (!hasActiveSubscription || !currentPlan) return false;
    return currentPlan.toLowerCase() === planId.toLowerCase();
  };

  const isDowngrade = (planId: string) => {
    if (!hasActiveSubscription || !currentPlan) return false;
    if (isCurrentPlan(planId)) return false;
    return isPlanDowngrade(currentPlan, planId);
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      return;
    }
    setIsSubscribeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: plan.priceId, isSubscription: true }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsSubscribeLoading(false);
    }
  };

  const handleCreditPurchase = async (pkg: CreditPackage) => {
    if (!hasActiveSubscription) {
      toast.error("A premium subscription is required to purchase credits");
      setActiveTab("subscriptions");
      return;
    }
    setLoadingPackageId(pkg.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: pkg.priceId, isSubscription: false }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoadingPackageId(null);
    }
  };

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
        <h1 className="text-foreground text-base font-semibold flex-1">Pricing</h1>
        
        {!hasActiveSubscription && (
          <div className="px-2.5 py-1.5 bg-secondary rounded-full flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-foreground" />
            <span className="text-xs font-semibold">{credits ?? 0}</span>
          </div>
        )}
        
        {hasActiveSubscription && (
          <div className="px-2 py-1 bg-gradient-to-r from-primary/30 to-pink-500/30 rounded-xl flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[11px] font-semibold">Pro</span>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="mx-4 mt-4 p-1 bg-secondary rounded-2xl">
        <div className="flex">
          <button
            onClick={() => setActiveTab("subscriptions")}
            className={cn(
              "flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm font-medium transition-all",
              activeTab === "subscriptions"
                ? "bg-gradient-to-r from-primary to-pink-500 text-white"
                : "text-muted-foreground"
            )}
          >
            <Crown className="w-4 h-4" />
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab("credits")}
            className={cn(
              "flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm font-medium transition-all",
              activeTab === "credits"
                ? "bg-gradient-to-r from-primary to-pink-500 text-white"
                : "text-muted-foreground"
            )}
          >
            <Plus className="w-4 h-4" />
            Credit Packs
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "subscriptions" ? (
          <SubscriptionsTab
            plans={plans}
            isYearly={isYearly}
            setIsYearly={setIsYearly}
            currentPlanIndex={currentPlanIndex}
            setCurrentPlanIndex={setCurrentPlanIndex}
            isLoading={isSubscribeLoading}
            isCurrentPlan={isCurrentPlan}
            isDowngrade={isDowngrade}
            onSubscribe={handleSubscribe}
          />
        ) : (
          <CreditPacksTab
            packages={CREDIT_PACKAGES}
            hasActiveSubscription={hasActiveSubscription}
            loadingPackageId={loadingPackageId}
            onPurchase={handleCreditPurchase}
            onViewPlans={() => setActiveTab("subscriptions")}
          />
        )}
      </div>
    </div>
  );
}

function SubscriptionsTab({
  plans,
  isYearly,
  setIsYearly,
  currentPlanIndex,
  setCurrentPlanIndex,
  isLoading,
  isCurrentPlan,
  isDowngrade,
  onSubscribe,
}: {
  plans: SubscriptionPlan[];
  isYearly: boolean;
  setIsYearly: (v: boolean) => void;
  currentPlanIndex: number;
  setCurrentPlanIndex: (v: number) => void;
  isLoading: boolean;
  isCurrentPlan: (id: string) => boolean;
  isDowngrade: (id: string) => boolean;
  onSubscribe: (plan: SubscriptionPlan) => void;
}) {
  const plan = plans[currentPlanIndex] || plans[0];
  if (!plan) return null;
  
  const Icon = getIcon(plan.icon);
  const isCurrent = isCurrentPlan(plan.id);
  const isDown = isDowngrade(plan.id);
  const isHighlighted = plan.popular || plan.bestValue;

  // Touch swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentPlanIndex < plans.length - 1) setCurrentPlanIndex(currentPlanIndex + 1);
      if (diff < 0 && currentPlanIndex > 0) setCurrentPlanIndex(currentPlanIndex - 1);
    }
  };

  return (
    <div className="px-4 pt-4 flex flex-col h-full">
      {/* Monthly/Yearly Toggle */}
      <div className="flex justify-center mb-4">
        <div className="p-1 bg-secondary rounded-xl flex">
          <button
            onClick={() => { setIsYearly(false); setCurrentPlanIndex(0); }}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-bold transition-all",
              !isYearly ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => { setIsYearly(true); setCurrentPlanIndex(0); }}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
              isYearly ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            Yearly
            <span className="px-1.5 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded-md">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Swipeable Plan Card */}
      <div
        className="flex-1 overflow-y-auto pb-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative">
          {/* Current Plan Badge - positioned above card */}
          {isCurrent && (
            <div className="flex justify-center mb-2">
              <div className="px-3.5 py-1.5 bg-green-500 text-white text-xs font-bold rounded-full">
                Current Plan
              </div>
            </div>
          )}

          <div
            className={cn(
              "rounded-[20px] p-5 border-2 transition-all",
              isCurrent
                ? "border-green-500 bg-card"
                : isHighlighted
                ? "border-primary bg-gradient-to-br from-primary/20 to-pink-500/20"
                : "border-border bg-card"
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  isHighlighted
                    ? "bg-gradient-to-br from-primary to-pink-500"
                    : "bg-secondary"
                )}
              >
                <Icon className={cn("w-6 h-6", isHighlighted ? "text-white" : "text-primary")} />
              </div>
              <div className="flex-1">
                <div className="flex items-end gap-1">
                  <span className="text-[22px] font-bold text-foreground">${plan.price.toFixed(2)}</span>
                  <span className="text-muted-foreground text-xs mb-1">
                    /{plan.period === "Monthly" ? "mo" : "yr"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">{plan.name}</span>
                  {plan.popular && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-primary to-pink-500 text-white text-[10px] font-bold rounded-lg">
                      Popular
                    </span>
                  )}
                  {plan.bestValue && !plan.popular && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-lg">
                      Best Value
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Credits Badge */}
            <div className="bg-secondary rounded-xl py-2.5 text-center mb-4">
              <span className="text-primary font-semibold">
                {plan.credits.toLocaleString()} credits
              </span>
            </div>

            {/* Features */}
            <div className="space-y-2.5 mb-5">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                      feature.included ? "bg-green-500/20" : "bg-red-500/20"
                    )}
                  >
                    {feature.included ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <span className="text-red-500 text-xs">✕</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[13px] flex-1",
                      feature.included ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {feature.text}
                  </span>
                  {feature.badge && (
                    <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-semibold rounded-md">
                      {feature.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Subscribe / Current Plan / Downgrade Button */}
            {isCurrent ? (
              <div className="w-full py-3.5 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-green-500 font-bold text-[15px]">Your Current Plan</span>
              </div>
            ) : isDown ? (
              <div className="w-full py-3.5 rounded-xl bg-secondary/50 border border-border/30 flex items-center justify-center">
                <span className="text-muted-foreground font-medium text-sm">Current plan is higher</span>
              </div>
            ) : (
              <button
                onClick={() => onSubscribe(plan)}
                disabled={isLoading}
                className={cn(
                  "w-full py-3.5 rounded-xl font-semibold text-[15px] transition-all flex items-center justify-center",
                  isHighlighted
                    ? "bg-gradient-to-r from-primary to-pink-500 text-white"
                    : "bg-secondary border border-border text-foreground"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </button>
            )}
          </div>

          {/* Footer */}
          <p className="text-muted-foreground text-[11px] text-center mt-3 px-4">
            Payment will be charged to your account. Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.
          </p>
        </div>
      </div>

      {/* Plan Indicators */}
      {plans.length > 1 && (
        <div className="flex justify-center gap-2 pb-4">
          {plans.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentPlanIndex(idx)}
              className={cn(
                "h-2 rounded-full transition-all",
                currentPlanIndex === idx ? "w-5 bg-primary" : "w-2 bg-border"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CreditPacksTab({
  packages,
  hasActiveSubscription,
  loadingPackageId,
  onPurchase,
  onViewPlans,
}: {
  packages: CreditPackage[];
  hasActiveSubscription: boolean;
  loadingPackageId: string | null;
  onPurchase: (pkg: CreditPackage) => void;
  onViewPlans: () => void;
}) {
  return (
    <div className="px-4 pt-4 pb-24">
      {/* Premium Required Message */}
      {!hasActiveSubscription && (
        <>
          <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-pink-500/10 border border-primary/30 mb-6">
            <div className="flex flex-col items-center text-center">
              <Lock className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-lg font-bold text-foreground mb-2">Premium Required</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Subscribe to a premium plan to unlock credit purchases.
              </p>
              <button
                onClick={onViewPlans}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-pink-500 text-white font-semibold"
              >
                View Subscription Plans
              </button>
            </div>
          </div>
          
          <p className="text-muted-foreground text-sm text-center mb-4">
            Credit packs available after subscribing:
          </p>
        </>
      )}

      {hasActiveSubscription && (
        <p className="text-muted-foreground text-sm text-center mb-5">
          One-time credit purchases for Pro members.
        </p>
      )}

      {/* Credit Packages */}
      <div className="space-y-3">
        {packages.map((pkg) => {
          const Icon = getIcon(pkg.icon);
          const isThisLoading = loadingPackageId === pkg.id;
          const anyLoading = loadingPackageId !== null;
          const isPopular = pkg.popular;

          return (
            <div
              key={pkg.id}
              className={cn(
                "p-4 rounded-2xl border transition-all",
                !hasActiveSubscription ? "opacity-50 pointer-events-none" : "",
                isPopular
                  ? "border-primary bg-gradient-to-r from-primary/10 to-pink-500/10"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isPopular
                      ? "bg-gradient-to-br from-primary to-pink-500"
                      : "bg-secondary"
                  )}
                >
                  <Icon className={cn("w-6 h-6", isPopular ? "text-white" : "text-primary")} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{pkg.name}</span>
                    {isPopular && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-primary to-pink-500 text-white text-[9px] font-bold rounded-lg flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5" />
                        Popular
                      </span>
                    )}
                  </div>
                  <span className="text-primary font-semibold text-sm">
                    {pkg.credits.toLocaleString()} credits
                  </span>
                </div>
                {/* Gradient buy button for all packages (matching Flutter) */}
                <button
                  onClick={() => onPurchase(pkg)}
                  disabled={anyLoading || !hasActiveSubscription}
                  className={cn(
                    "min-w-[72px] px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center",
                    "bg-gradient-to-r from-primary to-pink-500 text-white",
                    anyLoading && !isThisLoading ? "opacity-50" : ""
                  )}
                >
                  {isThisLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `$${pkg.price.toFixed(2)}`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-muted-foreground text-[11px] text-center mt-6">
        Credits never expire and can be used for any generation.
      </p>
    </div>
  );
}
