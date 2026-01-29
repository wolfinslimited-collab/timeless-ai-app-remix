import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../core/theme.dart';

/// Model logo configuration
class LogoConfig {
  final String? logoPath;
  final bool isSvg;
  final bool invert;
  final String? textLogo;
  final List<Color>? gradientColors;
  final Color bgColor;

  const LogoConfig({
    this.logoPath,
    this.isSvg = true,
    this.invert = false,
    this.textLogo,
    this.gradientColors,
    this.bgColor = const Color(0xFF1E1E1E),
  });
}

// Model configurations with actual logos and brand colors
final Map<String, LogoConfig> _modelConfigs = {
  // === IMAGE MODELS ===
  // Nano Banana (Lovable AI)
  'nano-banana': LogoConfig(
    textLogo: '🍌',
    gradientColors: [Colors.amber, Colors.yellow],
  ),
  'nano-banana-pro': LogoConfig(
    textLogo: '🍌',
    gradientColors: [Colors.amber.shade700, Colors.orange],
  ),

  // FLUX models (Black Forest Labs)
  'flux-1.1-pro': LogoConfig(
    textLogo: 'F',
    gradientColors: [Colors.deepPurple, Colors.purple],
  ),
  'flux-pro': LogoConfig(
    textLogo: 'F',
    gradientColors: [Colors.deepPurple, Colors.purple],
  ),
  'flux-schnell': LogoConfig(
    textLogo: 'F',
    gradientColors: [Colors.purple, Colors.purpleAccent],
  ),
  'flux-realism': LogoConfig(
    textLogo: 'F',
    gradientColors: [Colors.deepPurple.shade700, Colors.purple],
  ),

  // Ideogram
  'ideogram-v2': LogoConfig(
    textLogo: 'I',
    gradientColors: [Colors.pink, Colors.pinkAccent],
  ),
  'ideogram-v3': LogoConfig(
    textLogo: 'I',
    gradientColors: [Colors.pink.shade600, Colors.pink],
  ),

  // Midjourney
  'midjourney-v6': LogoConfig(
    textLogo: 'Mj',
    gradientColors: [Colors.blue, Colors.cyan],
  ),
  'midjourney': LogoConfig(
    textLogo: 'Mj',
    gradientColors: [Colors.blue, Colors.cyan],
  ),

  // Recraft
  'recraft-v3': LogoConfig(
    textLogo: 'R',
    gradientColors: [Colors.teal, Colors.green],
  ),

  // Stable Diffusion
  'sd-ultra': LogoConfig(
    textLogo: 'SD',
    gradientColors: [Colors.orange, Colors.deepOrange],
  ),
  'sd-3.5': LogoConfig(
    textLogo: 'SD',
    gradientColors: [Colors.orange, Colors.amber],
  ),

  // Imagen (Google) - use Gemini logo
  'imagen-4': const LogoConfig(
    logoPath: 'assets/logos/gemini.svg',
    isSvg: true,
    invert: false,
    bgColor: Color(0xFF1A237E),
  ),

  // Seedream
  'seedream-3': LogoConfig(
    textLogo: 'S',
    gradientColors: [Colors.lime, Colors.green],
  ),

  // Kling Image
  'kling-image': LogoConfig(
    textLogo: 'K',
    gradientColors: [Colors.lightBlue, Colors.blue],
  ),

  // Grok Image
  'grok-image': const LogoConfig(
    logoPath: 'assets/logos/x-logo.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),

  // GPT-Image
  'gpt-image': const LogoConfig(
    logoPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),

  // Qwen
  'qwen-vl': LogoConfig(
    textLogo: 'Q',
    gradientColors: [Colors.deepOrange, Colors.orange],
  ),

  // === VIDEO MODELS ===
  // Kling (Kuaishou)
  'kling-2.6': LogoConfig(
    textLogo: 'K',
    gradientColors: [Colors.lightBlue, Colors.blue],
  ),
  'kling-2.1': LogoConfig(
    textLogo: 'K',
    gradientColors: [Colors.lightBlue, Colors.blue],
  ),
  'kling-1.6': LogoConfig(
    textLogo: 'K',
    gradientColors: [Colors.lightBlue.shade300, Colors.blue.shade300],
  ),

  // Wan (Alibaba)
  'wan-2.6': LogoConfig(
    textLogo: 'W',
    gradientColors: [Colors.orange, Colors.deepOrange],
  ),
  'wan-2.1': LogoConfig(
    textLogo: 'W',
    gradientColors: [Colors.orange, Colors.deepOrange],
  ),

  // Veo (Google)
  'veo-3': const LogoConfig(
    logoPath: 'assets/logos/gemini.svg',
    isSvg: true,
    invert: false,
    bgColor: Color(0xFF1A237E),
  ),
  'veo-3-fast': const LogoConfig(
    logoPath: 'assets/logos/gemini.svg',
    isSvg: true,
    invert: false,
    bgColor: Color(0xFF1A237E),
  ),

  // Sora (OpenAI)
  'sora': const LogoConfig(
    logoPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),
  'sora-2': const LogoConfig(
    logoPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),

  // Luma
  'luma': LogoConfig(
    textLogo: 'L',
    gradientColors: [Colors.purple, Colors.deepPurple],
  ),
  'luma-ray-2': LogoConfig(
    textLogo: 'L',
    gradientColors: [Colors.purple.shade700, Colors.deepPurple.shade700],
  ),

  // Hailuo (MiniMax)
  'hailuo-02': LogoConfig(
    textLogo: 'H',
    gradientColors: [Colors.cyan, Colors.teal],
  ),
  'hailuo': LogoConfig(
    textLogo: 'H',
    gradientColors: [Colors.cyan, Colors.teal],
  ),

  // Runway
  'runway': LogoConfig(
    textLogo: 'R',
    gradientColors: [Colors.green, Colors.teal],
  ),
  'runway-gen4': LogoConfig(
    textLogo: 'R',
    gradientColors: [Colors.green.shade700, Colors.teal.shade700],
  ),

  // Seedance
  'seedance-1.5': LogoConfig(
    textLogo: 'S',
    gradientColors: [Colors.lime, Colors.green],
  ),

  // Hunyuan (Tencent)
  'hunyuan-1.5': LogoConfig(
    textLogo: '混',
    gradientColors: [Colors.blue.shade700, Colors.indigo],
  ),
  'hunyuan': LogoConfig(
    textLogo: '混',
    gradientColors: [Colors.blue.shade700, Colors.indigo],
  ),

  // === CHAT MODELS ===
  // Grok/xAI
  'grok-3': const LogoConfig(
    logoPath: 'assets/logos/x-logo.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),
  'grok-3-mini': const LogoConfig(
    logoPath: 'assets/logos/x-logo.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),

  // ChatGPT/OpenAI
  'chatgpt-5.2': const LogoConfig(
    logoPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),
  'chatgpt-5': const LogoConfig(
    logoPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),
  'chatgpt-5-mini': const LogoConfig(
    logoPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),

  // Gemini (Google)
  'gemini-3-pro': const LogoConfig(
    logoPath: 'assets/logos/gemini.svg',
    isSvg: true,
    invert: false,
    bgColor: AppTheme.secondary,
  ),
  'gemini-3-flash': const LogoConfig(
    logoPath: 'assets/logos/gemini.svg',
    isSvg: true,
    invert: false,
    bgColor: AppTheme.secondary,
  ),
  'gemini-2.5-pro': const LogoConfig(
    logoPath: 'assets/logos/gemini.svg',
    isSvg: true,
    invert: false,
    bgColor: AppTheme.secondary,
  ),

  // DeepSeek
  'deepseek-r1': const LogoConfig(
    logoPath: 'assets/logos/deepseek.png',
    isSvg: false,
    invert: false,
    bgColor: Color(0xFF1A365D),
  ),
  'deepseek-v3': const LogoConfig(
    logoPath: 'assets/logos/deepseek.png',
    isSvg: false,
    invert: false,
    bgColor: Color(0xFF1A365D),
  ),

  // Llama (Meta)
  'llama-3.3': const LogoConfig(
    logoPath: 'assets/logos/meta-llama.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),
  'llama-3.3-large': const LogoConfig(
    logoPath: 'assets/logos/meta-llama.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),
};

class ModelBrandLogo extends StatelessWidget {
  final String modelId;
  final double size;

  const ModelBrandLogo({
    super.key,
    required this.modelId,
    this.size = 44,
  });

  LogoConfig? _findConfig(String id) {
    // Exact match first
    if (_modelConfigs.containsKey(id)) {
      return _modelConfigs[id];
    }
    // Partial match for model families
    for (final key in _modelConfigs.keys) {
      if (id.toLowerCase().contains(key.toLowerCase()) ||
          key.toLowerCase().contains(id.toLowerCase())) {
        return _modelConfigs[key];
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final config = _findConfig(modelId);
    final iconSize = size * 0.55;

    // Fallback for unknown models
    if (config == null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppTheme.primary, Color(0xFF6366F1)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(size / 3),
        ),
        child: Center(
          child: Text(
            'AI',
            style: TextStyle(
              color: Colors.white,
              fontSize: size * 0.3,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      );
    }

    // If we have an actual logo file
    if (config.logoPath != null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: config.bgColor,
          borderRadius: BorderRadius.circular(size / 3),
        ),
        child: Center(
          child: config.isSvg
              ? SvgPicture.asset(
                  config.logoPath!,
                  width: iconSize,
                  height: iconSize,
                  colorFilter: config.invert
                      ? const ColorFilter.mode(
                          AppTheme.foreground,
                          BlendMode.srcIn,
                        )
                      : null,
                )
              : Image.asset(
                  config.logoPath!,
                  width: iconSize,
                  height: iconSize,
                  fit: BoxFit.contain,
                ),
        ),
      );
    }

    // Text-based logo with gradient
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: config.gradientColors != null
            ? LinearGradient(
                colors: config.gradientColors!,
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              )
            : null,
        color: config.gradientColors == null ? config.bgColor : null,
        borderRadius: BorderRadius.circular(size / 3),
      ),
      child: Center(
        child: Text(
          config.textLogo ?? 'AI',
          style: TextStyle(
            color: Colors.white,
            fontSize: config.textLogo != null && config.textLogo!.length > 1
                ? size * 0.28
                : size * 0.35,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
