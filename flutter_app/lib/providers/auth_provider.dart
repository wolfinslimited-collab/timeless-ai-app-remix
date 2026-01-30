import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/native_auth_service.dart';
import '../services/firebase_auth_service.dart';
import '../services/push_notification_service.dart';
import '../services/tiktok_service.dart';
import '../services/facebook_service.dart';

class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  final NativeAuthService _nativeAuthService = NativeAuthService();
  final FirebaseAuthService _firebaseAuthService = FirebaseAuthService();

  User? _user;
  UserProfile? _profile;
  bool _isLoading = true;
  String? _error;

  StreamSubscription<AuthState>? _authSubscription;

  User? get user => _user;
  UserProfile? get profile => _profile;
  bool get isLoading => _isLoading;
  bool get isLoggedIn => _user != null;
  String? get error => _error;
  int get credits => _profile?.credits ?? 0;
  bool get hasActiveSubscription => _profile?.hasActiveSubscription ?? false;

  AuthProvider() {
    _init();
  }

  void _init() {
    // Listen to auth state changes
    _authSubscription = _authService.authStateChanges.listen((state) {
      _user = state.session?.user;

      if (_user != null) {
        // Defer profile fetch to avoid deadlock
        Future.microtask(() async {
          await _fetchProfile();
          // Refresh FCM token when user logs in
          await pushNotificationService.refreshToken();
        });
      } else {
        _profile = null;
        _isLoading = false;
        notifyListeners();
      }
    });

    // Check current session
    _user = _authService.currentUser;
    if (_user != null) {
      _fetchProfile();
    } else {
      _isLoading = false;
    }
  }

  Future<void> _fetchProfile() async {
    try {
      _profile = await _authService.getProfile();
    } catch (e) {
      debugPrint('Error fetching profile: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> signUp({
    required String email,
    required String password,
    String? displayName,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.signUp(
        email: email,
        password: password,
        displayName: displayName,
      );

      if (response.user != null) {
        _user = response.user;
        await _fetchProfile();

        // Track registration events for attribution
        await tiktokService.trackRegister(
          userId: response.user!.id,
          method: 'email',
        );
        await facebookService.trackRegister(
          userId: response.user!.id,
          method: 'email',
        );

        // Identify user for attribution
        await tiktokService.identify(
          externalId: response.user!.id,
          email: email,
        );
        await facebookService.setUserId(response.user!.id);
        await facebookService.setUserData(email: email);

        return true;
      }

      return false;
    } catch (e) {
      _error = _parseAuthError(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> signIn({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _authService.signIn(
        email: email,
        password: password,
      );

      if (response.user != null) {
        _user = response.user;
        await _fetchProfile();
        return true;
      }

      return false;
    } catch (e) {
      _error = _parseAuthError(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> signOut() async {
    // Delete FCM token before signing out
    await pushNotificationService.deleteToken();
    await _authService.signOut();
    // Sign out from Firebase as well
    await _firebaseAuthService.signOut();
    // Clear user identification on logout
    await tiktokService.logout();
    await facebookService.logout();
    _user = null;
    _profile = null;
    notifyListeners();
  }

  /// Sign in with Google
  /// Uses Firebase-based authentication for both Android and iOS
  Future<bool> signInWithGoogle() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // iOS: Use native Google Sign-In (bypass Firebase to avoid 403 / OAuth client mismatch).
      // Android: Use Firebase Auth for Google sign-in.
      final AuthResponse? response = Platform.isIOS
          ? await _nativeAuthService.signInWithGoogleNativeIOS()
          : await _firebaseAuthService.signInWithGoogle();

      if (response?.user != null) {
        _user = response!.user;
        await _fetchProfile();
        await _trackOAuthSignIn(response.user!, 'google');
        return true;
      }

      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = _parseAuthError(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Sign in with Apple
  /// Uses native Sign In with Apple on iOS, web-based OAuth on Android
  Future<bool> signInWithApple() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (Platform.isIOS && _nativeAuthService.isNativeAppleAvailable) {
        // iOS: Use native Sign In with Apple
        final response = await _nativeAuthService.signInWithAppleNative();
        if (response?.user != null) {
          _user = response!.user;
          await _fetchProfile();
          _trackOAuthSignIn(response.user!, 'apple');
          return true;
        }
        return false;
      } else {
        // Android/Other: Use web-based OAuth
        final success =
            await _nativeAuthService.signInWithOAuthWeb(OAuthProvider.apple);
        _isLoading = false;
        notifyListeners();
        return success;
      }
    } catch (e) {
      _error = _parseAuthError(e);
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Track OAuth sign-in for attribution
  Future<void> _trackOAuthSignIn(User user, String method) async {
    try {
      await tiktokService.trackRegister(userId: user.id, method: method);
      await facebookService.trackRegister(userId: user.id, method: method);
      await tiktokService.identify(externalId: user.id, email: user.email);
      await facebookService.setUserId(user.id);
      if (user.email != null) {
        await facebookService.setUserData(email: user.email!);
      }
    } catch (e) {
      debugPrint('Error tracking OAuth sign-in: $e');
    }
  }

  /// Parse authentication errors: extract error string first, then map known patterns.
  /// If no mapping matches, the actual error string is returned so backend messages are shown.
  String _parseAuthError(dynamic error) {
    // 1. Extract the actual error string (prefer .message from AuthException/Exception)
    String? rawMessage;
    if (error is AuthException) {
      rawMessage = error.message;
    } else if (error is Exception) {
      final s = error.toString();
      rawMessage =
          s.startsWith('Exception: ') ? s.substring(11).trim() : s.trim();
    } else {
      rawMessage = error.toString().trim();
    }
    if (rawMessage.isEmpty) {
      return 'An error occurred. Please try again';
    }
    final lower = rawMessage.toLowerCase();

    // 2. Map known patterns to user-friendly messages
    if (lower.contains('invalid login credentials')) {
      return 'Invalid email or password';
    }
    if (lower.contains('email not confirmed')) {
      return 'Please verify your email address';
    }
    if (lower.contains('user already registered') ||
        lower.contains('already been registered')) {
      return 'An account with this email already exists';
    }
    if (lower.contains('cancelled') || lower.contains('canceled')) {
      return 'Sign-in was cancelled';
    }
    if (lower.contains('network')) {
      return 'Network error. Please check your connection';
    }
    if (lower.contains('popup_closed')) {
      return 'Sign-in popup was closed';
    }

    // 3. No mapping: return the actual error string so the user sees the real message
    return rawMessage;
  }

  Future<void> resetPassword(String email) async {
    await _authService.resetPassword(email);
  }

  Future<void> refreshProfile() async {
    await _fetchProfile();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }
}
