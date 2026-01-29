import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../core/theme.dart';

/// Model configuration with logo asset path
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

// Model configurations with actual logos
final Map<String, ModelConfig> _modelConfigs = {
  // Grok/xAI models - X logo
  'grok-3': const ModelConfig(logoPath: 'assets/logos/x-logo.svg', invert: true),
  'grok-3-mini': const ModelConfig(logoPath: 'assets/logos/x-logo.svg', invert: true),

  // ChatGPT/OpenAI models
  'chatgpt-5.2': const ModelConfig(logoPath: 'assets/logos/openai.svg', invert: true),
  'chatgpt-5': const ModelConfig(logoPath: 'assets/logos/openai.svg', invert: true),
  'chatgpt-5-mini': const ModelConfig(logoPath: 'assets/logos/openai.svg', invert: true),

  // Gemini models (has its own colors)
  'gemini-3-pro': const ModelConfig(logoPath: 'assets/logos/gemini.svg', invert: false),
  'gemini-3-flash': const ModelConfig(logoPath: 'assets/logos/gemini.svg', invert: false),
  'gemini-2.5-pro': const ModelConfig(logoPath: 'assets/logos/gemini.svg', invert: false),

  // DeepSeek models (PNG)
  'deepseek-r1': const ModelConfig(logoPath: 'assets/logos/deepseek.png', isSvg: false, invert: false),
  'deepseek-v3': const ModelConfig(logoPath: 'assets/logos/deepseek.png', isSvg: false, invert: false),

  // Llama/Meta models
  'llama-3.3': const ModelConfig(logoPath: 'assets/logos/meta-llama.svg', invert: true),
  'llama-3.3-large': const ModelConfig(logoPath: 'assets/logos/meta-llama.svg', invert: true),
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
    final iconSize = size * 0.6;

    if (config == null) {
      // Fallback for unknown models - use OpenAI logo
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(size / 3),
        ),
        child: Center(
          child: SvgPicture.asset(
            'assets/logos/openai.svg',
            width: iconSize,
            height: iconSize,
            colorFilter: const ColorFilter.mode(
              AppTheme.foreground,
              BlendMode.srcIn,
            ),
          ),
        ),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(size / 3),
      ),
      child: Center(
        child: config.isSvg
            ? SvgPicture.asset(
                config.logoPath,
                width: iconSize,
                height: iconSize,
                colorFilter: config.invert
                    ? const ColorFilter.mode(
                        AppTheme.foreground,
                        BlendMode.srcIn,
                      )
                    : null,
              )
            : ColorFiltered(
                colorFilter: config.invert
                    ? const ColorFilter.mode(
                        AppTheme.foreground,
                        BlendMode.srcIn,
                      )
                    : const ColorFilter.mode(
                        Colors.transparent,
                        BlendMode.dst,
                      ),
                child: Image.asset(
                  config.logoPath,
                  width: iconSize,
                  height: iconSize,
                  fit: BoxFit.contain,
                ),
              ),
      ),
    );
  }
}

/// Get model letter for backwards compatibility
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
