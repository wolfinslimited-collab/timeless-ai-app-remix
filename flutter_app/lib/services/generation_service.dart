import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import '../models/generation_model.dart';
import '../core/config.dart';

class GenerationService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Ensure session is valid before making API calls
  /// Returns true if session is valid, throws if session expired and can't refresh
  Future<void> _ensureValidSession() async {
    final session = _supabase.auth.currentSession;
    if (session == null) {
      throw Exception('Not authenticated. Please sign in again.');
    }
    
    // Check if token is expired or about to expire (within 60 seconds)
    final expiresAt = session.expiresAt;
    if (expiresAt != null) {
      final expiryTime = DateTime.fromMillisecondsSinceEpoch(expiresAt * 1000);
      final now = DateTime.now();
      if (expiryTime.isBefore(now.add(const Duration(seconds: 60)))) {
        debugPrint('🔄 Token expiring soon, refreshing session...');
        try {
          await _supabase.auth.refreshSession();
          debugPrint('✅ Session refreshed successfully');
        } catch (e) {
          debugPrint('❌ Session refresh failed: $e');
          // If refresh fails, throw a user-friendly error
          if (e.toString().contains('timed out') || e.toString().contains('SocketException')) {
            throw Exception('Network error. Please check your connection and try again.');
          }
          throw Exception('Session expired. Please sign in again.');
        }
      }
    }
  }

  /// Generate image or video using direct HTTP call for better error handling
  Future<Map<String, dynamic>> generate({
    required String prompt,
    required String model,
    required String type,
    String? aspectRatio,
    String? quality,
    String? referenceImageUrl,
    List<String>? referenceImageUrls,
    String? imageUrl, // For video I2V mode
    String? endImageUrl,
    bool background = false,
  }) async {
    debugPrint('🎨 GenerationService.generate: type=$type, model=$model, prompt=${prompt.substring(0, prompt.length > 50 ? 50 : prompt.length)}...');
    
    // Ensure we have a valid session before making the API call
    await _ensureValidSession();
    
    final body = <String, dynamic>{
      'prompt': prompt,
      'model': model,
      'type': type,
      'stream': false,
      'background': background,
    };
    
    // Add aspect ratio
    if (aspectRatio != null) {
      body['aspectRatio'] = aspectRatio;
    }
    
    // Add quality - no mapping needed, API accepts 1024/2K/4K directly for images
    if (quality != null) {
      body['quality'] = quality;
    }
    
    // For image generation, use referenceImageUrl(s) - web app naming convention
    if (type == 'image') {
      if (referenceImageUrls != null && referenceImageUrls.isNotEmpty) {
        body['referenceImageUrls'] = referenceImageUrls;
        body['referenceImageUrl'] = referenceImageUrls.first;
      } else if (referenceImageUrl != null) {
        body['referenceImageUrl'] = referenceImageUrl;
      }
    } else if (type == 'video') {
      // For video, use imageUrl (I2V mode)
      if (imageUrl != null) {
        body['imageUrl'] = imageUrl;
      }
    }
    
    if (endImageUrl != null) {
      body['endImageUrl'] = endImageUrl;
    }
    
    debugPrint('🎨 Request body: $body');
    
    // Use direct HTTP call for better timeout and error handling
    try {
      final accessToken = _supabase.auth.currentSession?.accessToken;
      if (accessToken == null) {
        throw Exception('Not authenticated. Please sign in again.');
      }
      
      final response = await http.post(
        Uri.parse('${AppConfig.supabaseUrl}/functions/v1/generate'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
          'apikey': AppConfig.supabaseAnonKey,
        },
        body: jsonEncode(body),
      ).timeout(
        const Duration(seconds: 120),
        onTimeout: () {
          throw TimeoutException('Generation request timed out. Please try again.');
        },
      );

      debugPrint('🎨 Response status: ${response.statusCode}');
      debugPrint('🎨 Response body: ${response.body}');

      if (response.statusCode != 200) {
        final errorData = jsonDecode(response.body) as Map<String, dynamic>?;
        final error = errorData?['error'] ?? errorData?['message'] ?? 'Generation failed (${response.statusCode})';
        debugPrint('🎨 Generation error: $error');
        throw Exception(error);
      }

      return jsonDecode(response.body) as Map<String, dynamic>;
    } on TimeoutException catch (e) {
      debugPrint('🎨 Timeout error: $e');
      throw Exception('Generation timed out. Please try again.');
    } catch (e) {
      if (e.toString().contains('SocketException') || e.toString().contains('timed out')) {
        throw Exception('Network error. Please check your connection and try again.');
      }
      rethrow;
    }
  }

  /// Check generation status (for async generations)
  Future<Map<String, dynamic>> checkGeneration({
    required String taskId,
    required String endpoint,
    required String generationId,
  }) async {
    debugPrint('🔄 Checking generation: taskId=$taskId, endpoint=$endpoint');
    
    final response = await _supabase.functions.invoke(
      'check-generation',
      body: {
        'taskId': taskId,
        'endpoint': endpoint,
        'generationId': generationId,
      },
    );

    debugPrint('🔄 Check response status: ${response.status}');
    debugPrint('🔄 Check response data: ${response.data}');

    if (response.status != 200) {
      final error = response.data is Map ? (response.data['error'] ?? 'Status check failed') : 'Status check failed';
      throw Exception(error);
    }

    return response.data as Map<String, dynamic>;
  }

  /// Poll for generation completion
  Stream<Map<String, dynamic>> pollGeneration({
    required String taskId,
    required String endpoint,
    required String generationId,
    Duration interval = const Duration(seconds: 3),
    int maxAttempts = 60,
  }) async* {
    int attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      await Future.delayed(interval);

      try {
        final result = await checkGeneration(
          taskId: taskId,
          endpoint: endpoint,
          generationId: generationId,
        );

        yield result;

        final status = result['status'] as String?;
        if (status == 'completed' || status == 'failed') {
          break;
        }
      } catch (e) {
        yield {'status': 'error', 'error': e.toString()};
        break;
      }
    }
  }

  /// Fetch user's generation history
  Future<List<Generation>> getGenerations({
    String? type,
    int limit = 50,
    int offset = 0,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      debugPrint('📚 getGenerations: No user logged in');
      return [];
    }

    debugPrint('📚 getGenerations: Fetching for user ${user.id}, type=$type, limit=$limit');

    var query = _supabase.from('generations').select().eq('user_id', user.id);

    if (type != null) {
      query = query.eq('type', type);
    }

    final response = await query
        .order('created_at', ascending: false)
        .range(offset, offset + limit - 1);
    
    debugPrint('📚 getGenerations: Found ${(response as List).length} generations');
    
    return response.map((json) => Generation.fromJson(json)).toList();
  }

  /// Delete a generation
  Future<void> deleteGeneration(String id) async {
    await _supabase.from('generations').delete().eq('id', id);
  }
}
