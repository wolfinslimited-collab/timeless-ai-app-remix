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
  
  // Video models
  "runway-gen3-5s": 15,
  "runway-gen3-10s": 25,
  "veo-3": 20,
  "veo-3-fast": 12,
  "wan-2.1": 8,
  "wan-2.1-pro": 12,
  "kling-1.6-pro": 18,
  "kling-1.6-pro-10s": 30,
  "minimax-video": 10,
  "luma-ray2": 15,
  "pika-2.0": 12,
};

// Legacy type-based costs (fallback)
export const CREDIT_COSTS = {
  image: 5,
  video: 15,
} as const;

export const getModelCost = (model: string): number => {
  return MODEL_CREDITS[model] ?? CREDIT_COSTS.image;
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
