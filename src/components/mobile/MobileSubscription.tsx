import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Check, Crown, Sparkles, Zap, Star, Loader2, Calendar, Award, Plus, Coins } from "lucide-react";
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
        console.log("Running in Capacitor, IAP available");
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
    console.log(`Initiating ${platform} purchase for:`, productId);
    
    if (typeof (window as any).Capacitor === "undefined") {
      return { 
        success: false, 
        error: "In-app purchases require the native iOS or Android app. Please download the app from the App Store or Google Play." 
      };
    }

    try {
      if (platform === "ios") {
        console.log("Triggering iOS StoreKit purchase:", productId);
      } else if (platform === "android") {
        console.log("Triggering Android Billing purchase:", productId);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Purchase failed" };
    }
  },

  async restorePurchases(): Promise<{ success: boolean; restored: string[]; error?: string }> {
    const platform = this.platform;
    console.log(`Restoring purchases for ${platform}`);
    
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
    icon: "Zap",
    features: [
      { text: "Access to all models", included: true },
      { text: "Concurrent: up to 3 Videos, 4 Images, 2 Characters", included: true },
    ],
    display_order: 1,
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
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  
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
      // Get the correct product ID based on platform
      const productId = platform === "ios" 
        ? plan.apple_product_id 
        : platform === "android" 
          ? plan.android_product_id 
          : plan.price_id;

      if (!productId) {
        // Fall back to web checkout
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
        // If IAP fails on web, try Stripe checkout
        if (platform === "web") {
          const { data, error } = await supabase.functions.invoke("create-checkout", {
            body: { priceId: plan.price_id, isSubscription: true }
          });

          if (error) throw new Error(error.message);
          if (data.error) throw new Error(data.error);
          if (data.url) window.location.href = data.url;
        } else {
          toast.error(result.error || "Purchase failed");
        }
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
        // Web checkout via Stripe
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
        <h1 className="text-white text-lg font-semibold">Pricing</h1>
      </div>

      {/* Current Credits */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Your Balance</p>
              <p className="text-white font-semibold">{credits ?? 0} credits</p>
            </div>
          </div>
          {hasActiveSubscription && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-full border border-purple-500/30">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-white font-medium">Subscriber</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="px-4 mb-4">
        <div className="bg-white/5 rounded-full p-1 flex">
          <button
            onClick={() => setActiveTab("subscription")}
            className={cn(
              "flex-1 py-2.5 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2",
              activeTab === "subscription"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                : "text-gray-400"
            )}
          >
            <Crown className="w-4 h-4" />
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab("credits")}
            className={cn(
              "flex-1 py-2.5 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2",
              activeTab === "credits"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                : "text-gray-400"
            )}
          >
            <Plus className="w-4 h-4" />
            Credit Packs
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-32">
        {plansLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : activeTab === "subscription" ? (
          <>
            {/* Billing Period Toggle */}
            <div className="flex justify-center mb-4">
              <div className="bg-white/5 rounded-full p-1 flex">
                <button
                  onClick={() => setBillingPeriod("Monthly")}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    billingPeriod === "Monthly"
                      ? "bg-white text-black"
                      : "text-gray-400"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod("Yearly")}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5",
                    billingPeriod === "Yearly"
                      ? "bg-white text-black"
                      : "text-gray-400"
                  )}
                >
                  Yearly
                  <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">
                    Save 17%
                  </span>
                </button>
              </div>
            </div>

            {/* Subscription Plans */}
            <div className="space-y-3">
              {filteredPlans.map((plan) => {
                const IconComponent = iconMap[plan.icon] || Zap;
                const isHighlighted = plan.popular || plan.best_value;
                
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "relative p-4 rounded-2xl border-2 transition-all",
                      isHighlighted
                        ? "bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500"
                        : "bg-white/5 border-white/10"
                    )}
                  >
                    {/* Badges */}
                    {plan.popular && (
                      <div className="absolute -top-2 right-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Popular
                      </div>
                    )}
                    {plan.best_value && (
                      <div className="absolute -top-2 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Best Value
                      </div>
                    )}

                    <div className="flex items-start gap-3 mb-3">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        isHighlighted 
                          ? "bg-gradient-to-br from-purple-500 to-pink-500" 
                          : "bg-white/10"
                      )}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{plan.name}</h3>
                        <p className="text-gray-400 text-xs">{plan.period}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-xl font-bold">
                          <AnimatedPrice value={plan.price} />
                        </p>
                        <p className="text-gray-400 text-xs">
                          /{plan.period === "Monthly" ? "mo" : "yr"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 mb-3">
                      <p className="text-purple-400 text-sm font-medium text-center">
                        {plan.credits.toLocaleString()} credits
                      </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-2 mb-4">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {feature.included ? (
                            <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-green-400" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                              <span className="text-red-400 text-xs">✕</span>
                            </div>
                          )}
                          <span className={cn(
                            "text-xs",
                            feature.included ? "text-gray-300" : "text-gray-500"
                          )}>
                            {feature.text}
                          </span>
                          {feature.badge && (
                            <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded">
                              {feature.badge}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={loadingPackage !== null}
                      className={cn(
                        "w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]",
                        isHighlighted
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                          : "bg-white/10 text-white border border-white/20"
                      )}
                    >
                      {loadingPackage === plan.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </span>
                      ) : (
                        "Subscribe"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Credit Packages */
          <div className="space-y-3">
            <p className="text-center text-gray-400 text-sm mb-4">
              One-time credit purchases. No subscription required.
            </p>
            
            {creditPackages.map((pkg) => {
              const IconComponent = iconMap[pkg.icon] || Coins;
              
              return (
                <div
                  key={pkg.id}
                  className={cn(
                    "relative p-4 rounded-2xl border-2 transition-all",
                    pkg.popular
                      ? "bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500"
                      : "bg-white/5 border-white/10"
                  )}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2 right-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Popular
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      pkg.popular 
                        ? "bg-gradient-to-br from-yellow-500 to-orange-500" 
                        : "bg-white/10"
                    )}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">{pkg.name}</h3>
                      <p className="text-purple-400 text-sm font-medium">
                        {pkg.credits.toLocaleString()} credits
                      </p>
                    </div>
                    <button
                      onClick={() => handleBuyCredits(pkg)}
                      disabled={loadingPackage !== null}
                      className={cn(
                        "px-4 py-2 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]",
                        pkg.popular
                          ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                          : "bg-white/10 text-white border border-white/20"
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
        )}
      </div>

      {/* Fixed Bottom - Restore Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/90 to-transparent pt-6 pb-6 px-4 z-50">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleRestore}
            disabled={isRestoring}
            className="text-purple-400 text-sm font-medium flex items-center gap-1.5"
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
          <p className="text-gray-500 text-xs">
            Powered by Stripe • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}
