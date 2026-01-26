import VideoToolLayout from "./VideoToolLayout";

const SketchToVideoTool = () => {
  return (
    <VideoToolLayout
      title="Sketch to Video"
      description="Transform your sketches into animated videos with Sora 2"
      toolId="sketch-to-video"
      creditCost={18}
      showVideoUpload={false}
      showImageUpload={true}
      showPrompt={true}
      promptPlaceholder="Describe the animation and movement..."
      showDuration={true}
    />
  );
};

export default SketchToVideoTool;
