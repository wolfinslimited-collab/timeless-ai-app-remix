import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/credits_provider.dart';
import '../../services/subscription_service.dart';

class PricingScreen extends StatefulWidget {
  const PricingScreen({super.key});

  @override
  State<PricingScreen> createState() => _PricingScreenState();
}

class _PricingScreenState extends State<PricingScreen> {
  final SubscriptionService _subscriptionService = SubscriptionService();
  String? _loadingPackageId;

  Future<void> _handlePurchase(CreditPackage package, {bool isSubscription = false}) async {
    setState(() {
      _loadingPackageId = package.id;
    });

    try {
      await _subscriptionService.launchCheckout(
        priceId: package.priceId,
        isSubscription: isSubscription,
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() {
        _loadingPackageId = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pricing'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Current balance
            Consumer<CreditsProvider>(
              builder: (context, credits, child) {
                return Container(
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
                );
              },
            ),
            const SizedBox(height: 24),

            // Pro Subscription
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primary.withOpacity(0.2),
                    const Color(0xFFEC4899).withOpacity(0.2),
                  ],
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppTheme.primary, Color(0xFFEC4899)],
                          ),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.all_inclusive, color: Colors.white),
                      ),
                      const SizedBox(width: 16),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Timeless Pro',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Unlimited everything',
                              style: TextStyle(color: AppTheme.muted),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Row(
                    children: [
                      Text(
                        '\$19.99',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '/month',
                        style: TextStyle(color: AppTheme.muted),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Column(
                    children: [
                      _FeatureRow(text: 'Unlimited image generations'),
                      _FeatureRow(text: 'Unlimited video generations'),
                      _FeatureRow(text: 'Priority processing'),
                      _FeatureRow(text: 'Early access to new features'),
                      _FeatureRow(text: 'Cancel anytime'),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Consumer<CreditsProvider>(
                    builder: (context, credits, child) {
                      final hasSubscription = credits.hasActiveSubscription;
                      return SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: hasSubscription || _loadingPackageId != null
                              ? null
                              : () => _handlePurchase(subscriptionPlan, isSubscription: true),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: _loadingPackageId == 'unlimited'
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : Text(hasSubscription ? 'Currently Subscribed' : 'Subscribe Now'),
                        ),
                      );
                    },
                  ),
                ],
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

            // Credit Packages
            ...creditPackages.map((package) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _CreditPackageCard(
                package: package,
                isLoading: _loadingPackageId == package.id,
                onPurchase: () => _handlePurchase(package),
              ),
            )),
            const SizedBox(height: 24),

            // Footer
            const Text(
              'All purchases are secure. Credits never expire.\nPowered by Stripe.',
              style: TextStyle(color: AppTheme.muted, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  final String text;

  const _FeatureRow({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppTheme.primary, Color(0xFFEC4899)],
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.check, size: 12, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Text(text),
        ],
      ),
    );
  }
}

class _CreditPackageCard extends StatelessWidget {
  final CreditPackage package;
  final bool isLoading;
  final VoidCallback onPurchase;

  const _CreditPackageCard({
    required this.package,
    required this.isLoading,
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
          color: package.isPopular ? AppTheme.primary : AppTheme.border,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: package.isPopular
                  ? AppTheme.primary.withOpacity(0.2)
                  : AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              package.id == 'starter'
                  ? Icons.toll
                  : package.id == 'pro'
                      ? Icons.bolt
                      : Icons.workspace_premium,
              color: package.isPopular ? AppTheme.primary : AppTheme.muted,
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
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    if (package.isPopular) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 2,
                        ),
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
                  '${package.credits} credits',
                  style: const TextStyle(color: AppTheme.muted, fontSize: 14),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\$${package.price.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              SizedBox(
                height: 32,
                child: ElevatedButton(
                  onPressed: isLoading ? null : onPurchase,
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    textStyle: const TextStyle(fontSize: 12),
                  ),
                  child: isLoading
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
