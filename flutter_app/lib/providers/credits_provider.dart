import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/config.dart';

class CreditsProvider extends ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;

  int _credits = 0;
  bool _hasActiveSubscription = false;
  bool _isLoading = true;

  int get credits => _credits;
  bool get hasActiveSubscription => _hasActiveSubscription;
  bool get isLoading => _isLoading;
  bool get isUnlimited => _hasActiveSubscription;

  CreditsProvider() {
    _fetchCredits();
  }

  Future<void> _fetchCredits() async {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      _isLoading = false;
      notifyListeners();
      return;
    }

    try {
      final response = await _supabase
          .from('profiles')
          .select('credits, subscription_status')
          .eq('user_id', user.id)
          .maybeSingle();

      if (response != null) {
        _credits = response['credits'] as int? ?? 0;
        _hasActiveSubscription = response['subscription_status'] == 'active';
      }
    } catch (e) {
      debugPrint('Error fetching credits: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    await _fetchCredits();
  }

  /// Check if user has enough credits for a specific model
  bool hasEnoughCreditsForModel(String model) {
    if (_hasActiveSubscription) return true;

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
    return AppConfig.modelCredits[model] ?? 5;
  }

  /// Deduct credits locally (server will also deduct)
  void deductCredits(int amount) {
    _credits = (_credits - amount).clamp(0, _credits);
    notifyListeners();
  }
}
