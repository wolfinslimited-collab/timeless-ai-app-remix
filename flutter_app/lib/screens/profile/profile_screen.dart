import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:in_app_review/in_app_review.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/credits_provider.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  static const String _appStoreId = '6740804440';
  static const String _playStoreId = 'com.wolfine.app';

  Future<void> _shareApp(BuildContext context) async {
    const String appStoreUrl = 'https://apps.apple.com/us/app/timeless-all-in-one-ai/id$_appStoreId';
    const String playStoreUrl = 'https://play.google.com/store/apps/details?id=$_playStoreId';
    
    final String shareUrl = Platform.isIOS ? appStoreUrl : playStoreUrl;
    const String shareText = '🎨 Check out Timeless AI - Create amazing images, videos, and music with AI!\n\n';
    
    try {
      await SharePlus.instance.share(
        ShareParams(
          text: '$shareText$shareUrl',
          subject: 'Timeless AI - All-in-One AI Creative Studio',
        ),
      );
      
      // Show rate app bottom sheet after sharing
      if (context.mounted) {
        _showRateAppBottomSheet(context);
      }
    } catch (e) {
      debugPrint('Share failed: $e');
    }
  }

  void _showRateAppBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(color: AppTheme.border),
        ),
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            // Star icons
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) => 
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Icon(
                    Icons.star_rounded,
                    color: Colors.amber,
                    size: 36,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            // Title
            const Text(
              'Enjoying Timeless AI?',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 12),
            // Description
            Text(
              'Your feedback helps us create a better experience for everyone. Would you take a moment to rate us?',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: Colors.white.withOpacity(0.7),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 28),
            // Rate button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  _requestInAppReview();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5CF6),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.star_rounded, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Rate Timeless AI',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            // Maybe later button
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () => Navigator.pop(context),
                style: TextButton.styleFrom(
                  foregroundColor: Colors.white60,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Maybe Later',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _requestInAppReview() async {
    final InAppReview inAppReview = InAppReview.instance;
    
    try {
      if (await inAppReview.isAvailable()) {
        await inAppReview.requestReview();
      } else {
        // Fallback to opening store listing
        await inAppReview.openStoreListing(
          appStoreId: _appStoreId,
          microsoftStoreId: null,
        );
      }
    } catch (e) {
      debugPrint('In-app review failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    final email = user?.email ?? 'User';
    final displayName = email.split('@')[0];
    final initials =
        displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Consumer<CreditsProvider>(
          builder: (context, creditsProvider, child) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Profile',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppTheme.secondary,
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.settings_outlined, size: 18),
                          onPressed: () {},
                          padding: EdgeInsets.zero,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // User Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppTheme.secondary,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      children: [
                        // Avatar
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF8B5CF6), Color(0xFFEC4899)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(30),
                          ),
                          child: Center(
                            child: Text(
                              initials,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        // User Info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                displayName,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 16,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                email,
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                ),
                              ),
                              if (creditsProvider.hasActiveSubscription) ...[
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    Icon(
                                      Icons.workspace_premium,
                                      size: 14,
                                      color: Colors.amber[400],
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Pro Member',
                                      style: TextStyle(
                                        color: Colors.amber[400],
                                        fontSize: 12,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Credits Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          const Color(0xFF8B5CF6).withOpacity(0.5),
                          const Color(0xFFEC4899).withOpacity(0.5),
                        ],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Available Credits',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.8),
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${creditsProvider.credits}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        GestureDetector(
                          onTap: () => context.push('/subscription'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Text(
                              'Add Credits',
                              style: TextStyle(
                                color: Color(0xFF8B5CF6),
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Menu Items
                  _ProfileMenuItem(
                    icon: Icons.workspace_premium_outlined,
                    label: 'Subscription',
                    onTap: () => context.push('/subscription'),
                  ),
                  const SizedBox(height: 8),
                  _ProfileMenuItem(
                    icon: Icons.photo_library_outlined,
                    label: 'Library',
                    onTap: () => context.push('/library'),
                  ),
                  const SizedBox(height: 8),
                  _ProfileMenuItem(
                    icon: Icons.download_outlined,
                    label: 'Downloads',
                    onTap: () => context.push('/downloads'),
                  ),
                  const SizedBox(height: 8),
                  _ProfileMenuItem(
                    icon: Icons.favorite_outline,
                    label: 'Favorites',
                    onTap: () => context.push('/favorites'),
                  ),
                  const SizedBox(height: 8),
                  _ProfileMenuItem(
                    icon: Icons.share_outlined,
                    label: 'Share App',
                    onTap: () => _shareApp(context),
                  ),
                  const SizedBox(height: 8),
                  _ProfileMenuItem(
                    icon: Icons.star_outline,
                    label: 'Rate App',
                    onTap: () => _requestInAppReview(),
                  ),
                  const SizedBox(height: 8),

                  // Sign Out Button
                  GestureDetector(
                    onTap: () async {
                      await context.read<AuthProvider>().signOut();
                      if (context.mounted) {
                        context.go('/login');
                      }
                    },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.logout,
                            size: 20,
                            color: Colors.red[400],
                          ),
                          const SizedBox(width: 16),
                          Text(
                            'Sign Out',
                            style: TextStyle(
                              color: Colors.red[400],
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ProfileMenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ProfileMenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: Colors.white,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 15,
                ),
              ),
            ),
            Icon(
              Icons.chevron_right,
              size: 20,
              color: Colors.white,
            ),
          ],
        ),
      ),
    );
  }
}
