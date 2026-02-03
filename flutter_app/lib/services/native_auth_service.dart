import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;

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

  // Mobile auth edge function URL (external Supabase project)
  static const String _mobileAuthUrl =
      'https://ifesxveahsbjhmrhkhhy.supabase.co/functions/v1/mobile-auth';

  // Google Web Client ID (required for Android native sign-in)
  // This should match the Web Client ID from Google Cloud Console
  // The Android Client ID is automatically used based on SHA-1 fingerprint
  static const String _googleWebClientId =
      '1012149210327-7dgq6ib94d4btrvi1tntm5jhmj4l69cb.apps.googleusercontent.com';

  /// Generate a secure random nonce for OAuth
  String _generateNonce([int length = 32]) {
    const charset =
        '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    final random = Random.secure();
    return List.generate(length, (_) => charset[random.nextInt(charset.length)])
        .join();
  }

  /// Generate SHA256 hash of the nonce
  String _sha256ofString(String input) {
    final bytes = utf8.encode(input);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }

  /// Call the mobile-auth edge function to authenticate with ID token
  Future<AuthResponse?> _authenticateWithMobileAuth({
    required String provider,
    required String idToken,
    String? nonce,
    String? name,
  }) async {
    try {
      debugPrint('Calling mobile-auth edge function for $provider...');

      final response = await http.post(
        Uri.parse(_mobileAuthUrl),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'provider': provider,
          'idToken': idToken,
          if (nonce != null) 'nonce': nonce,
          if (name != null) 'name': name,
        }),
      );

      final responseData = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode != 200 || responseData['success'] != true) {
        final error = responseData['error'] ?? 'Authentication failed';
        throw Exception(error);
      }

      debugPrint('Mobile auth successful: ${responseData['user']?['id']}');

      // Extract session data from response
      final sessionData = responseData['session'] as Map<String, dynamic>;
      // ignore: unused_local_variable
      final userData = responseData['user'] as Map<String, dynamic>;

      final accessToken = sessionData['access_token'] as String;
      final refreshToken = sessionData['refresh_token'] as String;

      // Set the session in Supabase client using the refresh token
      // The setSession method requires the refresh_token to establish a valid session
      final session = await _supabase.auth.setSession(refreshToken);

      if (session.session == null) {
        throw Exception('Failed to set session with refresh token');
      }

      // Return the current session
      final currentSession = _supabase.auth.currentSession;
      final currentUser = _supabase.auth.currentUser;

      if (currentUser == null || currentSession == null) {
        throw Exception('Failed to establish session after authentication');
      }

      return AuthResponse(
        session: currentSession,
        user: currentUser,
      );
    } catch (e) {
      debugPrint('Mobile auth error: $e');
      rethrow;
    }
  }

  /// Native Google Sign-In for iOS.
  /// Bypasses Firebase and sends the Google ID token to mobile-auth (same pattern as Apple).
  /// Avoids Firebase 403 on iOS when Firebase project / OAuth client mismatch.
  Future<AuthResponse?> signInWithGoogleNativeIOS() async {
    if (!Platform.isIOS) {
      throw UnsupportedError(
          'signInWithGoogleNativeIOS is only supported on iOS');
    }

    try {
      // On iOS, GoogleSignIn uses the client from Info.plist / GoogleService-Info.plist
      final GoogleSignIn googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
      );

      final googleUser = await googleSignIn.signIn();
      if (googleUser == null) {
        debugPrint('Google Sign-In cancelled by user');
        return null;
      }

      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;

      if (idToken == null) {
        throw Exception('Failed to get ID token from Google');
      }

      debugPrint(
          'Google Sign-In successful (iOS native), calling mobile-auth...');

      return await _authenticateWithMobileAuth(
        provider: 'google',
        idToken: idToken,
        name: googleUser.displayName,
      );
    } catch (e) {
      debugPrint('Native Google Sign-In (iOS) error: $e');
      rethrow;
    }
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
      throw UnsupportedError(
          'Native Google Sign-In is only supported on Android');
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

      if (idToken == null) {
        throw Exception('Failed to get ID token from Google');
      }

      debugPrint('Google Sign-In successful, calling mobile-auth...');

      // Use mobile-auth edge function for authentication
      return await _authenticateWithMobileAuth(
        provider: 'google',
        idToken: idToken,
        name: googleUser.displayName,
      );
    } catch (e) {
      debugPrint('Native Google Sign-In error: $e');
      rethrow;
    }
  }

  /// Apple Sign-In using sign_in_with_apple package
  /// 
  /// Works on both iOS (native) and Android (web-based flow)
  /// Both platforms send the ID token to mobile-auth edge function
  ///
  /// Requirements:
  /// - iOS: Enable Sign In with Apple capability in Xcode, configure Runner.entitlements
  /// - Android: Configure redirect URI in Apple Developer Console
  Future<AuthResponse?> signInWithAppleNative() async {
    try {
      // Generate nonce for security
      final rawNonce = _generateNonce();
      final hashedNonce = _sha256ofString(rawNonce);

      debugPrint('Starting Apple Sign-In on ${Platform.isIOS ? "iOS" : "Android"}...');

      AuthorizationCredentialAppleID credential;

      if (Platform.isIOS) {
        // iOS: Native Apple Sign-In
        credential = await SignInWithApple.getAppleIDCredential(
          scopes: [
            AppleIDAuthorizationScopes.email,
            AppleIDAuthorizationScopes.fullName,
          ],
          nonce: hashedNonce,
        );
      } else if (Platform.isAndroid) {
        // Android: Web-based Apple Sign-In
        // Requires configuring the redirect URI in Apple Developer Console
        credential = await SignInWithApple.getAppleIDCredential(
          scopes: [
            AppleIDAuthorizationScopes.email,
            AppleIDAuthorizationScopes.fullName,
          ],
          nonce: hashedNonce,
          webAuthenticationOptions: WebAuthenticationOptions(
            clientId: 'com.timelessai.app.signin', // Apple Services ID
            redirectUri: Uri.parse(
              'https://ifesxveahsbjhmrhkhhy.supabase.co/auth/v1/callback',
            ),
          ),
        );
      } else {
        throw UnsupportedError('Apple Sign-In is only supported on iOS and Android');
      }

      final idToken = credential.identityToken;
      if (idToken == null) {
        throw Exception('Failed to get ID token from Apple');
      }

      // Get name from Apple (only available on first sign-in)
      String? fullName;
      if (credential.givenName != null || credential.familyName != null) {
        fullName = [credential.givenName, credential.familyName]
            .where((n) => n != null && n.isNotEmpty)
            .join(' ');
      }

      debugPrint('Apple Sign-In successful, calling mobile-auth...');

      // Use mobile-auth edge function for authentication
      return await _authenticateWithMobileAuth(
        provider: 'apple',
        idToken: idToken,
        nonce: rawNonce,
        name: fullName,
      );
    } catch (e) {
      debugPrint('Apple Sign-In error: $e');
      rethrow;
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

  /// Check if Apple Sign-In is available (now works on both iOS and Android)
  bool get isNativeAppleAvailable => Platform.isIOS || Platform.isAndroid;
}
