import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Firebase configuration options for different platforms
/// 
/// These values should be obtained from your Firebase project:
/// 1. Go to Firebase Console > Project Settings
/// 2. Add your iOS and Android apps if not already added
/// 3. Download google-services.json (Android) and GoogleService-Info.plist (iOS)
/// 4. Replace the placeholder values below with your actual Firebase config
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      throw UnsupportedError(
        'Web platform is not configured for Firebase in this app.',
      );
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        throw UnsupportedError(
          'macOS is not configured for Firebase in this app.',
        );
      case TargetPlatform.windows:
        throw UnsupportedError(
          'Windows is not configured for Firebase in this app.',
        );
      case TargetPlatform.linux:
        throw UnsupportedError(
          'Linux is not configured for Firebase in this app.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  /// Android Firebase configuration
  /// 
  /// Replace these values with your Firebase project configuration from:
  /// - Firebase Console > Project Settings > Your Apps > Android
  /// - Or from google-services.json
  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'YOUR_ANDROID_API_KEY',
    appId: '1:YOUR_PROJECT_NUMBER:android:YOUR_APP_ID',
    messagingSenderId: 'YOUR_PROJECT_NUMBER',
    projectId: 'timeless-983d7',
    storageBucket: 'timeless-983d7.firebasestorage.app',
  );

  /// iOS Firebase configuration
  /// 
  /// Replace these values with your Firebase project configuration from:
  /// - Firebase Console > Project Settings > Your Apps > iOS
  /// - Or from GoogleService-Info.plist
  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'YOUR_IOS_API_KEY',
    appId: '1:YOUR_PROJECT_NUMBER:ios:YOUR_APP_ID',
    messagingSenderId: 'YOUR_PROJECT_NUMBER',
    projectId: 'timeless-983d7',
    storageBucket: 'timeless-983d7.firebasestorage.app',
    iosBundleId: 'com.health.timelessApp',
  );
}
