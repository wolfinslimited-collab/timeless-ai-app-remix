import 'package:flutter/material.dart';
import '../image_tool_layout.dart';

class UpscaleToolScreen extends StatelessWidget {
  const UpscaleToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolLayout(
      toolId: 'upscale',
      toolName: 'Upscale',
      toolDescription: 'Enhance image resolution up to 4x with AI-powered upscaling',
      creditCost: 3,
      previewVideoUrl: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/02e516fd-e889-49fe-af14-043fc2c79521-Upscale-ezgif.com-resize-video.mp4',
      showScale: true,
      showPrompt: true,
      promptLabel: 'Enhancement hints',
      promptPlaceholder: 'Optional: e.g., sharp details, high quality photograph...',
    );
  }
}
