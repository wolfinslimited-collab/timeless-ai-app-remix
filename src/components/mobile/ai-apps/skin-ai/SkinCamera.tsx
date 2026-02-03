import { useState, useRef } from "react";
import { X, Upload, Image, MoveRight, MoveLeft, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CaptureStep = "front" | "right" | "left";

interface SkinCameraProps {
  onBack: () => void;
  onCaptureComplete: (images: string[]) => void;
}

const instructions: Record<CaptureStep, { title: string; description: string; icon: typeof User }> = {
  front: {
    title: "Front View",
    description: "Upload a photo of your face looking directly at the camera",
    icon: User,
  },
  right: {
    title: "Right Side",
    description: "Upload a photo showing the right side of your face",
    icon: MoveRight,
  },
  left: {
    title: "Left Side",
    description: "Upload a photo showing the left side of your face",
    icon: MoveLeft,
  },
};

const stepOrder: CaptureStep[] = ["front", "right", "left"];

export function SkinCamera({ onBack, onCaptureComplete }: SkinCameraProps) {
  const [currentStep, setCurrentStep] = useState<CaptureStep>("front");
  const [capturedImages, setCapturedImages] = useState<Record<CaptureStep, string | null>>({
    front: null,
    right: null,
    left: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      
      setCapturedImages((prev) => ({
        ...prev,
        [currentStep]: imageData,
      }));

      // Move to next step or complete
      const currentIndex = stepOrder.indexOf(currentStep);
      if (currentIndex < stepOrder.length - 1) {
        setCurrentStep(stepOrder[currentIndex + 1]);
      }
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleComplete = () => {
    const images = stepOrder
      .map((step) => capturedImages[step])
      .filter((img): img is string => img !== null);
    
    if (images.length > 0) {
      onCaptureComplete(images);
    }
  };

  const allImagesUploaded = stepOrder.every((step) => capturedImages[step] !== null);
  const instruction = instructions[currentStep];
  const InstructionIcon = instruction.icon;
  const stepIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <button onClick={onBack} className="p-1">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground">Upload Photos</h1>
        <div className="w-7" />
      </div>

      {/* Progress indicators */}
      <div className="px-4 py-3 flex justify-center gap-2">
        {stepOrder.map((step, index) => {
          const isCompleted = capturedImages[step] !== null;
          const isCurrent = step === currentStep;
          return (
            <button
              key={step}
              onClick={() => setCurrentStep(step)}
              className={cn(
                "w-10 h-1.5 rounded-full transition-colors",
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

      {/* Image previews */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {stepOrder.map((step) => {
            const image = capturedImages[step];
            const isActive = step === currentStep;
            return (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={cn(
                  "aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all",
                  isActive ? "border-primary ring-2 ring-primary/20" : "border-border",
                  image ? "bg-secondary" : "bg-secondary/50"
                )}
              >
                {image ? (
                  <div className="relative w-full h-full">
                    <img
                      src={image}
                      alt={step}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Image className="w-6 h-6 mb-1" />
                    <span className="text-xs capitalize">{step}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Current step instruction */}
        <div className="bg-secondary rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <InstructionIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground mb-1">{instruction.title}</h3>
              <p className="text-sm text-muted-foreground">{instruction.description}</p>
            </div>
          </div>
        </div>

        {/* Upload area */}
        <button
          onClick={handleUploadClick}
          className="w-full aspect-video rounded-2xl border-2 border-dashed border-border bg-secondary/50 flex flex-col items-center justify-center gap-3 hover:bg-secondary transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {capturedImages[currentStep] ? "Replace photo" : "Upload photo"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Step {stepIndex + 1} of 3
            </p>
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Action button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleComplete}
          disabled={!capturedImages.front}
          className={cn(
            "w-full py-4 rounded-2xl font-semibold transition-colors",
            capturedImages.front
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {allImagesUploaded
            ? "Start Analysis"
            : capturedImages.front
            ? "Continue with uploaded photos"
            : "Upload at least one photo"}
        </button>
      </div>
    </div>
  );
}
