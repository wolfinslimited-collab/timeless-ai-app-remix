import 'dart:convert';
import 'package:flutter/foundation.dart';
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

  Map<String, dynamic> toJson() => {
    'type': type,
    'title': title,
    'description': description,
    'metric': metric,
  };
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
        return insightsData.map((i) => BrainInsight.fromJson(i as Map<String, dynamic>)).toList();
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

  /// Get user's brain profile using direct database call (like web)
  Future<BrainProfile?> getProfile() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final response = await _supabase
          .from('brain_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

      if (response != null) {
        return BrainProfile.fromJson(response);
      }
      return null;
    } catch (e) {
      debugPrint('Error getting brain profile: $e');
      return null;
    }
  }

  /// Create brain profile using direct database call (like web)
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
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      
      final response = await _supabase
          .from('brain_profiles')
          .insert({
            'user_id': user.id,
            'age': age,
            'gender': gender,
            'occupation': occupation,
            'work_schedule': workSchedule,
            'sleep_goal_hours': sleepGoalHours,
            'focus_goals': focusGoals,
            'baseline_start_date': today,
          })
          .select()
          .single();

      // Create initial metrics for today
      await _createInitialMetrics(user.id, today);

      return BrainProfile.fromJson(response);
    } catch (e) {
      debugPrint('Error creating brain profile: $e');
      return null;
    }
  }

  /// Create initial metrics for today
  Future<void> _createInitialMetrics(String userId, String today) async {
    try {
      final baseScore = 60 + DateTime.now().millisecond % 20;
      final insights = _generateInitialInsights();

      await _supabase.from('brain_metrics').insert({
        'user_id': userId,
        'metric_date': today,
        'brain_performance_score': baseScore,
        'focus_score': baseScore + (DateTime.now().millisecond % 10) - 5,
        'stress_load': 30 + (DateTime.now().millisecond % 20),
        'mood_stability': baseScore + (DateTime.now().millisecond % 10) - 5,
        'reaction_speed': baseScore + (DateTime.now().millisecond % 10) - 5,
        'cognitive_consistency': baseScore + (DateTime.now().millisecond % 10) - 5,
        'insights': insights.map((i) => i.toJson()).toList(),
      });
    } catch (e) {
      debugPrint('Error creating initial metrics: $e');
    }
  }

  List<BrainInsight> _generateInitialInsights() {
    final hour = DateTime.now().hour;
    final insights = <BrainInsight>[];

    if (hour >= 9 && hour <= 11) {
      insights.add(BrainInsight(
        type: 'positive',
        title: 'Peak Focus Window',
        description: 'This is typically your best time for deep work. Consider tackling your most important tasks now.',
      ));
    }

    if (hour >= 14 && hour <= 15) {
      insights.add(BrainInsight(
        type: 'neutral',
        title: 'Post-Lunch Dip',
        description: 'Energy often drops after lunch. A short walk or light stretching can help.',
      ));
    }

    if (hour >= 21) {
      insights.add(BrainInsight(
        type: 'warning',
        title: 'Wind Down Time',
        description: 'Consider reducing screen time to prepare for quality sleep.',
      ));
    }

    insights.add(BrainInsight(
      type: 'neutral',
      title: 'Building Your Baseline',
      description: 'Brain AI is learning your patterns. Check back daily for personalized insights.',
    ));

    return insights;
  }

  /// Get today's metrics using direct database call
  Future<BrainMetrics?> getTodayMetrics() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      
      final response = await _supabase
          .from('brain_metrics')
          .select('*')
          .eq('user_id', user.id)
          .eq('metric_date', today)
          .maybeSingle();

      if (response != null) {
        return BrainMetrics.fromJson(response);
      }
      return null;
    } catch (e) {
      debugPrint('Error getting today metrics: $e');
      return null;
    }
  }

  /// Get weekly metrics using direct database call
  Future<List<BrainMetrics>> getWeeklyMetrics() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return [];

    try {
      final weekAgo = DateTime.now().subtract(const Duration(days: 7));
      final weekAgoStr = DateFormat('yyyy-MM-dd').format(weekAgo);

      final response = await _supabase
          .from('brain_metrics')
          .select('*')
          .eq('user_id', user.id)
          .gte('metric_date', weekAgoStr)
          .order('metric_date', ascending: false);

      return (response as List)
          .map((m) => BrainMetrics.fromJson(m))
          .toList();
    } catch (e) {
      debugPrint('Error getting weekly metrics: $e');
      return [];
    }
  }

  /// Get recent mood logs using direct database call
  Future<List<BrainMoodLog>> getRecentMoodLogs({int limit = 10}) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return [];

    try {
      final response = await _supabase
          .from('brain_mood_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('logged_at', ascending: false)
          .limit(limit);

      return (response as List)
          .map((l) => BrainMoodLog.fromJson(l))
          .toList();
    } catch (e) {
      debugPrint('Error getting mood logs: $e');
      return [];
    }
  }

  /// Log mood using direct database call (like web)
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
      // Insert mood log
      await _supabase.from('brain_mood_logs').insert({
        'user_id': user.id,
        'mood_score': moodScore,
        'energy_level': energyLevel,
        'focus_level': focusLevel,
        'stress_level': stressLevel,
        'notes': notes,
        'context': context,
      });

      // Update today's metrics with mood data
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      
      // Check if metrics exist for today
      final existing = await _supabase
          .from('brain_metrics')
          .select('id')
          .eq('user_id', user.id)
          .eq('metric_date', today)
          .maybeSingle();

      if (existing != null) {
        await _supabase
            .from('brain_metrics')
            .update({
              'self_reported_mood': moodScore,
              'self_reported_energy': energyLevel,
              'self_reported_focus': focusLevel,
              'mood_stability': (moodScore * 10),
              'stress_load': (stressLevel ?? 5) * 10,
            })
            .eq('id', existing['id']);
      } else {
        await _supabase.from('brain_metrics').insert({
          'user_id': user.id,
          'metric_date': today,
          'self_reported_mood': moodScore,
          'self_reported_energy': energyLevel,
          'self_reported_focus': focusLevel,
          'mood_stability': (moodScore * 10),
          'stress_load': (stressLevel ?? 5) * 10,
        });
      }

      return true;
    } catch (e) {
      debugPrint('Error logging mood: $e');
      return false;
    }
  }

  /// Refresh metrics - create/update today's metrics
  Future<BrainMetrics?> refreshMetrics() async {
    final user = _supabase.auth.currentUser;
    if (user == null) return null;

    try {
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final baseScore = 60 + DateTime.now().millisecond % 20;
      final insights = _generateInitialInsights();

      // Check if metrics exist for today
      final existing = await _supabase
          .from('brain_metrics')
          .select('id')
          .eq('user_id', user.id)
          .eq('metric_date', today)
          .maybeSingle();

      Map<String, dynamic> response;
      
      if (existing != null) {
        response = await _supabase
            .from('brain_metrics')
            .update({
              'brain_performance_score': baseScore,
              'focus_score': baseScore + (DateTime.now().millisecond % 10) - 5,
              'stress_load': 30 + (DateTime.now().millisecond % 20),
              'mood_stability': baseScore + (DateTime.now().millisecond % 10) - 5,
              'reaction_speed': baseScore + (DateTime.now().millisecond % 10) - 5,
              'cognitive_consistency': baseScore + (DateTime.now().millisecond % 10) - 5,
              'insights': insights.map((i) => i.toJson()).toList(),
            })
            .eq('id', existing['id'])
            .select()
            .single();
      } else {
        response = await _supabase
            .from('brain_metrics')
            .insert({
              'user_id': user.id,
              'metric_date': today,
              'brain_performance_score': baseScore,
              'focus_score': baseScore + (DateTime.now().millisecond % 10) - 5,
              'stress_load': 30 + (DateTime.now().millisecond % 20),
              'mood_stability': baseScore + (DateTime.now().millisecond % 10) - 5,
              'reaction_speed': baseScore + (DateTime.now().millisecond % 10) - 5,
              'cognitive_consistency': baseScore + (DateTime.now().millisecond % 10) - 5,
              'insights': insights.map((i) => i.toJson()).toList(),
            })
            .select()
            .single();
      }

      return BrainMetrics.fromJson(response);
    } catch (e) {
      debugPrint('Error refreshing metrics: $e');
      return null;
    }
  }

  /// Check subscription using direct database call
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
      debugPrint('BrainService checkSubscription: $e');
      return false;
    }
  }
}
