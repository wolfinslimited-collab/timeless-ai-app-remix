import 'package:flutter/material.dart';
import '../../../core/theme.dart';
import '../../../widgets/common/tool_screen_layout.dart';

class RetouchToolScreen extends StatelessWidget {
  const RetouchToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ToolScreenLayout(
      title: 'Retouch',
      subtitle: 'AI video retouching tools',
      credits: 10,
      icon: Icons.auto_fix_high,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(
                  Icons.auto_fix_high,
                  size: 40,
                  color: AppTheme.textMuted,
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Retouch',
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'AI-powered video retouching tools coming soon.\nEnhance, correct, and perfect your videos.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.textMuted,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'COMING SOON',
                  style: TextStyle(
                    color: AppTheme.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
