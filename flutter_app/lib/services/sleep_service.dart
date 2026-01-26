import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:intl/intl.dart';

class SleepLog {
  final String id;
  final String userId;
  final String sleepDate;
  final String? bedTime;
  final String? wakeTime;
  final double? sleepDurationHours;
  final int? sleepQuality;
  final double? deepSleepPercent;
  final double? remSleepPercent;
  final double? lightSleepPercent;
  final int awakenings;
  final int? sleepLatencyMinutes;
  final String? moodOnWake;
  final int? energyLevel;
  final String? notes;
  final Map<String, dynamic> factors;
  final String createdAt;

  SleepLog({
    required this.id,
    required this.userId,
    required this.sleepDate,
    this.bedTime,
    this.wakeTime,
    this.sleepDurationHours,
    this.sleepQuality,
    this.deepSleepPercent,
    this.remSleepPercent,
    this.lightSleepPercent,
    this.awakenings = 0,
    this.sleepLatencyMinutes,
    this.moodOnWake,
    this.energyLevel,
    this.notes,
    this.factors = const {},
    required this.createdAt,
  });

  factory SleepLog.fromJson(Map<String, dynamic> json) {
    return SleepLog(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      sleepDate: json['sleep_date'] ?? '',
      bedTime: json['bed_time'],
      wakeTime: json['wake_time'],
      sleepDurationHours: json['sleep_duration_hours']?.toDouble(),
      sleepQuality: json['sleep_quality'],
      deepSleepPercent: json['deep_sleep_percent']?.toDouble(),
      remSleepPercent: json['rem_sleep_percent']?.toDouble(),
      lightSleepPercent: json['light_sleep_percent']?.toDouble(),
      awakenings: json['awakenings'] ?? 0,
      sleepLatencyMinutes: json['sleep_latency_minutes'],
      moodOnWake: json['mood_on_wake'],
      energyLevel: json['energy_level'],
      notes: json['notes'],
      factors: json['factors'] ?? {},
      createdAt: json['created_at'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'sleep_date': sleepDate,
      'bed_time': bedTime,
      'wake_time': wakeTime,
      'sleep_duration_hours': sleepDurationHours,
      'sleep_quality': sleepQuality,
      'deep_sleep_percent': deepSleepPercent,
      'rem_sleep_percent': remSleepPercent,
      'light_sleep_percent': lightSleepPercent,
      'awakenings': awakenings,
      'sleep_latency_minutes': sleepLatencyMinutes,
      'mood_on_wake': moodOnWake,
      'energy_level': energyLevel,
      'notes': notes,
      'factors': factors,
    };
  }
}

class SleepProfile {
  final String id;
  final String userId;
  final int age;
  final String gender;
  final String? occupation;
  final String workSchedule;
  final double sleepGoalHours;
  final String chronotype;
  final List<String> sleepIssues;
  final bool enableBedtimeReminder;
  final String? bedtimeReminderTime;
  final bool enableSleepSounds;
  final String createdAt;

  SleepProfile({
    required this.id,
    required this.userId,
    required this.age,
    required this.gender,
    this.occupation,
    required this.workSchedule,
    required this.sleepGoalHours,
    required this.chronotype,
    this.sleepIssues = const [],
    this.enableBedtimeReminder = false,
    this.bedtimeReminderTime,
    this.enableSleepSounds = false,
    required this.createdAt,
  });

  factory SleepProfile.fromJson(Map<String, dynamic> json) {
    return SleepProfile(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      age: json['age'] ?? 25,
      gender: json['gender'] ?? 'other',
      occupation: json['occupation'],
      workSchedule: json['work_schedule'] ?? 'regular',
      sleepGoalHours: (json['sleep_goal_hours'] ?? 8.0).toDouble(),
      chronotype: json['chronotype'] ?? 'intermediate',
      sleepIssues: List<String>.from(json['sleep_issues'] ?? []),
      enableBedtimeReminder: json['enable_bedtime_reminder'] ?? false,
      bedtimeReminderTime: json['bedtime_reminder_time'],
      enableSleepSounds: json['enable_sleep_sounds'] ?? false,
      createdAt: json['created_at'] ?? '',
    );
  }
}

class SleepAnalysis {
  final String id;
  final int sleepScore;
  final int? consistencyScore;
  final int? efficiencyScore;
  final double? avgSleepDuration;
  final double? avgSleepQuality;
  final List<dynamic> insights;
  final List<String> recommendations;
  final String? analysisSummary;
  final String createdAt;

  SleepAnalysis({
    required this.id,
    required this.sleepScore,
    this.consistencyScore,
    this.efficiencyScore,
    this.avgSleepDuration,
    this.avgSleepQuality,
    this.insights = const [],
    this.recommendations = const [],
    this.analysisSummary,
    required this.createdAt,
  });

  factory SleepAnalysis.fromJson(Map<String, dynamic> json) {
    return SleepAnalysis(
      id: json['id'] ?? '',
      sleepScore: json['sleep_score'] ?? 0,
      consistencyScore: json['consistency_score'],
      efficiencyScore: json['efficiency_score'],
      avgSleepDuration: json['avg_sleep_duration']?.toDouble(),
      avgSleepQuality: json['avg_sleep_quality']?.toDouble(),
      insights: json['insights'] ?? [],
      recommendations: List<String>.from(json['recommendations'] ?? []),
      analysisSummary: json['analysis_summary'],
      createdAt: json['created_at'] ?? '',
    );
  }
}

class SleepService {
  final SupabaseClient _supabase = Supabase.instance.client;

  Future<SleepProfile?> getProfile() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase.functions.invoke('sleep-ai', body: {
        'action': 'getProfile',
      });

      if (response.data != null && response.data['profile'] != null) {
        return SleepProfile.fromJson(response.data['profile']);
      }
      return null;
    } catch (e) {
      print('Error getting sleep profile: $e');
      return null;
    }
  }

  Future<SleepProfile?> createProfile({
    required int age,
    required String gender,
    String? occupation,
    required String workSchedule,
    required double sleepGoalHours,
    required String chronotype,
    List<String> sleepIssues = const [],
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase.functions.invoke('sleep-ai', body: {
        'action': 'createProfile',
        'data': {
          'age': age,
          'gender': gender,
          'occupation': occupation,
          'work_schedule': workSchedule,
          'sleep_goal_hours': sleepGoalHours,
          'chronotype': chronotype,
          'sleep_issues': sleepIssues,
        },
      });

      if (response.data != null && response.data['profile'] != null) {
        return SleepProfile.fromJson(response.data['profile']);
      }
      return null;
    } catch (e) {
      print('Error creating sleep profile: $e');
      return null;
    }
  }

  Future<List<SleepLog>> getSleepLogs({int limit = 30}) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return [];

    try {
      final response = await _supabase.functions.invoke('sleep-ai', body: {
        'action': 'getLogs',
        'limit': limit,
      });

      if (response.data != null && response.data['logs'] != null) {
        return (response.data['logs'] as List)
            .map((log) => SleepLog.fromJson(log))
            .toList();
      }
      return [];
    } catch (e) {
      print('Error getting sleep logs: $e');
      return [];
    }
  }

  Future<SleepLog?> logSleep({
    required String sleepDate,
    String? bedTime,
    String? wakeTime,
    double? sleepDurationHours,
    int? sleepQuality,
    double? deepSleepPercent,
    double? remSleepPercent,
    double? lightSleepPercent,
    int awakenings = 0,
    int? sleepLatencyMinutes,
    String? moodOnWake,
    int? energyLevel,
    String? notes,
    Map<String, dynamic> factors = const {},
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase.functions.invoke('sleep-ai', body: {
        'action': 'logSleep',
        'data': {
          'sleep_date': sleepDate,
          'bed_time': bedTime,
          'wake_time': wakeTime,
          'sleep_duration_hours': sleepDurationHours,
          'sleep_quality': sleepQuality,
          'deep_sleep_percent': deepSleepPercent,
          'rem_sleep_percent': remSleepPercent,
          'light_sleep_percent': lightSleepPercent,
          'awakenings': awakenings,
          'sleep_latency_minutes': sleepLatencyMinutes,
          'mood_on_wake': moodOnWake,
          'energy_level': energyLevel,
          'notes': notes,
          'factors': factors,
        },
      });

      if (response.data != null && response.data['log'] != null) {
        return SleepLog.fromJson(response.data['log']);
      }
      return null;
    } catch (e) {
      print('Error logging sleep: $e');
      return null;
    }
  }

  Future<SleepAnalysis?> getAnalysis() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase.functions.invoke('sleep-ai', body: {
        'action': 'getAnalysis',
      });

      if (response.data != null && response.data['analysis'] != null) {
        return SleepAnalysis.fromJson(response.data['analysis']);
      }
      return null;
    } catch (e) {
      print('Error getting sleep analysis: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> generateAIInsights() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase.functions.invoke('sleep-ai', body: {
        'action': 'generateInsights',
      });

      return response.data;
    } catch (e) {
      print('Error generating AI insights: $e');
      return null;
    }
  }

  int calculateStreak(List<SleepLog> logs, double goalHours) {
    if (logs.isEmpty) return 0;

    final threshold = goalHours - 0.5;
    final sortedLogs = List<SleepLog>.from(logs)
      ..sort((a, b) => b.sleepDate.compareTo(a.sleepDate));

    int streak = 0;
    final today = DateTime.now();

    for (int i = 0; i < sortedLogs.length; i++) {
      final log = sortedLogs[i];
      final logDate = DateTime.parse(log.sleepDate);
      final daysDiff = today.difference(logDate).inDays;

      if (i == 0 && daysDiff > 1) break;

      if (i > 0) {
        final prevLogDate = DateTime.parse(sortedLogs[i - 1].sleepDate);
        if (prevLogDate.difference(logDate).inDays != 1) break;
      }

      final metGoal = (log.sleepDurationHours ?? 0) >= threshold;
      if (!metGoal) break;

      streak++;
    }

    return streak;
  }
}
