import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
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

  int get creditsNeeded =>
      requiredCredits > currentCredits ? requiredCredits - currentCredits : 0;

  @override
  Widget build(BuildContext context) {
    final bottomPadding = MediaQuery.of(context).padding.bottom + 24;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0).copyWith(
        bottom: bottomPadding,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle bar (centered)
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.muted.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Header: icon + title + description (centered)
          Center(
            child: Column(
              children: [
                Container(
                  width: 56,
                  height: 56,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppTheme.border.withValues(alpha: 0.5),
                    ),
                  ),
                  child: PhosphorIcon(
                    PhosphorIconsRegular.coins,
                    size: 26,
                    color: AppTheme.mutedForeground,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Add Credits to Continue',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.foreground,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Text(
                    creditsNeeded > 0
                        ? 'You need $creditsNeeded more credits for this generation.'
                        : 'Choose a credit package or go unlimited with Pro.',
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppTheme.muted,
                      height: 1.35,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Current balance — mono icon
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border.withValues(alpha: 0.5)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Current Balance',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.muted,
                  ),
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    PhosphorIcon(
                      PhosphorIconsRegular.coins,
                      size: 18,
                      color: AppTheme.mutedForeground,
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

          // Pro subscription card
          InkWell(
            onTap: () {
              Navigator.pop(context);
              context.push('/pricing');
            },
            borderRadius: BorderRadius.circular(14),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: AppTheme.primary.withValues(alpha: 0.4),
                  width: 1.5,
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: PhosphorIcon(
                      PhosphorIconsFill.infinity,
                      size: 22,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Timeless Pro',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.foreground,
                          ),
                        ),
                        const SizedBox(height: 2),
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
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        '\$19.99',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w600,
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
          const SizedBox(height: 20),

          // Divider: or buy credits
          Row(
            children: [
              Expanded(
                child: Divider(
                  color: AppTheme.border.withValues(alpha: 0.5),
                  thickness: 1,
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Text(
                  'or buy credits',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.muted,
                  ),
                ),
              ),
              Expanded(
                child: Divider(
                  color: AppTheme.border.withValues(alpha: 0.5),
                  thickness: 1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Credit packs — same mono icon for all
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: _CreditPackCard(
                  credits: 50,
                  price: '\$4.99',
                  isBest: false,
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/subscription');
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _CreditPackCard(
                  credits: 150,
                  price: '\$9.99',
                  isBest: true,
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/subscription');
                  },
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _CreditPackCard(
                  credits: 500,
                  price: '\$19.99',
                  isBest: false,
                  onTap: () {
                    Navigator.pop(context);
                    context.push('/subscription');
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Footer
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  context.push('/subscription');
                },
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.muted,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                child: const Text(
                  'View all plans →',
                  style: TextStyle(fontSize: 13),
                ),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context),
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.foreground,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                child: const Text(
                  'Cancel',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Single credit pack card — mono icon (coins), optional "Best" badge inside card.
class _CreditPackCard extends StatelessWidget {
  final int credits;
  final String price;
  final bool isBest;
  final VoidCallback onTap;

  const _CreditPackCard({
    required this.credits,
    required this.price,
    required this.isBest,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: EdgeInsets.fromLTRB(12, isBest ? 18 : 14, 12, 14),
          decoration: BoxDecoration(
            color: isBest
                ? AppTheme.primary.withValues(alpha: 0.06)
                : AppTheme.secondary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isBest
                  ? AppTheme.primary.withValues(alpha: 0.4)
                  : AppTheme.border.withValues(alpha: 0.5),
              width: isBest ? 1.5 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // "Best" badge inside card, top center
              if (isBest)
                Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppTheme.primary,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'Best',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              // Mono icon — same for all packs
              Container(
                width: 36,
                height: 36,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppTheme.secondary.withValues(alpha: 0.8),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: PhosphorIcon(
                  PhosphorIconsRegular.coins,
                  size: 18,
                  color: AppTheme.mutedForeground,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                '$credits',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
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
              const SizedBox(height: 6),
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
      ),
    );
  }
}
