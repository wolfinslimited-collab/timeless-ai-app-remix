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
  
  final PageController _planPageController = PageController(viewportFraction: 0.85);
  final PageController _creditPageController = PageController(viewportFraction: 0.85, initialPage: 1);
  int _currentPlanIndex = 0;
  int _currentCreditIndex = 1;

  // Subscription plans
  final List<Map<String, dynamic>> _monthlyPlans = [
    {
      'id': 'premium-monthly',
      'name': 'Premium',
      'period': 'Monthly',
      'credits': 500,
      'price': 9.99,
      'popular': true,
      'features': [
        {'text': 'Unlimited generations', 'included': true},
        {'text': 'Priority processing', 'included': true},
        {'text': '4K resolution exports', 'included': true},
        {'text': 'Advanced AI models', 'included': true},
      ],
    },
  ];

  final List<Map<String, dynamic>> _yearlyPlans = [
    {
      'id': 'premium-yearly',
      'name': 'Premium',
      'period': 'Yearly',
      'credits': 6000,
      'price': 99.99,
      'bestValue': true,
      'features': [
        {'text': 'Unlimited generations', 'included': true},
        {'text': 'Priority processing', 'included': true},
        {'text': '4K resolution exports', 'included': true},
        {'text': 'Advanced AI models', 'included': true},
        {'text': '2 months free', 'included': true, 'badge': 'BONUS'},
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

  @override
  void dispose() {
    _planPageController.dispose();
    _creditPageController.dispose();
    super.dispose();
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
        title: const Text('Subscription'),
      ),
      body: Consumer2<CreditsProvider, AuthProvider>(
        builder: (context, credits, auth, child) {
          final hasSubscription = credits.hasActiveSubscription;
          
          return Column(
            children: [
              // Balance Header - Prominent
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppTheme.primary.withOpacity(0.2),
                      const Color(0xFFEC4899).withOpacity(0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: AppTheme.primary.withOpacity(0.2),
                  ),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                            ),
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFF59E0B).withOpacity(0.3),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.toll,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Your Balance',
                                style: TextStyle(
                                  color: AppTheme.muted,
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                hasSubscription ? '∞' : '${credits.credits}',
                                style: const TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (hasSubscription)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [AppTheme.primary, Color(0xFFEC4899)],
                              ),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.workspace_premium,
                                  color: Colors.yellow[300],
                                  size: 18,
                                ),
                                const SizedBox(width: 6),
                                const Text(
                                  'Pro',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      hasSubscription
                          ? '✨ Unlimited credits with your Pro subscription'
                          : 'Get more credits or subscribe for unlimited access',
                      style: TextStyle(
                        color: hasSubscription ? AppTheme.primary : AppTheme.muted,
                        fontSize: 13,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),

              // Tab Toggle
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(30),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _activeTab = 0),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _activeTab == 0 ? AppTheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(26),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.workspace_premium,
                                size: 18,
                                color: _activeTab == 0 ? Colors.white : AppTheme.muted,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Subscribe',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
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
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _activeTab == 1 ? AppTheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(26),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.add,
                                size: 18,
                                color: _activeTab == 1 ? Colors.white : AppTheme.muted,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Credit Packs',
                                style: TextStyle(
                                  fontWeight: FontWeight.w600,
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

              const SizedBox(height: 16),

              // Content
              Expanded(
                child: _activeTab == 0 
                    ? _buildSubscriptionTab() 
                    : _buildCreditsTab(),
              ),

              // Bottom Restore
              Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
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
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: AppTheme.primary,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'Restoring...',
                                    style: TextStyle(color: AppTheme.primary),
                                  ),
                                ],
                              )
                            : const Text(
                                'Restore Purchases',
                                style: TextStyle(color: AppTheme.primary),
                              ),
                      ),
                      const Text(
                        'Cancel anytime',
                        style: TextStyle(
                          color: AppTheme.muted,
                          fontSize: 12,
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
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: AppTheme.secondary,
            borderRadius: BorderRadius.circular(30),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              GestureDetector(
                onTap: () => setState(() {
                  _isYearly = false;
                  _currentPlanIndex = 0;
                }),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color: !_isYearly ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(26),
                  ),
                  child: Text(
                    'Monthly',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: !_isYearly ? Colors.black : AppTheme.muted,
                    ),
                  ),
                ),
              ),
              GestureDetector(
                onTap: () => setState(() {
                  _isYearly = true;
                  _currentPlanIndex = 0;
                }),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: _isYearly ? Colors.white : Colors.transparent,
                    borderRadius: BorderRadius.circular(26),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Yearly',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: _isYearly ? Colors.black : AppTheme.muted,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.green,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          '-17%',
                          style: TextStyle(
                            fontSize: 10,
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

        const SizedBox(height: 16),

        // Plans Pager
        Expanded(
          child: PageView.builder(
            controller: _planPageController,
            itemCount: _currentPlans.length,
            onPageChanged: (index) => setState(() => _currentPlanIndex = index),
            itemBuilder: (context, index) {
              final plan = _currentPlans[index];
              final isPopular = plan['popular'] == true;
              final isBestValue = plan['bestValue'] == true;
              final isHighlighted = isPopular || isBestValue;
              
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Container(
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
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: isHighlighted ? AppTheme.primary : AppTheme.border,
                      width: isHighlighted ? 2 : 1,
                    ),
                  ),
                  child: Stack(
                    children: [
                      // Badge
                      if (isPopular)
                        Positioned(
                          top: -1,
                          left: 0,
                          right: 0,
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [AppTheme.primary, Color(0xFFEC4899)],
                                ),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Text(
                                'Most Popular',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ),
                      if (isBestValue)
                        Positioned(
                          top: -1,
                          left: 0,
                          right: 0,
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                                ),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Text(
                                'Best Value',
                                style: TextStyle(
                                  color: Colors.black,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ),

                      // Content
                      Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            const SizedBox(height: 20),
                            
                            // Plan Header
                            Row(
                              children: [
                                Container(
                                  width: 56,
                                  height: 56,
                                  decoration: BoxDecoration(
                                    gradient: const LinearGradient(
                                      colors: [AppTheme.primary, Color(0xFFEC4899)],
                                    ),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: const Icon(
                                    Icons.workspace_premium,
                                    color: Colors.white,
                                    size: 28,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        plan['name'],
                                        style: const TextStyle(
                                          fontSize: 20,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        plan['period'],
                                        style: const TextStyle(color: AppTheme.muted),
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
                                        fontSize: 24,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Text(
                                      '/${plan['period'] == 'Monthly' ? 'mo' : 'yr'}',
                                      style: const TextStyle(
                                        color: AppTheme.muted,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),

                            const SizedBox(height: 16),

                            // Credits
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(
                                '${plan['credits']} credits/month',
                                style: const TextStyle(
                                  color: AppTheme.primary,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),

                            const SizedBox(height: 16),

                            // Features
                            Expanded(
                              child: ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: (plan['features'] as List).length,
                                itemBuilder: (context, idx) {
                                  final feature = plan['features'][idx];
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 6),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 20,
                                          height: 20,
                                          decoration: BoxDecoration(
                                            color: Colors.green.withOpacity(0.2),
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(
                                            Icons.check,
                                            size: 12,
                                            color: Colors.green,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Text(
                                            feature['text'],
                                            style: const TextStyle(fontSize: 14),
                                          ),
                                        ),
                                        if (feature['badge'] != null)
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                              horizontal: 8,
                                              vertical: 2,
                                            ),
                                            decoration: BoxDecoration(
                                              color: AppTheme.primary.withOpacity(0.2),
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                            child: Text(
                                              feature['badge'],
                                              style: const TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: AppTheme.primary,
                                              ),
                                            ),
                                          ),
                                      ],
                                    ),
                                  );
                                },
                              ),
                            ),

                            // Subscribe Button
                            SizedBox(
                              width: double.infinity,
                              child: Container(
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [AppTheme.primary, Color(0xFFEC4899)],
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: ElevatedButton(
                                  onPressed: _isLoading ? null : () => _handleSubscribe(plan),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    shadowColor: Colors.transparent,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                  child: _isLoading
                                      ? const SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white,
                                          ),
                                        )
                                      : const Text(
                                          'Subscribe Now',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Dots indicator
        if (_currentPlans.length > 1)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_currentPlans.length, (index) {
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: index == _currentPlanIndex ? 24 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: index == _currentPlanIndex 
                        ? AppTheme.primary 
                        : AppTheme.muted.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
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
            style: TextStyle(color: AppTheme.muted, fontSize: 13),
            textAlign: TextAlign.center,
          ),
        ),

        const SizedBox(height: 16),

        // Credits Pager
        Expanded(
          child: PageView.builder(
            controller: _creditPageController,
            itemCount: _creditPackages.length,
            onPageChanged: (index) => setState(() => _currentCreditIndex = index),
            itemBuilder: (context, index) {
              final pkg = _creditPackages[index];
              final isPopular = pkg['popular'] == true;
              
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: isPopular
                        ? LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [
                              const Color(0xFFF59E0B).withOpacity(0.2),
                              const Color(0xFFF97316).withOpacity(0.1),
                            ],
                          )
                        : null,
                    color: isPopular ? null : AppTheme.secondary,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: isPopular ? const Color(0xFFF59E0B) : AppTheme.border,
                      width: isPopular ? 2 : 1,
                    ),
                  ),
                  child: Stack(
                    children: [
                      // Badge
                      if (isPopular)
                        Positioned(
                          top: -1,
                          left: 0,
                          right: 0,
                          child: Center(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                                ),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: const Text(
                                'Best Value',
                                style: TextStyle(
                                  color: Colors.black,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ),

                      // Content
                      Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const SizedBox(height: 20),
                            
                            // Icon
                            Container(
                              width: 80,
                              height: 80,
                              decoration: BoxDecoration(
                                gradient: isPopular
                                    ? const LinearGradient(
                                        colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                                      )
                                    : null,
                                color: isPopular ? null : AppTheme.muted.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(24),
                              ),
                              child: Icon(
                                pkg['icon'] as IconData,
                                size: 40,
                                color: Colors.white,
                              ),
                            ),

                            const SizedBox(height: 20),

                            Text(
                              pkg['name'],
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),

                            const SizedBox(height: 8),

                            Text(
                              '${pkg['credits']} credits',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primary,
                              ),
                            ),

                            const SizedBox(height: 8),

                            Text(
                              '\$${(pkg['price'] / pkg['credits'] * 100).toStringAsFixed(1)}¢ per credit',
                              style: const TextStyle(
                                color: AppTheme.muted,
                                fontSize: 13,
                              ),
                            ),

                            const Spacer(),

                            // Buy Button
                            SizedBox(
                              width: double.infinity,
                              child: Container(
                                decoration: BoxDecoration(
                                  gradient: isPopular
                                      ? const LinearGradient(
                                          colors: [Color(0xFFF59E0B), Color(0xFFF97316)],
                                        )
                                      : const LinearGradient(
                                          colors: [AppTheme.primary, Color(0xFFEC4899)],
                                        ),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: ElevatedButton(
                                  onPressed: _isLoading ? null : () => _handleBuyCredits(pkg),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    shadowColor: Colors.transparent,
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                  child: _isLoading
                                      ? const SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white,
                                          ),
                                        )
                                      : Text(
                                          'Buy for \$${pkg['price'].toStringAsFixed(2)}',
                                          style: TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.w600,
                                            color: isPopular ? Colors.black : Colors.white,
                                          ),
                                        ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Dots indicator
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(_creditPackages.length, (index) {
              return AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: index == _currentCreditIndex ? 24 : 8,
                height: 8,
                decoration: BoxDecoration(
                  color: index == _currentCreditIndex 
                      ? AppTheme.primary 
                      : AppTheme.muted.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(4),
                ),
              );
            }),
          ),
        ),
      ],
    );
  }
}
