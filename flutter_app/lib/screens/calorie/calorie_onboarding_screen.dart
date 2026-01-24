import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import '../../models/calorie_profile_model.dart';
import '../../services/calorie_service.dart';

class CalorieOnboardingScreen extends StatefulWidget {
  const CalorieOnboardingScreen({super.key});

  @override
  State<CalorieOnboardingScreen> createState() => _CalorieOnboardingScreenState();
}

class _CalorieOnboardingScreenState extends State<CalorieOnboardingScreen> {
  int _currentStep = 1;
  final int _totalSteps = 5;
  bool _isSaving = false;

  // Form controllers
  final _ageController = TextEditingController();
  final _heightController = TextEditingController();
  final _weightController = TextEditingController();
  final _targetWeightController = TextEditingController();

  // Form values
  String _gender = 'male';
  String _activityLevel = 'moderate';
  String _goal = 'maintain';

  double get _progress => _currentStep / _totalSteps;

  @override
  void dispose() {
    _ageController.dispose();
    _heightController.dispose();
    _weightController.dispose();
    _targetWeightController.dispose();
    super.dispose();
  }

  bool _validateStep() {
    switch (_currentStep) {
      case 1:
        final age = int.tryParse(_ageController.text);
        if (age == null || age < 13 || age > 120) {
          _showError('Please enter a valid age (13-120)');
          return false;
        }
        return true;
      case 2:
        final height = double.tryParse(_heightController.text);
        final weight = double.tryParse(_weightController.text);
        if (height == null || height < 100 || height > 250) {
          _showError('Please enter a valid height (100-250 cm)');
          return false;
        }
        if (weight == null || weight < 30 || weight > 300) {
          _showError('Please enter a valid weight (30-300 kg)');
          return false;
        }
        return true;
      case 3:
        return _activityLevel.isNotEmpty;
      case 4:
        return _goal.isNotEmpty;
      default:
        return true;
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _nextStep() {
    if (_validateStep()) {
      setState(() {
        _currentStep = (_currentStep + 1).clamp(1, _totalSteps);
      });
    }
  }

  void _prevStep() {
    setState(() {
      _currentStep = (_currentStep - 1).clamp(1, _totalSteps);
    });
  }

  int? _previewCalories() {
    final age = int.tryParse(_ageController.text);
    final height = double.tryParse(_heightController.text);
    final weight = double.tryParse(_weightController.text);

    if (age == null || height == null || weight == null) return null;

    final bmr = CalorieService.calculateBMR(age, _gender, height, weight);
    final tdee = CalorieService.calculateTDEE(bmr, _activityLevel);
    final goalData = goalOptions.firstWhere(
      (g) => g.value == _goal,
      orElse: () => goalOptions[1],
    );

    return (tdee + goalData.calorieAdjust).round();
  }

  Map<String, int>? _previewMacros() {
    final calories = _previewCalories();
    if (calories == null) return null;
    return CalorieService.calculateMacros(calories, _goal);
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);

    try {
      final profile = CalorieService.createProfile(
        age: int.parse(_ageController.text),
        gender: _gender,
        heightCm: double.parse(_heightController.text),
        weightKg: double.parse(_weightController.text),
        activityLevel: _activityLevel,
        goal: _goal,
        targetWeightKg: _targetWeightController.text.isNotEmpty
            ? double.parse(_targetWeightController.text)
            : null,
      );

      await CalorieService.saveProfile(profile);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile created! Your personalized goals are ready.'),
            backgroundColor: AppTheme.primary,
          ),
        );
        context.go('/calorie-dashboard');
      }
    } catch (e) {
      _showError('Failed to save profile. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF22C55E).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(
                      Icons.local_fire_department,
                      color: Color(0xFF22C55E),
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Set Up Your Profile',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Personalize your calorie & macro goals',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.muted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Progress Bar
              Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Step $_currentStep of $_totalSteps',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.muted,
                        ),
                      ),
                      Text(
                        '${(_progress * 100).round()}%',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppTheme.muted,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: _progress,
                    backgroundColor: AppTheme.secondary,
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      Color(0xFF22C55E),
                    ),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              // Step Content
              Expanded(
                child: SingleChildScrollView(
                  child: _buildStepContent(),
                ),
              ),

              // Navigation Buttons
              _buildNavigationButtons(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 1:
        return _buildStep1();
      case 2:
        return _buildStep2();
      case 3:
        return _buildStep3();
      case 4:
        return _buildStep4();
      case 5:
        return _buildStep5();
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.person, color: Color(0xFF22C55E)),
            const SizedBox(width: 8),
            const Text(
              'Basic Information',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Age Input
        const Text(
          'Age',
          style: TextStyle(fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _ageController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            hintText: 'Enter your age',
            filled: true,
            fillColor: AppTheme.secondary,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Gender Selection
        const Text(
          'Gender',
          style: TextStyle(fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _buildGenderOption('male', 'Male', Icons.male),
            const SizedBox(width: 12),
            _buildGenderOption('female', 'Female', Icons.female),
            const SizedBox(width: 12),
            _buildGenderOption('other', 'Other', Icons.person),
          ],
        ),
      ],
    );
  }

  Widget _buildGenderOption(String value, String label, IconData icon) {
    final isSelected = _gender == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _gender = value),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isSelected
                ? const Color(0xFF22C55E).withOpacity(0.1)
                : AppTheme.secondary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? const Color(0xFF22C55E) : Colors.transparent,
              width: 2,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                color: isSelected ? const Color(0xFF22C55E) : AppTheme.muted,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: isSelected ? const Color(0xFF22C55E) : AppTheme.muted,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.straighten, color: Color(0xFF22C55E)),
            const SizedBox(width: 8),
            const Text(
              'Body Measurements',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Height Input
        Row(
          children: [
            const Icon(Icons.height, size: 20, color: Color(0xFF22C55E)),
            const SizedBox(width: 8),
            const Text('Height (cm)', style: TextStyle(fontWeight: FontWeight.w500)),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _heightController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            hintText: 'e.g., 175',
            filled: true,
            fillColor: AppTheme.secondary,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Weight Input
        Row(
          children: [
            const Icon(Icons.monitor_weight, size: 20, color: Color(0xFF22C55E)),
            const SizedBox(width: 8),
            const Text('Weight (kg)', style: TextStyle(fontWeight: FontWeight.w500)),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _weightController,
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            hintText: 'e.g., 70',
            filled: true,
            fillColor: AppTheme.secondary,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Your measurements help calculate your basal metabolic rate (BMR)',
          style: TextStyle(
            fontSize: 12,
            color: AppTheme.muted,
          ),
        ),
      ],
    );
  }

  Widget _buildStep3() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.directions_run, color: Color(0xFF22C55E)),
            const SizedBox(width: 8),
            const Text(
              'Activity Level',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        ...activityLevels.map((level) => _buildActivityOption(level)),
      ],
    );
  }

  Widget _buildActivityOption(ActivityLevel level) {
    final isSelected = _activityLevel == level.value;
    return GestureDetector(
      onTap: () => setState(() => _activityLevel = level.value),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF22C55E).withOpacity(0.1)
              : AppTheme.secondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFF22C55E) : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? const Color(0xFF22C55E) : AppTheme.muted,
                  width: 2,
                ),
                color: isSelected ? const Color(0xFF22C55E) : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  level.label,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  level.description,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.muted,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep4() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.flag, color: Color(0xFF22C55E)),
            const SizedBox(width: 8),
            const Text(
              'Your Goal',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        ...goalOptions.map((goal) => _buildGoalOption(goal)),
        if (_goal == 'lose') ...[
          const SizedBox(height: 24),
          const Text(
            'Target Weight (optional)',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _targetWeightController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              hintText: 'Enter target weight (kg)',
              filled: true,
              fillColor: AppTheme.secondary,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildGoalOption(GoalOption goal) {
    final isSelected = _goal == goal.value;
    IconData icon;
    switch (goal.value) {
      case 'lose':
        icon = Icons.trending_down;
        break;
      case 'gain':
        icon = Icons.fitness_center;
        break;
      default:
        icon = Icons.balance;
    }

    return GestureDetector(
      onTap: () => setState(() => _goal = goal.value),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF22C55E).withOpacity(0.1)
              : AppTheme.secondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? const Color(0xFF22C55E) : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? const Color(0xFF22C55E) : AppTheme.muted,
                  width: 2,
                ),
                color: isSelected ? const Color(0xFF22C55E) : Colors.transparent,
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 16),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF22C55E).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: const Color(0xFF22C55E), size: 20),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  goal.label,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  goal.description,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.muted,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep5() {
    final calories = _previewCalories();
    final macros = _previewMacros();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.auto_awesome, color: Color(0xFF22C55E)),
            const SizedBox(width: 8),
            const Text(
              'Your Personalized Plan',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Calories Display
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
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              const Icon(
                Icons.local_fire_department,
                color: Color(0xFF22C55E),
                size: 32,
              ),
              const SizedBox(height: 8),
              Text(
                '${calories ?? '--'}',
                style: const TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF22C55E),
                ),
              ),
              Text(
                'Daily Calories',
                style: TextStyle(color: AppTheme.muted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        // Macros
        if (macros != null)
          Row(
            children: [
              _buildMacroCard(
                'Protein',
                '${macros['protein']}g',
                Icons.egg,
                Colors.orange,
              ),
              const SizedBox(width: 12),
              _buildMacroCard(
                'Carbs',
                '${macros['carbs']}g',
                Icons.grain,
                Colors.amber,
              ),
              const SizedBox(width: 12),
              _buildMacroCard(
                'Fat',
                '${macros['fat']}g',
                Icons.water_drop,
                Colors.blue,
              ),
            ],
          ),
        const SizedBox(height: 24),

        // Summary
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppTheme.secondary,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              _buildSummaryRow('Age', '${_ageController.text} years'),
              _buildSummaryRow('Gender', _gender),
              _buildSummaryRow('Height', '${_heightController.text} cm'),
              _buildSummaryRow('Weight', '${_weightController.text} kg'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMacroCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
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

  Widget _buildSummaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(color: AppTheme.muted),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationButtons() {
    return Row(
      children: [
        if (_currentStep > 1)
          Expanded(
            child: OutlinedButton.icon(
              onPressed: _prevStep,
              icon: const Icon(Icons.chevron_left),
              label: const Text('Back'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        if (_currentStep > 1) const SizedBox(width: 12),
        Expanded(
          flex: _currentStep > 1 ? 1 : 2,
          child: _currentStep < _totalSteps
              ? ElevatedButton.icon(
                  onPressed: _nextStep,
                  icon: const Text('Continue'),
                  label: const Icon(Icons.chevron_right),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF22C55E),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                )
              : ElevatedButton.icon(
                  onPressed: _isSaving ? null : _saveProfile,
                  icon: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.auto_awesome),
                  label: Text(_isSaving ? 'Creating Profile...' : 'Start Tracking'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF22C55E),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
        ),
      ],
    );
  }
}
