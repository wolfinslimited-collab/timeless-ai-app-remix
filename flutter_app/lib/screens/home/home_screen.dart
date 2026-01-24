import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/credits_provider.dart';
import '../../providers/generation_provider.dart';
import '../../widgets/common/credit_badge.dart';
import '../../models/generation_model.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    _loadRecentGenerations();
  }

  Future<void> _loadRecentGenerations() async {
    final provider = context.read<GenerationProvider>();
    await provider.loadGenerations(limit: 4);
  }

  Future<void> _handleRefresh() async {
    await _loadRecentGenerations();
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
                    onTap: () => context.go('/apps'),
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
                    onTap: () => context.go('/pricing'),
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
                            child: const Icon(Icons.all_inclusive, color: Colors.white, size: 20),
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
              const _TrendingGrid(),
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
                        Expanded(child: _EmptyCard(icon: Icons.image, label: 'No images yet')),
                        const SizedBox(width: 12),
                        Expanded(child: _EmptyCard(icon: Icons.videocam, label: 'No videos yet')),
                      ],
                    );
                  }
                  
                  return GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
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

// Trending data model
class _TrendingItem {
  final String url;
  final String title;
  final String description;
  final String badge;

  const _TrendingItem({
    required this.url,
    required this.title,
    required this.description,
    required this.badge,
  });
}

const _trendingItems = [
  _TrendingItem(
    url: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/47f98df2-8f0d-4cf0-a32f-f582f3c0f90f-video11080.1080.mp4',
    title: 'Cinema Studio',
    description: 'Professional cinematic video creation with AI',
    badge: 'Featured',
  ),
  _TrendingItem(
    url: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/25bd0bda-0068-47e9-a2c3-c51330245765-video21080.1080 - RESIZE - Videobolt.net.mp4',
    title: 'Video Upscale',
    description: 'Enhance video quality up to 4K resolution',
    badge: 'Popular',
  ),
  _TrendingItem(
    url: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/559a3bef-5733-4be4-b79b-324924945429-video31080.1080 - RESIZE - Videobolt.net.mp4',
    title: 'Draw to Video',
    description: 'Transform sketches into animated videos',
    badge: 'New',
  ),
  _TrendingItem(
    url: 'https://timeless-bucket.fra1.cdn.digitaloceanspaces.com/ai_agent_timeless/33ee7581-6b7d-4d50-87d0-98acd87a53f3-video41080.1080 - RESIZE - Videobolt.net.mp4',
    title: 'Music Studio',
    description: 'AI-powered music creation and remixing',
    badge: 'Hot',
  ),
];

class _TrendingGrid extends StatelessWidget {
  const _TrendingGrid();

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 0.75,
      ),
      itemCount: _trendingItems.length,
      itemBuilder: (context, index) {
        return _TrendingTile(item: _trendingItems[index]);
      },
    );
  }
}

class _TrendingTile extends StatefulWidget {
  final _TrendingItem item;

  const _TrendingTile({required this.item});

  @override
  State<_TrendingTile> createState() => _TrendingTileState();
}

class _TrendingTileState extends State<_TrendingTile> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    _controller = VideoPlayerController.networkUrl(
      Uri.parse(widget.item.url),
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
    );
    
    try {
      await _controller.initialize();
      _controller.setLooping(true);
      _controller.setVolume(0); // Muted
      _controller.play();
      if (mounted) {
        setState(() {
          _isInitialized = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _hasError = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Stack(
              fit: StackFit.expand,
              children: [
                // Video or placeholder
                Container(
                  color: AppTheme.card,
                  child: _hasError
                      ? const Center(
                          child: Icon(Icons.error_outline, color: AppTheme.muted),
                        )
                      : _isInitialized
                          ? FittedBox(
                              fit: BoxFit.cover,
                              child: SizedBox(
                                width: _controller.value.size.width,
                                height: _controller.value.size.height,
                                child: VideoPlayer(_controller),
                              ),
                            )
                          : const Center(
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppTheme.primary,
                              ),
                            ),
                ),
                // Badge
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      widget.item.badge,
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
          widget.item.title,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 2),
        Text(
          widget.item.description,
          style: const TextStyle(
            color: AppTheme.muted,
            fontSize: 10,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}

// App data model
class _AppItem {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  final Color color;
  final String buttonText;

  const _AppItem({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.color,
    required this.buttonText,
  });
}

const _appItems = [
  _AppItem(
    id: 'brain-ai',
    name: 'Brain AI',
    description: 'Memory & brain games.',
    icon: Icons.psychology,
    color: Color(0xFF8B5CF6),
    buttonText: 'Try now',
  ),
  _AppItem(
    id: 'skin-ai',
    name: 'Skin AI',
    description: 'Face scan for skin.',
    icon: Icons.face,
    color: Color(0xFFEC4899),
    buttonText: 'Analyze',
  ),
  _AppItem(
    id: 'blood-ai',
    name: 'Blood AI',
    description: 'Blood test insights.',
    icon: Icons.bloodtype,
    color: Color(0xFFEF4444),
    buttonText: 'Test',
  ),
  _AppItem(
    id: 'sleep-ai',
    name: 'Sleep AI',
    description: 'Personal sleep advice.',
    icon: Icons.bedtime,
    color: Color(0xFF3B82F6),
    buttonText: 'Start',
  ),
  _AppItem(
    id: 'calorie-ai',
    name: 'Calorie AI',
    description: 'Count calories by photo.',
    icon: Icons.restaurant,
    color: Color(0xFF22C55E),
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
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: app.color.withOpacity(0.2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(app.icon, color: app.color, size: 24),
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
            CachedNetworkImage(
              imageUrl: imageUrl,
              fit: BoxFit.cover,
              placeholder: (context, url) => Container(
                color: AppTheme.secondary,
                child: const Center(
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
              errorWidget: (context, url, error) => Container(
                color: AppTheme.secondary,
                child: Icon(
                  isVideo ? Icons.videocam : Icons.image,
                  color: AppTheme.muted,
                  size: 32,
                ),
              ),
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
