import 'package:flutter/material.dart';
import '../audio_tool_layout.dart';

class AudioEnhanceToolScreen extends StatelessWidget {
  const AudioEnhanceToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AudioToolLayout(
      title: 'Audio Enhance',
      description: 'Clean up and enhance audio quality - remove noise, improve clarity, and restore audio',
      toolId: 'audio-enhance',
      creditCost: 4,
      showAudioUpload: true,
      showPrompt: true,
      promptPlaceholder: "Describe enhancements (e.g., 'remove background noise', 'boost bass', 'add reverb')...",
      showDuration: true,
    );
  }
}
