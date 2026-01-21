import { useState } from "react";
import CinemaToolLayout from "./CinemaToolLayout";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const colorPresets = [
  { id: "neutral", label: "Neutral", color: "#808080" },
  { id: "cinematic", label: "Cinematic", color: "#1a3a5c" },
  { id: "warm", label: "Warm", color: "#d4a574" },
  { id: "cool", label: "Cool", color: "#6ba3c7" },
  { id: "teal-orange", label: "Teal & Orange", color: "#2d8b8b" },
  { id: "noir", label: "Film Noir", color: "#2a2a2a" },
  { id: "vintage", label: "Vintage", color: "#a67c52" },
  { id: "moody", label: "Moody", color: "#3d3d5c" },
];

const ColorGradeTool = () => {
  const [selectedPreset, setSelectedPreset] = useState<string>("cinematic");
  const [temperature, setTemperature] = useState(50);
  const [tint, setTint] = useState(50);
  const [contrast, setContrast] = useState(50);
  const [saturation, setSaturation] = useState(50);
  const [highlights, setHighlights] = useState(50);
  const [shadows, setShadows] = useState(50);

  return (
    <CinemaToolLayout
      title="Color Grade"
      description="Professional color grading with cinematic LUTs and color adjustments"
      toolId="color-grade"
      creditCost={8}
      showVideoUpload={true}
      showImageUpload={true}
      showPrompt={true}
      promptPlaceholder="Describe the mood or color style you want..."
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <Label>Color Preset</Label>
          <div className="grid grid-cols-4 gap-2">
            {colorPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedPreset(preset.id)}
                className={cn(
                  "p-2 rounded-lg border text-center transition-all",
                  selectedPreset === preset.id
                    ? "border-primary ring-1 ring-primary"
                    : "border-border/50 hover:border-border"
                )}
              >
                <div
                  className="w-full h-6 rounded mb-1"
                  style={{ backgroundColor: preset.color }}
                />
                <div className="text-xs font-medium truncate">{preset.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Temperature</Label>
              <span className="text-xs text-muted-foreground">{temperature - 50 > 0 ? '+' : ''}{temperature - 50}</span>
            </div>
            <Slider
              value={[temperature]}
              onValueChange={([val]) => setTemperature(val)}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tint</Label>
              <span className="text-xs text-muted-foreground">{tint - 50 > 0 ? '+' : ''}{tint - 50}</span>
            </div>
            <Slider
              value={[tint]}
              onValueChange={([val]) => setTint(val)}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Contrast</Label>
              <span className="text-xs text-muted-foreground">{contrast - 50 > 0 ? '+' : ''}{contrast - 50}</span>
            </div>
            <Slider
              value={[contrast]}
              onValueChange={([val]) => setContrast(val)}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Saturation</Label>
              <span className="text-xs text-muted-foreground">{saturation - 50 > 0 ? '+' : ''}{saturation - 50}</span>
            </div>
            <Slider
              value={[saturation]}
              onValueChange={([val]) => setSaturation(val)}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Highlights</Label>
              <span className="text-xs text-muted-foreground">{highlights - 50 > 0 ? '+' : ''}{highlights - 50}</span>
            </div>
            <Slider
              value={[highlights]}
              onValueChange={([val]) => setHighlights(val)}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Shadows</Label>
              <span className="text-xs text-muted-foreground">{shadows - 50 > 0 ? '+' : ''}{shadows - 50}</span>
            </div>
            <Slider
              value={[shadows]}
              onValueChange={([val]) => setShadows(val)}
              min={0}
              max={100}
              step={1}
            />
          </div>
        </div>
      </div>
    </CinemaToolLayout>
  );
};

export default ColorGradeTool;
