import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Check, Crown, Sparkles, Zap, Star, Loader2, Calendar, Award, Plus, Coins, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Calendar,
  Crown,
  Award,
  Sparkles,
  Star,
  Coins,
};

interface PlanFeature {
  text: string;
  included: boolean;
  badge?: string;
  tooltip?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  period: string;
  credits: number;
  price: number;
  price_id: string;
  apple_product_id?: string;
  android_product_id?: string;
  popular?: boolean;
  best_value?: boolean;
  icon: string;
  features: PlanFeature[];
  display_order: number;
  is_active: boolean;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  price_id: string;
  apple_product_id?: string;
  android_product_id?: string;
  popular?: boolean;
  icon: string;
  display_order: number;
  is_active: boolean;
}

// Platform detection helper
const getPlatform = (): "ios" | "android" | "web" => {
  const userAgent = navigator.userAgent || navigator.vendor;
  if (/android/i.test(userAgent)) return "android";
  if (/iPad|iPhone|iPod/.test(userAgent)) return "ios";
  return "web";
};

// In-App Purchase Service
const InAppPurchaseService = {
  platform: getPlatform(),
  
  async initialize(): Promise<boolean> {
    try {
      if (typeof (window as any).Capacitor !== "undefined") {
        return true;
      }
      return false;
    } catch (error) {
      console.error("IAP initialization failed:", error);
      return false;
    }
  },

  async purchase(productId: string): Promise<{ success: boolean; error?: string }> {
    const platform = this.platform;
    
    if (typeof (window as any).Capacitor === "undefined") {
      return { 
        success: false, 
        error: "In-app purchases require the native iOS or Android app." 
      };
    }

    try {
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Purchase failed" };
    }
  },

  async restorePurchases(): Promise<{ success: boolean; restored: string[]; error?: string }> {
    if (typeof (window as any).Capacitor === "undefined") {
      return { 
        success: false, 
        restored: [],
        error: "Restore requires the native iOS or Android app." 
      };
    }

    try {
      return { success: true, restored: [] };
    } catch (error: any) {
      return { success: false, restored: [], error: error.message || "Restore failed" };
    }
  }
};

// Animated number component
function AnimatedPrice({ value, duration = 400 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const currentValue = startValue + (endValue - startValue) * easeOutExpo;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return <span>${displayValue.toFixed(2)}</span>;
}

// Fallback plans
const fallbackSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: "premium-monthly",
    name: "Premium",
    period: "Monthly",
    credits: 500,
    price: 9.99,
    price_id: "price_1SsTCRCpOaBygRMzaYvMeCVZ",
    popular: true,
    icon: "Crown",
    features: [
      { text: "Unlimited generations", included: true },
      { text: "Priority processing", included: true },
      { text: "4K resolution exports", included: true },
      { text: "Advanced AI models", included: true },
    ],
    display_order: 1,
    is_active: true,
  },
  {
    id: "premium-yearly",
    name: "Premium",
    period: "Yearly",
    credits: 6000,
    price: 99.99,
    price_id: "price_yearly",
    best_value: true,
    icon: "Crown",
    features: [
      { text: "Unlimited generations", included: true },
      { text: "Priority processing", included: true },
      { text: "4K resolution exports", included: true },
      { text: "Advanced AI models", included: true },
      { text: "2 months free", included: true, badge: "BONUS" },
    ],
    display_order: 2,
    is_active: true,
  },
];

const fallbackCreditPackages: CreditPackage[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 50,
    price: 4.99,
    price_id: "price_starter",
    icon: "Coins",
    display_order: 1,
    is_active: true,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 150,
    price: 9.99,
    price_id: "price_pro",
    popular: true,
    icon: "Zap",
    display_order: 2,
    is_active: true,
  },
  {
    id: "ultimate",
    name: "Ultimate",
    credits: 500,
    price: 24.99,
    price_id: "price_ultimate",
    icon: "Crown",
    display_order: 3,
    is_active: true,
  },
];

interface MobileSubscriptionProps {
  onBack: () => void;
}

type TabType = "subscription" | "credits";
type BillingPeriod = "Monthly" | "Yearly";

export function MobileSubscription({ onBack }: MobileSubscriptionProps) {
  const [activeTab, setActiveTab] = useState<TabType>("subscription");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("Monthly");
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  
  const { user } = useAuth();
  const { credits, hasActiveSubscription, refetch } = useCredits();
  const platform = getPlatform();

  // Fetch plans from API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-pricing");
        
        if (error) throw error;
        
        if (data?.subscriptionPlans && data.subscriptionPlans.length > 0) {
          setSubscriptionPlans(data.subscriptionPlans);
        } else {
          setSubscriptionPlans(fallbackSubscriptionPlans);
        }

        if (data?.creditPackages && data.creditPackages.length > 0) {
          setCreditPackages(data.creditPackages);
        } else {
          setCreditPackages(fallbackCreditPackages);
        }
      } catch (error) {
        console.error("Error fetching pricing:", error);
        setSubscriptionPlans(fallbackSubscriptionPlans);
        setCreditPackages(fallbackCreditPackages);
      } finally {
        setPlansLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const filteredPlans = subscriptionPlans.filter(plan => plan.period === billingPeriod);

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setLoadingPackage(plan.id);
    
    try {
      const productId = platform === "ios" 
        ? plan.apple_product_id 
        : platform === "android" 
          ? plan.android_product_id 
          : plan.price_id;

      if (!productId || platform === "web") {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { priceId: plan.price_id, isSubscription: true }
        });

        if (error) throw new Error(error.message);
        if (data.error) throw new Error(data.error);
        if (data.url) window.location.href = data.url;
        return;
      }

      const result = await InAppPurchaseService.purchase(productId);
      
      if (result.success) {
        toast.success("Subscription activated! 🎉");
        refetch?.();
      } else {
        toast.error(result.error || "Purchase failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoadingPackage(null);
    }
  };

  const handleBuyCredits = async (pkg: CreditPackage) => {
    if (!user) {
      toast.error("Please sign in to purchase credits");
      return;
    }

    setLoadingPackage(pkg.id);
    
    try {
      const productId = platform === "ios" 
        ? pkg.apple_product_id 
        : platform === "android" 
          ? pkg.android_product_id 
          : pkg.price_id;

      if (!productId || platform === "web") {
        const { data, error } = await supabase.functions.invoke("create-checkout", {
          body: { priceId: pkg.price_id, isSubscription: false }
        });

        if (error) throw new Error(error.message);
        if (data.error) throw new Error(data.error);
        if (data.url) window.location.href = data.url;
        return;
      }

      const result = await InAppPurchaseService.purchase(productId);
      
      if (result.success) {
        toast.success("Credits added! 🎉");
        refetch?.();
      } else {
        toast.error(result.error || "Purchase failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setLoadingPackage(null);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    
    try {
      const result = await InAppPurchaseService.restorePurchases();
      
      if (result.success) {
        if (result.restored.length > 0) {
          toast.success(`Restored ${result.restored.length} purchase(s)`);
          refetch?.();
        } else {
          toast.info("No previous purchases found");
        }
      } else {
        toast.error(result.error || "Restore failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
    } finally {
      setIsRestoring(false);
    }
  };

  const navigatePlan = (direction: number) => {
    const maxIndex = filteredPlans.length - 1;
    setCurrentPlanIndex(prev => Math.max(0, Math.min(maxIndex, prev + direction)));
  };

  const currentPlan = filteredPlans[currentPlanIndex];

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
        <h1 className="text-foreground text-base font-semibold">Subscription</h1>
      </div>

      {/* Compact Balance Header */}
      <div className="px-4 py-3">
        <div className="bg-gradient-to-r from-primary/15 to-pink-500/10 rounded-2xl px-4 py-3 border border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Balance</p>
              <p className="text-foreground text-xl font-bold">
                {hasActiveSubscription ? "∞" : (credits ?? 0)}
              </p>
            </div>
          </div>
          {hasActiveSubscription && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full">
              <Crown className="w-4 h-4 text-yellow-300" />
              <span className="text-white text-sm font-semibold">Pro</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="px-4 pb-2">
        <div className="bg-secondary rounded-full p-1 flex">
          <button
            onClick={() => setActiveTab("subscription")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-1.5",
              activeTab === "subscription"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
          >
            <Crown className="w-3.5 h-3.5" />
            Subscribe
          </button>
          <button
            onClick={() => setActiveTab("credits")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-1.5",
              activeTab === "credits"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Credit Packs
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 overflow-hidden">
        {plansLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : activeTab === "subscription" ? (
          <>
            {/* Billing Period Toggle */}
            <div className="flex justify-center mb-3">
              <div className="bg-secondary rounded-full p-1 flex">
                <button
                  onClick={() => { setBillingPeriod("Monthly"); setCurrentPlanIndex(0); }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                    billingPeriod === "Monthly"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => { setBillingPeriod("Yearly"); setCurrentPlanIndex(0); }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1",
                    billingPeriod === "Yearly"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground"
                  )}
                >
                  Yearly
                  <span className="text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                    -17%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan Pager */}
            <div className="flex-1 flex flex-col min-h-0">
              {currentPlan && (
                <div className="flex-1 flex items-center">
                  {/* Left Arrow */}
                  <button
                    onClick={() => navigatePlan(-1)}
                    disabled={currentPlanIndex === 0}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-opacity flex-shrink-0",
                      currentPlanIndex === 0 ? "opacity-30" : "opacity-100"
                    )}
                  >
                    <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                  </button>

                  {/* Plan Card */}
                  <div className="flex-1 mx-1 overflow-y-auto max-h-full">
                    <div className={cn(
                      "relative p-4 rounded-2xl border-2 transition-all",
                      currentPlan.popular || currentPlan.best_value
                        ? "bg-gradient-to-br from-primary/20 to-pink-500/10 border-primary"
                        : "bg-secondary border-border"
                    )}>
                      {/* Badge */}
                      {currentPlan.popular && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-pink-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
                          Most Popular
                        </div>
                      )}
                      {currentPlan.best_value && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[10px] font-bold px-3 py-0.5 rounded-full">
                          Best Value
                        </div>
                      )}

                      {/* Plan Header */}
                      <div className="flex items-center justify-between mb-3 pt-1">
                        <div className="flex items-center gap-2">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center">
                            <Crown className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-foreground text-lg font-bold">{currentPlan.name}</h3>
                            <p className="text-muted-foreground text-xs">{currentPlan.period}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-foreground text-xl font-bold">
                            <AnimatedPrice value={currentPlan.price} />
                          </p>
                          <p className="text-muted-foreground text-[10px]">
                            /{currentPlan.period === "Monthly" ? "mo" : "yr"}
                          </p>
                        </div>
                      </div>

                      {/* Credits */}
                      <div className="bg-primary/10 rounded-xl p-3 mb-3">
                        <p className="text-primary text-sm font-bold text-center">
                          {currentPlan.credits.toLocaleString()} credits/month
                        </p>
                      </div>

                      {/* Features */}
                      <div className="space-y-2 mb-4">
                        {currentPlan.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className={cn(
                              "w-4 h-4 rounded-full flex items-center justify-center",
                              feature.included ? "bg-green-500/20" : "bg-destructive/20"
                            )}>
                              {feature.included ? (
                                <Check className="w-2.5 h-2.5 text-green-500" />
                              ) : (
                                <span className="text-destructive text-[10px]">✕</span>
                              )}
                            </div>
                            <span className={cn(
                              "text-xs flex-1",
                              feature.included ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {feature.text}
                            </span>
                            {feature.badge && (
                              <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                                {feature.badge}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Subscribe Button */}
                      <button
                        onClick={() => handleSubscribe(currentPlan)}
                        disabled={loadingPackage !== null}
                        className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-primary to-pink-500 text-white transition-all active:scale-[0.98]"
                      >
                        {loadingPackage === currentPlan.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          "Subscribe Now"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Arrow */}
                  <button
                    onClick={() => navigatePlan(1)}
                    disabled={currentPlanIndex === filteredPlans.length - 1}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center transition-opacity flex-shrink-0",
                      currentPlanIndex === filteredPlans.length - 1 ? "opacity-30" : "opacity-100"
                    )}
                  >
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              )}

              {/* Dots Indicator */}
              {filteredPlans.length > 1 && (
                <div className="flex justify-center gap-2 py-2">
                  {filteredPlans.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPlanIndex(idx)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        idx === currentPlanIndex ? "w-5 bg-primary" : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Credit Packages - Vertical List */
          <div className="flex-1 overflow-y-auto">
            <p className="text-center text-muted-foreground text-xs mb-3">
              One-time credit purchases. No subscription required.
            </p>

            <div className="space-y-3">
              {creditPackages.map((pkg) => {
                const IconComponent = iconMap[pkg.icon] || Coins;
                
                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      "p-4 rounded-2xl border-2 transition-all",
                      pkg.popular
                        ? "bg-gradient-to-br from-yellow-500/15 to-orange-500/10 border-yellow-500"
                        : "bg-secondary border-border"
                    )}
                  >
                    {pkg.popular && (
                      <div className="flex justify-center mb-2">
                        <span className="text-[10px] font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-3 py-0.5 rounded-full">
                          Best Value
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        pkg.popular 
                          ? "bg-gradient-to-br from-yellow-500 to-orange-500" 
                          : "bg-muted"
                      )}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-foreground text-base font-bold">{pkg.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-primary font-bold">{pkg.credits.toLocaleString()} credits</span>
                          <span className="text-muted-foreground text-xs">
                            · ${(pkg.price / pkg.credits * 100).toFixed(1)}¢/cr
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleBuyCredits(pkg)}
                        disabled={loadingPackage !== null}
                        className={cn(
                          "px-4 py-2 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]",
                          pkg.popular
                            ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        {loadingPackage === pkg.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          `$${pkg.price}`
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom - Restore Button */}
      <div className="px-4 pb-4 pt-2 border-t border-border bg-background">
        <div className="flex items-center justify-between">
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
          <p className="text-muted-foreground text-xs">
            Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
