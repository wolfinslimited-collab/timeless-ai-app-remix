import { useState } from "react";
import CinemaToolLayout from "./CinemaToolLayout";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const lensTypes = [
  { id: "anamorphic", label: "Anamorphic", description: "Classic widescreen flares" },
  { id: "vintage", label: "Vintage", description: "Soft, warm character" },
  { id: "spherical", label: "Spherical", description: "Clean, sharp look" },
  { id: "tilt-shift", label: "Tilt-Shift", description: "Miniature effect" },
  { id: "fisheye", label: "Fisheye", description: "Ultra-wide distortion" },
  { id: "macro", label: "Macro", description: "Extreme close-up" },
];

const flareStyles = [
  { id: "none", label: "None" },
  { id: "subtle", label: "Subtle" },
  { id: "cinematic", label: "Cinematic" },
  { id: "intense", label: "Intense" },
];

const LensEffectsTool = () => {
  const [selectedLens, setSelectedLens] = useState<string>("anamorphic");
  const [flareStyle, setFlareStyle] = useState<string>("cinematic");
  const [chromaticAberration, setChromaticAberration] = useState(false);
  const [vignette, setVignette] = useState(30);
  const [distortion, setDistortion] = useState(0);
  const [filmGrain, setFilmGrain] = useState(20);

  return (
    <CinemaToolLayout
      title="Lens Effects"
      description="Apply cinematic lens effects, flares, and optical characteristics"
      toolId="lens-effects"
      creditCost={10}
      showVideoUpload={true}
      showImageUpload={true}
      showPrompt={false}
      showIntensity={true}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <Label>Lens Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {lensTypes.map((lens) => (
              <button
                key={lens.id}
                onClick={() => setSelectedLens(lens.id)}
                className={cn(
                  "p-2 rounded-lg border text-center transition-all",
                  selectedLens === lens.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border/50 bg-secondary/30 hover:bg-secondary/50"
                )}
              >
                <div className="text-xs font-medium">{lens.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Lens Flare</Label>
          <div className="grid grid-cols-4 gap-2">
            {flareStyles.map((flare) => (
              <button
                key={flare.id}
                onClick={() => setFlareStyle(flare.id)}
                className={cn(
                  "px-2 py-1.5 rounded-lg border text-xs font-medium transition-all",
                  flareStyle === flare.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 bg-secondary/30 hover:bg-secondary/50"
                )}
              >
                {flare.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
          <div>
            <Label>Chromatic Aberration</Label>
            <p className="text-xs text-muted-foreground">Color fringing effect</p>
          </div>
          <Switch
            checked={chromaticAberration}
            onCheckedChange={setChromaticAberration}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Vignette</Label>
            <span className="text-sm text-muted-foreground">{vignette}%</span>
          </div>
          <Slider
            value={[vignette]}
            onValueChange={([val]) => setVignette(val)}
            min={0}
            max={100}
            step={5}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Lens Distortion</Label>
            <span className="text-sm text-muted-foreground">{distortion > 0 ? '+' : ''}{distortion}%</span>
          </div>
          <Slider
            value={[distortion]}
            onValueChange={([val]) => setDistortion(val)}
            min={-50}
            max={50}
            step={5}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Film Grain</Label>
            <span className="text-sm text-muted-foreground">{filmGrain}%</span>
          </div>
          <Slider
            value={[filmGrain]}
            onValueChange={([val]) => setFilmGrain(val)}
            min={0}
            max={100}
            step={5}
          />
        </div>
      </div>
    </CinemaToolLayout>
  );
};

export default LensEffectsTool;
