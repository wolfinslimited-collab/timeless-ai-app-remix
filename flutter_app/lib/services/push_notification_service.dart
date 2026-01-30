import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Background message handler - must be a top-level function
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('Handling background message: ${message.messageId}');
  // Handle background message if needed
}

/// Service for managing Firebase Cloud Messaging push notifications
class PushNotificationService {
  static final PushNotificationService _instance =
      PushNotificationService._internal();
  factory PushNotificationService() => _instance;
  PushNotificationService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  final SupabaseClient _supabase = Supabase.instance.client;

  String? _fcmToken;
  bool _isInitialized = false;

  /// Get the current FCM token
  String? get fcmToken => _fcmToken;

  /// Check if the service is initialized
  bool get isInitialized => _isInitialized;

  /// Initialize the push notification service
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Note: Background message handler is registered in main.dart
      // to avoid duplicate registration

      // Request notification permissions
      await _requestPermissions();

      // Initialize local notifications for foreground display
      await _initializeLocalNotifications();

      // Get FCM token
      await _getToken();

      // Subscribe to platform-specific topics
      await _subscribeToPlatformTopics();

      // Listen for token refresh
      _messaging.onTokenRefresh.listen(_handleTokenRefresh);

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Handle notification tap when app is in background
      FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

      // Check if app was opened from a notification
      final initialMessage = await _messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleNotificationTap(initialMessage);
      }

      _isInitialized = true;
      debugPrint('Push notification service initialized');
    } catch (e) {
      debugPrint('Error initializing push notifications: $e');
    }
  }

  /// Request notification permissions
  Future<bool> _requestPermissions() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    final authorized =
        settings.authorizationStatus == AuthorizationStatus.authorized ||
            settings.authorizationStatus == AuthorizationStatus.provisional;

    debugPrint(
        'Push notification permission status: ${settings.authorizationStatus}');
    return authorized;
  }

  /// Initialize local notifications for foreground display
  Future<void> _initializeLocalNotifications() async {
    // Android initialization
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS initialization
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _handleLocalNotificationTap,
    );

    // Create notification channel for Android
    if (Platform.isAndroid) {
      const channel = AndroidNotificationChannel(
        'timeless_ai_notifications',
        'Timeless AI Notifications',
        description: 'Notifications from Timeless AI',
        importance: Importance.high,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);
    }
  }

  /// Get the FCM token
  Future<String?> _getToken() async {
    try {
      // For iOS, get APNS token first
      if (Platform.isIOS) {
        final apnsToken = await _messaging.getAPNSToken();
        if (apnsToken == null) {
          debugPrint('APNS token not available yet');
          // Retry after a short delay
          await Future.delayed(const Duration(seconds: 2));
        }
      }

      _fcmToken = await _messaging.getToken();
      debugPrint('FCM Token: $_fcmToken');

      // Save token to database if user is logged in
      await _saveTokenToDatabase();

      return _fcmToken;
    } catch (e) {
      debugPrint('Error getting FCM token: $e');
      return null;
    }
  }

  /// Handle token refresh
  void _handleTokenRefresh(String newToken) {
    debugPrint('FCM Token refreshed: $newToken');
    _fcmToken = newToken;
    _saveTokenToDatabase();
  }

  /// Save FCM token to database via register-device edge function
  Future<void> _saveTokenToDatabase() async {
    if (_fcmToken == null) return;

    final user = _supabase.auth.currentUser;
    if (user == null) {
      debugPrint('Cannot save FCM token: user not logged in');
      return;
    }

    try {
      // Call the register-device edge function
      final response = await _supabase.functions.invoke(
        'register-device',
        body: {
          'fcmToken': _fcmToken,
          'deviceType': Platform.isIOS ? 'ios' : 'android',
          'deviceName': Platform.isIOS ? 'iOS Device' : 'Android Device',
        },
      );

      if (response.status == 200) {
        debugPrint('FCM token registered successfully: ${response.data}');
      } else {
        debugPrint('Failed to register FCM token: ${response.data}');
      }
    } catch (e) {
      debugPrint('Error saving FCM token: $e');
    }
  }

  /// Handle foreground messages
  void _handleForegroundMessage(RemoteMessage message) {
    debugPrint('Received foreground message: ${message.messageId}');

    final notification = message.notification;
    if (notification == null) return;

    // Show local notification
    _showLocalNotification(
      title: notification.title ?? 'Timeless AI',
      body: notification.body ?? '',
      payload: jsonEncode(message.data),
    );
  }

  /// Show a local notification
  Future<void> _showLocalNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'timeless_ai_notifications',
      'Timeless AI Notifications',
      channelDescription: 'Notifications from Timeless AI',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      body,
      details,
      payload: payload,
    );
  }

  /// Handle notification tap when app is in background
  void _handleNotificationTap(RemoteMessage message) {
    debugPrint('Notification tapped: ${message.data}');
    // Navigate to appropriate screen based on message data
    _processNotificationData(message.data);
  }

  /// Handle local notification tap
  void _handleLocalNotificationTap(NotificationResponse response) {
    debugPrint('Local notification tapped: ${response.payload}');
    if (response.payload != null) {
      try {
        final data = jsonDecode(response.payload!) as Map<String, dynamic>;
        _processNotificationData(data);
      } catch (e) {
        debugPrint('Error parsing notification payload: $e');
      }
    }
  }

  /// Process notification data for navigation
  void _processNotificationData(Map<String, dynamic> data) {
    // Handle different notification types
    final type = data['type'] as String?;
    final targetId = data['target_id'] as String?;

    debugPrint('Processing notification: type=$type, targetId=$targetId');

    // TODO: Implement navigation based on notification type
    // Example:
    // if (type == 'generation_complete') {
    //   navigatorKey.currentState?.pushNamed('/gallery', arguments: targetId);
    // }
  }

  /// Subscribe to platform-specific topics (ios_users / android_users)
  Future<void> _subscribeToPlatformTopics() async {
    try {
      // Subscribe to platform-specific topic
      final platformTopic = Platform.isIOS ? 'ios_users' : 'android_users';
      await _messaging.subscribeToTopic(platformTopic);
      debugPrint('Subscribed to platform topic: $platformTopic');

      // Subscribe to all_users topic for broadcast messages
      await _messaging.subscribeToTopic('all_users');
      debugPrint('Subscribed to topic: all_users');
    } catch (e) {
      debugPrint('Error subscribing to platform topics: $e');
    }
  }

  /// Unsubscribe from platform-specific topics (call on logout)
  Future<void> _unsubscribeFromPlatformTopics() async {
    try {
      final platformTopic = Platform.isIOS ? 'ios_users' : 'android_users';
      await _messaging.unsubscribeFromTopic(platformTopic);
      await _messaging.unsubscribeFromTopic('all_users');
      debugPrint('Unsubscribed from platform topics');
    } catch (e) {
      debugPrint('Error unsubscribing from platform topics: $e');
    }
  }

  /// Subscribe to a topic for targeted notifications
  Future<void> subscribeToTopic(String topic) async {
    try {
      await _messaging.subscribeToTopic(topic);
      debugPrint('Subscribed to topic: $topic');
    } catch (e) {
      debugPrint('Error subscribing to topic: $e');
    }
  }

  /// Unsubscribe from a topic
  Future<void> unsubscribeFromTopic(String topic) async {
    try {
      await _messaging.unsubscribeFromTopic(topic);
      debugPrint('Unsubscribed from topic: $topic');
    } catch (e) {
      debugPrint('Error unsubscribing from topic: $e');
    }
  }

  /// Delete the FCM token (call on logout)
  Future<void> deleteToken() async {
    try {
      // Unsubscribe from platform topics
      await _unsubscribeFromPlatformTopics();

      final user = _supabase.auth.currentUser;

      // Deactivate device in database
      if (user != null && _fcmToken != null) {
        try {
          await _supabase.functions.invoke(
            'register-device',
            body: {
              'fcmToken': _fcmToken,
              'deviceType': Platform.isIOS ? 'ios' : 'android',
              'deactivate': true,
            },
          );
        } catch (e) {
          debugPrint('Error deactivating device: $e');
        }
      }

      // Delete the FCM token
      await _messaging.deleteToken();
      _fcmToken = null;

      debugPrint('FCM token deleted');
    } catch (e) {
      debugPrint('Error deleting FCM token: $e');
    }
  }

  /// Check if notifications are enabled
  Future<bool> areNotificationsEnabled() async {
    final settings = await _messaging.getNotificationSettings();
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  /// Request permissions again (for settings screen)
  Future<bool> requestPermissions() async {
    return _requestPermissions();
  }

  /// Refresh the FCM token and save to database
  Future<void> refreshToken() async {
    await _getToken();
  }
}

/// Global instance for easy access
final pushNotificationService = PushNotificationService();
