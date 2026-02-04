import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { usePremiumPlusAccess } from "@/hooks/usePremiumPlusAccess";
import { MobileNav, type Screen } from "@/components/mobile/MobileNav";
import { MobileAuth } from "@/components/mobile/MobileAuth";
import { MobileSplash } from "@/components/mobile/MobileSplash";
import { MobileHome } from "@/components/mobile/MobileHome";
import { MobileCreate } from "@/components/mobile/MobileCreate";
import { MobileImageCreate } from "@/components/mobile/MobileImageCreate";
import { MobileVideoCreate } from "@/components/mobile/MobileVideoCreate";
import { MobileCinemaStudio } from "@/components/mobile/MobileCinemaStudio";
import { MobileAudioCreate } from "@/components/mobile/MobileAudioCreate";
import { MobileVisualStyles } from "@/components/mobile/MobileVisualStyles";
import { MobileApps } from "@/components/mobile/MobileApps";
import { MobileChat } from "@/components/mobile/MobileChat";
import { MobileLibrary } from "@/components/mobile/MobileLibrary";
import { MobileProfile } from "@/components/mobile/MobileProfile";
import { MobilePricing } from "@/components/mobile/MobilePricing";
import { MobileDownloads } from "@/components/mobile/MobileDownloads";
import { MobileFavorites } from "@/components/mobile/MobileFavorites";
import { MobileUpgradeWizard } from "@/components/mobile/MobileUpgradeWizard";
import { MobilePremiumPlusLock } from "@/components/mobile/MobilePremiumPlusLock";
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCheckedInitialAuth, setHasCheckedInitialAuth] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { credits, hasActiveSubscription, loading: creditsLoading, refetch } = useCredits();
  const { hasPremiumPlusAccess } = usePremiumPlusAccess();

  // Track if this is the first time user is detected (for OAuth redirects)
  const initialCheckDoneRef = useRef(false);
  // Track if user came from onboarding to handle back navigation correctly
  const cameFromOnboardingRef = useRef(false);

  // Handle OAuth redirects - check subscription status when user is detected after splash
  useEffect(() => {
    // Only run once when:
    // 1. Splash is complete
    // 2. Auth loading is done
    // 3. User exists (logged in via OAuth or session)
    // 4. Credits loading is done (so we have subscription status)
    // 5. Haven't done the initial check yet
    if (!showSplash && !authLoading && user && !creditsLoading && !initialCheckDoneRef.current) {
      initialCheckDoneRef.current = true;
      
      // If user came back from OAuth and doesn't have subscription, show onboarding
      if (!hasActiveSubscription && !showOnboarding && currentScreen !== "subscription") {
        setShowOnboarding(true);
      }
      setHasCheckedInitialAuth(true);
    }
  }, [showSplash, authLoading, user, creditsLoading, hasActiveSubscription, showOnboarding, currentScreen]);

  // Show auth screen if not logged in (after splash)
  const showAuth = !authLoading && !user && !showSplash;

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Handle successful authentication - receives subscription status from auth
  const handleAuthSuccess = (hasActiveSubscription: boolean) => {
    if (hasActiveSubscription) {
      // Premium user - go directly to home
      setCurrentScreen("home");
    } else {
      // Non-premium user - show onboarding wizard
      setShowOnboarding(true);
    }
  };

  // Handle onboarding complete or skip -> go to pricing/subscription
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    cameFromOnboardingRef.current = true;
    setCurrentScreen("subscription");
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
    cameFromOnboardingRef.current = true;
    setCurrentScreen("subscription");
  };

  // Handle back from subscription - go to home if from onboarding, otherwise profile
  const handleSubscriptionBack = () => {
    if (cameFromOnboardingRef.current) {
      cameFromOnboardingRef.current = false;
      setCurrentScreen("home");
    } else {
      setCurrentScreen("profile");
    }
  };

  const renderScreen = () => {
    // Show auth screen for non-logged in users
    if (showAuth) {
      return <MobileAuth onSuccess={handleAuthSuccess} />;
    }

    // Show onboarding wizard for non-premium users after auth
    if (showOnboarding && user && !hasActiveSubscription) {
      return (
        <MobileUpgradeWizard 
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      );
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
        // Premium Plus gated access for Cinema Studio
        if (!hasPremiumPlusAccess) {
          return (
            <MobilePremiumPlusLock
              feature="Cinema Studio"
              description="Access professional video creation tools with Cinema Studio. Create cinematic content with advanced AI models."
              onBack={() => setCurrentScreen("create")}
              onUpgrade={() => setCurrentScreen("subscription")}
            />
          );
        }
        return <MobileCinemaStudio onBack={() => setCurrentScreen("create")} />;
      case "audio":
        return <MobileAudioCreate onBack={() => setCurrentScreen("create")} />;
      case "visual-styles":
        return <MobileVisualStyles onBack={() => setCurrentScreen("create")} />;
      case "apps":
        // Premium Plus gated access for AI Apps
        if (!hasPremiumPlusAccess) {
          return (
            <MobilePremiumPlusLock
              feature="AI Apps"
              description="Unlock all 7 AI-powered apps including Skin AI, Financial AI, Sleep AI, and more."
              onBack={() => setCurrentScreen("home")}
              onUpgrade={() => setCurrentScreen("subscription")}
            />
          );
        }
        return <MobileApps onBack={() => setCurrentScreen("create")} onNavigate={setCurrentScreen} />;
      case "chat":
        return <MobileChat />;
      case "library":
        return <MobileLibrary />;
      case "profile":
        return <MobileProfile onNavigate={setCurrentScreen} />;
      case "subscription":
        return <MobilePricing onBack={handleSubscriptionBack} />;
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

  // Determine if bottom nav should be hidden
  const hideNav = showAuth || showSplash || showOnboarding || currentScreen === "subscription";

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
            
            {/* Bottom Navigation - hide during auth/onboarding/subscription flows */}
            {!hideNav && (
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
