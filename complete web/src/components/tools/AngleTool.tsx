import ImageToolLayout from "./ImageToolLayout";

interface AngleToolProps {
  onBack: () => void;
}

const AngleTool = ({ onBack }: AngleToolProps) => {
  return (
    <ImageToolLayout
      toolId="angle"
      toolName="Change Angle"
      toolDescription="View your image from a different perspective or angle"
      creditCost={4}
      onBack={onBack}
      previewVideo="/videos/angle-preview.mp4"
      showPrompt
      promptLabel="New perspective"
      promptPlaceholder="e.g., view from above, side angle, lower perspective, 3/4 view..."
    />
  );
};

export default AngleTool;
