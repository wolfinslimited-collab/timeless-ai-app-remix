import 'package:flutter/material.dart';
import '../audio_tool_layout.dart';

class VocalsToolScreen extends StatelessWidget {
  const VocalsToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AudioToolLayout(
      title: 'Voice Generator',
      description: 'Generate AI singing vocals from text descriptions',
      toolId: 'vocals',
      creditCost: 15,
      showAudioUpload: false,
      showPrompt: true,
      promptPlaceholder: "Describe the vocals (e.g., 'female soprano singing a lullaby', 'male baritone jazz')...",
      showDuration: true,
    );
  }
}
