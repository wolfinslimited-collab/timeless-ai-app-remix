import { useState } from "react";
import CinemaToolLayout from "./CinemaToolLayout";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const motionPresets = [
  { id: "linear", label: "Linear", icon: "➡️", description: "Straight line motion" },
  { id: "curved", label: "Curved", icon: "〰️", description: "Smooth curved path" },
  { id: "spiral", label: "Spiral", icon: "🌀", description: "Spiral motion" },
  { id: "bounce", label: "Bounce", icon: "⤴️", description: "Bouncing motion" },
  { id: "orbit", label: "Orbit", icon: "🔄", description: "Circular orbit" },
  { id: "zigzag", label: "Zig-Zag", icon: "⚡", description: "Sharp turns" },
  { id: "wave", label: "Wave", icon: "🌊", description: "Wave-like motion" },
  { id: "custom", label: "Custom", icon: "✏️", description: "Draw your path" },
];

const easingOptions = [
  { id: "linear", label: "Linear" },
  { id: "ease-in", label: "Ease In" },
  { id: "ease-out", label: "Ease Out" },
  { id: "ease-in-out", label: "Ease In-Out" },
  { id: "bounce", label: "Bounce" },
  { id: "elastic", label: "Elastic" },
];

const MotionPathTool = () => {
  const [selectedPath, setSelectedPath] = useState<string>("linear");
  const [selectedEasing, setSelectedEasing] = useState<string>("ease-in-out");

  return (
    <CinemaToolLayout
      title="Motion Path"
      description="Create custom camera motion paths for cinematic footage"
      toolId="motion-path"
      creditCost={18}
      showVideoUpload={false}
      showImageUpload={true}
      showPrompt={true}
      promptPlaceholder="Describe the scene and desired camera path..."
      showDuration={true}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <Label>Motion Path Preset</Label>
          <div className="grid grid-cols-4 gap-2">
            {motionPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPath(preset.id)}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  selectedPath === preset.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border/50 bg-secondary/30 hover:bg-secondary/50"
                )}
              >
                <div className="text-xl mb-1">{preset.icon}</div>
                <div className="text-xs font-medium">{preset.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Easing Function</Label>
          <div className="grid grid-cols-3 gap-2">
            {easingOptions.map((easing) => (
              <button
                key={easing.id}
                onClick={() => setSelectedEasing(easing.id)}
                className={cn(
                  "px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                  selectedEasing === easing.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 bg-secondary/30 hover:bg-secondary/50"
                )}
              >
                {easing.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </CinemaToolLayout>
  );
};

export default MotionPathTool;
