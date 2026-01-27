import 'package:flutter/material.dart';
import '../video_tool_layout.dart';

class LipSyncToolScreen extends StatelessWidget {
  const LipSyncToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const VideoToolLayout(
      title: 'Lipsync Studio',
      description: 'Sync audio to video with realistic lip movements',
      toolId: 'lip-sync',
      creditCost: 15,
      showVideoUpload: true,
      showAudioUpload: true,
    );
  }
}
