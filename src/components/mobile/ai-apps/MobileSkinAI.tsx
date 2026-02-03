import { useState } from "react";
import { SkinOnboarding, SkinCamera, SkinAnalyzing, SkinResults } from "./skin-ai";
import type { SkinAnalysisResult } from "./skin-ai";

type SkinFlowStep = "onboarding" | "camera" | "analyzing" | "results";

interface MobileSkinAIProps {
  onBack: () => void;
}

export function MobileSkinAI({ onBack }: MobileSkinAIProps) {
  const [currentStep, setCurrentStep] = useState<SkinFlowStep>("onboarding");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<SkinAnalysisResult | null>(null);

  const handleStartAnalysis = () => {
    setCurrentStep("camera");
  };

  const handleCaptureComplete = (images: string[]) => {
    setCapturedImages(images);
    setCurrentStep("analyzing");
  };

  const handleAnalysisComplete = (result: SkinAnalysisResult) => {
    setAnalysisResult(result);
    setCurrentStep("results");
  };

  const handleRetake = () => {
    setCapturedImages([]);
    setAnalysisResult(null);
    setCurrentStep("camera");
  };

  const handleBackFromCamera = () => {
    setCurrentStep("onboarding");
  };

  switch (currentStep) {
    case "onboarding":
      return (
        <SkinOnboarding
          onBack={onBack}
          onStartAnalysis={handleStartAnalysis}
        />
      );
    
    case "camera":
      return (
        <SkinCamera
          onBack={handleBackFromCamera}
          onCaptureComplete={handleCaptureComplete}
        />
      );
    
    case "analyzing":
      return (
        <SkinAnalyzing
          images={capturedImages}
          onAnalysisComplete={handleAnalysisComplete}
          onError={(error) => {
            console.error("Analysis error:", error);
            setCurrentStep("camera");
          }}
        />
      );
    
    case "results":
      return analysisResult ? (
        <SkinResults
          result={analysisResult}
          onBack={onBack}
          onRetake={handleRetake}
        />
      ) : null;
    
    default:
      return null;
  }
}
