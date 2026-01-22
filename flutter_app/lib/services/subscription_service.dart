import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

class SubscriptionService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Create a Stripe checkout session
  Future<String?> createCheckout({
    required String priceId,
    bool isSubscription = false,
  }) async {
    final response = await _supabase.functions.invoke(
      'create-checkout',
      body: {
        'priceId': priceId,
        'isSubscription': isSubscription,
      },
    );

    if (response.status != 200) {
      final error = response.data['error'] ?? 'Checkout failed';
      throw Exception(error);
    }

    final data = response.data as Map<String, dynamic>;
    return data['url'] as String?;
  }

  /// Open Stripe customer portal
  Future<void> openCustomerPortal() async {
    final response = await _supabase.functions.invoke('customer-portal');

    if (response.status != 200) {
      final error = response.data['error'] ?? 'Failed to open portal';
      throw Exception(error);
    }

    final data = response.data as Map<String, dynamic>;
    final url = data['url'] as String?;

    if (url != null) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    }
  }

  /// Launch checkout in browser
  Future<void> launchCheckout({
    required String priceId,
    bool isSubscription = false,
  }) async {
    final url = await createCheckout(
      priceId: priceId,
      isSubscription: isSubscription,
    );

    if (url != null) {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    }
  }
}

/// Credit package definitions
class CreditPackage {
  final String id;
  final String name;
  final int credits;
  final double price;
  final String priceId;
  final bool isPopular;

  const CreditPackage({
    required this.id,
    required this.name,
    required this.credits,
    required this.price,
    required this.priceId,
    this.isPopular = false,
  });
}

const creditPackages = [
  CreditPackage(
    id: 'starter',
    name: 'Starter Pack',
    credits: 50,
    price: 4.99,
    priceId: 'price_1SrcTeCpOaBygRMzLIWgPj5N',
  ),
  CreditPackage(
    id: 'pro',
    name: 'Pro Pack',
    credits: 150,
    price: 9.99,
    priceId: 'price_1SrcTpCpOaBygRMzleZEbBV6',
    isPopular: true,
  ),
  CreditPackage(
    id: 'ultimate',
    name: 'Ultimate Pack',
    credits: 500,
    price: 19.99,
    priceId: 'price_1SrcU0CpOaBygRMzYAhHRnqv',
  ),
];

const subscriptionPlan = CreditPackage(
  id: 'unlimited',
  name: 'Timeless Pro',
  credits: -1, // Unlimited
  price: 19.99,
  priceId: 'price_1SrcXaCpOaBygRMz5atgcaW3',
);
