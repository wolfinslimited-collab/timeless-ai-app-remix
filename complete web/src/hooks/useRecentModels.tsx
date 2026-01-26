import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "timeless_recent_models";
const MAX_RECENT = 10;

interface RecentModelEntry {
  modelId: string;
  type: "image" | "video" | "music" | "cinema";
  lastUsed: number;
}

export function useRecentModels() {
  const [recentModels, setRecentModels] = useState<RecentModelEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentModels));
  }, [recentModels]);

  const trackModelUsage = useCallback((modelId: string, type: "image" | "video" | "music" | "cinema") => {
    setRecentModels((prev) => {
      // Remove existing entry for this model
      const filtered = prev.filter((entry) => entry.modelId !== modelId);
      
      // Add new entry at the beginning
      const updated = [
        { modelId, type, lastUsed: Date.now() },
        ...filtered,
      ].slice(0, MAX_RECENT);
      
      return updated;
    });
  }, []);

  const getRecentModelIds = useCallback((type?: "image" | "video" | "music" | "cinema"): string[] => {
    if (type) {
      return recentModels
        .filter((entry) => entry.type === type)
        .map((entry) => entry.modelId);
    }
    return recentModels.map((entry) => entry.modelId);
  }, [recentModels]);

  const isRecentlyUsed = useCallback((modelId: string): boolean => {
    return recentModels.some((entry) => entry.modelId === modelId);
  }, [recentModels]);

  return {
    recentModels,
    trackModelUsage,
    getRecentModelIds,
    isRecentlyUsed,
  };
}
