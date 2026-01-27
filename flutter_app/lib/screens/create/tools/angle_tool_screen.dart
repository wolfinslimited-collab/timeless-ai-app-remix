import 'package:flutter/material.dart';
import '../image_tool_layout.dart';

class AngleToolScreen extends StatelessWidget {
  const AngleToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolLayout(
      toolId: 'angle',
      toolName: 'Change Angle',
      toolDescription: 'View your image from different perspectives',
      creditCost: 4,
      previewVideoUrl: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/b1157a2e-6259-4af8-b909-85c28b4562c7-ChangeAngle-ezgif.com-resize-video.mp4',
      showPrompt: true,
      promptLabel: 'New perspective',
      promptPlaceholder: 'e.g., view from above, side angle, lower perspective, 3/4 view...',
    );
  }
}
