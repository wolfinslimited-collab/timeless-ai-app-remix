import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/credits_provider.dart';
import '../../providers/iap_provider.dart';
import '../../services/pricing_service.dart';
import '../upgrade_plan/upgrade_plan_wizard_content.dart';

class PricingScreen extends StatefulWidget {
  final int initialTab;

  const PricingScreen({super.key, this.initialTab = 0});

  @override
  State<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends State<PricingScreen> {
  bool _isLoading = true;
  int _selectedTierIndex = 0; // 0 = first tier, 1 = second tier
  int? _selectedPlanIndex;
  List<SubscriptionPlan> _subscriptionPlans = [];
  final PricingService _pricingService = PricingService();

  /// Unique tier names sorted by displayOrder
  List<String> get _tierNames {
    final seen = <String>{};
    final tiers = <String>[];
    final sorted = List<SubscriptionPlan>.from(_subscriptionPlans)
      ..sort((a, b) => a.displayOrder.compareTo(b.displayOrder));
    for (final p in sorted) {
      if (seen.add(p.name)) tiers.add(p.name);
    }
    return tiers;
  }

  /// Plans for the currently selected tier
  List<SubscriptionPlan> get _currentTierPlans {
    final tiers = _tierNames;
    if (tiers.isEmpty || _selectedTierIndex >= tiers.length) return [];
    final tierName = tiers[_selectedTierIndex];
    final plans = _subscriptionPlans.where((p) => p.name == tierName).toList();
    plans.sort((a, b) {
      final rankA = a.displayOrder * 10 + (a.period == 'Yearly' ? 5 : 0);
      final rankB = b.displayOrder * 10 + (b.period == 'Yearly' ? 5 : 0);
      return rankA.compareTo(rankB);
    });
    return plans;
  }

  /// Merged features from the currently selected tier
  List<PlanFeature> get _currentTierFeatures {
    final plans = _currentTierPlans;
    if (plans.isEmpty) return [];
    // Use the features from the first plan of this tier (they share the same feature set)
    return plans.first.features;
  }

  @override
  void initState() {
    super.initState();
    _fetchPricing();
    _setupIAPCallbacks();
  }

  Future<void> _fetchPricing() async {
    setState(() => _isLoading = true);
    try {
      final pricing = await _pricingService.fetchPricing();
      if (!mounted) return;
      final creditsProvider = context.read<CreditsProvider>();
      final userPlan = creditsProvider.currentPlan?.toLowerCase() ?? '';
      final hasActive = creditsProvider.hasActiveSubscription;

      setState(() {
        _subscriptionPlans = pricing.subscriptionPlans;
        _isLoading = false;
      });

      _preselectTierAndPlan(userPlan, hasActive);
    } catch (e) {
      debugPrint('Error fetching pricing: $e');
      setState(() => _isLoading = false);
    }
  }

  void _preselectTierAndPlan(String userPlan, bool hasActive) {
    final tiers = _tierNames;
    if (tiers.isEmpty) return;

    if (hasActive && userPlan.isNotEmpty) {
      // Find which tier and plan the user is on
      final currentPlan = _subscriptionPlans
          .where((p) => p.id.toLowerCase() == userPlan)
          .firstOrNull;
      if (currentPlan != null) {
        final tierIdx = tiers.indexOf(currentPlan.name);
        // Select the NEXT tier if possible (upgrade path), otherwise current tier
        final upgradeTierIdx =
            tierIdx + 1 < tiers.length ? tierIdx + 1 : tierIdx;
        setState(() => _selectedTierIndex = upgradeTierIdx);
      }
    } else {
      setState(() => _selectedTierIndex = 0);
    }

    // After tier is set, preselect a plan within that tier
    _preselectPlanInTier(userPlan, hasActive);
  }

  void _preselectPlanInTier(String userPlan, bool hasActive) {
    final plans = _currentTierPlans;
    if (plans.isEmpty) {
      setState(() => _selectedPlanIndex = null);
      return;
    }

    if (hasActive && userPlan.isNotEmpty) {
      final currentRank = _getPlanRank(userPlan);
      // Select the best upgrade option
      int bestIdx = -1;
      int bestRank = 999999;
      for (int i = 0; i < plans.length; i++) {
        final rank = _getPlanRank(plans[i].id.toLowerCase());
        if (rank > currentRank && rank < bestRank) {
          bestRank = rank;
          bestIdx = i;
        }
      }
      // If no upgrade available in this tier, select yearly (if exists) or first
      if (bestIdx < 0) {
        bestIdx = plans.indexWhere((p) => p.period == 'Yearly');
        if (bestIdx < 0) bestIdx = 0;
      }
      setState(() => _selectedPlanIndex = bestIdx);
    } else {
      // Default: select yearly or popular
      int idx = plans.indexWhere((p) => p.bestValue || p.popular);
      if (idx < 0) idx = plans.indexWhere((p) => p.period == 'Yearly');
      if (idx < 0) idx = 0;
      setState(() => _selectedPlanIndex = idx);
    }
  }

  void _setupIAPCallbacks() {
    final iapProvider = context.read<IAPProvider>();

    iapProvider.onPurchaseComplete = () {
      context.read<CreditsProvider>().refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(iapProvider.successMessage ?? 'Purchase successful!'),
            backgroundColor: Colors.green,
          ),
        );
        iapProvider.clearSuccess();
      }
    };

    iapProvider.onVerificationError = (message) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: Colors.red),
        );
        iapProvider.clearError();
      }
    };
  }

  int _getPlanRank(String planId) {
    final plan = _subscriptionPlans
        .where((p) => p.id.toLowerCase() == planId.toLowerCase())
        .firstOrNull;
    if (plan == null) return 0;
    int rank = plan.displayOrder * 10;
    if (plan.period == 'Yearly') rank += 5;
    return rank;
  }

  bool _isUpgrade(String currentPlanId, String targetPlanId) {
    return _getPlanRank(targetPlanId) > _getPlanRank(currentPlanId);
  }

  Future<void> _handleContinue() async {
    if (_selectedPlanIndex == null) return;
    final plans = _currentTierPlans;
    if (_selectedPlanIndex! >= plans.length) return;

    final plan = plans[_selectedPlanIndex!];
    final iapProvider = context.read<IAPProvider>();

    final productId = plan.platformProductId;
    if (productId == null || productId.isEmpty) {
      _showError('Product not available for this platform');
      return;
    }

    if (!iapProvider.isAvailable) {
      _showError('In-app purchases are not available on this device');
      return;
    }

    final success = await iapProvider.purchase(productId);
    if (!success && iapProvider.error != null) {
      if (!mounted) return;
      _showError(iapProvider.error!);
      iapProvider.clearError();
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Consumer2<IAPProvider, CreditsProvider>(
              builder: (context, iapProvider, creditsProvider, _) {
                final userPlan =
                    creditsProvider.currentPlan?.toLowerCase() ?? '';
                final hasActive = creditsProvider.hasActiveSubscription;
                final tiers = _tierNames;
                final tierPlans = _currentTierPlans;
                final tierFeatures = _currentTierFeatures;

                return Stack(
                  fit: StackFit.expand,
                  children: [
                    SingleChildScrollView(
                      child: Column(
                        children: [
                          // Auto-scrolling image carousel
                          const _ImageCarousel(),

                          // Title
                          const Padding(
                            padding: EdgeInsets.fromLTRB(24, 24, 24, 0),
                            child: Text(
                              'Timeless Premium',
                              style: TextStyle(
                                fontFamily: 'BebasNeue',
                                fontSize: 38,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                                letterSpacing: 1.5,
                                height: 1.0,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Unlock the full power of AI',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.5),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Current plan & credits section
                          if (hasActive)
                            _CurrentPlanBadge(
                              planName:
                                  creditsProvider.currentPlan ?? 'Premium',
                              credits: creditsProvider.credits,
                            ),
                          if (hasActive) const SizedBox(height: 20),

                          // Tier toggle (Premium / Premium Plus)
                          if (tiers.length > 1)
                            _TierToggle(
                              tiers: tiers,
                              selectedIndex: _selectedTierIndex,
                              onChanged: (i) {
                                setState(() => _selectedTierIndex = i);
                                _preselectPlanInTier(userPlan, hasActive);
                              },
                            ),
                          if (tiers.length > 1) const SizedBox(height: 20),

                          // Animated feature list
                          _AnimatedFeatureList(
                            key: ValueKey('features_$_selectedTierIndex'),
                            features: tierFeatures,
                          ),
                          const SizedBox(height: 20),

                          // Plan radio selector
                          _buildPlanSelector(tierPlans, userPlan, hasActive),
                          const SizedBox(height: 22),

                          // Continue button
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            child: _ContinueButton(
                              onTap: _handleContinue,
                              isPurchasing: iapProvider.isPurchasing,
                              isEnabled: _selectedPlanIndex != null,
                            ),
                          ),

                          // Footer
                          Padding(
                            padding: const EdgeInsets.fromLTRB(32, 14, 32, 8),
                            child: Text(
                              Platform.isIOS
                                  ? 'Payment will be charged to your Apple ID account. Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.'
                                  : 'Payment will be charged to your Google Play account. Subscription automatically renews unless cancelled.',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.3),
                                fontSize: 10,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),

                          const SizedBox(height: 48),
                        ],
                      ),
                    ),

                    // Top bar overlay
                    Positioned(
                      top: 0,
                      left: 0,
                      right: 0,
                      child: _TopBar(
                        onClose: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go('/');
                          }
                        },
                        hasActivePlan: hasActive,
                        onBuyCredits: hasActive
                            ? () => context.push('/credits')
                            : null,
                      ),
                    ),
                  ],
                );
              },
            ),
    );
  }

  Widget _buildPlanSelector(
    List<SubscriptionPlan> plans,
    String userPlan,
    bool hasActive,
  ) {
    if (plans.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          'No plans available',
          style: TextStyle(color: Colors.white.withOpacity(0.4)),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: List.generate(plans.length, (index) {
          final plan = plans[index];
          final planId = plan.id.toLowerCase();
          final isCurrentPlan = hasActive && userPlan == planId;
          final isDowngrade =
              hasActive && !isCurrentPlan && !_isUpgrade(userPlan, planId);
          final isSelected = _selectedPlanIndex == index;

          return _PlanOptionTile(
            plan: plan,
            isSelected: isSelected,
            isCurrentPlan: isCurrentPlan,
            isDowngrade: isDowngrade,
            savingsLabel: plan.period == 'Yearly' ? 'Save 17%' : null,
            onTap: (isCurrentPlan || isDowngrade)
                ? null
                : () => setState(() => _selectedPlanIndex = index),
          );
        }),
      ),
    );
  }

}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------
class _TopBar extends StatelessWidget {
  final VoidCallback onClose;
  final bool hasActivePlan;
  final VoidCallback? onBuyCredits;

  const _TopBar({
    required this.onClose,
    required this.hasActivePlan,
    this.onBuyCredits,
  });

  @override
  Widget build(BuildContext context) {
    final topPadding = MediaQuery.of(context).padding.top;
    return Container(
      padding: EdgeInsets.only(
        top: topPadding + 8,
        left: 12,
        right: 12,
        bottom: 12,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withOpacity(0.9),
            Colors.black.withOpacity(0.0),
          ],
        ),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: onClose,
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close, color: Colors.white, size: 20),
            ),
          ),
          const Spacer(),
          if (hasActivePlan && onBuyCredits != null)
            _pillButton(
                'Buy More Credits', Icons.add_circle_outline, onBuyCredits!),
        ],
      ),
    );
  }

  Widget _pillButton(String label, IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.12),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: Colors.white.withOpacity(0.8)),
            const SizedBox(width: 5),
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withOpacity(0.85),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Auto-scrolling image carousel — taller, no titles, black gradient fade
// ---------------------------------------------------------------------------
class _ImageCarousel extends StatefulWidget {
  const _ImageCarousel();

  @override
  State<_ImageCarousel> createState() => _ImageCarouselState();
}

class _ImageCarouselState extends State<_ImageCarousel> {
  late final ScrollController _scrollController;
  Timer? _scrollTimer;
  bool _didPrecache = false;

  static const double _itemWidth = 150.0;
  static const double _itemSpacing = 10.0;
  static const double _carouselHeight = 280.0;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startAutoScroll());
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_didPrecache) {
      _didPrecache = true;
      for (final step in wizardSteps) {
        precacheImage(AssetImage(step.imagePath), context);
      }
    }
  }

  @override
  void dispose() {
    _scrollTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _startAutoScroll() {
    _scrollTimer?.cancel();
    _scrollTimer = Timer.periodic(const Duration(milliseconds: 30), (_) {
      if (!_scrollController.hasClients) return;
      final maxScroll = _scrollController.position.maxScrollExtent;
      final current = _scrollController.offset;
      if (current >= maxScroll) {
        _scrollController.jumpTo(0);
      } else {
        _scrollController.jumpTo(current + 0.5);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final items = [...wizardSteps, ...wizardSteps, ...wizardSteps];

    return SizedBox(
      height: _carouselHeight,
      child: Stack(
        children: [
          ListView.builder(
            controller: _scrollController,
            scrollDirection: Axis.horizontal,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: items.length,
            padding: const EdgeInsets.symmetric(horizontal: 4),
            itemBuilder: (context, index) {
              final step = items[index];
              return Padding(
                padding: EdgeInsets.only(right: _itemSpacing),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: SizedBox(
                    width: _itemWidth,
                    height: _carouselHeight,
                    child: Image.asset(
                      step.imagePath,
                      fit: BoxFit.cover,
                      filterQuality: FilterQuality.medium,
                      errorBuilder: (_, __, ___) => Container(
                        color: AppTheme.card,
                        child: const Center(
                          child: Icon(Icons.image_outlined,
                              color: Colors.white24, size: 32),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
          // Bottom black gradient fade
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: 80,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [
                    Colors.black,
                    Colors.black.withOpacity(0.0),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Current plan badge
// ---------------------------------------------------------------------------
class _CurrentPlanBadge extends StatelessWidget {
  final String planName;
  final int credits;

  const _CurrentPlanBadge({required this.planName, required this.credits});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppTheme.primary.withOpacity(0.12),
              const Color(0xFFEC4899).withOpacity(0.08),
            ],
          ),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.workspace_premium,
                  color: AppTheme.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Current Plan',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatPlanName(planName),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.08),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.toll, color: AppTheme.primary, size: 16),
                  const SizedBox(width: 6),
                  Text(
                    _formatNumber(credits),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(
                    ' credits',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _formatPlanName(String id) {
    return id
        .replaceAll('-', ' ')
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }

  static String _formatNumber(int n) {
    return n.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]},',
        );
  }
}

// ---------------------------------------------------------------------------
// Tier toggle (Premium / Premium Plus)
// ---------------------------------------------------------------------------
class _TierToggle extends StatelessWidget {
  final List<String> tiers;
  final int selectedIndex;
  final ValueChanged<int> onChanged;

  const _TierToggle({
    required this.tiers,
    required this.selectedIndex,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.06),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          children: List.generate(tiers.length, (index) {
            final isActive = index == selectedIndex;
            return Expanded(
              child: GestureDetector(
                onTap: () => onChanged(index),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOut,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    gradient: isActive
                        ? const LinearGradient(
                            colors: [AppTheme.primary, Color(0xFFEC4899)],
                          )
                        : null,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    tiers[index],
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: isActive
                          ? Colors.white
                          : Colors.white.withOpacity(0.45),
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Animated feature list
// ---------------------------------------------------------------------------
class _AnimatedFeatureList extends StatelessWidget {
  final List<PlanFeature> features;

  const _AnimatedFeatureList({super.key, required this.features});

  @override
  Widget build(BuildContext context) {
    if (features.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28),
      child: Column(
        children: List.generate(features.length, (index) {
          final feature = features[index];
          return TweenAnimationBuilder<double>(
            key: ValueKey('${feature.text}_${feature.included}'),
            tween: Tween(begin: 0.0, end: 1.0),
            duration: Duration(milliseconds: 300 + (index * 60)),
            curve: Curves.easeOut,
            builder: (context, value, child) {
              return Opacity(
                opacity: value,
                child: Transform.translate(
                  offset: Offset(0, 12 * (1 - value)),
                  child: child,
                ),
              );
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(
                      color: feature.included
                          ? Colors.green.withOpacity(0.15)
                          : Colors.white.withOpacity(0.05),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      feature.included ? Icons.check : Icons.close,
                      size: 13,
                      color: feature.included
                          ? Colors.green
                          : Colors.white.withOpacity(0.2),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: AnimatedDefaultTextStyle(
                      duration: const Duration(milliseconds: 250),
                      style: TextStyle(
                        color: feature.included
                            ? Colors.white.withOpacity(0.85)
                            : Colors.white.withOpacity(0.3),
                        fontSize: 14.5,
                        fontWeight: FontWeight.w500,
                        height: 1.4,
                        decoration: feature.included
                            ? TextDecoration.none
                            : TextDecoration.lineThrough,
                        decorationColor: Colors.white.withOpacity(0.15),
                      ),
                      child: Text(feature.text),
                    ),
                  ),
                  if (feature.badge != null)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        feature.badge!,
                        style: const TextStyle(
                          fontSize: 10,
                          color: AppTheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          );
        }),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Plan option tile (radio-style)
// ---------------------------------------------------------------------------
class _PlanOptionTile extends StatelessWidget {
  final SubscriptionPlan plan;
  final bool isSelected;
  final bool isCurrentPlan;
  final bool isDowngrade;
  final String? savingsLabel;
  final VoidCallback? onTap;

  const _PlanOptionTile({
    required this.plan,
    required this.isSelected,
    required this.isCurrentPlan,
    required this.isDowngrade,
    this.savingsLabel,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDisabled = isCurrentPlan || isDowngrade;
    final borderColor = isCurrentPlan
        ? Colors.green.withOpacity(0.5)
        : isSelected
            ? Colors.white.withOpacity(0.5)
            : Colors.white.withOpacity(0.1);
    final bgColor = isSelected && !isDisabled
        ? Colors.white.withOpacity(0.05)
        : Colors.transparent;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: borderColor, width: isSelected ? 2 : 1),
        ),
        child: Row(
          children: [
            // Radio dot
            _RadioDot(
              isSelected: isSelected && !isDisabled,
              isCurrentPlan: isCurrentPlan,
            ),
            const SizedBox(width: 14),
            // Plan info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        plan.period,
                        style: TextStyle(
                          color: isDisabled
                              ? Colors.white.withOpacity(0.35)
                              : Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (isCurrentPlan) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                                color: Colors.green.withOpacity(0.3)),
                          ),
                          child: const Text(
                            'Your Plan',
                            style: TextStyle(
                              color: Colors.green,
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                      if (isDowngrade && !isCurrentPlan) ...[
                        const SizedBox(width: 8),
                        Text(
                          'Current plan is higher',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.25),
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '\$${plan.price.toStringAsFixed(2)}/${plan.period == 'Monthly' ? 'month' : plan.period == 'Yearly' ? 'year' : 'week'}. Cancel anytime',
                    style: TextStyle(
                      color: isDisabled
                          ? Colors.white.withOpacity(0.2)
                          : Colors.white.withOpacity(0.5),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            // Credits + savings
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (savingsLabel != null && !isCurrentPlan)
                  Container(
                    margin: const EdgeInsets.only(bottom: 4),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      savingsLabel!,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                Text(
                  '${_formatNumber(plan.credits)} credits',
                  style: TextStyle(
                    color: isDisabled
                        ? Colors.white.withOpacity(0.3)
                        : AppTheme.primary,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static String _formatNumber(int n) {
    return n.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]},',
        );
  }
}

// ---------------------------------------------------------------------------
// Radio dot
// ---------------------------------------------------------------------------
class _RadioDot extends StatelessWidget {
  final bool isSelected;
  final bool isCurrentPlan;

  const _RadioDot({required this.isSelected, required this.isCurrentPlan});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: isCurrentPlan
              ? Colors.green
              : isSelected
                  ? Colors.white
                  : Colors.white.withOpacity(0.25),
          width: 2,
        ),
      ),
      child: isSelected || isCurrentPlan
          ? Center(
              child: Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isCurrentPlan ? Colors.green : Colors.white,
                ),
              ),
            )
          : null,
    );
  }
}

// ---------------------------------------------------------------------------
// Continue button
// ---------------------------------------------------------------------------
class _ContinueButton extends StatelessWidget {
  final VoidCallback onTap;
  final bool isPurchasing;
  final bool isEnabled;

  const _ContinueButton({
    required this.onTap,
    required this.isPurchasing,
    required this.isEnabled,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isEnabled && !isPurchasing ? onTap : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: isEnabled ? Colors.white : Colors.white.withOpacity(0.12),
          borderRadius: BorderRadius.circular(30),
        ),
        child: Center(
          child: isPurchasing
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    color: Colors.black,
                  ),
                )
              : Text(
                  'Continue',
                  style: TextStyle(
                    color: isEnabled ? Colors.black : Colors.white30,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
        ),
      ),
    );
  }
}

