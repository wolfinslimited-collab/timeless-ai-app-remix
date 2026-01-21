import ImageToolLayout from "./ImageToolLayout";

interface StyleTransferToolProps {
  onBack: () => void;
}

const styleOptions = [
  { id: "oil-painting", label: "Oil Painting" },
  { id: "watercolor", label: "Watercolor" },
  { id: "anime", label: "Anime" },
  { id: "sketch", label: "Pencil Sketch" },
  { id: "pop-art", label: "Pop Art" },
  { id: "impressionist", label: "Impressionist" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "pixel-art", label: "Pixel Art" },
  { id: "studio-ghibli", label: "Studio Ghibli" },
];

const StyleTransferTool = ({ onBack }: StyleTransferToolProps) => {
  return (
    <ImageToolLayout
      toolId="style-transfer"
      toolName="Style Transfer"
      toolDescription="Apply artistic styles to your images"
      creditCost={4}
      onBack={onBack}
      showStyleSelector
      styleOptions={styleOptions}
      showPrompt
      promptLabel="Custom style (optional)"
      promptPlaceholder="Or describe your own style..."
    />
  );
};

export default StyleTransferTool;
