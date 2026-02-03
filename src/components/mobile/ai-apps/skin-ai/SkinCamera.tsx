import { useState, useRef, useCallback, useEffect } from "react";
import { X, Camera, RotateCcw, MoveRight, MoveLeft, User } from "lucide-react";
import { cn } from "@/lib/utils";

type CaptureStep = "front" | "right" | "left";

interface SkinCameraProps {
  onBack: () => void;
  onCaptureComplete: (images: string[]) => void;
}

const instructions: Record<CaptureStep, { title: string; description: string; icon: typeof User }> = {
  front: {
    title: "Look Straight",
    description: "Position your face in the center and look directly at the camera",
    icon: User,
  },
  right: {
    title: "Turn Right",
    description: "Slowly turn your head to show the right side of your face",
    icon: MoveRight,
  },
  left: {
    title: "Turn Left",
    description: "Slowly turn your head to show the left side of your face",
    icon: MoveLeft,
  },
};

const stepOrder: CaptureStep[] = ["front", "right", "left"];

export function SkinCamera({ onBack, onCaptureComplete }: SkinCameraProps) {
  const [currentStep, setCurrentStep] = useState<CaptureStep>("front");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Unable to access camera. Please grant camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const captureImage = async () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);
    setCountdown(3);

    // Countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    setCountdown(0);

    // Capture
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      
      const newImages = [...capturedImages, imageData];
      setCapturedImages(newImages);

      const currentIndex = stepOrder.indexOf(currentStep);
      if (currentIndex < stepOrder.length - 1) {
        setCurrentStep(stepOrder[currentIndex + 1]);
      } else {
        // All captures complete
        stopCamera();
        onCaptureComplete(newImages);
      }
    }

    setIsCapturing(false);
  };

  const instruction = instructions[currentStep];
  const InstructionIcon = instruction.icon;
  const stepIndex = stepOrder.indexOf(currentStep);

  if (cameraError) {
    return (
      <div className="h-full flex flex-col bg-black items-center justify-center p-6">
        <div className="text-center">
          <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground mb-4">{cameraError}</p>
          <button
            onClick={startCamera}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black relative">
      {/* Camera preview */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />

        {/* Face guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className={cn(
              "w-[280px] h-[360px] border-[3px] rounded-[140px] transition-all",
              isCapturing ? "border-primary animate-pulse" : "border-primary/60"
            )}
          />
        </div>

        {/* Countdown overlay */}
        {isCapturing && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-black/70 flex items-center justify-center">
              <span className="text-5xl font-bold text-white">{countdown}</span>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center">
            <button onClick={onBack} className="p-2">
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="flex-1" />
            {/* Progress indicators */}
            <div className="flex gap-2">
              {stepOrder.map((_, index) => {
                const isCompleted = index < stepIndex;
                const isCurrent = index === stepIndex;
                return (
                  <div
                    key={index}
                    className={cn(
                      "w-10 h-1 rounded-full transition-colors",
                      isCompleted
                        ? "bg-green-500"
                        : isCurrent
                        ? "bg-primary"
                        : "bg-white/30"
                    )}
                  />
                );
              })}
            </div>
            <div className="flex-1" />
            <div className="w-10" /> {/* Balance */}
          </div>
        </div>
      </div>

      {/* Bottom instruction panel */}
      <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-12">
        {/* Instruction card */}
        <div className="bg-white/10 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <InstructionIcon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">{instruction.title}</h3>
              <p className="text-sm text-white/70">{instruction.description}</p>
            </div>
          </div>
        </div>

        {/* Capture button */}
        <div className="flex flex-col items-center">
          <button
            onClick={captureImage}
            disabled={isCapturing || !isCameraReady}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center mb-4"
          >
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                isCapturing ? "bg-muted-foreground" : "bg-primary"
              )}
            >
              {isCapturing ? (
                <RotateCcw className="w-7 h-7 text-white animate-spin" />
              ) : (
                <Camera className="w-7 h-7 text-white" />
              )}
            </div>
          </button>
          <p className="text-white/50 text-sm">Step {stepIndex + 1} of 3</p>
        </div>
      </div>
    </div>
  );
}
