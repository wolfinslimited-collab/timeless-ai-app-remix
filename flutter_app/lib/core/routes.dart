import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/create/create_screen.dart';
import '../screens/create/image_create_screen.dart';
import '../screens/create/video_create_screen.dart';
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
import '../widgets/common/main_scaffold.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/',
  redirect: (context, state) {
    final session = Supabase.instance.client.auth.currentSession;
    final isLoggedIn = session != null;
    final isAuthRoute =
        state.matchedLocation == '/login' || state.matchedLocation == '/signup';

    if (!isLoggedIn && !isAuthRoute) {
      return '/login';
    }

    if (isLoggedIn && isAuthRoute) {
      return '/';
    }

    return null;
  },
  routes: [
    // Auth routes (no bottom nav)
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/signup',
      builder: (context, state) => const SignupScreen(),
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
            ),
            GoRoute(
              path: 'video',
              builder: (context, state) => const VideoCreateScreen(),
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
      ],
    ),
  ],
);
