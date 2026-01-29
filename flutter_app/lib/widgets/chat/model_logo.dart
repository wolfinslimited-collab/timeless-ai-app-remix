import 'package:flutter/material.dart';
import '../../core/theme.dart';

/// Model configuration for mono-color letter icons
class ModelConfig {
  final String letter;
  final Color bgColor;

  const ModelConfig({
    required this.letter,
    required this.bgColor,
  });
}

// Model configurations with letter and color
final Map<String, ModelConfig> _modelConfigs = {
  // Grok/xAI models
  'grok-3': ModelConfig(letter: 'G', bgColor: AppTheme.secondary),
  'grok-3-mini': ModelConfig(letter: 'G', bgColor: AppTheme.secondary),

  // ChatGPT/OpenAI models - green like OpenAI branding
  'chatgpt-5.2': ModelConfig(letter: 'O', bgColor: const Color(0xFF16A34A)),
  'chatgpt-5': ModelConfig(letter: 'O', bgColor: const Color(0xFF16A34A)),
  'chatgpt-5-mini': ModelConfig(letter: 'O', bgColor: const Color(0xFF16A34A)),

  // Gemini models - blue like Google branding
  'gemini-3-pro': ModelConfig(letter: 'G', bgColor: const Color(0xFF3B82F6)),
  'gemini-3-flash': ModelConfig(letter: 'G', bgColor: const Color(0xFF3B82F6)),
  'gemini-2.5-pro': ModelConfig(letter: 'G', bgColor: const Color(0xFF3B82F6)),

  // DeepSeek models
  'deepseek-r1': ModelConfig(letter: 'D', bgColor: AppTheme.secondary),
  'deepseek-v3': ModelConfig(letter: 'D', bgColor: AppTheme.secondary),

  // Llama/Meta models
  'llama-3.3': ModelConfig(letter: 'L', bgColor: AppTheme.secondary),
  'llama-3.3-large': ModelConfig(letter: 'L', bgColor: AppTheme.secondary),
};

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
    final config = _modelConfigs[modelId];

    if (config == null) {
      // Fallback for unknown models
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(size / 2),
        ),
        child: Center(
          child: Text(
            'A',
            style: TextStyle(
              fontSize: size * 0.45,
              fontWeight: FontWeight.w600,
              color: AppTheme.foreground,
            ),
          ),
        ),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: config.bgColor,
        borderRadius: BorderRadius.circular(size / 2),
      ),
      child: Center(
        child: Text(
          config.letter,
          style: TextStyle(
            fontSize: size * 0.45,
            fontWeight: FontWeight.w600,
            color: AppTheme.foreground,
          ),
        ),
      ),
    );
  }
}

/// Get model letter for backwards compatibility
String getModelEmoji(String modelId) {
  const letterMap = {
    'grok-3': 'G',
    'grok-3-mini': 'G',
    'chatgpt-5.2': 'O',
    'chatgpt-5': 'O',
    'chatgpt-5-mini': 'O',
    'gemini-3-pro': 'G',
    'gemini-3-flash': 'G',
    'gemini-2.5-pro': 'G',
    'deepseek-r1': 'D',
    'deepseek-v3': 'D',
    'llama-3.3': 'L',
    'llama-3.3-large': 'L',
  };
  return letterMap[modelId] ?? 'A';
}
