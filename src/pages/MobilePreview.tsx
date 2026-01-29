import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { MobileNav, type Screen } from "@/components/mobile/MobileNav";
import { MobileAuth } from "@/components/mobile/MobileAuth";
import { MobileSplash } from "@/components/mobile/MobileSplash";
import { MobileHome } from "@/components/mobile/MobileHome";
import { MobileCreate } from "@/components/mobile/MobileCreate";
import { MobileImageCreate } from "@/components/mobile/MobileImageCreate";
import { MobileVideoCreate } from "@/components/mobile/MobileVideoCreate";
import { MobileCinemaStudio } from "@/components/mobile/MobileCinemaStudio";
import { MobileAudioCreate } from "@/components/mobile/MobileAudioCreate";
import { MobileApps } from "@/components/mobile/MobileApps";
import { MobileChat } from "@/components/mobile/MobileChat";
import { MobileLibrary } from "@/components/mobile/MobileLibrary";
import { MobileProfile } from "@/components/mobile/MobileProfile";
import { MobileSubscription } from "@/components/mobile/MobileSubscription";
import { MobileDownloads } from "@/components/mobile/MobileDownloads";
import { MobileFavorites } from "@/components/mobile/MobileFavorites";
import {
  MobileNotifyAI,
  MobileSleepAI,
  MobileBrainAI,
  MobileSkinAI,
  MobileFinancialAI,
  MobileCalorieAI,
  MobileFingerprintAI,
} from "@/components/mobile/ai-apps";

export default function MobilePreview() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [showSplash, setShowSplash] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { credits, loading: creditsLoading, refetch } = useCredits({ suppressWarnings: true });

  // Show auth screen if not logged in (after splash)
  const showAuth = !authLoading && !user && !showSplash;

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const renderScreen = () => {
    if (showAuth) {
      return <MobileAuth onSuccess={() => setCurrentScreen("home")} />;
    }

    switch (currentScreen) {
      case "home":
        return <MobileHome onNavigate={setCurrentScreen} credits={credits ?? 0} onRefreshCredits={refetch} />;
      case "create":
        return <MobileCreate onNavigate={setCurrentScreen} />;
      case "image":
        return <MobileImageCreate onBack={() => setCurrentScreen("create")} />;
      case "video":
        return <MobileVideoCreate onBack={() => setCurrentScreen("create")} />;
      case "cinema":
        return <MobileCinemaStudio onBack={() => setCurrentScreen("create")} />;
      case "audio":
        return <MobileAudioCreate onBack={() => setCurrentScreen("create")} />;
      case "apps":
        return <MobileApps onBack={() => setCurrentScreen("create")} onNavigate={setCurrentScreen} />;
      case "chat":
        return <MobileChat />;
      case "library":
        return <MobileLibrary />;
      case "profile":
        return <MobileProfile onNavigate={setCurrentScreen} />;
      case "subscription":
        return <MobileSubscription onBack={() => setCurrentScreen("profile")} />;
      case "downloads":
        return <MobileDownloads onBack={() => setCurrentScreen("profile")} />;
      case "favorites":
        return <MobileFavorites onBack={() => setCurrentScreen("profile")} />;
      case "notify-ai":
        return <MobileNotifyAI onBack={() => setCurrentScreen("apps")} />;
      case "sleep-ai":
        return <MobileSleepAI onBack={() => setCurrentScreen("apps")} />;
      case "brain-ai":
        return <MobileBrainAI onBack={() => setCurrentScreen("apps")} />;
      case "skin-ai":
        return <MobileSkinAI onBack={() => setCurrentScreen("apps")} />;
      case "financial-ai":
        return <MobileFinancialAI onBack={() => setCurrentScreen("apps")} />;
      case "calorie-ai":
        return <MobileCalorieAI onBack={() => setCurrentScreen("apps")} />;
      case "fingerprint-ai":
        return <MobileFingerprintAI onBack={() => setCurrentScreen("apps")} />;
      default:
        return <MobileHome onNavigate={setCurrentScreen} credits={credits ?? 0} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center mb-4 absolute top-4 left-1/2 -translate-x-1/2">
        <h1 className="text-2xl font-bold text-foreground">Flutter App Preview</h1>
        <p className="text-muted-foreground text-sm">This is how your mobile app will look</p>
      </div>
      
      {/* Phone Frame */}
      <div className="relative">
        {/* Phone Bezel */}
        <div className="w-[375px] h-[812px] bg-black rounded-[50px] p-3 shadow-2xl">
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-[35px] bg-black rounded-full z-50" />
          
          {/* Screen */}
          <div className="w-full h-full bg-[#0a0a0f] rounded-[40px] overflow-hidden relative">
            {/* Splash Screen */}
            {showSplash && (
              <MobileSplash 
                onComplete={handleSplashComplete}
                isCheckingAuth={authLoading}
                hasUser={!!user}
              />
            )}

            {/* Status Bar */}
            <div className="h-12 px-6 flex items-center justify-between text-white text-xs pt-2">
              <span className="font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-2 border border-white rounded-sm">
                  <div className="w-3/4 h-full bg-white rounded-sm" />
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="h-[calc(100%-48px-80px)] overflow-y-auto">
              {renderScreen()}
            </div>
            
            {/* Bottom Navigation - only show when logged in */}
            {!showAuth && !showSplash && (
              <MobileNav 
                currentScreen={currentScreen} 
                onNavigate={setCurrentScreen} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
