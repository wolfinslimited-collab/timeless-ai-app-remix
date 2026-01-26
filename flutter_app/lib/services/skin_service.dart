import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';

class SkinConcern {
  final String name;
  final String severity;
  final String description;

  SkinConcern({
    required this.name,
    required this.severity,
    required this.description,
  });

  factory SkinConcern.fromJson(Map<String, dynamic> json) {
    return SkinConcern(
      name: json['name'] ?? '',
      severity: json['severity'] ?? 'mild',
      description: json['description'] ?? '',
    );
  }
}

class SkinAnalysisResult {
  final String skinType;
  final int overallScore;
  final int hydrationLevel;
  final int oilinessLevel;
  final List<SkinConcern> concerns;
  final List<String> recommendations;
  final String analysisSummary;

  SkinAnalysisResult({
    required this.skinType,
    required this.overallScore,
    required this.hydrationLevel,
    required this.oilinessLevel,
    required this.concerns,
    required this.recommendations,
    required this.analysisSummary,
  });

  factory SkinAnalysisResult.fromJson(Map<String, dynamic> json) {
    return SkinAnalysisResult(
      skinType: json['skin_type'] ?? 'normal',
      overallScore: json['overall_score'] ?? 70,
      hydrationLevel: json['hydration_level'] ?? 50,
      oilinessLevel: json['oiliness_level'] ?? 50,
      concerns: (json['concerns'] as List<dynamic>?)
              ?.map((c) => SkinConcern.fromJson(c))
              .toList() ??
          [],
      recommendations: List<String>.from(json['recommendations'] ?? []),
      analysisSummary: json['analysis_summary'] ?? '',
    );
  }
}

class SkinProfile {
  final int? age;
  final String? gender;
  final String? skinType;
  final List<String>? primaryConcerns;
  final List<String>? skinGoals;
  final String? currentRoutine;
  final String? sunExposure;
  final String? waterIntake;
  final String? sleepQuality;
  final String? stressLevel;
  final String? dietType;

  SkinProfile({
    this.age,
    this.gender,
    this.skinType,
    this.primaryConcerns,
    this.skinGoals,
    this.currentRoutine,
    this.sunExposure,
    this.waterIntake,
    this.sleepQuality,
    this.stressLevel,
    this.dietType,
  });

  Map<String, dynamic> toJson() {
    return {
      if (age != null) 'age': age,
      if (gender != null) 'gender': gender,
      if (skinType != null) 'skin_type': skinType,
      if (primaryConcerns != null) 'primary_concerns': primaryConcerns,
      if (skinGoals != null) 'skin_goals': skinGoals,
      if (currentRoutine != null) 'current_routine': currentRoutine,
      if (sunExposure != null) 'sun_exposure': sunExposure,
      if (waterIntake != null) 'water_intake': waterIntake,
      if (sleepQuality != null) 'sleep_quality': sleepQuality,
      if (stressLevel != null) 'stress_level': stressLevel,
      if (dietType != null) 'diet_type': dietType,
    };
  }
}

class SkinService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Analyze skin from image
  Future<SkinAnalysisResult> analyzeSkin({
    required String imageBase64,
    SkinProfile? skinProfile,
  }) async {
    final response = await _supabase.functions.invoke(
      'skin-ai',
      body: {
        'action': 'analyze',
        'image_base64': imageBase64,
        if (skinProfile != null) 'skin_profile': skinProfile.toJson(),
      },
    );

    if (response.status != 200) {
      final error = response.data?['error'] ?? 'Analysis failed';
      throw Exception(error);
    }

    final data = response.data['data'];
    if (data == null) {
      throw Exception('No analysis data returned');
    }

    return SkinAnalysisResult.fromJson(data);
  }

  /// Save analysis to history
  Future<void> saveAnalysis({
    required String userId,
    required SkinAnalysisResult result,
    String? imageUrl,
  }) async {
    await _supabase.from('skin_analyses').insert({
      'user_id': userId,
      'image_url': imageUrl,
      'skin_type': result.skinType,
      'overall_score': result.overallScore,
      'hydration_level': result.hydrationLevel,
      'oiliness_level': result.oilinessLevel,
      'concerns': result.concerns.map((c) => {
        'name': c.name,
        'severity': c.severity,
        'description': c.description,
      }).toList(),
      'recommendations': result.recommendations,
      'analysis_summary': result.analysisSummary,
    });
  }

  /// Get analysis history
  Future<List<Map<String, dynamic>>> getAnalysisHistory() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return [];

    final response = await _supabase
        .from('skin_analyses')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .limit(20);

    return List<Map<String, dynamic>>.from(response);
  }
}
