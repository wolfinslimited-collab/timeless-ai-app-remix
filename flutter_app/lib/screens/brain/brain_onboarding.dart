import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/brain_service.dart';

class BrainOnboarding extends StatefulWidget {
  final Function(BrainProfile) onComplete;

  const BrainOnboarding({super.key, required this.onComplete});

  @override
  State<BrainOnboarding> createState() => _BrainOnboardingState();
}

class _BrainOnboardingState extends State<BrainOnboarding> {
  final BrainService _brainService = BrainService();
  int _step = 1;
  bool _isSaving = false;

  // Form state
  int _age = 25;
  String _gender = 'prefer_not_to_say';
  String _occupation = '';
  String _workSchedule = 'regular';
  double _sleepGoal = 8.0;
  List<String> _focusGoals = [];

  static const List<Map<String, String>> workSchedules = [
    {'value': 'regular', 'label': 'Regular (9-5)'},
    {'value': 'shift', 'label': 'Shift Work'},
    {'value': 'flexible', 'label': 'Flexible Hours'},
    {'value': 'remote', 'label': 'Remote Work'},
    {'value': 'student', 'label': 'Student'},
  ];

  static const List<Map<String, String>> focusGoalsOptions = [
    {'value': 'improve_focus', 'label': 'Improve Focus'},
    {'value': 'reduce_stress', 'label': 'Reduce Stress'},
    {'value': 'better_memory', 'label': 'Better Memory'},
    {'value': 'boost_creativity', 'label': 'Boost Creativity'},
    {'value': 'work_productivity', 'label': 'Work Productivity'},
    {'value': 'emotional_balance', 'label': 'Emotional Balance'},
  ];

  bool _canProceed() {
    switch (_step) {
      case 1:
        return _age > 0 && _gender.isNotEmpty;
      case 2:
        return _workSchedule.isNotEmpty;
      case 3:
        return _focusGoals.isNotEmpty;
      default:
        return true;
    }
  }

  void _toggleGoal(String goal) {
    setState(() {
      if (_focusGoals.contains(goal)) {
        _focusGoals.remove(goal);
      } else {
        _focusGoals.add(goal);
      }
    });
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);

    final profile = await _brainService.createProfile(
      age: _age,
      gender: _gender,
      occupation: _occupation.isNotEmpty ? _occupation : null,
      workSchedule: _workSchedule,
      sleepGoalHours: _sleepGoal,
      focusGoals: _focusGoals,
    );

    setState(() => _isSaving = false);

    if (profile != null) {
      widget.onComplete(profile);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to create profile. Please try again.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Brain AI Setup'),
        leading: _step > 1
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _step--),
              )
            : null,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(
                Icons.psychology,
                size: 64,
                color: AppTheme.muted,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Welcome to Brain AI',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              "Let's personalize your cognitive wellness experience",
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.muted),
            ),
            const SizedBox(height: 24),

            // Progress indicator
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                3,
                (index) => Container(
                  width: 48,
                  height: 6,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: index < _step ? AppTheme.primary : AppTheme.secondary,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Step content
            if (_step == 1) _buildStep1(),
            if (_step == 2) _buildStep2(),
            if (_step == 3) _buildStep3(),

            const SizedBox(height: 32),

            // Navigation buttons
            Row(
              children: [
                if (_step > 1) ...[
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => setState(() => _step--),
                      child: const Text('Back'),
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  flex: _step > 1 ? 1 : 2,
                  child: _step < 3
                      ? ElevatedButton(
                          onPressed: _canProceed() ? () => setState(() => _step++) : null,
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('Continue'),
                              SizedBox(width: 8),
                              Icon(Icons.arrow_forward, size: 18),
                            ],
                          ),
                        )
                      : ElevatedButton(
                          onPressed: _canProceed() && !_isSaving ? _saveProfile : null,
                          child: _isSaving
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.auto_awesome, size: 18),
                                    SizedBox(width: 8),
                                    Text('Start Brain AI'),
                                  ],
                                ),
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Basic Information',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 16),

        // Age
        const Text('Your Age'),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: _age.toString(),
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          decoration: const InputDecoration(
            hintText: 'Enter your age',
          ),
          onChanged: (value) {
            setState(() => _age = int.tryParse(value) ?? 25);
          },
        ),
        const SizedBox(height: 24),

        // Gender
        const Text('Gender'),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _genderChip('male', 'Male'),
            _genderChip('female', 'Female'),
            _genderChip('non_binary', 'Non-binary'),
            _genderChip('prefer_not_to_say', 'Prefer not to say'),
          ],
        ),
        const SizedBox(height: 24),

        // Occupation
        const Text('Occupation (optional)'),
        const SizedBox(height: 8),
        TextFormField(
          initialValue: _occupation,
          decoration: const InputDecoration(
            hintText: 'e.g., Software Engineer, Student...',
          ),
          onChanged: (value) => setState(() => _occupation = value),
        ),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Work & Sleep',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 16),

        // Work Schedule
        const Text('Work Schedule'),
        const SizedBox(height: 8),
        ...workSchedules.map((schedule) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              child: Material(
                color: _workSchedule == schedule['value']
                    ? AppTheme.primary.withOpacity(0.1)
                    : AppTheme.secondary,
                borderRadius: BorderRadius.circular(12),
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => setState(() => _workSchedule = schedule['value']!),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: _workSchedule == schedule['value']
                            ? AppTheme.primary
                            : Colors.transparent,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Radio<String>(
                          value: schedule['value']!,
                          groupValue: _workSchedule,
                          onChanged: (value) =>
                              setState(() => _workSchedule = value!),
                        ),
                        Text(schedule['label']!),
                      ],
                    ),
                  ),
                ),
              ),
            )),
        const SizedBox(height: 24),

        // Sleep Goal
        const Text('Target Sleep Hours'),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Slider(
                value: _sleepGoal,
                min: 4,
                max: 12,
                divisions: 16,
                label: '${_sleepGoal.toStringAsFixed(1)} hours',
                onChanged: (value) => setState(() => _sleepGoal = value),
              ),
            ),
            Text(
              '${_sleepGoal.toStringAsFixed(1)}h',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStep3() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'What do you want to improve?',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        const Text(
          'Select all that apply',
          style: TextStyle(color: AppTheme.muted),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: focusGoalsOptions.map((goal) {
            final isSelected = _focusGoals.contains(goal['value']);
            return FilterChip(
              label: Text(goal['label']!),
              selected: isSelected,
              onSelected: (_) => _toggleGoal(goal['value']!),
              backgroundColor: AppTheme.secondary,
              selectedColor: AppTheme.primary.withOpacity(0.2),
              checkmarkColor: AppTheme.primary,
              side: BorderSide(
                color: isSelected ? AppTheme.primary : Colors.transparent,
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _genderChip(String value, String label) {
    final isSelected = _gender == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _gender = value),
      backgroundColor: AppTheme.secondary,
      selectedColor: AppTheme.primary.withOpacity(0.2),
      side: BorderSide(
        color: isSelected ? AppTheme.primary : Colors.transparent,
      ),
    );
  }
}
