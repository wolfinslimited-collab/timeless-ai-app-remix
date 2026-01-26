import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Smartphone, 
  RefreshCw, 
  Settings, 
  AlertCircle,
  Clock,
  Zap,
  Moon,
  ArrowUpDown,
  Bell,
  CheckCircle2
} from "lucide-react";
import { useDeviceUsage, DeviceUsageStats } from "@/hooks/useDeviceUsage";
import { Capacitor } from "@capacitor/core";

interface DeviceUsageCardProps {
  onUsageDataSync?: (data: DeviceUsageStats) => void;
}

const DeviceUsageCard = ({ onUsageDataSync }: DeviceUsageCardProps) => {
  const {
    isAvailable,
    permissionStatus,
    isSyncing,
    lastSyncAt,
    isNativePlatform,
    platformName,
    requestPermission,
    openPermissionSettings,
    syncUsageData,
    getManualEstimate,
  } = useDeviceUsage();

  const [usageStats, setUsageStats] = useState<DeviceUsageStats | null>(null);
  const [useSimulated, setUseSimulated] = useState(false);

  const platform = Capacitor.getPlatform();
  const isIOS = platform === "ios";

  const handleSync = async () => {
    const data = await syncUsageData(new Date());
    if (data) {
      setUsageStats(data);
      onUsageDataSync?.(data);
    }
  };

  const handleUseEstimate = () => {
    const estimate = getManualEstimate();
    setUsageStats(estimate);
    setUseSimulated(true);
    onUsageDataSync?.(estimate);
  };

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  // Show iOS limitation message
  if (isIOS) {
    return (
      <Card className="border-0 bg-amber-500/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-amber-400" />
            Screen Time Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                iOS doesn't allow apps to access Screen Time data directly due to Apple's privacy policies.
              </p>
              <p>
                Brain AI will use <strong>in-app activity tracking</strong> and <strong>self-reported data</strong> for your cognitive insights.
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={handleUseEstimate}
          >
            <Clock className="h-4 w-4" />
            Use Estimated Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show web limitation message
  if (!isNativePlatform) {
    return (
      <Card className="border-0 bg-secondary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Device Usage Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Device usage tracking requires the native mobile app. Brain AI will use behavioral estimates based on your in-app activity.
          </p>
          
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={handleUseEstimate}
          >
            <Clock className="h-4 w-4" />
            Use Activity Estimates
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Android - permission not granted
  if (!permissionStatus.granted) {
    return (
      <Card className="border-0 bg-secondary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Digital Wellbeing Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Grant usage access to automatically track your screen time, app usage, and focus patterns.
          </p>
          
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">How to enable:</p>
            <ol className="text-xs text-muted-foreground space-y-1">
              <li>1. Tap "Open Settings" below</li>
              <li>2. Find "Timeless" in the list</li>
              <li>3. Toggle on usage access</li>
              <li>4. Return to the app</li>
            </ol>
          </div>
          
          <div className="flex gap-2">
            <Button 
              className="flex-1 gap-2"
              onClick={handleRequestPermission}
            >
              <Settings className="h-4 w-4" />
              Open Settings
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={handleUseEstimate}
            >
              <Clock className="h-4 w-4" />
              Skip
            </Button>
          </div>
          
          {/* Confirmation button after returning from settings */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              localStorage.setItem("android_usage_stats_granted", "true");
              location.reload();
            }}
          >
            I've enabled access in Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Permission granted - show usage stats or sync button
  return (
    <Card className="border-0 bg-secondary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-emerald-400" />
            {platformName}
          </CardTitle>
          {permissionStatus.granted && (
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!usageStats ? (
          <Button 
            className="w-full gap-2" 
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isSyncing ? "Syncing..." : "Sync Today's Usage"}
          </Button>
        ) : (
          <>
            {/* Usage Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs">Screen Time</span>
                </div>
                <p className="text-lg font-semibold">
                  {formatMinutes(usageStats.totalScreenTimeMinutes)}
                </p>
              </div>
              
              <div className="bg-background/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="text-xs">Deep Work</span>
                </div>
                <p className="text-lg font-semibold">
                  {formatMinutes(usageStats.deepWorkMinutes)}
                </p>
              </div>
              
              <div className="bg-background/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span className="text-xs">App Switches</span>
                </div>
                <p className="text-lg font-semibold">{usageStats.appSwitches}</p>
              </div>
              
              <div className="bg-background/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Moon className="h-3.5 w-3.5" />
                  <span className="text-xs">Night Usage</span>
                </div>
                <p className="text-lg font-semibold">
                  {formatMinutes(usageStats.nightUsageMinutes)}
                </p>
              </div>
            </div>

            {/* App Category Breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">App Categories</p>
              {usageStats.appUsage.slice(0, 4).map((app) => (
                <div key={app.packageName} className="flex items-center gap-2">
                  <span className="text-xs w-24 truncate capitalize">{app.category}</span>
                  <Progress 
                    value={(app.totalTimeMinutes / usageStats.totalScreenTimeMinutes) * 100} 
                    className="h-2 flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {formatMinutes(app.totalTimeMinutes)}
                  </span>
                </div>
              ))}
            </div>

            {/* Simulated data notice */}
            {useSimulated && (
              <p className="text-xs text-muted-foreground text-center">
                Using estimated data. Connect {platformName} for accurate tracking.
              </p>
            )}

            {/* Refresh button */}
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full gap-2"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </>
        )}
        
        {lastSyncAt && (
          <p className="text-xs text-muted-foreground text-center">
            Last synced: {new Date(lastSyncAt).toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default DeviceUsageCard;
