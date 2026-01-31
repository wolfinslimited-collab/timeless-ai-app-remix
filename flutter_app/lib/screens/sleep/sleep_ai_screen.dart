import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/sleep_service.dart';
import 'sleep_onboarding.dart';
import 'sleep_sounds_player.dart';

class SleepAIScreen extends StatefulWidget {
  const SleepAIScreen({super.key});

  @override
  State<SleepAIScreen> createState() => _SleepAIScreenState();
}

class _SleepAIScreenState extends State<SleepAIScreen>
    with SingleTickerProviderStateMixin {
  final SleepService _sleepService = SleepService();
  late TabController _tabController;

  SleepProfile? _profile;
  List<SleepLog> _sleepLogs = [];
  SleepAnalysis? _analysis;
  bool _isLoading = true;
  bool _showWelcome = false;
  bool _showOnboarding = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);

    final profile = await _sleepService.getProfile();
    if (profile == null) {
      setState(() {
        _showWelcome = true;
        _isLoading = false;
      });
      return;
    }

    final logs = await _sleepService.getSleepLogs();
    final analysis = await _sleepService.getAnalysis();

    setState(() {
      _profile = profile;
      _sleepLogs = logs;
      _analysis = analysis;
      _isLoading = false;
    });
  }

  void _startOnboarding() {
    setState(() {
      _showWelcome = false;
      _showOnboarding = true;
    });
  }

  void _handleOnboardingComplete(SleepProfile profile) {
    setState(() {
      _profile = profile;
      _showOnboarding = false;
    });
    _loadData();
  }

  int get _streak {
    if (_profile == null) return 0;
    return _sleepService.calculateStreak(_sleepLogs, _profile!.sleepGoalHours);
  }

  Widget _buildWelcome() {
    return Scaffold(
      appBar: AppBar(title: const Text('Sleep AI')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
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
                size: 80,
                color: Colors.indigo,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Welcome to Sleep AI',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Optimize your sleep patterns, track your rest quality, and wake up feeling refreshed every day.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.muted),
            ),
            const SizedBox(height: 32),
            _buildFeatureItem(
              Icons.bed,
              'Sleep Tracking',
              'Log and monitor your nightly sleep patterns',
            ),
            _buildFeatureItem(
              Icons.insights,
              'AI Analysis',
              'Get personalized insights and recommendations',
            ),
            _buildFeatureItem(
              Icons.music_note,
              'Sleep Sounds',
              'Relax with calming sounds to help you drift off',
            ),
            _buildFeatureItem(
              Icons.local_fire_department,
              'Sleep Streaks',
              'Build healthy habits with goal tracking',
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _startOnboarding,
                child: const Text('Get Started'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureItem(IconData icon, String title, String description) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.indigo.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.indigo),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(
                  description,
                  style: const TextStyle(color: AppTheme.muted, fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Sleep AI')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    // Show welcome screen first
    if (_showWelcome) {
      return _buildWelcome();
    }

    // Show onboarding if started
    if (_showOnboarding) {
      return SleepOnboarding(onComplete: _handleOnboardingComplete);
    }

    // Show welcome if no profile (fallback)
    if (_profile == null) {
      return _buildWelcome();
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.indigo.withOpacity(0.2),
                    Colors.purple.withOpacity(0.2),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.nightlight_round, color: Colors.indigo),
            ),
            const SizedBox(width: 12),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Sleep AI', style: TextStyle(fontSize: 18)),
                Text(
                  'Sleep Health Dashboard',
                  style: TextStyle(fontSize: 12, color: AppTheme.muted),
                ),
              ],
            ),
          ],
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Dashboard'),
            Tab(text: 'Log'),
            Tab(text: 'Insights'),
            Tab(text: 'Sounds'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDashboard(),
          _buildLogTab(),
          _buildInsightsTab(),
          const SleepSoundsPlayer(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showLogSleepDialog,
        icon: const Icon(Icons.add),
        label: const Text('Log Sleep'),
      ),
    );
  }

  Widget _buildDashboard() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sleep Score Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.indigo.withOpacity(0.2),
                  Colors.purple.withOpacity(0.2),
                ],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.indigo.withOpacity(0.3)),
            ),
            child: Column(
              children: [
                const Text('Sleep Score', style: TextStyle(color: AppTheme.muted)),
                const SizedBox(height: 8),
                Text(
                  '${_analysis?.sleepScore ?? '--'}',
                  style: const TextStyle(fontSize: 56, fontWeight: FontWeight.bold),
                ),
                const Text('/100', style: TextStyle(color: AppTheme.muted)),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildScoreStat('Avg Duration', '${_analysis?.avgSleepDuration?.toStringAsFixed(1) ?? '--'}h'),
                    _buildScoreStat('Consistency', '${_analysis?.consistencyScore ?? '--'}%'),
                    _buildScoreStat('Efficiency', '${_analysis?.efficiencyScore ?? '--'}%'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Streak Card
          _buildStreakCard(),
          const SizedBox(height: 16),

          // Recent Sleep Logs
          const Text('Recent Sleep', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (_sleepLogs.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('No sleep logs yet. Start tracking!', style: TextStyle(color: AppTheme.muted)),
              ),
            )
          else
            ..._sleepLogs.take(5).map(_buildSleepLogItem),
        ],
      ),
    );
  }

  Widget _buildScoreStat(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
      ],
    );
  }

  Widget _buildStreakCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.orange.withOpacity(0.1),
            Colors.amber.withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.orange.withOpacity(0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.local_fire_department, color: Colors.orange, size: 32),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Sleep Streak', style: TextStyle(color: AppTheme.muted)),
                Text(
                  '$_streak nights',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                Text(_getStreakMessage(), style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getStreakMessage() {
    if (_streak == 0) return 'Start your streak tonight! 🌙';
    if (_streak == 1) return 'Great start! Keep it going! 💪';
    if (_streak < 7) return "You're building momentum! 🔥";
    if (_streak < 14) return 'One week strong! Amazing! ⭐';
    if (_streak < 30) return 'Incredible consistency! 🏅';
    return 'Sleep master! Legendary streak! 🏆';
  }

  Widget _buildSleepLogItem(SleepLog log) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.indigo.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.bed, color: Colors.indigo),
        ),
        title: Text(log.sleepDate),
        subtitle: Text(
          '${log.sleepDurationHours?.toStringAsFixed(1) ?? '--'}h • Quality: ${log.sleepQuality ?? '--'}/10',
        ),
        trailing: log.moodOnWake != null ? Text(_getMoodEmoji(log.moodOnWake!)) : null,
      ),
    );
  }

  String _getMoodEmoji(String mood) {
    switch (mood) {
      case 'terrible': return '😫';
      case 'poor': return '😔';
      case 'okay': return '😐';
      case 'good': return '🙂';
      case 'great': return '😊';
      default: return '😐';
    }
  }

  Widget _buildLogTab() {
    if (_sleepLogs.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.bed, size: 64, color: AppTheme.muted),
              SizedBox(height: 16),
              Text('No sleep logs yet', style: TextStyle(color: AppTheme.muted)),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _sleepLogs.length,
      itemBuilder: (context, index) => _buildSleepLogItem(_sleepLogs[index]),
    );
  }

  Widget _buildInsightsTab() {
    if (_analysis == null || _analysis!.recommendations.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.lightbulb_outline, size: 64, color: AppTheme.muted),
              SizedBox(height: 16),
              Text('Log at least 3 nights to see insights', style: TextStyle(color: AppTheme.muted), textAlign: TextAlign.center),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('AI Recommendations', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        ..._analysis!.recommendations.map(
          (rec) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: const Icon(Icons.lightbulb, color: Colors.amber),
              title: Text(rec),
            ),
          ),
        ),
        if (_analysis!.analysisSummary != null) ...[
          const SizedBox(height: 24),
          const Text('Summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(_analysis!.analysisSummary!),
            ),
          ),
        ],
      ],
    );
  }

  void _showLogSleepDialog() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _SleepLogForm(
        onSubmit: (data) async {
          Navigator.pop(context);
          await _sleepService.logSleep(
            sleepDate: data['sleep_date'],
            sleepDurationHours: data['sleep_duration_hours'],
            sleepQuality: data['sleep_quality'],
            moodOnWake: data['mood_on_wake'],
          );
          _loadData();
        },
      ),
    );
  }
}

class _SleepLogForm extends StatefulWidget {
  final Function(Map<String, dynamic>) onSubmit;

  const _SleepLogForm({required this.onSubmit});

  @override
  State<_SleepLogForm> createState() => _SleepLogFormState();
}

class _SleepLogFormState extends State<_SleepLogForm> {
  double _hours = 7.5;
  int _quality = 7;
  String _mood = 'good';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 24,
        right: 24,
        top: 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Log Last Night\'s Sleep', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Hours of Sleep'),
              Text('${_hours.toStringAsFixed(1)}h', style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          Slider(
            value: _hours,
            min: 0,
            max: 12,
            divisions: 24,
            label: '${_hours.toStringAsFixed(1)}h',
            onChanged: (v) => setState(() => _hours = v),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Sleep Quality'),
              Text('$_quality/10', style: const TextStyle(fontWeight: FontWeight.bold)),
            ],
          ),
          Slider(
            value: _quality.toDouble(),
            min: 1,
            max: 10,
            divisions: 9,
            label: '$_quality',
            onChanged: (v) => setState(() => _quality = v.round()),
          ),
          const SizedBox(height: 16),
          const Text('How do you feel?'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              _moodChip('terrible', '😫'),
              _moodChip('poor', '😔'),
              _moodChip('okay', '😐'),
              _moodChip('good', '🙂'),
              _moodChip('great', '😊'),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                final now = DateTime.now();
                widget.onSubmit({
                  'sleep_date': '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}',
                  'sleep_duration_hours': _hours,
                  'sleep_quality': _quality,
                  'mood_on_wake': _mood,
                });
              },
              child: const Text('Save Sleep Log'),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _moodChip(String value, String emoji) {
    final selected = _mood == value;
    return ChoiceChip(
      label: Text(emoji),
      selected: selected,
      onSelected: (_) => setState(() => _mood = value),
    );
  }
}
