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
      showIntensity
      intensityLabel="Retouching strength"
    />
  );
};

export default SkinEnhancerTool;
