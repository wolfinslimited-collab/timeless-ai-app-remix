import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/credits_provider.dart';

class CreditBadge extends StatelessWidget {
  final bool showSubscriptionBadge;
  final VoidCallback? onTap;

  const CreditBadge({
    super.key,
    this.showSubscriptionBadge = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<CreditsProvider>(
      builder: (context, creditsProvider, child) {
        if (creditsProvider.isLoading) {
          return const SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(strokeWidth: 2),
          );
        }

        if (creditsProvider.hasActiveSubscription && showSubscriptionBadge) {
          return GestureDetector(
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primary, Color(0xFFEC4899)],
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.all_inclusive, size: 16, color: Colors.white),
                  SizedBox(width: 4),
                  Text(
                    'Pro',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        return GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.border),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.toll,
                  size: 16,
                  color: AppTheme.accent,
                ),
                const SizedBox(width: 4),
                Text(
                  '${creditsProvider.credits}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
