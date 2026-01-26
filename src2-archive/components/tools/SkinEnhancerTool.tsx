import ImageToolLayout from "./ImageToolLayout";

interface SkinEnhancerToolProps {
  onBack: () => void;
}

const SkinEnhancerTool = ({ onBack }: SkinEnhancerToolProps) => {
  return (
    <ImageToolLayout
      toolId="skin-enhancer"
      toolName="Skin Enhancer"
      toolDescription="Professional portrait retouching - smooth skin, reduce blemishes"
      creditCost={3}
      onBack={onBack}
      previewVideo="/videos/skin-enhancer-preview.mp4"
      showIntensity
      intensityLabel="Retouching strength"
    />
  );
};

export default SkinEnhancerTool;
