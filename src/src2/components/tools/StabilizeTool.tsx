import { useState } from "react";
import CinemaToolLayout from "./CinemaToolLayout";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const stabilizationModes = [
  { id: "smooth", label: "Smooth", description: "Gentle, natural stabilization" },
  { id: "locked", label: "Locked", description: "Completely static camera" },
  { id: "tripod", label: "Tripod", description: "Simulates tripod mount" },
  { id: "cinematic", label: "Cinematic", description: "Smooth with slight movement" },
];

const StabilizeTool = () => {
  const [selectedMode, setSelectedMode] = useState<string>("smooth");

  return (
    <CinemaToolLayout
      title="AI Stabilize"
      description="Remove camera shake and stabilize shaky footage with AI"
      toolId="stabilize"
      creditCost={8}
      showVideoUpload={true}
      showImageUpload={false}
      showPrompt={false}
      showIntensity={true}
    >
      <div className="space-y-3">
        <Label>Stabilization Mode</Label>
        <div className="grid grid-cols-2 gap-2">
          {stabilizationModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                selectedMode === mode.id
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border/50 bg-secondary/30 hover:bg-secondary/50"
              )}
            >
              <div className="text-sm font-medium">{mode.label}</div>
              <div className="text-xs text-muted-foreground">{mode.description}</div>
            </button>
          ))}
        </div>
      </div>
    </CinemaToolLayout>
  );
};

export default StabilizeTool;
