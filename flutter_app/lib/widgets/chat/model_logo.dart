import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../core/theme.dart';

/// Model configuration for logos - matching web implementation
class ModelConfig {
  final String logoPath;
  final bool isSvg;
  final bool invert;

  const ModelConfig({
    required this.logoPath,
    this.isSvg = true,
    this.invert = false,
  });
}

// Model configurations matching web exactly
const Map<String, ModelConfig> _modelConfigs = {
  // Grok/xAI models - X logo
  'grok-3': ModelConfig(logoPath: 'assets/logos/x-logo.svg', invert: true),
  'grok-3-mini': ModelConfig(logoPath: 'assets/logos/x-logo.svg', invert: true),

  // ChatGPT/OpenAI models
  'chatgpt-5.2': ModelConfig(logoPath: 'assets/logos/openai.svg', invert: true),
  'chatgpt-5': ModelConfig(logoPath: 'assets/logos/openai.svg', invert: true),
  'chatgpt-5-mini': ModelConfig(logoPath: 'assets/logos/openai.svg', invert: true),

  // Gemini models
  'gemini-3-pro': ModelConfig(logoPath: 'assets/logos/gemini.svg', invert: false),
  'gemini-3-flash': ModelConfig(logoPath: 'assets/logos/gemini.svg', invert: false),
  'gemini-2.5-pro': ModelConfig(logoPath: 'assets/logos/gemini.svg', invert: false),

  // DeepSeek models
  'deepseek-r1': ModelConfig(logoPath: 'assets/logos/deepseek.png', isSvg: false, invert: false),
  'deepseek-v3': ModelConfig(logoPath: 'assets/logos/deepseek.png', isSvg: false, invert: false),

  // Llama/Meta models
  'llama-3.3': ModelConfig(logoPath: 'assets/logos/meta-llama.svg', invert: false),
  'llama-3.3-large': ModelConfig(logoPath: 'assets/logos/meta-llama.svg', invert: false),
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
          borderRadius: BorderRadius.circular(size / 4),
        ),
        child: Icon(
          Icons.smart_toy,
          size: size * 0.5,
          color: AppTheme.muted,
        ),
      );
    }

    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(size * 0.15),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(size / 4),
      ),
      child: config.isSvg
          ? SvgPicture.asset(
              config.logoPath,
              width: size * 0.6,
              height: size * 0.6,
              colorFilter: config.invert
                  ? const ColorFilter.mode(Colors.white70, BlendMode.srcIn)
                  : null,
            )
          : Image.asset(
              config.logoPath,
              width: size * 0.6,
              height: size * 0.6,
            ),
    );
  }
}

/// Get model emoji for backwards compatibility
String getModelEmoji(String modelId) {
  const emojiMap = {
    'grok-3': '𝕏',
    'grok-3-mini': '𝕏',
    'chatgpt-5.2': '◯',
    'chatgpt-5': '◯',
    'chatgpt-5-mini': '◯',
    'gemini-3-pro': '✦',
    'gemini-3-flash': '✦',
    'gemini-2.5-pro': '✦',
    'deepseek-r1': '🔍',
    'deepseek-v3': '🔍',
    'llama-3.3': '🦙',
    'llama-3.3-large': '🦙',
  };
  return emojiMap[modelId] ?? '◯';
}
