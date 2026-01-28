import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Native authentication service for platform-specific OAuth flows
/// 
/// This service handles:
/// - Native Google Sign-In on Android (using google_sign_in package)
/// - Native Apple Sign-In on iOS (using sign_in_with_apple package)
/// - Web-based fallback for other platforms
class NativeAuthService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // OAuth configuration
  static const String _redirectUrl = 'io.supabase.genaiapp://login-callback/';
  
  // Google Web Client ID (required for Android native sign-in)
  // This should match the Web Client ID from Google Cloud Console
  // The Android Client ID is automatically used based on SHA-1 fingerprint
  static const String _googleWebClientId = 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com';

  /// Generate a secure random nonce for OAuth
  String _generateNonce([int length = 32]) {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    final random = Random.secure();
    return List.generate(length, (_) => charset[random.nextInt(charset.length)]).join();
  }

  /// Generate SHA256 hash of the nonce
  String _sha256ofString(String input) {
    final bytes = utf8.encode(input);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Native Google Sign-In for Android
  /// 
  /// Requirements:
  /// 1. Add google_sign_in: ^6.2.1 to pubspec.yaml
  /// 2. Configure SHA-1 fingerprint in Google Cloud Console
  /// 3. Add Web Client ID to _googleWebClientId constant
  /// 4. Enable Google provider in Supabase Auth settings
  Future<AuthResponse?> signInWithGoogleNative() async {
    if (!Platform.isAndroid) {
      throw UnsupportedError('Native Google Sign-In is only supported on Android');
    }

    try {
      final GoogleSignIn googleSignIn = GoogleSignIn(
        serverClientId: _googleWebClientId,
        scopes: ['email', 'profile'],
      );

      final googleUser = await googleSignIn.signIn();
      if (googleUser == null) {
        debugPrint('Google Sign-In cancelled by user');
        return null;
      }

      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;
      final accessToken = googleAuth.accessToken;

      if (idToken == null) {
        throw Exception('Failed to get ID token from Google');
      }

      debugPrint('Google Sign-In successful, exchanging tokens with Supabase...');

      final response = await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.google,
        idToken: idToken,
        accessToken: accessToken,
      );

      debugPrint('Supabase auth successful: ${response.user?.id}');
      return response;
    } catch (e) {
      debugPrint('Native Google Sign-In error: $e');
      rethrow;
    }
  }

  /// Native Apple Sign-In for iOS
  /// 
  /// Requirements:
  /// 1. Add sign_in_with_apple: ^6.1.1 to pubspec.yaml
  /// 2. Enable Sign In with Apple capability in Xcode
  /// 3. Configure Runner.entitlements with com.apple.developer.applesignin
  /// 4. Configure Apple provider in Supabase Auth settings
  Future<AuthResponse?> signInWithAppleNative() async {
    if (!Platform.isIOS) {
      throw UnsupportedError('Native Apple Sign-In is only supported on iOS');
    }

    try {
      // Generate nonce for security
      final rawNonce = _generateNonce();
      final hashedNonce = _sha256ofString(rawNonce);

      debugPrint('Starting native Apple Sign-In...');

      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: hashedNonce,
      );

      final idToken = credential.identityToken;
      if (idToken == null) {
        throw Exception('Failed to get ID token from Apple');
      }

      debugPrint('Apple Sign-In successful, exchanging tokens with Supabase...');

      final response = await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.apple,
        idToken: idToken,
        nonce: rawNonce,
      );

      debugPrint('Supabase auth successful: ${response.user?.id}');

      // Sync Apple-provided name to profile (only available on first sign-in)
      if (response.user != null && credential.givenName != null) {
        await _syncAppleUserName(
          userId: response.user!.id,
          givenName: credential.givenName,
          familyName: credential.familyName,
        );
      }

      return response;
    } catch (e) {
      debugPrint('Native Apple Sign-In error: $e');
      rethrow;
    }
  }

  /// Sync Apple-provided name to user profile
  Future<void> _syncAppleUserName({
    required String userId,
    String? givenName,
    String? familyName,
  }) async {
    try {
      final fullName = [givenName, familyName]
          .where((n) => n != null && n.isNotEmpty)
          .join(' ');

      if (fullName.isNotEmpty) {
        await _supabase.from('profiles').update({
          'display_name': fullName,
          'updated_at': DateTime.now().toIso8601String(),
        }).eq('user_id', userId);

        debugPrint('Synced Apple user name: $fullName');
      }
    } catch (e) {
      // Non-critical error, just log it
      debugPrint('Failed to sync Apple user name: $e');
    }
  }

  /// Web-based OAuth fallback (works on all platforms)
  Future<bool> signInWithOAuthWeb(OAuthProvider provider) async {
    try {
      final response = await _supabase.auth.signInWithOAuth(
        provider,
        redirectTo: _redirectUrl,
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
      return response;
    } catch (e) {
      debugPrint('Web OAuth error for $provider: $e');
      rethrow;
    }
  }

  /// Check if native Google Sign-In is available
  bool get isNativeGoogleAvailable => Platform.isAndroid;

  /// Check if native Apple Sign-In is available
  bool get isNativeAppleAvailable => Platform.isIOS;
}
