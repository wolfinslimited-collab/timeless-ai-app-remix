import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/calorie_profile_model.dart';
import '../models/nutrition_models.dart';

class CalorieService {
  static const String _profileKey = 'calorie_profile';
  static const String _goalsKey = 'calorie_goals';

  static final _supabase = Supabase.instance.client;

  // Calculate BMR using Mifflin-St Jeor Equation
  static double calculateBMR(int age, String gender, double height, double weight) {
    if (gender == 'male') {
      return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161;
    }
  }

  // Calculate TDEE
  static double calculateTDEE(double bmr, String activityLevelValue) {
    final activity = activityLevels.firstWhere(
      (a) => a.value == activityLevelValue,
      orElse: () => activityLevels[2], // Default to moderate
    );
    return bmr * activity.multiplier;
  }

  // Calculate recommended macros
  static Map<String, int> calculateMacros(int calories, String goal) {
    double proteinRatio, carbsRatio, fatRatio;

    if (goal == 'lose') {
      proteinRatio = 0.35;
      fatRatio = 0.30;
      carbsRatio = 0.35;
    } else if (goal == 'gain') {
      proteinRatio = 0.30;
      fatRatio = 0.25;
      carbsRatio = 0.45;
    } else {
      proteinRatio = 0.25;
      fatRatio = 0.30;
      carbsRatio = 0.45;
    }

    return {
      'protein': ((calories * proteinRatio) / 4).round(),
      'carbs': ((calories * carbsRatio) / 4).round(),
      'fat': ((calories * fatRatio) / 9).round(),
    };
  }

  // Create a complete profile with calculations
  static CalorieProfile createProfile({
    required int age,
    required String gender,
    required double heightCm,
    required double weightKg,
    required String activityLevel,
    required String goal,
    double? targetWeightKg,
  }) {
    final bmr = calculateBMR(age, gender, heightCm, weightKg);
    final tdee = calculateTDEE(bmr, activityLevel);
    
    final goalData = goalOptions.firstWhere(
      (g) => g.value == goal,
      orElse: () => goalOptions[1],
    );
    
    final recommendedCalories = (tdee + goalData.calorieAdjust).round();
    final macros = calculateMacros(recommendedCalories, goal);

    return CalorieProfile(
      age: age,
      gender: gender,
      heightCm: heightCm,
      weightKg: weightKg,
      activityLevel: activityLevel,
      goal: goal,
      targetWeightKg: targetWeightKg,
      calculatedBmr: bmr.round(),
      calculatedTdee: tdee.round(),
      recommendedCalories: recommendedCalories,
      recommendedProtein: macros['protein']!,
      recommendedCarbs: macros['carbs']!,
      recommendedFat: macros['fat']!,
    );
  }

  // Save profile to local storage and Supabase
  static Future<void> saveProfile(CalorieProfile profile) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_profileKey, jsonEncode(profile.toJson()));

    // Also save to Supabase if authenticated
    final userId = _supabase.auth.currentUser?.id;
    if (userId != null) {
      try {
        await _supabase.from('calorie_profiles').upsert({
          'user_id': userId,
          'age': profile.age,
          'gender': profile.gender,
          'height_cm': profile.heightCm,
          'weight_kg': profile.weightKg,
          'activity_level': profile.activityLevel,
          'goal': profile.goal,
          'target_weight_kg': profile.targetWeightKg,
          'calculated_bmr': profile.calculatedBmr,
          'calculated_tdee': profile.calculatedTdee,
          'recommended_calories': profile.recommendedCalories,
          'recommended_protein': profile.recommendedProtein,
          'recommended_carbs': profile.recommendedCarbs,
          'recommended_fat': profile.recommendedFat,
          'updated_at': DateTime.now().toIso8601String(),
        }, onConflict: 'user_id');
      } catch (e) {
        // Silently fail for Supabase - local storage is primary
        print('Failed to save profile to Supabase: $e');
      }
    }
  }

  // Load profile from local storage or Supabase
  static Future<CalorieProfile?> loadProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final profileJson = prefs.getString(_profileKey);
    if (profileJson != null) {
      return CalorieProfile.fromJson(jsonDecode(profileJson));
    }

    // Try loading from Supabase
    final userId = _supabase.auth.currentUser?.id;
    if (userId != null) {
      try {
        final data = await _supabase
            .from('calorie_profiles')
            .select()
            .eq('user_id', userId)
            .maybeSingle();
        
        if (data != null) {
          final profile = CalorieProfile(
            age: data['age'] as int,
            gender: data['gender'] as String,
            heightCm: (data['height_cm'] as num).toDouble(),
            weightKg: (data['weight_kg'] as num).toDouble(),
            activityLevel: data['activity_level'] as String,
            goal: data['goal'] as String,
            targetWeightKg: data['target_weight_kg'] != null 
                ? (data['target_weight_kg'] as num).toDouble() 
                : null,
            calculatedBmr: (data['calculated_bmr'] as num).toInt(),
            calculatedTdee: (data['calculated_tdee'] as num).toInt(),
            recommendedCalories: data['recommended_calories'] as int,
            recommendedProtein: data['recommended_protein'] as int,
            recommendedCarbs: data['recommended_carbs'] as int,
            recommendedFat: data['recommended_fat'] as int,
          );
          // Cache locally
          await prefs.setString(_profileKey, jsonEncode(profile.toJson()));
          return profile;
        }
      } catch (e) {
        print('Failed to load profile from Supabase: $e');
      }
    }
    return null;
  }

  // Check if profile exists
  static Future<bool> hasProfile() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.containsKey(_profileKey)) return true;
    
    // Also check Supabase
    final userId = _supabase.auth.currentUser?.id;
    if (userId != null) {
      try {
        final data = await _supabase
            .from('calorie_profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
        return data != null;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  // Clear profile
  static Future<void> clearProfile() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_profileKey);
  }

  // ==================== API CALLS ====================

  // Analyze food image
  static Future<AnalysisResult> analyzeImage(String base64Image, {String? prompt}) async {
    final response = await _supabase.functions.invoke(
      'calorie-ai',
      body: {
        'action': 'analyze_image',
        'image': base64Image,
        if (prompt != null) 'prompt': prompt,
      },
    );

    if (response.status != 200) {
      throw Exception(response.data?['error'] ?? 'Failed to analyze image');
    }

    final data = response.data['data'];
    return AnalysisResult.fromJson(data);
  }

  // Analyze food by text description
  static Future<AnalysisResult> analyzeText(String foodDescription) async {
    final response = await _supabase.functions.invoke(
      'calorie-ai',
      body: {
        'action': 'analyze_text',
        'food_description': foodDescription,
      },
    );

    if (response.status != 200) {
      throw Exception(response.data?['error'] ?? 'Failed to analyze food');
    }

    final data = response.data['data'];
    return AnalysisResult.fromJson(data);
  }

  // Get meal suggestions
  static Future<List<MealSuggestion>> getMealSuggestions({
    required int remainingCalories,
    required int remainingProtein,
    required int remainingCarbs,
    required int remainingFat,
    String? mealType,
  }) async {
    final response = await _supabase.functions.invoke(
      'calorie-ai',
      body: {
        'action': 'suggest_meals',
        'remaining_macros': {
          'calories': remainingCalories,
          'protein': remainingProtein,
          'carbs': remainingCarbs,
          'fat': remainingFat,
        },
        if (mealType != null && mealType != 'any') 'meal_type_preference': mealType,
      },
    );

    if (response.status != 200) {
      throw Exception(response.data?['error'] ?? 'Failed to get suggestions');
    }

    final suggestions = response.data['data']['suggestions'] as List<dynamic>;
    return suggestions
        .map((s) => MealSuggestion.fromJson(s as Map<String, dynamic>))
        .toList();
  }

  // ==================== MEAL LOGS ====================

  // Save a meal log
  static Future<void> saveMealLog({
    required AnalysisResult analysis,
    required String mealType,
  }) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) throw Exception('Not authenticated');

    await _supabase.from('meal_logs').insert({
      'user_id': userId,
      'meal_type': mealType,
      'foods': analysis.foods.map((f) => f.toJson()).toList(),
      'total_calories': analysis.totalCalories,
      'total_protein': analysis.totalProtein,
      'total_carbs': analysis.totalCarbs,
      'total_fat': analysis.totalFat,
      'health_score': analysis.healthScore,
      'meal_description': analysis.mealDescription,
      'logged_at': DateTime.now().toIso8601String(),
    });
  }

  // Get today's meal logs
  static Future<List<MealLog>> getTodayMealLogs() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return [];

    final todayStart = DateTime.now().copyWith(
      hour: 0, minute: 0, second: 0, millisecond: 0,
    );
    final todayEnd = todayStart.add(const Duration(days: 1));

    final data = await _supabase
        .from('meal_logs')
        .select()
        .eq('user_id', userId)
        .gte('logged_at', todayStart.toIso8601String())
        .lt('logged_at', todayEnd.toIso8601String())
        .order('logged_at', ascending: false);

    return (data as List).map((e) => MealLog.fromJson(e)).toList();
  }

  // Get meal logs for a date range
  static Future<List<MealLog>> getMealLogs({
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return [];

    final data = await _supabase
        .from('meal_logs')
        .select()
        .eq('user_id', userId)
        .gte('logged_at', startDate.toIso8601String())
        .lte('logged_at', endDate.toIso8601String())
        .order('logged_at', ascending: false);

    return (data as List).map((e) => MealLog.fromJson(e)).toList();
  }

  // Delete a meal log
  static Future<void> deleteMealLog(String mealId) async {
    await _supabase.from('meal_logs').delete().eq('id', mealId);
  }

  // Get today's totals
  static Future<Map<String, double>> getTodayTotals() async {
    final logs = await getTodayMealLogs();
    
    double calories = 0, protein = 0, carbs = 0, fat = 0;
    for (final log in logs) {
      calories += log.totalCalories;
      protein += log.totalProtein;
      carbs += log.totalCarbs;
      fat += log.totalFat;
    }

    return {
      'calories': calories,
      'protein': protein,
      'carbs': carbs,
      'fat': fat,
    };
  }

  // ==================== WATER TRACKING ====================

  // Get today's water intake
  static Future<int> getTodayWater() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return 0;

    final todayStart = DateTime.now().copyWith(
      hour: 0, minute: 0, second: 0, millisecond: 0,
    );
    final todayEnd = todayStart.add(const Duration(days: 1));

    final data = await _supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', userId)
        .gte('logged_at', todayStart.toIso8601String())
        .lt('logged_at', todayEnd.toIso8601String());

    return (data as List).fold<int>(0, (sum, log) => sum + (log['amount_ml'] as int));
  }

  // Add water intake
  static Future<void> addWater(int amountMl) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) throw Exception('Not authenticated');

    await _supabase.from('water_logs').insert({
      'user_id': userId,
      'amount_ml': amountMl,
      'logged_at': DateTime.now().toIso8601String(),
    });
  }

  // Remove last water log
  static Future<void> removeLastWater() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return;

    final todayStart = DateTime.now().copyWith(
      hour: 0, minute: 0, second: 0, millisecond: 0,
    );
    final todayEnd = todayStart.add(const Duration(days: 1));

    final data = await _supabase
        .from('water_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('logged_at', todayStart.toIso8601String())
        .lt('logged_at', todayEnd.toIso8601String())
        .order('logged_at', ascending: false)
        .limit(1);

    if ((data as List).isNotEmpty) {
      await _supabase.from('water_logs').delete().eq('id', data[0]['id']);
    }
  }

  // ==================== GOALS MANAGEMENT ====================

  static Future<void> saveGoals({
    required int waterGoal,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('waterGoal', waterGoal);
  }

  static Future<int> getWaterGoal() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('waterGoal') ?? 2000;
  }
}
