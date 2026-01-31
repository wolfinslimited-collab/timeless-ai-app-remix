import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/generation_model.dart';

class GenerationService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Generate image or video
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
    
    final response = await _supabase.functions.invoke(
      'generate',
      body: body,
    );

    debugPrint('🎨 Response status: ${response.status}');
    debugPrint('🎨 Response data: ${response.data}');

    if (response.status != 200) {
      final error = response.data is Map ? (response.data['error'] ?? 'Generation failed') : 'Generation failed';
      debugPrint('🎨 Generation error: $error');
      throw Exception(error);
    }

    return response.data as Map<String, dynamic>;
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
