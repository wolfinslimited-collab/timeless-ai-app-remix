import 'package:flutter/material.dart';
import '../video_tool_layout.dart';

class ExtendVideoToolScreen extends StatelessWidget {
  const ExtendVideoToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const VideoToolLayout(
      title: 'Extend Video',
      description: 'Extend your video with AI-generated continuation',
      toolId: 'extend',
      creditCost: 12,
      showVideoUpload: true,
      showPrompt: true,
      promptPlaceholder: 'Describe how the scene should continue...',
      showDuration: true,
    );
  }
}
