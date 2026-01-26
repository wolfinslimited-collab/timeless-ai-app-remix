import AudioToolLayout from "./AudioToolLayout";

const RemixTool = () => {
  return (
    <AudioToolLayout
      title="AI Remix"
      description="Create unique AI-powered remixes and variations of your tracks"
      toolId="remix"
      creditCost={12}
      showAudioUpload={true}
      showPrompt={true}
      promptPlaceholder="Describe the remix style (e.g., 'EDM drop version', 'acoustic cover')..."
      showDuration={true}
    />
  );
};

export default RemixTool;
