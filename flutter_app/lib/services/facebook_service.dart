import 'package:flutter/foundation.dart';
import 'package:facebook_app_events/facebook_app_events.dart';

/// Facebook App Events SDK wrapper for Flutter
/// Handles event tracking for Facebook Ads attribution
class FacebookService {
  static final FacebookService _instance = FacebookService._internal();
  factory FacebookService() => _instance;
  FacebookService._internal();

  final FacebookAppEvents _facebookAppEvents = FacebookAppEvents();
  
  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  /// Initialize Facebook SDK
  /// Call this in main.dart after WidgetsFlutterBinding.ensureInitialized()
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      debugPrint('[Facebook] Initializing SDK...');

      // Enable advertiser tracking (for iOS 14+ ATT)
      await _facebookAppEvents.setAdvertiserTracking(enabled: true);
      
      // Enable auto-logging of app events
      await _facebookAppEvents.setAutoLogAppEventsEnabled(true);

      _isInitialized = true;
      debugPrint('[Facebook] SDK initialized successfully');

      // Track install/activate event automatically
      await trackInstall();
    } catch (e) {
      debugPrint('[Facebook] Initialization error: $e');
    }
  }

  /// Track app install/activation event
  Future<void> trackInstall() async {
    if (!_isInitialized) return;

    try {
      // Facebook automatically tracks app activation, but we log it explicitly too
      await _facebookAppEvents.logEvent(
        name: 'fb_mobile_activate_app',
      );
      debugPrint('[Facebook] Event: ActivateApp');
    } catch (e) {
      debugPrint('[Facebook] ActivateApp error: $e');
    }
  }

  /// Track user registration event
  Future<void> trackRegister({
    String? userId,
    String? method,
  }) async {
    if (!_isInitialized) return;

    try {
      await _facebookAppEvents.logCompletedRegistration(
        registrationMethod: method ?? 'email',
      );
      debugPrint('[Facebook] Event: CompleteRegistration (method: $method)');
    } catch (e) {
      debugPrint('[Facebook] CompleteRegistration error: $e');
    }
  }

  /// Track subscription event
  Future<void> trackSubscribe({
    required String productId,
    required double price,
    String? currency,
    String? subscriptionType,
  }) async {
    if (!_isInitialized) return;

    try {
      await _facebookAppEvents.logSubscribe(
        currency: currency ?? 'USD',
        price: price,
      );
      debugPrint('[Facebook] Event: Subscribe (product: $productId, price: $price)');
    } catch (e) {
      debugPrint('[Facebook] Subscribe error: $e');
    }
  }

  /// Track credit purchase event
  Future<void> trackPurchase({
    required String productId,
    required double price,
    required int credits,
    String? currency,
  }) async {
    if (!_isInitialized) return;

    try {
      await _facebookAppEvents.logPurchase(
        amount: price,
        currency: currency ?? 'USD',
        parameters: {
          'fb_content_id': productId,
          'fb_content_type': 'credits',
          'fb_num_items': credits,
        },
      );
      debugPrint('[Facebook] Event: Purchase (product: $productId, credits: $credits)');
    } catch (e) {
      debugPrint('[Facebook] Purchase error: $e');
    }
  }

  /// Track add to cart event (when user selects a package)
  Future<void> trackAddToCart({
    required String productId,
    required double price,
    String? currency,
  }) async {
    if (!_isInitialized) return;

    try {
      await _facebookAppEvents.logAddToCart(
        id: productId,
        type: 'product',
        currency: currency ?? 'USD',
        price: price,
      );
      debugPrint('[Facebook] Event: AddToCart (product: $productId)');
    } catch (e) {
      debugPrint('[Facebook] AddToCart error: $e');
    }
  }

  /// Track checkout initiated event
  Future<void> trackInitiateCheckout({
    required String productId,
    required double price,
    String? currency,
  }) async {
    if (!_isInitialized) return;

    try {
      await _facebookAppEvents.logInitiatedCheckout(
        contentId: productId,
        contentType: 'product',
        currency: currency ?? 'USD',
        totalPrice: price,
        numItems: 1,
      );
      debugPrint('[Facebook] Event: InitiateCheckout (product: $productId)');
    } catch (e) {
      debugPrint('[Facebook] InitiateCheckout error: $e');
    }
  }

  /// Set user ID for attribution
  Future<void> setUserId(String userId) async {
    if (!_isInitialized) return;

    try {
      await _facebookAppEvents.setUserID(userId);
      debugPrint('[Facebook] User ID set: $userId');
    } catch (e) {
      debugPrint('[Facebook] setUserId error: $e');
    }
  }

  /// Set user data for advanced matching
  Future<void> setUserData({
    String? email,
    String? firstName,
    String? lastName,
    String? phone,
  }) async {
    if (!_isInitialized) return;

    try {
      await _facebookAppEvents.setUserData(
        email: email,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
      );
      debugPrint('[Facebook] User data set');
    } catch (e) {
      debugPrint('[Facebook] setUserData error: $e');
    }
  }

  /// Clear user ID on logout
  Future<void> logout() async {
    if (!_isInitialized) return;

    try {
      await _facebookAppEvents.clearUserID();
      await _facebookAppEvents.clearUserData();
      debugPrint('[Facebook] User logged out');
    } catch (e) {
      debugPrint('[Facebook] Logout error: $e');
    }
  }

  /// Log custom event
  Future<void> logEvent({
    required String name,
    Map<String, dynamic>? parameters,
  }) async {
    if (!_isInitialized) return;

    try {
      await _facebookAppEvents.logEvent(
        name: name,
        parameters: parameters,
      );
      debugPrint('[Facebook] Custom Event: $name');
    } catch (e) {
      debugPrint('[Facebook] logEvent error: $e');
    }
  }
}

/// Global Facebook service instance
final facebookService = FacebookService();
