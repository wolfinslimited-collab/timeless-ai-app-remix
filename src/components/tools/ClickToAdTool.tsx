import VideoToolLayout from "./VideoToolLayout";

const ClickToAdTool = () => {
  return (
    <VideoToolLayout
      title="Click to Ad"
      description="Turn product ideas into professional video ads"
      toolId="click-to-ad"
      creditCost={20}
      showVideoUpload={false}
      showImageUpload={true}
      showPrompt={true}
      promptPlaceholder="Describe the product and ad style..."
      showDuration={true}
    />
  );
};

export default ClickToAdTool;
