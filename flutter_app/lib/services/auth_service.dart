import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_model.dart';

class AuthService {
  final SupabaseClient _supabase = Supabase.instance.client;

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

  Future<bool> signInWithGoogle() async {
    try {
      final response = await _supabase.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'io.supabase.genaiapp://login-callback/',
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
      return response;
    } catch (e) {
      rethrow;
    }
  }

  Future<bool> signInWithApple() async {
    try {
      final response = await _supabase.auth.signInWithOAuth(
        OAuthProvider.apple,
        redirectTo: 'io.supabase.genaiapp://login-callback/',
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
      return response;
    } catch (e) {
      rethrow;
    }
  }

  Future<bool> signInWithFacebook() async {
    try {
      final response = await _supabase.auth.signInWithOAuth(
        OAuthProvider.facebook,
        redirectTo: 'io.supabase.genaiapp://login-callback/',
        authScreenLaunchMode: LaunchMode.externalApplication,
      );
      return response;
    } catch (e) {
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
