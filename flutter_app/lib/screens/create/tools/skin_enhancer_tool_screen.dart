import 'package:flutter/material.dart';
import '../image_tool_layout.dart';

class SkinEnhancerToolScreen extends StatelessWidget {
  const SkinEnhancerToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolLayout(
      toolId: 'skin-enhancer',
      toolName: 'Skin Enhancer',
      toolDescription: 'Professional portrait retouching - smooth skin, reduce blemishes',
      creditCost: 3,
      previewVideoUrl: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/faefb479-30b2-4b61-a1b8-49b7bfb4b35a-SkinEnhancer-ezgif.com-resize-video.mp4',
      showIntensity: true,
      intensityLabel: 'Retouching strength',
    );
  }
}
