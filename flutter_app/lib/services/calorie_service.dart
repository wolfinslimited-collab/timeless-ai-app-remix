import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/calorie_profile_model.dart';

class CalorieService {
  static const String _profileKey = 'calorie_profile';

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
      // Higher protein for preserving muscle during deficit
      proteinRatio = 0.35;
      fatRatio = 0.30;
      carbsRatio = 0.35;
    } else if (goal == 'gain') {
      // Balanced for muscle building
      proteinRatio = 0.30;
      fatRatio = 0.25;
      carbsRatio = 0.45;
    } else {
      // Maintenance
      proteinRatio = 0.25;
      fatRatio = 0.30;
      carbsRatio = 0.45;
    }

    return {
      'protein': ((calories * proteinRatio) / 4).round(), // 4 cal per gram
      'carbs': ((calories * carbsRatio) / 4).round(),
      'fat': ((calories * fatRatio) / 9).round(), // 9 cal per gram
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
      orElse: () => goalOptions[1], // Default to maintain
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

  // Save profile to local storage
  static Future<void> saveProfile(CalorieProfile profile) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_profileKey, jsonEncode(profile.toJson()));
  }

  // Load profile from local storage
  static Future<CalorieProfile?> loadProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final profileJson = prefs.getString(_profileKey);
    if (profileJson != null) {
      return CalorieProfile.fromJson(jsonDecode(profileJson));
    }
    return null;
  }

  // Check if profile exists
  static Future<bool> hasProfile() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.containsKey(_profileKey);
  }

  // Clear profile
  static Future<void> clearProfile() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_profileKey);
  }
}
