import 'package:flutter/material.dart';
import '../video_tool_layout.dart';

class SketchToVideoToolScreen extends StatelessWidget {
  const SketchToVideoToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const VideoToolLayout(
      title: 'Sketch to Video',
      description: 'Transform your sketches into animated videos',
      toolId: 'sketch-to-video',
      creditCost: 18,
      showVideoUpload: false,
      showImageUpload: true,
      showPrompt: true,
      promptPlaceholder: 'Describe the animation and movement...',
      showDuration: true,
    );
  }
}
