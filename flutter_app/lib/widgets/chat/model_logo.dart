import 'package:flutter/material.dart';
import '../../core/theme.dart';

class ModelLogo extends StatelessWidget {
  final String modelId;
  final double size;

  const ModelLogo({
    super.key,
    required this.modelId,
    this.size = 32,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: _getGradient(),
        borderRadius: BorderRadius.circular(size / 2),
      ),
      child: Center(
        child: Text(
          _getEmoji(),
          style: TextStyle(fontSize: size * 0.5),
        ),
      ),
    );
  }

  String _getEmoji() {
    switch (modelId) {
      case 'chatgpt-5.2':
      case 'chatgpt-5':
      case 'chatgpt-5-mini':
        return '🤖';
      case 'gemini-3-flash':
      case 'gemini-3-pro':
      case 'gemini-2.5-pro':
        return '✨';
      case 'grok-3':
      case 'grok-3-mini':
        return '🧠';
      case 'deepseek-r1':
      case 'deepseek-v3':
        return '🔍';
      case 'llama-3.3':
      case 'llama-3.3-large':
        return '🦙';
      default:
        return '💬';
    }
  }

  LinearGradient _getGradient() {
    switch (modelId) {
      case 'chatgpt-5.2':
      case 'chatgpt-5':
      case 'chatgpt-5-mini':
        return const LinearGradient(
          colors: [Color(0xFF10A37F), Color(0xFF1A7F64)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'gemini-3-flash':
      case 'gemini-3-pro':
      case 'gemini-2.5-pro':
        return const LinearGradient(
          colors: [Color(0xFF4285F4), Color(0xFF34A853), Color(0xFFFBBC04)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'grok-3':
      case 'grok-3-mini':
        return const LinearGradient(
          colors: [Color(0xFF1DA1F2), Color(0xFF0D47A1)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'deepseek-r1':
      case 'deepseek-v3':
        return const LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      case 'llama-3.3':
      case 'llama-3.3-large':
        return const LinearGradient(
          colors: [Color(0xFF7C3AED), Color(0xFFA855F7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
      default:
        return LinearGradient(
          colors: [AppTheme.primary, AppTheme.primary.withOpacity(0.7)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        );
    }
  }
}
