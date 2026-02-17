/// App configuration with Supabase credentials
class AppConfig {
  // Supabase Configuration - Original Timeless AI project
  static const String supabaseUrl = 'https://ifesxveahsbjhmrhkhhy.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXN4dmVhaHNiamhtcmhraGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODc4OTQsImV4cCI6MjA4NDQ2Mzg5NH0.uBRcVNQcTdJNk9gstOCW6xRcQsZ8pnQwy5IGxbhZD6g';

  // Credit Costs - Synced with web app
  static const Map<String, int> modelCredits = {
    // Image Models - Lovable AI
    'nano-banana': 4,

    // Image Models - Fal.ai
    'gpt-image-1.5': 10,
    'flux-1.1-pro': 5,
    'flux-pro-ultra': 8,
    'flux-dev': 3,
    'flux-schnell': 2,
    'ideogram-v2': 6,
    'stable-diffusion-3': 4,
    'sdxl': 3,
    'sdxl-lightning': 2,
    'recraft-v3': 5,
    'aura-flow': 4,
    'playground-v2.5': 4,

    // Video Models
    'wan-2.6': 15,
    'kling-2.6': 25,
    'veo-3': 30,
    'veo-3-fast': 20,
    'hailuo-02': 18,
    'seedance-1.5': 20,
    'luma': 22,
    'hunyuan-1.5': 18,

    // Music Models - Fal.ai
    'sonauto': 15,
    'cassetteai': 10,
    'lyria2': 12,
    'stable-audio': 8,

    // Cinema Studio Models
    'wan-2.6-cinema': 20,
    'kling-3.0-cinema': 30,
    'veo-3-cinema': 35,
    'luma-cinema': 28,

    // Chat Models
    'grok-3': 3,
    'grok-3-mini': 1,
    'chatgpt-5.2': 4,
    'chatgpt-5': 3,
    'chatgpt-5-mini': 1,
    'gemini-2.5-pro': 2,
    'gemini-3-pro': 3,
    'gemini-3-flash': 1,
    'deepseek-r1': 3,
    'deepseek-v3': 2,
    'llama-3.3': 1,
    'llama-3.3-large': 2,
  };

  // Available Models - Synced with web app MobileImageCreate
  static const List<Map<String, dynamic>> imageModels = [
    {'id': 'nano-banana', 'name': 'Nano Banana', 'credits': 4},
    {'id': 'flux-1.1-pro', 'name': 'FLUX Pro', 'credits': 5},
    {'id': 'ideogram-v2', 'name': 'Ideogram', 'credits': 6},
    {'id': 'gpt-image-1.5', 'name': 'GPT Image 1.5', 'credits': 10},
    {'id': 'flux-pro-ultra', 'name': 'FLUX Ultra', 'credits': 8},
  ];

  // Video Models - Synced with web app MobileVideoCreate
  static const List<Map<String, dynamic>> videoModels = [
    {'id': 'kling-2.6', 'name': 'Kling 2.1', 'credits': 25},
    {'id': 'wan-2.6', 'name': 'Wan 2.1', 'credits': 15},
    {'id': 'veo-3-fast', 'name': 'Veo 3', 'credits': 20},
    {'id': 'hailuo-02', 'name': 'Hailuo', 'credits': 18},
    {'id': 'luma', 'name': 'Luma', 'credits': 22},
  ];

  // Chat Models - Synced with web app (matching chat API and web UI order)
  static const List<Map<String, dynamic>> chatModels = [
    // Grok models
    {
      'id': 'grok-3',
      'name': 'Grok 3',
      'credits': 3,
      'icon': 'grok',
      'description': "xAI's most capable model",
      'badge': 'TOP',
      'supportsImages': true
    },
    {
      'id': 'grok-3-mini',
      'name': 'Grok 3 Mini',
      'credits': 2,
      'icon': 'grok',
      'description': 'Fast and efficient Grok',
      'badge': 'NEW',
      'supportsImages': false
    },
    // ChatGPT models
    {
      'id': 'chatgpt-5.2',
      'name': 'ChatGPT 5.2',
      'credits': 4,
      'icon': 'openai',
      'description': "OpenAI's latest reasoning",
      'badge': 'TOP',
      'supportsImages': true
    },
    {
      'id': 'chatgpt-5',
      'name': 'ChatGPT 5',
      'credits': 3,
      'icon': 'openai',
      'description': 'Powerful all-rounder',
      'badge': null,
      'supportsImages': true
    },
    {
      'id': 'chatgpt-5-mini',
      'name': 'GPT-5 Mini',
      'credits': 2,
      'icon': 'openai',
      'description': 'Fast and cost-effective',
      'badge': null,
      'supportsImages': false
    },
    // Gemini models
    {
      'id': 'gemini-3-pro',
      'name': 'Gemini 3 Pro',
      'credits': 3,
      'icon': 'gemini',
      'description': "Google's next-gen AI",
      'badge': 'NEW',
      'supportsImages': true
    },
    {
      'id': 'gemini-3-flash',
      'name': 'Gemini 3 Flash',
      'credits': 1,
      'icon': 'gemini',
      'description': 'Fast multimodal AI',
      'badge': null,
      'supportsImages': true
    },
    {
      'id': 'gemini-2.5-pro',
      'name': 'Gemini 2.5 Pro',
      'credits': 2,
      'icon': 'gemini',
      'description': 'Top-tier reasoning',
      'badge': null,
      'supportsImages': true
    },
    // DeepSeek models
    {
      'id': 'deepseek-r1',
      'name': 'DeepSeek R1',
      'credits': 3,
      'icon': 'deepseek',
      'description': 'Deep reasoning model',
      'badge': 'AI',
      'supportsImages': false
    },
    {
      'id': 'deepseek-v3',
      'name': 'DeepSeek V3',
      'credits': 2,
      'icon': 'deepseek',
      'description': 'Powerful open model',
      'badge': null,
      'supportsImages': false
    },
    // Llama models
    {
      'id': 'llama-3.3',
      'name': 'Llama 3.3',
      'credits': 1,
      'icon': 'meta',
      'description': "Meta's open AI model",
      'badge': null,
      'supportsImages': false
    },
    {
      'id': 'llama-3.3-large',
      'name': 'Llama 3.3 Large',
      'credits': 2,
      'icon': 'meta',
      'description': 'Extended capabilities',
      'badge': null,
      'supportsImages': false
    },
  ];

  // Vision-capable models
  static const List<String> visionModels = [
    'gemini-2.5-pro',
    'gemini-3-pro',
    'gemini-3-flash',
    'chatgpt-5.2',
    'chatgpt-5',
    'grok-3',
  ];

  static bool supportsVision(String modelId) {
    return visionModels.contains(modelId);
  }

  static const List<String> aspectRatios = [
    '1:1',
    '16:9',
    '9:16',
    '4:3',
    '3:4',
    '21:9',
  ];

  static const List<String> videoQualities = ['720p', '1080p'];

  // Quality Multipliers for video
  static const Map<String, double> qualityMultipliers = {
    '480p': 0.8,
    '720p': 1.0,
    '1080p': 1.5,
  };

  static int getModelCost(String model, {String? quality}) {
    int baseCost = modelCredits[model] ?? 5;
    double multiplier = 1.0;

    if (quality != null && qualityMultipliers.containsKey(quality)) {
      multiplier = qualityMultipliers[quality]!;
    }

    return (baseCost * multiplier).round();
  }
}
