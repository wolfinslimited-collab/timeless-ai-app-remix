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
      body: Padding(
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

            // Cinema Studio Card
            _CreateOptionCard(
              icon: Icons.movie_creation,
              title: 'Cinema Studio',
              description: 'Professional video creation workspace',
              gradient: [const Color(0xFFF59E0B), const Color(0xFFEF4444)],
              onTap: () => context.go('/cinema'),
            ),
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

  const _CreateOptionCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.gradient,
    required this.onTap,
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
                gradient: LinearGradient(colors: gradient),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Colors.white, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
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
