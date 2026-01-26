import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

// Model-specific credit costs (1 credit = $0.01)
// Model-specific credit costs (balanced ~30-50% margin above API cost)
export const MODEL_CREDITS: Record<string, number> = {
  // === ECONOMY TIER (Kie.ai Marketplace) ===
  // Image models - Kie.ai
  "kie-4o-image": 3,
  "kie-flux-kontext-pro": 3,
  "kie-flux-kontext-max": 5,
  "kie-grok-imagine": 4,
  "kie-seedream-4": 4,
  "kie-imagen-4": 5,
  "kie-ideogram-v3": 5,
  "kie-flux2-pro": 4,
  "kie-midjourney": 5,
  "kie-kling-image": 4,
  "kie-flux-pro": 4,
  "kie-flux-dev": 2,
  "kie-flux-schnell": 2,
  "kie-nano-banana": 3,
  "kie-qwen-image": 4,
  // Video models - Kie.ai
  "kie-runway": 10,
  "kie-runway-i2v": 12,
  "kie-runway-cinema": 15,
  "kie-sora2": 15,
  "kie-sora2-pro": 25,
  "kie-veo31": 20,
  "kie-veo31-fast": 12,
  "kie-kling": 15,
  "kie-hailuo": 12,
  "kie-luma": 12,
  "kie-wan": 10,
  "kie-grok-video": 12,
  // Music models - Kie.ai
  "kie-music-v4": 8,
  "kie-music-v3.5": 6,

  // === HIGH QUALITY TIER ===
  // Image models - Lovable AI
  "nano-banana": 4,
  
  // Image models - Fal.ai
  "gpt-image-1.5": 12,
  "flux-1.1-pro": 6,
  "flux-pro-ultra": 10,
  "flux-dev": 4,
  "flux-schnell": 3,
  "ideogram-v2": 8,
  "stable-diffusion-3": 5,
  "sdxl": 4,
  "sdxl-lightning": 3,
  "recraft-v3": 6,
  "aura-flow": 5,
  "playground-v2.5": 5,
  
  // Video models - Fal.ai
  "wan-2.6": 20,
  "kling-2.6": 35,
  "veo-3": 50,
  "veo-3-fast": 30,
  "hailuo-02": 25,
  "seedance-1.5": 25,
  "luma": 30,
  "hunyuan-1.5": 25,

  // Music models - Fal.ai
  "sonauto": 20,
  "cassetteai": 12,
  "lyria2": 15,
  "stable-audio": 10,

  // Cinema Studio models - Fal.ai
  "wan-2.6-cinema": 60,
  "kling-2.6-cinema": 90,
  "veo-3-cinema": 150,
  "luma-cinema": 75,

  // Chat models
  "grok-3": 3,
  "grok-3-mini": 2,
  "chatgpt-5.2": 4,
  "chatgpt-5": 3,
  "chatgpt-5-mini": 2,
  "gemini-2.5-pro": 2,
  "gemini-3-pro": 3,
  "gemini-3-flash": 1,
  "deepseek-r1": 3,
  "deepseek-v3": 2,
  "llama-3.3": 1,
  "llama-3.3-large": 2,
};

// Legacy type-based costs (fallback)
export const CREDIT_COSTS = {
  image: 5,
  video: 15,
  music: 10,
  cinema: 25,
} as const;

// Quality multipliers for video
export const QUALITY_MULTIPLIERS: Record<string, number> = {
  "480p": 0.8,
  "720p": 1.0,
  "1080p": 1.5,
};

export const getModelCost = (model: string, quality?: string): number => {
  const baseCost = MODEL_CREDITS[model] ?? CREDIT_COSTS.image;
  let multiplier = 1.0;
  
  if (quality && QUALITY_MULTIPLIERS[quality]) {
    multiplier *= QUALITY_MULTIPLIERS[quality];
  }
  
  return Math.round(baseCost * multiplier);
};

const LOW_CREDITS_THRESHOLD = 10;

export const useCredits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credits, setCredits] = useState<number | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldShowLowCreditsWarning, setShouldShowLowCreditsWarning] = useState(false);
  const previousCredits = useRef<number | null>(null);
  const hasShownLowCreditsWarning = useRef(false);

  const fetchCredits = async () => {
    if (!user) {
      setCredits(null);
      setSubscriptionStatus(null);
      setSubscriptionEndDate(null);
      setLoading(false);
      previousCredits.current = null;
      hasShownLowCreditsWarning.current = false;
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits, subscription_status, subscription_end_date")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      const newCredits = data?.credits ?? 0;
      const isSubscribed = data?.subscription_status === 'active';
      
      // Check for low credits warning (only if not subscribed)
      if (!isSubscribed && newCredits < LOW_CREDITS_THRESHOLD) {
        // Show warning if credits just dropped below threshold OR on first load when low
        const wasAboveThreshold = previousCredits.current !== null && previousCredits.current >= LOW_CREDITS_THRESHOLD;
        const isFirstLoadWithLowCredits = previousCredits.current === null && !hasShownLowCreditsWarning.current;
        
        if (wasAboveThreshold || isFirstLoadWithLowCredits) {
          hasShownLowCreditsWarning.current = true;
          setShouldShowLowCreditsWarning(true);
        }
      }
      
      previousCredits.current = newCredits;
      setCredits(newCredits);
      setSubscriptionStatus(data?.subscription_status ?? null);
      setSubscriptionEndDate(data?.subscription_end_date ?? null);
    } catch (error) {
      console.error("Error fetching credits:", error);
      setCredits(0);
      setSubscriptionStatus(null);
      setSubscriptionEndDate(null);
    } finally {
      setLoading(false);
    }
  };

  // Show low credits warning via useEffect (safe for React's hook rules)
  useEffect(() => {
    if (shouldShowLowCreditsWarning && credits !== null) {
      toast({
        variant: "destructive",
        title: "Low credits warning",
        description: `You have ${credits} credits remaining. Consider purchasing more to continue using premium features.`,
      });
      setShouldShowLowCreditsWarning(false);
    }
  }, [shouldShowLowCreditsWarning, credits, toast]);

  useEffect(() => {
    fetchCredits();
  }, [user]);

  const refetch = () => {
    setLoading(true);
    fetchCredits();
  };

  const hasActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'cancelling';
  const isCancelling = subscriptionStatus === 'cancelling';

  const hasEnoughCredits = (type: "image" | "video") => {
    if (hasActiveSubscription) return true;
    if (credits === null) return false;
    return credits >= CREDIT_COSTS[type];
  };

  const hasEnoughCreditsForModel = (model: string) => {
    if (hasActiveSubscription) return true;
    if (credits === null) return false;
    return credits >= getModelCost(model);
  };

  return { 
    credits, 
    loading, 
    refetch, 
    hasEnoughCredits,
    hasEnoughCreditsForModel,
    getModelCost,
    CREDIT_COSTS,
    MODEL_CREDITS,
    subscriptionStatus,
    subscriptionEndDate,
    hasActiveSubscription,
    isCancelling,
  };
};
