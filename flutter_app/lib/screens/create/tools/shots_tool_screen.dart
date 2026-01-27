import 'package:flutter/material.dart';
import '../image_tool_layout.dart';

class ShotsToolScreen extends StatelessWidget {
  const ShotsToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolLayout(
      toolId: 'shots',
      toolName: 'Shots',
      toolDescription: 'Generate multiple angles and variations from a single image',
      creditCost: 10,
      previewVideoUrl: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/c2ad8cb7-8bb3-43a4-92c2-09c83ae80b40-shot-ezgif.com-resize-video.mp4',
    );
  }
}
