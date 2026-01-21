import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

// Model-specific credit costs
export const MODEL_CREDITS: Record<string, number> = {
  // Image models - Lovable AI
  "nano-banana": 4,
  
  // Image models - Fal.ai
  "gpt-image-1.5": 10,
  "flux-1.1-pro": 5,
  "flux-pro-ultra": 8,
  "flux-dev": 3,
  "flux-schnell": 2,
  "ideogram-v2": 6,
  "stable-diffusion-3": 4,
  "sdxl": 3,
  "sdxl-lightning": 2,
  "recraft-v3": 5,
  "aura-flow": 4,
  "playground-v2.5": 4,
  
  // Video models
  "wan-2.6": 15,
  "kling-2.6": 25,
  "veo-3": 30,
  "veo-3-fast": 20,
  "hailuo-02": 18,
  "seedance-1.5": 20,
  "luma": 22,
  "hunyuan-1.5": 18,

  // Music models - Fal.ai
  "sonauto": 15,
  "cassetteai": 10,
  "lyria2": 12,
  "stable-audio": 8,

  // Cinema Studio models
  "wan-2.6-cinema": 20,
  "kling-2.6-cinema": 30,
  "veo-3-cinema": 35,
  "luma-cinema": 28,

  // Chat models
  "grok-3": 3,
  "grok-3-mini": 1,
  "chatgpt-5.2": 4,
  "chatgpt-5": 3,
  "chatgpt-5-mini": 1,
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
  if (quality && QUALITY_MULTIPLIERS[quality]) {
    return Math.round(baseCost * QUALITY_MULTIPLIERS[quality]);
  }
  return baseCost;
};

const LOW_CREDITS_THRESHOLD = 10;

export const useCredits = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [credits, setCredits] = useState<number | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldShowLowCreditsWarning, setShouldShowLowCreditsWarning] = useState(false);
  const previousCredits = useRef<number | null>(null);
  const hasShownLowCreditsWarning = useRef(false);

  const fetchCredits = async () => {
    if (!user) {
      setCredits(null);
      setSubscriptionStatus(null);
      setLoading(false);
      previousCredits.current = null;
      hasShownLowCreditsWarning.current = false;
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits, subscription_status")
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
    } catch (error) {
      console.error("Error fetching credits:", error);
      setCredits(0);
      setSubscriptionStatus(null);
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

  const hasActiveSubscription = subscriptionStatus === 'active';

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
    hasActiveSubscription,
  };
};
