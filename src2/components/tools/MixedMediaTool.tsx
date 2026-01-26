import VideoToolLayout from "./VideoToolLayout";

const MixedMediaTool = () => {
  return (
    <VideoToolLayout
      title="Mixed Media"
      description="Create unique mixed media video projects"
      toolId="mixed-media"
      creditCost={15}
      showVideoUpload={false}
      showImageUpload={true}
      showPrompt={true}
      promptPlaceholder="Describe the mixed media style and content..."
      showDuration={true}
    />
  );
};

export default MixedMediaTool;
