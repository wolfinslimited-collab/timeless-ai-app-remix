/// App configuration with Supabase credentials
class AppConfig {
  // Supabase Configuration
  static const String supabaseUrl = 'https://ifesxveahsbjhmrhkhhy.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXN4dmVhaHNiamhtcmhraGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODc4OTQsImV4cCI6MjA4NDQ2Mzg5NH0.uBRcVNQcTdJNk9gstOCW6xRcQsZ8pnQwy5IGxbhZD6g';

  // Stripe Configuration
  static const String stripePublishableKey = 'YOUR_STRIPE_PUBLISHABLE_KEY';

  // Credit Costs
  static const Map<String, int> modelCredits = {
    // Image Models
    'nano-banana-pro': 2,
    'flux-1.1-pro': 5,
    'flux-pro-ultra': 8,
    'gpt-image-1.5': 10,
    'ideogram-v2': 6,
    // Video Models
    'wan-2.6': 15,
    'kling-2.6': 22,
    'veo-3': 30,
    'sora-2-pro': 35,
    'hailuo-02': 18,
    'luma': 20,
    // Chat Models
    'grok-3': 3,
    'chatgpt-5.2': 4,
    'gemini-2.5-pro': 3,
    'deepseek-r1': 2,
    'llama-3.3': 1,
  };

  // Available Models
  static const List<Map<String, dynamic>> imageModels = [
    {'id': 'flux-1.1-pro', 'name': 'Flux 1.1 Pro', 'credits': 5},
    {'id': 'nano-banana-pro', 'name': 'Nano Banana Pro', 'credits': 2},
    {'id': 'gpt-image-1.5', 'name': 'GPT Image 1.5', 'credits': 10},
    {'id': 'flux-pro-ultra', 'name': 'Flux Pro Ultra', 'credits': 8},
    {'id': 'ideogram-v2', 'name': 'Ideogram v2', 'credits': 6},
  ];

  static const List<Map<String, dynamic>> videoModels = [
    {'id': 'wan-2.6', 'name': 'Wan 2.6', 'credits': 15},
    {'id': 'kling-2.6', 'name': 'Kling 2.6', 'credits': 22},
    {'id': 'veo-3', 'name': 'Veo 3', 'credits': 30},
    {'id': 'sora-2-pro', 'name': 'Sora 2 Pro', 'credits': 35},
    {'id': 'hailuo-02', 'name': 'Hailuo 02', 'credits': 18},
    {'id': 'luma', 'name': 'Luma', 'credits': 20},
  ];

  static const List<Map<String, dynamic>> chatModels = [
    {'id': 'grok-3', 'name': 'Grok 3', 'credits': 3, 'icon': 'grok'},
    {'id': 'chatgpt-5.2', 'name': 'ChatGPT 5.2', 'credits': 4, 'icon': 'openai'},
    {'id': 'gemini-2.5-pro', 'name': 'Gemini 2.5 Pro', 'credits': 3, 'icon': 'gemini'},
    {'id': 'deepseek-r1', 'name': 'DeepSeek R1', 'credits': 2, 'icon': 'deepseek'},
    {'id': 'llama-3.3', 'name': 'Llama 3.3', 'credits': 1, 'icon': 'meta'},
  ];

  static const List<String> aspectRatios = [
    '1:1',
    '16:9',
    '9:16',
    '4:3',
    '3:4',
    '21:9',
  ];

  static const List<String> videoQualities = ['480p', '720p', '1080p'];
}
