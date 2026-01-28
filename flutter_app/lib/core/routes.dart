import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/splash/splash_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/create/create_screen.dart';
import '../screens/create/image_create_screen.dart';
import '../screens/create/video_create_screen.dart';
import '../screens/create/audio_create_screen.dart';
// Image Tools
import '../screens/create/tools/relight_tool_screen.dart';
import '../screens/create/tools/upscale_tool_screen.dart';
import '../screens/create/tools/shots_tool_screen.dart';
import '../screens/create/tools/inpainting_tool_screen.dart';
import '../screens/create/tools/object_erase_tool_screen.dart';
import '../screens/create/tools/angle_tool_screen.dart';
import '../screens/create/tools/skin_enhancer_tool_screen.dart';
import '../screens/create/tools/style_transfer_tool_screen.dart';
import '../screens/create/tools/background_remove_tool_screen.dart';
// Video Tools
import '../screens/create/tools/video_upscale_tool_screen.dart';
import '../screens/create/tools/lip_sync_tool_screen.dart';
import '../screens/create/tools/interpolate_tool_screen.dart';
import '../screens/create/tools/extend_video_tool_screen.dart';
import '../screens/create/tools/sketch_to_video_tool_screen.dart';
import '../screens/create/tools/draw_to_video_tool_screen.dart';
import '../screens/create/tools/mixed_media_tool_screen.dart';
import '../screens/create/tools/click_to_ad_tool_screen.dart';
import '../screens/create/tools/ugc_factory_tool_screen.dart';
import '../screens/create/tools/sora_trends_tool_screen.dart';
// Audio Tools
import '../screens/create/tools/stems_tool_screen.dart';
import '../screens/create/tools/remix_tool_screen.dart';
import '../screens/create/tools/vocals_tool_screen.dart';
import '../screens/create/tools/mastering_tool_screen.dart';
import '../screens/create/tools/sound_effects_tool_screen.dart';
import '../screens/create/tools/audio_enhance_tool_screen.dart';
import '../screens/create/tools/tempo_pitch_tool_screen.dart';
import '../screens/chat/chat_screen.dart';
import '../screens/library/library_screen.dart';
import '../screens/apps/apps_screen.dart';
import '../screens/cinema/cinema_studio_screen.dart';
import '../screens/subscription/subscription_screen.dart';
import '../screens/subscription/pricing_screen.dart';
import '../screens/skin_analyze/skin_analyze_screen.dart';
import '../screens/calorie/calorie_wrapper_screen.dart';
import '../screens/calorie/calorie_onboarding_screen.dart';
import '../screens/calorie/calorie_dashboard_screen.dart';
import '../screens/financial/financial_ai_screen.dart';
import '../screens/fingerprint/fingerprint_ai_screen.dart';
import '../screens/sleep/sleep_ai_screen.dart';
import '../screens/brain/brain_ai_screen.dart';
import '../screens/notify/notify_ai_screen.dart';
import '../screens/upgrade_plan/upgrade_plan_wizard_page.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/downloads/downloads_screen.dart';
import '../widgets/common/main_scaffold.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/splash',
  redirect: (context, state) {
    final session = Supabase.instance.client.auth.currentSession;
    final isLoggedIn = session != null;
    final isAuthRoute =
        state.matchedLocation == '/login' || state.matchedLocation == '/signup';
    final isSplashRoute = state.matchedLocation == '/splash';
    final isWizardRoute = state.matchedLocation == '/upgrade-wizard';

    // Allow splash screen to handle its own navigation
    if (isSplashRoute) {
      return null;
    }

    if (!isLoggedIn && !isAuthRoute) {
      return '/login';
    }

    if (isLoggedIn && isAuthRoute) {
      return '/';
    }

    return null;
  },
  routes: [
    // Splash screen
    GoRoute(
      path: '/splash',
      builder: (context, state) => const SplashScreen(),
    ),
    // Auth routes (no bottom nav)
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/signup',
      builder: (context, state) => const SignupScreen(),
    ),
    // Upgrade wizard (full screen, no bottom nav)
    GoRoute(
      path: '/upgrade-wizard',
      builder: (context, state) {
        final isFromWelcome = state.extra as bool? ?? false;
        return UpgradePlanWizardPage(isFromWelcome: isFromWelcome);
      },
    ),

    // Main app routes (with bottom nav)
    ShellRoute(
      navigatorKey: _shellNavigatorKey,
      builder: (context, state, child) => MainScaffold(child: child),
      routes: [
        GoRoute(
          path: '/',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: HomeScreen(),
          ),
        ),
        GoRoute(
          path: '/create',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: CreateScreen(),
          ),
          routes: [
            GoRoute(
              path: 'image',
              builder: (context, state) => const ImageCreateScreen(),
              routes: [
                // Image tool sub-routes
                GoRoute(
                  path: 'relight',
                  builder: (context, state) => const RelightToolScreen(),
                ),
                GoRoute(
                  path: 'upscale',
                  builder: (context, state) => const UpscaleToolScreen(),
                ),
                GoRoute(
                  path: 'shots',
                  builder: (context, state) => const ShotsToolScreen(),
                ),
                GoRoute(
                  path: 'inpainting',
                  builder: (context, state) => const InpaintingToolScreen(),
                ),
                GoRoute(
                  path: 'object-erase',
                  builder: (context, state) => const ObjectEraseToolScreen(),
                ),
                GoRoute(
                  path: 'angle',
                  builder: (context, state) => const AngleToolScreen(),
                ),
                GoRoute(
                  path: 'skin-enhancer',
                  builder: (context, state) => const SkinEnhancerToolScreen(),
                ),
                GoRoute(
                  path: 'style-transfer',
                  builder: (context, state) => const StyleTransferToolScreen(),
                ),
                GoRoute(
                  path: 'background-remove',
                  builder: (context, state) => const BackgroundRemoveToolScreen(),
                ),
              ],
            ),
            GoRoute(
              path: 'video',
              builder: (context, state) => const VideoCreateScreen(),
              routes: [
                // Video tool sub-routes
                GoRoute(
                  path: 'video-upscale',
                  builder: (context, state) => const VideoUpscaleToolScreen(),
                ),
                GoRoute(
                  path: 'lip-sync',
                  builder: (context, state) => const LipSyncToolScreen(),
                ),
                GoRoute(
                  path: 'interpolate',
                  builder: (context, state) => const InterpolateToolScreen(),
                ),
                GoRoute(
                  path: 'extend',
                  builder: (context, state) => const ExtendVideoToolScreen(),
                ),
                GoRoute(
                  path: 'sketch-to-video',
                  builder: (context, state) => const SketchToVideoToolScreen(),
                ),
                GoRoute(
                  path: 'draw-to-video',
                  builder: (context, state) => const DrawToVideoToolScreen(),
                ),
                GoRoute(
                  path: 'mixed-media',
                  builder: (context, state) => const MixedMediaToolScreen(),
                ),
                GoRoute(
                  path: 'click-to-ad',
                  builder: (context, state) => const ClickToAdToolScreen(),
                ),
                GoRoute(
                  path: 'ugc-factory',
                  builder: (context, state) => const UGCFactoryToolScreen(),
                ),
                GoRoute(
                  path: 'sora-trends',
                  builder: (context, state) => const SoraTrendsToolScreen(),
                ),
              ],
            ),
            GoRoute(
              path: 'audio',
              builder: (context, state) => const AudioCreateScreen(),
              routes: [
                // Audio tool sub-routes
                GoRoute(
                  path: 'stems',
                  builder: (context, state) => const StemsToolScreen(),
                ),
                GoRoute(
                  path: 'remix',
                  builder: (context, state) => const RemixToolScreen(),
                ),
                GoRoute(
                  path: 'vocals',
                  builder: (context, state) => const VocalsToolScreen(),
                ),
                GoRoute(
                  path: 'mastering',
                  builder: (context, state) => const MasteringToolScreen(),
                ),
                GoRoute(
                  path: 'sound-effects',
                  builder: (context, state) => const SoundEffectsToolScreen(),
                ),
                GoRoute(
                  path: 'enhance',
                  builder: (context, state) => const AudioEnhanceToolScreen(),
                ),
                GoRoute(
                  path: 'tempo-pitch',
                  builder: (context, state) => const TempoPitchToolScreen(),
                ),
              ],
            ),
          ],
        ),
        GoRoute(
          path: '/chat',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: ChatScreen(),
          ),
        ),
        GoRoute(
          path: '/apps',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: AppsScreen(),
          ),
        ),
        GoRoute(
          path: '/cinema',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: CinemaStudioScreen(),
          ),
        ),
        GoRoute(
          path: '/library',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: LibraryScreen(),
          ),
        ),
        GoRoute(
          path: '/subscription',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: SubscriptionScreen(),
          ),
        ),
        GoRoute(
          path: '/pricing',
          builder: (context, state) => const PricingScreen(),
        ),
        // AI Apps routes
        GoRoute(
          path: '/skin-analyze',
          builder: (context, state) => const SkinAnalyzeScreen(),
        ),
        GoRoute(
          path: '/calorie',
          builder: (context, state) => const CalorieWrapperScreen(),
        ),
        GoRoute(
          path: '/calorie-onboarding',
          builder: (context, state) => const CalorieOnboardingScreen(),
        ),
        GoRoute(
          path: '/calorie-dashboard',
          builder: (context, state) => const CalorieDashboardScreen(),
        ),
        GoRoute(
          path: '/financial-ai',
          builder: (context, state) => const FinancialAIScreen(),
        ),
        GoRoute(
          path: '/fingerprint-ai',
          builder: (context, state) => const FingerprintAIScreen(),
        ),
        // New AI tool routes
        GoRoute(
          path: '/sleep-ai',
          builder: (context, state) => const SleepAIScreen(),
        ),
        GoRoute(
          path: '/brain-ai',
          builder: (context, state) => const BrainAIScreen(),
        ),
        GoRoute(
          path: '/notify-ai',
          builder: (context, state) => const NotifyAIScreen(),
        ),
        GoRoute(
          path: '/profile',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: ProfileScreen(),
          ),
        ),
        GoRoute(
          path: '/downloads',
          builder: (context, state) => const DownloadsScreen(),
        ),
      ],
    ),
  ],
);
