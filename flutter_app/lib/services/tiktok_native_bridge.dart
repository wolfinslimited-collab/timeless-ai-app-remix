import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';

/// Native bridge for TikTok Events SDK
/// This class handles direct communication with the native TikTok SDK
class TikTokNativeBridge {
  static const MethodChannel _channel = MethodChannel('com.timelessai.app/tiktok');

  // TikTok App IDs
  static const String iosAppId = '7566328038468812807';
  static const String androidAppId = '7571773399236640784';

  static bool _isInitialized = false;

  /// Initialize the TikTok SDK on native side
  static Future<bool> initialize({bool debugMode = false}) async {
    if (_isInitialized) return true;

    try {
      final appId = Platform.isIOS ? iosAppId : androidAppId;
      
      final result = await _channel.invokeMethod<bool>('initialize', {
        'appId': appId,
        'debugMode': debugMode,
      });

      _isInitialized = result ?? false;
      debugPrint('[TikTok Native] Initialized: $_isInitialized');
      return _isInitialized;
    } on PlatformException catch (e) {
      debugPrint('[TikTok Native] Init error: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('[TikTok Native] Init error: $e');
      return false;
    }
  }

  /// Log an event to TikTok
  static Future<void> logEvent({
    required String eventName,
    Map<String, dynamic>? parameters,
  }) async {
    if (!_isInitialized) {
      debugPrint('[TikTok Native] Not initialized, skipping: $eventName');
      return;
    }

    try {
      await _channel.invokeMethod('logEvent', {
        'eventName': eventName,
        'parameters': parameters ?? {},
      });
      debugPrint('[TikTok Native] Event logged: $eventName');
    } on PlatformException catch (e) {
      debugPrint('[TikTok Native] Event error: ${e.message}');
    }
  }

  /// Identify user
  static Future<void> identify({
    String? externalId,
    String? email,
    String? phone,
  }) async {
    if (!_isInitialized) return;

    try {
      await _channel.invokeMethod('identify', {
        if (externalId != null) 'externalId': externalId,
        if (email != null) 'email': email,
        if (phone != null) 'phone': phone,
      });
      debugPrint('[TikTok Native] User identified');
    } on PlatformException catch (e) {
      debugPrint('[TikTok Native] Identify error: ${e.message}');
    }
  }

  /// Clear user identification
  static Future<void> logout() async {
    if (!_isInitialized) return;

    try {
      await _channel.invokeMethod('logout');
      debugPrint('[TikTok Native] User logged out');
    } on PlatformException catch (e) {
      debugPrint('[TikTok Native] Logout error: ${e.message}');
    }
  }
}
