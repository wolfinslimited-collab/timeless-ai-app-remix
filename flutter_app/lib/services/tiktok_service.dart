import 'package:flutter/foundation.dart';
import 'package:tiktok_events_sdk/tiktok_events_sdk.dart';

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

  /// Init timeout so we don't block when TikTok config API is unreachable (e.g. offline).
  static const Duration _initTimeout = Duration(seconds: 10);

  /// Initialize TikTok SDK
  /// Call this in main.dart after WidgetsFlutterBinding.ensureInitialized()
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      debugPrint('[TikTok] Initializing SDK...');

      await TikTokEventsSdk.initSdk(
        androidAppId: androidAppId,
        tikTokAndroidId: androidAppId,
        iosAppId: iosAppId,
        tiktokIosId: iosAppId,
        isDebugMode: kDebugMode,
      ).timeout(_initTimeout, onTimeout: () {
        debugPrint('[TikTok] Init timed out (network/config may be unavailable)');
        return Future.value();
      });

      _isInitialized = true;
      debugPrint('[TikTok] SDK initialized successfully');

      await trackInstall().timeout(
        const Duration(seconds: 5),
        onTimeout: () {
          debugPrint('[TikTok] InstallApp event timed out');
          return Future.value();
        },
      );
    } on Exception catch (e) {
      debugPrint('[TikTok] Initialization error: $e');
      // Mark initialized so app doesn't block; events may not send until config is fetched
      _isInitialized = true;
    }
  }

  /// Track app install event
  Future<void> trackInstall() async {
    if (!_isInitialized) return;

    try {
      await TikTokEventsSdk.logEvent(
        event: TikTokEvent(
          eventName: 'InstallApp',
        ),
      );
      debugPrint('[TikTok] Event: InstallApp');
    } catch (e) {
      debugPrint('[TikTok] InstallApp error: $e');
    }
  }

  /// Track user registration event
  Future<void> trackRegister({
    String? userId,
    String? method,
  }) async {
    if (!_isInitialized) return;

    try {
      await TikTokEventsSdk.logEvent(
        event: TikTokEvent(
          eventName: 'CompleteRegistration',
          eventId: userId,
          properties: EventProperties(
            description: method ?? 'email',
          ),
        ),
      );
      debugPrint('[TikTok] Event: CompleteRegistration (method: $method)');
    } catch (e) {
      debugPrint('[TikTok] CompleteRegistration error: $e');
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
      await TikTokEventsSdk.logEvent(
        event: TikTokEvent(
          eventName: 'Subscribe',
          properties: EventProperties(
            contentId: productId,
            currency: currency != null ? CurrencyCode.fromString(currency) : CurrencyCode.USD,
            value: price,
            description: subscriptionType,
          ),
        ),
      );
      debugPrint('[TikTok] Event: Subscribe (product: $productId, price: $price)');
    } catch (e) {
      debugPrint('[TikTok] Subscribe error: $e');
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
      await TikTokEventsSdk.logEvent(
        event: TikTokEvent(
          eventName: 'Purchase',
          properties: EventProperties(
            contentId: productId,
            currency: currency != null ? CurrencyCode.fromString(currency) : CurrencyCode.USD,
            value: price,
            quantity: credits,
            contentType: 'credits',
          ),
        ),
      );
      debugPrint('[TikTok] Event: Purchase (product: $productId, credits: $credits)');
    } catch (e) {
      debugPrint('[TikTok] Purchase error: $e');
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
      await TikTokEventsSdk.logEvent(
        event: TikTokEvent(
          eventName: 'AddToCart',
          properties: EventProperties(
            contentId: productId,
            currency: currency != null ? CurrencyCode.fromString(currency) : CurrencyCode.USD,
            value: price,
          ),
        ),
      );
      debugPrint('[TikTok] Event: AddToCart (product: $productId)');
    } catch (e) {
      debugPrint('[TikTok] AddToCart error: $e');
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
      await TikTokEventsSdk.logEvent(
        event: TikTokEvent(
          eventName: 'InitiateCheckout',
          properties: EventProperties(
            contentId: productId,
            currency: currency != null ? CurrencyCode.fromString(currency) : CurrencyCode.USD,
            value: price,
          ),
        ),
      );
      debugPrint('[TikTok] Event: InitiateCheckout (product: $productId)');
    } catch (e) {
      debugPrint('[TikTok] InitiateCheckout error: $e');
    }
  }

  /// Identify user for attribution
  Future<void> identify({
    String? externalId,
    String? email,
    String? externalUserName,
    String? phoneNumber,
  }) async {
    if (!_isInitialized) return;

    try {
      await TikTokEventsSdk.identify(
        identifier: TikTokIdentifier(
          externalId: externalId ?? '',
          externalUserName: externalUserName ?? '',
          email: email ?? '',
          phoneNumber: phoneNumber,
        ),
      );
      debugPrint('[TikTok] User identified: $externalId');
    } catch (e) {
      debugPrint('[TikTok] Identify error: $e');
    }
  }

  /// Log out user (clear identification)
  Future<void> logout() async {
    if (!_isInitialized) return;

    try {
      await TikTokEventsSdk.logout();
      debugPrint('[TikTok] User logged out');
    } catch (e) {
      debugPrint('[TikTok] Logout error: $e');
    }
  }
}

/// Global TikTok service instance
final tiktokService = TikTokService();
