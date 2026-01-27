import 'package:flutter/material.dart';
import '../image_tool_layout.dart';

class InpaintingToolScreen extends StatelessWidget {
  const InpaintingToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolLayout(
      toolId: 'inpainting',
      toolName: 'Inpainting',
      toolDescription: 'Edit and replace parts of your images seamlessly',
      creditCost: 5,
      previewVideoUrl: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/09a58559-4b85-4053-ac90-42b30d151a5c-Inpainting-ezgif.com-resize-video.mp4',
      showPrompt: true,
      promptLabel: 'What to generate',
      promptPlaceholder: 'Describe what should appear in the masked area...',
    );
  }
}
