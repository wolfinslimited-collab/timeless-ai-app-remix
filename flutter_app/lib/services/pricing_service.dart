import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Feature model for subscription plans
class PlanFeature {
  final String text;
  final bool included;
  final String? badge;
  final String? tooltip;

  PlanFeature({
    required this.text,
    required this.included,
    this.badge,
    this.tooltip,
  });

  factory PlanFeature.fromJson(Map<String, dynamic> json) {
    return PlanFeature(
      text: json['text'] as String,
      included: json['included'] as bool? ?? true,
      badge: json['badge'] as String?,
      tooltip: json['tooltip'] as String?,
    );
  }
}

/// Subscription plan model
class SubscriptionPlan {
  final String id;
  final String name;
  final String period;
  final int credits;
  final double price;
  final String priceId;
  final String? appleProductId;
  final String? androidProductId;
  final bool popular;
  final bool bestValue;
  final String icon;
  final List<PlanFeature> features;
  final int displayOrder;
  final bool isActive;

  SubscriptionPlan({
    required this.id,
    required this.name,
    required this.period,
    required this.credits,
    required this.price,
    required this.priceId,
    this.appleProductId,
    this.androidProductId,
    this.popular = false,
    this.bestValue = false,
    required this.icon,
    required this.features,
    required this.displayOrder,
    required this.isActive,
  });

  factory SubscriptionPlan.fromJson(Map<String, dynamic> json) {
    final featuresJson = json['features'] as List<dynamic>? ?? [];
    return SubscriptionPlan(
      id: json['id'] as String,
      name: json['name'] as String,
      period: json['period'] as String,
      credits: json['credits'] as int,
      price: (json['price'] as num).toDouble(),
      priceId: json['price_id'] as String,
      appleProductId: json['apple_product_id'] as String?,
      androidProductId: json['android_product_id'] as String?,
      popular: json['popular'] as bool? ?? false,
      bestValue: json['best_value'] as bool? ?? false,
      icon: json['icon'] as String? ?? 'Zap',
      features: featuresJson.map((f) => PlanFeature.fromJson(f as Map<String, dynamic>)).toList(),
      displayOrder: json['display_order'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  /// Get platform-specific product ID
  String? get platformProductId {
    if (Platform.isIOS) return appleProductId;
    if (Platform.isAndroid) return androidProductId;
    return priceId;
  }
}

/// Credit package model
class CreditPackage {
  final String id;
  final String name;
  final int credits;
  final double price;
  final String priceId;
  final String? appleProductId;
  final String? androidProductId;
  final bool popular;
  final String icon;
  final int displayOrder;
  final bool isActive;

  CreditPackage({
    required this.id,
    required this.name,
    required this.credits,
    required this.price,
    required this.priceId,
    this.appleProductId,
    this.androidProductId,
    this.popular = false,
    required this.icon,
    required this.displayOrder,
    required this.isActive,
  });

  factory CreditPackage.fromJson(Map<String, dynamic> json) {
    return CreditPackage(
      id: json['id'] as String,
      name: json['name'] as String,
      credits: json['credits'] as int,
      price: (json['price'] as num).toDouble(),
      priceId: json['price_id'] as String,
      appleProductId: json['apple_product_id'] as String?,
      androidProductId: json['android_product_id'] as String?,
      popular: json['popular'] as bool? ?? false,
      icon: json['icon'] as String? ?? 'Coins',
      displayOrder: json['display_order'] as int? ?? 0,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  /// Get platform-specific product ID
  String? get platformProductId {
    if (Platform.isIOS) return appleProductId;
    if (Platform.isAndroid) return androidProductId;
    return priceId;
  }
}

/// Pricing data container
class PricingData {
  final List<SubscriptionPlan> subscriptionPlans;
  final List<CreditPackage> creditPackages;

  PricingData({
    required this.subscriptionPlans,
    required this.creditPackages,
  });
}

/// Service to fetch pricing from the backend
class PricingService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Fetch all pricing data from the get-pricing edge function
  Future<PricingData> fetchPricing() async {
    try {
      final response = await _supabase.functions.invoke('get-pricing');

      if (response.status != 200) {
        debugPrint('[PricingService] Error fetching pricing: ${response.data}');
        return _getFallbackPricing();
      }

      final data = response.data as Map<String, dynamic>;

      final subscriptionPlansJson = data['subscriptionPlans'] as List<dynamic>? ?? [];
      final creditPackagesJson = data['creditPackages'] as List<dynamic>? ?? [];

      final subscriptionPlans = subscriptionPlansJson
          .map((json) => SubscriptionPlan.fromJson(json as Map<String, dynamic>))
          .toList();

      final creditPackages = creditPackagesJson
          .map((json) => CreditPackage.fromJson(json as Map<String, dynamic>))
          .toList();

      debugPrint('[PricingService] Loaded ${subscriptionPlans.length} subscription plans');
      debugPrint('[PricingService] Loaded ${creditPackages.length} credit packages');

      // Return fallback if no data
      if (subscriptionPlans.isEmpty && creditPackages.isEmpty) {
        return _getFallbackPricing();
      }

      return PricingData(
        subscriptionPlans: subscriptionPlans,
        creditPackages: creditPackages,
      );
    } catch (e) {
      debugPrint('[PricingService] Error: $e');
      return _getFallbackPricing();
    }
  }

  /// Filter subscription plans by billing period
  List<SubscriptionPlan> filterPlansByPeriod(List<SubscriptionPlan> plans, String period) {
    return plans.where((plan) => plan.period == period).toList();
  }

  /// Fallback pricing when API fails
  PricingData _getFallbackPricing() {
    return PricingData(
      subscriptionPlans: [
        SubscriptionPlan(
          id: 'premium-monthly',
          name: 'Premium',
          period: 'Monthly',
          credits: 500,
          price: 9.99,
          priceId: 'price_premium_monthly',
          appleProductId: 'timeless_premium_monthly',
          androidProductId: 'timeless.premium.monthly',
          icon: 'Zap',
          features: [
            PlanFeature(text: 'Access to all models', included: true),
            PlanFeature(text: '500 monthly credits', included: true),
            PlanFeature(text: 'HD quality exports', included: true),
          ],
          displayOrder: 1,
          isActive: true,
        ),
        SubscriptionPlan(
          id: 'premium-yearly',
          name: 'Premium',
          period: 'Yearly',
          credits: 500,
          price: 99.99,
          priceId: 'price_premium_yearly',
          appleProductId: 'timeless_premium_yearly',
          androidProductId: 'timeless.premium.yearly',
          bestValue: true,
          icon: 'Calendar',
          features: [
            PlanFeature(text: 'Access to all models', included: true),
            PlanFeature(text: '500 monthly credits', included: true),
            PlanFeature(text: 'HD quality exports', included: true),
            PlanFeature(text: 'Save 17%', included: true, badge: 'Best Value'),
          ],
          displayOrder: 2,
          isActive: true,
        ),
        SubscriptionPlan(
          id: 'premium-plus-monthly',
          name: 'Premium+',
          period: 'Monthly',
          credits: 1000,
          price: 19.99,
          priceId: 'price_premium_plus_monthly',
          appleProductId: 'timeless_premium_plus_monthly',
          androidProductId: 'timeless.premium_plus.monthly',
          popular: true,
          icon: 'Crown',
          features: [
            PlanFeature(text: 'Unlimited credits', included: true),
            PlanFeature(text: '4K quality exports', included: true),
            PlanFeature(text: 'Priority processing', included: true),
            PlanFeature(text: 'Early access to features', included: true),
          ],
          displayOrder: 3,
          isActive: true,
        ),
        SubscriptionPlan(
          id: 'premium-plus-yearly',
          name: 'Premium+',
          period: 'Yearly',
          credits: 1000,
          price: 199.99,
          priceId: 'price_premium_plus_yearly',
          appleProductId: 'timeless_premium_plus_yearly',
          androidProductId: 'timeless.premium_plus.yearly',
          popular: true,
          bestValue: true,
          icon: 'Crown',
          features: [
            PlanFeature(text: 'Unlimited credits', included: true),
            PlanFeature(text: '4K quality exports', included: true),
            PlanFeature(text: 'Priority processing', included: true),
            PlanFeature(text: 'Early access to features', included: true),
            PlanFeature(text: 'Save 17%', included: true, badge: 'Best Value'),
          ],
          displayOrder: 4,
          isActive: true,
        ),
      ],
      creditPackages: [
        CreditPackage(
          id: 'starter',
          name: 'Starter',
          credits: 50,
          price: 4.99,
          priceId: 'price_starter',
          appleProductId: 'timeless_credits_50',
          androidProductId: 'timeless.credits.50',
          icon: 'Coins',
          displayOrder: 1,
          isActive: true,
        ),
        CreditPackage(
          id: 'pro',
          name: 'Pro',
          credits: 150,
          price: 9.99,
          priceId: 'price_pro',
          appleProductId: 'timeless_credits_150',
          androidProductId: 'timeless.credits.150',
          popular: true,
          icon: 'Zap',
          displayOrder: 2,
          isActive: true,
        ),
        CreditPackage(
          id: 'ultimate',
          name: 'Ultimate',
          credits: 500,
          price: 24.99,
          priceId: 'price_ultimate',
          appleProductId: 'timeless_credits_500',
          androidProductId: 'timeless.credits.500',
          icon: 'Crown',
          displayOrder: 3,
          isActive: true,
        ),
      ],
    );
  }
}
