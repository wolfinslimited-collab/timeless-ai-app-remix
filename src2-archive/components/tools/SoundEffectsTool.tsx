import AudioToolLayout from "./AudioToolLayout";
import { Label } from "@/components/ui/label";

const SoundEffectsTool = () => {
  return (
    <AudioToolLayout
      title="Sound Effects"
      description="Generate sound effects from text descriptions"
      toolId="sound-effects"
      creditCost={5}
      showAudioUpload={false}
      showPrompt={true}
      promptPlaceholder="Describe the sound effect (e.g., 'explosion', 'footsteps on gravel', 'sci-fi laser')..."
      showDuration={true}
    >
      <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
        <Label className="text-xs text-muted-foreground">Tips for better results:</Label>
        <ul className="text-xs text-muted-foreground mt-2 space-y-1">
          <li>• Be specific about the sound source</li>
          <li>• Describe the environment (indoor, outdoor, underwater)</li>
          <li>• Mention intensity (soft, loud, explosive)</li>
          <li>• Include material sounds (metal, wood, glass)</li>
        </ul>
      </div>
    </AudioToolLayout>
  );
};

export default SoundEffectsTool;
