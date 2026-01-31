import 'package:flutter/foundation.dart';
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

/// SleepProfile matches web schema exactly (see SleepOnboarding.tsx)
class SleepProfile {
  final String id;
  final String userId;
  final int age;
  final String gender;
  final String workSchedule;
  final double sleepGoalHours;
  final String? wakeGoalTime;
  final String? bedGoalTime;
  final String caffeineIntake;
  final String exerciseFrequency;
  final String screenTimeBeforeBed;
  final String sleepEnvironment;
  final String stressLevel;
  final List<String> sleepIssues;
  final List<String> sleepGoals;
  final String createdAt;
  final String updatedAt;

  SleepProfile({
    required this.id,
    required this.userId,
    required this.age,
    required this.gender,
    required this.workSchedule,
    required this.sleepGoalHours,
    this.wakeGoalTime,
    this.bedGoalTime,
    this.caffeineIntake = 'moderate',
    this.exerciseFrequency = 'moderate',
    this.screenTimeBeforeBed = 'moderate',
    this.sleepEnvironment = 'good',
    this.stressLevel = 'moderate',
    this.sleepIssues = const [],
    this.sleepGoals = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory SleepProfile.fromJson(Map<String, dynamic> json) {
    return SleepProfile(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      age: json['age'] ?? 25,
      gender: json['gender'] ?? 'other',
      workSchedule: json['work_schedule'] ?? 'regular',
      sleepGoalHours: (json['sleep_goal_hours'] ?? 8.0).toDouble(),
      wakeGoalTime: json['wake_goal_time'],
      bedGoalTime: json['bed_goal_time'],
      caffeineIntake: json['caffeine_intake'] ?? 'moderate',
      exerciseFrequency: json['exercise_frequency'] ?? 'moderate',
      screenTimeBeforeBed: json['screen_time_before_bed'] ?? 'moderate',
      sleepEnvironment: json['sleep_environment'] ?? 'good',
      stressLevel: json['stress_level'] ?? 'moderate',
      sleepIssues: List<String>.from(json['sleep_issues'] ?? []),
      sleepGoals: List<String>.from(json['sleep_goals'] ?? []),
      createdAt: json['created_at'] ?? '',
      updatedAt: json['updated_at'] ?? '',
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
  final dynamic insights;
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

  /// Get user's sleep profile using direct database call (like web)
  Future<SleepProfile?> getProfile() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase
          .from('sleep_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

      if (response != null) {
        return SleepProfile.fromJson(response);
      }
      return null;
    } catch (e) {
      debugPrint('Error getting sleep profile: $e');
      return null;
    }
  }

  /// Create sleep profile using direct database call (matches web SleepOnboarding.tsx exactly)
  Future<SleepProfile?> createProfile({
    required int age,
    required String gender,
    required String workSchedule,
    required double sleepGoalHours,
    String? wakeGoalTime,
    String? bedGoalTime,
    String caffeineIntake = 'moderate',
    String exerciseFrequency = 'moderate',
    String screenTimeBeforeBed = 'moderate',
    String sleepEnvironment = 'good',
    String stressLevel = 'moderate',
    List<String> sleepIssues = const [],
    List<String> sleepGoals = const [],
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase
          .from('sleep_profiles')
          .insert({
            'user_id': user.id,
            'age': age,
            'gender': gender,
            'work_schedule': workSchedule,
            'sleep_goal_hours': sleepGoalHours,
            'wake_goal_time': wakeGoalTime,
            'bed_goal_time': bedGoalTime,
            'caffeine_intake': caffeineIntake,
            'exercise_frequency': exerciseFrequency,
            'screen_time_before_bed': screenTimeBeforeBed,
            'sleep_environment': sleepEnvironment,
            'stress_level': stressLevel,
            'sleep_issues': sleepIssues,
            'sleep_goals': sleepGoals,
          })
          .select()
          .single();

      return SleepProfile.fromJson(response);
    } catch (e) {
      debugPrint('Error creating sleep profile: $e');
      return null;
    }
  }

  /// Get sleep logs using direct database call
  Future<List<SleepLog>> getSleepLogs({int limit = 30}) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return [];

    try {
      final response = await _supabase
          .from('sleep_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('sleep_date', ascending: false)
          .limit(limit);

      return (response as List)
          .map((log) => SleepLog.fromJson(log))
          .toList();
    } catch (e) {
      debugPrint('Error getting sleep logs: $e');
      return [];
    }
  }

  /// Log sleep using direct database call (like web)
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
      // Check if a log already exists for this date
      final existing = await _supabase
          .from('sleep_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('sleep_date', sleepDate)
          .maybeSingle();

      Map<String, dynamic> response;

      if (existing != null) {
        // Update existing log
        response = await _supabase
            .from('sleep_logs')
            .update({
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
            })
            .eq('id', existing['id'])
            .select()
            .single();
      } else {
        // Insert new log
        response = await _supabase
            .from('sleep_logs')
            .insert({
              'user_id': user.id,
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
            })
            .select()
            .single();
      }

      return SleepLog.fromJson(response);
    } catch (e) {
      debugPrint('Error logging sleep: $e');
      return null;
    }
  }

  /// Get latest sleep analysis using direct database call
  Future<SleepAnalysis?> getAnalysis() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase
          .from('sleep_analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', ascending: false)
          .limit(1)
          .maybeSingle();

      if (response != null) {
        return SleepAnalysis.fromJson(response);
      }
      return null;
    } catch (e) {
      debugPrint('Error getting sleep analysis: $e');
      return null;
    }
  }

  /// Generate AI insights (this one still uses edge function for AI processing)
  Future<Map<String, dynamic>?> generateAIInsights() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase.functions.invoke(
        'sleep-ai',
        body: {'action': 'generateInsights'},
      );

      if (response.status == 200) {
        return response.data as Map<String, dynamic>?;
      }
      return null;
    } catch (e) {
      debugPrint('Error generating AI insights: $e');
      return null;
    }
  }

  /// Calculate streak - consecutive days meeting sleep goal
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

  /// Check subscription status
  Future<bool> checkSubscription() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return false;

    try {
      final response = await _supabase
          .from('profiles')
          .select('subscription_status')
          .eq('user_id', user.id)
          .maybeSingle();

      return response != null && response['subscription_status'] == 'active';
    } catch (e) {
      debugPrint('SleepService checkSubscription: $e');
      return false;
    }
  }
}
