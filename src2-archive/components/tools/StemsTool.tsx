import AudioToolLayout from "./AudioToolLayout";

const StemsTool = () => {
  return (
    <AudioToolLayout
      title="Stem Separation"
      description="Separate audio into individual stems: vocals, drums, bass, and other instruments"
      toolId="stems"
      creditCost={8}
      showAudioUpload={true}
      showPrompt={false}
      showDuration={true}
    />
  );
};

export default StemsTool;
