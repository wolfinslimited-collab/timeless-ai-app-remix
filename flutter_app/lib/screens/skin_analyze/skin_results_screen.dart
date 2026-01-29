import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../services/skin_service.dart';

class SkinResultsScreen extends StatelessWidget {
  final SkinAnalysisResult result;
  
  const SkinResultsScreen({super.key, required this.result});

  String _getSkinTypeLabel(String skinType) {
    switch (skinType.toLowerCase()) {
      case 'oily':
        return 'Oily Skin';
      case 'dry':
        return 'Dry Skin';
      case 'combination':
        return 'Combination Skin';
      case 'sensitive':
        return 'Sensitive Skin';
      default:
        return 'Normal Skin';
    }
  }

  String _getScoreLabel(int score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Skin Analysis Results'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              // Share functionality
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Overall score card - mono color
            _OverallScoreCard(
              score: result.overallScore,
              skinType: _getSkinTypeLabel(result.skinType),
              scoreLabel: _getScoreLabel(result.overallScore),
            ),

            const SizedBox(height: 24),

            // Summary
            if (result.analysisSummary.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.summarize, color: AppTheme.muted, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Summary',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.foreground,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      result.analysisSummary,
                      style: const TextStyle(
                        color: AppTheme.muted,
                        fontSize: 14,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Skin metrics
            const Text(
              'Detailed Analysis',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.foreground,
              ),
            ),
            const SizedBox(height: 16),

            // Metrics grid - mono color
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.4,
              children: [
                _MetricCard(
                  title: 'Hydration',
                  value: result.hydrationLevel,
                  status: result.hydrationLevel >= 60 ? 'Good' : 'Low',
                  icon: Icons.water_drop,
                ),
                _MetricCard(
                  title: 'Oiliness',
                  value: result.oilinessLevel,
                  status: result.oilinessLevel <= 40 ? 'Low' : result.oilinessLevel <= 60 ? 'Normal' : 'High',
                  icon: Icons.opacity,
                ),
                _MetricCard(
                  title: 'Skin Type',
                  value: 0,
                  displayText: result.skinType.toUpperCase(),
                  status: '',
                  icon: Icons.spa,
                ),
                _MetricCard(
                  title: 'Overall Score',
                  value: result.overallScore,
                  status: _getScoreLabel(result.overallScore),
                  icon: Icons.auto_awesome,
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Detected concerns
            if (result.concerns.isNotEmpty) ...[
              const Text(
                'Detected Concerns',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.foreground,
                ),
              ),
              const SizedBox(height: 16),
              ...result.concerns.map((concern) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _ConcernCard(
                  title: concern.name,
                  severity: concern.severity,
                  description: concern.description,
                ),
              )),
              const SizedBox(height: 24),
            ],

            // Recommendations
            if (result.recommendations.isNotEmpty) ...[
              const Text(
                'Recommendations',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.foreground,
                ),
              ),
              const SizedBox(height: 16),
              ...result.recommendations.asMap().entries.map((entry) {
                final icons = [
                  Icons.water_drop,
                  Icons.wb_sunny,
                  Icons.bedtime,
                  Icons.spa,
                  Icons.favorite,
                ];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _RecommendationCard(
                    icon: icons[entry.key % icons.length],
                    title: 'Tip ${entry.key + 1}',
                    description: entry.value,
                  ),
                );
              }),
            ],

            const SizedBox(height: 32),

            // Action buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      Navigator.of(context).popUntil((route) => route.isFirst);
                    },
                    icon: const Icon(Icons.home),
                    label: const Text('Home'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: AppTheme.border),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).popUntil((route) => route.isFirst);
                    },
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retake'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
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
}

class _OverallScoreCard extends StatelessWidget {
  final int score;
  final String skinType;
  final String scoreLabel;

  const _OverallScoreCard({
    required this.score,
    required this.skinType,
    required this.scoreLabel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.auto_awesome, color: AppTheme.muted, size: 20),
              SizedBox(width: 8),
              Text(
                'Skin Score',
                style: TextStyle(
                  color: AppTheme.muted,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '$score',
                style: const TextStyle(
                  color: AppTheme.foreground,
                  fontSize: 56,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Text(
                '/100',
                style: TextStyle(
                  color: AppTheme.muted,
                  fontSize: 20,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            scoreLabel,
            style: const TextStyle(
              color: AppTheme.muted,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final int value;
  final String? displayText;
  final String status;
  final IconData icon;

  const _MetricCard({
    required this.title,
    required this.value,
    this.displayText,
    required this.status,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.card,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: AppTheme.muted, size: 18),
              ),
              const Spacer(),
              Text(
                displayText ?? '$value%',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.foreground,
                ),
              ),
            ],
          ),
          const Spacer(),
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppTheme.foreground,
            ),
          ),
          if (status.isNotEmpty)
            Text(
              status,
              style: const TextStyle(
                fontSize: 12,
                color: AppTheme.muted,
              ),
            ),
        ],
      ),
    );
  }
}

class _ConcernCard extends StatelessWidget {
  final String title;
  final String severity;
  final String description;

  const _ConcernCard({
    required this.title,
    required this.severity,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.foreground,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Text(
                  severity.toLowerCase(),
                  style: const TextStyle(
                    color: AppTheme.muted,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: const TextStyle(
              color: AppTheme.muted,
              fontSize: 13,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _RecommendationCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;

  const _RecommendationCard({
    required this.icon,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppTheme.muted, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              description,
              style: const TextStyle(
                color: AppTheme.muted,
                fontSize: 13,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
