import VideoToolLayout from "./VideoToolLayout";

const UGCFactoryTool = () => {
  return (
    <VideoToolLayout
      title="UGC Factory"
      description="Build authentic UGC-style videos with AI avatars"
      toolId="ugc-factory"
      creditCost={20}
      showVideoUpload={false}
      showPrompt={true}
      promptPlaceholder="Describe the UGC content (e.g., product review, testimonial)..."
      showDuration={true}
    />
  );
};

export default UGCFactoryTool;
