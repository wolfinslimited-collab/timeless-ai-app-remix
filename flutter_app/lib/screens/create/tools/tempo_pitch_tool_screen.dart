import 'package:flutter/material.dart';
import '../audio_tool_layout.dart';

class TempoPitchToolScreen extends StatelessWidget {
  const TempoPitchToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AudioToolLayout(
      title: 'Tempo & Pitch',
      description: 'Adjust the speed and pitch of your audio without affecting quality',
      toolId: 'tempo-pitch',
      creditCost: 3,
      showAudioUpload: true,
      showPrompt: false,
      showDuration: true,
      showTempo: true,
      showPitch: true,
    );
  }
}
