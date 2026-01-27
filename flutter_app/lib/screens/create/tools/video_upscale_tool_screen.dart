import 'package:flutter/material.dart';
import '../video_tool_layout.dart';

class VideoUpscaleToolScreen extends StatelessWidget {
  const VideoUpscaleToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const VideoToolLayout(
      title: 'Video Upscale',
      description: 'Enhance video quality and resolution with AI upscaling',
      toolId: 'video-upscale',
      creditCost: 8,
      showVideoUpload: true,
      showUpscaleFactor: true,
    );
  }
}
