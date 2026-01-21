import AudioToolLayout from "./AudioToolLayout";

const AudioEnhanceTool = () => {
  return (
    <AudioToolLayout
      title="Audio Enhance"
      description="Clean up and enhance audio quality - remove noise, improve clarity, and restore audio"
      toolId="audio-enhance"
      creditCost={4}
      showAudioUpload={true}
      showPrompt={true}
      promptPlaceholder="Describe enhancements (e.g., 'remove background noise', 'boost bass', 'add reverb')..."
      showDuration={true}
    />
  );
};

export default AudioEnhanceTool;
