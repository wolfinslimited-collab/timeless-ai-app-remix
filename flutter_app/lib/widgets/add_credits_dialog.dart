import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/theme.dart';

/// Shows a modal bottom sheet for adding credits or subscribing.
/// 
/// This dialog is shown when a user tries to perform an action but doesn't
/// have enough credits. It offers:
/// - Subscribe to Pro (unlimited generations)
/// - Buy credit packs
void showAddCreditsDialog({
  required BuildContext context,
  int currentCredits = 0,
  int requiredCredits = 0,
}) {
  showModalBottomSheet(
    context: context,
    backgroundColor: AppTheme.card,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (context) => AddCreditsDialogContent(
      currentCredits: currentCredits,
      requiredCredits: requiredCredits,
    ),
  );
}

class AddCreditsDialogContent extends StatelessWidget {
  final int currentCredits;
  final int requiredCredits;

  const AddCreditsDialogContent({
    super.key,
    required this.currentCredits,
    required this.requiredCredits,
  });

  int get creditsNeeded => requiredCredits > currentCredits 
      ? requiredCredits - currentCredits 
      : 0;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 20,
        bottom: MediaQuery.of(context).padding.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.muted.withOpacity(0.3),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),

          // Icon
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppTheme.accent.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.toll,
              size: 32,
              color: AppTheme.accent,
            ),
          ),
          const SizedBox(height: 16),

          // Title
          const Text(
            'Add Credits to Continue',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppTheme.foreground,
            ),
          ),
          const SizedBox(height: 8),

          // Description
          Text(
            creditsNeeded > 0
                ? 'You need $creditsNeeded more credits for this generation.'
                : 'Choose a credit package or go unlimited with Pro.',
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.muted,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),

          // Current balance
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.secondary.withOpacity(0.5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Current Balance',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.muted,
                  ),
                ),
                Row(
                  children: [
                    Icon(
                      Icons.toll,
                      size: 18,
                      color: Colors.amber[600],
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '$currentCredits credits',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.foreground,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Pro Subscription Option
          InkWell(
            onTap: () {
              Navigator.pop(context);
              context.push('/subscription');
            },
            borderRadius: BorderRadius.circular(16),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primary.withOpacity(0.15),
                    AppTheme.primary.withOpacity(0.05),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppTheme.primary.withOpacity(0.5),
                  width: 2,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.all_inclusive,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Timeless Pro',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.foreground,
                          ),
                        ),
                        Text(
                          'Unlimited generations',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppTheme.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        '\$19.99',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.foreground,
                        ),
                      ),
                      Text(
                        '/month',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.muted,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Divider
          Row(
            children: [
              Expanded(child: Divider(color: AppTheme.border.withOpacity(0.3))),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text(
                  'or buy credits',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.muted,
                  ),
                ),
              ),
              Expanded(child: Divider(color: AppTheme.border.withOpacity(0.3))),
            ],
          ),
          const SizedBox(height: 16),

          // Credit Packs
          Row(
            children: [
              _buildCreditPack(
                context: context,
                name: 'Starter',
                credits: 50,
                price: '\$4.99',
                icon: Icons.toll,
              ),
              const SizedBox(width: 8),
              _buildCreditPack(
                context: context,
                name: 'Pro',
                credits: 150,
                price: '\$9.99',
                icon: Icons.flash_on,
                isPopular: true,
              ),
              const SizedBox(width: 8),
              _buildCreditPack(
                context: context,
                name: 'Ultimate',
                credits: 500,
                price: '\$19.99',
                icon: Icons.workspace_premium,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Footer
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  context.push('/subscription');
                },
                child: Text(
                  'View all plans →',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.muted,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text(
                  'Cancel',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppTheme.foreground,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCreditPack({
    required BuildContext context,
    required String name,
    required int credits,
    required String price,
    required IconData icon,
    bool isPopular = false,
  }) {
    return Expanded(
      child: InkWell(
        onTap: () {
          Navigator.pop(context);
          context.push('/subscription');
        },
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: isPopular 
                    ? AppTheme.primary.withOpacity(0.05) 
                    : AppTheme.secondary.withOpacity(0.3),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isPopular 
                      ? AppTheme.primary.withOpacity(0.5) 
                      : AppTheme.border.withOpacity(0.3),
                  width: isPopular ? 2 : 1,
                ),
              ),
              child: Column(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: isPopular ? AppTheme.primary : AppTheme.secondary,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      icon,
                      size: 18,
                      color: isPopular ? Colors.white : AppTheme.primary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$credits',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.foreground,
                    ),
                  ),
                  Text(
                    'credits',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.muted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    price,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.foreground,
                    ),
                  ),
                ],
              ),
            ),
            if (isPopular)
              Positioned(
                top: -8,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'Best',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
