import 'package:flutter/material.dart';
import '../video_tool_layout.dart';

class MixedMediaToolScreen extends StatelessWidget {
  const MixedMediaToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const VideoToolLayout(
      title: 'Mixed Media',
      description: 'Create unique mixed media video projects',
      toolId: 'mixed-media',
      creditCost: 15,
      showVideoUpload: false,
      showImageUpload: true,
      showPrompt: true,
      promptPlaceholder: 'Describe the mixed media style and content...',
      showDuration: true,
    );
  }
}
