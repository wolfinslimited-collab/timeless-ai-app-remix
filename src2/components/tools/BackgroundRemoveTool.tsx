import ImageToolLayout from "./ImageToolLayout";

interface BackgroundRemoveToolProps {
  onBack: () => void;
}

const BackgroundRemoveTool = ({ onBack }: BackgroundRemoveToolProps) => {
  return (
    <ImageToolLayout
      toolId="background-remove"
      toolName="Remove Background"
      toolDescription="Automatically remove the background from any image"
      creditCost={2}
      onBack={onBack}
      previewVideo="/videos/background-remove-preview.mp4"
    />
  );
};

export default BackgroundRemoveTool;
