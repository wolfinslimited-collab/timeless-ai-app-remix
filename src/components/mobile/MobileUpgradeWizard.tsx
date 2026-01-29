import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Import wizard images (using placeholders - will use gradients as fallback)
const wizardSteps = [
  {
    id: 1,
    title: "UNLIMITED GENERATIONS",
    description: "Create unlimited images, videos, and music with no daily limits.",
    gradient: "from-purple-600 via-pink-500 to-orange-400",
  },
  {
    id: 2,
    title: "PRIORITY PROCESSING",
    description: "Skip the queue and get faster results with priority access to our servers.",
    gradient: "from-blue-600 via-cyan-500 to-teal-400",
  },
  {
    id: 3,
    title: "4K QUALITY EXPORTS",
    description: "Download your creations in stunning 4K resolution for professional use.",
    gradient: "from-emerald-600 via-green-500 to-lime-400",
  },
  {
    id: 4,
    title: "ADVANCED AI MODELS",
    description: "Access our most powerful AI models for superior quality and creativity.",
    gradient: "from-violet-600 via-purple-500 to-fuchsia-400",
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

  return (
    <div className="absolute inset-0 bg-[#05070F] flex flex-col overflow-hidden z-50">
      {/* Background Gradient */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-30 transition-all duration-500",
          currentStep.gradient
        )}
      />
      
      {/* Overlay gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070F] via-[#05070F]/50 to-transparent" />
      
      {/* Content */}
      <div className="relative flex-1 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center"
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h1 
            className="text-white text-3xl font-bold text-center tracking-wide"
            style={{ fontFamily: "system-ui" }}
          >
            {currentStep.title}
          </h1>
          <p className="text-white/70 text-center text-sm mt-4 max-w-[60%] leading-relaxed">
            {currentStep.description}
          </p>
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
          <div className="flex justify-center gap-2.5">
            {wizardSteps.map((_, index) => {
              const isActive = index === currentIndex;
              const isPast = index < currentIndex;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "h-1 rounded-full overflow-hidden transition-all duration-300",
                    isActive ? "w-16" : "w-6",
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
