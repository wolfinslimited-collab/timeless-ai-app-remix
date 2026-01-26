import { useState } from "react";
import CinemaToolLayout from "./CinemaToolLayout";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const cameraMovements = [
  { id: "static", label: "Static", icon: "📷", description: "Fixed camera" },
  { id: "dolly-in", label: "Dolly In", icon: "➡️", description: "Move toward subject" },
  { id: "dolly-out", label: "Dolly Out", icon: "⬅️", description: "Move away" },
  { id: "pan-left", label: "Pan Left", icon: "↩️", description: "Rotate left" },
  { id: "pan-right", label: "Pan Right", icon: "↪️", description: "Rotate right" },
  { id: "tilt-up", label: "Tilt Up", icon: "⬆️", description: "Look up" },
  { id: "tilt-down", label: "Tilt Down", icon: "⬇️", description: "Look down" },
  { id: "zoom-in", label: "Zoom In", icon: "🔍", description: "Zoom closer" },
  { id: "zoom-out", label: "Zoom Out", icon: "🔎", description: "Zoom out" },
  { id: "tracking-left", label: "Track Left", icon: "⏪", description: "Slide left" },
  { id: "tracking-right", label: "Track Right", icon: "⏩", description: "Slide right" },
  { id: "arc-left", label: "Arc Left", icon: "↺", description: "Arc around left" },
  { id: "arc-right", label: "Arc Right", icon: "↻", description: "Arc around right" },
  { id: "crane-up", label: "Crane Up", icon: "🏗️", description: "Rise up" },
  { id: "crane-down", label: "Crane Down", icon: "⬇️", description: "Lower down" },
  { id: "360-orbit", label: "360° Orbit", icon: "🔄", description: "Full rotation" },
];

const CameraControlTool = () => {
  const [selectedMovements, setSelectedMovements] = useState<string[]>([]);

  const toggleMovement = (movementId: string) => {
    if (selectedMovements.includes(movementId)) {
      setSelectedMovements(selectedMovements.filter(m => m !== movementId));
    } else if (selectedMovements.length < 3) {
      setSelectedMovements([...selectedMovements, movementId]);
    }
  };

  return (
    <CinemaToolLayout
      title="Camera Control"
      description="Apply precise camera movements to your video or generate new footage with specific camera motion"
      toolId="camera-control"
      creditCost={15}
      showVideoUpload={true}
      showImageUpload={true}
      showPrompt={true}
      promptPlaceholder="Describe the scene or additional camera instructions..."
      showDuration={true}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Camera Movements</Label>
          <span className="text-xs text-muted-foreground">Select up to 3</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {cameraMovements.map((movement) => (
            <button
              key={movement.id}
              onClick={() => toggleMovement(movement.id)}
              className={cn(
                "p-2 rounded-lg border text-center transition-all hover:scale-105",
                selectedMovements.includes(movement.id)
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border/50 bg-secondary/30 hover:bg-secondary/50"
              )}
            >
              <div className="text-lg">{movement.icon}</div>
              <div className="text-xs font-medium truncate">{movement.label}</div>
            </button>
          ))}
        </div>
        {selectedMovements.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedMovements.map((id, index) => {
              const movement = cameraMovements.find(m => m.id === id);
              return (
                <div
                  key={id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs"
                >
                  <span>{index + 1}.</span>
                  <span>{movement?.icon}</span>
                  <span>{movement?.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CinemaToolLayout>
  );
};

export default CameraControlTool;
