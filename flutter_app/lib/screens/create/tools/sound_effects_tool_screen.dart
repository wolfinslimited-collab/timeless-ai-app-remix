import 'package:flutter/material.dart';
import '../audio_tool_layout.dart';
import '../../../core/theme.dart';

class SoundEffectsToolScreen extends StatelessWidget {
  const SoundEffectsToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AudioToolLayout(
      title: 'Sound Effects',
      description: 'Generate sound effects from text descriptions',
      toolId: 'sound-effects',
      creditCost: 5,
      showAudioUpload: false,
      showPrompt: true,
      promptPlaceholder: "Describe the sound effect (e.g., 'explosion', 'footsteps on gravel', 'sci-fi laser')...",
      showDuration: true,
      additionalControls: _buildTipsSection(),
    );
  }

  Widget _buildTipsSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tips for better results:',
            style: TextStyle(
              color: AppTheme.muted,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          _buildTipItem('Be specific about the sound source'),
          _buildTipItem('Describe the environment (indoor, outdoor, underwater)'),
          _buildTipItem('Mention intensity (soft, loud, explosive)'),
          _buildTipItem('Include material sounds (metal, wood, glass)'),
        ],
      ),
    );
  }

  Widget _buildTipItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '• ',
            style: TextStyle(color: AppTheme.muted, fontSize: 12),
          ),
          Expanded(
            child: Text(
              text,
              style: TextStyle(color: AppTheme.muted, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
