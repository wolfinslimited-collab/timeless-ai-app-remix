import 'package:flutter/material.dart';
import '../image_tool_layout.dart';

class RelightToolScreen extends StatelessWidget {
  const RelightToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolLayout(
      toolId: 'relight',
      toolName: 'Relight',
      toolDescription: 'AI-powered relighting for professional photo results',
      creditCost: 2,
      previewVideoUrl: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/07a011ff-ab2e-4e4f-adc4-8d42bf4bfd23-light-ezgif.com-resize-video.mp4',
      showPrompt: true,
      promptLabel: 'Lighting style',
      promptPlaceholder: 'e.g., soft natural light, dramatic shadows, studio lighting...',
      showIntensity: true,
      intensityLabel: 'Brightness',
    );
  }
}
