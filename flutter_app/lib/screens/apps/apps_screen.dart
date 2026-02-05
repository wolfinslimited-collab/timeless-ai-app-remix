import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
 import 'package:provider/provider.dart';
import '../../core/theme.dart';
 import '../../providers/credits_provider.dart';
 import '../../widgets/common/premium_plus_lock_screen.dart';

class AIAppItem {
  final String id;
  final String name;
  final String description;
  final IconData icon;
  final String category;
  final String? badge;
  final bool comingSoon;

  const AIAppItem({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.category,
    this.badge,
    this.comingSoon = false,
  });
}

const List<AIAppItem> _aiApps = [
  AIAppItem(
    id: 'notify-ai',
    name: 'Notify AI',
    description: 'Smart notifications that learn your preferences',
    icon: Icons.notifications_outlined,
    category: 'productivity',
    badge: 'POPULAR',
  ),
  AIAppItem(
    id: 'sleep-ai',
    name: 'Sleep AI',
    description: 'Optimize your sleep patterns with AI analysis',
    icon: Icons.bedtime_outlined,
    category: 'health',
    badge: 'NEW',
  ),
  AIAppItem(
    id: 'brain-ai',
    name: 'Brain AI',
    description: 'Cognitive wellness & focus tracking powered by AI',
    icon: Icons.psychology_outlined,
    category: 'productivity',
    badge: 'NEW',
  ),
  AIAppItem(
    id: 'skin-ai',
    name: 'Skin AI',
    description: 'AI-powered skin analysis and care recommendations',
    icon: Icons.auto_awesome,
    category: 'health',
    badge: 'NEW',
  ),
  AIAppItem(
    id: 'financial-ai',
    name: 'Financial AI',
    description:
        'AI-powered market research with technical, fundamental & sentiment analysis',
    icon: Icons.attach_money,
    category: 'finance',
    badge: 'NEW',
  ),
  AIAppItem(
    id: 'calorie-ai',
    name: 'Calorie AI',
    description: 'Track and optimize your nutrition with AI',
    icon: Icons.apple,
    category: 'health',
    badge: 'NEW',
  ),
  AIAppItem(
    id: 'fingerprint-ai',
    name: 'Fingerprint AI',
    description: 'Discover social profiles and public info about anyone',
    icon: Icons.fingerprint,
    category: 'productivity',
    badge: 'NEW',
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
   bool _showLockScreen = false;
   AIAppItem? _selectedApp;

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
     
     // Check for Premium Plus access
     final creditsProvider = context.read<CreditsProvider>();
     if (!creditsProvider.hasPremiumPlusAccess) {
       setState(() {
         _selectedApp = app;
         _showLockScreen = true;
       });
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
     // Show lock screen when user without Premium Plus tries to access an app
     if (_showLockScreen && _selectedApp != null) {
       return PremiumPlusLockScreen(
         feature: _selectedApp!.name,
         description: 'Access ${_selectedApp!.name} and all other AI-powered apps with Premium Plus.',
         onBack: () => setState(() {
           _showLockScreen = false;
           _selectedApp = null;
         }),
       );
     }
     
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
        return AppTheme.secondary;
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
        return AppTheme.muted;
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
                // Icon with mono background
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: Icon(
                      app.icon,
                      size: 26,
                      color: AppTheme.muted,
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
                    color: app.badge == 'NEW' || app.badge == 'SOON'
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
