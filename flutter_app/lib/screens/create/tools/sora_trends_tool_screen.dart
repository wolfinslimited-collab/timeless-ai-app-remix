import 'package:flutter/material.dart';
import '../video_tool_layout.dart';

class SoraTrendsToolScreen extends StatelessWidget {
  const SoraTrendsToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const VideoToolLayout(
      title: 'Sora 2 Trends',
      description: 'Turn ideas into viral videos with trending styles',
      toolId: 'sora-trends',
      creditCost: 25,
      showVideoUpload: false,
      showPrompt: true,
      promptPlaceholder: 'Describe your viral video concept...',
      showDuration: true,
    );
  }
}
