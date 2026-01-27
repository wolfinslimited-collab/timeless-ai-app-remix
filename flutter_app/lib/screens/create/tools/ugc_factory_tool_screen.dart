import 'package:flutter/material.dart';
import '../video_tool_layout.dart';

class UGCFactoryToolScreen extends StatelessWidget {
  const UGCFactoryToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const VideoToolLayout(
      title: 'UGC Factory',
      description: 'Build authentic UGC-style videos with AI avatars',
      toolId: 'ugc-factory',
      creditCost: 20,
      showVideoUpload: false,
      showPrompt: true,
      promptPlaceholder: 'Describe the UGC content (e.g., product review, testimonial)...',
      showDuration: true,
    );
  }
}
