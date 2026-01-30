import 'package:flutter/material.dart';
import '../services/iap_service.dart';
import 'package:in_app_purchase/in_app_purchase.dart';

class IAPProvider extends ChangeNotifier {
  final IAPService _iapService = IAPService();

  bool _isInitialized = false;
  bool _isLoading = false;
  bool _isPurchasing = false;
  String? _error;
  String? _successMessage;

  bool get isInitialized => _isInitialized;
  bool get isLoading => _isLoading;
  bool get isPurchasing => _isPurchasing;
  bool get isAvailable => _iapService.isAvailable;
  String? get error => _error;
  String? get successMessage => _successMessage;
  List<ProductDetails> get products => _iapService.products;

  // Callbacks for UI (verification runs after Apple/Google sheet closes)
  Function()? onPurchaseComplete;
  Function()? onRestoreComplete;
  /// Called when backend verification fails so the screen can show error SnackBar
  Function(String message)? onVerificationError;

  IAPProvider() {
    _setupCallbacks();
    initialize();
  }

  /// True when the error is for a product ID that no longer exists (deprecated/legacy).
  /// We suppress error toasts for these to avoid spamming the user.
  static bool _isDeprecatedProductError(String message) {
    if (message.isEmpty) return false;
    final lower = message.toLowerCase();
    return lower.contains('unknown product id') ||
        lower.contains('unknown product:');
  }

  void _setupCallbacks() {
    _iapService.onError = (message) {
      // Don't show error toast or set error state for deprecated/non-existent product IDs
      if (_isDeprecatedProductError(message)) {
        debugPrint(
            '[IAPProvider] Skipping error for deprecated product (no toast): $message');
        _isPurchasing = false;
        notifyListeners();
        return;
      }
      debugPrint('[IAPProvider] Error received: $message');
      _error = message;
      _isPurchasing = false;
      notifyListeners();
      onVerificationError?.call(message);
    };

    _iapService.onPurchaseSuccess = (productId, credits) {
      debugPrint('[IAPProvider] Purchase success: $productId, credits: $credits');
      _successMessage = credits > 0 
          ? 'Purchase successful! $credits credits added.'
          : 'Purchase successful! Your subscription is now active.';
      _isPurchasing = false;
      notifyListeners();
      
      // Call the completion callback to trigger credits refresh
      debugPrint('[IAPProvider] Calling onPurchaseComplete callback');
      onPurchaseComplete?.call();
    };

    _iapService.onPurchaseRestored = () {
      debugPrint('[IAPProvider] Purchases restored');
      _successMessage = 'Purchases restored successfully!';
      _isPurchasing = false;
      notifyListeners();
      
      // Call the restore callback to trigger credits refresh
      debugPrint('[IAPProvider] Calling onRestoreComplete callback');
      onRestoreComplete?.call();
    };

    _iapService.onPurchasePending = (isPending) {
      debugPrint('[IAPProvider] Purchase pending: $isPending');
      _isPurchasing = isPending;
      notifyListeners();
    };
  }

  Future<void> initialize() async {
    if (_isInitialized) return;

    _isLoading = true;
    notifyListeners();

    try {
      await _iapService.initialize();
      _isInitialized = true;
    } catch (e) {
      _error = 'Failed to initialize: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadProducts() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _iapService.loadProducts();
    } catch (e) {
      _error = 'Failed to load products: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  ProductDetails? getProduct(String productId) {
    return _iapService.getProduct(productId);
  }

  Future<bool> purchase(String productId) async {
    if (_isPurchasing) return false;

    _isPurchasing = true;
    _error = null;
    _successMessage = null;
    notifyListeners();

    final success = await _iapService.purchase(productId);

    if (!success) {
      _isPurchasing = false;
      notifyListeners();
    }

    return success;
  }

  Future<void> restorePurchases() async {
    if (_isPurchasing) return;

    _isPurchasing = true;
    _error = null;
    _successMessage = null;
    notifyListeners();

    await _iapService.restorePurchases();
  }

  Future<Map<String, dynamic>?> checkSubscriptionStatus() async {
    return await _iapService.checkSubscriptionStatus();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  void clearSuccess() {
    _successMessage = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _iapService.dispose();
    super.dispose();
  }
}
