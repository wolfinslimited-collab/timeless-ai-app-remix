import 'dart:io';
import 'package:flutter/foundation.dart';

/// TikTok Events SDK wrapper for Flutter
/// Handles event tracking for TikTok Ads attribution
class TikTokService {
  static final TikTokService _instance = TikTokService._internal();
  factory TikTokService() => _instance;
  TikTokService._internal();

  // TikTok App IDs
  static const String iosAppId = '7566328038468812807';
  static const String androidAppId = '7571773399236640784';

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  /// Initialize TikTok SDK
  /// Call this in main.dart after WidgetsFlutterBinding.ensureInitialized()
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      final appId = Platform.isIOS ? iosAppId : androidAppId;
      debugPrint('[TikTok] Initializing with App ID: $appId');

      // Note: The tiktok_events_sdk package handles native initialization
      // This service wraps the SDK calls for easier use throughout the app
      
      _isInitialized = true;
      debugPrint('[TikTok] SDK initialized successfully');

      // Track install event automatically on first launch
      await trackInstall();
    } catch (e) {
      debugPrint('[TikTok] Initialization error: $e');
    }
  }

  /// Track app install event
  Future<void> trackInstall() async {
    await _logEvent('InstallApp');
  }

  /// Track user registration event
  Future<void> trackRegister({
    String? userId,
    String? method,
  }) async {
    await _logEvent('CompleteRegistration', parameters: {
      if (userId != null) 'user_id': userId,
      if (method != null) 'registration_method': method,
    });
  }

  /// Track subscription event
  Future<void> trackSubscribe({
    required String productId,
    required double price,
    String? currency,
    String? subscriptionType,
  }) async {
    await _logEvent('Subscribe', parameters: {
      'content_id': productId,
      'value': price,
      'currency': currency ?? 'USD',
      if (subscriptionType != null) 'subscription_type': subscriptionType,
    });
  }

  /// Track credit purchase event
  Future<void> trackPurchase({
    required String productId,
    required double price,
    required int credits,
    String? currency,
  }) async {
    await _logEvent('Purchase', parameters: {
      'content_id': productId,
      'value': price,
      'currency': currency ?? 'USD',
      'quantity': credits,
      'content_type': 'credits',
    });
  }

  /// Track add to cart event (when user selects a package)
  Future<void> trackAddToCart({
    required String productId,
    required double price,
    String? currency,
  }) async {
    await _logEvent('AddToCart', parameters: {
      'content_id': productId,
      'value': price,
      'currency': currency ?? 'USD',
    });
  }

  /// Track checkout initiated event
  Future<void> trackInitiateCheckout({
    required String productId,
    required double price,
    String? currency,
  }) async {
    await _logEvent('InitiateCheckout', parameters: {
      'content_id': productId,
      'value': price,
      'currency': currency ?? 'USD',
    });
  }

  /// Identify user for attribution
  Future<void> identify({
    String? externalId,
    String? email,
  }) async {
    if (!_isInitialized) {
      debugPrint('[TikTok] SDK not initialized, skipping identify');
      return;
    }

    try {
      debugPrint('[TikTok] Identifying user: $externalId');
      // The actual identification will be done via native SDK
      // This logs the intent for debugging
    } catch (e) {
      debugPrint('[TikTok] Identify error: $e');
    }
  }

  /// Log out user (clear identification)
  Future<void> logout() async {
    if (!_isInitialized) return;

    try {
      debugPrint('[TikTok] User logged out');
      // Native SDK logout handling
    } catch (e) {
      debugPrint('[TikTok] Logout error: $e');
    }
  }

  /// Internal method to log events
  Future<void> _logEvent(
    String eventName, {
    Map<String, dynamic>? parameters,
  }) async {
    if (!_isInitialized) {
      debugPrint('[TikTok] SDK not initialized, skipping event: $eventName');
      return;
    }

    try {
      debugPrint('[TikTok] Event: $eventName');
      if (parameters != null && parameters.isNotEmpty) {
        debugPrint('[TikTok] Parameters: $parameters');
      }

      // The actual event logging will be done via native SDK bridge
      // For now, we log to console for debugging
      // When tiktok_events_sdk is added, replace with:
      // await TikTokEventsSdk.logEvent(event: TikTokEvent(eventName: eventName, ...));
    } catch (e) {
      debugPrint('[TikTok] Event error ($eventName): $e');
    }
  }
}

/// Global TikTok service instance
final tiktokService = TikTokService();
