import 'package:flutter/material.dart';
import '../video_tool_layout.dart';

class DrawToVideoToolScreen extends StatelessWidget {
  const DrawToVideoToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const VideoToolLayout(
      title: 'Draw to Video',
      description: 'Turn your drawings into cinematic video',
      toolId: 'draw-to-video',
      creditCost: 18,
      showVideoUpload: false,
      showImageUpload: true,
      showPrompt: true,
      promptPlaceholder: 'Describe how your drawing should come to life...',
      showDuration: true,
    );
  }
}
