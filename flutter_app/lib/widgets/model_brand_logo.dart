import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/theme.dart';

/// Model logo configuration
class LogoConfig {
  final String? assetPath; // Local asset path
  final String? networkUrl; // Network URL for logo
  final bool isSvg;
  final bool invert;
  final String? textLogo;
  final List<Color>? gradientColors;
  final Color bgColor;

  const LogoConfig({
    this.assetPath,
    this.networkUrl,
    this.isSvg = false,
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
  'nano-banana': const LogoConfig(
    textLogo: '🍌',
    gradientColors: [Colors.amber, Colors.yellow],
  ),
  'nano-banana-pro': LogoConfig(
    textLogo: '🍌',
    gradientColors: [Colors.amber.shade700, Colors.orange],
  ),
  'kie-nano-banana': const LogoConfig(
    textLogo: '🍌',
    gradientColors: [Colors.amber, Colors.yellow],
  ),

  // FLUX models (Black Forest Labs)
  'flux-1.1-pro': const LogoConfig(
    networkUrl: 'https://framerusercontent.com/images/7a42qYSI6HQz0AhJF4xpJNRBU.png',
    bgColor: Color(0xFF000000),
  ),
  'flux-pro': const LogoConfig(
    networkUrl: 'https://framerusercontent.com/images/7a42qYSI6HQz0AhJF4xpJNRBU.png',
    bgColor: Color(0xFF000000),
  ),
  'flux-schnell': const LogoConfig(
    networkUrl: 'https://framerusercontent.com/images/7a42qYSI6HQz0AhJF4xpJNRBU.png',
    bgColor: Color(0xFF000000),
  ),
  'flux-pro-ultra': const LogoConfig(
    networkUrl: 'https://framerusercontent.com/images/7a42qYSI6HQz0AhJF4xpJNRBU.png',
    bgColor: Color(0xFF000000),
  ),
  'kie-flux-pro': const LogoConfig(
    networkUrl: 'https://framerusercontent.com/images/7a42qYSI6HQz0AhJF4xpJNRBU.png',
    bgColor: Color(0xFF000000),
  ),
  'kie-flux-dev': const LogoConfig(
    networkUrl: 'https://framerusercontent.com/images/7a42qYSI6HQz0AhJF4xpJNRBU.png',
    bgColor: Color(0xFF000000),
  ),
  'kie-flux-schnell': const LogoConfig(
    networkUrl: 'https://framerusercontent.com/images/7a42qYSI6HQz0AhJF4xpJNRBU.png',
    bgColor: Color(0xFF000000),
  ),
  'kie-flux2-pro': const LogoConfig(
    networkUrl: 'https://framerusercontent.com/images/7a42qYSI6HQz0AhJF4xpJNRBU.png',
    bgColor: Color(0xFF000000),
  ),
  'kie-flux-kontext-pro': const LogoConfig(
    networkUrl: 'https://framerusercontent.com/images/7a42qYSI6HQz0AhJF4xpJNRBU.png',
    bgColor: Color(0xFF000000),
  ),
  'kie-flux-kontext-max': const LogoConfig(
    networkUrl: 'https://framerusercontent.com/images/7a42qYSI6HQz0AhJF4xpJNRBU.png',
    bgColor: Color(0xFF000000),
  ),

  // Midjourney
  'midjourney': const LogoConfig(
    assetPath: 'assets/logos/midjourney.png',
    bgColor: Color(0xFF000000),
  ),
  'kie-midjourney': const LogoConfig(
    assetPath: 'assets/logos/midjourney.png',
    bgColor: Color(0xFF000000),
  ),

  // Ideogram
  'ideogram-v2': const LogoConfig(
    networkUrl: 'https://ideogram.ai/apple-touch-icon.png',
    bgColor: Color(0xFF1A1A2E),
  ),
  'ideogram-v3': const LogoConfig(
    networkUrl: 'https://ideogram.ai/apple-touch-icon.png',
    bgColor: Color(0xFF1A1A2E),
  ),
  'kie-ideogram-v3': const LogoConfig(
    networkUrl: 'https://ideogram.ai/apple-touch-icon.png',
    bgColor: Color(0xFF1A1A2E),
  ),

  // Recraft
  'recraft-v3': const LogoConfig(
    networkUrl: 'https://www.recraft.ai/images/icon-256x256.png',
    bgColor: Color(0xFF000000),
  ),

  // Stable Diffusion
  'sd-ultra': const LogoConfig(
    assetPath: 'assets/logos/stable-diffusion.png',
    bgColor: Color(0xFF5C2D91),
  ),
  'sd-3.5': const LogoConfig(
    assetPath: 'assets/logos/stable-diffusion.png',
    bgColor: Color(0xFF5C2D91),
  ),
  'stable-diffusion-3': const LogoConfig(
    assetPath: 'assets/logos/stable-diffusion.png',
    bgColor: Color(0xFF5C2D91),
  ),

  // Imagen (Google) - use Gemini logo
  'imagen-4': const LogoConfig(
    assetPath: 'assets/logos/google-gemini.svg',
    isSvg: true,
    bgColor: Color(0xFF1A237E),
  ),
  'kie-imagen-4': const LogoConfig(
    assetPath: 'assets/logos/google-gemini.svg',
    isSvg: true,
    bgColor: Color(0xFF1A237E),
  ),

  // Seedream
  'seedream': const LogoConfig(
    textLogo: 'S',
    gradientColors: [Color(0xFF00C853), Color(0xFF1DE9B6)],
  ),
  'kie-seedream-4': const LogoConfig(
    textLogo: 'S',
    gradientColors: [Color(0xFF00C853), Color(0xFF1DE9B6)],
  ),

  // Kling Image
  'kling-image': const LogoConfig(
    assetPath: 'assets/logos/kling.png',
    bgColor: Color(0xFF000000),
  ),
  'kie-kling-image': const LogoConfig(
    assetPath: 'assets/logos/kling.png',
    bgColor: Color(0xFF000000),
  ),

  // Grok Image (xAI)
  'grok-image': const LogoConfig(
    assetPath: 'assets/logos/x-logo.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),
  'kie-grok-imagine': const LogoConfig(
    assetPath: 'assets/logos/x-logo.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),

  // GPT-Image / OpenAI
  'gpt-image': const LogoConfig(
    assetPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: Color(0xFF10A37F),
  ),
  'gpt-image-1.5': const LogoConfig(
    assetPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: Color(0xFF10A37F),
  ),
  'kie-4o-image': const LogoConfig(
    assetPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: Color(0xFF10A37F),
  ),

  // Qwen (Alibaba)
  'qwen-vl': const LogoConfig(
    textLogo: '通',
    gradientColors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
  ),
  'kie-qwen-image': const LogoConfig(
    textLogo: '通',
    gradientColors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
  ),

  // === VIDEO MODELS ===
  
  // Runway
  'runway': const LogoConfig(
    assetPath: 'assets/logos/runway.png',
    bgColor: Color(0xFF000000),
  ),
  'runway-gen4': const LogoConfig(
    assetPath: 'assets/logos/runway.png',
    bgColor: Color(0xFF000000),
  ),
  'kie-runway': const LogoConfig(
    assetPath: 'assets/logos/runway.png',
    bgColor: Color(0xFF000000),
  ),
  'kie-runway-i2v': const LogoConfig(
    assetPath: 'assets/logos/runway.png',
    bgColor: Color(0xFF000000),
  ),

  // Sora (OpenAI)
  'sora': const LogoConfig(
    assetPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: Color(0xFF10A37F),
  ),
  'sora-2': const LogoConfig(
    assetPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: Color(0xFF10A37F),
  ),
  'kie-sora2': const LogoConfig(
    assetPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: Color(0xFF10A37F),
  ),
  'kie-sora2-pro': const LogoConfig(
    assetPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: Color(0xFF10A37F),
  ),

  // Veo (Google)
  'veo-3': const LogoConfig(
    assetPath: 'assets/logos/google-gemini.svg',
    isSvg: true,
    bgColor: Color(0xFF1A237E),
  ),
  'veo-3-fast': const LogoConfig(
    assetPath: 'assets/logos/google-gemini.svg',
    isSvg: true,
    bgColor: Color(0xFF1A237E),
  ),
  'kie-veo31': const LogoConfig(
    assetPath: 'assets/logos/google-gemini.svg',
    isSvg: true,
    bgColor: Color(0xFF1A237E),
  ),
  'kie-veo31-fast': const LogoConfig(
    assetPath: 'assets/logos/google-gemini.svg',
    isSvg: true,
    bgColor: Color(0xFF1A237E),
  ),

  // Kling (Kuaishou)
  'kling': const LogoConfig(
    assetPath: 'assets/logos/kling.png',
    bgColor: Color(0xFF000000),
  ),
  'kling-2.6': const LogoConfig(
    assetPath: 'assets/logos/kling.png',
    bgColor: Color(0xFF000000),
  ),
  'kling-2.1': const LogoConfig(
    assetPath: 'assets/logos/kling.png',
    bgColor: Color(0xFF000000),
  ),
  'kie-kling': const LogoConfig(
    assetPath: 'assets/logos/kling.png',
    bgColor: Color(0xFF000000),
  ),

  // Hailuo (MiniMax)
  'hailuo': const LogoConfig(
    assetPath: 'assets/logos/hailuo.png',
    bgColor: Color(0xFF00A8E8),
  ),
  'hailuo-02': const LogoConfig(
    assetPath: 'assets/logos/hailuo.png',
    bgColor: Color(0xFF00A8E8),
  ),
  'kie-hailuo': const LogoConfig(
    assetPath: 'assets/logos/hailuo.png',
    bgColor: Color(0xFF00A8E8),
  ),

  // Wan (Alibaba)
  'wan': const LogoConfig(
    networkUrl: 'https://wanx.aliyun.com/favicon.ico',
    bgColor: Color(0xFFFF6A00),
  ),
  'wan-2.6': const LogoConfig(
    networkUrl: 'https://wanx.aliyun.com/favicon.ico',
    bgColor: Color(0xFFFF6A00),
  ),
  'kie-wan': const LogoConfig(
    networkUrl: 'https://wanx.aliyun.com/favicon.ico',
    bgColor: Color(0xFFFF6A00),
  ),

  // Seedance
  'seedance': const LogoConfig(
    textLogo: 'SD',
    gradientColors: [Color(0xFF00E676), Color(0xFF00C853)],
  ),
  'seedance-1.5': const LogoConfig(
    textLogo: 'SD',
    gradientColors: [Color(0xFF00E676), Color(0xFF00C853)],
  ),

  // Luma
  'luma': const LogoConfig(
    assetPath: 'assets/logos/luma.png',
    bgColor: Color(0xFF4A1D96),
  ),
  'luma-ray-2': const LogoConfig(
    assetPath: 'assets/logos/luma.png',
    bgColor: Color(0xFF4A1D96),
  ),

  // Hunyuan (Tencent)
  'hunyuan': const LogoConfig(
    assetPath: 'assets/logos/hunyuan.png',
    bgColor: Color(0xFF12B7F5),
  ),
  'hunyuan-1.5': const LogoConfig(
    assetPath: 'assets/logos/hunyuan.png',
    bgColor: Color(0xFF12B7F5),
  ),

  // === CHAT MODELS ===
  
  // Grok/xAI
  'grok-3': const LogoConfig(
    assetPath: 'assets/logos/x-logo.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),
  'grok-3-mini': const LogoConfig(
    assetPath: 'assets/logos/x-logo.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),

  // ChatGPT/OpenAI
  'chatgpt-5.2': const LogoConfig(
    assetPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: Color(0xFF10A37F),
  ),
  'chatgpt-5': const LogoConfig(
    assetPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: Color(0xFF10A37F),
  ),
  'chatgpt-5-mini': const LogoConfig(
    assetPath: 'assets/logos/openai.svg',
    isSvg: true,
    invert: true,
    bgColor: Color(0xFF10A37F),
  ),

  // Gemini (Google)
  'gemini-3-pro': const LogoConfig(
    assetPath: 'assets/logos/gemini.svg',
    isSvg: true,
    bgColor: AppTheme.secondary,
  ),
  'gemini-3-flash': const LogoConfig(
    assetPath: 'assets/logos/gemini.svg',
    isSvg: true,
    bgColor: AppTheme.secondary,
  ),
  'gemini-2.5-pro': const LogoConfig(
    assetPath: 'assets/logos/gemini.svg',
    isSvg: true,
    bgColor: AppTheme.secondary,
  ),

  // DeepSeek
  'deepseek-r1': const LogoConfig(
    assetPath: 'assets/logos/deepseek.png',
    bgColor: Color(0xFF1A365D),
  ),
  'deepseek-v3': const LogoConfig(
    assetPath: 'assets/logos/deepseek.png',
    bgColor: Color(0xFF1A365D),
  ),

  // Llama (Meta)
  'llama-3.3': const LogoConfig(
    assetPath: 'assets/logos/meta-llama.svg',
    isSvg: true,
    invert: true,
    bgColor: AppTheme.secondary,
  ),
  'llama-3.3-large': const LogoConfig(
    assetPath: 'assets/logos/meta-llama.svg',
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
    final lowerCaseId = id.toLowerCase();
    for (final key in _modelConfigs.keys) {
      if (lowerCaseId.contains(key.toLowerCase()) ||
          key.toLowerCase().contains(lowerCaseId)) {
        return _modelConfigs[key];
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final config = _findConfig(modelId);
    final iconSize = size * 0.55;
    final borderRadius = size / 3;

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
          borderRadius: BorderRadius.circular(borderRadius),
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

    // Network image logo
    if (config.networkUrl != null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: config.bgColor,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
        clipBehavior: Clip.antiAlias,
        child: Center(
          child: CachedNetworkImage(
            imageUrl: config.networkUrl!,
            width: iconSize,
            height: iconSize,
            fit: BoxFit.contain,
            fadeInDuration: const Duration(milliseconds: 100),
            placeholder: (context, url) => _buildTextFallback(config, iconSize),
            errorWidget: (context, url, error) => _buildTextFallback(config, iconSize),
          ),
        ),
      );
    }

    // Local asset logo
    if (config.assetPath != null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: config.bgColor,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
        child: Center(
          child: config.isSvg
              ? SvgPicture.asset(
                  config.assetPath!,
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
                  config.assetPath!,
                  width: iconSize,
                  height: iconSize,
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) =>
                      _buildTextFallback(config, iconSize),
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
        borderRadius: BorderRadius.circular(borderRadius),
      ),
      child: Center(
        child: Text(
          config.textLogo ?? 'AI',
          style: TextStyle(
            color: Colors.white,
            fontSize: config.textLogo != null && config.textLogo!.length > 2
                ? size * 0.25
                : size * 0.35,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  Widget _buildTextFallback(LogoConfig config, double iconSize) {
    return Text(
      config.textLogo ?? 'AI',
      style: TextStyle(
        color: Colors.white,
        fontSize: iconSize * 0.6,
        fontWeight: FontWeight.bold,
      ),
    );
  }
}
