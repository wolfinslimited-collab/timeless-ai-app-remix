import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/sleep_service.dart';

class SleepOnboarding extends StatefulWidget {
  final Function(SleepProfile) onComplete;

  const SleepOnboarding({super.key, required this.onComplete});

  @override
  State<SleepOnboarding> createState() => _SleepOnboardingState();
}

class _SleepOnboardingState extends State<SleepOnboarding> {
  final SleepService _sleepService = SleepService();
  int _step = 1;
  bool _isSaving = false;

  // Form state
  int _age = 25;
  String _gender = 'female';
  String _workSchedule = 'regular';
  double _sleepGoalHours = 8.0;
  String _wakeGoalTime = '07:00';
  String _bedGoalTime = '23:00';
  String _caffeineIntake = 'moderate';
  String _exerciseFrequency = 'moderate';
  String _screenTime = 'moderate';
  String _stressLevel = 'moderate';
  List<String> _sleepIssues = [];
  List<String> _sleepGoals = [];

  static const List<Map<String, dynamic>> workSchedules = [
    {
      'value': 'regular',
      'label': 'Regular (9-5)',
      'description': 'Consistent daytime hours',
      'icon': Icons.access_time
    },
    {
      'value': 'shift',
      'label': 'Shift Work',
      'description': 'Rotating or night shifts',
      'icon': Icons.nightlight_round
    },
    {
      'value': 'flexible',
      'label': 'Flexible',
      'description': 'Variable daily schedule',
      'icon': Icons.trending_up
    },
    {
      'value': 'remote',
      'label': 'Remote',
      'description': 'Work from home',
      'icon': Icons.home
    },
  ];

  static const List<String> sleepIssueOptions = [
    'Difficulty falling asleep',
    'Waking up frequently',
    'Waking up too early',
    'Snoring',
    'Restless legs',
    'Nightmares',
  ];

  static const List<String> sleepGoalOptions = [
    'Fall asleep faster',
    'Sleep through the night',
    'Wake up refreshed',
    'Consistent sleep schedule',
    'Better sleep quality',
    'More deep sleep',
  ];

  final int _totalSteps = 5;

  bool _validateStep() {
    switch (_step) {
      case 1:
        return _age >= 13 && _age <= 120;
      case 2:
        return _workSchedule.isNotEmpty;
      case 3:
        return _sleepGoalHours >= 4 && _sleepGoalHours <= 12;
      case 4:
        return _sleepGoals.isNotEmpty;
      default:
        return true;
    }
  }

  void _toggleIssue(String issue) {
    setState(() {
      if (_sleepIssues.contains(issue)) {
        _sleepIssues.remove(issue);
      } else {
        _sleepIssues.add(issue);
      }
    });
  }

  void _toggleGoal(String goal) {
    setState(() {
      if (_sleepGoals.contains(goal)) {
        _sleepGoals.remove(goal);
      } else {
        _sleepGoals.add(goal);
      }
    });
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);

    final profile = await _sleepService.createProfile(
      age: _age,
      gender: _gender,
      workSchedule: _workSchedule,
      sleepGoalHours: _sleepGoalHours,
      // chronotype: 'intermediate',
      sleepIssues: _sleepIssues,
    );

    setState(() => _isSaving = false);

    if (profile != null) {
      widget.onComplete(profile);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Failed to create profile. Please try again.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final progress = (_step / _totalSteps) * 100;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sleep AI Setup'),
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
                gradient: LinearGradient(
                  colors: [
                    Colors.indigo.withOpacity(0.2),
                    Colors.purple.withOpacity(0.2),
                  ],
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(
                Icons.nightlight_round,
                size: 64,
                color: Colors.indigo,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Set Up Your Sleep Profile',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              "Let's personalize your sleep tracking and recommendations",
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.muted),
            ),
            const SizedBox(height: 24),

            // Progress bar
            Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Step $_step of $_totalSteps',
                        style: const TextStyle(
                            color: AppTheme.muted, fontSize: 12)),
                    Text('${progress.round()}%',
                        style: const TextStyle(
                            color: AppTheme.muted, fontSize: 12)),
                  ],
                ),
                const SizedBox(height: 8),
                LinearProgressIndicator(
                  value: progress / 100,
                  backgroundColor: AppTheme.secondary,
                  minHeight: 6,
                  borderRadius: BorderRadius.circular(3),
                ),
              ],
            ),
            const SizedBox(height: 32),

            // Step content
            if (_step == 1) _buildStep1(),
            if (_step == 2) _buildStep2(),
            if (_step == 3) _buildStep3(),
            if (_step == 4) _buildStep4(),
            if (_step == 5) _buildStep5(),

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
                  child: _step < _totalSteps
                      ? ElevatedButton(
                          onPressed: _validateStep()
                              ? () => setState(() => _step++)
                              : null,
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
                          onPressed: !_isSaving ? _saveProfile : null,
                          child: _isSaving
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.nightlight_round, size: 18),
                                    SizedBox(width: 8),
                                    Text('Start Sleep AI'),
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
    return _buildStepContainer(
      icon: Icons.person,
      title: 'Basic Information',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Age'),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: _age.toString(),
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              hintText: 'Enter your age',
            ),
            onChanged: (value) {
              setState(() => _age = int.tryParse(value) ?? 25);
            },
          ),
          const SizedBox(height: 8),
          const Text('Age affects sleep needs and recommendations',
              style: TextStyle(color: AppTheme.muted, fontSize: 12)),
          const SizedBox(height: 24),
          const Text('Gender'),
          const SizedBox(height: 8),
          Row(
            children: [
              _genderOption('female', 'Female', Icons.person),
              const SizedBox(width: 12),
              _genderOption('male', 'Male', Icons.person_outline),
              const SizedBox(width: 12),
              _genderOption('other', 'Other', Icons.person),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStep2() {
    return _buildStepContainer(
      icon: Icons.access_time,
      title: 'Your Work Schedule',
      child: Column(
        children: workSchedules.map((schedule) {
          final isSelected = _workSchedule == schedule['value'];
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            child: Material(
              color: isSelected
                  ? Colors.indigo.withOpacity(0.1)
                  : AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => setState(() => _workSchedule = schedule['value']),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: isSelected ? Colors.indigo : Colors.transparent,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTheme.card,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(schedule['icon'] as IconData,
                            color: AppTheme.muted),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(schedule['label'] as String,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w500)),
                            Text(schedule['description'] as String,
                                style: const TextStyle(
                                    color: AppTheme.muted, fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildStep3() {
    return _buildStepContainer(
      icon: Icons.bed,
      title: 'Sleep Schedule Goals',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Target Sleep Duration (hours)'),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: Slider(
                  value: _sleepGoalHours,
                  min: 4,
                  max: 12,
                  divisions: 16,
                  label: _sleepGoalHours.toStringAsFixed(1),
                  onChanged: (value) => setState(() => _sleepGoalHours = value),
                ),
              ),
              Text(
                '${_sleepGoalHours.toStringAsFixed(1)}h',
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.nightlight_round,
                            size: 16, color: Colors.indigo),
                        const SizedBox(width: 4),
                        const Text('Bedtime Goal'),
                      ],
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: () async {
                        final time = await showTimePicker(
                          context: context,
                          initialTime: const TimeOfDay(hour: 23, minute: 0),
                        );
                        if (time != null) {
                          setState(() => _bedGoalTime =
                              '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}');
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.secondary,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(_bedGoalTime,
                            style: const TextStyle(fontSize: 18)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.wb_sunny, size: 16, color: Colors.amber),
                        const SizedBox(width: 4),
                        const Text('Wake Time Goal'),
                      ],
                    ),
                    const SizedBox(height: 8),
                    InkWell(
                      onTap: () async {
                        final time = await showTimePicker(
                          context: context,
                          initialTime: const TimeOfDay(hour: 7, minute: 0),
                        );
                        if (time != null) {
                          setState(() => _wakeGoalTime =
                              '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}');
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppTheme.secondary,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(_wakeGoalTime,
                            style: const TextStyle(fontSize: 18)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStep4() {
    return _buildStepContainer(
      icon: Icons.flag,
      title: 'Sleep Goals',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('What do you want to achieve?',
              style: TextStyle(color: AppTheme.muted)),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: sleepGoalOptions.map((goal) {
              final isSelected = _sleepGoals.contains(goal);
              return FilterChip(
                label: Text(goal, style: const TextStyle(fontSize: 13)),
                selected: isSelected,
                onSelected: (_) => _toggleGoal(goal),
                backgroundColor: AppTheme.secondary,
                selectedColor: Colors.indigo.withOpacity(0.2),
                checkmarkColor: Colors.indigo,
                side: BorderSide(
                  color: isSelected ? Colors.indigo : Colors.transparent,
                  width: 2,
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          const Text('Any sleep issues? (optional)',
              style: TextStyle(color: AppTheme.muted)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: sleepIssueOptions.map((issue) {
              final isSelected = _sleepIssues.contains(issue);
              return FilterChip(
                label: Text(issue, style: const TextStyle(fontSize: 12)),
                selected: isSelected,
                onSelected: (_) => _toggleIssue(issue),
                backgroundColor: AppTheme.secondary,
                selectedColor: Colors.orange.withOpacity(0.2),
                checkmarkColor: Colors.orange,
                side: BorderSide(
                  color: isSelected ? Colors.orange : Colors.transparent,
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildStep5() {
    return _buildStepContainer(
      icon: Icons.trending_up,
      title: 'Lifestyle Factors',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildLifestyleRow(
              'Caffeine Intake',
              Icons.coffee,
              _caffeineIntake,
              ['none', 'low', 'moderate', 'high'],
              (v) => setState(() => _caffeineIntake = v)),
          const SizedBox(height: 16),
          _buildLifestyleRow(
              'Exercise Frequency',
              Icons.fitness_center,
              _exerciseFrequency,
              ['none', 'light', 'moderate', 'intense'],
              (v) => setState(() => _exerciseFrequency = v)),
          const SizedBox(height: 16),
          _buildLifestyleRow(
              'Screen Time Before Bed',
              Icons.phone_android,
              _screenTime,
              ['none', 'low', 'moderate', 'high'],
              (v) => setState(() => _screenTime = v)),
          const SizedBox(height: 16),
          _buildLifestyleRow(
              'Stress Level',
              Icons.psychology,
              _stressLevel,
              ['low', 'moderate', 'high', 'very_high'],
              (v) => setState(() => _stressLevel = v)),
        ],
      ),
    );
  }

  Widget _buildStepContainer(
      {required IconData icon, required String title, required Widget child}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.indigo.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: Colors.indigo),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
            ],
          ),
        ),
        const SizedBox(height: 24),
        child,
      ],
    );
  }

  Widget _genderOption(String value, String label, IconData icon) {
    final isSelected = _gender == value;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _gender = value),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isSelected
                ? Colors.indigo.withOpacity(0.1)
                : AppTheme.secondary,
            border: Border.all(
              color: isSelected ? Colors.indigo : Colors.transparent,
              width: 2,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon, color: AppTheme.muted),
              const SizedBox(height: 8),
              Text(label, style: const TextStyle(fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLifestyleRow(String label, IconData icon, String value,
      List<String> options, Function(String) onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: AppTheme.muted),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(fontSize: 13)),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: options.map((option) {
            final isSelected = value == option;
            return Expanded(
              child: GestureDetector(
                onTap: () => onChanged(option),
                child: Container(
                  margin: const EdgeInsets.only(right: 4),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? Colors.indigo.withOpacity(0.1)
                        : AppTheme.secondary,
                    border: Border.all(
                      color: isSelected ? Colors.indigo : Colors.transparent,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    option.replaceAll('_', ' '),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight:
                          isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
