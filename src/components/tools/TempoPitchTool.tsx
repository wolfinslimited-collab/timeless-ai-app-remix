import AudioToolLayout from "./AudioToolLayout";

const TempoPitchTool = () => {
  return (
    <AudioToolLayout
      title="Tempo & Pitch"
      description="Adjust the speed and pitch of your audio without affecting quality"
      toolId="tempo-pitch"
      creditCost={3}
      showAudioUpload={true}
      showPrompt={false}
      showDuration={true}
      showTempo={true}
      showPitch={true}
    />
  );
};

export default TempoPitchTool;
