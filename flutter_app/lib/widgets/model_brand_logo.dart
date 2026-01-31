import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/theme.dart';

/// Model logo configuration - supports both white icons and original colors
class LogoConfig {
  final String? assetPath; // Local asset path
  final String? networkUrl; // Network URL for logo
  final bool isSvg;
  final String? textLogo;
  final IconData? iconData; // Material icon fallback
  final bool useOriginalColor; // If true, don't apply white color filter

  const LogoConfig({
    this.assetPath,
    this.networkUrl,
    this.isSvg = false,
    this.textLogo,
    this.iconData,
    this.useOriginalColor = false,
  });
}

// Model configurations - all using white icons on black/dark background
final Map<String, LogoConfig> _modelConfigs = {
  // === IMAGE MODELS ===
  
  // Nano Banana (Lovable AI) - custom banana icon
  'nano-banana': const LogoConfig(assetPath: 'assets/logos/nano-banana.png'),
  'nano-banana-pro': const LogoConfig(assetPath: 'assets/logos/nano-banana.png'),
  'kie-nano-banana': const LogoConfig(assetPath: 'assets/logos/nano-banana.png'),

  // FLUX models (Black Forest Labs) - flux svg logo
  'flux-1.1-pro': const LogoConfig(assetPath: 'assets/logos/flux.svg', isSvg: true),
  'flux-pro': const LogoConfig(assetPath: 'assets/logos/flux.svg', isSvg: true),
  'flux-schnell': const LogoConfig(assetPath: 'assets/logos/flux.svg', isSvg: true),
  'flux-pro-ultra': const LogoConfig(assetPath: 'assets/logos/flux.svg', isSvg: true),
  'kie-flux-pro': const LogoConfig(assetPath: 'assets/logos/flux.svg', isSvg: true),
  'kie-flux-dev': const LogoConfig(assetPath: 'assets/logos/flux.svg', isSvg: true),
  'kie-flux-schnell': const LogoConfig(assetPath: 'assets/logos/flux.svg', isSvg: true),
  'kie-flux2-pro': const LogoConfig(assetPath: 'assets/logos/flux.svg', isSvg: true),
  'kie-flux-kontext-pro': const LogoConfig(assetPath: 'assets/logos/flux.svg', isSvg: true),
  'kie-flux-kontext-max': const LogoConfig(assetPath: 'assets/logos/flux.svg', isSvg: true),

  // Midjourney - sailboat logo
  'midjourney': const LogoConfig(assetPath: 'assets/logos/midjourney.webp'),
  'kie-midjourney': const LogoConfig(assetPath: 'assets/logos/midjourney.webp'),

  // Ideogram - custom icon
  'ideogram-v2': const LogoConfig(assetPath: 'assets/logos/ideogram.png'),
  'ideogram-v3': const LogoConfig(assetPath: 'assets/logos/ideogram.png'),
  'kie-ideogram-v3': const LogoConfig(assetPath: 'assets/logos/ideogram.png'),

  // Recraft - custom icon
  'recraft-v3': const LogoConfig(assetPath: 'assets/logos/recraft.png'),

  // Stable Diffusion - custom S. logo
  'sd-ultra': const LogoConfig(assetPath: 'assets/logos/stability.png'),
  'sd-3.5': const LogoConfig(assetPath: 'assets/logos/stability.png'),
  'stable-diffusion-3': const LogoConfig(assetPath: 'assets/logos/stability.png'),

  // Imagen (Google)
  'imagen-4': const LogoConfig(assetPath: 'assets/logos/google-gemini.svg', isSvg: true),
  'kie-imagen-4': const LogoConfig(assetPath: 'assets/logos/google-gemini.svg', isSvg: true),

  // Seedream
  'seedream': const LogoConfig(textLogo: 'S'),
  'kie-seedream-4': const LogoConfig(textLogo: 'S'),

  // Kling Image
  'kling-image': const LogoConfig(assetPath: 'assets/logos/kling.png'),
  'kie-kling-image': const LogoConfig(assetPath: 'assets/logos/kling.png'),

  // Grok Image (xAI)
  'grok-image': const LogoConfig(assetPath: 'assets/logos/x-logo.svg', isSvg: true),
  'kie-grok-imagine': const LogoConfig(assetPath: 'assets/logos/x-logo.svg', isSvg: true),

  // GPT-Image / OpenAI
  'gpt-image': const LogoConfig(assetPath: 'assets/logos/openai.svg', isSvg: true),
  'gpt-image-1.5': const LogoConfig(assetPath: 'assets/logos/openai.svg', isSvg: true),
  'kie-4o-image': const LogoConfig(assetPath: 'assets/logos/openai.svg', isSvg: true),

  // Qwen (Alibaba)
  'qwen-vl': const LogoConfig(textLogo: 'Q'),
  'kie-qwen-image': const LogoConfig(textLogo: 'Q'),

  // === VIDEO MODELS ===
  
  // Wan (Alibaba) - original purple color
  'wan': const LogoConfig(assetPath: 'assets/logos/wan.png', useOriginalColor: true),
  'wan-2.6': const LogoConfig(assetPath: 'assets/logos/wan.png', useOriginalColor: true),
  'wan-2.1': const LogoConfig(assetPath: 'assets/logos/wan.png', useOriginalColor: true),
  'kie-wan': const LogoConfig(assetPath: 'assets/logos/wan.png', useOriginalColor: true),

  // Hunyuan (Tencent) - original blue color
  'hunyuan': const LogoConfig(assetPath: 'assets/logos/hunyuan.png', useOriginalColor: true),
  'hunyuan-1.5': const LogoConfig(assetPath: 'assets/logos/hunyuan.png', useOriginalColor: true),
  'kie-hunyuan': const LogoConfig(assetPath: 'assets/logos/hunyuan.png', useOriginalColor: true),

  // Runway - original color (white logo)
  'runway': const LogoConfig(assetPath: 'assets/logos/runway.png'),
  'runway-gen4': const LogoConfig(assetPath: 'assets/logos/runway.png'),
  'kie-runway': const LogoConfig(assetPath: 'assets/logos/runway.png'),
  'kie-runway-i2v': const LogoConfig(assetPath: 'assets/logos/runway.png'),

  // Seedance - original blue color
  'seedance': const LogoConfig(assetPath: 'assets/logos/seedance.webp', useOriginalColor: true),
  'seedance-1.5': const LogoConfig(assetPath: 'assets/logos/seedance.webp', useOriginalColor: true),
  'kie-seedance': const LogoConfig(assetPath: 'assets/logos/seedance.webp', useOriginalColor: true),

  // Luma - original gradient color
  'luma': const LogoConfig(assetPath: 'assets/logos/luma.png', useOriginalColor: true),
  'luma-ray-2': const LogoConfig(assetPath: 'assets/logos/luma.png', useOriginalColor: true),
  'kie-luma': const LogoConfig(assetPath: 'assets/logos/luma.png', useOriginalColor: true),

  // Sora (OpenAI)
  'sora': const LogoConfig(assetPath: 'assets/logos/openai.svg', isSvg: true),
  'sora-2': const LogoConfig(assetPath: 'assets/logos/openai.svg', isSvg: true),
  'kie-sora2': const LogoConfig(assetPath: 'assets/logos/openai.svg', isSvg: true),
  'kie-sora2-pro': const LogoConfig(assetPath: 'assets/logos/openai.svg', isSvg: true),

  // Veo (Google)
  'veo-3': const LogoConfig(assetPath: 'assets/logos/google-gemini.svg', isSvg: true),
  'veo-3-fast': const LogoConfig(assetPath: 'assets/logos/google-gemini.svg', isSvg: true),
  'kie-veo31': const LogoConfig(assetPath: 'assets/logos/google-gemini.svg', isSvg: true),
  'kie-veo31-fast': const LogoConfig(assetPath: 'assets/logos/google-gemini.svg', isSvg: true),

  // Kling (Kuaishou)
  'kling': const LogoConfig(assetPath: 'assets/logos/kling.png'),
  'kling-2.6': const LogoConfig(assetPath: 'assets/logos/kling.png'),
  'kling-2.1': const LogoConfig(assetPath: 'assets/logos/kling.png'),
  'kie-kling': const LogoConfig(assetPath: 'assets/logos/kling.png'),

  // Hailuo (MiniMax)
  'hailuo': const LogoConfig(assetPath: 'assets/logos/hailuo.png'),
  'hailuo-02': const LogoConfig(assetPath: 'assets/logos/hailuo.png'),
  'kie-hailuo': const LogoConfig(assetPath: 'assets/logos/hailuo.png'),

  // === CHAT MODELS ===
  
  // Grok/xAI
  'grok-3': const LogoConfig(assetPath: 'assets/logos/x-logo.svg', isSvg: true),
  'grok-3-mini': const LogoConfig(assetPath: 'assets/logos/x-logo.svg', isSvg: true),

  // ChatGPT/OpenAI
  'chatgpt-5.2': const LogoConfig(assetPath: 'assets/logos/openai.svg', isSvg: true),
  'chatgpt-5': const LogoConfig(assetPath: 'assets/logos/openai.svg', isSvg: true),
  'chatgpt-5-mini': const LogoConfig(assetPath: 'assets/logos/openai.svg', isSvg: true),

  // Gemini (Google)
  'gemini-3-pro': const LogoConfig(assetPath: 'assets/logos/gemini.svg', isSvg: true),
  'gemini-3-flash': const LogoConfig(assetPath: 'assets/logos/gemini.svg', isSvg: true),
  'gemini-2.5-pro': const LogoConfig(assetPath: 'assets/logos/gemini.svg', isSvg: true),

  // DeepSeek
  'deepseek-r1': const LogoConfig(assetPath: 'assets/logos/deepseek.png'),
  'deepseek-v3': const LogoConfig(assetPath: 'assets/logos/deepseek.png'),

  // Llama (Meta)
  'llama-3.3': const LogoConfig(assetPath: 'assets/logos/meta-llama.svg', isSvg: true),
  'llama-3.3-large': const LogoConfig(assetPath: 'assets/logos/meta-llama.svg', isSvg: true),
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
    
    // Consistent dark background for all
    const bgColor = Color(0xFF1A1A1A);

    // Fallback for unknown models - white "AI" text
    if (config == null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
        child: Center(
          child: Icon(
            Icons.auto_awesome,
            color: Colors.white,
            size: iconSize,
          ),
        ),
      );
    }

    // Network image logo - white on black
    if (config.networkUrl != null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
        clipBehavior: Clip.antiAlias,
        child: Center(
          child: CachedNetworkImage(
            imageUrl: config.networkUrl!,
            width: iconSize,
            height: iconSize,
            fit: BoxFit.contain,
            color: Colors.white,
            colorBlendMode: BlendMode.srcIn,
            fadeInDuration: const Duration(milliseconds: 100),
            placeholder: (context, url) => _buildTextFallback(config, iconSize),
            errorWidget: (context, url, error) => _buildTextFallback(config, iconSize),
          ),
        ),
      );
    }

    // Local asset logo - conditional color filter
    if (config.assetPath != null) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
        clipBehavior: Clip.antiAlias,
        child: Center(
          child: config.isSvg
              ? SvgPicture.asset(
                  config.assetPath!,
                  width: iconSize,
                  height: iconSize,
                  colorFilter: config.useOriginalColor
                      ? null
                      : const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                )
              : config.useOriginalColor
                  ? Image.asset(
                      config.assetPath!,
                      width: iconSize,
                      height: iconSize,
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) =>
                          _buildTextFallback(config, iconSize),
                    )
                  : ColorFiltered(
                      colorFilter: const ColorFilter.mode(
                        Colors.white,
                        BlendMode.srcIn,
                      ),
                      child: Image.asset(
                        config.assetPath!,
                        width: iconSize,
                        height: iconSize,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) =>
                            _buildTextFallback(config, iconSize),
                      ),
                    ),
        ),
      );
    }

    // Text-based logo - white text on black
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: bgColor,
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
