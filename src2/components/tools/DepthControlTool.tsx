import { useState } from "react";
import CinemaToolLayout from "./CinemaToolLayout";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const focusPresets = [
  { id: "shallow", label: "Shallow DOF", description: "f/1.4 - Dreamy blur" },
  { id: "medium", label: "Medium DOF", description: "f/2.8 - Balanced" },
  { id: "deep", label: "Deep DOF", description: "f/8 - Sharp throughout" },
  { id: "rack-focus", label: "Rack Focus", description: "Shift focus dynamically" },
];

const DepthControlTool = () => {
  const [focusPreset, setFocusPreset] = useState<string>("shallow");
  const [aperture, setAperture] = useState(1.4);
  const [focusDistance, setFocusDistance] = useState(50);
  const [blurAmount, setBlurAmount] = useState(70);

  return (
    <CinemaToolLayout
      title="Depth Control"
      description="Control depth of field and focus for cinematic look"
      toolId="depth-control"
      creditCost={12}
      showVideoUpload={true}
      showImageUpload={true}
      showPrompt={true}
      promptPlaceholder="Describe where the focus should be..."
      showIntensity={false}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <Label>Focus Preset</Label>
          <div className="grid grid-cols-2 gap-2">
            {focusPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setFocusPreset(preset.id)}
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  focusPreset === preset.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border/50 bg-secondary/30 hover:bg-secondary/50"
                )}
              >
                <div className="text-sm font-medium">{preset.label}</div>
                <div className="text-xs text-muted-foreground">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Aperture</Label>
            <span className="text-sm text-muted-foreground">f/{aperture.toFixed(1)}</span>
          </div>
          <Slider
            value={[aperture]}
            onValueChange={([val]) => setAperture(val)}
            min={1.4}
            max={16}
            step={0.1}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Focus Distance</Label>
            <span className="text-sm text-muted-foreground">{focusDistance}%</span>
          </div>
          <Slider
            value={[focusDistance]}
            onValueChange={([val]) => setFocusDistance(val)}
            min={0}
            max={100}
            step={5}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Background Blur</Label>
            <span className="text-sm text-muted-foreground">{blurAmount}%</span>
          </div>
          <Slider
            value={[blurAmount]}
            onValueChange={([val]) => setBlurAmount(val)}
            min={0}
            max={100}
            step={5}
          />
        </div>
      </div>
    </CinemaToolLayout>
  );
};

export default DepthControlTool;
