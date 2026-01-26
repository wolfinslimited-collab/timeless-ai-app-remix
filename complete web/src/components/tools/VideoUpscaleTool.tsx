import VideoToolLayout from "./VideoToolLayout";

const VideoUpscaleTool = () => {
  return (
    <VideoToolLayout
      title="Video Upscale"
      description="Enhance video quality and resolution with AI upscaling"
      toolId="video-upscale"
      creditCost={8}
      showVideoUpload={true}
      showUpscaleFactor={true}
    />
  );
};

export default VideoUpscaleTool;
