/// Video model definitions matching web app
class VideoModels {
  // Credit costs for video models
  static const Map<String, int> credits = {
    // Economy tier (Kie.ai)
    'kie-runway': 8,
    'kie-runway-i2v': 10,
    'kie-sora2': 12,
    'kie-sora2-pro': 18,
    'kie-veo31': 12,
    'kie-veo31-fast': 10,
    'kie-kling': 12,
    'kie-hailuo': 10,
    'kie-hailuo-2.3': 15,
    'kie-wan': 8,
    'kie-grok': 15,

    // HQ tier (Fal.ai)
    'wan-2.6': 15,
    'kling-2.6': 25,
    'kling-3.0': 40,
    'seedance-pro': 22,
    'veo-3': 30,
    'veo-3-fast': 20,
    'hailuo-02': 18,
    'seedance-1.5': 20,
    'luma': 22,
    'hunyuan-1.5': 18,
  };

  static int getCredits(String modelId) {
    return credits[modelId] ?? 15;
  }

  // All video models with full metadata
  static final List<Map<String, dynamic>> allModels = [
    // === ECONOMY TIER (Kie.ai Marketplace) ===
    {
      'id': 'kie-kling',
      'name': 'Kling 2.1',
      'description': 'Kuaishou video AI',
      'badge': 'HOT',
      'credits': getCredits('kie-kling'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-veo31',
      'name': 'Veo 3.1',
      'description': 'Google latest video',
      'badge': null,
      'credits': getCredits('kie-veo31'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-grok',
      'name': 'Grok Imagine',
      'description': 'X.AI video gen',
      'badge': null,
      'credits': getCredits('kie-grok'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-sora2',
      'name': 'Sora 2',
      'description': 'OpenAI video gen',
      'badge': 'HOT',
      'credits': getCredits('kie-sora2'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-sora2-pro',
      'name': 'Sora 2 Pro',
      'description': 'OpenAI best quality',
      'badge': null,
      'credits': getCredits('kie-sora2-pro'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-hailuo',
      'name': 'Hailuo',
      'description': 'MiniMax video',
      'badge': null,
      'credits': getCredits('kie-hailuo'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-hailuo-2.3',
      'name': 'Hailuo 2.3',
      'description': 'MiniMax latest',
      'badge': 'NEW',
      'credits': getCredits('kie-hailuo-2.3'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-wan',
      'name': 'Wan 2.2',
      'description': 'Alibaba video AI',
      'badge': null,
      'credits': getCredits('kie-wan'),
      'provider': 'kie',
      'tier': 'economy',
    },
    {
      'id': 'kie-runway',
      'name': 'Runway Gen',
      'description': 'Kie.ai video gen',
      'badge': null,
      'credits': getCredits('kie-runway'),
      'provider': 'kie',
      'tier': 'economy',
    },

    // === HIGH QUALITY TIER (Fal.ai) ===
    {
      'id': 'kling-2.6',
      'name': 'Kling 2.6 Pro',
      'description': 'Cinematic with audio',
      'badge': 'TOP',
      'credits': getCredits('kling-2.6'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'kling-3.0',
      'name': 'Kling 3.0',
      'description': 'Latest with native audio',
      'badge': 'TOP',
      'credits': getCredits('kling-3.0'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'seedance-pro',
      'name': 'Seedance Pro',
      'description': 'ByteDance high quality',
      'badge': null,
      'credits': getCredits('seedance-pro'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'wan-2.6',
      'name': 'Wan 2.6',
      'description': 'Latest Alibaba model',
      'badge': 'HOT',
      'credits': getCredits('wan-2.6'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'veo-3',
      'name': 'Veo 3',
      'description': "Google's best with audio",
      'badge': 'HOT',
      'credits': getCredits('veo-3'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'veo-3-fast',
      'name': 'Veo 3 Fast',
      'description': 'Faster Veo 3',
      'badge': 'PRO',
      'credits': getCredits('veo-3-fast'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'luma',
      'name': 'Luma Dream Machine',
      'description': 'Creative video',
      'badge': 'HOT',
      'credits': getCredits('luma'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'hailuo-02',
      'name': 'Hailuo-02',
      'description': 'MiniMax video model',
      'badge': 'NEW',
      'credits': getCredits('hailuo-02'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'seedance-1.5',
      'name': 'Seedance 1.5',
      'description': 'With audio support',
      'badge': 'NEW',
      'credits': getCredits('seedance-1.5'),
      'provider': 'fal',
      'tier': 'hq',
    },
    {
      'id': 'hunyuan-1.5',
      'name': 'Hunyuan 1.5',
      'description': 'Tencent video model',
      'badge': 'NEW',
      'credits': getCredits('hunyuan-1.5'),
      'provider': 'fal',
      'tier': 'hq',
    },
  ];

  // Aspect ratios
  static const List<String> aspectRatios = [
    '16:9',
    '9:16',
    '1:1',
    '4:3',
    '3:4',
    '21:9',
  ];

  // Quality options
  static const List<String> qualities = ['480p', '720p', '1080p'];

  // Duration options (in seconds)
  static const List<int> durations = [3, 5, 7, 10];

  // Quality display names
  static const Map<String, String> qualityNames = {
    '480p': 'SD',
    '720p': 'HD',
    '1080p': 'Full HD',
  };
}
