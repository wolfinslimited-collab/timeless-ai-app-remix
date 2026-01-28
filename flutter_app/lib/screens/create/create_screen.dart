import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';

class CreateScreen extends StatelessWidget {
  const CreateScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'What would you like to create?',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 24),

            // Shots Tool Card (Featured)
            _CreateOptionCard(
              icon: Icons.grid_3x3,
              title: 'Shots',
              description: 'Upload 1 image → Get 9 cinematic angles',
              gradient: [const Color(0xFFE879F9), const Color(0xFF8B5CF6)],
              onTap: () => context.go('/create/shots'),
              badge: 'NEW',
            ),
            const SizedBox(height: 16),

            // Image Generation Card
            _CreateOptionCard(
              icon: Icons.image,
              title: 'Image Generation',
              description: 'Create stunning images with AI',
              gradient: [AppTheme.primary, const Color(0xFFEC4899)],
              onTap: () => context.go('/create/image'),
            ),
            const SizedBox(height: 16),

            // Video Generation Card
            _CreateOptionCard(
              icon: Icons.videocam,
              title: 'Video Generation',
              description: 'Generate videos from text or images',
              gradient: [const Color(0xFF3B82F6), const Color(0xFF06B6D4)],
              onTap: () => context.go('/create/video'),
            ),
            const SizedBox(height: 16),

            // Audio/Music Generation Card
            _CreateOptionCard(
              icon: Icons.music_note,
              title: 'Music & Audio',
              description: 'Generate music, vocals, and sound effects',
              gradient: [const Color(0xFF10B981), const Color(0xFF059669)],
              onTap: () => context.go('/create/audio'),
            ),
            const SizedBox(height: 16),

            // AI Apps Card
            _CreateOptionCard(
              icon: Icons.apps,
              title: 'AI Apps',
              description: 'Skin AI, Calorie AI, Sleep AI & more',
              gradient: [const Color(0xFFF59E0B), const Color(0xFFEF4444)],
              onTap: () => context.go('/apps'),
            ),
            const SizedBox(height: 16),

            // Cinema Studio Card
            _CreateOptionCard(
              icon: Icons.movie_creation,
              title: 'Cinema Studio',
              description: 'Professional video creation workspace',
              gradient: [const Color(0xFFEF4444), const Color(0xFFBE185D)],
              onTap: () => context.go('/cinema'),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _CreateOptionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final List<Color> gradient;
  final VoidCallback onTap;
  final String? badge;

  const _CreateOptionCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.gradient,
    required this.onTap,
    this.badge,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: AppTheme.foreground, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.primary,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            badge!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(
                      color: AppTheme.muted,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppTheme.muted),
          ],
        ),
      ),
    );
  }
}
