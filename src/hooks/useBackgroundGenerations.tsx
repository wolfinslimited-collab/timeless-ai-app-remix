import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface PendingGeneration {
  id: string;
  prompt: string;
  model: string;
  status: string;
  created_at: string;
  task_id?: string;
}

interface CompletedGeneration {
  id: string;
  prompt: string;
  model: string;
  output_url: string;
  thumbnail_url?: string;
}

export const useBackgroundGenerations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingGenerations, setPendingGenerations] = useState<PendingGeneration[]>([]);
  const [completedGenerations, setCompletedGenerations] = useState<CompletedGeneration[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Fetch pending generations from database
  const fetchPendingGenerations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("generations")
      .select("id, prompt, model, status, created_at, task_id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPendingGenerations(data);
    }
  }, [user]);

  // Check status of pending generations
  const checkPendingGenerations = useCallback(async () => {
    if (!user || pendingGenerations.length === 0 || isChecking) return;

    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-generation", {
        body: {}
      });

      if (error) {
        console.error("Error checking generations:", error);
        return;
      }

      const results = data?.results || [];
      const newlyCompleted: CompletedGeneration[] = [];
      const newlyFailed: { prompt: string; credits_refunded: number }[] = [];

      for (const result of results) {
        if (result.changed) {
          if (result.status === "completed") {
            newlyCompleted.push({
              id: result.id,
              prompt: result.prompt,
              model: result.model,
              output_url: result.output_url,
              thumbnail_url: result.thumbnail_url,
            });
          } else if (result.status === "failed") {
            newlyFailed.push({
              prompt: result.prompt,
              credits_refunded: result.credits_refunded,
            });
          }
        }
      }

      // Show notifications for completed generations
      if (newlyCompleted.length > 0) {
        setCompletedGenerations(prev => [...newlyCompleted, ...prev]);
        
        for (const gen of newlyCompleted) {
          toast({
            title: "🎉 Video Ready!",
            description: `Your ${gen.model} video is ready: "${gen.prompt.substring(0, 50)}..."`,
            duration: 10000,
          });
        }
      }

      // Show notifications for failed generations
      for (const failed of newlyFailed) {
        toast({
          variant: "destructive",
          title: "Generation Failed",
          description: `"${failed.prompt.substring(0, 50)}..." failed. ${failed.credits_refunded} credits refunded.`,
          duration: 10000,
        });
      }

      // Refresh pending list
      await fetchPendingGenerations();
    } finally {
      setIsChecking(false);
    }
  }, [user, pendingGenerations.length, isChecking, toast, fetchPendingGenerations]);

  // Initial fetch
  useEffect(() => {
    fetchPendingGenerations();
  }, [fetchPendingGenerations]);

  // Poll for updates every 30 seconds if there are pending generations
  useEffect(() => {
    if (pendingGenerations.length === 0) return;

    const interval = setInterval(() => {
      checkPendingGenerations();
    }, 30000);

    // Also check immediately when there are new pending items
    checkPendingGenerations();

    return () => clearInterval(interval);
  }, [pendingGenerations.length, checkPendingGenerations]);

  // Clear a completed generation notification
  const dismissCompleted = useCallback((id: string) => {
    setCompletedGenerations(prev => prev.filter(g => g.id !== id));
  }, []);

  return {
    pendingGenerations,
    completedGenerations,
    isChecking,
    checkPendingGenerations,
    fetchPendingGenerations,
    dismissCompleted,
    hasPending: pendingGenerations.length > 0,
  };
};
