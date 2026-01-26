import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';

class SocialProfile {
  final String platform;
  final String name;
  final String? username;
  final String url;
  final String? description;
  final String? confidence;

  SocialProfile({
    required this.platform,
    required this.name,
    this.username,
    required this.url,
    this.description,
    this.confidence,
  });

  factory SocialProfile.fromJson(Map<String, dynamic> json) {
    return SocialProfile(
      platform: json['platform'] ?? '',
      name: json['name'] ?? '',
      username: json['username'],
      url: json['url'] ?? '',
      description: json['description'],
      confidence: json['confidence'],
    );
  }
}

class FingerprintSearchResult {
  final String summary;
  final List<SocialProfile> profiles;
  final List<String> sources;

  FingerprintSearchResult({
    required this.summary,
    required this.profiles,
    required this.sources,
  });

  factory FingerprintSearchResult.fromJson(Map<String, dynamic> json) {
    return FingerprintSearchResult(
      summary: json['summary'] ?? '',
      profiles: (json['profiles'] as List<dynamic>?)
              ?.map((p) => SocialProfile.fromJson(p))
              .toList() ??
          [],
      sources: List<String>.from(json['sources'] ?? []),
    );
  }
}

class FingerprintService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Search by name/text
  Future<FingerprintSearchResult> searchByText({
    required String query,
    String? additionalInfo,
  }) async {
    final response = await _supabase.functions.invoke(
      'fingerprint-ai',
      body: {
        'query': query,
        'additionalInfo': additionalInfo,
        'searchMode': 'text',
      },
    );

    if (response.status != 200) {
      final error = response.data?['error'] ?? 'Search failed';
      throw Exception(error);
    }

    return FingerprintSearchResult.fromJson(response.data);
  }

  /// Search by image (reverse image search + AI description)
  Future<FingerprintSearchResult> searchByImage({
    required String imageUrl,
    String? additionalInfo,
  }) async {
    final response = await _supabase.functions.invoke(
      'fingerprint-ai',
      body: {
        'imageUrl': imageUrl,
        'additionalInfo': additionalInfo,
        'searchMode': 'image',
      },
    );

    if (response.status != 200) {
      final error = response.data?['error'] ?? 'Search failed';
      throw Exception(error);
    }

    return FingerprintSearchResult.fromJson(response.data);
  }

  /// Save search to history
  Future<void> saveSearch({
    required FingerprintSearchResult result,
    String? searchQuery,
    String? searchMode,
    String? imageUrl,
    String? additionalInfo,
  }) async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return;

    await _supabase.from('fingerprint_searches').insert({
      'user_id': userId,
      'search_query': searchQuery,
      'search_mode': searchMode ?? 'text',
      'image_url': imageUrl,
      'additional_info': additionalInfo,
      'summary': result.summary,
      'profiles': result.profiles.map((p) => {
        'platform': p.platform,
        'name': p.name,
        'username': p.username,
        'url': p.url,
        'description': p.description,
        'confidence': p.confidence,
      }).toList(),
      'sources': result.sources,
      'credits_used': searchMode == 'image' ? 3 : 2,
    });
  }

  /// Get search history
  Future<List<Map<String, dynamic>>> getSearchHistory() async {
    final userId = _supabase.auth.currentUser?.id;
    if (userId == null) return [];

    final response = await _supabase
        .from('fingerprint_searches')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false)
        .limit(30);

    return List<Map<String, dynamic>>.from(response);
  }

  /// Delete search from history
  Future<void> deleteSearch(String searchId) async {
    await _supabase.from('fingerprint_searches').delete().eq('id', searchId);
  }
}
