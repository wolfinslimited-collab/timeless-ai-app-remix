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
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          SliverAppBar(
            backgroundColor: AppTheme.background,
            elevation: 0,
            floating: true,
            pinned: true,
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
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Stats Grid - 2x3 layout (no horizontal scroll)
                  _buildStatsGrid(
                    calorieProgress: calorieProgress,
                    proteinProgress: proteinProgress,
                    carbsProgress: carbsProgress,
                    fatProgress: fatProgress,
                    waterProgress: waterProgress,
                  ),
                  const SizedBox(height: 16),

                  // Progress Ring Card
                  _buildProgressRing(calorieProgress, remainingCalories, isOverGoal),
                ],
              ),
            ),
          ),
          SliverPersistentHeader(
            pinned: true,
            delegate: _StickyTabBarDelegate(
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
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildLogFoodTab(),
            _buildHistoryTab(),
            _buildMealIdeasTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsGrid({
    required double calorieProgress,
    required double proteinProgress,
    required double carbsProgress,
    required double fatProgress,
    required double waterProgress,
  }) {
    final glasses = (_todayWater / 250).floor();
    final goalGlasses = (_waterGoal / 250).ceil();

    return Column(
      children: [
        // First row - Calories (full width) + Protein
        Row(
          children: [
            Expanded(
              child: _buildCompactStatCard(
                icon: Icons.local_fire_department,
                iconColor: Colors.orange,
                label: 'Calories',
                value: '$_todayCalories',
                goal: '/${_profile!.recommendedCalories}',
                progress: calorieProgress,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildCompactStatCard(
                icon: Icons.egg,
                iconColor: Colors.red.shade300,
                label: 'Protein',
                value: '${_todayProtein.round()}g',
                goal: '/${_profile!.recommendedProtein}g',
                progress: proteinProgress,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Second row - Carbs + Fat
        Row(
          children: [
            Expanded(
              child: _buildCompactStatCard(
                icon: Icons.grain,
                iconColor: Colors.amber,
                label: 'Carbs',
                value: '${_todayCarbs.round()}g',
                goal: '/${_profile!.recommendedCarbs}g',
                progress: carbsProgress,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildCompactStatCard(
                icon: Icons.water_drop,
                iconColor: Colors.blue,
                label: 'Fat',
                value: '${_todayFat.round()}g',
                goal: '/${_profile!.recommendedFat}g',
                progress: fatProgress,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Third row - Water (full width)
        _buildWaterCard(waterProgress, glasses, goalGlasses),
      ],
    );
  }

  Widget _buildCompactStatCard({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    required String goal,
    required double progress,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
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
              Icon(icon, color: iconColor, size: 18),
              Text(
                '${(progress * 100).round()}%',
                style: const TextStyle(fontSize: 10, color: AppTheme.muted),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.muted)),
          const SizedBox(height: 2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(width: 2),
              Text(goal, style: const TextStyle(fontSize: 10, color: AppTheme.muted)),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: AppTheme.border,
              valueColor: AlwaysStoppedAnimation(iconColor),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWaterCard(double progress, int glasses, int goalGlasses) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const Icon(Icons.local_drink, color: Colors.cyan, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Water', style: TextStyle(fontSize: 12, color: AppTheme.muted)),
                    Text('$glasses/$goalGlasses 🥛', style: const TextStyle(fontSize: 11, color: AppTheme.muted)),
                  ],
                ),
                const SizedBox(height: 4),
                Text('${_todayWater}ml', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    backgroundColor: AppTheme.border,
                    valueColor: const AlwaysStoppedAnimation(Colors.cyan),
                    minHeight: 4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.remove_circle_outline, size: 22),
                onPressed: _todayWater > 0 ? _removeWater : null,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                color: AppTheme.muted,
              ),
              ElevatedButton(
                onPressed: () => _addWater(250),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 80,
            height: 80,
            child: Stack(
              alignment: Alignment.center,
              children: [
                CircularProgressIndicator(
                  value: progress,
                  strokeWidth: 8,
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
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const Text('of goal', style: TextStyle(fontSize: 9, color: AppTheme.muted)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: _buildMiniStat('Consumed', '$_todayCalories kcal'),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildMiniStat(
                    'Remaining',
                    '${remaining >= 0 ? remaining : "+${remaining.abs()}"} kcal',
                    isNegative: isOverGoal,
                  ),
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
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: AppTheme.muted)),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isNegative ? AppTheme.destructive : null,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildLogFoodTab() {
    return ListView(
      padding: const EdgeInsets.all(16),
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
                      icon: const Icon(Icons.camera_alt, size: 18),
                      label: const Text('Camera'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickGalleryImage,
                      icon: const Icon(Icons.photo_library, size: 18),
                      label: const Text('Gallery'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
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
                        height: 180,
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
                        style: IconButton.styleFrom(backgroundColor: Colors.black54),
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
                              SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                              SizedBox(width: 10),
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
              const Text('Or describe your meal:', style: TextStyle(fontSize: 13, color: AppTheme.muted)),
              const SizedBox(height: 8),
              TextField(
                onChanged: (v) => _foodDescription = v,
                decoration: const InputDecoration(
                  hintText: 'e.g., 2 eggs, toast with butter',
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
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
                            SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                            SizedBox(width: 10),
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
          const SizedBox(height: 16),
          _buildAnalysisResults(),
        ],
      ],
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
          const Text('Nutrition Results', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 14),

          // Total calories
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                const Icon(Icons.local_fire_department, color: Colors.orange, size: 28),
                const SizedBox(height: 6),
                Text(
                  '${result.totalCalories}',
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                ),
                const Text('Total Calories', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
              ],
            ),
          ),
          const SizedBox(height: 14),

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
          const SizedBox(height: 14),

          // Health score
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.background,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.favorite, color: _getHealthScoreColor(result.healthScore), size: 20),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Health Score', style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                        Text(_getHealthScoreLabel(result.healthScore), 
                             style: const TextStyle(fontSize: 11, color: AppTheme.muted)),
                      ],
                    ),
                  ],
                ),
                Text(
                  '${result.healthScore}/10',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: _getHealthScoreColor(result.healthScore),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Meal type selector
          const Text('Meal Type:', style: TextStyle(fontSize: 13)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: mealTypes.map((type) => ChoiceChip(
              label: Text('${type.emoji} ${type.label}', style: const TextStyle(fontSize: 12)),
              selected: _selectedMealType == type.value,
              onSelected: (s) => setState(() => _selectedMealType = type.value),
              padding: const EdgeInsets.symmetric(horizontal: 4),
            )).toList(),
          ),
          const SizedBox(height: 14),

          // Save button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _saveMeal,
              icon: const Icon(Icons.add, size: 18),
              label: const Text('Save to History'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),

          // Food items list
          if (result.foods.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text('Food Items:', style: TextStyle(fontSize: 13, color: AppTheme.muted)),
            const SizedBox(height: 8),
            ...result.foods.map((food) => Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.all(10),
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
                        Text(food.foodName, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                        Text(food.servingSize, style: const TextStyle(fontSize: 11, color: AppTheme.muted)),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('${food.calories} cal', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange, fontSize: 13)),
                      Text('${(food.confidence * 100).round()}%', style: const TextStyle(fontSize: 10, color: AppTheme.muted)),
                    ],
                  ),
                ],
              ),
            )),
          ],

          // Suggestions
          if (result.suggestions.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Row(
              children: [
                Icon(Icons.lightbulb, color: Colors.amber, size: 16),
                SizedBox(width: 6),
                Text('Tips', style: TextStyle(fontSize: 13, color: AppTheme.muted)),
              ],
            ),
            const SizedBox(height: 6),
            ...result.suggestions.map((s) => Container(
              margin: const EdgeInsets.only(bottom: 4),
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(s, style: const TextStyle(fontSize: 12)),
            )),
          ],
        ],
      ),
    );
  }

  Widget _buildMacroChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          Text(label, style: const TextStyle(fontSize: 10, color: AppTheme.muted)),
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
            Icon(Icons.restaurant, size: 56, color: AppTheme.muted),
            SizedBox(height: 14),
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
            decoration: BoxDecoration(
              color: AppTheme.destructive,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.delete, color: Colors.white),
          ),
          onDismissed: (_) => _deleteMeal(meal.id),
          child: Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(mealType.emoji, style: const TextStyle(fontSize: 18)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        meal.mealDescription.isNotEmpty 
                            ? meal.mealDescription 
                            : mealType.label,
                        style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
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
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.orange, fontSize: 13),
                    ),
                    Text(
                      'P:${meal.totalProtein.round()} C:${meal.totalCarbs.round()} F:${meal.totalFat.round()}',
                      style: const TextStyle(fontSize: 9, color: AppTheme.muted),
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

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Remaining macros summary
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: AppTheme.secondary,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Remaining Today', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(child: _buildRemainingChip('🔥', '${remaining['calories']}', 'kcal')),
                  const SizedBox(width: 6),
                  Expanded(child: _buildRemainingChip('🥩', '${remaining['protein']}g', 'protein')),
                  const SizedBox(width: 6),
                  Expanded(child: _buildRemainingChip('🌾', '${remaining['carbs']}g', 'carbs')),
                  const SizedBox(width: 6),
                  Expanded(child: _buildRemainingChip('💧', '${remaining['fat']}g', 'fat')),
                ],
              ),
              const SizedBox(height: 14),

              // Meal type filter
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  ChoiceChip(
                    label: const Text('Any', style: TextStyle(fontSize: 12)),
                    selected: _suggestionMealType == 'any',
                    onSelected: (s) => setState(() => _suggestionMealType = 'any'),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                  ),
                  ...mealTypes.map((type) => ChoiceChip(
                    label: Text('${type.emoji} ${type.label}', style: const TextStyle(fontSize: 12)),
                    selected: _suggestionMealType == type.value,
                    onSelected: (s) => setState(() => _suggestionMealType = type.value),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                  )),
                ],
              ),
              const SizedBox(height: 14),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isLoadingSuggestions ? null : _loadMealSuggestions,
                  icon: _isLoadingSuggestions
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.lightbulb, size: 18),
                  label: Text(_isLoadingSuggestions ? 'Finding...' : 'Get Meal Ideas (1 credit)'),
                ),
              ),
            ],
          ),
        ),

        // Suggestions list
        if (_mealSuggestions.isNotEmpty) ...[
          const SizedBox(height: 16),
          const Text('Suggested Meals', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 10),
          ...(_mealSuggestions.map((meal) => Container(
            margin: const EdgeInsets.only(bottom: 10),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(meal.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
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
                        const Icon(Icons.timer, size: 12, color: AppTheme.muted),
                        const SizedBox(width: 4),
                        Text(meal.prepTime, style: const TextStyle(fontSize: 11, color: AppTheme.muted)),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(meal.description, style: const TextStyle(fontSize: 12, color: AppTheme.muted)),
                const SizedBox(height: 10),

                // Macros
                Row(
                  children: [
                    _buildSuggestionMacro('${meal.calories}', 'kcal', Colors.orange),
                    const SizedBox(width: 6),
                    _buildSuggestionMacro('${meal.protein.round()}g', 'protein', Colors.red.shade300),
                    const SizedBox(width: 6),
                    _buildSuggestionMacro('${meal.carbs.round()}g', 'carbs', Colors.amber),
                    const SizedBox(width: 6),
                    _buildSuggestionMacro('${meal.fat.round()}g', 'fat', Colors.blue),
                  ],
                ),

                if (meal.ingredients.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  const Text('Ingredients:', style: TextStyle(fontSize: 11, color: AppTheme.muted)),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 4,
                    runSpacing: 4,
                    children: meal.ingredients.take(6).map((i) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppTheme.background,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(i, style: const TextStyle(fontSize: 10)),
                    )).toList(),
                  ),
                ],
              ],
            ),
          ))),
        ],
      ],
    );
  }

  Widget _buildRemainingChip(String emoji, String value, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 14)),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          Text(label, style: const TextStyle(fontSize: 8, color: AppTheme.muted)),
        ],
      ),
    );
  }

  Widget _buildSuggestionMacro(String value, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Column(
          children: [
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            Text(label, style: const TextStyle(fontSize: 8, color: AppTheme.muted)),
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

class _StickyTabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _StickyTabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: AppTheme.background,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(_StickyTabBarDelegate oldDelegate) => false;
}
