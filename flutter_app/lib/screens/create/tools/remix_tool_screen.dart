import 'package:flutter/material.dart';
import '../audio_tool_layout.dart';

class RemixToolScreen extends StatelessWidget {
  const RemixToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AudioToolLayout(
      title: 'AI Remix',
      description: 'Create unique AI-powered remixes and variations of your tracks',
      toolId: 'remix',
      creditCost: 12,
      showAudioUpload: true,
      showPrompt: true,
      promptPlaceholder: "Describe the remix style (e.g., 'EDM drop version', 'acoustic cover')...",
      showDuration: true,
    );
  }
}
