import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

class BrainInsight {
  final String type;
  final String title;
  final String description;
  final String? metric;

  BrainInsight({
    required this.type,
    required this.title,
    required this.description,
    this.metric,
  });

  factory BrainInsight.fromJson(Map<String, dynamic> json) {
    return BrainInsight(
      type: json['type'] ?? 'neutral',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      metric: json['metric'],
    );
  }
}

class BrainProfile {
  final String id;
  final String userId;
  final int age;
  final String gender;
  final String? occupation;
  final String workSchedule;
  final double sleepGoalHours;
  final List<String> focusGoals;
  final bool baselineEstablished;
  final String? baselineStartDate;
  final String createdAt;

  BrainProfile({
    required this.id,
    required this.userId,
    required this.age,
    required this.gender,
    this.occupation,
    required this.workSchedule,
    required this.sleepGoalHours,
    required this.focusGoals,
    this.baselineEstablished = false,
    this.baselineStartDate,
    required this.createdAt,
  });

  factory BrainProfile.fromJson(Map<String, dynamic> json) {
    return BrainProfile(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      age: json['age'] ?? 25,
      gender: json['gender'] ?? 'other',
      occupation: json['occupation'],
      workSchedule: json['work_schedule'] ?? 'regular',
      sleepGoalHours: (json['sleep_goal_hours'] ?? 8.0).toDouble(),
      focusGoals: List<String>.from(json['focus_goals'] ?? []),
      baselineEstablished: json['baseline_established'] ?? false,
      baselineStartDate: json['baseline_start_date'],
      createdAt: json['created_at'] ?? '',
    );
  }
}

class BrainMetrics {
  final String id;
  final String userId;
  final String metricDate;
  final int? brainPerformanceScore;
  final int? focusScore;
  final int? stressLoad;
  final int? moodStability;
  final int? reactionSpeed;
  final int? cognitiveConsistency;
  final int totalScreenTimeMinutes;
  final int appSwitches;
  final int deepWorkMinutes;
  final int nightUsageMinutes;
  final int notificationInteractions;
  final int sessionCount;
  final double avgSessionLengthMinutes;
  final int? selfReportedMood;
  final int? selfReportedEnergy;
  final int? selfReportedFocus;
  final String? moodNotes;
  final List<BrainInsight> insights;
  final String createdAt;

  BrainMetrics({
    required this.id,
    required this.userId,
    required this.metricDate,
    this.brainPerformanceScore,
    this.focusScore,
    this.stressLoad,
    this.moodStability,
    this.reactionSpeed,
    this.cognitiveConsistency,
    this.totalScreenTimeMinutes = 0,
    this.appSwitches = 0,
    this.deepWorkMinutes = 0,
    this.nightUsageMinutes = 0,
    this.notificationInteractions = 0,
    this.sessionCount = 0,
    this.avgSessionLengthMinutes = 0,
    this.selfReportedMood,
    this.selfReportedEnergy,
    this.selfReportedFocus,
    this.moodNotes,
    this.insights = const [],
    required this.createdAt,
  });

  factory BrainMetrics.fromJson(Map<String, dynamic> json) {
    List<BrainInsight> parseInsights(dynamic insightsData) {
      if (insightsData == null) return [];
      if (insightsData is List) {
        return insightsData.map((i) => BrainInsight.fromJson(i)).toList();
      }
      return [];
    }

    return BrainMetrics(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      metricDate: json['metric_date'] ?? '',
      brainPerformanceScore: json['brain_performance_score'],
      focusScore: json['focus_score'],
      stressLoad: json['stress_load'],
      moodStability: json['mood_stability'],
      reactionSpeed: json['reaction_speed'],
      cognitiveConsistency: json['cognitive_consistency'],
      totalScreenTimeMinutes: json['total_screen_time_minutes'] ?? 0,
      appSwitches: json['app_switches'] ?? 0,
      deepWorkMinutes: json['deep_work_minutes'] ?? 0,
      nightUsageMinutes: json['night_usage_minutes'] ?? 0,
      notificationInteractions: json['notification_interactions'] ?? 0,
      sessionCount: json['session_count'] ?? 0,
      avgSessionLengthMinutes:
          (json['avg_session_length_minutes'] ?? 0).toDouble(),
      selfReportedMood: json['self_reported_mood'],
      selfReportedEnergy: json['self_reported_energy'],
      selfReportedFocus: json['self_reported_focus'],
      moodNotes: json['mood_notes'],
      insights: parseInsights(json['insights']),
      createdAt: json['created_at'] ?? '',
    );
  }
}

class BrainMoodLog {
  final String id;
  final String userId;
  final String loggedAt;
  final int moodScore;
  final int? energyLevel;
  final int? focusLevel;
  final int? stressLevel;
  final String? notes;
  final String? context;
  final String createdAt;

  BrainMoodLog({
    required this.id,
    required this.userId,
    required this.loggedAt,
    required this.moodScore,
    this.energyLevel,
    this.focusLevel,
    this.stressLevel,
    this.notes,
    this.context,
    required this.createdAt,
  });

  factory BrainMoodLog.fromJson(Map<String, dynamic> json) {
    return BrainMoodLog(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      loggedAt: json['logged_at'] ?? '',
      moodScore: json['mood_score'] ?? 5,
      energyLevel: json['energy_level'],
      focusLevel: json['focus_level'],
      stressLevel: json['stress_level'],
      notes: json['notes'],
      context: json['context'],
      createdAt: json['created_at'] ?? '',
    );
  }
}

class BrainService {
  final SupabaseClient _supabase = Supabase.instance.client;

  Future<BrainProfile?> getProfile() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase.functions.invoke('brain-ai', body: {
        'action': 'getProfile',
      });

      if (response.data != null && response.data['profile'] != null) {
        return BrainProfile.fromJson(response.data['profile']);
      }
      return null;
    } catch (e) {
      print('Error getting brain profile: $e');
      return null;
    }
  }

  Future<BrainProfile?> createProfile({
    required int age,
    required String gender,
    String? occupation,
    required String workSchedule,
    required double sleepGoalHours,
    required List<String> focusGoals,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase.functions.invoke('brain-ai', body: {
        'action': 'createProfile',
        'data': {
          'age': age,
          'gender': gender,
          'occupation': occupation,
          'work_schedule': workSchedule,
          'sleep_goal_hours': sleepGoalHours,
          'focus_goals': focusGoals,
          'baseline_start_date': DateFormat('yyyy-MM-dd').format(DateTime.now()),
        },
      });

      if (response.data != null && response.data['profile'] != null) {
        return BrainProfile.fromJson(response.data['profile']);
      }
      return null;
    } catch (e) {
      print('Error creating brain profile: $e');
      return null;
    }
  }

  Future<BrainMetrics?> getTodayMetrics() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final response = await _supabase.functions.invoke('brain-ai', body: {
        'action': 'getMetrics',
        'date': today,
      });

      if (response.data != null && response.data['metrics'] != null) {
        return BrainMetrics.fromJson(response.data['metrics']);
      }
      return null;
    } catch (e) {
      print('Error getting today metrics: $e');
      return null;
    }
  }

  Future<List<BrainMetrics>> getWeeklyMetrics() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return [];

    try {
      final response = await _supabase.functions.invoke('brain-ai', body: {
        'action': 'getWeeklyMetrics',
      });

      if (response.data != null && response.data['metrics'] != null) {
        return (response.data['metrics'] as List)
            .map((m) => BrainMetrics.fromJson(m))
            .toList();
      }
      return [];
    } catch (e) {
      print('Error getting weekly metrics: $e');
      return [];
    }
  }

  Future<List<BrainMoodLog>> getRecentMoodLogs({int limit = 10}) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return [];

    try {
      final response = await _supabase.functions.invoke('brain-ai', body: {
        'action': 'getMoodLogs',
        'limit': limit,
      });

      if (response.data != null && response.data['logs'] != null) {
        return (response.data['logs'] as List)
            .map((l) => BrainMoodLog.fromJson(l))
            .toList();
      }
      return [];
    } catch (e) {
      print('Error getting mood logs: $e');
      return [];
    }
  }

  Future<bool> logMood({
    required int moodScore,
    int? energyLevel,
    int? focusLevel,
    int? stressLevel,
    String? notes,
    String? context,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      final response = await _supabase.functions.invoke('brain-ai', body: {
        'action': 'logMood',
        'data': {
          'mood_score': moodScore,
          'energy_level': energyLevel,
          'focus_level': focusLevel,
          'stress_level': stressLevel,
          'notes': notes,
          'context': context,
        },
      });

      return response.data != null && response.data['success'] == true;
    } catch (e) {
      print('Error logging mood: $e');
      return false;
    }
  }

  Future<BrainMetrics?> refreshMetrics() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase.functions.invoke('brain-ai', body: {
        'action': 'refreshMetrics',
      });

      if (response.data != null && response.data['metrics'] != null) {
        return BrainMetrics.fromJson(response.data['metrics']);
      }
      return null;
    } catch (e) {
      print('Error refreshing metrics: $e');
      return null;
    }
  }

  Future<bool> checkSubscription() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      final response = await _supabase.functions.invoke('brain-ai', body: {
        'action': 'checkSubscription',
      });

      return response.data?['hasActiveSubscription'] == true;
    } catch (e) {
      print('Error checking subscription: $e');
      return false;
    }
  }
}
