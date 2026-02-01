import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:in_app_purchase_storekit/in_app_purchase_storekit.dart';
import 'package:in_app_purchase_android/in_app_purchase_android.dart';
import 'package:in_app_purchase_storekit/store_kit_wrappers.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'pricing_service.dart';
import 'tiktok_service.dart';
import 'facebook_service.dart';

/// In-App Purchase Service
class IAPService {
  static final IAPService _instance = IAPService._internal();
  factory IAPService() => _instance;
  IAPService._internal();

  final InAppPurchase _iap = InAppPurchase.instance;
  final SupabaseClient _supabase = Supabase.instance.client;
  final PricingService _pricingService = PricingService();

  StreamSubscription<List<PurchaseDetails>>? _subscription;
  List<ProductDetails> _products = [];
  final Set<String> _subscriptionIds = {};
  final Set<String> _consumableIds = {};
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

      // Listen to purchase updates
      _subscription = _iap.purchaseStream.listen(
        _handlePurchaseUpdates,
        onDone: () => _subscription?.cancel(),
        onError: (error) {
          debugPrint('[IAP] Purchase stream error: $error');
          onError?.call('Purchase stream error: $error');
        },
      );

      // Complete any pending transactions from previous sessions
      await _completePendingTransactions();

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

  /// Complete any pending transactions left over from previous sessions
  /// This MUST run before any new purchase to avoid storekit_duplicate_product_object errors
  Future<void> _completePendingTransactions() async {
    if (Platform.isIOS) {
      try {
        final wrapper = SKPaymentQueueWrapper();
        var transactions = await wrapper.transactions();
        debugPrint(
            '[IAP] Found ${transactions.length} pending iOS transactions to clear');

        // Keep trying until all transactions are finished
        int attempts = 0;
        while (transactions.isNotEmpty && attempts < 5) {
          for (final transaction in transactions) {
            debugPrint(
                '[IAP] Finishing transaction: ${transaction.transactionIdentifier} - ${transaction.payment.productIdentifier} - state: ${transaction.transactionState}');
            try {
              await wrapper.finishTransaction(transaction);
            } catch (e) {
              debugPrint('[IAP] Error finishing individual transaction: $e');
            }
          }

          // Small delay to let the queue update
          await Future.delayed(const Duration(milliseconds: 200));

          // Check if there are still pending transactions
          transactions = await wrapper.transactions();
          attempts++;
          debugPrint(
              '[IAP] After attempt $attempts: ${transactions.length} transactions remaining');
        }

        if (transactions.isEmpty) {
          debugPrint('[IAP] ✅ All pending transactions cleared');
        } else {
          debugPrint(
              '[IAP] ⚠️ Some transactions still pending after $attempts attempts');
        }
      } catch (e) {
        debugPrint('[IAP] Error completing pending transactions: $e');
      }
    }
  }

  /// Force clear all pending transactions - call before initiating a purchase
  Future<void> clearPendingTransactions() async {
    await _completePendingTransactions();
  }

  /// Load product IDs from Supabase (pricing service), then query the store
  Future<void> loadProducts() async {
    if (!_isAvailable) {
      debugPrint('[IAP] Store not available, skipping product load');
      return;
    }

    try {
      final pricing = await _pricingService.fetchPricing();
      final productIds = <String>{};
      _subscriptionIds.clear();
      _consumableIds.clear();

      for (final plan in pricing.subscriptionPlans) {
        final id = plan.platformProductId;
        if (id != null && id.isNotEmpty) {
          productIds.add(id);
          _subscriptionIds.add(id);
        }
      }
      for (final pkg in pricing.creditPackages) {
        final id = pkg.platformProductId;
        if (id != null && id.isNotEmpty) {
          productIds.add(id);
          _consumableIds.add(id);
        }
      }

      if (productIds.isEmpty) {
        debugPrint(
            '[IAP] No product IDs from Supabase pricing (subscription_plans / credit_packages or get-pricing)');
        return;
      }

      debugPrint('[IAP] Querying products from Supabase: $productIds');

      final response = await _iap.queryProductDetails(productIds);

      if (response.notFoundIDs.isNotEmpty) {
        debugPrint('[IAP] ⚠️ Products NOT FOUND: ${response.notFoundIDs}');
        debugPrint(
            '[IAP] ⚠️ Ensure product IDs in Supabase match App Store Connect / Google Play Console');
      }

      _products = response.productDetails;
      debugPrint('[IAP] ✅ Loaded ${_products.length} products');

      for (final product in _products) {
        debugPrint(
            '[IAP] Product: ${product.id} - ${product.title} - ${product.price}');
      }

      if (_products.isEmpty && response.notFoundIDs.isNotEmpty) {
        onError?.call(
            'No products available. Check Supabase subscription_plans / credit_packages and store configuration.');
      }
    } catch (e) {
      debugPrint('[IAP] Error loading products: $e');
      onError?.call('Failed to load products: $e');
    }
  }

  bool _isSubscriptionId(String productId) =>
      _subscriptionIds.contains(productId);

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

      // CRITICAL: Clear any pending transactions BEFORE starting a new purchase
      // This prevents storekit_duplicate_product_object errors
      await _completePendingTransactions();

      final isSubscription = _isSubscriptionId(productId);
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
      debugPrint(
          '[IAP] Purchase update: ${purchase.productID} - ${purchase.status}');

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
          'action':
              purchase.status == PurchaseStatus.restored ? 'restore' : 'verify',
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
          'purchaseToken':
              googlePurchase.verificationData.serverVerificationData,
          'packageName': 'com.wolfine.app',
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
        final product = getProduct(purchase.productID);
        final price = _extractPrice(product?.price ?? '0');

        // Track attribution events (TikTok & Facebook)
        final isSubscription = _isSubscriptionId(purchase.productID);
        if (isSubscription) {
          await tiktokService.trackSubscribe(
            productId: purchase.productID,
            price: price,
            subscriptionType:
                purchase.productID.contains('yearly') ? 'yearly' : 'monthly',
          );
          await facebookService.trackSubscribe(
            productId: purchase.productID,
            price: price,
            subscriptionType:
                purchase.productID.contains('yearly') ? 'yearly' : 'monthly',
          );
        } else {
          await tiktokService.trackPurchase(
            productId: purchase.productID,
            price: price,
            credits: credits,
          );
          await facebookService.trackPurchase(
            productId: purchase.productID,
            price: price,
            credits: credits,
          );
        }

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

  /// Extract numeric price from formatted string (e.g., "$9.99" -> 9.99)
  double _extractPrice(String priceString) {
    final cleaned = priceString.replaceAll(RegExp(r'[^\d.]'), '');
    return double.tryParse(cleaned) ?? 0.0;
  }

  /// Dispose the service
  void dispose() {
    _subscription?.cancel();
    _subscription = null;
    _isInitialized = false;
  }
}
