class CalorieProfile {
  final int age;
  final String gender;
  final double heightCm;
  final double weightKg;
  final String activityLevel;
  final String goal;
  final double? targetWeightKg;
  final int calculatedBmr;
  final int calculatedTdee;
  final int recommendedCalories;
  final int recommendedProtein;
  final int recommendedCarbs;
  final int recommendedFat;

  CalorieProfile({
    required this.age,
    required this.gender,
    required this.heightCm,
    required this.weightKg,
    required this.activityLevel,
    required this.goal,
    this.targetWeightKg,
    required this.calculatedBmr,
    required this.calculatedTdee,
    required this.recommendedCalories,
    required this.recommendedProtein,
    required this.recommendedCarbs,
    required this.recommendedFat,
  });

  Map<String, dynamic> toJson() => {
        'age': age,
        'gender': gender,
        'height_cm': heightCm,
        'weight_kg': weightKg,
        'activity_level': activityLevel,
        'goal': goal,
        'target_weight_kg': targetWeightKg,
        'calculated_bmr': calculatedBmr,
        'calculated_tdee': calculatedTdee,
        'recommended_calories': recommendedCalories,
        'recommended_protein': recommendedProtein,
        'recommended_carbs': recommendedCarbs,
        'recommended_fat': recommendedFat,
      };

  factory CalorieProfile.fromJson(Map<String, dynamic> json) => CalorieProfile(
        age: json['age'] as int,
        gender: json['gender'] as String,
        heightCm: (json['height_cm'] as num).toDouble(),
        weightKg: (json['weight_kg'] as num).toDouble(),
        activityLevel: json['activity_level'] as String,
        goal: json['goal'] as String,
        targetWeightKg: json['target_weight_kg'] != null
            ? (json['target_weight_kg'] as num).toDouble()
            : null,
        calculatedBmr: json['calculated_bmr'] as int,
        calculatedTdee: json['calculated_tdee'] as int,
        recommendedCalories: json['recommended_calories'] as int,
        recommendedProtein: json['recommended_protein'] as int,
        recommendedCarbs: json['recommended_carbs'] as int,
        recommendedFat: json['recommended_fat'] as int,
      );
}

class ActivityLevel {
  final String value;
  final String label;
  final String description;
  final double multiplier;

  const ActivityLevel({
    required this.value,
    required this.label,
    required this.description,
    required this.multiplier,
  });
}

class GoalOption {
  final String value;
  final String label;
  final String description;
  final int calorieAdjust;

  const GoalOption({
    required this.value,
    required this.label,
    required this.description,
    required this.calorieAdjust,
  });
}

const List<ActivityLevel> activityLevels = [
  ActivityLevel(
    value: 'sedentary',
    label: 'Sedentary',
    description: 'Little or no exercise',
    multiplier: 1.2,
  ),
  ActivityLevel(
    value: 'light',
    label: 'Light',
    description: 'Exercise 1-3 days/week',
    multiplier: 1.375,
  ),
  ActivityLevel(
    value: 'moderate',
    label: 'Moderate',
    description: 'Exercise 3-5 days/week',
    multiplier: 1.55,
  ),
  ActivityLevel(
    value: 'active',
    label: 'Active',
    description: 'Exercise 6-7 days/week',
    multiplier: 1.725,
  ),
  ActivityLevel(
    value: 'very_active',
    label: 'Very Active',
    description: 'Hard exercise daily',
    multiplier: 1.9,
  ),
];

const List<GoalOption> goalOptions = [
  GoalOption(
    value: 'lose',
    label: 'Lose Weight',
    description: 'Create a calorie deficit',
    calorieAdjust: -500,
  ),
  GoalOption(
    value: 'maintain',
    label: 'Maintain',
    description: 'Stay at current weight',
    calorieAdjust: 0,
  ),
  GoalOption(
    value: 'gain',
    label: 'Build Muscle',
    description: 'Gain weight/muscle',
    calorieAdjust: 300,
  ),
];
