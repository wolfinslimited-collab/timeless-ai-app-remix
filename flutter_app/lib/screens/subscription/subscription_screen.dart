import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/credits_provider.dart';
import '../../services/subscription_service.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  bool _isLoading = false;
  bool _isRestoring = false;

  String get _platform {
    if (Platform.isIOS) return 'ios';
    if (Platform.isAndroid) return 'android';
    return 'web';
  }

  Future<void> _handleSubscribe(bool hasActiveSubscription) async {
    setState(() => _isLoading = true);
    
    try {
      if (hasActiveSubscription) {
        // Open customer portal for managing subscription
        await SubscriptionService().openCustomerPortal();
      } else {
        // Navigate to pricing for new subscription
        if (mounted) context.go('/pricing');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleRestore() async {
    setState(() => _isRestoring = true);
    
    try {
      // TODO: Integrate with native IAP restore
      // For iOS: StoreKit restore
      // For Android: Google Play restore
      await Future.delayed(const Duration(seconds: 2));
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Purchases restored successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Restore failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isRestoring = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Account'),
      ),
      body: Stack(
        children: [
          // Scrollable content
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 140),
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

          // Fixed Bottom Sheet
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Consumer<CreditsProvider>(
              builder: (context, credits, child) {
                final hasActiveSubscription = credits.hasActiveSubscription;
                
                return Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        AppTheme.background.withOpacity(0),
                        AppTheme.background,
                        AppTheme.background,
                      ],
                      stops: const [0.0, 0.3, 1.0],
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(16, 24, 16, 24),
                  child: SafeArea(
                    top: false,
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.card.withOpacity(0.95),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Subscribe/Manage Button
                          SizedBox(
                            width: double.infinity,
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: hasActiveSubscription
                                      ? [const Color(0xFF16A34A), const Color(0xFF059669)]
                                      : [AppTheme.primary, const Color(0xFFEC4899)],
                                ),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: ElevatedButton(
                                onPressed: _isLoading 
                                    ? null 
                                    : () => _handleSubscribe(hasActiveSubscription),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.transparent,
                                  shadowColor: Colors.transparent,
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                ),
                                child: _isLoading
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : Row(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          if (hasActiveSubscription)
                                            const Icon(Icons.check, size: 20),
                                          if (hasActiveSubscription)
                                            const SizedBox(width: 8),
                                          Text(
                                            hasActiveSubscription
                                                ? 'Manage Subscription'
                                                : 'Subscribe Now',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ],
                                      ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          
                          // Restore & Cancel info
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              TextButton(
                                onPressed: _isRestoring ? null : _handleRestore,
                                child: _isRestoring
                                    ? Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          SizedBox(
                                            width: 14,
                                            height: 14,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: AppTheme.primary,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          const Text(
                                            'Restoring...',
                                            style: TextStyle(color: AppTheme.primary),
                                          ),
                                        ],
                                      )
                                    : const Text(
                                        'Restore Purchases',
                                        style: TextStyle(color: AppTheme.primary),
                                      ),
                              ),
                              const Text(
                                'Cancel anytime',
                                style: TextStyle(
                                  color: AppTheme.muted,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
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
