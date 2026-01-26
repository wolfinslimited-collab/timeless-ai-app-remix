/// Nutrition information for a single food item
class NutritionInfo {
  final String foodName;
  final String servingSize;
  final int calories;
  final double protein;
  final double carbohydrates;
  final double fat;
  final double fiber;
  final double sugar;
  final int sodium;
  final double confidence;

  NutritionInfo({
    required this.foodName,
    required this.servingSize,
    required this.calories,
    required this.protein,
    required this.carbohydrates,
    required this.fat,
    required this.fiber,
    required this.sugar,
    required this.sodium,
    required this.confidence,
  });

  factory NutritionInfo.fromJson(Map<String, dynamic> json) => NutritionInfo(
        foodName: json['food_name'] as String? ?? 'Unknown',
        servingSize: json['serving_size'] as String? ?? '1 serving',
        calories: (json['calories'] as num?)?.toInt() ?? 0,
        protein: (json['protein'] as num?)?.toDouble() ?? 0,
        carbohydrates: (json['carbohydrates'] as num?)?.toDouble() ?? 0,
        fat: (json['fat'] as num?)?.toDouble() ?? 0,
        fiber: (json['fiber'] as num?)?.toDouble() ?? 0,
        sugar: (json['sugar'] as num?)?.toDouble() ?? 0,
        sodium: (json['sodium'] as num?)?.toInt() ?? 0,
        confidence: (json['confidence'] as num?)?.toDouble() ?? 0.8,
      );

  Map<String, dynamic> toJson() => {
        'food_name': foodName,
        'serving_size': servingSize,
        'calories': calories,
        'protein': protein,
        'carbohydrates': carbohydrates,
        'fat': fat,
        'fiber': fiber,
        'sugar': sugar,
        'sodium': sodium,
        'confidence': confidence,
      };
}

/// Result of analyzing a meal
class AnalysisResult {
  final List<NutritionInfo> foods;
  final int totalCalories;
  final double totalProtein;
  final double totalCarbs;
  final double totalFat;
  final String mealDescription;
  final int healthScore;
  final List<String> suggestions;

  AnalysisResult({
    required this.foods,
    required this.totalCalories,
    required this.totalProtein,
    required this.totalCarbs,
    required this.totalFat,
    required this.mealDescription,
    required this.healthScore,
    required this.suggestions,
  });

  factory AnalysisResult.fromJson(Map<String, dynamic> json) => AnalysisResult(
        foods: (json['foods'] as List<dynamic>?)
                ?.map((e) => NutritionInfo.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        totalCalories: (json['total_calories'] as num?)?.toInt() ?? 0,
        totalProtein: (json['total_protein'] as num?)?.toDouble() ?? 0,
        totalCarbs: (json['total_carbs'] as num?)?.toDouble() ?? 0,
        totalFat: (json['total_fat'] as num?)?.toDouble() ?? 0,
        mealDescription: json['meal_description'] as String? ?? '',
        healthScore: (json['health_score'] as num?)?.toInt() ?? 5,
        suggestions: (json['suggestions'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
      );
}

/// A logged meal entry
class MealLog {
  final String id;
  final String userId;
  final String mealType;
  final List<NutritionInfo> foods;
  final int totalCalories;
  final double totalProtein;
  final double totalCarbs;
  final double totalFat;
  final int healthScore;
  final String mealDescription;
  final DateTime loggedAt;
  final DateTime createdAt;

  MealLog({
    required this.id,
    required this.userId,
    required this.mealType,
    required this.foods,
    required this.totalCalories,
    required this.totalProtein,
    required this.totalCarbs,
    required this.totalFat,
    required this.healthScore,
    required this.mealDescription,
    required this.loggedAt,
    required this.createdAt,
  });

  factory MealLog.fromJson(Map<String, dynamic> json) => MealLog(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        mealType: json['meal_type'] as String? ?? 'snack',
        foods: (json['foods'] as List<dynamic>?)
                ?.map((e) => NutritionInfo.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        totalCalories: (json['total_calories'] as num?)?.toInt() ?? 0,
        totalProtein: (json['total_protein'] as num?)?.toDouble() ?? 0,
        totalCarbs: (json['total_carbs'] as num?)?.toDouble() ?? 0,
        totalFat: (json['total_fat'] as num?)?.toDouble() ?? 0,
        healthScore: (json['health_score'] as num?)?.toInt() ?? 5,
        mealDescription: json['meal_description'] as String? ?? '',
        loggedAt: DateTime.parse(json['logged_at'] as String),
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'meal_type': mealType,
        'foods': foods.map((f) => f.toJson()).toList(),
        'total_calories': totalCalories,
        'total_protein': totalProtein,
        'total_carbs': totalCarbs,
        'total_fat': totalFat,
        'health_score': healthScore,
        'meal_description': mealDescription,
        'logged_at': loggedAt.toIso8601String(),
        'created_at': createdAt.toIso8601String(),
      };
}

/// Meal suggestion from AI
class MealSuggestion {
  final String name;
  final String description;
  final int calories;
  final double protein;
  final double carbs;
  final double fat;
  final String prepTime;
  final List<String> ingredients;
  final String mealType;
  final String? imageUrl;

  MealSuggestion({
    required this.name,
    required this.description,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fat,
    required this.prepTime,
    required this.ingredients,
    required this.mealType,
    this.imageUrl,
  });

  factory MealSuggestion.fromJson(Map<String, dynamic> json) => MealSuggestion(
        name: json['name'] as String? ?? 'Unknown Meal',
        description: json['description'] as String? ?? '',
        calories: (json['calories'] as num?)?.toInt() ?? 0,
        protein: (json['protein'] as num?)?.toDouble() ?? 0,
        carbs: (json['carbs'] as num?)?.toDouble() ?? 0,
        fat: (json['fat'] as num?)?.toDouble() ?? 0,
        prepTime: json['prep_time'] as String? ?? '30 mins',
        ingredients: (json['ingredients'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
        mealType: json['meal_type'] as String? ?? 'snack',
        imageUrl: json['image_url'] as String?,
      );
}

/// Water log entry
class WaterLog {
  final String id;
  final String userId;
  final int amountMl;
  final DateTime loggedAt;
  final DateTime createdAt;

  WaterLog({
    required this.id,
    required this.userId,
    required this.amountMl,
    required this.loggedAt,
    required this.createdAt,
  });

  factory WaterLog.fromJson(Map<String, dynamic> json) => WaterLog(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        amountMl: (json['amount_ml'] as num?)?.toInt() ?? 250,
        loggedAt: DateTime.parse(json['logged_at'] as String),
        createdAt: DateTime.parse(json['created_at'] as String),
      );
}

/// Daily nutrition statistics
class DailyStats {
  final DateTime date;
  final int calories;
  final double protein;
  final double carbs;
  final double fat;
  final int meals;
  final int waterMl;

  DailyStats({
    required this.date,
    required this.calories,
    required this.protein,
    required this.carbs,
    required this.fat,
    required this.meals,
    required this.waterMl,
  });
}

/// Meal type options
class MealType {
  final String value;
  final String label;
  final String emoji;

  const MealType({
    required this.value,
    required this.label,
    required this.emoji,
  });
}

const List<MealType> mealTypes = [
  MealType(value: 'breakfast', label: 'Breakfast', emoji: '🌅'),
  MealType(value: 'lunch', label: 'Lunch', emoji: '☀️'),
  MealType(value: 'dinner', label: 'Dinner', emoji: '🌙'),
  MealType(value: 'snack', label: 'Snack', emoji: '🍎'),
];
