import 'package:flutter/material.dart';
import '../image_tool_layout.dart';

class StyleTransferToolScreen extends StatelessWidget {
  const StyleTransferToolScreen({super.key});

  static const _styleOptions = [
    StyleOption(id: 'oil-painting', label: 'Oil Painting'),
    StyleOption(id: 'watercolor', label: 'Watercolor'),
    StyleOption(id: 'anime', label: 'Anime'),
    StyleOption(id: 'sketch', label: 'Pencil Sketch'),
    StyleOption(id: 'pop-art', label: 'Pop Art'),
    StyleOption(id: 'impressionist', label: 'Impressionist'),
    StyleOption(id: 'cyberpunk', label: 'Cyberpunk'),
    StyleOption(id: 'pixel-art', label: 'Pixel Art'),
    StyleOption(id: 'studio-ghibli', label: 'Studio Ghibli'),
  ];

  @override
  Widget build(BuildContext context) {
    return const ImageToolLayout(
      toolId: 'style-transfer',
      toolName: 'Style Transfer',
      toolDescription: 'Apply artistic styles to your photos',
      creditCost: 4,
      previewVideoUrl: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/d49d2f58-acca-48f6-b890-2cf2443c4bba-style-transfer-preview-ezgif.com-resize-video.mp4',
      showStyleSelector: true,
      styleOptions: _styleOptions,
      showPrompt: true,
      promptLabel: 'Custom style (optional)',
      promptPlaceholder: 'Or describe your own style...',
    );
  }
}
