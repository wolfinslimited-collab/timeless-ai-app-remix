import { useState } from "react";
import { ArrowLeft, Sparkles, Camera, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkinOnboardingProps {
  onBack: () => void;
  onStartAnalysis: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: "AI Skin Analysis",
    description: "Get a comprehensive analysis of your skin health using advanced AI technology. Detect concerns like acne, wrinkles, dark spots, and more.",
    color: "hsl(var(--primary))",
  },
  {
    icon: Camera,
    title: "Face Scanning",
    description: "We'll guide you through capturing your face from multiple angles - front, left, and right - for the most accurate analysis.",
    color: "hsl(var(--primary))",
  },
  {
    icon: BarChart3,
    title: "Detailed Report",
    description: "Receive a personalized skin report with scores, detected issues, and recommendations tailored to your unique skin type.",
    color: "hsl(var(--primary))",
  },
];

export function SkinOnboarding({ onBack, onStartAnalysis }: SkinOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onStartAnalysis();
    }
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div 
          className="w-28 h-28 rounded-full flex items-center justify-center mb-10"
          style={{ backgroundColor: `${step.color}15` }}
        >
          <StepIcon 
            className="w-14 h-14" 
            style={{ color: step.color }}
          />
        </div>
        <h1 className="text-[28px] font-bold text-foreground mb-4">{step.title}</h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-xs">{step.description}</p>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 py-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === currentStep ? "w-6 bg-primary" : "w-2 bg-border"
            )}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="p-6 space-y-3">
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl font-semibold bg-primary text-primary-foreground"
        >
          {currentStep < steps.length - 1 ? "Continue" : "Start Analysis"}
        </button>
        {currentStep < steps.length - 1 && (
          <button
            onClick={onStartAnalysis}
            className="w-full py-2 text-muted-foreground text-sm"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
