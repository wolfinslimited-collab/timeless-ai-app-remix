import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const CREDIT_COSTS = {
  image: 5,
  video: 10,
} as const;

export const useCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setCredits(data?.credits ?? 0);
    } catch (error) {
      console.error("Error fetching credits:", error);
      setCredits(0);
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

  const hasEnoughCredits = (type: "image" | "video") => {
    if (credits === null) return false;
    return credits >= CREDIT_COSTS[type];
  };

  return { credits, loading, refetch, hasEnoughCredits, CREDIT_COSTS };
};
