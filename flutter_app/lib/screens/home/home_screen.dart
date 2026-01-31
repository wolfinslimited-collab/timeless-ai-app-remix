import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/credits_provider.dart';
import '../../providers/generation_provider.dart';
import '../../providers/home_provider.dart';
import '../../widgets/common/credit_badge.dart';
import '../../widgets/common/smart_media_image.dart';
import '../../widgets/common/cached_video_player.dart';
import '../../models/generation_model.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    // Load featured items via provider (only loads if not already cached)
    final homeProvider = context.read<HomeProvider>();
    homeProvider.loadFeaturedItems();
    
    // Load recent generations
    final generationProvider = context.read<GenerationProvider>();
    generationProvider.loadGenerations(limit: 4);
  }

  Future<void> _handleRefresh() async {
    final homeProvider = context.read<HomeProvider>();
    final generationProvider = context.read<GenerationProvider>();
    
    await Future.wait([
      homeProvider.refresh(),
      generationProvider.loadGenerations(limit: 4),
    ]);
    
    if (mounted) {
      context.read<CreditsProvider>().refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    
    return Consumer<HomeProvider>(
      builder: (context, homeProvider, child) {
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
                items: homeProvider.featuredItems,
                isLoading: homeProvider.isLoading && !homeProvider.hasLoaded,
              ),
              const SizedBox(height: 24),

              // Trending Visual Styles Banner
              GestureDetector(
                onTap: () => context.go('/create/visual-styles'),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFFDB2777).withOpacity(0.85),
                        const Color(0xFF9333EA).withOpacity(0.85),
                      ],
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
                          color: Colors.white.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.auto_awesome, color: Colors.white, size: 24),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Text(
                                  'Trending',
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
                                    color: Colors.white.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text(
                                    'HOT',
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
                              'Visual Styles · Ultra-realistic fashion & portrait visuals',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right, color: Colors.white70),
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
      );
      },
    );
  }
}

class _TrendingGrid extends StatelessWidget {
  final List<FeaturedItem> items; // FeaturedItem from home_provider.dart
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
