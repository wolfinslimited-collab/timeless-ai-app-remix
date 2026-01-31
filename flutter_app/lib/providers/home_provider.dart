import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// Storage base URL for video assets - using DigitalOcean Spaces CDN
const String _storageBaseUrl =
    'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/featured';

// Featured item model matching Supabase table
class FeaturedItem {
  final String id;
  final String title;
  final String description;
  final String tag;
  final String videoUrl;
  final int displayOrder;
  final String? linkUrl;

  const FeaturedItem({
    required this.id,
    required this.title,
    required this.description,
    required this.tag,
    required this.videoUrl,
    required this.displayOrder,
    this.linkUrl,
  });

  factory FeaturedItem.fromJson(Map<String, dynamic> json) {
    // Convert relative video path to full URL
    String rawVideoUrl = json['video_url'] as String;
    String fullVideoUrl = rawVideoUrl;

    // If it's a relative path, prepend the storage base URL
    if (rawVideoUrl.startsWith('/')) {
      fullVideoUrl = '$_storageBaseUrl$rawVideoUrl';
    } else if (!rawVideoUrl.startsWith('http')) {
      fullVideoUrl = '$_storageBaseUrl/$rawVideoUrl';
    }

    return FeaturedItem(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      tag: json['tag'] as String,
      videoUrl: fullVideoUrl,
      displayOrder: json['display_order'] as int,
      linkUrl: json['link_url'] as String?,
    );
  }
}

/// Provider to manage home screen data with persistence across tab changes
class HomeProvider extends ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;

  List<FeaturedItem> _featuredItems = [];
  bool _isLoading = false;
  bool _hasLoaded = false;
  String? _error;

  // Getters
  List<FeaturedItem> get featuredItems => _featuredItems;
  bool get isLoading => _isLoading;
  bool get hasLoaded => _hasLoaded;
  String? get error => _error;

  // Manual mapping of titles to video URLs
  static final Map<String, String> _titleToVideoUrl = {
    'Cinema Studio':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/47f98df2-8f0d-4cf0-a32f-f582f3c0f90f-video11080.1080.mp4',
    'Video Upscale':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/25bd0bda-0068-47e9-a2c3-c51330245765-video21080.1080 - RESIZE - Videobolt.net.mp4',
    'Draw to Video':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/559a3bef-5733-4be4-b79b-324924945429-video31080.1080 - RESIZE - Videobolt.net.mp4',
    'Music Studio':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/33ee7581-6b7d-4d50-87d0-98acd87a53f3-video41080.1080 - RESIZE - Videobolt.net.mp4',
    'Change Angle':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/b1157a2e-6259-4af8-b909-85c28b4562c7-ChangeAngle-ezgif.com-resize-video.mp4',
    'Inpainting':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/09a58559-4b85-4053-ac90-42b30d151a5c-Inpainting-ezgif.com-resize-video.mp4',
    'Relight':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/07a011ff-ab2e-4e4f-adc4-8d42bf4bfd23-light-ezgif.com-resize-video.mp4',
    'Remove Background':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/a731fd6d-3262-4718-91d3-a0edc524310d-RemoveBackground-ezgif.com-resize-video.mp4',
    'Shots':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/c2ad8cb7-8bb3-43a4-92c2-09c83ae80b40-shot-ezgif.com-resize-video.mp4',
    'Skin Enhancer':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/faefb479-30b2-4b61-a1b8-49b7bfb4b35a-SkinEnhancer-ezgif.com-resize-video.mp4',
    'Upscale':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/02e516fd-e889-49fe-af14-043fc2c79521-Upscale-ezgif.com-resize-video.mp4',
    'Style Transfer':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/d49d2f58-acca-48f6-b890-2cf2443c4bba-style-transfer-preview-ezgif.com-resize-video.mp4',
    'Visual Styles':
        'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/d49d2f58-acca-48f6-b890-2cf2443c4bba-style-transfer-preview-ezgif.com-resize-video.mp4',
  };

  // Manual mapping of titles to routes
  static final Map<String, String> _titleToRoute = {
    'Relight': '/create/image?tool=relight',
    'Upscale': '/create/image?tool=upscale',
    'Shots': '/create/image?tool=shots',
    'Inpainting': '/create/image?tool=inpainting',
    'Change Angle': '/create/image?tool=angle',
    'Angle': '/create/image?tool=angle',
    'Skin Enhancer': '/create/image?tool=skin-enhancer',
    'Style Transfer': '/create/image?tool=style-transfer',
    'Visual Styles': '/create/image',
    'Remove Background': '/create/image?tool=background-remove',
    'Background Remove': '/create/image?tool=background-remove',
    'Video Upscale': '/create/video?tool=video-upscale',
    'Draw to Video': '/create/video?tool=draw-to-video',
    'Cinema Studio': '/cinema',
    'Music Studio': '/create/audio',
  };

  /// Load featured items - only fetches if not already loaded
  Future<void> loadFeaturedItems({bool forceRefresh = false}) async {
    // Skip if already loaded and not forcing refresh
    if (_hasLoaded && !forceRefresh) {
      return;
    }

    // Prevent multiple simultaneous loads
    if (_isLoading) {
      return;
    }

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _supabase
          .from('featured_items')
          .select('*')
          .eq('is_active', true)
          .order('display_order', ascending: true);

      final items = response as List;
      if (items.isNotEmpty) {
        _featuredItems = items.map((item) {
          // Override video_url and link_url based on title if mapping exists
          final title = item['title'] as String? ?? '';
          if (_titleToVideoUrl.containsKey(title)) {
            item['video_url'] = _titleToVideoUrl[title]!;
          }
          if (_titleToRoute.containsKey(title)) {
            item['link_url'] = _titleToRoute[title]!;
          }
          return FeaturedItem.fromJson(item);
        }).toList();
      } else {
        // Use fallback items if no data from DB
        _featuredItems = _getFallbackItems();
      }

      _hasLoaded = true;
      _error = null;
    } catch (e) {
      debugPrint('Error loading featured items: $e');
      // Use fallback items on error
      _featuredItems = _getFallbackItems();
      _hasLoaded = true;
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Force refresh data (for pull-to-refresh)
  Future<void> refresh() async {
    await loadFeaturedItems(forceRefresh: true);
  }

  /// Clear cached data (e.g., on logout)
  void clear() {
    _featuredItems = [];
    _hasLoaded = false;
    _error = null;
    notifyListeners();
  }

  // Fallback featured items matching web exactly
  List<FeaturedItem> _getFallbackItems() {
    const baseUrl = 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless';
    return [
      FeaturedItem(
        id: '1',
        title: 'Cinema Studio',
        description: 'Professional cinematic video creation with AI',
        tag: 'Featured',
        videoUrl: '$baseUrl/47f98df2-8f0d-4cf0-a32f-f582f3c0f90f-video11080.1080.mp4',
        displayOrder: 1,
        linkUrl: '/cinema',
      ),
      FeaturedItem(
        id: '2',
        title: 'Video Upscale',
        description: 'Enhance video quality up to 4K resolution',
        tag: 'Popular',
        videoUrl: '$baseUrl/25bd0bda-0068-47e9-a2c3-c51330245765-video21080.1080 - RESIZE - Videobolt.net.mp4',
        displayOrder: 2,
        linkUrl: '/create/video?tool=video-upscale',
      ),
      FeaturedItem(
        id: '3',
        title: 'Draw to Video',
        description: 'Transform sketches into animated videos',
        tag: 'New',
        videoUrl: '$baseUrl/559a3bef-5733-4be4-b79b-324924945429-video31080.1080 - RESIZE - Videobolt.net.mp4',
        displayOrder: 3,
        linkUrl: '/create/video?tool=draw-to-video',
      ),
      FeaturedItem(
        id: '4',
        title: 'Music Studio',
        description: 'AI-powered music creation and remixing',
        tag: 'Hot',
        videoUrl: '$baseUrl/33ee7581-6b7d-4d50-87d0-98acd87a53f3-video41080.1080 - RESIZE - Videobolt.net.mp4',
        displayOrder: 4,
        linkUrl: '/create/audio',
      ),
      FeaturedItem(
        id: '5',
        title: 'Visual Styles',
        description: 'Ultra-realistic fashion visuals with AI',
        tag: 'New',
        videoUrl: '$baseUrl/d49d2f58-acca-48f6-b890-2cf2443c4bba-style-transfer-preview-ezgif.com-resize-video.mp4',
        displayOrder: 5,
        linkUrl: '/create/image',
      ),
    ];
  }
}
