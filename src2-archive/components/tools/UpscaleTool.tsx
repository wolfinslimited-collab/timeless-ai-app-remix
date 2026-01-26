import ImageToolLayout from "./ImageToolLayout";

interface UpscaleToolProps {
  onBack: () => void;
}

const UpscaleTool = ({ onBack }: UpscaleToolProps) => {
  return (
    <ImageToolLayout
      toolId="upscale"
      toolName="Upscale"
      toolDescription="Enhance image resolution up to 4x with AI-powered upscaling"
      creditCost={3}
      onBack={onBack}
      previewVideo="/videos/upscale-preview.mp4"
      showScale
      showPrompt
      promptLabel="Enhancement hints"
      promptPlaceholder="e.g., sharp details, high quality photograph..."
    />
  );
};

export default UpscaleTool;
