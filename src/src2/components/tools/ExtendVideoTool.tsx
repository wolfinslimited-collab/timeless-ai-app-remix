import VideoToolLayout from "./VideoToolLayout";

const ExtendVideoTool = () => {
  return (
    <VideoToolLayout
      title="Extend Video"
      description="Extend your video with AI-generated continuation"
      toolId="extend"
      creditCost={12}
      showVideoUpload={true}
      showPrompt={true}
      promptPlaceholder="Describe how the scene should continue..."
      showDuration={true}
    />
  );
};

export default ExtendVideoTool;
