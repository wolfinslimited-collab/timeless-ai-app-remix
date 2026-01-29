import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

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

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
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
      child: MaterialApp.router(
        title: 'Timeless AI',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        routerConfig: appRouter,
      ),
    );
  }
}
