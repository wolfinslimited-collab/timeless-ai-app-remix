import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Model-specific credit costs
export const MODEL_CREDITS: Record<string, number> = {
  // Image models
  "flux-1.1-pro": 5,
  "flux-1.1-pro-ultra": 10,
  "ideogram-v2": 5,
  "ideogram-v2-turbo": 3,
  "recraft-v3": 5,
  "stable-diffusion-3.5": 4,
  "dall-e-3": 8,
  "midjourney": 10,
  
  // Video models - Text-to-Video
  "minimax-video": 10,
  "hailuo-2.3-fast": 10,
  "luma-ray-flash-2": 12,
  "kling-2.1-standard": 12,
  "wan-2.1-t2v": 12,
  "hailuo-2.3": 15,
  "luma-ray2": 15,
  "veo-3-fast": 15,
  "kling-2.1-pro": 18,
  "veo-3": 20,
  "kling-2.6-t2v": 22,
  "kling-2.1-master": 25,
  
  // Video models - Image-to-Video
  "wan-2.1-i2v": 14,
  "veo-3-i2v": 22,
  "kling-2.6-i2v": 24,
};

// Legacy type-based costs (fallback)
export const CREDIT_COSTS = {
  image: 5,
  video: 15,
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

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    if (!user) {
      setCredits(null);
      setSubscriptionStatus(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits, subscription_status")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setCredits(data?.credits ?? 0);
      setSubscriptionStatus(data?.subscription_status ?? null);
    } catch (error) {
      console.error("Error fetching credits:", error);
      setCredits(0);
      setSubscriptionStatus(null);
    } finally {
      setLoading(false);
    }
  };

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
