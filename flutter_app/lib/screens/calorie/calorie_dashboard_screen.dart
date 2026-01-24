import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../models/calorie_profile_model.dart';
import '../../services/calorie_service.dart';

class CalorieDashboardScreen extends StatefulWidget {
  const CalorieDashboardScreen({super.key});

  @override
  State<CalorieDashboardScreen> createState() => _CalorieDashboardScreenState();
}

class _CalorieDashboardScreenState extends State<CalorieDashboardScreen> {
  CalorieProfile? _profile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final profile = await CalorieService.loadProfile();
    setState(() {
      _profile = profile;
      _isLoading = false;
    });
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
              const Icon(
                Icons.error_outline,
                size: 64,
                color: AppTheme.muted,
              ),
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

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/apps'),
        ),
        title: const Text('Calorie AI'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () async {
              final shouldReset = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Reset Profile'),
                  content: const Text(
                    'This will delete your profile and start fresh. Are you sure?',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context, false),
                      child: const Text('Cancel'),
                    ),
                    TextButton(
                      onPressed: () => Navigator.pop(context, true),
                      child: const Text('Reset'),
                    ),
                  ],
                ),
              );
              if (shouldReset == true) {
                await CalorieService.clearProfile();
                if (mounted) context.go('/calorie-onboarding');
              }
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Daily Calories Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFF22C55E).withOpacity(0.2),
                      const Color(0xFF16A34A).withOpacity(0.1),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.local_fire_department,
                      color: Color(0xFF22C55E),
                      size: 40,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '${_profile!.recommendedCalories}',
                      style: const TextStyle(
                        fontSize: 56,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF22C55E),
                      ),
                    ),
                    const Text(
                      'Daily Calorie Goal',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Macros Section
              const Text(
                'Daily Macros',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _buildMacroCard(
                    'Protein',
                    '${_profile!.recommendedProtein}g',
                    Icons.egg,
                    Colors.orange,
                  ),
                  const SizedBox(width: 12),
                  _buildMacroCard(
                    'Carbs',
                    '${_profile!.recommendedCarbs}g',
                    Icons.grain,
                    Colors.amber,
                  ),
                  const SizedBox(width: 12),
                  _buildMacroCard(
                    'Fat',
                    '${_profile!.recommendedFat}g',
                    Icons.water_drop,
                    Colors.blue,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Stats Section
              const Text(
                'Your Stats',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    _buildStatRow(
                      'Basal Metabolic Rate (BMR)',
                      '${_profile!.calculatedBmr} cal',
                    ),
                    const Divider(height: 24),
                    _buildStatRow(
                      'Total Daily Energy (TDEE)',
                      '${_profile!.calculatedTdee} cal',
                    ),
                    const Divider(height: 24),
                    _buildStatRow(
                      'Activity Level',
                      _getActivityLabel(_profile!.activityLevel),
                    ),
                    const Divider(height: 24),
                    _buildStatRow(
                      'Goal',
                      _getGoalLabel(_profile!.goal),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Profile Info
              const Text(
                'Profile Info',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  children: [
                    _buildInfoRow(Icons.cake, 'Age', '${_profile!.age} years'),
                    const Divider(height: 24),
                    _buildInfoRow(Icons.person, 'Gender', _profile!.gender),
                    const Divider(height: 24),
                    _buildInfoRow(
                        Icons.height, 'Height', '${_profile!.heightCm} cm'),
                    const Divider(height: 24),
                    _buildInfoRow(Icons.monitor_weight, 'Weight',
                        '${_profile!.weightKg} kg'),
                    if (_profile!.targetWeightKg != null) ...[
                      const Divider(height: 24),
                      _buildInfoRow(Icons.flag, 'Target Weight',
                          '${_profile!.targetWeightKg} kg'),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMacroCard(
      String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(color: AppTheme.muted),
        ),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: const Color(0xFF22C55E)),
        const SizedBox(width: 12),
        Text(
          label,
          style: TextStyle(color: AppTheme.muted),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ],
    );
  }

  String _getActivityLabel(String value) {
    final level = activityLevels.firstWhere(
      (l) => l.value == value,
      orElse: () => activityLevels[2],
    );
    return level.label;
  }

  String _getGoalLabel(String value) {
    final goal = goalOptions.firstWhere(
      (g) => g.value == value,
      orElse: () => goalOptions[1],
    );
    return goal.label;
  }
}
