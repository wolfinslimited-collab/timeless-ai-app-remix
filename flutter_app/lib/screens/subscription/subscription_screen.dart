import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/credits_provider.dart';
import '../../services/subscription_service.dart';

class SubscriptionScreen extends StatelessWidget {
  const SubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Account'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Profile Section
            Consumer<AuthProvider>(
              builder: (context, auth, child) {
                final profile = auth.profile;
                return Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppTheme.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 32,
                        backgroundColor: AppTheme.primary,
                        child: Text(
                          (profile?.displayName ?? 'U')[0].toUpperCase(),
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              profile?.displayName ?? 'User',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              auth.user?.email ?? '',
                              style: const TextStyle(color: AppTheme.muted),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 24),

            // Credits Section
            const Text(
              'Credits & Subscription',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Consumer2<CreditsProvider, AuthProvider>(
              builder: (context, credits, auth, child) {
                final hasSubscription = credits.hasActiveSubscription;
                final profile = auth.profile;

                return Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: hasSubscription
                        ? LinearGradient(
                            colors: [
                              AppTheme.primary.withOpacity(0.2),
                              const Color(0xFFEC4899).withOpacity(0.2),
                            ],
                          )
                        : null,
                    color: hasSubscription ? null : AppTheme.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: hasSubscription
                          ? AppTheme.primary.withOpacity(0.3)
                          : AppTheme.border,
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Current Credits'),
                          Row(
                            children: [
                              const Icon(Icons.toll, size: 20, color: AppTheme.accent),
                              const SizedBox(width: 4),
                              Text(
                                hasSubscription ? '∞' : '${credits.credits}',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const Divider(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Plan'),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              gradient: hasSubscription
                                  ? const LinearGradient(
                                      colors: [AppTheme.primary, Color(0xFFEC4899)],
                                    )
                                  : null,
                              color: hasSubscription ? null : AppTheme.secondary,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              hasSubscription ? 'Timeless Pro' : 'Free',
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: hasSubscription ? Colors.white : null,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (hasSubscription && profile?.subscriptionEndDate != null) ...[
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Renews'),
                            Text(
                              _formatDate(profile!.subscriptionEndDate!),
                              style: const TextStyle(color: AppTheme.muted),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 16),

            // Action buttons
            Consumer<CreditsProvider>(
              builder: (context, credits, child) {
                return Column(
                  children: [
                    if (!credits.hasActiveSubscription)
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: () => context.go('/pricing'),
                          child: const Text('Get Credits or Subscribe'),
                        ),
                      )
                    else
                      SizedBox(
                        width: double.infinity,
                        child: OutlinedButton(
                          onPressed: () async {
                            try {
                              await SubscriptionService().openCustomerPortal();
                            } catch (e) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Error: $e')),
                              );
                            }
                          },
                          child: const Text('Manage Subscription'),
                        ),
                      ),
                  ],
                );
              },
            ),
            const SizedBox(height: 32),

            // Settings
            const Text(
              'Settings',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _SettingsTile(
              icon: Icons.person_outline,
              title: 'Edit Profile',
              onTap: () {},
            ),
            _SettingsTile(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              onTap: () {},
            ),
            _SettingsTile(
              icon: Icons.help_outline,
              title: 'Help & Support',
              onTap: () {},
            ),
            _SettingsTile(
              icon: Icons.info_outline,
              title: 'About',
              onTap: () {},
            ),
            const SizedBox(height: 24),

            // Sign out
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () async {
                  await context.read<AuthProvider>().signOut();
                  if (context.mounted) {
                    context.go('/login');
                  }
                },
                icon: const Icon(Icons.logout, color: AppTheme.destructive),
                label: const Text(
                  'Sign Out',
                  style: TextStyle(color: AppTheme.destructive),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.month}/${date.day}/${date.year}';
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: AppTheme.muted),
      title: Text(title),
      trailing: const Icon(Icons.chevron_right, color: AppTheme.muted),
      onTap: onTap,
      contentPadding: EdgeInsets.zero,
    );
  }
}
