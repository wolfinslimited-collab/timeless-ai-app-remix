import VideoToolLayout from "./VideoToolLayout";

const SoraTrendsTool = () => {
  return (
    <VideoToolLayout
      title="Sora 2 Trends"
      description="Turn ideas into viral videos with trending styles"
      toolId="sora-trends"
      creditCost={25}
      showVideoUpload={false}
      showPrompt={true}
      promptPlaceholder="Describe your viral video concept..."
      showDuration={true}
    />
  );
};

export default SoraTrendsTool;
