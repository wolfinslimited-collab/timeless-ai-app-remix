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
      };

      // Manual mapping of titles to routes
      final Map<String, String> titleToRoute = {
        'Relight': '/create/image/relight',
        'Upscale': '/create/image/upscale',
        'Shots': '/create/image/shots',
        'Inpainting': '/create/image/inpainting',
        'Change Angle': '/create/image/angle',
        'Angle': '/create/image/angle',
        'Skin Enhancer': '/create/image/skin-enhancer',
        'Style Transfer': '/create/image/style-transfer',
        'Remove Background': '/create/image/background-remove',
        'Background Remove': '/create/image/background-remove',
      };

      final response = await Supabase.instance.client
          .from('featured_items')
          .select('*')
          .eq('is_active', true)
          .order('display_order', ascending: true);

      if (mounted) {
        setState(() {
          _featuredItems = (response as List).map((item) {
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
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loadingFeatured = false;
        });
      }
    }
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
                  onTap: () => context.push('/upgrade-wizard'),
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
              const SizedBox(height: 24),

              // Recent Creations
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Recent Creations',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.go('/library'),
                    child: const Text(
                      'See all',
                      style: TextStyle(color: AppTheme.primary, fontSize: 12),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Consumer<GenerationProvider>(
                builder: (context, provider, child) {
                  final generations = provider.generations.take(4).toList();

                  if (generations.isEmpty) {
                    return Row(
                      children: [
                        Expanded(
                            child: _EmptyCard(
                                icon: Icons.image, label: 'No images yet')),
                        const SizedBox(width: 12),
                        Expanded(
                            child: _EmptyCard(
                                icon: Icons.videocam, label: 'No videos yet')),
                      ],
                    );
                  }

                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1,
                    ),
                    itemCount: generations.length,
                    itemBuilder: (context, index) {
                      return _RecentCard(generation: generations[index]);
                    },
                  );
                },
              ),
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
      // Parse link_url and navigate to corresponding Flutter routes
      // Handle all patterns from featured_items table

      // Cinema Studio
      if (linkUrl.contains('/create?type=cinema')) {
        GoRouter.of(context).go('/cinema');
      }
      // Music Studio
      else if (linkUrl.contains('/create?type=music')) {
        GoRouter.of(context).go('/apps');
      }
      // Video tools
      else if (linkUrl.contains('/create?app=video-upscale') ||
          linkUrl.contains('/create?app=draw-to-video')) {
        GoRouter.of(context).go('/create/video');
      }
      // Image tools - direct paths like /create/image/relight
      else if (linkUrl.contains('/create/image/relight')) {
        GoRouter.of(context).go('/create/image/relight');
      } else if (linkUrl.contains('/create/image/upscale')) {
        GoRouter.of(context).go('/create/image/upscale');
      } else if (linkUrl.contains('/create/image/shots')) {
        GoRouter.of(context).go('/create/image/shots');
      } else if (linkUrl.contains('/create/image/inpainting')) {
        GoRouter.of(context).go('/create/image/inpainting');
      } else if (linkUrl.contains('/create/image/angle')) {
        GoRouter.of(context).go('/create/image/angle');
      } else if (linkUrl.contains('/create/image/skin-enhancer')) {
        GoRouter.of(context).go('/create/image/skin-enhancer');
      } else if (linkUrl.contains('/create/image/style-transfer')) {
        GoRouter.of(context).go('/create/image/style-transfer');
      } else if (linkUrl.contains('/create/image/background-remove')) {
        GoRouter.of(context).go('/create/image/background-remove');
      }
      // Fallback to apps
      else {
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
    if (app.id == 'skin-ai') {
      context.push('/skin-analyze');
    } else {
      // Other apps - show coming soon or navigate
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${app.name} coming soon!')),
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
