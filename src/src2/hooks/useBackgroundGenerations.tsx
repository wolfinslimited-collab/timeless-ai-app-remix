import { useState, useEffect, useCallback, useRef } from "react";
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
  const notifiedIds = useRef<Set<string>>(new Set());

  // Fetch pending generations from database
  const fetchPendingGenerations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("generations")
      .select("id, prompt, model, status, created_at, task_id")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPendingGenerations(data);
    }
  }, [user]);

  // Check status of pending generations (manual check)
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

      // Refresh pending list after manual check
      await fetchPendingGenerations();
    } finally {
      setIsChecking(false);
    }
  }, [user, pendingGenerations.length, isChecking, fetchPendingGenerations]);

  // Handle realtime update for a generation
  const handleGenerationUpdate = useCallback((payload: any) => {
    const updated = payload.new;
    const old = payload.old;
    
    // Skip if we've already notified for this ID
    if (notifiedIds.current.has(updated.id)) return;
    
    // Only process status changes to completed or failed
    if (updated.status === "completed" && old?.status !== "completed") {
      notifiedIds.current.add(updated.id);
      
      const typeLabel = updated.model?.startsWith("kie-") 
        ? (updated.model.includes("music") ? "music" : updated.model.includes("image") || updated.model.includes("flux") || updated.model.includes("4o") ? "image" : "video")
        : updated.type || "generation";
      
      // Add to completed list
      setCompletedGenerations(prev => [{
        id: updated.id,
        prompt: updated.prompt,
        model: updated.model,
        output_url: updated.output_url,
        thumbnail_url: updated.thumbnail_url,
      }, ...prev.filter(g => g.id !== updated.id)]);
      
      // Remove from pending
      setPendingGenerations(prev => prev.filter(g => g.id !== updated.id));
      
      toast({
        title: "🎉 Ready!",
        description: `Your ${typeLabel} is ready: "${updated.prompt?.substring(0, 50)}..."`,
        duration: 10000,
      });
    } else if (updated.status === "failed" && old?.status !== "failed") {
      notifiedIds.current.add(updated.id);
      
      // Remove from pending
      setPendingGenerations(prev => prev.filter(g => g.id !== updated.id));
      
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: `"${updated.prompt?.substring(0, 50)}..." failed. Credits have been refunded.`,
        duration: 10000,
      });
    }
  }, [toast]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('generations-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
          filter: `user_id=eq.${user.id}`,
        },
        handleGenerationUpdate
      )
      .subscribe();

    console.log("Subscribed to generations realtime updates");

    return () => {
      console.log("Unsubscribing from generations realtime");
      supabase.removeChannel(channel);
    };
  }, [user, handleGenerationUpdate]);

  // Initial fetch
  useEffect(() => {
    fetchPendingGenerations();
  }, [fetchPendingGenerations]);

  // Fallback polling every 60 seconds if there are pending generations
  useEffect(() => {
    if (pendingGenerations.length === 0) return;

    const interval = setInterval(() => {
      checkPendingGenerations();
    }, 60000); // Reduced frequency since we have realtime

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
