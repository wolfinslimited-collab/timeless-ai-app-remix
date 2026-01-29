import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Wizard steps with onboarding images
// First 2 slides: content aligned to bottom
// Remaining slides: content aligned to top
const wizardSteps = [
  {
    id: 1,
    title: "Welcome to Timeless",
    description: "Your intelligent AI companion that helps you create, organize, and thrive — all in one powerful app.",
    image: "/images/onboarding/welcome.jpg",
    alignBottom: true,
  },
  {
    id: 2,
    title: "MAKE\nHOLLYWOOD MOVIES",
    description: "",
    image: "/images/onboarding/hollywood.jpg",
    alignBottom: true,
  },
  {
    id: 3,
    title: "SKIN AI",
    description: "Receive smart, personalized skincare insights powered by AI to improve skin health and daily care routines.",
    image: "/images/onboarding/skin-ai.jpg",
    alignBottom: false,
  },
  {
    id: 4,
    title: "CALORIE AI",
    description: "Track calories accurately and receive AI-based nutrition guidance tailored to your lifestyle and goals.",
    image: "/images/onboarding/calorie-ai.jpg",
    alignBottom: false,
  },
  {
    id: 5,
    title: "BRAIN AI",
    description: "Enhance focus, memory, and mental performance through AI-powered cognitive training and analysis.",
    image: "/images/onboarding/brain-ai.jpg",
    alignBottom: false,
  },
  {
    id: 6,
    title: "SLEEP AI",
    description: "Improve sleep quality with AI insights that analyze patterns and help you build healthier sleep habits.",
    image: "/images/onboarding/sleep-ai.jpg",
    alignBottom: false,
  },
  {
    id: 7,
    title: "TIMEFARM",
    description: "Turn your device into a source of passive income by leveraging AI-powered computational farming.",
    image: "/images/onboarding/timefarm.jpg",
    alignBottom: false,
  },
  {
    id: 8,
    title: "MUSIC AI",
    description: "Create, compose, and edit music using AI tools designed for both beginners and professional creators.",
    image: "/images/onboarding/music-ai.jpg",
    alignBottom: false,
  },
  {
    id: 9,
    title: "NOTIFY AI",
    description: "Receive smart, real-time notifications tailored to your interests and priorities using AI.",
    image: "/images/onboarding/notify-ai.jpg",
    alignBottom: false,
  },
];

interface MobileUpgradeWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function MobileUpgradeWizard({ onComplete, onSkip }: MobileUpgradeWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoAdvance = () => {
    // Clear existing timers
    if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    
    // Reset and animate progress
    setProgress(0);
    const progressInterval = 40; // 40ms intervals
    const totalDuration = 4000; // 4 seconds
    const increment = (100 / totalDuration) * progressInterval;
    
    progressRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        return next >= 100 ? 100 : next;
      });
    }, progressInterval);

    // Auto advance after 4 seconds
    autoAdvanceRef.current = setTimeout(() => {
      if (currentIndex < wizardSteps.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onComplete();
      }
    }, totalDuration);
  };

  useEffect(() => {
    startAutoAdvance();
    
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < wizardSteps.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    onSkip();
  };

  const currentStep = wizardSteps[currentIndex];
  const alignBottom = currentStep.alignBottom;

  return (
    <div className="absolute inset-0 bg-[#05070F] flex flex-col overflow-hidden z-50">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={currentStep.image}
          alt={currentStep.title}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        {/* Overlay gradient based on alignment */}
        <div 
          className={cn(
            "absolute inset-0",
            alignBottom 
              ? "bg-gradient-to-t from-[#05070F]/90 via-[#05070F]/40 to-transparent"
              : "bg-gradient-to-b from-[#05070F]/85 via-[#05070F]/35 to-transparent"
          )}
        />
      </div>
      
      {/* Content */}
      <div className="relative flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={onSkip}
            className="text-white/80 font-semibold text-sm"
          >
            Skip
          </button>
        </div>

        {/* Main Content - positioned based on alignBottom */}
        <div 
          className={cn(
            "flex-1 flex flex-col px-6",
            alignBottom 
              ? "justify-end pb-48" 
              : "justify-start pt-16"
          )}
        >
          <h1 
            className="text-white text-3xl font-bold text-center tracking-wide whitespace-pre-line"
            style={{ fontFamily: "system-ui" }}
          >
            {currentStep.title}
          </h1>
          {currentStep.description && (
            <p className="text-white/75 text-center text-sm mt-4 max-w-[70%] mx-auto leading-relaxed">
              {currentStep.description}
            </p>
          )}
        </div>

        {/* Bottom Section */}
        <div className="px-4 pb-6">
          {/* Next Button */}
          <button
            onClick={handleNext}
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          >
            <ChevronRight className="w-8 h-8 text-white" />
          </button>

          {/* Progress Indicators */}
          <div className="flex justify-center gap-2">
            {wizardSteps.map((_, index) => {
              const isActive = index === currentIndex;
              const isPast = index < currentIndex;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "h-1 rounded-full overflow-hidden transition-all duration-300",
                    isActive ? "w-12" : "w-4",
                    "bg-white/20"
                  )}
                >
                  {isActive && (
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                  {isPast && (
                    <div className="h-full bg-primary rounded-full w-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
