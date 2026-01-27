import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';

class AIAppItem {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  final String category;
  final String? badge;
  final List<Color> gradientColors;
  final bool comingSoon;

  const AIAppItem({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.category,
    this.badge,
    required this.gradientColors,
    this.comingSoon = false,
  });
}

const List<AIAppItem> _aiApps = [
  AIAppItem(
    id: 'health-ai',
    name: 'Health AI',
    description: 'Personal health insights and recommendations powered by AI',
    icon: Icons.favorite_outline,
    category: 'health',
    badge: 'POPULAR',
    gradientColors: [Color(0x33F43F5E), Color(0x33EC4899)],
    comingSoon: true,
  ),
  AIAppItem(
    id: 'translate-ai',
    name: 'Translate AI',
    description: 'Real-time translation across 100+ languages',
    icon: Icons.translate,
    category: 'productivity',
    badge: 'NEW',
    gradientColors: [Color(0x333B82F6), Color(0x3306B6D4)],
    comingSoon: true,
  ),
  AIAppItem(
    id: 'notify-ai',
    name: 'Notify AI',
    description: 'Smart notifications that learn your preferences',
    icon: Icons.notifications_outlined,
    category: 'productivity',
    badge: 'POPULAR',
    gradientColors: [Color(0x33F59E0B), Color(0x33F97316)],
    comingSoon: false,
  ),
  AIAppItem(
    id: 'sleep-ai',
    name: 'Sleep AI',
    description: 'Optimize your sleep patterns with AI analysis',
    icon: Icons.bedtime_outlined,
    category: 'health',
    gradientColors: [Color(0x336366F1), Color(0x33A855F7)],
    comingSoon: true,
  ),
  AIAppItem(
    id: 'brain-ai',
    name: 'Brain AI',
    description: 'Cognitive enhancement and memory training',
    icon: Icons.psychology_outlined,
    category: 'productivity',
    badge: 'POPULAR',
    gradientColors: [Color(0x338B5CF6), Color(0x33A855F7)],
    comingSoon: false,
  ),
  AIAppItem(
    id: 'skin-ai',
    name: 'Skin AI',
    description: 'AI-powered skin analysis and care recommendations',
    icon: Icons.auto_awesome,
    category: 'health',
    badge: 'NEW',
    gradientColors: [Color(0x33EC4899), Color(0x33F43F5E)],
    comingSoon: false,
  ),
  AIAppItem(
    id: 'financial-ai',
    name: 'Financial AI',
    description: 'Smart financial planning and investment insights',
    icon: Icons.attach_money,
    category: 'finance',
    badge: 'POPULAR',
    gradientColors: [Color(0x3310B981), Color(0x3322C55E)],
    comingSoon: false,
  ),
  AIAppItem(
    id: 'calorie-ai',
    name: 'Calorie AI',
    description: 'Track and optimize your nutrition with AI',
    icon: Icons.apple,
    category: 'health',
    gradientColors: [Color(0x3384CC16), Color(0x3322C55E)],
    comingSoon: false,
  ),
  AIAppItem(
    id: 'fingerprint-ai',
    name: 'Fingerprint AI',
    description: 'Advanced biometric security powered by AI',
    icon: Icons.fingerprint,
    category: 'security',
    badge: 'BETA',
    gradientColors: [Color(0x3364748B), Color(0x3371717A)],
    comingSoon: false,
  ),
  AIAppItem(
    id: 'timefarm',
    name: 'Timefarm',
    description: 'AI-powered time management and productivity',
    icon: Icons.schedule,
    category: 'productivity',
    gradientColors: [Color(0x3314B8A6), Color(0x3306B6D4)],
    comingSoon: true,
  ),
  AIAppItem(
    id: 'ads-ai',
    name: 'Ads AI',
    description: 'Create high-converting ad campaigns with AI',
    icon: Icons.campaign_outlined,
    category: 'marketing',
    badge: 'NEW',
    gradientColors: [Color(0x33F97316), Color(0x33EF4444)],
    comingSoon: true,
  ),
];

const List<Map<String, String>> _categories = [
  {'id': 'all', 'label': 'All Apps'},
  {'id': 'health', 'label': 'Health'},
  {'id': 'productivity', 'label': 'Productivity'},
  {'id': 'finance', 'label': 'Finance'},
  {'id': 'security', 'label': 'Security'},
  {'id': 'marketing', 'label': 'Marketing'},
];

class AppsScreen extends StatefulWidget {
  const AppsScreen({super.key});

  @override
  State<AppsScreen> createState() => _AppsScreenState();
}

class _AppsScreenState extends State<AppsScreen> {
  String _selectedCategory = 'all';

  List<AIAppItem> get _filteredApps {
    if (_selectedCategory == 'all') {
      return _aiApps;
    }
    return _aiApps.where((app) => app.category == _selectedCategory).toList();
  }

  void _handleAppTap(AIAppItem app) {
    if (app.comingSoon) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${app.name} is coming soon!'),
          backgroundColor: AppTheme.primary,
        ),
      );
      return;
    }

    // Navigate to specific app screens
    switch (app.id) {
      case 'skin-ai':
        context.push('/skin-analyze');
        break;
      case 'calorie-ai':
        context.push('/calorie');
        break;
      case 'financial-ai':
        context.push('/financial-ai');
        break;
      case 'fingerprint-ai':
        context.push('/fingerprint-ai');
        break;
      case 'notify-ai':
        context.push('/notify-ai');
        break;
      case 'brain-ai':
        context.push('/brain-ai');
        break;
      default:
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Opening ${app.name}...')),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // Hero Section
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'AI-Powered Apps',
                        style: TextStyle(
                          color: AppTheme.primary,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Discover Our\nAI Apps',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        height: 1.1,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Explore our suite of AI-powered applications',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppTheme.muted,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Category Filter
            SliverToBoxAdapter(
              child: SizedBox(
                height: 44,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _categories.length,
                  itemBuilder: (context, index) {
                    final category = _categories[index];
                    final isSelected = _selectedCategory == category['id'];
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedCategory = category['id']!;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppTheme.primary
                                : AppTheme.secondary,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            category['label']!,
                            style: TextStyle(
                              color: isSelected
                                  ? AppTheme.primaryForeground
                                  : AppTheme.muted,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),

            const SliverToBoxAdapter(child: SizedBox(height: 20)),

            // Apps Grid
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  childAspectRatio: 0.78,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final app = _filteredApps[index];
                    return _AppCard(
                      app: app,
                      onTap: () => _handleAppTap(app),
                    );
                  },
                  childCount: _filteredApps.length,
                ),
              ),
            ),

            // Empty State
            if (_filteredApps.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(40),
                  child: Center(
                    child: Text(
                      'No apps found in this category.',
                      style: TextStyle(color: AppTheme.muted),
                    ),
                  ),
                ),
              ),

            // Bottom padding
            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }
}

class _AppCard extends StatelessWidget {
  final AIAppItem app;
  final VoidCallback onTap;

  const _AppCard({
    required this.app,
    required this.onTap,
  });

  Color _getBadgeColor() {
    switch (app.badge) {
      case 'NEW':
        return const Color(0xFFC8FF00);
      case 'POPULAR':
        return AppTheme.primary;
      case 'BETA':
        return const Color(0xFF3B82F6);
      case 'SOON':
        return const Color(0xFF6B7280);
      default:
        return AppTheme.muted;
    }
  }

  Color _getBadgeTextColor() {
    switch (app.badge) {
      case 'NEW':
        return Colors.black;
      case 'POPULAR':
        return AppTheme.primary;
      case 'BETA':
        return const Color(0xFF3B82F6);
      case 'SOON':
        return const Color(0xFF6B7280);
      default:
        return AppTheme.foreground;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border.withOpacity(0.5)),
        ),
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icon with gradient background
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: app.gradientColors,
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: Icon(
                      app.icon,
                      size: 26,
                      color: AppTheme.foreground,
                    ),
                  ),
                ),
                const Spacer(),

                // Name
                Text(
                  app.name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.foreground,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),

                // Description
                Text(
                  app.description,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.muted,
                    height: 1.3,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 10),

                // Action row
                Row(
                  children: [
                    if (app.comingSoon) ...[
                      Text(
                        'Coming Soon',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.muted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ] else ...[
                      Text(
                        'Open App',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.primary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        Icons.arrow_forward,
                        size: 14,
                        color: AppTheme.primary,
                      ),
                    ],
                  ],
                ),
              ],
            ),

            // Badge positioned at top-right
            if (app.badge != null)
              Positioned(
                top: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: app.badge == 'NEW'
                        ? _getBadgeColor()
                        : _getBadgeColor().withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    app.badge == 'SOON' ? 'COMING SOON' : app.badge!,
                    style: TextStyle(
                      color: _getBadgeTextColor(),
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
