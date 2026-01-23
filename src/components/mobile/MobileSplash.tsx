import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

interface MobileSplashProps {
  onComplete: () => void;
  isCheckingAuth: boolean;
  hasUser: boolean;
}

export function MobileSplash({ onComplete, isCheckingAuth, hasUser }: MobileSplashProps) {
  const [loadingStep, setLoadingStep] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const loadingSteps = [
    "Initializing...",
    "Checking authentication...",
    hasUser ? "Loading your data..." : "Preparing experience...",
    hasUser ? "Setting up workspace..." : "Almost ready...",
    "Ready!"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 600);

    return () => clearInterval(interval);
  }, [loadingSteps.length]);

  useEffect(() => {
    if (!isCheckingAuth && loadingStep >= 2) {
      const timer = setTimeout(() => {
        setFadeOut(true);
        setTimeout(onComplete, 400);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isCheckingAuth, loadingStep, onComplete]);

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-400",
        fadeOut ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[spin_20s_linear_infinite] opacity-30">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-primary/40 to-transparent blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-48 h-48 rounded-full bg-gradient-to-br from-accent/40 to-transparent blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-56 h-56 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 blur-3xl" />
        </div>
      </div>

      {/* Logo with pulse animation */}
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-ping opacity-20">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent" />
        </div>
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 p-4 backdrop-blur-sm border border-border/20 animate-[pulse_2s_ease-in-out_infinite]">
          <img 
            src={logo} 
            alt="Timeless AI" 
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </div>
      </div>

      {/* App Name with gradient */}
      <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent mb-2">
        Timeless AI
      </h1>
      <p className="text-muted-foreground text-sm mb-8">Create without limits</p>

      {/* Loading Status */}
      <div className="flex flex-col items-center gap-4">
        {/* Animated Dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "w-3 h-3 rounded-full bg-gradient-to-br from-primary to-accent transition-all duration-300",
                "animate-[bounce_1s_ease-in-out_infinite]"
              )}
              style={{
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>

        {/* Loading Text */}
        <p 
          className={cn(
            "text-sm text-muted-foreground transition-all duration-300 min-h-[20px]",
            "animate-fade-in"
          )}
          key={loadingStep}
        >
          {loadingSteps[loadingStep]}
        </p>

        {/* Progress Bar */}
        <div className="w-48 h-1 rounded-full bg-border/30 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` 
            }}
          />
        </div>
      </div>
    </div>
  );
}
