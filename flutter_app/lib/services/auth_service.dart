import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_model.dart';

class AuthService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // OAuth configuration
  static const String _redirectUrl = 'io.supabase.genaiapp://login-callback/';
  static const String _webCallbackUrl = 'https://ifesxveahsbjhmrhkhhy.supabase.co/auth/v1/callback';

  User? get currentUser => _supabase.auth.currentUser;
  Session? get currentSession => _supabase.auth.currentSession;
  bool get isLoggedIn => currentUser != null;

  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  Future<AuthResponse> signUp({
    required String email,
    required String password,
    String? displayName,
  }) async {
    final response = await _supabase.auth.signUp(
      email: email,
      password: password,
      data: displayName != null ? {'display_name': displayName} : null,
    );
    return response;
  }

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
    return response;
  }

  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

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

  /// Sign in with Google
  /// - iOS: Uses web-based OAuth flow
  /// - Android: Uses native Google Sign-In library (requires google_sign_in package)
  Future<bool> signInWithGoogle() async {
    try {
      if (Platform.isAndroid) {
        // Android: Use native Google Sign-In for better UX
        // This requires the google_sign_in package to be installed
        // and proper SHA-1 fingerprint configured in Firebase/Google Console
        return await _signInWithGoogleNative();
      } else {
        // iOS and other platforms: Use web-based OAuth
        return await _signInWithGoogleWeb();
      }
    } catch (e) {
      debugPrint('Google Sign-In error: $e');
      rethrow;
    }
  }

  /// Native Google Sign-In for Android
  Future<bool> _signInWithGoogleNative() async {
    try {
      // Dynamic import to avoid iOS build issues
      // The google_sign_in package must be added to pubspec.yaml:
      // google_sign_in: ^6.2.1
      
      // For now, fall back to web-based flow
      // When google_sign_in is properly configured, uncomment this:
      /*
      final GoogleSignIn googleSignIn = GoogleSignIn(
        serverClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      );
      
      final googleUser = await googleSignIn.signIn();
      if (googleUser == null) return false;
      
      final googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;
      final accessToken = googleAuth.accessToken;
      
      if (idToken == null) {
        throw Exception('No ID token found');
      }
      
      final response = await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.google,
        idToken: idToken,
        accessToken: accessToken,
      );
      
      return response.user != null;
      */
      
      // Fallback to web-based OAuth until native is configured
      return await _signInWithGoogleWeb();
    } catch (e) {
      debugPrint('Native Google Sign-In error: $e');
      // Fallback to web-based OAuth
      return await _signInWithGoogleWeb();
    }
  }

  /// Web-based Google Sign-In (works on all platforms)
  Future<bool> _signInWithGoogleWeb() async {
    final response = await _supabase.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: _redirectUrl,
      authScreenLaunchMode: LaunchMode.externalApplication,
    );
    return response;
  }

  /// Sign in with Apple
  /// - iOS: Uses native Sign In with Apple for best UX
  /// - Android: Uses web-based OAuth flow
  Future<bool> signInWithApple() async {
    try {
      if (Platform.isIOS) {
        // iOS: Use native Sign In with Apple
        return await _signInWithAppleNative();
      } else {
        // Android and other platforms: Use web-based OAuth
        return await _signInWithAppleWeb();
      }
    } catch (e) {
      debugPrint('Apple Sign-In error: $e');
      rethrow;
    }
  }

  /// Native Apple Sign-In for iOS
  Future<bool> _signInWithAppleNative() async {
    try {
      // Dynamic import to avoid Android build issues
      // The sign_in_with_apple package must be added to pubspec.yaml:
      // sign_in_with_apple: ^6.1.1
      
      // For now, fall back to web-based flow
      // When sign_in_with_apple is properly configured, uncomment this:
      /*
      final rawNonce = _generateNonce();
      final hashedNonce = _sha256ofString(rawNonce);
      
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: hashedNonce,
      );
      
      final idToken = credential.identityToken;
      if (idToken == null) {
        throw Exception('No ID token found');
      }
      
      final response = await _supabase.auth.signInWithIdToken(
        provider: OAuthProvider.apple,
        idToken: idToken,
        nonce: rawNonce,
      );
      
      // If this is a new user, sync the name from Apple
      if (response.user != null && credential.givenName != null) {
        final fullName = [credential.givenName, credential.familyName]
            .where((n) => n != null)
            .join(' ');
        
        if (fullName.isNotEmpty) {
          await _supabase.from('profiles').update({
            'display_name': fullName,
          }).eq('user_id', response.user!.id);
        }
      }
      
      return response.user != null;
      */
      
      // Fallback to web-based OAuth until native is configured
      return await _signInWithAppleWeb();
    } catch (e) {
      debugPrint('Native Apple Sign-In error: $e');
      // Fallback to web-based OAuth
      return await _signInWithAppleWeb();
    }
  }

  /// Web-based Apple Sign-In (works on all platforms)
  Future<bool> _signInWithAppleWeb() async {
    final response = await _supabase.auth.signInWithOAuth(
      OAuthProvider.apple,
      redirectTo: _redirectUrl,
      authScreenLaunchMode: LaunchMode.externalApplication,
    );
    return response;
  }

  /// Sign in with Facebook (web-based OAuth on all platforms)
  Future<bool> signInWithFacebook() async {
    try {
      final response = await _supabase.auth.signInWithOAuth(
        OAuthProvider.facebook,
        redirectTo: _redirectUrl,
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
      return response;
    } catch (e) {
      debugPrint('Facebook Sign-In error: $e');
      rethrow;
    }
  }

  Future<void> resetPassword(String email) async {
    await _supabase.auth.resetPasswordForEmail(email);
  }

  Future<UserProfile?> getProfile() async {
    final user = currentUser;
    if (user == null) return null;

    final response = await _supabase
        .from('profiles')
        .select()
        .eq('user_id', user.id)
        .maybeSingle();

    if (response == null) return null;
    return UserProfile.fromJson(response);
  }

  Future<void> updateProfile({
    String? displayName,
    String? avatarUrl,
  }) async {
    final user = currentUser;
    if (user == null) throw Exception('Not authenticated');

    final updates = <String, dynamic>{
      'updated_at': DateTime.now().toIso8601String(),
    };

    if (displayName != null) updates['display_name'] = displayName;
    if (avatarUrl != null) updates['avatar_url'] = avatarUrl;

    await _supabase.from('profiles').update(updates).eq('user_id', user.id);
  }
}
