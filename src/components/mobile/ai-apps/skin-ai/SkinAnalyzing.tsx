import { useState, useEffect, useRef } from "react";
import { Sparkles, Lightbulb, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkinAnalyzingProps {
  images: string[];
  onAnalysisComplete: (result: SkinAnalysisResult) => void;
  onError: (error: string) => void;
}

export interface SkinConcern {
  name: string;
  severity: "mild" | "moderate" | "severe";
  description: string;
}

export interface SkinAnalysisResult {
  skinType: string;
  overallScore: number;
  hydrationLevel: number;
  oilinessLevel: number;
  concerns: SkinConcern[];
  recommendations: string[];
  analysisSummary: string;
}

const phases = [
  { label: "Preprocessing images...", progress: 0.15 },
  { label: "Detecting skin regions...", progress: 0.30 },
  { label: "Analyzing with AI...", progress: 0.50 },
  { label: "Detecting concerns...", progress: 0.70 },
  { label: "Generating report...", progress: 0.90 },
  { label: "Finalizing...", progress: 1.0 },
];

export function SkinAnalyzing({ images, onAnalysisComplete, onError }: SkinAnalyzingProps) {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("Initializing...");
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const analysisCompleteRef = useRef(false);
  const animationFrameRef = useRef<number>();

  // Rotation animation
  useEffect(() => {
    const animate = () => {
      setRotation((r) => (r + 2) % 360);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Analysis simulation
  useEffect(() => {
    const runAnalysis = async () => {
      try {
        // Animate through phases while "analyzing"
        for (let i = 0; i < phases.length - 1; i++) {
          if (analysisCompleteRef.current) return;
          
          setCurrentPhaseIndex(i);
          setCurrentPhase(phases[i].label);
          
          const targetProgress = phases[i].progress;
          while (progress < targetProgress && !analysisCompleteRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 80));
            setProgress((p) => Math.min(p + 0.02, targetProgress));
          }
          
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Mock result
        const mockResult: SkinAnalysisResult = {
          skinType: "combination",
          overallScore: 78,
          hydrationLevel: 65,
          oilinessLevel: 45,
          concerns: [
            {
              name: "Minor Dark Circles",
              severity: "mild",
              description: "Slight discoloration under the eyes, possibly due to lack of sleep or genetics.",
            },
            {
              name: "Mild Dehydration",
              severity: "moderate",
              description: "Some areas of the skin show signs of dehydration, particularly around the cheeks.",
            },
          ],
          recommendations: [
            "Use a hydrating serum with hyaluronic acid daily",
            "Apply eye cream before bed to reduce dark circles",
            "Drink at least 8 glasses of water throughout the day",
            "Consider using a gentle exfoliant twice a week",
            "Always apply SPF 30+ sunscreen during the day",
          ],
          analysisSummary:
            "Your skin is in good overall condition with combination skin type. The T-zone shows slightly elevated oil levels while the cheeks appear mildly dehydrated. Focus on balancing hydration and oil control for optimal skin health.",
        };

        analysisCompleteRef.current = true;
        setProgress(1);
        setCurrentPhase("Complete!");
        
        await new Promise((resolve) => setTimeout(resolve, 500));
        onAnalysisComplete(mockResult);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Analysis failed";
        setError(errorMessage);
        onError(errorMessage);
      }
    };

    runAnalysis();
  }, [images, onAnalysisComplete, onError]);

  if (error) {
    return (
      <div className="h-full flex flex-col bg-background items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full bg-destructive/15 flex items-center justify-center mb-6">
          <AlertCircle className="w-12 h-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Analysis Failed</h2>
        <p className="text-muted-foreground text-center mb-8">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background p-6">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Animated scanner */}
        <div className="relative w-[200px] h-[200px] mb-12">
          {/* Outer rotating ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from ${rotation}deg, transparent 0%, hsl(var(--primary)) 50%, transparent 100%)`,
              opacity: 0.6,
            }}
          />
          {/* Inner circle */}
          <div className="absolute inset-5 rounded-full bg-card border-2 border-border flex items-center justify-center">
            <Sparkles className="w-16 h-16 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-foreground mb-3">Analyzing Your Skin</h2>

        {/* Current phase */}
        <p className="text-base text-muted-foreground mb-10 h-6">{currentPhase}</p>

        {/* Progress bar */}
        <div className="w-full max-w-xs mb-4">
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-muted-foreground rounded-full transition-all duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        {/* Progress percentage */}
        <p className="text-lg font-semibold text-muted-foreground mb-10">
          {Math.round(progress * 100)}%
        </p>

        {/* Phase indicators */}
        <div className="flex gap-2">
          {phases.map((_, index) => {
            const isCompleted = index < currentPhaseIndex;
            const isCurrent = index === currentPhaseIndex;
            return (
              <div
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  isCompleted
                    ? "bg-green-500"
                    : isCurrent
                    ? "bg-primary"
                    : "bg-border"
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Tip */}
      <div className="p-4 bg-secondary rounded-xl border border-border flex items-start gap-3">
        <Lightbulb className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Tip: For best results, analyze your skin in natural lighting
        </p>
      </div>
    </div>
  );
}
