import { useState } from "react";
import { ArrowLeft, Sparkles, Camera, BarChart3, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileSkinAIProps {
  onBack: () => void;
}

interface OnboardingStep {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    icon: Sparkles,
    title: "AI Skin Analysis",
    description: "Get a comprehensive analysis of your skin health using advanced AI technology. Detect concerns like acne, wrinkles, dark spots, and more.",
    color: "#EC4899",
  },
  {
    icon: Camera,
    title: "Face Scanning",
    description: "We'll guide you through capturing your face from multiple angles - front, left, and right - for the most accurate analysis.",
    color: "#8B5CF6",
  },
  {
    icon: BarChart3,
    title: "Detailed Report",
    description: "Receive a personalized skin report with scores, detected issues, and recommendations tailored to your unique skin type.",
    color: "#3B82F6",
  },
];

export function MobileSkinAI({ onBack }: MobileSkinAIProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Start analysis - for now show results
      setShowResults(true);
    }
  };

  if (showResults) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-border">
          <button onClick={() => setShowResults(false)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Skin Analysis Results</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Overall Score */}
          <div className="p-6 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-2xl border border-pink-500/30 text-center">
            <p className="text-sm text-muted-foreground mb-2">Skin Score</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold text-foreground">82</span>
              <span className="text-muted-foreground">/100</span>
            </div>
            <p className="text-sm text-green-500 mt-2">Good overall skin health!</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Hydration", value: 85, color: "blue" },
              { label: "Elasticity", value: 78, color: "purple" },
              { label: "Texture", value: 72, color: "green" },
              { label: "Radiance", value: 88, color: "amber" },
            ].map((metric) => (
              <div
                key={metric.label}
                className={cn(
                  "p-4 rounded-xl border",
                  metric.color === "blue" && "bg-blue-500/10 border-blue-500/20",
                  metric.color === "purple" && "bg-purple-500/10 border-purple-500/20",
                  metric.color === "green" && "bg-green-500/10 border-green-500/20",
                  metric.color === "amber" && "bg-amber-500/10 border-amber-500/20"
                )}
              >
                <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
                <p className="text-2xl font-bold text-foreground">{metric.value}%</p>
              </div>
            ))}
          </div>

          {/* Detected Issues */}
          <div>
            <h3 className="text-base font-semibold text-foreground mb-3">Detected Concerns</h3>
            <div className="space-y-2">
              {[
                { issue: "Minor dark circles", severity: "low" },
                { issue: "Slight dehydration", severity: "medium" },
              ].map((item) => (
                <div key={item.issue} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                  <span className="text-sm text-foreground">{item.issue}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    item.severity === "low" && "bg-green-500/20 text-green-500",
                    item.severity === "medium" && "bg-amber-500/20 text-amber-500",
                    item.severity === "high" && "bg-red-500/20 text-red-500"
                  )}>
                    {item.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-base font-semibold text-foreground mb-3">Recommendations</h3>
            <div className="space-y-2">
              {[
                "Use a hydrating serum with hyaluronic acid",
                "Apply eye cream before bed",
                "Drink more water throughout the day",
              ].map((rec, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">{i + 1}</span>
                  </div>
                  <span className="text-sm text-foreground">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium">
            Start New Analysis
          </button>
        </div>
      </div>
    );
  }

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
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center mb-8",
            currentStep === 0 && "bg-pink-500/15",
            currentStep === 1 && "bg-violet-500/15",
            currentStep === 2 && "bg-blue-500/15"
          )}
        >
          <StepIcon className={cn(
            "w-12 h-12",
            currentStep === 0 && "text-pink-500",
            currentStep === 1 && "text-violet-500",
            currentStep === 2 && "text-blue-500"
          )} />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-4">{step.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-2 py-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all",
              i === currentStep ? "w-6" : "w-2",
              i === currentStep ? "bg-pink-500" : "bg-border"
            )}
            style={i === currentStep ? { backgroundColor: step.color } : {}}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="p-6 space-y-3">
        <button
          onClick={handleNext}
          className="w-full py-4 rounded-2xl font-semibold text-white"
          style={{ backgroundColor: step.color }}
        >
          {currentStep < steps.length - 1 ? "Continue" : "Start Analysis"}
        </button>
        {currentStep < steps.length - 1 && (
          <button
            onClick={() => setShowResults(true)}
            className="w-full py-2 text-muted-foreground text-sm"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
