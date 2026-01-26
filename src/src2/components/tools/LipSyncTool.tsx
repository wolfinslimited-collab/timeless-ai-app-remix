import VideoToolLayout from "./VideoToolLayout";

const LipSyncTool = () => {
  return (
    <VideoToolLayout
      title="Lipsync Studio"
      description="Sync audio to video with realistic lip movements"
      toolId="lip-sync"
      creditCost={15}
      showVideoUpload={true}
      showAudioUpload={true}
    />
  );
};

export default LipSyncTool;
