import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/credits_provider.dart';
import '../../providers/generation_provider.dart';
import '../../widgets/common/credit_badge.dart';
import '../../widgets/common/smart_media_image.dart';
import '../../widgets/common/cached_video_player.dart';
import '../../models/generation_model.dart';

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

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<FeaturedItem> _featuredItems = [];
  bool _loadingFeatured = true;

  @override
  void initState() {
    super.initState();
    _loadRecentGenerations();
    _loadFeaturedItems();
  }

  Future<void> _loadFeaturedItems() async {
    try {
      // Manual mapping of titles to video URLs
      final Map<String, String> titleToVideoUrl = {
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

      // Manual mapping of titles to routes (toolbox screen + selected tool via ?tool=)
      final Map<String, String> titleToRoute = {
        // Image tools -> ImageCreateScreen with tool selected
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
        // Video tools -> VideoCreateScreen with tool selected
        'Video Upscale': '/create/video?tool=video-upscale',
        'Draw to Video': '/create/video?tool=draw-to-video',
        'Cinema Studio': '/cinema',
        'Music Studio': '/create/audio',
      };

      final response = await Supabase.instance.client
          .from('featured_items')
          .select('*')
          .eq('is_active', true)
          .order('display_order', ascending: true);

      if (mounted) {
        final items = response as List;
        if (items.isNotEmpty) {
          setState(() {
            _featuredItems = items.map((item) {
              // Override video_url and link_url based on title if mapping exists
              final title = item['title'] as String? ?? '';
              if (titleToVideoUrl.containsKey(title)) {
                item['video_url'] = titleToVideoUrl[title]!;
              }
              if (titleToRoute.containsKey(title)) {
                item['link_url'] = titleToRoute[title]!;
              }
              return FeaturedItem.fromJson(item);
            }).toList();
            _loadingFeatured = false;
          });
        } else {
          // Use fallback items if no data from DB
          setState(() {
            _featuredItems = _getFallbackItems();
            _loadingFeatured = false;
          });
        }
      }
    } catch (e) {
      // Use fallback items on error (matching web)
      if (mounted) {
        setState(() {
          _featuredItems = _getFallbackItems();
          _loadingFeatured = false;
        });
      }
    }
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

  Future<void> _loadRecentGenerations() async {
    final provider = context.read<GenerationProvider>();
    await provider.loadGenerations(limit: 4);
  }

  Future<void> _handleRefresh() async {
    await Future.wait([
      _loadRecentGenerations(),
      _loadFeaturedItems(),
    ]);
    if (mounted) {
      context.read<CreditsProvider>().refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Timeless AI',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        actions: [
          CreditBadge(
            onTap: () => context.go('/pricing'),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _handleRefresh,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with subtitle
              const Text(
                'Create anything with AI',
                style: TextStyle(
                  color: AppTheme.muted,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 24),

              // Quick Actions - 4 column grid
              const Text(
                'Quick Actions',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _QuickAction(
                    icon: Icons.image,
                    label: 'Image',
                    color: const Color(0xFF3B82F6),
                    onTap: () => context.go('/create/image'),
                  ),
                  _QuickAction(
                    icon: Icons.videocam,
                    label: 'Video',
                    color: AppTheme.primary,
                    onTap: () => context.go('/create/video'),
                  ),
                  _QuickAction(
                    icon: Icons.music_note,
                    label: 'Music',
                    color: const Color(0xFFEC4899),
                    onTap: () => context.go('/create/audio'),
                  ),
                  _QuickAction(
                    icon: Icons.movie_creation,
                    label: 'Cinema',
                    color: const Color(0xFFF59E0B),
                    onTap: () => context.go('/cinema'),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Pro Banner
              Consumer<CreditsProvider>(
                builder: (context, credits, child) {
                  if (credits.hasActiveSubscription) {
                    return const SizedBox.shrink();
                  }
                  return GestureDetector(
                    onTap: () => context.push('/upgrade-wizard', extra: true),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppTheme.primary, Color(0xFFEC4899)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Icon(Icons.all_inclusive,
                                color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Upgrade to Pro',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                                Text(
                                  'Unlimited generations & more',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Icon(Icons.chevron_right, color: Colors.white),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 24),

              // Trending Section
              const Text(
                'Trending',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              _TrendingGrid(
                items: _featuredItems,
                isLoading: _loadingFeatured,
              ),
              const SizedBox(height: 24),

              // Visual Styles Banner
              GestureDetector(
                onTap: () => context.go('/create/visual-styles'),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFF472B6), Color(0xFFA855F7)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.brush, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Text(
                                  'Visual Styles',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.3),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text(
                                    'NEW',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Ultra-realistic fashion visuals with AI styling',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: Colors.white),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Apps Section
              const Text(
                'Apps',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              const _AppsSection(),
            ],
          ),
        ),
      ),
    );
  }
}

class _TrendingGrid extends StatelessWidget {
  final List<FeaturedItem> items;
  final bool isLoading;

  const _TrendingGrid({
    required this.items,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.75,
        ),
        itemCount: 4,
        itemBuilder: (context, index) {
          return Container(
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppTheme.primary,
              ),
            ),
          );
        },
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.75,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        return _TrendingTile(item: items[index]);
      },
    );
  }
}

class _TrendingTile extends StatelessWidget {
  final FeaturedItem item;

  const _TrendingTile({required this.item});

  void _handleTap(BuildContext context) {
    final linkUrl = item.linkUrl;
    if (linkUrl != null && linkUrl.isNotEmpty) {
      // linkUrl is from titleToRoute: /create/image?tool=..., /create/video?tool=..., /cinema, /create/audio
      if (linkUrl.startsWith('/')) {
        GoRouter.of(context).go(linkUrl);
      } else if (linkUrl.contains('/create?type=cinema')) {
        GoRouter.of(context).go('/cinema');
      } else if (linkUrl.contains('/create?type=music')) {
        GoRouter.of(context).go('/create/audio');
      } else {
        GoRouter.of(context).go('/apps');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _handleTap(context),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Cached Video Player
                  CachedVideoPlayer(
                    videoUrl: item.videoUrl,
                    autoPlay: true,
                    looping: true,
                    muted: true,
                    fit: BoxFit.cover,
                  ),
                  // Badge
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        item.tag,
                        style: const TextStyle(
                          color: Color(0xFF374151),
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            item.title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            item.description,
            style: const TextStyle(
              color: AppTheme.muted,
              fontSize: 10,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

// App data model
class _AppItem {
  final String id;
  final String name;
  final String description;
  final String iconAsset;
  final String buttonText;

  const _AppItem({
    required this.id,
    required this.name,
    required this.description,
    required this.iconAsset,
    required this.buttonText,
  });
}

const _appItems = [
  _AppItem(
    id: 'brain-ai',
    name: 'Brain AI',
    description: 'Memory & brain games.',
    iconAsset: 'assets/icons/brain-ai.png',
    buttonText: 'Try now',
  ),
  _AppItem(
    id: 'skin-ai',
    name: 'Skin AI',
    description: 'Face scan for skin.',
    iconAsset: 'assets/icons/skin-ai.png',
    buttonText: 'Analyze',
  ),
  // _AppItem(
  //   id: 'blood-ai',
  //   name: 'Blood AI',
  //   description: 'Blood test insights.',
  //   iconAsset: 'assets/icons/blood-ai.png',
  //   buttonText: 'Test',
  // ),
  _AppItem(
    id: 'sleep-ai',
    name: 'Sleep AI',
    description: 'Personal sleep advice.',
    iconAsset: 'assets/icons/sleep-ai.png',
    buttonText: 'Start',
  ),
  _AppItem(
    id: 'calorie-ai',
    name: 'Calorie AI',
    description: 'Count calories by photo.',
    iconAsset: 'assets/icons/calorie-ai.png',
    buttonText: 'Track',
  ),
];

class _AppsSection extends StatelessWidget {
  const _AppsSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: _appItems.map((app) => _AppCard(app: app)).toList(),
    );
  }
}

class _AppCard extends StatelessWidget {
  final _AppItem app;

  const _AppCard({required this.app});

  void _handleTap(BuildContext context) {
    // Navigate to specific app screens - matching AppsScreen
    switch (app.id) {
      case 'skin-ai':
        context.push('/skin-analyze');
        break;
      case 'calorie-ai':
        context.push('/calorie');
        break;
      case 'brain-ai':
        context.push('/brain-ai');
        break;
      case 'sleep-ai':
        context.push('/sleep-ai');
        break;
      default:
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Opening ${app.name}...')),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _handleTap(context),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.asset(
                app.iconAsset,
                width: 48,
                height: 48,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    app.name,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    app.description,
                    style: const TextStyle(
                      color: AppTheme.muted,
                      fontSize: 12,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                app.buttonText,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              color: AppTheme.mutedForeground,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  final IconData icon;
  final String label;

  const _EmptyCard({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border, style: BorderStyle.solid),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 32, color: AppTheme.muted),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(color: AppTheme.muted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _RecentCard extends StatelessWidget {
  final Generation generation;

  const _RecentCard({required this.generation});

  @override
  Widget build(BuildContext context) {
    final isVideo = generation.type == GenerationType.video;
    final imageUrl = generation.thumbnailUrl ?? generation.outputUrl;

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (imageUrl != null)
            isVideo
                ? VideoThumbnailImage(
                    thumbnailUrl: imageUrl,
                    fit: BoxFit.cover,
                  )
                : SmartMediaImage(
                    imageUrl: imageUrl,
                    fit: BoxFit.cover,
                  ),
          if (isVideo)
            const Center(
              child: Icon(Icons.play_arrow, color: Colors.white70, size: 32),
            ),
        ],
      ),
    );
  }
}
