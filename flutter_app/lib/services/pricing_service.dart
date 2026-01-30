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

/// Service to fetch pricing from the backend.
/// 1) Tries get-pricing edge function (returns subscriptionPlans, creditPackages).
/// 2) Fallback: reads Supabase tables subscription_plans and credit_packages
///    (columns: id, name, period, credits, price, price_id, apple_product_id,
///     android_product_id, popular, best_value, icon, features, display_order, is_active).
class PricingService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Fetch all pricing data: tries get-pricing edge function first, then Supabase tables
  Future<PricingData> fetchPricing() async {
    final fromEdge = await _fetchPricingFromEdgeFunction();
    if (fromEdge != null) return fromEdge;

    final fromSupabase = await _fetchPricingFromSupabase();
    return fromSupabase;
  }

  /// Try get-pricing edge function
  Future<PricingData?> _fetchPricingFromEdgeFunction() async {
    try {
      final response = await _supabase.functions.invoke('get-pricing');
      if (response.status != 200) {
        debugPrint('[PricingService] Edge function error: ${response.data}');
        return null;
      }
      final data = response.data as Map<String, dynamic>?;
      if (data == null) return null;

      final subscriptionPlansJson = data['subscriptionPlans'] as List<dynamic>? ?? [];
      final creditPackagesJson = data['creditPackages'] as List<dynamic>? ?? [];

      final subscriptionPlans = subscriptionPlansJson
          .map((json) => SubscriptionPlan.fromJson(json as Map<String, dynamic>))
          .toList();
      final creditPackages = creditPackagesJson
          .map((json) => CreditPackage.fromJson(json as Map<String, dynamic>))
          .toList();

      if (subscriptionPlans.isEmpty && creditPackages.isEmpty) return null;

      debugPrint('[PricingService] Loaded from edge: ${subscriptionPlans.length} plans, ${creditPackages.length} packages');
      return PricingData(
        subscriptionPlans: subscriptionPlans,
        creditPackages: creditPackages,
      );
    } catch (e) {
      debugPrint('[PricingService] Edge function error: $e');
      return null;
    }
  }

  /// Fallback: fetch from Supabase tables (subscription_plans, credit_packages)
  Future<PricingData> _fetchPricingFromSupabase() async {
    try {
      final plansResponse = await _supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('display_order', ascending: true);
      final packagesResponse = await _supabase
          .from('credit_packages')
          .select('*')
          .eq('is_active', true)
          .order('display_order', ascending: true);

      final subscriptionPlans = (plansResponse as List)
          .map((json) => SubscriptionPlan.fromJson(json as Map<String, dynamic>))
          .toList();
      final creditPackages = (packagesResponse as List)
          .map((json) => CreditPackage.fromJson(json as Map<String, dynamic>))
          .toList();

      debugPrint('[PricingService] Loaded from Supabase: ${subscriptionPlans.length} plans, ${creditPackages.length} packages');
      return PricingData(
        subscriptionPlans: subscriptionPlans,
        creditPackages: creditPackages,
      );
    } catch (e) {
      debugPrint('[PricingService] Supabase tables error: $e');
      return PricingData(
        subscriptionPlans: [],
        creditPackages: [],
      );
    }
  }

  /// Filter subscription plans by billing period
  List<SubscriptionPlan> filterPlansByPeriod(List<SubscriptionPlan> plans, String period) {
    return plans.where((plan) => plan.period == period).toList();
  }
}
