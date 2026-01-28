import 'package:flutter/material.dart';
import '../audio_tool_layout.dart';

class StemsToolScreen extends StatelessWidget {
  const StemsToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AudioToolLayout(
      title: 'Stem Separation',
      description: 'Separate audio into individual stems: vocals, drums, bass, and other instruments',
      toolId: 'stems',
      creditCost: 8,
      showAudioUpload: true,
      showPrompt: false,
      showDuration: true,
    );
  }
}
