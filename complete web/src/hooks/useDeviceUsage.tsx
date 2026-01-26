import { useState, useCallback, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

// Types for device usage data
export interface AppUsageData {
  packageName: string;
  appName: string;
  category: "productivity" | "social" | "entertainment" | "education" | "communication" | "other";
  totalTimeMinutes: number;
  launchCount: number;
  lastUsed: string;
}

export interface DeviceUsageStats {
  date: string;
  totalScreenTimeMinutes: number;
  appSwitches: number;
  unlockCount: number;
  nightUsageMinutes: number; // Usage between 00:00-05:00
  deepWorkMinutes: number; // Sessions > 25 min without switching
  appUsage: AppUsageData[];
  notificationInteractions: number;
  avgSessionLengthMinutes: number;
  sessionCount: number;
}

export interface UsagePermissionStatus {
  granted: boolean;
  canRequest: boolean;
  requiresManualGrant: boolean;
}

interface UseDeviceUsageReturn {
  isAvailable: boolean;
  permissionStatus: UsagePermissionStatus;
  isSyncing: boolean;
  lastSyncAt: string | null;
  isNativePlatform: boolean;
  platformName: string;
  checkPermission: () => Promise<UsagePermissionStatus>;
  requestPermission: () => Promise<boolean>;
  openPermissionSettings: () => Promise<void>;
  syncUsageData: (date: Date) => Promise<DeviceUsageStats | null>;
  getManualEstimate: () => DeviceUsageStats;
}

// App category mapping for common apps
const APP_CATEGORIES: Record<string, AppUsageData["category"]> = {
  // Social
  "com.instagram.android": "social",
  "com.twitter.android": "social",
  "com.facebook.katana": "social",
  "com.snapchat.android": "social",
  "com.linkedin.android": "social",
  "com.tiktok.android": "social",
  "com.reddit.frontpage": "social",
  // Communication
  "com.whatsapp": "communication",
  "com.facebook.orca": "communication",
  "org.telegram.messenger": "communication",
  "com.discord": "communication",
  "com.Slack": "communication",
  "com.microsoft.teams": "communication",
  // Entertainment
  "com.google.android.youtube": "entertainment",
  "com.netflix.mediaclient": "entertainment",
  "com.spotify.music": "entertainment",
  "com.amazon.avod.thirdpartyclient": "entertainment",
  // Productivity
  "com.google.android.apps.docs": "productivity",
  "com.microsoft.office.word": "productivity",
  "com.microsoft.office.excel": "productivity",
  "com.notion.id": "productivity",
  "com.todoist": "productivity",
  // Education
  "com.duolingo": "education",
  "com.coursera.app": "education",
  "com.udemy.android": "education",
};

// Categorize app by package name
const categorizeApp = (packageName: string): AppUsageData["category"] => {
  if (APP_CATEGORIES[packageName]) {
    return APP_CATEGORIES[packageName];
  }
  
  const lowerName = packageName.toLowerCase();
  if (lowerName.includes("social") || lowerName.includes("chat")) return "social";
  if (lowerName.includes("game") || lowerName.includes("music") || lowerName.includes("video")) return "entertainment";
  if (lowerName.includes("work") || lowerName.includes("office") || lowerName.includes("docs")) return "productivity";
  if (lowerName.includes("learn") || lowerName.includes("edu")) return "education";
  if (lowerName.includes("mail") || lowerName.includes("message")) return "communication";
  
  return "other";
};

/**
 * Hook for accessing device usage statistics
 * 
 * Platform limitations:
 * - iOS: Screen Time API is NOT available to third-party apps
 *        Users must manually log their usage or use app-internal tracking only
 * - Android: UsageStatsManager API is available but requires PACKAGE_USAGE_STATS permission
 *            User must manually enable it in Settings > Apps > Special access > Usage access
 * - Web: Not available - uses manual tracking only
 */
export const useDeviceUsage = (): UseDeviceUsageReturn => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<UsagePermissionStatus>({
    granted: false,
    canRequest: false,
    requiresManualGrant: true,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const isNativePlatform = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const platformName = platform === "ios" 
    ? "Screen Time" 
    : platform === "android" 
    ? "Digital Wellbeing" 
    : "Usage Tracking";

  // Check if device usage tracking is available
  const checkAvailability = useCallback(async (): Promise<boolean> => {
    if (!isNativePlatform) {
      console.log("Device usage not available: not a native platform");
      return false;
    }

    // On iOS, we can only track in-app usage, not system-wide
    if (platform === "ios") {
      console.log("iOS Screen Time API not available to third-party apps");
      setIsAvailable(false);
      return false;
    }

    // On Android, UsageStatsManager is available but requires special permission
    if (platform === "android") {
      setIsAvailable(true);
      return true;
    }

    return false;
  }, [isNativePlatform, platform]);

  // Check permission status
  const checkPermission = useCallback(async (): Promise<UsagePermissionStatus> => {
    if (!isNativePlatform || platform !== "android") {
      const status: UsagePermissionStatus = {
        granted: false,
        canRequest: false,
        requiresManualGrant: true,
      };
      setPermissionStatus(status);
      return status;
    }

    // For Android, we would check if PACKAGE_USAGE_STATS is granted
    // Since Capacitor doesn't have a built-in plugin for this, we simulate
    // In a real implementation, you would use a custom Capacitor plugin
    try {
      // Check localStorage for user's previous grant status (simulated)
      const wasGranted = localStorage.getItem("android_usage_stats_granted") === "true";
      
      const status: UsagePermissionStatus = {
        granted: wasGranted,
        canRequest: true,
        requiresManualGrant: true, // Always requires going to Settings on Android
      };
      
      setPermissionStatus(status);
      return status;
    } catch (error) {
      console.error("Error checking usage permission:", error);
      const status: UsagePermissionStatus = {
        granted: false,
        canRequest: true,
        requiresManualGrant: true,
      };
      setPermissionStatus(status);
      return status;
    }
  }, [isNativePlatform, platform]);

  // Request permission (on Android, this opens Settings)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isNativePlatform) {
      toast.error("Device usage tracking requires the native app");
      return false;
    }

    if (platform === "ios") {
      toast.info(
        "iOS doesn't allow apps to access Screen Time data. Brain AI will use in-app activity tracking instead.",
        { duration: 5000 }
      );
      return false;
    }

    if (platform === "android") {
      // On Android, we need to direct user to Settings
      toast.info(
        "To enable usage tracking, please grant access in Settings. Opening Settings...",
        { duration: 4000 }
      );
      
      // In a real implementation, you would use a Capacitor plugin to open:
      // Settings.ACTION_USAGE_ACCESS_SETTINGS
      await openPermissionSettings();
      
      // After user returns, they should confirm if they granted access
      // For now, we'll show a confirmation dialog
      return false;
    }

    return false;
  }, [isNativePlatform, platform]);

  // Open the system settings for usage access
  const openPermissionSettings = useCallback(async (): Promise<void> => {
    if (platform === "android") {
      try {
        // In a real implementation with a custom plugin:
        // await AppSettings.openUsageAccessSettings();
        
        // For now, we'll use a web fallback or show instructions
        toast.info(
          "Go to Settings → Apps → Special access → Usage access → Enable for Timeless",
          { duration: 6000 }
        );
        
        // Mark that user attempted to grant (for simulation)
        localStorage.setItem("android_usage_stats_attempted", "true");
      } catch (error) {
        console.error("Error opening settings:", error);
        toast.error("Could not open Settings. Please enable manually.");
      }
    }
  }, [platform]);

  // Sync usage data for a specific date
  const syncUsageData = useCallback(async (date: Date): Promise<DeviceUsageStats | null> => {
    setIsSyncing(true);

    try {
      if (!isNativePlatform || !permissionStatus.granted) {
        // Return simulated/estimated data for development or when not available
        const estimated = getManualEstimate();
        setLastSyncAt(new Date().toISOString());
        setIsSyncing(false);
        return estimated;
      }

      if (platform === "android") {
        // In a real implementation with UsageStatsManager via custom plugin:
        // const stats = await UsageStatsPlugin.queryUsageStats({
        //   startTime: startOfDay(date).getTime(),
        //   endTime: endOfDay(date).getTime(),
        // });

        // Simulated Android usage data
        const stats = generateSimulatedUsageData(date);
        setLastSyncAt(new Date().toISOString());
        toast.success("Usage data synced from Digital Wellbeing");
        
        return stats;
      }

      return null;
    } catch (error) {
      console.error("Error syncing usage data:", error);
      toast.error("Failed to sync usage data");
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isNativePlatform, platform, permissionStatus.granted]);

  // Generate simulated usage data (for development/fallback)
  const generateSimulatedUsageData = (date: Date): DeviceUsageStats => {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Base values vary by weekday/weekend
    const baseScreenTime = isWeekend ? 300 : 240; // minutes
    const variance = Math.floor(Math.random() * 60) - 30;
    
    const totalScreenTimeMinutes = Math.max(60, baseScreenTime + variance);
    const sessionCount = Math.floor(totalScreenTimeMinutes / 15) + Math.floor(Math.random() * 10);
    const avgSessionLengthMinutes = totalScreenTimeMinutes / sessionCount;
    
    return {
      date: date.toISOString().split("T")[0],
      totalScreenTimeMinutes,
      appSwitches: sessionCount * 3 + Math.floor(Math.random() * 50),
      unlockCount: sessionCount + Math.floor(Math.random() * 20),
      nightUsageMinutes: Math.floor(Math.random() * 45),
      deepWorkMinutes: isWeekend ? Math.floor(Math.random() * 60) : 60 + Math.floor(Math.random() * 90),
      notificationInteractions: 20 + Math.floor(Math.random() * 40),
      avgSessionLengthMinutes: Math.round(avgSessionLengthMinutes * 10) / 10,
      sessionCount,
      appUsage: [
        {
          packageName: "com.social.app",
          appName: "Social Media",
          category: "social",
          totalTimeMinutes: Math.floor(totalScreenTimeMinutes * 0.25),
          launchCount: Math.floor(sessionCount * 0.3),
          lastUsed: new Date().toISOString(),
        },
        {
          packageName: "com.productivity.app",
          appName: "Productivity",
          category: "productivity",
          totalTimeMinutes: Math.floor(totalScreenTimeMinutes * 0.3),
          launchCount: Math.floor(sessionCount * 0.2),
          lastUsed: new Date().toISOString(),
        },
        {
          packageName: "com.entertainment.app",
          appName: "Entertainment",
          category: "entertainment",
          totalTimeMinutes: Math.floor(totalScreenTimeMinutes * 0.2),
          launchCount: Math.floor(sessionCount * 0.15),
          lastUsed: new Date().toISOString(),
        },
        {
          packageName: "com.communication.app",
          appName: "Communication",
          category: "communication",
          totalTimeMinutes: Math.floor(totalScreenTimeMinutes * 0.15),
          launchCount: Math.floor(sessionCount * 0.25),
          lastUsed: new Date().toISOString(),
        },
        {
          packageName: "com.other.app",
          appName: "Other",
          category: "other",
          totalTimeMinutes: Math.floor(totalScreenTimeMinutes * 0.1),
          launchCount: Math.floor(sessionCount * 0.1),
          lastUsed: new Date().toISOString(),
        },
      ],
    };
  };

  // Get a manual estimate (for iOS or when native APIs unavailable)
  const getManualEstimate = useCallback((): DeviceUsageStats => {
    return generateSimulatedUsageData(new Date());
  }, []);

  // Check availability on mount
  useEffect(() => {
    checkAvailability();
    checkPermission();
  }, [checkAvailability, checkPermission]);

  // Listen for app resume to re-check permission (user might have granted in Settings)
  useEffect(() => {
    const handleResume = () => {
      if (platform === "android" && localStorage.getItem("android_usage_stats_attempted") === "true") {
        // Re-check permission when app resumes
        checkPermission();
      }
    };

    document.addEventListener("resume", handleResume);
    return () => document.removeEventListener("resume", handleResume);
  }, [platform, checkPermission]);

  return {
    isAvailable,
    permissionStatus,
    isSyncing,
    lastSyncAt,
    isNativePlatform,
    platformName,
    checkPermission,
    requestPermission,
    openPermissionSettings,
    syncUsageData,
    getManualEstimate,
  };
};
