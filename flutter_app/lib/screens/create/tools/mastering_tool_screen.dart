import 'package:flutter/material.dart';
import '../audio_tool_layout.dart';

class MasteringToolScreen extends StatelessWidget {
  const MasteringToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const AudioToolLayout(
      title: 'AI Mastering',
      description: 'Professional-quality audio mastering with AI-powered EQ, compression, and loudness optimization',
      toolId: 'master',
      creditCost: 6,
      showAudioUpload: true,
      showPrompt: false,
      showDuration: true,
    );
  }
}
