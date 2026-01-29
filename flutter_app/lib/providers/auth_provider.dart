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
      // Use Firebase Auth service for Google sign-in
      final response = await _firebaseAuthService.signInWithGoogle();
      
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
          await _trackOAuthSignIn(response.user!, 'apple');
          return true;
        }
        return false;
      } else {
        // Android/Other: Use web-based OAuth
        final success = await _nativeAuthService.signInWithOAuthWeb(OAuthProvider.apple);
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

  /// Sign in with Facebook using Firebase
  Future<bool> signInWithFacebook() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Use Firebase Auth service for Facebook sign-in
      final response = await _firebaseAuthService.signInWithFacebook();
      
      if (response?.user != null) {
        _user = response!.user;
        await _fetchProfile();
        await _trackOAuthSignIn(response.user!, 'facebook');
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

  /// Parse authentication errors into user-friendly messages
  String _parseAuthError(dynamic error) {
    final errorStr = error.toString().toLowerCase();
    
    if (errorStr.contains('invalid login credentials')) {
      return 'Invalid email or password';
    } else if (errorStr.contains('email not confirmed')) {
      return 'Please verify your email address';
    } else if (errorStr.contains('user already registered')) {
      return 'An account with this email already exists';
    } else if (errorStr.contains('cancelled') || errorStr.contains('canceled')) {
      return 'Sign-in was cancelled';
    } else if (errorStr.contains('network')) {
      return 'Network error. Please check your connection';
    } else if (errorStr.contains('popup_closed')) {
      return 'Sign-in popup was closed';
    }
    
    return 'An error occurred. Please try again';
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
