import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;

import 'core/config.dart';
import 'core/theme.dart';
import 'core/routes.dart';
import 'core/firebase_options.dart';
import 'providers/auth_provider.dart';
import 'providers/credits_provider.dart';
import 'providers/generation_provider.dart';
import 'providers/iap_provider.dart';
import 'providers/download_provider.dart';
import 'providers/favorites_provider.dart';
import 'services/tiktok_service.dart';
import 'services/facebook_service.dart';
import 'services/audio_player_service.dart';
import 'services/push_notification_service.dart';

// Global navigator key for showing snackbars from anywhere
final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
    GlobalKey<ScaffoldMessengerState>();

/// Custom HTTP client with longer timeout for Supabase operations
class TimeoutHttpClient extends http.BaseClient {
  final http.Client _inner = http.Client();
  final Duration timeout;

  TimeoutHttpClient({this.timeout = const Duration(seconds: 60)});

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    return _inner.send(request).timeout(timeout);
  }

  @override
  void close() => _inner.close();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase with robust error handling
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    }
  } catch (e) {
    debugPrint('Firebase already initialized or error: $e');
  }

  // Set up background message handler before any other Firebase Messaging calls
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  // Initialize Supabase with custom HTTP client for longer timeouts
  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
    httpClient: TimeoutHttpClient(timeout: const Duration(seconds: 90)),
    authOptions: const FlutterAuthClientOptions(
      autoRefreshToken: true,
    ),
  );

  // Initialize analytics SDKs for attribution tracking
  await tiktokService.initialize();
  await facebookService.initialize();

  // Initialize push notifications
  await pushNotificationService.initialize();

  runApp(const TimelessAIApp());
}

class TimelessAIApp extends StatelessWidget {
  const TimelessAIApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CreditsProvider()),
        ChangeNotifierProvider(create: (_) => GenerationProvider()),
        ChangeNotifierProvider(create: (_) => IAPProvider()),
        ChangeNotifierProvider(create: (_) => DownloadProvider()),
        ChangeNotifierProvider(create: (_) => FavoritesProvider()),
        ChangeNotifierProvider(create: (_) => AudioPlayerService()),
      ],
      child: const _IAPWiredApp(),
    );
  }
}

/// Widget that wires IAP callbacks to credits provider
class _IAPWiredApp extends StatefulWidget {
  const _IAPWiredApp();

  @override
  State<_IAPWiredApp> createState() => _IAPWiredAppState();
}

class _IAPWiredAppState extends State<_IAPWiredApp> {
  @override
  void initState() {
    super.initState();
    // Wire IAP callbacks to refresh credits after purchase/restore
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _setupIAPCallbacks();
    });
  }

  void _setupIAPCallbacks() {
    final iapProvider = context.read<IAPProvider>();
    final creditsProvider = context.read<CreditsProvider>();

    // When purchase completes successfully, refresh credits
    iapProvider.onPurchaseComplete = () {
      debugPrint('[App] IAP purchase complete - refreshing credits');
      creditsProvider.refresh();

      // Show success toast using global key
      scaffoldMessengerKey.currentState?.showSnackBar(
        const SnackBar(
          content:
              Text('🎉 Purchase successful! Your account has been upgraded.'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 3),
        ),
      );
    };

    // When restore completes, refresh credits
    iapProvider.onRestoreComplete = () {
      debugPrint('[App] IAP restore complete - refreshing credits');
      creditsProvider.refresh();

      scaffoldMessengerKey.currentState?.showSnackBar(
        const SnackBar(
          content: Text('✅ Purchases restored successfully!'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 3),
        ),
      );
    };
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      scaffoldMessengerKey: scaffoldMessengerKey,
      title: 'Timeless AI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      routerConfig: appRouter,
    );
  }
}
