import 'package:flutter/material.dart';
import '../image_tool_layout.dart';

class BackgroundRemoveToolScreen extends StatelessWidget {
  const BackgroundRemoveToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolLayout(
      toolId: 'background-remove',
      toolName: 'Remove Background',
      toolDescription: 'Instantly remove backgrounds from any image',
      creditCost: 2,
      previewVideoUrl: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/a731fd6d-3262-4718-91d3-a0edc524310d-RemoveBackground-ezgif.com-resize-video.mp4',
    );
  }
}
