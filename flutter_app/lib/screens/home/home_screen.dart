import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
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
            Image.network(
              imageUrl,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
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
