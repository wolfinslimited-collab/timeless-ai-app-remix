import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/credits_provider.dart';
import '../../providers/iap_provider.dart';
import '../../services/pricing_service.dart';

class PricingScreen extends StatefulWidget {
  const PricingScreen({super.key});

  @override
  State<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends State<PricingScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late PageController _plansPageController;
  bool _isYearly = false;
  bool _isLoading = true;
  int _plansPageIndex = 0;

  List<SubscriptionPlan> _subscriptionPlans = [];
  List<CreditPackage> _creditPackages = [];
  final PricingService _pricingService = PricingService();

  List<SubscriptionPlan> get _monthlyPlans =>
      _subscriptionPlans.where((p) => p.period == 'Monthly').toList();
  List<SubscriptionPlan> get _yearlyPlans =>
      _subscriptionPlans.where((p) => p.period == 'Yearly').toList();
  List<SubscriptionPlan> get _currentPlans =>
      _isYearly ? _yearlyPlans : _monthlyPlans;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _plansPageController = PageController();
    _fetchPricing();
    _setupIAPCallbacks();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _plansPageController.dispose();
    super.dispose();
  }

  Future<void> _fetchPricing() async {
    setState(() => _isLoading = true);

    try {
      final pricing = await _pricingService.fetchPricing();
      setState(() {
        _subscriptionPlans = pricing.subscriptionPlans;
        _creditPackages = pricing.creditPackages;
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Error fetching pricing: $e');
      setState(() => _isLoading = false);
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

    iapProvider.onRestoreComplete = () {
      context.read<CreditsProvider>().refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Purchases restored successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    };

    iapProvider.onVerificationError = (message) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: Colors.red,
          ),
        );
        iapProvider.clearError();
      }
    };
  }

  Future<void> _handleSubscriptionPurchase(SubscriptionPlan plan) async {
    final iapProvider = context.read<IAPProvider>();

    final productId = plan.platformProductId;
    if (productId == null || productId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Product not available for this platform'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (!iapProvider.isAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('In-app purchases are not available on this device'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final success = await iapProvider.purchase(productId);

    if (!success && iapProvider.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(iapProvider.error!),
          backgroundColor: Colors.red,
        ),
      );
      iapProvider.clearError();
    }
  }

  Future<void> _handleCreditPurchase(CreditPackage package) async {
    final creditsProvider = context.read<CreditsProvider>();
    final iapProvider = context.read<IAPProvider>();

    // Check if user has active subscription - only premium users can buy credits
    if (!creditsProvider.hasActiveSubscription) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A premium subscription is required to purchase credits'),
          backgroundColor: Colors.orange,
        ),
      );
      // Switch to subscriptions tab
      _tabController.animateTo(0);
      return;
    }

    final productId = package.platformProductId;
    if (productId == null || productId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Product not available for this platform'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    if (!iapProvider.isAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('In-app purchases are not available on this device'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final success = await iapProvider.purchase(productId);

    if (!success && iapProvider.error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(iapProvider.error!),
          backgroundColor: Colors.red,
        ),
      );
      iapProvider.clearError();
    }
  }

  Future<void> _handleRestore() async {
    final iapProvider = context.read<IAPProvider>();
    await iapProvider.restorePurchases();
  }

  IconData _getIconData(String iconName) {
    switch (iconName) {
      case 'Zap':
        return Icons.flash_on;
      case 'Calendar':
        return Icons.calendar_today;
      case 'Crown':
        return Icons.workspace_premium;
      case 'Award':
        return Icons.emoji_events;
      case 'Sparkles':
        return Icons.auto_awesome;
      case 'Star':
        return Icons.star;
      case 'Coins':
        return Icons.toll;
      default:
        return Icons.flash_on;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pricing'),
        actions: [
          // Credits & subscriber in top right
          Consumer<CreditsProvider>(
            builder: (context, credits, _) {
              return Padding(
                padding: const EdgeInsets.only(right: 8, top: 12, bottom: 12),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.toll,
                              size: 18,
                              color: Theme.of(context).colorScheme.onSurface),
                          const SizedBox(width: 6),
                          Text(
                            credits.hasActiveSubscription
                                ? '∞'
                                : '${credits.credits}',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (credits.hasActiveSubscription) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primary.withOpacity(0.3),
                              const Color(0xFFEC4899).withOpacity(0.3),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.workspace_premium,
                                size: 14, color: Color(0xFFFBBF24)),
                            SizedBox(width: 4),
                            Text(
                              'Pro',
                              style: TextStyle(
                                  fontSize: 11, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              );
            },
          ),
          TextButton(
            onPressed: _handleRestore,
            child: const Text('Restore'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Consumer<IAPProvider>(
              builder: (context, iapProvider, child) {
                return Column(
                  children: [
                    // Tab bar — user selects by tap only
                    Container(
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: TabBar(
                        controller: _tabController,
                        indicator: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppTheme.primary, Color(0xFFEC4899)],
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        indicatorSize: TabBarIndicatorSize.tab,
                        labelColor: Colors.white,
                        unselectedLabelColor: AppTheme.muted,
                        dividerColor: Colors.transparent,
                        tabs: const [
                          Tab(
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.workspace_premium, size: 18),
                                SizedBox(width: 6),
                                Text('Subscriptions'),
                              ],
                            ),
                          ),
                          Tab(
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.add, size: 18),
                                SizedBox(width: 6),
                                Text('Credit Packs'),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Tab content — switch with tab buttons only (no swipe)
                    Expanded(
                      child: TabBarView(
                        controller: _tabController,
                        physics: const NeverScrollableScrollPhysics(),
                        children: [
                          // Subscriptions tab
                          _buildSubscriptionsTab(iapProvider),
                          // Credit packs tab
                          _buildCreditPacksTab(iapProvider),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
    );
  }

  Widget _buildSubscriptionsTab(IAPProvider iapProvider) {
    final plans = _currentPlans;
    return Column(
      children: [
        // Monthly / Yearly toggle — user select only (no pager between them)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: () {
                    if (_isYearly) {
                      setState(() {
                        _isYearly = false;
                        _plansPageIndex = 0;
                      });
                      _plansPageController.jumpToPage(0);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(
                      color: !_isYearly ? Colors.white : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Monthly',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: !_isYearly ? Colors.black : AppTheme.muted,
                      ),
                    ),
                  ),
                ),
                GestureDetector(
                  onTap: () {
                    if (!_isYearly) {
                      setState(() {
                        _isYearly = true;
                        _plansPageIndex = 0;
                      });
                      _plansPageController.jumpToPage(0);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 10),
                    decoration: BoxDecoration(
                      color: _isYearly ? Colors.white : Colors.transparent,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Text(
                          'Yearly',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _isYearly ? Colors.black : AppTheme.muted,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Save 17%',
                            style: TextStyle(
                                fontSize: 9,
                                color: Colors.white,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Pager between plan items (one card per page for selected period)
        Expanded(
          child: plans.isEmpty
              ? const Center(
                  child: Text(
                    'No plans available',
                    style: TextStyle(color: AppTheme.muted),
                  ),
                )
              : PageView.builder(
                  controller: _plansPageController,
                  onPageChanged: (index) {
                    setState(() => _plansPageIndex = index);
                  },
                  itemCount: plans.length,
                  itemBuilder: (context, index) {
                    final plan = plans[index];
                    return SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Padding(
                        padding: const EdgeInsets.only(bottom: 24),
                        child: _SubscriptionPlanCard(
                          plan: plan,
                          iconData: _getIconData(plan.icon),
                          isPurchasing: iapProvider.isPurchasing,
                          onPurchase: () => _handleSubscriptionPurchase(plan),
                        ),
                      ),
                    );
                  },
                ),
        ),

        // Page indicator for plan items
        if (plans.length > 1) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              plans.length,
              (index) => AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: _plansPageIndex == index ? 20 : 8,
                height: 8,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                  color: _plansPageIndex == index
                      ? AppTheme.primary
                      : AppTheme.border,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],

        // Footer text
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          child: Text(
            Platform.isIOS
                ? 'Payment will be charged to your Apple ID account. Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.'
                : 'Payment will be charged to your Google Play account. Subscription automatically renews unless cancelled.',
            style: const TextStyle(color: AppTheme.muted, fontSize: 11),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }

  Widget _buildCreditPacksTab(IAPProvider iapProvider) {
    return Consumer<CreditsProvider>(
      builder: (context, creditsProvider, child) {
        final hasActiveSubscription = creditsProvider.hasActiveSubscription;

        return SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: [
              // Show subscription required message if user is not premium
              if (!hasActiveSubscription) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppTheme.primary.withOpacity(0.1),
                        const Color(0xFFEC4899).withOpacity(0.1),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppTheme.primary.withOpacity(0.3),
                    ),
                  ),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.lock_outline,
                        color: AppTheme.primary,
                        size: 32,
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'Premium Required',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Subscribe to a premium plan to unlock credit purchases.',
                        style: TextStyle(
                          color: AppTheme.muted,
                          fontSize: 14,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: Container(
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppTheme.primary, Color(0xFFEC4899)],
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: ElevatedButton(
                            onPressed: () {
                              // Switch to subscriptions tab
                              _tabController.animateTo(0);
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              'View Subscription Plans',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Credit packs available after subscribing:',
                  style: TextStyle(color: AppTheme.muted, fontSize: 14),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                // Show credit packages as disabled previews
                ..._creditPackages.map((pkg) => Opacity(
                      opacity: 0.5,
                      child: IgnorePointer(
                        child: _CreditPackageCard(
                          package: pkg,
                          iconData: _getIconData(pkg.icon),
                          isPurchasing: false,
                          onPurchase: () {},
                        ),
                      ),
                    )),
              ] else ...[
                const Text(
                  'One-time credit purchases for Pro members.',
                  style: TextStyle(color: AppTheme.muted, fontSize: 14),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),

                // Credit packages - enabled for premium users
                ..._creditPackages.map((pkg) => _CreditPackageCard(
                      package: pkg,
                      iconData: _getIconData(pkg.icon),
                      isPurchasing: iapProvider.isPurchasing,
                      onPurchase: () => _handleCreditPurchase(pkg),
                    )),
              ],

              const SizedBox(height: 24),

              // Footer
              const Text(
                'Credits never expire and can be used for any generation.',
                style: TextStyle(color: AppTheme.muted, fontSize: 11),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 100),
            ],
          ),
        );
      },
    );
  }
}

class _SubscriptionPlanCard extends StatelessWidget {
  final SubscriptionPlan plan;
  final IconData iconData;
  final bool isPurchasing;
  final VoidCallback onPurchase;

  const _SubscriptionPlanCard({
    required this.plan,
    required this.iconData,
    required this.isPurchasing,
    required this.onPurchase,
  });

  @override
  Widget build(BuildContext context) {
    final isHighlighted = plan.popular || plan.bestValue;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: isHighlighted
            ? LinearGradient(
                colors: [
                  AppTheme.primary.withOpacity(0.2),
                  const Color(0xFFEC4899).withOpacity(0.2),
                ],
              )
            : null,
        color: isHighlighted ? null : AppTheme.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isHighlighted ? AppTheme.primary : AppTheme.border,
          width: isHighlighted ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: isHighlighted
                      ? const LinearGradient(
                          colors: [AppTheme.primary, Color(0xFFEC4899)])
                      : null,
                  color: isHighlighted ? null : AppTheme.secondary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  iconData,
                  color: isHighlighted ? Colors.white : AppTheme.primary,
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '\$${plan.price.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        SizedBox(width: 4),
                        Text(
                          '/${plan.period == 'Monthly' ? 'mo' : 'yr'}',
                          style: const TextStyle(
                              color: AppTheme.muted, fontSize: 12),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Text(
                          plan.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (plan.popular) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppTheme.primary, Color(0xFFEC4899)],
                              ),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text(
                              'Popular',
                              style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                        if (plan.bestValue && !plan.popular) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                              ),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text(
                              'Best Value',
                              style: TextStyle(
                                  fontSize: 10,
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ],
                    ),
                    // Text(
                    //   plan.period,
                    //   style:
                    //       const TextStyle(color: AppTheme.muted, fontSize: 13),
                    // ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Credits badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                '${plan.credits.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')} credits',
                style: TextStyle(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Features
          ...plan.features.map((feature) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        color: feature.included
                            ? Colors.green.withOpacity(0.2)
                            : Colors.red.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        feature.included ? Icons.check : Icons.close,
                        size: 12,
                        color: feature.included ? Colors.green : Colors.red,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        feature.text,
                        style: TextStyle(
                          color: feature.included ? null : AppTheme.muted,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    if (feature.badge != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          feature.badge!,
                          style: TextStyle(
                            fontSize: 10,
                            color: AppTheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                  ],
                ),
              )),
          const SizedBox(height: 20),

          // Subscribe button
          SizedBox(
            width: double.infinity,
            child: Container(
              decoration: BoxDecoration(
                gradient: isHighlighted
                    ? const LinearGradient(
                        colors: [AppTheme.primary, Color(0xFFEC4899)])
                    : null,
                borderRadius: BorderRadius.circular(12),
              ),
              child: ElevatedButton(
                onPressed: isPurchasing ? null : onPurchase,
                style: ElevatedButton.styleFrom(
                  backgroundColor:
                      isHighlighted ? Colors.transparent : AppTheme.secondary,
                  foregroundColor: isHighlighted ? Colors.white : null,
                  shadowColor: Colors.transparent,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: isHighlighted
                        ? BorderSide.none
                        : BorderSide(color: AppTheme.border),
                  ),
                ),
                child: isPurchasing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Text(
                        'Subscribe',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CreditPackageCard extends StatelessWidget {
  final CreditPackage package;
  final IconData iconData;
  final bool isPurchasing;
  final VoidCallback onPurchase;

  const _CreditPackageCard({
    required this.package,
    required this.iconData,
    required this.isPurchasing,
    required this.onPurchase,
  });

  @override
  Widget build(BuildContext context) {
    final isPopular = package.popular;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: isPopular
            ? LinearGradient(
                colors: [
                  AppTheme.primary.withOpacity(0.2),
                  const Color(0xFFEC4899).withOpacity(0.2),
                ],
              )
            : null,
        color: isPopular ? null : AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPopular ? AppTheme.primary : AppTheme.border,
          width: isPopular ? 2 : 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: isPopular
                  ? const LinearGradient(
                      colors: [Color(0xFFF59E0B), Color(0xFFF97316)])
                  : null,
              color: isPopular ? null : AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              iconData,
              color: isPopular ? Colors.white : AppTheme.primary,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      package.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    if (isPopular) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppTheme.primary, Color(0xFFEC4899)],
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Popular',
                          style: TextStyle(
                              fontSize: 9,
                              color: Colors.white,
                              fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '${package.credits.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')} credits',
                  style: TextStyle(
                    color: AppTheme.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(
              gradient: isPopular
                  ? const LinearGradient(
                      colors: [AppTheme.primary, Color(0xFFEC4899)])
                  : null,
              borderRadius: BorderRadius.circular(10),
            ),
            child: ElevatedButton(
              onPressed: isPurchasing ? null : onPurchase,
              style: ElevatedButton.styleFrom(
                backgroundColor:
                    isPopular ? Colors.transparent : AppTheme.secondary,
                foregroundColor: isPopular ? Colors.white : null,
                shadowColor: Colors.transparent,
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: isPopular
                      ? BorderSide.none
                      : BorderSide(color: AppTheme.border),
                ),
              ),
              child: isPurchasing
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(
                      '\$${package.price.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
