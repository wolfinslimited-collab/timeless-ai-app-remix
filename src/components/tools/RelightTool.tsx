import ImageToolLayout from "./ImageToolLayout";

interface RelightToolProps {
  onBack: () => void;
}

const RelightTool = ({ onBack }: RelightToolProps) => {
  return (
    <ImageToolLayout
      toolId="relight"
      toolName="Relight"
      toolDescription="Change the lighting and mood of your image"
      creditCost={4}
      onBack={onBack}
      showPrompt
      promptLabel="Lighting style"
      promptPlaceholder="e.g., golden hour sunset, dramatic studio lighting, soft diffused light..."
      showIntensity
      intensityLabel="Lighting intensity"
    />
  );
};

export default RelightTool;
