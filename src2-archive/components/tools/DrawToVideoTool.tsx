import VideoToolLayout from "./VideoToolLayout";

const DrawToVideoTool = () => {
  return (
    <VideoToolLayout
      title="Draw to Video"
      description="Turn your drawings into cinematic video"
      toolId="draw-to-video"
      creditCost={18}
      showVideoUpload={false}
      showImageUpload={true}
      showPrompt={true}
      promptPlaceholder="Describe how your drawing should come to life..."
      showDuration={true}
    />
  );
};

export default DrawToVideoTool;
