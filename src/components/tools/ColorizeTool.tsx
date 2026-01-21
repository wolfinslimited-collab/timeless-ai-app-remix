import ImageToolLayout from "./ImageToolLayout";

interface ColorizeToolProps {
  onBack: () => void;
}

const ColorizeTool = ({ onBack }: ColorizeToolProps) => {
  return (
    <ImageToolLayout
      toolId="colorize"
      toolName="Colorize"
      toolDescription="Add realistic colors to black & white photos"
      creditCost={3}
      onBack={onBack}
      showPrompt
      promptLabel="Color hints"
      promptPlaceholder="e.g., 1950s American colors, warm vintage tones, natural realistic..."
    />
  );
};

export default ColorizeTool;
