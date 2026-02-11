import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export const PREMIUM_PLUS_PLAN = "premium-plus";

export const usePremiumPlusAccess = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user) {
        setPlan(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("plan, subscription_status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        
        // Only consider plan valid if subscription is active
        const isActive = data?.subscription_status === 'active';
        setPlan(isActive ? data?.plan ?? null : null);
      } catch (error) {
        console.error("Error fetching plan:", error);
        setPlan(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [user]);

  const hasPremiumPlusAccess = plan?.startsWith(PREMIUM_PLUS_PLAN) ?? false;

  return {
    plan,
    loading,
    hasPremiumPlusAccess,
  };
};
