import AudioToolLayout from "./AudioToolLayout";

const VocalsTool = () => {
  return (
    <AudioToolLayout
      title="Voice Generator"
      description="Generate AI singing vocals from text descriptions"
      toolId="vocals"
      creditCost={15}
      showAudioUpload={false}
      showPrompt={true}
      promptPlaceholder="Describe the vocals (e.g., 'female soprano singing a lullaby', 'male baritone jazz')..."
      showDuration={true}
    />
  );
};

export default VocalsTool;
