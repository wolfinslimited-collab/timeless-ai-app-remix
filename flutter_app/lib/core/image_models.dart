/// Image model definitions matching web app
class ImageModels {
  // Credit costs for image models
  static const Map<String, int> credits = {
    // Economy tier (Kie.ai)
    'kie-4o-image': 4,
    'kie-nano-banana': 3,
    'kie-midjourney': 5,
    'kie-flux-kontext-pro': 5,
    'kie-flux-kontext-max': 6,
    'kie-flux2-pro': 5,
    'kie-flux-pro': 4,
    'kie-flux-dev': 3,
    'kie-flux-schnell': 2,
    'kie-ideogram-v3': 5,
    'kie-imagen-4': 5,
    'kie-grok-imagine': 5,
    'kie-kling-image': 4,
    'kie-qwen-image': 4,
    'kie-seedream-4': 4,
    
    // HQ tier (Fal.ai / Lovable)
    'flux-1.1-pro': 5,
    'nano-banana': 4,
    'gpt-image-1.5': 10,
    'ideogram-v2': 6,
    'flux-pro-ultra': 8,
    'recraft-v3': 5,
    'stable-diffusion-3': 4,
  };

  static int getCredits(String modelId) {
    return credits[modelId] ?? 5;
  }

  // All image models with full metadata
  static final List<Map<String, dynamic>> allModels = [
    // Economy tier (Kie.ai)
    {
      'id': 'kie-4o-image',
      'name': 'GPT-4o Image',
      'description': 'Fast creative images',
      'badge': 'FAST',
      'credits': getCredits('kie-4o-image'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-nano-banana',
      'name': 'Nano Banana',
      'description': 'Quick stylized images',
      'badge': 'HOT',
      'credits': getCredits('kie-nano-banana'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-midjourney',
      'name': 'Midjourney v6',
      'description': 'Artistic and creative',
      'badge': 'HOT',
      'credits': getCredits('kie-midjourney'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-flux-kontext-pro',
      'name': 'Flux Kontext Pro',
      'description': 'Advanced context',
      'badge': 'NEW',
      'credits': getCredits('kie-flux-kontext-pro'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-flux-kontext-max',
      'name': 'Flux Kontext Max',
      'description': 'Maximum detail',
      'badge': '',
      'credits': getCredits('kie-flux-kontext-max'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-flux2-pro',
      'name': 'Flux 2 Pro',
      'description': 'Latest Flux model',
      'badge': 'NEW',
      'credits': getCredits('kie-flux2-pro'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-flux-pro',
      'name': 'Flux Pro',
      'description': 'Professional quality',
      'badge': '',
      'credits': getCredits('kie-flux-pro'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-flux-dev',
      'name': 'Flux Dev',
      'description': 'Development model',
      'badge': '',
      'credits': getCredits('kie-flux-dev'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-flux-schnell',
      'name': 'Flux Schnell',
      'description': 'Ultra fast',
      'badge': 'FAST',
      'credits': getCredits('kie-flux-schnell'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-ideogram-v3',
      'name': 'Ideogram v3',
      'description': 'Text in images',
      'badge': '',
      'credits': getCredits('kie-ideogram-v3'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-imagen-4',
      'name': 'Imagen 4',
      'description': "Google's latest",
      'badge': 'NEW',
      'credits': getCredits('kie-imagen-4'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-grok-imagine',
      'name': 'Grok Imagine',
      'description': 'xAI image model',
      'badge': '',
      'credits': getCredits('kie-grok-imagine'),
      'provider': 'kie',
      'tier': 'economy',
      'disabled': true,
    },
    {
      'id': 'kie-kling-image',
      'name': 'Kling Image',
      'description': 'Detailed renders',
      'badge': '',
      'credits': getCredits('kie-kling-image'),
      'provider': 'kie',
      'tier': 'economy',
      'disabled': true,
    },
    {
      'id': 'kie-qwen-image',
      'name': 'Qwen Image',
      'description': 'Alibaba model',
      'badge': '',
      'credits': getCredits('kie-qwen-image'),
      'provider': 'kie',
      'tier': 'economy',
      'disabled': true,
    },
    {
      'id': 'kie-seedream-4',
      'name': 'Seedream 4',
      'description': 'Creative dreams',
      'badge': '',
      'credits': getCredits('kie-seedream-4'),
      'provider': 'kie',
      'tier': 'economy',
      'disabled': true,
    },

    // HQ tier (Fal.ai / Lovable)
    {
      'id': 'flux-1.1-pro',
      'name': 'Flux 1.1 Pro',
      'description': 'Premium quality',
      'badge': 'TOP',
      'credits': getCredits('flux-1.1-pro'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'nano-banana',
      'name': 'Nano Banana',
      'description': 'Fast multimodal',
      'badge': 'HOT',
      'credits': getCredits('nano-banana'),
      'provider': 'lovable',
      'tier': 'hq',
    },
    {
      'id': 'gpt-image-1.5',
      'name': 'GPT Image 1.5',
      'description': "OpenAI's best",
      'badge': 'TOP',
      'credits': getCredits('gpt-image-1.5'),
      'provider': 'lovable',
      'tier': 'hq',
    },
    {
      'id': 'ideogram-v2',
      'name': 'Ideogram v2',
      'description': 'Great for text',
      'badge': '',
      'credits': getCredits('ideogram-v2'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'flux-pro-ultra',
      'name': 'Flux Pro Ultra',
      'description': '4K outputs',
      'badge': 'NEW',
      'credits': getCredits('flux-pro-ultra'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'recraft-v3',
      'name': 'Recraft v3',
      'description': 'Design focused',
      'badge': '',
      'credits': getCredits('recraft-v3'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'stable-diffusion-3',
      'name': 'SD 3.5',
      'description': 'Open source power',
      'badge': '',
      'credits': getCredits('stable-diffusion-3'),
      'provider': 'fal',
      'tier': 'hq',
    },
  ];

  // Quality options
  static const Map<String, Map<String, String>> qualityOptions = {
    '1024': {
      'id': '1024',
      'name': 'Standard',
      'description': 'Fast generation, good for previews',
    },
    '2K': {
      'id': '2K',
      'name': 'High',
      'description': 'Sharp details, ideal for sharing',
    },
    '4K': {
      'id': '4K',
      'name': 'Ultra',
      'description': 'Maximum quality for prints & large displays',
    },
  };

  // Model-specific quality options
  static const Map<String, List<String>> modelQualityOptions = {
    'nano-banana': ['1024', '2K', '4K'],
    'flux-1.1-pro': ['1024', '2K'],
    'gpt-image-1.5': ['1024', '2K'],
    'ideogram-v2': ['1024', '2K'],
    'flux-pro-ultra': ['2K', '4K'],
    'kie-midjourney': ['1024', '2K', '4K'],
  };

  static const List<String> defaultQualityOptions = ['1024', '2K'];

  static List<String> getQualityOptionsForModel(String modelId) {
    return modelQualityOptions[modelId] ?? defaultQualityOptions;
  }

  // Aspect ratios
  static const List<String> aspectRatios = [
    '1:1',
    '16:9',
    '9:16',
    '4:3',
    '3:4',
    '21:9',
  ];

  // Style presets
  static final List<Map<String, dynamic>> stylePresets = [
    {
      'id': 'cinematic',
      'name': 'Cinematic',
      'description': 'Film-like quality with dramatic lighting',
      'icon': 'movie_creation',
      'prompt': 'cinematic lighting, film grain, dramatic shadows, 35mm',
    },
    {
      'id': 'portrait',
      'name': 'Portrait',
      'description': 'Professional portrait photography',
      'icon': 'person',
      'prompt': 'portrait photography, soft lighting, bokeh, 85mm lens',
    },
    {
      'id': 'fantasy',
      'name': 'Fantasy',
      'description': 'Magical and ethereal atmosphere',
      'icon': 'auto_fix_high',
      'prompt': 'fantasy art, magical lighting, ethereal, dreamlike',
    },
    {
      'id': 'anime',
      'name': 'Anime',
      'description': 'Japanese animation style',
      'icon': 'tv',
      'prompt': 'anime style, vibrant colors, detailed, studio quality',
    },
    {
      'id': 'photorealistic',
      'name': 'Photorealistic',
      'description': 'Ultra-realistic photography',
      'icon': 'camera_alt',
      'prompt': 'photorealistic, 8K, ultra detailed, professional photography',
    },
    {
      'id': 'oil-painting',
      'name': 'Oil Painting',
      'description': 'Classic oil painting style',
      'icon': 'palette',
      'prompt': 'oil painting, textured brushstrokes, classical art, masterpiece',
    },
  ];
}
