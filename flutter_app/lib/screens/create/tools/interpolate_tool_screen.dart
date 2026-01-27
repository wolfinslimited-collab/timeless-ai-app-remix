import 'package:flutter/material.dart';
import '../video_tool_layout.dart';

class InterpolateToolScreen extends StatelessWidget {
  const InterpolateToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const VideoToolLayout(
      title: 'Frame Interpolation',
      description: 'Smooth video frame rate with AI interpolation',
      toolId: 'interpolate',
      creditCost: 6,
      showVideoUpload: true,
      showTargetFps: true,
    );
  }
}
