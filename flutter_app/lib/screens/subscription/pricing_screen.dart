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
  bool _isYearly = false;
  bool _isLoading = true;

  List<SubscriptionPlan> _subscriptionPlans = [];
  List<CreditPackage> _creditPackages = [];
  final PricingService _pricingService = PricingService();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchPricing();
    _setupIAPCallbacks();
  }

  @override
  void dispose() {
    _tabController.dispose();
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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(iapProvider.successMessage ?? 'Purchase successful!'),
          backgroundColor: Colors.green,
        ),
      );
    };

    iapProvider.onRestoreComplete = () {
      context.read<CreditsProvider>().refresh();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Purchases restored successfully!'),
          backgroundColor: Colors.green,
        ),
      );
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
    final iapProvider = context.read<IAPProvider>();

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

  List<SubscriptionPlan> get _filteredPlans {
    final period = _isYearly ? 'Yearly' : 'Monthly';
    return _subscriptionPlans.where((p) => p.period == period).toList();
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
          TextButton(
            onPressed: _handleRestore,
            child: const Text('Restore'),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Consumer2<CreditsProvider, IAPProvider>(
              builder: (context, credits, iapProvider, child) {
                return Column(
                  children: [
                    // Current balance & subscription status
                    Container(
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.toll,
                                color: Colors.white, size: 24),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Your Balance',
                                  style: TextStyle(
                                      color: AppTheme.muted, fontSize: 12),
                                ),
                                Text(
                                  '${credits.credits} credits',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (credits.hasActiveSubscription)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    AppTheme.primary.withOpacity(0.3),
                                    const Color(0xFFEC4899).withOpacity(0.3),
                                  ],
                                ),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: AppTheme.primary.withOpacity(0.5),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: const [
                                  Icon(Icons.workspace_premium,
                                      size: 16, color: Color(0xFFFBBF24)),
                                  SizedBox(width: 4),
                                  Text(
                                    'Subscriber',
                                    style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),

                    // Tab bar
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

                    // Tab content
                    Expanded(
                      child: TabBarView(
                        controller: _tabController,
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
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          // Billing period toggle
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                GestureDetector(
                  onTap: () => setState(() => _isYearly = false),
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
                  onTap: () => setState(() => _isYearly = true),
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
          const SizedBox(height: 20),

          // Subscription plans
          ..._filteredPlans.map((plan) => _SubscriptionPlanCard(
                plan: plan,
                iconData: _getIconData(plan.icon),
                isPurchasing: iapProvider.isPurchasing,
                onPurchase: () => _handleSubscriptionPurchase(plan),
              )),

          const SizedBox(height: 24),

          // Footer text
          Text(
            Platform.isIOS
                ? 'Payment will be charged to your Apple ID account. Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.'
                : 'Payment will be charged to your Google Play account. Subscription automatically renews unless cancelled.',
            style: const TextStyle(color: AppTheme.muted, fontSize: 11),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildCreditPacksTab(IAPProvider iapProvider) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          const Text(
            'One-time credit purchases. No subscription required.',
            style: TextStyle(color: AppTheme.muted, fontSize: 14),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),

          // Credit packages
          ..._creditPackages.map((pkg) => _CreditPackageCard(
                package: pkg,
                iconData: _getIconData(pkg.icon),
                isPurchasing: iapProvider.isPurchasing,
                onPurchase: () => _handleCreditPurchase(pkg),
              )),

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
