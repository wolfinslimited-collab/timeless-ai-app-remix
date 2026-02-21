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

class CreditPackagesScreen extends StatefulWidget {
  const CreditPackagesScreen({super.key});

  @override
  State<CreditPackagesScreen> createState() => _CreditPackagesScreenState();
}

class _CreditPackagesScreenState extends State<CreditPackagesScreen> {
  bool _isLoading = true;
  int? _selectedPackageIndex;
  String? _purchasingPackageId;

  List<CreditPackage> _creditPackages = [];
  final PricingService _pricingService = PricingService();

  @override
  void initState() {
    super.initState();
    _fetchPackages();
    _setupIAPCallbacks();
  }

  Future<void> _fetchPackages() async {
    setState(() => _isLoading = true);
    try {
      final pricing = await _pricingService.fetchPricing();
      if (!mounted) return;
      setState(() {
        _creditPackages = pricing.creditPackages;
        _isLoading = false;
      });

      // Pre-select the popular or first package
      if (_creditPackages.isNotEmpty) {
        int idx = _creditPackages.indexWhere((p) => p.popular);
        if (idx < 0) idx = 0;
        setState(() => _selectedPackageIndex = idx);
      }
    } catch (e) {
      debugPrint('Error fetching credit packages: $e');
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
            content:
                Text(iapProvider.successMessage ?? 'Purchase successful!'),
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

  Future<void> _handlePurchase() async {
    if (_selectedPackageIndex == null) return;
    if (_selectedPackageIndex! >= _creditPackages.length) return;

    final package = _creditPackages[_selectedPackageIndex!];
    final creditsProvider = context.read<CreditsProvider>();
    final iapProvider = context.read<IAPProvider>();

    if (!creditsProvider.hasActiveSubscription) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content:
              Text('A premium subscription is required to purchase credits'),
          backgroundColor: Colors.orange,
        ),
      );
      context.push('/pricing');
      return;
    }

    final productId = package.platformProductId;
    if (productId == null || productId.isEmpty) {
      _showError('Product not available for this platform');
      return;
    }
    if (!iapProvider.isAvailable) {
      _showError('In-app purchases are not available on this device');
      return;
    }

    setState(() => _purchasingPackageId = package.id);
    final success = await iapProvider.purchase(productId);
    if (mounted) setState(() => _purchasingPackageId = null);

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
                final hasActive = creditsProvider.hasActiveSubscription;

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
                              'Credit Packs',
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
                            'Power up your creations with extra credits',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.5),
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 20),

                          // Current credits balance
                          _CreditBalanceBadge(
                            credits: creditsProvider.credits,
                            planName: creditsProvider.currentPlan,
                            hasActivePlan: hasActive,
                          ),
                          const SizedBox(height: 24),

                          // Subscription required banner
                          if (!hasActive) ...[
                            _SubscriptionRequiredBanner(
                              onViewPlans: () => context.push('/pricing'),
                            ),
                            const SizedBox(height: 24),
                          ],

                          // Package selector
                          _buildPackageSelector(hasActive),
                          const SizedBox(height: 24),

                          // Purchase button
                          Padding(
                            padding:
                                const EdgeInsets.symmetric(horizontal: 24),
                            child: _PurchaseButton(
                              onTap: _handlePurchase,
                              isPurchasing: _purchasingPackageId != null,
                              isEnabled: _selectedPackageIndex != null &&
                                  hasActive,
                              label: _selectedPackageIndex != null &&
                                      _selectedPackageIndex! <
                                          _creditPackages.length
                                  ? 'Buy ${_formatNumber(_creditPackages[_selectedPackageIndex!].credits)} Credits for \$${_creditPackages[_selectedPackageIndex!].price.toStringAsFixed(2)}'
                                  : 'Select a Package',
                            ),
                          ),

                          // Footer
                          Padding(
                            padding:
                                const EdgeInsets.fromLTRB(32, 16, 32, 8),
                            child: Text(
                              Platform.isIOS
                                  ? 'Payment will be charged to your Apple ID account. Credits never expire and can be used for any generation.'
                                  : 'Payment will be charged to your Google Play account. Credits never expire and can be used for any generation.',
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
                      child: _TopBar(onClose: () => context.pop()),
                    ),
                  ],
                );
              },
            ),
    );
  }

  Widget _buildPackageSelector(bool hasActive) {
    if (_creditPackages.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          'No credit packages available',
          style: TextStyle(color: Colors.white.withOpacity(0.4)),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: List.generate(_creditPackages.length, (index) {
          final pkg = _creditPackages[index];
          final isSelected = _selectedPackageIndex == index;

          return _CreditPackageOptionTile(
            package: pkg,
            isSelected: isSelected,
            isDisabled: !hasActive,
            onTap: hasActive
                ? () => setState(() => _selectedPackageIndex = index)
                : null,
          );
        }),
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
// Top bar
// ---------------------------------------------------------------------------
class _TopBar extends StatelessWidget {
  final VoidCallback onClose;

  const _TopBar({required this.onClose});

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
          GestureDetector(
            onTap: () => context.push('/pricing'),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.workspace_premium,
                      size: 14, color: Colors.white.withOpacity(0.8)),
                  const SizedBox(width: 5),
                  Text(
                    'View Plans',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.85),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Auto-scrolling image carousel (same style as pricing screen)
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
  static const double _carouselHeight = 240.0;

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
// Credit balance badge
// ---------------------------------------------------------------------------
class _CreditBalanceBadge extends StatelessWidget {
  final int credits;
  final String? planName;
  final bool hasActivePlan;

  const _CreditBalanceBadge({
    required this.credits,
    this.planName,
    required this.hasActivePlan,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppTheme.primary.withOpacity(0.12),
              const Color(0xFFEC4899).withOpacity(0.08),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primary.withOpacity(0.3),
                    const Color(0xFFEC4899).withOpacity(0.2),
                  ],
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.toll, color: AppTheme.primary, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Your Credits',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatNumber(credits),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      height: 1.0,
                    ),
                  ),
                ],
              ),
            ),
            if (hasActivePlan && planName != null)
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.green.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.workspace_premium,
                        color: Colors.green, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      _formatPlanName(planName!),
                      style: const TextStyle(
                        color: Colors.green,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
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

  static String _formatNumber(int n) {
    return n.toString().replaceAllMapped(
          RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
          (m) => '${m[1]},',
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
}

// ---------------------------------------------------------------------------
// Subscription required banner
// ---------------------------------------------------------------------------
class _SubscriptionRequiredBanner extends StatelessWidget {
  final VoidCallback onViewPlans;

  const _SubscriptionRequiredBanner({required this.onViewPlans});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.orange.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.orange.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Icon(Icons.lock_outline,
                color: Colors.orange.withOpacity(0.8), size: 28),
            const SizedBox(height: 10),
            const Text(
              'Premium Required',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Subscribe to a premium plan to purchase credit packs.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withOpacity(0.5),
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 14),
            GestureDetector(
              onTap: onViewPlans,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.primary, Color(0xFFEC4899)],
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  'View Subscription Plans',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
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

// ---------------------------------------------------------------------------
// Credit package option tile (radio-style, matching subscription plan tiles)
// ---------------------------------------------------------------------------
class _CreditPackageOptionTile extends StatelessWidget {
  final CreditPackage package;
  final bool isSelected;
  final bool isDisabled;
  final VoidCallback? onTap;

  const _CreditPackageOptionTile({
    required this.package,
    required this.isSelected,
    required this.isDisabled,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = isSelected
        ? Colors.white.withOpacity(0.5)
        : Colors.white.withOpacity(0.1);
    final bgColor =
        isSelected ? Colors.white.withOpacity(0.05) : Colors.transparent;
    final opacity = isDisabled ? 0.45 : 1.0;

    return GestureDetector(
      onTap: onTap,
      child: Opacity(
        opacity: opacity,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(16),
            border:
                Border.all(color: borderColor, width: isSelected ? 2 : 1),
          ),
          child: Row(
            children: [
              // Radio dot
              _RadioDot(isSelected: isSelected),
              const SizedBox(width: 14),
              // Package icon
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  gradient: package.popular
                      ? const LinearGradient(
                          colors: [AppTheme.primary, Color(0xFFEC4899)])
                      : null,
                  color: package.popular
                      ? null
                      : AppTheme.primary.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.toll,
                  color: package.popular ? Colors.white : AppTheme.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              // Package info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            package.name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (package.popular) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [
                                  AppTheme.primary,
                                  Color(0xFFEC4899)
                                ],
                              ),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              'Popular',
                              style: TextStyle(
                                fontSize: 9,
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${_formatNumber(package.credits)} credits',
                      style: const TextStyle(
                        color: AppTheme.primary,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              // Price
              Text(
                '\$${package.price.toStringAsFixed(2)}',
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.white.withOpacity(0.6),
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
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

  const _RadioDot({required this.isSelected});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(
          color: isSelected ? Colors.white : Colors.white.withOpacity(0.25),
          width: 2,
        ),
      ),
      child: isSelected
          ? Center(
              child: Container(
                width: 12,
                height: 12,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                ),
              ),
            )
          : null,
    );
  }
}

// ---------------------------------------------------------------------------
// Purchase button
// ---------------------------------------------------------------------------
class _PurchaseButton extends StatelessWidget {
  final VoidCallback onTap;
  final bool isPurchasing;
  final bool isEnabled;
  final String label;

  const _PurchaseButton({
    required this.onTap,
    required this.isPurchasing,
    required this.isEnabled,
    required this.label,
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
                  label,
                  style: TextStyle(
                    color: isEnabled ? Colors.black : Colors.white30,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
        ),
      ),
    );
  }
}
