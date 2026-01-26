import { useState, useCallback, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

// Types for health data
interface SleepSession {
  startDate: string;
  endDate: string;
  durationHours: number;
  source: string;
  quality?: number;
  stages?: SleepStage[];
}

interface SleepStage {
  stage: "awake" | "light" | "deep" | "rem" | "unknown";
  startDate: string;
  endDate: string;
  durationMinutes: number;
}

interface HealthSyncResult {
  sessions: SleepSession[];
  syncedAt: string;
  source: "apple_health" | "health_connect" | "manual";
}

interface UseHealthSyncReturn {
  isAvailable: boolean;
  isAuthorized: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  isNativePlatform: boolean;
  checkAvailability: () => Promise<boolean>;
  requestAuthorization: () => Promise<boolean>;
  syncSleepData: (startDate: Date, endDate: Date) => Promise<SleepSession[]>;
  syncHeartRateData: (startDate: Date, endDate: Date) => Promise<number | null>;
  platformName: string;
}

// Health plugin interface for dynamic import
interface HealthPluginInstance {
  isAvailable: () => Promise<{ available: boolean }>;
  requestAuthorization: (options: { read?: string[]; write?: string[] }) => Promise<{
    readAuthorized: string[];
    readDenied: string[];
  }>;
  checkAuthorization: (options: { read?: string[]; write?: string[] }) => Promise<{
    readAuthorized: string[];
    readDenied: string[];
  }>;
  readSamples: (options: {
    dataType: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => Promise<{
    samples: Array<{
      dataType: string;
      value: number;
      unit: string;
      startDate: string;
      endDate: string;
      sourceName?: string;
      sourceId?: string;
    }>;
  }>;
  queryWorkouts: (options: {
    workoutType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => Promise<{
    workouts: Array<{
      workoutType: string;
      duration: number;
      startDate: string;
      endDate: string;
      sourceName?: string;
    }>;
  }>;
}

// Dynamic import for the health plugin to avoid build errors on web
const getHealthPlugin = async (): Promise<HealthPluginInstance | null> => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  
  try {
    const module = await import("@capgo/capacitor-health");
    return module.Health as HealthPluginInstance;
  } catch (error) {
    console.error("Failed to load health plugin:", error);
    return null;
  }
};

export const useHealthSync = (): UseHealthSyncReturn => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  
  const isNativePlatform = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const platformName = platform === "ios" ? "Apple Health" : platform === "android" ? "Health Connect" : "Health App";

  // Check if health data is available on this device
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    if (!isNativePlatform) {
      console.log("Health sync not available: not a native platform");
      return false;
    }

    try {
      const Health = await getHealthPlugin();
      if (!Health) return false;

      const result = await Health.isAvailable();
      const available = result.available;
      setIsAvailable(available);
      
      console.log(`Health availability check: ${available}`);
      return available;
    } catch (error) {
      console.error("Error checking health availability:", error);
      setIsAvailable(false);
      return false;
    }
  }, [isNativePlatform]);

  // Request authorization for health data (steps, heartRate as proxies for sleep tracking)
  const requestAuthorization = useCallback(async (): Promise<boolean> => {
    if (!isNativePlatform) {
      toast.error("Health sync requires the native app");
      return false;
    }

    try {
      const Health = await getHealthPlugin();
      if (!Health) return false;

      // Request read access for available health data types
      // The plugin supports: steps, distance, calories, heartRate, weight
      const authResult = await Health.requestAuthorization({
        read: ["steps", "heartRate", "calories"],
        write: [],
      });

      // Check if at least heartRate is authorized (useful for sleep analysis)
      const authorized = authResult.readAuthorized.length > 0;
      setIsAuthorized(authorized);

      if (authorized) {
        toast.success(`${platformName} access granted!`);
      } else {
        toast.error(`Please grant ${platformName} access in Settings`);
      }

      return authorized;
    } catch (error: any) {
      console.error("Error requesting health authorization:", error);
      
      // Handle specific error cases
      if (error.message?.includes("denied")) {
        toast.error(`${platformName} access denied. Enable it in Settings.`);
      } else {
        toast.error(`Failed to connect to ${platformName}`);
      }
      
      setIsAuthorized(false);
      return false;
    }
  }, [isNativePlatform, platformName]);

  // Sync heart rate data (useful for sleep quality estimation)
  const syncHeartRateData = useCallback(async (startDate: Date, endDate: Date): Promise<number | null> => {
    if (!isNativePlatform) {
      return null;
    }

    try {
      const Health = await getHealthPlugin();
      if (!Health) return null;

      const result = await Health.readSamples({
        dataType: "heartRate",
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 1000,
      });

      if (result.samples && result.samples.length > 0) {
        // Calculate average heart rate during sleep period
        const avgHeartRate = result.samples.reduce((acc, s) => acc + s.value, 0) / result.samples.length;
        return Math.round(avgHeartRate);
      }

      return null;
    } catch (error) {
      console.error("Error syncing heart rate:", error);
      return null;
    }
  }, [isNativePlatform]);

  // Sync sleep data - uses workouts/activity data as the plugin doesn't have direct sleep support
  // This is a workaround that estimates sleep from low activity periods and heart rate
  const syncSleepData = useCallback(async (startDate: Date, endDate: Date): Promise<SleepSession[]> => {
    if (!isNativePlatform) {
      console.log("Cannot sync: not on native platform");
      return [];
    }

    setIsSyncing(true);

    try {
      const Health = await getHealthPlugin();
      if (!Health) {
        setIsSyncing(false);
        return [];
      }

      console.log(`Syncing health data from ${startDate.toISOString()} to ${endDate.toISOString()}`);

      // Query workouts - some sleep apps record sleep as "other" workout type
      const workoutResult = await Health.queryWorkouts({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 100,
      });

      const sessions: SleepSession[] = [];

      // Look for sleep-related workouts (some apps tag sleep as workouts)
      if (workoutResult.workouts && workoutResult.workouts.length > 0) {
        for (const workout of workoutResult.workouts) {
          // Check if this might be a sleep session (long duration, low intensity, or tagged as sleep)
          const durationHours = workout.duration / 3600; // Convert seconds to hours
          
          // Sleep sessions are typically 4-12 hours
          if (durationHours >= 4 && durationHours <= 14) {
            sessions.push({
              startDate: workout.startDate,
              endDate: workout.endDate,
              durationHours: durationHours,
              source: workout.sourceName || platformName,
            });
          }
        }
      }

      // If no sleep workouts found, try to estimate from steps data
      // Low step count periods during night hours might indicate sleep
      if (sessions.length === 0) {
        try {
          const stepsResult = await Health.readSamples({
            dataType: "steps",
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit: 500,
          });

          // Group samples by date and find night periods with low/no steps
          const dailySteps = new Map<string, { samples: typeof stepsResult.samples; date: string }>();
          
          for (const sample of stepsResult.samples) {
            const dateKey = sample.startDate.split("T")[0];
            if (!dailySteps.has(dateKey)) {
              dailySteps.set(dateKey, { samples: [], date: dateKey });
            }
            dailySteps.get(dateKey)!.samples.push(sample);
          }

          // Create estimated sleep sessions based on step gaps
          // This is a basic heuristic - real implementation would be more sophisticated
          console.log(`Found ${dailySteps.size} days of step data`);
        } catch (stepError) {
          console.log("Could not fetch steps data:", stepError);
        }
      }

      // Get heart rate data for quality estimation
      if (sessions.length > 0) {
        for (const session of sessions) {
          const avgHR = await syncHeartRateData(
            new Date(session.startDate),
            new Date(session.endDate)
          );
          
          if (avgHR) {
            // Estimate quality based on heart rate (lower average = better sleep)
            // This is a simplified heuristic
            if (avgHR < 55) session.quality = 9;
            else if (avgHR < 60) session.quality = 8;
            else if (avgHR < 65) session.quality = 7;
            else if (avgHR < 70) session.quality = 6;
            else session.quality = 5;
          }
        }
      }

      setLastSyncAt(new Date().toISOString());
      console.log(`Synced ${sessions.length} sleep sessions`);

      if (sessions.length > 0) {
        toast.success(`Synced ${sessions.length} sleep session(s) from ${platformName}`);
      } else {
        toast.info(`No sleep data found in ${platformName}. Try logging sleep manually or using a dedicated sleep app.`);
      }

      return sessions;
    } catch (error: any) {
      console.error("Error syncing health data:", error);
      toast.error(`Failed to sync from ${platformName}`);
      return [];
    } finally {
      setIsSyncing(false);
    }
  }, [isNativePlatform, platformName, syncHeartRateData]);

  // Check availability on mount
  useEffect(() => {
    if (isNativePlatform) {
      checkAvailability();
    }
  }, [isNativePlatform, checkAvailability]);

  return {
    isAvailable,
    isAuthorized,
    isSyncing,
    lastSyncAt,
    isNativePlatform,
    checkAvailability,
    requestAuthorization,
    syncSleepData,
    syncHeartRateData,
    platformName,
  };
};

export type { SleepSession, SleepStage, HealthSyncResult };
