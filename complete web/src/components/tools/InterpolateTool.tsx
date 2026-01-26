import VideoToolLayout from "./VideoToolLayout";

const InterpolateTool = () => {
  return (
    <VideoToolLayout
      title="Frame Interpolation"
      description="Smooth video frame rate with AI interpolation"
      toolId="interpolate"
      creditCost={6}
      showVideoUpload={true}
      showTargetFps={true}
    />
  );
};

export default InterpolateTool;
