import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;

/// Firebase-based authentication service for Google and Facebook OAuth
///
/// This service uses Firebase Authentication as an intermediary to get
/// valid ID tokens, which are then validated by our mobile-auth edge function
/// to create Supabase sessions.
class FirebaseAuthService {
  final SupabaseClient _supabase = Supabase.instance.client;
  final firebase_auth.FirebaseAuth _firebaseAuth =
      firebase_auth.FirebaseAuth.instance;

  // Mobile auth edge function URL (external Supabase project)
  static const String _mobileAuthUrl =
      'https://ifesxveahsbjhmrhkhhy.supabase.co/functions/v1/mobile-auth';

  /// Sign in with Google using Firebase
  ///
  /// Flow:
  /// 1. User signs in with Google (native on Android, web on iOS)
  /// 2. Google credential is exchanged for Firebase ID token
  /// 3. Firebase ID token is sent to mobile-auth edge function
  /// 4. Edge function validates token and returns Supabase session
  // iOS Client ID from Google Cloud Console (for iOS Google Sign-In)
  static const String _iosClientId =
      '1012149210327-63jr6shcfn9pefhn1dmstgm58nqedr0i.apps.googleusercontent.com';

  // Web Client ID from Firebase Console - required for Android to get ID token
  static const String _webClientId =
      '1012149210327-7dg02kf3k08bu0ksp41rhsntl5lpl4no.apps.googleusercontent.com';

  Future<AuthResponse?> signInWithGoogle() async {
    try {
      debugPrint('Starting Firebase Google Sign-In...');

      // Trigger the Google Sign-In flow
      // iOS requires the iOS Client ID, Android requires serverClientId to get ID token
      final GoogleSignIn googleSignIn = GoogleSignIn(
        clientId: Platform.isIOS ? _iosClientId : null,
        serverClientId: Platform.isAndroid ? _webClientId : null,
        scopes: ['email', 'profile'],
      );

      final googleUser = await googleSignIn.signIn();
      if (googleUser == null) {
        debugPrint('Google Sign-In cancelled by user');
        return null;
      }

      // Obtain the auth details from the request
      final googleAuth = await googleUser.authentication;

      if (googleAuth.idToken == null) {
        throw Exception('Failed to get Google ID token');
      }

      // Create a Firebase credential
      final credential = firebase_auth.GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the credential
      final userCredential =
          await _firebaseAuth.signInWithCredential(credential);

      if (userCredential.user == null) {
        throw Exception('Firebase sign-in failed');
      }

      // Get Firebase ID token
      final firebaseIdToken = await userCredential.user!.getIdToken();

      if (firebaseIdToken == null) {
        throw Exception('Failed to get Firebase ID token');
      }

      debugPrint('Firebase Google Sign-In successful, calling mobile-auth...');

      // Use mobile-auth edge function with Firebase token
      return await _authenticateWithMobileAuth(
        provider: 'google',
        idToken: firebaseIdToken,
        source: 'firebase',
        name: googleUser.displayName,
        avatarUrl: googleUser.photoUrl,
      );
    } catch (e) {
      debugPrint('Firebase Google Sign-In error: $e');
      rethrow;
    }
  }

  /// Sign in with Facebook using Firebase
  ///
  /// Flow:
  /// 1. User signs in with Facebook via Firebase Auth
  /// 2. Facebook credential is exchanged for Firebase ID token
  /// 3. Firebase ID token is sent to mobile-auth edge function
  /// 4. Edge function validates token and returns Supabase session
  Future<AuthResponse?> signInWithFacebook() async {
    try {
      debugPrint('Starting Firebase Facebook Sign-In...');

      // Create a Facebook auth provider
      final facebookProvider = firebase_auth.FacebookAuthProvider();
      facebookProvider.addScope('email');
      facebookProvider.addScope('public_profile');

      firebase_auth.UserCredential userCredential;

      if (Platform.isAndroid || Platform.isIOS) {
        // Mobile: Use popup-based sign in
        userCredential =
            await _firebaseAuth.signInWithProvider(facebookProvider);
      } else {
        // Web/other: Use redirect
        userCredential = await _firebaseAuth.signInWithPopup(facebookProvider);
      }

      if (userCredential.user == null) {
        throw Exception('Firebase Facebook sign-in failed');
      }

      // Get Firebase ID token
      final firebaseIdToken = await userCredential.user!.getIdToken();

      if (firebaseIdToken == null) {
        throw Exception('Failed to get Firebase ID token');
      }

      debugPrint(
          'Firebase Facebook Sign-In successful, calling mobile-auth...');

      // Extract user info
      final displayName = userCredential.user!.displayName;
      final photoUrl = userCredential.user!.photoURL;

      // Use mobile-auth edge function with Firebase token
      return await _authenticateWithMobileAuth(
        provider: 'facebook',
        idToken: firebaseIdToken,
        source: 'firebase',
        name: displayName,
        avatarUrl: photoUrl,
      );
    } catch (e) {
      debugPrint('Firebase Facebook Sign-In error: $e');
      rethrow;
    }
  }

  /// Call the mobile-auth edge function to authenticate with Firebase ID token
  Future<AuthResponse?> _authenticateWithMobileAuth({
    required String provider,
    required String idToken,
    required String source,
    String? name,
    String? avatarUrl,
  }) async {
    try {
      debugPrint(
          'Calling mobile-auth edge function for $provider (source: $source)...');

      final response = await http.post(
        Uri.parse(_mobileAuthUrl),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'provider': provider,
          'idToken': idToken,
          'source': source,
          if (name != null) 'name': name,
          if (avatarUrl != null) 'avatarUrl': avatarUrl,
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

  /// Sign out from Firebase (call this alongside Supabase sign out)
  Future<void> signOut() async {
    try {
      await _firebaseAuth.signOut();

      // Also sign out from Google to allow account selection on next sign-in
      final googleSignIn = GoogleSignIn();
      if (await googleSignIn.isSignedIn()) {
        await googleSignIn.signOut();
      }
    } catch (e) {
      debugPrint('Firebase sign out error: $e');
    }
  }

  /// Check if Firebase is properly initialized
  bool get isInitialized {
    try {
      _firebaseAuth.app;
      return true;
    } catch (e) {
      return false;
    }
  }
}
