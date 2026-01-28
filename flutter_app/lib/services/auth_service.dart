import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:http/http.dart' as http;
import '../models/user_model.dart';

class AuthService {
  final SupabaseClient _supabase = Supabase.instance.client;

  // OAuth configuration
  static const String _redirectUrl = 'io.supabase.genaiapp://login-callback/';
  static const String _webCallbackUrl = 'https://ifesxveahsbjhmrhkhhy.supabase.co/auth/v1/callback';
  
  // Mobile auth edge function URL (handles native token validation)
  static const String _mobileAuthUrl = 'https://ifesxveahsbjhmrhkhhy.supabase.co/functions/v1/mobile-auth';

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

  /// Native Apple Sign-In for iOS using mobile-auth edge function
  Future<bool> _signInWithAppleNative() async {
    try {
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
        throw Exception('No ID token found from Apple');
      }
      
      // Get name from Apple (only available on first sign-in)
      String? fullName;
      if (credential.givenName != null || credential.familyName != null) {
        fullName = [credential.givenName, credential.familyName]
            .where((n) => n != null && n.isNotEmpty)
            .join(' ');
      }
      
      debugPrint('Apple credential obtained, calling mobile-auth edge function...');
      
      // Use mobile-auth edge function to handle token validation
      // This bypasses Supabase's audience check which expects Services ID
      final authResponse = await _authenticateWithMobileAuth(
        provider: 'apple',
        idToken: idToken,
        nonce: rawNonce,
        name: fullName,
      );
      
      return authResponse;
    } catch (e) {
      debugPrint('Native Apple Sign-In error: $e');
      rethrow;
    }
  }
  
  /// Authenticate using the mobile-auth edge function
  /// This handles native ID token validation for Apple/Google sign-in
  Future<bool> _authenticateWithMobileAuth({
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
        throw Exception('Mobile auth error: $error');
      }

      debugPrint('Mobile auth successful: ${responseData['user']?['id']}');

      // Extract session data from response
      final sessionData = responseData['session'] as Map<String, dynamic>;

      // Set the session in Supabase client
      await _supabase.auth.setSession(sessionData['access_token'] as String);

      // Verify session was established
      final currentUser = _supabase.auth.currentUser;
      if (currentUser == null) {
        throw Exception('Failed to establish session after authentication');
      }

      return true;
    } catch (e) {
      debugPrint('Mobile auth error: $e');
      rethrow;
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
