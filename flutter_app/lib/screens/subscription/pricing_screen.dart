import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import '../../core/theme.dart';
import '../../providers/credits_provider.dart';
import '../../providers/iap_provider.dart';
import '../../services/iap_service.dart';

class PricingScreen extends StatefulWidget {
  const PricingScreen({super.key});

  @override
  State<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends State<PricingScreen> {
  bool _isYearly = false;

  @override
  void initState() {
    super.initState();
    _setupIAPCallbacks();
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

  Future<void> _handlePurchase(String productId) async {
    final iapProvider = context.read<IAPProvider>();
    
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

  String _getPrice(IAPProvider iapProvider, String productId, String fallback) {
    final product = iapProvider.getProduct(productId);
    return product?.price ?? fallback;
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
      body: Consumer2<CreditsProvider, IAPProvider>(
        builder: (context, credits, iapProvider, child) {
          if (iapProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                // Current balance
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.toll, color: AppTheme.accent),
                      const SizedBox(width: 8),
                      Text(
                        'Current Balance: ${credits.credits} credits',
                        style: const TextStyle(fontSize: 16),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Billing toggle
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _isYearly = false),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: !_isYearly ? AppTheme.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Center(
                              child: Text(
                                'Monthly',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: !_isYearly ? Colors.white : AppTheme.muted,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _isYearly = true),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            decoration: BoxDecoration(
                              color: _isYearly ? AppTheme.primary : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Center(
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'Yearly',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: _isYearly ? Colors.white : AppTheme.muted,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.green,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      '-17%',
                                      style: TextStyle(fontSize: 10, color: Colors.white),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Premium Subscription
                _SubscriptionCard(
                  title: 'Premium',
                  subtitle: '500 credits/month',
                  price: _getPrice(
                    iapProvider,
                    _isYearly ? IAPProducts.getPremiumYearly() : IAPProducts.getPremiumMonthly(),
                    _isYearly ? '\$99.99/year' : '\$9.99/month',
                  ),
                  isYearly: _isYearly,
                  features: const [
                    '500 monthly credits',
                    'HD image generation',
                    'Standard video generation',
                    'Priority support',
                  ],
                  isPurchasing: iapProvider.isPurchasing,
                  hasSubscription: credits.hasActiveSubscription,
                  onPurchase: () => _handlePurchase(
                    _isYearly ? IAPProducts.getPremiumYearly() : IAPProducts.getPremiumMonthly(),
                  ),
                ),
                const SizedBox(height: 16),

                // Premium Plus Subscription
                _SubscriptionCard(
                  title: 'Premium Plus',
                  subtitle: '1000 credits/month',
                  price: _getPrice(
                    iapProvider,
                    _isYearly ? IAPProducts.getPremiumPlusYearly() : IAPProducts.getPremiumPlusMonthly(),
                    _isYearly ? '\$199.99/year' : '\$19.99/month',
                  ),
                  isYearly: _isYearly,
                  isPopular: true,
                  features: const [
                    '1000 monthly credits',
                    '4K image generation',
                    'Unlimited video generation',
                    'Priority processing',
                    'Early access to new features',
                  ],
                  isPurchasing: iapProvider.isPurchasing,
                  hasSubscription: credits.hasActiveSubscription,
                  onPurchase: () => _handlePurchase(
                    _isYearly ? IAPProducts.getPremiumPlusYearly() : IAPProducts.getPremiumPlusMonthly(),
                  ),
                ),
                const SizedBox(height: 24),

                // Divider
                Row(
                  children: [
                    const Expanded(child: Divider()),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Or buy credit packs',
                        style: TextStyle(color: AppTheme.muted),
                      ),
                    ),
                    const Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 24),

                // Credit Packs
                _CreditPackCard(
                  title: '350 Credits',
                  price: _getPrice(
                    iapProvider,
                    Platform.isIOS ? 'timeless_credits_350' : 'timeless.credits.350',
                    '\$4.99',
                  ),
                  credits: 350,
                  isPurchasing: iapProvider.isPurchasing,
                  onPurchase: () => _handlePurchase(
                    Platform.isIOS ? 'timeless_credits_350' : 'timeless.credits.350',
                  ),
                ),
                const SizedBox(height: 12),
                _CreditPackCard(
                  title: '700 Credits',
                  price: _getPrice(
                    iapProvider,
                    Platform.isIOS ? 'timeless_credits_700' : 'timeless.credits.700',
                    '\$9.99',
                  ),
                  credits: 700,
                  isPopular: true,
                  isPurchasing: iapProvider.isPurchasing,
                  onPurchase: () => _handlePurchase(
                    Platform.isIOS ? 'timeless_credits_700' : 'timeless.credits.700',
                  ),
                ),
                const SizedBox(height: 12),
                _CreditPackCard(
                  title: '1400 Credits',
                  price: _getPrice(
                    iapProvider,
                    Platform.isIOS ? 'timeless_credits_1400' : 'timeless.credits.1400',
                    '\$19.99',
                  ),
                  credits: 1400,
                  isPurchasing: iapProvider.isPurchasing,
                  onPurchase: () => _handlePurchase(
                    Platform.isIOS ? 'timeless_credits_1400' : 'timeless.credits.1400',
                  ),
                ),
                const SizedBox(height: 24),

                // Footer
                Text(
                  Platform.isIOS
                      ? 'Payment will be charged to your Apple ID account. Subscription automatically renews unless auto-renew is turned off at least 24-hours before the end of the current period.'
                      : 'Payment will be charged to your Google Play account. Subscription automatically renews unless cancelled.',
                  style: const TextStyle(color: AppTheme.muted, fontSize: 11),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    TextButton(
                      onPressed: () {
                        // Open terms
                      },
                      child: const Text('Terms of Use', style: TextStyle(fontSize: 12)),
                    ),
                    const Text('•', style: TextStyle(color: AppTheme.muted)),
                    TextButton(
                      onPressed: () {
                        // Open privacy
                      },
                      child: const Text('Privacy Policy', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SubscriptionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String price;
  final bool isYearly;
  final bool isPopular;
  final List<String> features;
  final bool isPurchasing;
  final bool hasSubscription;
  final VoidCallback onPurchase;

  const _SubscriptionCard({
    required this.title,
    required this.subtitle,
    required this.price,
    required this.isYearly,
    this.isPopular = false,
    required this.features,
    required this.isPurchasing,
    required this.hasSubscription,
    required this.onPurchase,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
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
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isPopular ? AppTheme.primary : AppTheme.border,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: isPopular
                      ? const LinearGradient(colors: [AppTheme.primary, Color(0xFFEC4899)])
                      : null,
                  color: isPopular ? null : AppTheme.secondary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isPopular ? Icons.workspace_premium : Icons.star,
                  color: isPopular ? Colors.white : AppTheme.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (isPopular) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppTheme.primary, Color(0xFFEC4899)],
                              ),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text(
                              'Popular',
                              style: TextStyle(fontSize: 10, color: Colors.white),
                            ),
                          ),
                        ],
                      ],
                    ),
                    Text(
                      subtitle,
                      style: const TextStyle(color: AppTheme.muted, fontSize: 13),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    price,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    isYearly ? '/year' : '/month',
                    style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...features.map((feature) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppTheme.primary, Color(0xFFEC4899)],
                    ),
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: const Icon(Icons.check, size: 10, color: Colors.white),
                ),
                const SizedBox(width: 10),
                Text(feature, style: const TextStyle(fontSize: 13)),
              ],
            ),
          )),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: hasSubscription || isPurchasing ? null : onPurchase,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                backgroundColor: isPopular ? AppTheme.primary : null,
              ),
              child: isPurchasing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(hasSubscription ? 'Current Plan' : 'Subscribe'),
            ),
          ),
        ],
      ),
    );
  }
}

class _CreditPackCard extends StatelessWidget {
  final String title;
  final String price;
  final int credits;
  final bool isPopular;
  final bool isPurchasing;
  final VoidCallback onPurchase;

  const _CreditPackCard({
    required this.title,
    required this.price,
    required this.credits,
    this.isPopular = false,
    required this.isPurchasing,
    required this.onPurchase,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPopular ? AppTheme.primary : AppTheme.border,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: isPopular ? AppTheme.primary.withOpacity(0.2) : AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              Icons.toll,
              color: isPopular ? AppTheme.primary : AppTheme.muted,
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
                      title,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    if (isPopular) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppTheme.primary, Color(0xFFEC4899)],
                          ),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          'Best Value',
                          style: TextStyle(fontSize: 10, color: Colors.white),
                        ),
                      ),
                    ],
                  ],
                ),
                Text(
                  'One-time purchase',
                  style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                price,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              SizedBox(
                height: 32,
                child: ElevatedButton(
                  onPressed: isPurchasing ? null : onPurchase,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                  child: isPurchasing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Buy'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
