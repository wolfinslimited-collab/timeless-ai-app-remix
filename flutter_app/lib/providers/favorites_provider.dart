import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FavoriteItem {
  final String id;
  final String type; // 'image', 'video', 'music'
  final String? url;
  final String? thumbnailUrl;
  final String? title;
  final String? prompt;
  final DateTime addedAt;

  FavoriteItem({
    required this.id,
    required this.type,
    this.url,
    this.thumbnailUrl,
    this.title,
    this.prompt,
    DateTime? addedAt,
  }) : addedAt = addedAt ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'url': url,
        'thumbnailUrl': thumbnailUrl,
        'title': title,
        'prompt': prompt,
        'addedAt': addedAt.toIso8601String(),
      };

  factory FavoriteItem.fromJson(Map<String, dynamic> json) => FavoriteItem(
        id: json['id'] as String,
        type: json['type'] as String,
        url: json['url'] as String?,
        thumbnailUrl: json['thumbnailUrl'] as String?,
        title: json['title'] as String?,
        prompt: json['prompt'] as String?,
        addedAt: DateTime.parse(json['addedAt'] as String),
      );
}

class FavoritesProvider extends ChangeNotifier {
  static const String _storageKey = 'favorites';
  
  List<FavoriteItem> _favorites = [];
  bool _isLoading = false;

  List<FavoriteItem> get favorites => _favorites;
  bool get isLoading => _isLoading;

  FavoritesProvider() {
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final favoritesJson = prefs.getStringList(_storageKey) ?? [];
      
      _favorites = favoritesJson
          .map((json) => FavoriteItem.fromJson(jsonDecode(json)))
          .toList();
      
      // Sort by most recently added
      _favorites.sort((a, b) => b.addedAt.compareTo(a.addedAt));
    } catch (e) {
      debugPrint('Error loading favorites: $e');
      _favorites = [];
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> _saveFavorites() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final favoritesJson = _favorites
          .map((item) => jsonEncode(item.toJson()))
          .toList();
      await prefs.setStringList(_storageKey, favoritesJson);
    } catch (e) {
      debugPrint('Error saving favorites: $e');
    }
  }

  bool isFavorite(String id) {
    return _favorites.any((item) => item.id == id);
  }

  bool isFavoriteByUrl(String url) {
    return _favorites.any((item) => item.url == url);
  }

  Future<void> toggleFavorite({
    required String id,
    required String type,
    String? url,
    String? thumbnailUrl,
    String? title,
    String? prompt,
  }) async {
    if (isFavorite(id)) {
      await removeFavorite(id);
    } else {
      await addFavorite(
        id: id,
        type: type,
        url: url,
        thumbnailUrl: thumbnailUrl,
        title: title,
        prompt: prompt,
      );
    }
  }

  Future<void> addFavorite({
    required String id,
    required String type,
    String? url,
    String? thumbnailUrl,
    String? title,
    String? prompt,
  }) async {
    if (isFavorite(id)) return;

    final item = FavoriteItem(
      id: id,
      type: type,
      url: url,
      thumbnailUrl: thumbnailUrl,
      title: title,
      prompt: prompt,
    );

    _favorites.insert(0, item);
    notifyListeners();
    await _saveFavorites();
  }

  Future<void> removeFavorite(String id) async {
    _favorites.removeWhere((item) => item.id == id);
    notifyListeners();
    await _saveFavorites();
  }

  Future<void> clearAll() async {
    _favorites.clear();
    notifyListeners();
    await _saveFavorites();
  }

  List<FavoriteItem> getByType(String type) {
    if (type == 'all') return _favorites;
    return _favorites.where((item) => item.type == type).toList();
  }
}
