import 'package:flutter/material.dart';
import '../video_tool_layout.dart';

class ClickToAdToolScreen extends StatelessWidget {
  const ClickToAdToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const VideoToolLayout(
      title: 'Click to Ad',
      description: 'Turn product ideas into professional video ads',
      toolId: 'click-to-ad',
      creditCost: 20,
      showVideoUpload: false,
      showImageUpload: true,
      showPrompt: true,
      promptPlaceholder: 'Describe the product and ad style...',
      showDuration: true,
    );
  }
}
