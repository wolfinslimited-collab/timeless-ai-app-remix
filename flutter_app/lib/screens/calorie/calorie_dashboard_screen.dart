import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../models/calorie_profile_model.dart';
import '../../models/nutrition_models.dart';
import '../../services/calorie_service.dart';

class CalorieDashboardScreen extends StatefulWidget {
  const CalorieDashboardScreen({super.key});

  @override
  State<CalorieDashboardScreen> createState() => _CalorieDashboardScreenState();
}

class _CalorieDashboardScreenState extends State<CalorieDashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  CalorieProfile? _profile;
  bool _isLoading = true;

  // Today's totals
  int _todayCalories = 0;
  double _todayProtein = 0;
  double _todayCarbs = 0;
  double _todayFat = 0;
  int _todayWater = 0;
  int _waterGoal = 2000;

  // Meal logs
  List<MealLog> _todayMeals = [];

  // Food analysis
  AnalysisResult? _analysisResult;
  bool _isAnalyzing = false;
  String _foodDescription = '';
  String? _selectedImageBase64;
  String _selectedMealType = 'snack';

  // Meal suggestions
  List<MealSuggestion> _mealSuggestions = [];
  bool _isLoadingSuggestions = false;
  String _suggestionMealType = 'any';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final profile = await CalorieService.loadProfile();
      final totals = await CalorieService.getTodayTotals();
      final meals = await CalorieService.getTodayMealLogs();
      final water = await CalorieService.getTodayWater();
      final waterGoal = await CalorieService.getWaterGoal();

      if (mounted) {
        setState(() {
          _profile = profile;
          _todayCalories = totals['calories']?.toInt() ?? 0;
          _todayProtein = totals['protein'] ?? 0;
          _todayCarbs = totals['carbs'] ?? 0;
          _todayFat = totals['fat'] ?? 0;
          _todayMeals = meals;
          _todayWater = water;
          _waterGoal = waterGoal;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.camera, maxWidth: 1024);
    if (image != null) {
      final bytes = await File(image.path).readAsBytes();
      final base64 = base64Encode(bytes);
      setState(() {
        _selectedImageBase64 = 'data:image/jpeg;base64,$base64';
        _analysisResult = null;
      });
    }
  }

  Future<void> _pickGalleryImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, maxWidth: 1024);
    if (image != null) {
      final bytes = await File(image.path).readAsBytes();
      final base64 = base64Encode(bytes);
      setState(() {
        _selectedImageBase64 = 'data:image/jpeg;base64,$base64';
        _analysisResult = null;
      });
    }
  }

  Future<void> _analyzeImage() async {
    if (_selectedImageBase64 == null) return;

    setState(() => _isAnalyzing = true);
    try {
      final result = await CalorieService.analyzeImage(_selectedImageBase64!);
      setState(() {
        _analysisResult = result;
        _isAnalyzing = false;
      });
    } catch (e) {
      setState(() => _isAnalyzing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _analyzeText() async {
    if (_foodDescription.trim().isEmpty) return;

    setState(() => _isAnalyzing = true);
    try {
      final result = await CalorieService.analyzeText(_foodDescription);
      setState(() {
        _analysisResult = result;
        _isAnalyzing = false;
      });
    } catch (e) {
      setState(() => _isAnalyzing = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _saveMeal() async {
    if (_analysisResult == null) return;

    try {
      await CalorieService.saveMealLog(
        analysis: _analysisResult!,
        mealType: _selectedMealType,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Meal logged successfully!')),
        );
      }

      setState(() {
        _analysisResult = null;
        _selectedImageBase64 = null;
        _foodDescription = '';
      });
      
      _loadData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _addWater(int amount) async {
    try {
      await CalorieService.addWater(amount);
      setState(() => _todayWater += amount);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _removeWater() async {
    if (_todayWater == 0) return;
    try {
      await CalorieService.removeLastWater();
      setState(() => _todayWater = (_todayWater - 250).clamp(0, double.infinity).toInt());
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _loadMealSuggestions() async {
    if (_profile == null) return;

    final remaining = {
      'calories': (_profile!.recommendedCalories - _todayCalories).clamp(0, double.infinity).toInt(),
      'protein': (_profile!.recommendedProtein - _todayProtein).clamp(0, double.infinity).toInt(),
      'carbs': (_profile!.recommendedCarbs - _todayCarbs).clamp(0, double.infinity).toInt(),
      'fat': (_profile!.recommendedFat - _todayFat).clamp(0, double.infinity).toInt(),
    };

    setState(() => _isLoadingSuggestions = true);
    try {
      final suggestions = await CalorieService.getMealSuggestions(
        remainingCalories: remaining['calories']!,
        remainingProtein: remaining['protein']!,
        remainingCarbs: remaining['carbs']!,
        remainingFat: remaining['fat']!,
        mealType: _suggestionMealType,
      );
      setState(() {
        _mealSuggestions = suggestions;
        _isLoadingSuggestions = false;
      });
    } catch (e) {
      setState(() => _isLoadingSuggestions = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  Future<void> _deleteMeal(String mealId) async {
    try {
      await CalorieService.deleteMealLog(mealId);
      _loadData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AppTheme.background,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_profile == null) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: AppTheme.muted),
              const SizedBox(height: 16),
              const Text('No profile found'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.go('/calorie-onboarding'),
                child: const Text('Create Profile'),
              ),
            ],
          ),
        ),
      );
    }

    final calorieProgress = (_todayCalories / _profile!.recommendedCalories).clamp(0.0, 1.0);
    final proteinProgress = (_todayProtein / _profile!.recommendedProtein).clamp(0.0, 1.0);
    final carbsProgress = (_todayCarbs / _profile!.recommendedCarbs).clamp(0.0, 1.0);
    final fatProgress = (_todayFat / _profile!.recommendedFat).clamp(0.0, 1.0);
    final waterProgress = (_todayWater / _waterGoal).clamp(0.0, 1.0);

    final remainingCalories = _profile!.recommendedCalories - _todayCalories;
    final isOverGoal = _todayCalories >= _profile!.recommendedCalories;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/apps'),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Hello 🥗', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            Text(
              DateFormat('EEEE, MMMM d').format(DateTime.now()),
              style: const TextStyle(fontSize: 12, color: AppTheme.muted),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () => _showSettingsDialog(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Stats Cards
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildStatCard(
                    icon: Icons.local_fire_department,
                    iconColor: Colors.orange,
                    label: 'Calories',
                    value: '$_todayCalories',
                    goal: '/ ${_profile!.recommendedCalories}',
                    progress: calorieProgress,
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    icon: Icons.egg,
                    iconColor: Colors.red.shade300,
                    label: 'Protein',
                    value: '${_todayProtein.round()}g',
                    goal: '/ ${_profile!.recommendedProtein}g',
                    progress: proteinProgress,
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    icon: Icons.grain,
                    iconColor: Colors.amber,
                    label: 'Carbs',
                    value: '${_todayCarbs.round()}g',
                    goal: '/ ${_profile!.recommendedCarbs}g',
                    progress: carbsProgress,
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    icon: Icons.water_drop,
                    iconColor: Colors.blue,
                    label: 'Fat',
                    value: '${_todayFat.round()}g',
                    goal: '/ ${_profile!.recommendedFat}g',
                    progress: fatProgress,
                  ),
                  const SizedBox(width: 12),
                  _buildWaterCard(waterProgress),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Progress Ring
          _buildProgressRing(calorieProgress, remainingCalories, isOverGoal),
          const SizedBox(height: 16),

          // Tabs
          TabBar(
            controller: _tabController,
            tabs: const [
              Tab(text: 'Log Food'),
              Tab(text: 'History'),
              Tab(text: 'Meal Ideas'),
            ],
            labelColor: Colors.white,
            unselectedLabelColor: AppTheme.muted,
            indicatorColor: AppTheme.primary,
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildLogFoodTab(),
                _buildHistoryTab(),
                _buildMealIdeasTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    required String goal,
    required double progress,
  }) {
    return Container(
      width: 120,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: iconColor, size: 20),
              Text(
                '${(progress * 100).round()}%',
                style: const TextStyle(fontSize: 10, color: AppTheme.muted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              Text(goal, style: const TextStyle(fontSize: 10, color: AppTheme.muted)),
            ],
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: progress,
            backgroundColor: AppTheme.border,
            valueColor: AlwaysStoppedAnimation(iconColor),
          ),
        ],
      ),
    );
  }

  Widget _buildWaterCard(double progress) {
    final glasses = (_todayWater / 250).floor();
    final goalGlasses = (_waterGoal / 250).ceil();

    return Container(
      width: 140,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Icon(Icons.local_drink, color: Colors.cyan, size: 20),
              Text(
                '$glasses/$goalGlasses 🥛',
                style: const TextStyle(fontSize: 10, color: AppTheme.muted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text('Water', style: TextStyle(fontSize: 12, color: AppTheme.muted)),
          Text('${_todayWater}ml', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                icon: const Icon(Icons.remove, size: 16),
                onPressed: _todayWater > 0 ? _removeWater : null,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => _addWater(250),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  minimumSize: Size.zero,
                ),
                child: const Text('+250ml', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildProgressRing(double progress, int remaining, bool isOverGoal) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            height: 100,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: progress,
                  strokeWidth: 10,
                  backgroundColor: AppTheme.border,
                  valueColor: AlwaysStoppedAnimation(
                    isOverGoal ? AppTheme.destructive : AppTheme.primary,
                  ),
                ),
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '${(progress * 100).round()}%',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                    ),
                    const Text('of goal', style: TextStyle(fontSize: 10, color: AppTheme.muted)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _buildMiniStat(
                        'Consumed',
                        '$_todayCalories kcal',
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildMiniStat(
                        'Remaining',
                        '${remaining >= 0 ? remaining : "+${remaining.abs()}"} kcal',
                        isNegative: isOverGoal,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, {bool isNegative = false}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.muted)),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isNegative ? AppTheme.destructive : null,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogFoodTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image or Text input section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Scan or describe your food', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),

                // Image upload buttons
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _pickImage,
                        icon: const Icon(Icons.camera_alt),
                        label: const Text('Camera'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _pickGalleryImage,
                        icon: const Icon(Icons.photo_library),
                        label: const Text('Gallery'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                  ],
                ),

                // Selected image preview
                if (_selectedImageBase64 != null) ...[
                  const SizedBox(height: 16),
                  Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.memory(
                          base64Decode(_selectedImageBase64!.split(',').last),
                          width: double.infinity,
                          height: 200,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: IconButton(
                          onPressed: () => setState(() {
                            _selectedImageBase64 = null;
                            _analysisResult = null;
                          }),
                          icon: const Icon(Icons.close),
                          style: IconButton.styleFrom(
                            backgroundColor: Colors.black54,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isAnalyzing ? null : _analyzeImage,
                      child: _isAnalyzing
                          ? const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                                SizedBox(width: 12),
                                Text('Analyzing...'),
                              ],
                            )
                          : const Text('Analyze Image (2 credits)'),
                    ),
                  ),
                ],

                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 16),

                // Text input
                const Text('Or describe your meal:', style: TextStyle(fontSize: 14, color: AppTheme.muted)),
                const SizedBox(height: 8),
                TextField(
                  onChanged: (v) => _foodDescription = v,
                  decoration: const InputDecoration(
                    hintText: 'e.g., 2 eggs, toast with butter, orange juice',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isAnalyzing || _foodDescription.isEmpty ? null : _analyzeText,
                    child: _isAnalyzing && _selectedImageBase64 == null
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                              SizedBox(width: 12),
                              Text('Analyzing...'),
                            ],
                          )
                        : const Text('Get Nutrition Info (1 credit)'),
                  ),
                ),
              ],
            ),
          ),

          // Analysis results
          if (_analysisResult != null) ...[
            const SizedBox(height: 20),
            _buildAnalysisResults(),
          ],
        ],
      ),
    );
  }

  Widget _buildAnalysisResults() {
    final result = _analysisResult!;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Nutrition Results', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 16),

          // Total calories
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                const Icon(Icons.local_fire_department, color: Colors.orange, size: 32),
                const SizedBox(height: 8),
                Text(
                  '${result.totalCalories}',
                  style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold),
                ),
                const Text('Total Calories', style: TextStyle(color: AppTheme.muted)),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Macros row
          Row(
            children: [
              Expanded(child: _buildMacroChip('Protein', '${result.totalProtein.round()}g', Colors.red.shade300)),
              const SizedBox(width: 8),
              Expanded(child: _buildMacroChip('Carbs', '${result.totalCarbs.round()}g', Colors.amber)),
              const SizedBox(width: 8),
              Expanded(child: _buildMacroChip('Fat', '${result.totalFat.round()}g', Colors.blue)),
            ],
          ),
          const SizedBox(height: 16),

          // Health score
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.background,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.favorite, color: _getHealthScoreColor(result.healthScore)),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Health Score', style: TextStyle(fontWeight: FontWeight.w500)),
                        Text(_getHealthScoreLabel(result.healthScore), 
                             style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
                      ],
                    ),
                  ],
                ),
                Text(
                  '${result.healthScore}/10',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: _getHealthScoreColor(result.healthScore),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Meal type selector
          const Text('Meal Type:', style: TextStyle(fontSize: 14)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: mealTypes.map((type) => ChoiceChip(
              label: Text('${type.emoji} ${type.label}'),
              selected: _selectedMealType == type.value,
              onSelected: (s) => setState(() => _selectedMealType = type.value),
            )).toList(),
          ),
          const SizedBox(height: 16),

          // Save button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _saveMeal,
              icon: const Icon(Icons.add),
              label: const Text('Save to History'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),

          // Food items list
          if (result.foods.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text('Food Items:', style: TextStyle(fontSize: 14, color: AppTheme.muted)),
            const SizedBox(height: 8),
            ...result.foods.map((food) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(food.foodName, style: const TextStyle(fontWeight: FontWeight.w500)),
                        Text(food.servingSize, style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('${food.calories} cal', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange)),
                      Text('${(food.confidence * 100).round()}% conf', style: const TextStyle(fontSize: 10, color: AppTheme.muted)),
                    ],
                  ),
                ],
              ),
            )),
          ],

          // Suggestions
          if (result.suggestions.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Row(
              children: [
                Icon(Icons.lightbulb, color: Colors.amber, size: 18),
                SizedBox(width: 8),
                Text('Suggestions', style: TextStyle(fontSize: 14, color: AppTheme.muted)),
              ],
            ),
            const SizedBox(height: 8),
            ...result.suggestions.map((s) => Container(
              margin: const EdgeInsets.only(bottom: 4),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(s, style: const TextStyle(fontSize: 13)),
            )),
          ],
        ],
      ),
    );
  }

  Widget _buildMacroChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.muted)),
        ],
      ),
    );
  }

  Widget _buildHistoryTab() {
    if (_todayMeals.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.restaurant, size: 64, color: AppTheme.muted),
            SizedBox(height: 16),
            Text('No meals logged today', style: TextStyle(color: AppTheme.muted)),
            Text('Start by logging your first meal!', style: TextStyle(fontSize: 12, color: AppTheme.muted)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _todayMeals.length,
      itemBuilder: (context, index) {
        final meal = _todayMeals[index];
        final mealType = mealTypes.firstWhere(
          (t) => t.value == meal.mealType,
          orElse: () => mealTypes.last,
        );

        return Dismissible(
          key: Key(meal.id),
          direction: DismissDirection.endToStart,
          background: Container(
            alignment: Alignment.centerRight,
            padding: const EdgeInsets.only(right: 20),
            color: AppTheme.destructive,
            child: const Icon(Icons.delete, color: Colors.white),
          ),
          onDismissed: (_) => _deleteMeal(meal.id),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Text(mealType.emoji, style: const TextStyle(fontSize: 28)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(mealType.label, style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text(
                        meal.mealDescription.isNotEmpty 
                            ? meal.mealDescription 
                            : '${meal.foods.length} items',
                        style: const TextStyle(fontSize: 12, color: AppTheme.muted),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        DateFormat('h:mm a').format(meal.loggedAt),
                        style: const TextStyle(fontSize: 11, color: AppTheme.muted),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${meal.totalCalories} cal',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange),
                    ),
                    Text(
                      'P:${meal.totalProtein.round()}g C:${meal.totalCarbs.round()}g F:${meal.totalFat.round()}g',
                      style: const TextStyle(fontSize: 10, color: AppTheme.muted),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMealIdeasTab() {
    final remaining = _profile == null ? {} : {
      'calories': (_profile!.recommendedCalories - _todayCalories).clamp(0, double.infinity).toInt(),
      'protein': (_profile!.recommendedProtein - _todayProtein).clamp(0, double.infinity).toInt(),
      'carbs': (_profile!.recommendedCarbs - _todayCarbs).clamp(0, double.infinity).toInt(),
      'fat': (_profile!.recommendedFat - _todayFat).clamp(0, double.infinity).toInt(),
    };

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Remaining macros summary
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Remaining Today', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildRemainingChip('🔥', '${remaining['calories']}', 'kcal')),
                    const SizedBox(width: 8),
                    Expanded(child: _buildRemainingChip('🥩', '${remaining['protein']}g', 'protein')),
                    const SizedBox(width: 8),
                    Expanded(child: _buildRemainingChip('🌾', '${remaining['carbs']}g', 'carbs')),
                    const SizedBox(width: 8),
                    Expanded(child: _buildRemainingChip('💧', '${remaining['fat']}g', 'fat')),
                  ],
                ),
                const SizedBox(height: 16),

                // Meal type filter
                Wrap(
                  spacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Any'),
                      selected: _suggestionMealType == 'any',
                      onSelected: (s) => setState(() => _suggestionMealType = 'any'),
                    ),
                    ...mealTypes.map((type) => ChoiceChip(
                      label: Text('${type.emoji} ${type.label}'),
                      selected: _suggestionMealType == type.value,
                      onSelected: (s) => setState(() => _suggestionMealType = type.value),
                    )),
                  ],
                ),
                const SizedBox(height: 16),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isLoadingSuggestions ? null : _loadMealSuggestions,
                    icon: _isLoadingSuggestions
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.lightbulb),
                    label: Text(_isLoadingSuggestions ? 'Finding meals...' : 'Get Meal Ideas (1 credit)'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Suggestions list
          if (_mealSuggestions.isNotEmpty) ...[
            const Text('Suggested Meals', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            ...(_mealSuggestions.map((meal) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(meal.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(meal.mealType, style: const TextStyle(fontSize: 10)),
                            ),
                          ],
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.timer, size: 14, color: AppTheme.muted),
                          const SizedBox(width: 4),
                          Text(meal.prepTime, style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(meal.description, style: const TextStyle(fontSize: 13, color: AppTheme.muted)),
                  const SizedBox(height: 12),

                  // Macros
                  Row(
                    children: [
                      _buildSuggestionMacro('${meal.calories}', 'kcal', Colors.orange),
                      const SizedBox(width: 8),
                      _buildSuggestionMacro('${meal.protein.round()}g', 'protein', Colors.red.shade300),
                      const SizedBox(width: 8),
                      _buildSuggestionMacro('${meal.carbs.round()}g', 'carbs', Colors.amber),
                      const SizedBox(width: 8),
                      _buildSuggestionMacro('${meal.fat.round()}g', 'fat', Colors.blue),
                    ],
                  ),

                  if (meal.ingredients.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    const Text('Ingredients:', style: TextStyle(fontSize: 12, color: AppTheme.muted)),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 4,
                      runSpacing: 4,
                      children: meal.ingredients.map((i) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.background,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(i, style: const TextStyle(fontSize: 11)),
                      )).toList(),
                    ),
                  ],
                ],
              ),
            ))),
          ],
        ],
      ),
    );
  }

  Widget _buildRemainingChip(String emoji, String value, String label) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 16)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
          Text(label, style: const TextStyle(fontSize: 9, color: AppTheme.muted)),
        ],
      ),
    );
  }

  Widget _buildSuggestionMacro(String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(label, style: const TextStyle(fontSize: 9, color: AppTheme.muted)),
          ],
        ),
      ),
    );
  }

  Color _getHealthScoreColor(int score) {
    if (score >= 8) return AppTheme.success;
    if (score >= 6) return Colors.amber;
    if (score >= 4) return Colors.orange;
    return AppTheme.destructive;
  }

  String _getHealthScoreLabel(int score) {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Poor';
  }

  void _showSettingsDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Settings'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.person),
              title: const Text('Edit Profile'),
              onTap: () {
                Navigator.pop(context);
                _confirmResetProfile();
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  void _confirmResetProfile() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Profile'),
        content: const Text('This will delete your profile and start fresh. Are you sure?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Reset', style: TextStyle(color: AppTheme.destructive)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await CalorieService.clearProfile();
      if (mounted) context.go('/calorie-onboarding');
    }
  }
}
