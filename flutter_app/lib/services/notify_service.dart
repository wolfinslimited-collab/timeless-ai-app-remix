import 'package:supabase_flutter/supabase_flutter.dart';

class NotifyMessage {
  final String id;
  final String role;
  final String content;
  final DateTime createdAt;
  final Map<String, dynamic>? toolCall;

  NotifyMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.createdAt,
    this.toolCall,
  });
}

class NotificationItem {
  final String id;
  final String type;
  final String title;
  final String description;
  final String status;
  final String channel;
  final Map<String, dynamic> conditionConfig;
  final int triggerCount;
  final String createdAt;
  final String? triggeredAt;

  NotificationItem({
    required this.id,
    required this.type,
    required this.title,
    required this.description,
    required this.status,
    required this.channel,
    required this.conditionConfig,
    required this.triggerCount,
    required this.createdAt,
    this.triggeredAt,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] ?? '',
      type: json['type'] ?? 'custom',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'active',
      channel: json['channel'] ?? 'push',
      conditionConfig: json['condition_config'] ?? {},
      triggerCount: json['trigger_count'] ?? 0,
      createdAt: json['created_at'] ?? '',
      triggeredAt: json['triggered_at'],
    );
  }

  bool get isActive => status == 'active';
  bool get isPaused => status == 'paused';
  bool get isTriggered => status == 'triggered';
}

class NotificationHistory {
  final String id;
  final String title;
  final String body;
  final String channel;
  final List<String> sentVia;
  final String? readAt;
  final String createdAt;

  NotificationHistory({
    required this.id,
    required this.title,
    required this.body,
    required this.channel,
    required this.sentVia,
    this.readAt,
    required this.createdAt,
  });

  factory NotificationHistory.fromJson(Map<String, dynamic> json) {
    return NotificationHistory(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      body: json['body'] ?? '',
      channel: json['channel'] ?? 'push',
      sentVia: List<String>.from(json['sent_via'] ?? []),
      readAt: json['read_at'],
      createdAt: json['created_at'] ?? '',
    );
  }

  bool get isRead => readAt != null;
}

class QuickSuggestion {
  final String icon;
  final String text;

  const QuickSuggestion({required this.icon, required this.text});
}

class NotifyService {
  final SupabaseClient _supabase = Supabase.instance.client;

  static const List<QuickSuggestion> quickSuggestions = [
    QuickSuggestion(icon: '✈️', text: 'Track flight AA123 and notify me of any delays'),
    QuickSuggestion(icon: '📍', text: 'Remind me to buy groceries when I leave work'),
    QuickSuggestion(icon: '⏱️', text: 'Set a 30-minute focus timer for Instagram'),
    QuickSuggestion(icon: '⏰', text: 'Remind me in 30 minutes to take a break'),
    QuickSuggestion(icon: '₿', text: 'Notify me when Bitcoin changes by 2%'),
    QuickSuggestion(icon: '📈', text: 'Alert me when AAPL drops 5%'),
    QuickSuggestion(icon: '🌧️', text: "Tell me if it's going to rain tomorrow"),
    QuickSuggestion(icon: '⚽', text: 'Alert me when Manchester United has a match'),
    QuickSuggestion(icon: '📰', text: 'Monitor news about artificial intelligence'),
    QuickSuggestion(icon: '🐦', text: 'Track @elonmusk tweets about Tesla'),
  ];

  Future<Map<String, dynamic>?> sendMessage(String message, List<Map<String, dynamic>> conversationHistory) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      // Build messages array for the AI
      final messages = [
        ...conversationHistory,
        {'role': 'user', 'content': message},
      ];

      final response = await _supabase.functions.invoke('notify-ai', body: {
        'messages': messages,
      });

      return response.data;
    } catch (e) {
      print('Error sending message: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> saveNotification(Map<String, dynamic> notification, String originalRequest) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase.functions.invoke('notify-ai-save', body: {
        'notification': notification,
        'originalRequest': originalRequest,
      });

      return response.data;
    } catch (e) {
      print('Error saving notification: $e');
      return null;
    }
  }

  Future<List<NotificationItem>> getNotifications() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return [];

    try {
      final response = await _supabase.functions.invoke('notify-ai', body: {
        'action': 'list',
      });

      if (response.data != null && response.data['notifications'] != null) {
        return (response.data['notifications'] as List)
            .map((n) => NotificationItem.fromJson(n))
            .toList();
      }
      return [];
    } catch (e) {
      print('Error getting notifications: $e');
      return [];
    }
  }

  Future<List<NotificationHistory>> getHistory() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return [];

    try {
      final response = await _supabase.functions.invoke('notify-ai', body: {
        'action': 'history',
      });

      if (response.data != null && response.data['history'] != null) {
        return (response.data['history'] as List)
            .map((h) => NotificationHistory.fromJson(h))
            .toList();
      }
      return [];
    } catch (e) {
      print('Error getting history: $e');
      return [];
    }
  }

  Future<bool> pauseNotification(String notificationId) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      final response = await _supabase.functions.invoke('notify-ai', body: {
        'action': 'pause',
        'notificationId': notificationId,
      });

      return response.data?['success'] == true;
    } catch (e) {
      print('Error pausing notification: $e');
      return false;
    }
  }

  Future<bool> resumeNotification(String notificationId) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      final response = await _supabase.functions.invoke('notify-ai', body: {
        'action': 'resume',
        'notificationId': notificationId,
      });

      return response.data?['success'] == true;
    } catch (e) {
      print('Error resuming notification: $e');
      return false;
    }
  }

  Future<bool> deleteNotification(String notificationId) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      final response = await _supabase.functions.invoke('notify-ai', body: {
        'action': 'delete',
        'notificationId': notificationId,
      });

      return response.data?['success'] == true;
    } catch (e) {
      print('Error deleting notification: $e');
      return false;
    }
  }

  Future<bool> updateNotification(
    String notificationId, {
    String? title,
    String? description,
    String? channel,
    Map<String, dynamic>? conditionConfig,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      final response = await _supabase.functions.invoke('notify-ai', body: {
        'action': 'update',
        'notificationId': notificationId,
        'data': {
          if (title != null) 'title': title,
          if (description != null) 'description': description,
          if (channel != null) 'channel': channel,
          if (conditionConfig != null) 'condition_config': conditionConfig,
        },
      });

      return response.data?['success'] == true;
    } catch (e) {
      print('Error updating notification: $e');
      return false;
    }
  }

  Future<bool> markHistoryAsRead(String historyId) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      final response = await _supabase.functions.invoke('notify-ai', body: {
        'action': 'markRead',
        'historyId': historyId,
      });

      return response.data?['success'] == true;
    } catch (e) {
      print('Error marking as read: $e');
      return false;
    }
  }

  String getNotificationTypeIcon(String type) {
    switch (type) {
      case 'time_reminder':
        return '⏰';
      case 'crypto_price':
        return '₿';
      case 'stock_price':
        return '📈';
      case 'weather':
        return '🌤️';
      case 'sports_match':
        return '⚽';
      case 'news_monitoring':
        return '📰';
      case 'social_media':
        return '🐦';
      case 'screen_time':
        return '📱';
      case 'location_based':
        return '📍';
      case 'flight_status':
        return '✈️';
      default:
        return '🔔';
    }
  }
}
