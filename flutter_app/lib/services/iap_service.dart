import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Product IDs for subscriptions and consumables
class IAPProducts {
  // iOS Product IDs
  static const String premiumMonthlyIOS = 'timeless_premium_monthly';
  static const String premiumYearlyIOS = 'timeless_premium_yearly';
  static const String premiumPlusMonthlyIOS = 'timeless_premium_plus_monthly';
  static const String premiumPlusYearlyIOS = 'timeless_premium_plus_yearly';
  static const String credits350IOS = 'timeless_credits_350';
  static const String credits700IOS = 'timeless_credits_700';
  static const String credits1400IOS = 'timeless_credits_1400';

  // Android Product IDs
  static const String premiumMonthlyAndroid = 'timeless.premium.monthly';
  static const String premiumYearlyAndroid = 'timeless.premium.yearly';
  static const String premiumPlusMonthlyAndroid = 'timeless.premium_plus.monthly';
  static const String premiumPlusYearlyAndroid = 'timeless.premium_plus.yearly';
  static const String credits350Android = 'timeless.credits.350';
  static const String credits700Android = 'timeless.credits.700';
  static const String credits1400Android = 'timeless.credits.1400';

  static Set<String> get allProductIds {
    if (Platform.isIOS) {
      return {
        premiumMonthlyIOS,
        premiumYearlyIOS,
        premiumPlusMonthlyIOS,
        premiumPlusYearlyIOS,
        credits350IOS,
        credits700IOS,
        credits1400IOS,
      };
    } else {
      return {
        premiumMonthlyAndroid,
        premiumYearlyAndroid,
        premiumPlusMonthlyAndroid,
        premiumPlusYearlyAndroid,
        credits350Android,
        credits700Android,
        credits1400Android,
      };
    }
  }

  static Set<String> get subscriptionIds {
    if (Platform.isIOS) {
      return {
        premiumMonthlyIOS,
        premiumYearlyIOS,
        premiumPlusMonthlyIOS,
        premiumPlusYearlyIOS,
      };
    } else {
      return {
        premiumMonthlyAndroid,
        premiumYearlyAndroid,
        premiumPlusMonthlyAndroid,
        premiumPlusYearlyAndroid,
      };
    }
  }

  static Set<String> get consumableIds {
    if (Platform.isIOS) {
      return {credits350IOS, credits700IOS, credits1400IOS};
    } else {
      return {credits350Android, credits700Android, credits1400Android};
    }
  }

  static String getPremiumMonthly() =>
      Platform.isIOS ? premiumMonthlyIOS : premiumMonthlyAndroid;

  static String getPremiumYearly() =>
      Platform.isIOS ? premiumYearlyIOS : premiumYearlyAndroid;

  static String getPremiumPlusMonthly() =>
      Platform.isIOS ? premiumPlusMonthlyIOS : premiumPlusMonthlyAndroid;

  static String getPremiumPlusYearly() =>
      Platform.isIOS ? premiumPlusYearlyIOS : premiumPlusYearlyAndroid;
}

/// In-App Purchase Service
class IAPService {
  static final IAPService _instance = IAPService._internal();
  factory IAPService() => _instance;
  IAPService._internal();

  final InAppPurchase _iap = InAppPurchase.instance;
  final SupabaseClient _supabase = Supabase.instance.client;

  StreamSubscription<List<PurchaseDetails>>? _subscription;
  List<ProductDetails> _products = [];
  bool _isAvailable = false;
  bool _isInitialized = false;

  // Callbacks
  Function(String message)? onError;
  Function(String productId, int credits)? onPurchaseSuccess;
  Function()? onPurchaseRestored;
  Function(bool isPending)? onPurchasePending;

  List<ProductDetails> get products => _products;
  bool get isAvailable => _isAvailable;
  bool get isInitialized => _isInitialized;

  /// Initialize the IAP service
  Future<bool> initialize() async {
    if (_isInitialized) return _isAvailable;

    try {
      _isAvailable = await _iap.isAvailable();
      debugPrint('[IAP] Store available: $_isAvailable');

      if (!_isAvailable) {
        _isInitialized = true;
        return false;
      }

      // Enable pending purchases for Android
      if (Platform.isAndroid) {
        final androidAddition = _iap.getPlatformAddition<InAppPurchaseAndroidPlatformAddition>();
        await androidAddition.enablePendingPurchases();
      }

      // Listen to purchase updates
      _subscription = _iap.purchaseStream.listen(
        _handlePurchaseUpdates,
        onDone: () => _subscription?.cancel(),
        onError: (error) {
          debugPrint('[IAP] Purchase stream error: $error');
          onError?.call('Purchase stream error: $error');
        },
      );

      // Load products
      await loadProducts();

      _isInitialized = true;
      return true;
    } catch (e) {
      debugPrint('[IAP] Initialization error: $e');
      onError?.call('Failed to initialize purchases: $e');
      return false;
    }
  }

  /// Load available products from the store
  Future<void> loadProducts() async {
    if (!_isAvailable) return;

    try {
      final response = await _iap.queryProductDetails(IAPProducts.allProductIds);

      if (response.notFoundIDs.isNotEmpty) {
        debugPrint('[IAP] Products not found: ${response.notFoundIDs}');
      }

      _products = response.productDetails;
      debugPrint('[IAP] Loaded ${_products.length} products');

      for (final product in _products) {
        debugPrint('[IAP] Product: ${product.id} - ${product.title} - ${product.price}');
      }
    } catch (e) {
      debugPrint('[IAP] Error loading products: $e');
      onError?.call('Failed to load products: $e');
    }
  }

  /// Get product details by ID
  ProductDetails? getProduct(String productId) {
    try {
      return _products.firstWhere((p) => p.id == productId);
    } catch (_) {
      return null;
    }
  }

  /// Purchase a product
  Future<bool> purchase(String productId) async {
    if (!_isAvailable) {
      onError?.call('Store is not available');
      return false;
    }

    final product = getProduct(productId);
    if (product == null) {
      onError?.call('Product not found: $productId');
      return false;
    }

    try {
      debugPrint('[IAP] Initiating purchase for: $productId');

      final isSubscription = IAPProducts.subscriptionIds.contains(productId);
      final purchaseParam = PurchaseParam(productDetails: product);

      bool success;
      if (isSubscription) {
        success = await _iap.buyNonConsumable(purchaseParam: purchaseParam);
      } else {
        success = await _iap.buyConsumable(purchaseParam: purchaseParam);
      }

      debugPrint('[IAP] Purchase initiated: $success');
      return success;
    } catch (e) {
      debugPrint('[IAP] Purchase error: $e');
      onError?.call('Purchase failed: $e');
      return false;
    }
  }

  /// Restore purchases (iOS mainly)
  Future<void> restorePurchases() async {
    if (!_isAvailable) {
      onError?.call('Store is not available');
      return;
    }

    try {
      debugPrint('[IAP] Restoring purchases...');
      await _iap.restorePurchases();
    } catch (e) {
      debugPrint('[IAP] Restore error: $e');
      onError?.call('Failed to restore purchases: $e');
    }
  }

  /// Handle purchase updates from the stream
  Future<void> _handlePurchaseUpdates(List<PurchaseDetails> purchases) async {
    for (final purchase in purchases) {
      debugPrint('[IAP] Purchase update: ${purchase.productID} - ${purchase.status}');

      switch (purchase.status) {
        case PurchaseStatus.pending:
          onPurchasePending?.call(true);
          break;

        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          onPurchasePending?.call(false);
          await _verifyAndDeliverPurchase(purchase);
          break;

        case PurchaseStatus.error:
          onPurchasePending?.call(false);
          debugPrint('[IAP] Purchase error: ${purchase.error}');
          onError?.call(purchase.error?.message ?? 'Purchase failed');
          break;

        case PurchaseStatus.canceled:
          onPurchasePending?.call(false);
          debugPrint('[IAP] Purchase canceled');
          break;
      }

      // Complete the purchase if needed
      if (purchase.pendingCompletePurchase) {
        await _iap.completePurchase(purchase);
      }
    }
  }

  /// Verify purchase with backend and deliver content
  Future<void> _verifyAndDeliverPurchase(PurchaseDetails purchase) async {
    try {
      debugPrint('[IAP] Verifying purchase: ${purchase.productID}');

      final platform = Platform.isIOS ? 'ios' : 'android';
      Map<String, dynamic> body;

      if (Platform.isIOS) {
        // Get receipt data for iOS
        final skPurchase = purchase as AppStorePurchaseDetails;
        body = {
          'action': purchase.status == PurchaseStatus.restored ? 'restore' : 'verify',
          'platform': platform,
          'receiptData': skPurchase.verificationData.serverVerificationData,
          'productId': purchase.productID,
        };
      } else {
        // Get purchase token for Android
        final googlePurchase = purchase as GooglePlayPurchaseDetails;
        body = {
          'action': 'verify',
          'platform': platform,
          'productId': purchase.productID,
          'purchaseToken': googlePurchase.verificationData.serverVerificationData,
          'packageName': 'com.timelessai.app',
        };
      }

      final response = await _supabase.functions.invoke(
        'mobile-subscription',
        body: body,
      );

      if (response.status != 200) {
        final error = response.data['error'] ?? 'Verification failed';
        debugPrint('[IAP] Verification failed: $error');
        onError?.call(error);
        return;
      }

      final data = response.data as Map<String, dynamic>;
      debugPrint('[IAP] Verification success: $data');

      if (data['success'] == true) {
        final credits = data['credits'] as int? ?? 0;
        
        if (purchase.status == PurchaseStatus.restored) {
          onPurchaseRestored?.call();
        } else {
          onPurchaseSuccess?.call(purchase.productID, credits);
        }
      } else {
        onError?.call(data['error'] ?? 'Unknown error');
      }
    } catch (e) {
      debugPrint('[IAP] Verification error: $e');
      onError?.call('Verification failed: $e');
    }
  }

  /// Check subscription status from backend
  Future<Map<String, dynamic>?> checkSubscriptionStatus() async {
    try {
      final response = await _supabase.functions.invoke(
        'mobile-subscription',
        body: {'action': 'check'},
      );

      if (response.status == 200) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('[IAP] Check status error: $e');
      return null;
    }
  }

  /// Dispose the service
  void dispose() {
    _subscription?.cancel();
    _subscription = null;
    _isInitialized = false;
  }
}
