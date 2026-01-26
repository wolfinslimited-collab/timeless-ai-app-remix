import AudioToolLayout from "./AudioToolLayout";

const MasteringTool = () => {
  return (
    <AudioToolLayout
      title="AI Mastering"
      description="Professional-quality audio mastering with AI-powered EQ, compression, and loudness optimization"
      toolId="master"
      creditCost={6}
      showAudioUpload={true}
      showPrompt={false}
      showDuration={true}
    />
  );
};

export default MasteringTool;
