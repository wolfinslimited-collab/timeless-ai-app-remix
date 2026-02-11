import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/config.dart';
import '../core/image_models.dart';
import '../core/video_models.dart';

class CreditsProvider extends ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;
  StreamSubscription<AuthState>? _authSubscription;

  int _credits = 0;
  bool _hasActiveSubscription = false;
  String? _currentPlan; // The user's current plan name (e.g., "Basic", "Premium", "Pro")
  bool _isLoading = true;

  int get credits => _credits;
  bool get hasActiveSubscription => _hasActiveSubscription;
  String? get currentPlan => _currentPlan;
  bool get isLoading => _isLoading;
  bool get isUnlimited => _hasActiveSubscription;
 
   /// Check if user has Premium Plus access
   bool get hasPremiumPlusAccess => 
       _hasActiveSubscription && (_currentPlan?.startsWith('premium-plus') ?? false);

  CreditsProvider() {
    _init();
  }

  void _init() {
    // Listen to auth state changes to reset/refresh credits
    _authSubscription = _supabase.auth.onAuthStateChange.listen((state) {
      if (state.session?.user != null) {
        // User logged in - fetch their credits
        _fetchCredits();
      } else {
        // User logged out - clear credits
        _clearCredits();
      }
    });

    // Initial fetch
    _fetchCredits();
  }

  void _clearCredits() {
    _credits = 0;
    _hasActiveSubscription = false;
    _currentPlan = null;
    _isLoading = false;
    notifyListeners();
  }

  Future<void> _fetchCredits() async {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      _clearCredits();
      return;
    }

    _isLoading = true;
    notifyListeners();

    try {
      final response = await _supabase
          .from('profiles')
          .select('credits, subscription_status, plan')
          .eq('user_id', user.id)
          .maybeSingle();

      if (response != null) {
        _credits = response['credits'] as int? ?? 0;
        _hasActiveSubscription = response['subscription_status'] == 'active';
        _currentPlan = response['plan'] as String?;
      } else {
        _credits = 0;
        _hasActiveSubscription = false;
        _currentPlan = null;
      }
    } catch (e) {
      debugPrint('Error fetching credits: $e');
      _credits = 0;
      _hasActiveSubscription = false;
      _currentPlan = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  Future<void> refresh() async {
    await _fetchCredits();
  }

  /// Check if user has enough credits for a specific model
  bool hasEnoughCreditsForModel(String model) {
    if (_hasActiveSubscription) return true;

    // Check image models first
    final imageCost = ImageModels.credits[model];
    if (imageCost != null) {
      return _credits >= imageCost;
    }

    // Check video models
    final videoCost = VideoModels.credits[model];
    if (videoCost != null) {
      return _credits >= videoCost;
    }

    final cost = AppConfig.modelCredits[model] ?? 5;
    return _credits >= cost;
  }

  /// Check if user has enough credits for a type
  bool hasEnoughCredits(String type) {
    if (_hasActiveSubscription) return true;

    final defaultCost = type == 'video' ? 15 : 5;
    return _credits >= defaultCost;
  }

  /// Get cost for a specific model
  int getModelCost(String model) {
    // Check image models first
    final imageCost = ImageModels.credits[model];
    if (imageCost != null) {
      return imageCost;
    }
    // Check video models
    final videoCost = VideoModels.credits[model];
    if (videoCost != null) {
      return videoCost;
    }
    return AppConfig.modelCredits[model] ?? 5;
  }

  /// Deduct credits locally (server will also deduct)
  void deductCredits(int amount) {
    _credits = (_credits - amount).clamp(0, _credits);
    notifyListeners();
  }
}
