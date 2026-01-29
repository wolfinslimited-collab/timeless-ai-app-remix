import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/brain_service.dart';

class BrainAIScreen extends StatefulWidget {
  const BrainAIScreen({super.key});

  @override
  State<BrainAIScreen> createState() => _BrainAIScreenState();
}

class _BrainAIScreenState extends State<BrainAIScreen>
    with SingleTickerProviderStateMixin {
  final BrainService _brainService = BrainService();
  late TabController _tabController;

  BrainProfile? _profile;
  BrainMetrics? _todayMetrics;
  List<BrainMetrics> _weeklyMetrics = [];
  List<BrainMoodLog> _recentMoodLogs = [];
  bool _isLoading = true;
  bool _showOnboarding = false;
  bool _hasActiveSubscription = false;

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

    _hasActiveSubscription = await _brainService.checkSubscription();

    if (!_hasActiveSubscription) {
      setState(() => _isLoading = false);
      return;
    }

    final profile = await _brainService.getProfile();
    if (profile == null) {
      setState(() {
        _showOnboarding = true;
        _isLoading = false;
      });
      return;
    }

    final todayMetrics = await _brainService.getTodayMetrics();
    final weeklyMetrics = await _brainService.getWeeklyMetrics();
    final moodLogs = await _brainService.getRecentMoodLogs();

    setState(() {
      _profile = profile;
      _todayMetrics = todayMetrics;
      _weeklyMetrics = weeklyMetrics;
      _recentMoodLogs = moodLogs;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Brain AI')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (!_hasActiveSubscription) {
      return _buildSubscriptionGate();
    }

    if (_showOnboarding) {
      return _buildOnboarding();
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.psychology, color: AppTheme.muted),
            ),
            const SizedBox(width: 12),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Brain AI', style: TextStyle(fontSize: 18)),
                Text(
                  'Cognitive Wellness Dashboard',
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
            Tab(text: 'Games'),
            Tab(text: 'Trends'),
            Tab(text: 'Insights'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDashboard(),
          _buildGamesTab(),
          _buildTrendsTab(),
          _buildInsightsTab(),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showMoodCheckIn,
        icon: const Icon(Icons.add),
        label: const Text('Mood Check-In'),
      ),
    );
  }

  Widget _buildSubscriptionGate() {
    return Scaffold(
      appBar: AppBar(title: const Text('Brain AI')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Icon(Icons.lock, size: 64, color: AppTheme.muted),
              ),
              const SizedBox(height: 24),
              const Text(
                'Brain AI is a Premium Feature',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              const Text(
                'Unlock cognitive wellness insights, focus tracking, stress monitoring, and personalized recommendations with an active subscription.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.muted),
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: () => Navigator.pushNamed(context, '/pricing'),
                icon: const Icon(Icons.auto_awesome),
                label: const Text('View Subscription Plans'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOnboarding() {
    return Scaffold(
      appBar: AppBar(title: const Text('Brain AI Setup')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(
                Icons.psychology,
                size: 80,
                color: AppTheme.muted,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Welcome to Brain AI',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Track your cognitive wellness, monitor focus and stress, and get personalized insights.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.muted),
            ),
            const SizedBox(height: 32),
            _buildFeatureItem(
              Icons.track_changes,
              'Focus Tracking',
              'Monitor your attention span and concentration',
            ),
            _buildFeatureItem(
              Icons.favorite,
              'Mood Stability',
              'Track emotional balance throughout the day',
            ),
            _buildFeatureItem(
              Icons.games,
              'Brain Games',
              'Exercise your mind with cognitive challenges',
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
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppTheme.primary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
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

  Widget _buildDashboard() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quick Actions
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _showMoodCheckIn,
                  icon: const Icon(Icons.add),
                  label: const Text('Mood Check-In'),
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton.icon(
                onPressed: _refreshMetrics,
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Main Score Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: Column(
              children: [
                const Text(
                  "Today's Brain Performance",
                  style: TextStyle(color: AppTheme.muted),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '${_todayMetrics?.brainPerformanceScore ?? '--'}',
                      style: const TextStyle(
                        fontSize: 56,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Text('/100', style: TextStyle(color: AppTheme.muted)),
                  ],
                ),
                Text(
                  _getPerformanceMessage(),
                  style: TextStyle(
                    color: (_todayMetrics?.brainPerformanceScore ?? 0) >= 70
                        ? Colors.green
                        : AppTheme.muted,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildMetricStat(
                      '${_todayMetrics?.deepWorkMinutes ?? 0}',
                      'Deep Work (min)',
                    ),
                    _buildMetricStat(
                      '${_todayMetrics?.appSwitches ?? 0}',
                      'App Switches',
                    ),
                    _buildMetricStat(
                      '${_recentMoodLogs.length}',
                      'Check-ins',
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Score Cards Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.4,
            children: [
              _buildScoreCard(
                'Focus',
                _todayMetrics?.focusScore,
                Icons.center_focus_strong,
              ),
              _buildScoreCard(
                'Stress Load',
                _todayMetrics?.stressLoad != null
                    ? 100 - _todayMetrics!.stressLoad!
                    : null,
                Icons.flash_on,
              ),
              _buildScoreCard(
                'Mood',
                _todayMetrics?.moodStability,
                Icons.favorite,
              ),
              _buildScoreCard(
                'Reaction',
                _todayMetrics?.reactionSpeed,
                Icons.speed,
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Insights
          if (_todayMetrics?.insights.isNotEmpty ?? false) ...[
            const Text(
              'Today\'s Insights',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            ..._todayMetrics!.insights.map(_buildInsightCard),
          ],
        ],
      ),
    );
  }

  String _getPerformanceMessage() {
    final score = _todayMetrics?.brainPerformanceScore ?? 0;
    if (score >= 70) return "You're performing well today!";
    return 'Room for improvement';
  }

  Widget _buildMetricStat(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        Text(label,
            style: const TextStyle(color: AppTheme.muted, fontSize: 12)),
      ],
    );
  }

  Widget _buildScoreCard(
    String title,
    int? score,
    IconData icon,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: AppTheme.muted, size: 20),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(color: AppTheme.muted, fontSize: 13),
              ),
            ],
          ),
          const Spacer(),
          Text(
            '${score ?? '--'}',
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildInsightCard(BrainInsight insight) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: AppTheme.secondary,
      child: ListTile(
        leading: Icon(Icons.lightbulb_outline, color: AppTheme.muted),
        title: Text(insight.title),
        subtitle: Text(
          insight.description,
          style: const TextStyle(fontSize: 13),
        ),
      ),
    );
  }

  Widget _buildGamesTab() {
    final games = [
      {'name': 'Memory Match', 'description': 'Test your memory', 'icon': Icons.grid_view},
      {'name': 'Speed Math', 'description': 'Quick calculations', 'icon': Icons.calculate},
      {'name': 'Pattern Recognition', 'description': 'Find the pattern', 'icon': Icons.search},
      {'name': 'Word Puzzle', 'description': 'Vocabulary challenge', 'icon': Icons.text_fields},
      {'name': 'Reaction Test', 'description': 'Test your reflexes', 'icon': Icons.flash_on},
      {'name': 'Focus Timer', 'description': 'Deep work session', 'icon': Icons.timer},
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Brain Games',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        ...games.map((game) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: AppTheme.secondary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(12),
            leading: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.card,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(game['icon'] as IconData, color: AppTheme.muted),
            ),
            title: Text(
              game['name'] as String,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            subtitle: Text(
              game['description'] as String,
              style: const TextStyle(color: AppTheme.muted, fontSize: 13),
            ),
            trailing: const Icon(Icons.chevron_right, color: AppTheme.muted),
            onTap: () => _launchGame(game['name'] as String),
          ),
        )),
      ],
    );
  }

  Widget _buildTrendsTab() {
    if (_weeklyMetrics.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.show_chart, size: 64, color: AppTheme.muted),
              SizedBox(height: 16),
              Text(
                'Track your progress over time',
                style: TextStyle(color: AppTheme.muted),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Weekly Performance',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        ..._weeklyMetrics.map((m) => Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text(m.metricDate),
                subtitle: Text(
                    'Focus: ${m.focusScore ?? '--'} | Stress: ${m.stressLoad ?? '--'}'),
                trailing: Text(
                  '${m.brainPerformanceScore ?? '--'}',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildInsightsTab() {
    final allInsights = _weeklyMetrics.expand((m) => m.insights).toList();

    if (allInsights.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.lightbulb_outline, size: 64, color: AppTheme.muted),
              SizedBox(height: 16),
              Text(
                'Insights will appear as you track',
                style: TextStyle(color: AppTheme.muted),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: allInsights.length,
      itemBuilder: (context, index) => _buildInsightCard(allInsights[index]),
    );
  }

  void _startOnboarding() async {
    final profile = await _brainService.createProfile(
      age: 25,
      gender: 'other',
      workSchedule: 'regular',
      sleepGoalHours: 8.0,
      focusGoals: ['improve_focus', 'reduce_stress'],
    );

    if (profile != null) {
      setState(() {
        _profile = profile;
        _showOnboarding = false;
      });
      _loadData();
    }
  }

  void _refreshMetrics() async {
    final metrics = await _brainService.refreshMetrics();
    if (metrics != null) {
      setState(() => _todayMetrics = metrics);
    }
  }

  void _showMoodCheckIn() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _MoodCheckInForm(
        onSubmit: (data) async {
          Navigator.pop(context);
          await _brainService.logMood(
            moodScore: data['mood_score'],
            energyLevel: data['energy_level'],
            focusLevel: data['focus_level'],
            stressLevel: data['stress_level'],
            context: data['context'],
          );
          _loadData();
        },
      ),
    );
  }

  void _launchGame(String gameName) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Launching $gameName...')),
    );
  }
}

class _MoodCheckInForm extends StatefulWidget {
  final Function(Map<String, dynamic>) onSubmit;

  const _MoodCheckInForm({required this.onSubmit});

  @override
  State<_MoodCheckInForm> createState() => _MoodCheckInFormState();
}

class _MoodCheckInFormState extends State<_MoodCheckInForm> {
  int _mood = 7;
  int _energy = 7;
  int _focus = 7;
  int _stress = 3;
  String _context = 'afternoon';

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
          const Text(
            'Mood Check-In',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 24),
          _buildSlider('Mood', _mood, (v) => setState(() => _mood = v)),
          _buildSlider('Energy', _energy, (v) => setState(() => _energy = v)),
          _buildSlider('Focus', _focus, (v) => setState(() => _focus = v)),
          _buildSlider('Stress', _stress, (v) => setState(() => _stress = v)),
          const SizedBox(height: 16),
          const Text('Time of Day'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              _contextChip('morning', '🌅 Morning'),
              _contextChip('afternoon', '☀️ Afternoon'),
              _contextChip('evening', '🌆 Evening'),
              _contextChip('night', '🌙 Night'),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                widget.onSubmit({
                  'mood_score': _mood,
                  'energy_level': _energy,
                  'focus_level': _focus,
                  'stress_level': _stress,
                  'context': _context,
                });
              },
              child: const Text('Save Check-In'),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildSlider(String label, int value, Function(int) onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label),
            Text('$value/10', style: const TextStyle(color: AppTheme.muted)),
          ],
        ),
        Slider(
          value: value.toDouble(),
          min: 1,
          max: 10,
          divisions: 9,
          onChanged: (v) => onChanged(v.round()),
        ),
      ],
    );
  }

  Widget _contextChip(String value, String label) {
    final selected = _context == value;
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => setState(() => _context = value),
    );
  }
}
