import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/credits_provider.dart';
import '../../services/subscription_service.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  bool _isLoading = false;
  bool _isRestoring = false;
  int _activeTab = 0; // 0 = subscription, 1 = credits
  bool _isYearly = false;

  // Subscription plans
  final List<Map<String, dynamic>> _monthlyPlans = [
    {
      'id': 'basic-monthly',
      'name': 'Basic',
      'period': 'Monthly',
      'credits': 100,
      'price': 4.99,
      'icon': Icons.bolt,
      'color': const Color(0xFF3B82F6),
      'features': [
        {'text': '100 credits per month', 'included': true},
        {'text': 'Standard processing', 'included': true},
        {'text': 'HD exports', 'included': true},
        {'text': 'Email support', 'included': true},
      ],
    },
    {
      'id': 'premium-monthly',
      'name': 'Premium',
      'period': 'Monthly',
      'credits': 500,
      'price': 9.99,
      'popular': true,
      'icon': Icons.workspace_premium,
      'color': AppTheme.primary,
      'features': [
        {'text': '500 credits per month', 'included': true},
        {'text': 'Priority processing', 'included': true},
        {'text': '4K resolution exports', 'included': true},
        {'text': 'Advanced AI models', 'included': true},
      ],
    },
    {
      'id': 'pro-monthly',
      'name': 'Pro',
      'period': 'Monthly',
      'credits': 2000,
      'price': 29.99,
      'icon': Icons.star,
      'color': const Color(0xFFF59E0B),
      'features': [
        {'text': '2000 credits per month', 'included': true},
        {'text': 'Fastest processing', 'included': true},
        {'text': '8K resolution exports', 'included': true},
        {'text': 'All AI models access', 'included': true},
        {'text': 'Priority support', 'included': true, 'badge': 'VIP'},
      ],
    },
  ];

  final List<Map<String, dynamic>> _yearlyPlans = [
    {
      'id': 'basic-yearly',
      'name': 'Basic',
      'period': 'Yearly',
      'credits': 1200,
      'price': 49.99,
      'icon': Icons.bolt,
      'color': const Color(0xFF3B82F6),
      'features': [
        {'text': '100 credits per month', 'included': true},
        {'text': 'Standard processing', 'included': true},
        {'text': 'HD exports', 'included': true},
        {'text': 'Email support', 'included': true},
        {'text': '2 months free', 'included': true, 'badge': 'SAVE'},
      ],
    },
    {
      'id': 'premium-yearly',
      'name': 'Premium',
      'period': 'Yearly',
      'credits': 6000,
      'price': 99.99,
      'bestValue': true,
      'icon': Icons.workspace_premium,
      'color': AppTheme.primary,
      'features': [
        {'text': '500 credits per month', 'included': true},
        {'text': 'Priority processing', 'included': true},
        {'text': '4K resolution exports', 'included': true},
        {'text': 'Advanced AI models', 'included': true},
        {'text': '2 months free', 'included': true, 'badge': 'BONUS'},
      ],
    },
    {
      'id': 'pro-yearly',
      'name': 'Pro',
      'period': 'Yearly',
      'credits': 24000,
      'price': 299.99,
      'popular': true,
      'icon': Icons.star,
      'color': const Color(0xFFF59E0B),
      'features': [
        {'text': '2000 credits per month', 'included': true},
        {'text': 'Fastest processing', 'included': true},
        {'text': '8K resolution exports', 'included': true},
        {'text': 'All AI models access', 'included': true},
        {'text': 'Priority support', 'included': true, 'badge': 'VIP'},
        {'text': '2 months free', 'included': true, 'badge': 'SAVE'},
      ],
    },
  ];

  // Credit packages
  final List<Map<String, dynamic>> _creditPackages = [
    {
      'id': 'starter',
      'name': 'Starter',
      'credits': 50,
      'price': 4.99,
      'icon': Icons.toll,
    },
    {
      'id': 'pro',
      'name': 'Pro',
      'credits': 150,
      'price': 9.99,
      'popular': true,
      'icon': Icons.bolt,
    },
    {
      'id': 'ultimate',
      'name': 'Ultimate',
      'credits': 500,
      'price': 24.99,
      'icon': Icons.workspace_premium,
    },
  ];

  List<Map<String, dynamic>> get _currentPlans => _isYearly ? _yearlyPlans : _monthlyPlans;

  String get _platform {
    if (Platform.isIOS) return 'ios';
    if (Platform.isAndroid) return 'android';
    return 'web';
  }

  Future<void> _handleSubscribe(Map<String, dynamic> plan) async {
    setState(() => _isLoading = true);
    
    try {
      // Navigate to checkout or handle IAP
      if (mounted) context.push('/pricing');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleBuyCredits(Map<String, dynamic> pkg) async {
    setState(() => _isLoading = true);
    
    try {
      // Navigate to checkout or handle IAP
      if (mounted) context.push('/pricing');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleRestore() async {
    setState(() => _isRestoring = true);
    
    try {
      await Future.delayed(const Duration(seconds: 2));
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Purchases restored successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Restore failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isRestoring = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 48,
        title: const Text('Subscription', style: TextStyle(fontSize: 16)),
      ),
      body: Consumer2<CreditsProvider, AuthProvider>(
        builder: (context, credits, auth, child) {
          final hasSubscription = credits.hasActiveSubscription;
          
          return Column(
            children: [
              // Compact Balance Header
              Container(
                margin: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      AppTheme.primary.withOpacity(0.15),
                      const Color(0xFFEC4899).withOpacity(0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppTheme.primary.withOpacity(0.2),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.toll,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Balance',
                            style: TextStyle(
                              color: AppTheme.muted,
                              fontSize: 11,
                            ),
                          ),
                          Text(
                            hasSubscription ? '∞' : '${credits.credits}',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (hasSubscription)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppTheme.primary, Color(0xFFEC4899)],
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.workspace_premium,
                              color: Colors.yellow[300],
                              size: 14,
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'Pro',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),

              // Tab Toggle
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _activeTab = 0),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _activeTab == 0 ? AppTheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(21),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.workspace_premium,
                                size: 14,
                                color: _activeTab == 0 ? Colors.white : AppTheme.muted,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Subscribe',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                  color: _activeTab == 0 ? Colors.white : AppTheme.muted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _activeTab = 1),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: _activeTab == 1 ? AppTheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(21),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.add,
                                size: 14,
                                color: _activeTab == 1 ? Colors.white : AppTheme.muted,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Credit Packs',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                  color: _activeTab == 1 ? Colors.white : AppTheme.muted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Content
              Expanded(
                child: _activeTab == 0 
                    ? _buildSubscriptionTab() 
                    : _buildCreditsTab(),
              ),

              // Bottom Restore
              Container(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                decoration: BoxDecoration(
                  border: Border(
                    top: BorderSide(color: AppTheme.border),
                  ),
                ),
                child: SafeArea(
                  top: false,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton(
                        onPressed: _isRestoring ? null : _handleRestore,
                        child: _isRestoring
                            ? Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  SizedBox(
                                    width: 12,
                                    height: 12,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AppTheme.primary,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  const Text(
                                    'Restoring...',
                                    style: TextStyle(color: AppTheme.primary, fontSize: 13),
                                  ),
                                ],
                              )
                            : const Text(
                                'Restore Purchases',
                                style: TextStyle(color: AppTheme.primary, fontSize: 13),
                              ),
                      ),
                      const Text(
                        'Cancel anytime',
                        style: TextStyle(
                          color: AppTheme.muted,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSubscriptionTab() {
    return Column(
      children: [
        // Billing Period Toggle
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            color: AppTheme.secondary,
            borderRadius: BorderRadius.circular(24),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              GestureDetector(
                onTap: () => setState(() => _isYearly = false),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: !_isYearly ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(21),
                  ),
                  child: Text(
                    'Monthly',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: !_isYearly ? Colors.black : AppTheme.muted,
                    ),
                  ),
                ),
              ),
              GestureDetector(
                onTap: () => setState(() => _isYearly = true),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: _isYearly ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(21),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Yearly',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          color: _isYearly ? Colors.black : AppTheme.muted,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.green,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          '-17%',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Plans Vertical List
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _currentPlans.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final plan = _currentPlans[index];
              final isPopular = plan['popular'] == true;
              final isBestValue = plan['bestValue'] == true;
              final isHighlighted = isPopular || isBestValue;

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: isHighlighted
                      ? LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            AppTheme.primary.withOpacity(0.2),
                            const Color(0xFFEC4899).withOpacity(0.1),
                          ],
                        )
                      : null,
                  color: isHighlighted ? null : AppTheme.secondary,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isHighlighted ? AppTheme.primary : AppTheme.border,
                    width: isHighlighted ? 2 : 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Badge
                    if (isPopular || isBestValue)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: isPopular 
                                    ? [AppTheme.primary, const Color(0xFFEC4899)]
                                    : [const Color(0xFFF59E0B), const Color(0xFFF97316)],
                              ),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Text(
                              isPopular ? 'Most Popular' : 'Best Value',
                              style: TextStyle(
                                color: isPopular ? Colors.white : Colors.black,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ),

                    // Plan Header
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                plan['color'] ?? AppTheme.primary,
                                (plan['color'] ?? AppTheme.primary).withOpacity(0.7),
                              ],
                            ),
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color: (plan['color'] ?? AppTheme.primary).withOpacity(0.3),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Icon(
                            plan['icon'] ?? Icons.workspace_premium,
                            color: Colors.white,
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                plan['name'],
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Row(
                                children: [
                                  Text(
                                    '${plan['credits']} credits/mo',
                                    style: const TextStyle(
                                      color: AppTheme.primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '\$${plan['price'].toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              '/${plan['period'] == 'Monthly' ? 'mo' : 'yr'}',
                              style: const TextStyle(
                                color: AppTheme.muted,
                                fontSize: 10,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // Features (compact)
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: (plan['features'] as List).take(3).map<Widget>((feature) {
                        return Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 14,
                              height: 14,
                              decoration: BoxDecoration(
                                color: Colors.green.withOpacity(0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.check, size: 9, color: Colors.green),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              feature['text'],
                              style: const TextStyle(fontSize: 11, color: AppTheme.muted),
                            ),
                          ],
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 12),

                    // Subscribe Button
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
                          onPressed: _isLoading ? null : () => _handleSubscribe(plan),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text(
                                  'Subscribe Now',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCreditsTab() {
    return Column(
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'One-time credit purchases. No subscription required.',
            style: TextStyle(color: AppTheme.muted, fontSize: 11),
            textAlign: TextAlign.center,
          ),
        ),

        const SizedBox(height: 12),

        // Credits Vertical List
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _creditPackages.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final pkg = _creditPackages[index];
              final isPopular = pkg['popular'] == true;
              
              return Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: isPopular
                      ? LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            const Color(0xFFF59E0B).withOpacity(0.15),
                            const Color(0xFFF97316).withOpacity(0.08),
                          ],
                        )
                      : null,
                  color: isPopular ? null : AppTheme.secondary,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isPopular ? const Color(0xFFF59E0B) : AppTheme.border,
                    width: isPopular ? 2 : 1,
                  ),
                ),
                child: Column(
                  children: [
                    if (isPopular)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                            ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Text(
                            'Best Value',
                            style: TextStyle(
                              color: Colors.black,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            gradient: isPopular
                                ? const LinearGradient(
                                    colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                                  )
                                : null,
                            color: isPopular ? null : AppTheme.muted.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            pkg['icon'] as IconData,
                            size: 22,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                pkg['name'],
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Row(
                                children: [
                                  Text(
                                    '${pkg['credits']} credits',
                                    style: const TextStyle(
                                      color: AppTheme.primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '· \$${(pkg['price'] / pkg['credits'] * 100).toStringAsFixed(1)}¢/cr',
                                    style: const TextStyle(
                                      color: AppTheme.muted,
                                      fontSize: 11,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Container(
                          decoration: BoxDecoration(
                            gradient: isPopular
                                ? const LinearGradient(
                                    colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                                  )
                                : const LinearGradient(
                                    colors: [AppTheme.primary, Color(0xFFEC4899)],
                                  ),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : () => _handleBuyCredits(pkg),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              minimumSize: Size.zero,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: _isLoading
                                ? const SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : Text(
                                    '\$${pkg['price'].toStringAsFixed(2)}',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: isPopular ? Colors.black : Colors.white,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
