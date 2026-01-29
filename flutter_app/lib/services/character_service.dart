import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path/path.dart' as path;

class CharacterModel {
  final String id;
  final String userId;
  final String name;
  final String status;
  final int trainingProgress;
  final String? thumbnailUrl;
  final int imageCount;
  final String averageQuality;
  final DateTime createdAt;
  final DateTime? trainingStartedAt;
  final DateTime? trainingCompletedAt;

  CharacterModel({
    required this.id,
    required this.userId,
    required this.name,
    required this.status,
    required this.trainingProgress,
    this.thumbnailUrl,
    required this.imageCount,
    required this.averageQuality,
    required this.createdAt,
    this.trainingStartedAt,
    this.trainingCompletedAt,
  });

  factory CharacterModel.fromJson(Map<String, dynamic> json) {
    return CharacterModel(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      name: json['name'] as String? ?? 'My Character',
      status: json['status'] as String? ?? 'uploading',
      trainingProgress: json['training_progress'] as int? ?? 0,
      thumbnailUrl: json['thumbnail_url'] as String?,
      imageCount: json['image_count'] as int? ?? 0,
      averageQuality: json['average_quality'] as String? ?? 'unknown',
      createdAt: DateTime.parse(json['created_at'] as String),
      trainingStartedAt: json['training_started_at'] != null
          ? DateTime.parse(json['training_started_at'] as String)
          : null,
      trainingCompletedAt: json['training_completed_at'] != null
          ? DateTime.parse(json['training_completed_at'] as String)
          : null,
    );
  }

  bool get isReady => status == 'ready';
  bool get isTraining => status == 'training';
  bool get isUploading => status == 'uploading';
  bool get isStopped => status == 'stopped';
}

class CharacterImageModel {
  final String id;
  final String characterId;
  final String userId;
  final String imageUrl;
  final String qualityScore;
  final DateTime createdAt;

  CharacterImageModel({
    required this.id,
    required this.characterId,
    required this.userId,
    required this.imageUrl,
    required this.qualityScore,
    required this.createdAt,
  });

  factory CharacterImageModel.fromJson(Map<String, dynamic> json) {
    return CharacterImageModel(
      id: json['id'] as String,
      characterId: json['character_id'] as String,
      userId: json['user_id'] as String,
      imageUrl: json['image_url'] as String,
      qualityScore: json['quality_score'] as String? ?? 'unknown',
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}

class CharacterService {
  final SupabaseClient _supabase = Supabase.instance.client;

  String? get _userId => _supabase.auth.currentUser?.id;

  /// Fetch all characters for current user
  Future<List<CharacterModel>> getCharacters() async {
    if (_userId == null) return [];

    try {
      final response = await _supabase
          .from('characters')
          .select()
          .eq('user_id', _userId!)
          .order('created_at', ascending: false);

      return (response as List)
          .map((json) => CharacterModel.fromJson(json))
          .toList();
    } catch (e) {
      debugPrint('Error fetching characters: $e');
      return [];
    }
  }

  /// Create a new character
  Future<CharacterModel?> createCharacter(String name) async {
    if (_userId == null) return null;

    try {
      final response = await _supabase
          .from('characters')
          .insert({
            'user_id': _userId,
            'name': name,
            'status': 'uploading',
          })
          .select()
          .single();

      return CharacterModel.fromJson(response);
    } catch (e) {
      debugPrint('Error creating character: $e');
      return null;
    }
  }

  /// Upload image for a character
  Future<CharacterImageModel?> uploadCharacterImage(
    String characterId,
    File file,
  ) async {
    if (_userId == null) return null;

    try {
      final fileExt = path.extension(file.path).replaceFirst('.', '');
      final fileName =
          '$_userId/characters/$characterId/${DateTime.now().millisecondsSinceEpoch}.$fileExt';

      await _supabase.storage.from('generation-inputs').upload(fileName, file);

      final publicUrl =
          _supabase.storage.from('generation-inputs').getPublicUrl(fileName);

      // Save image reference
      final response = await _supabase
          .from('character_images')
          .insert({
            'character_id': characterId,
            'user_id': _userId,
            'image_url': publicUrl,
            'quality_score': 'unknown',
          })
          .select()
          .single();

      return CharacterImageModel.fromJson(response);
    } catch (e) {
      debugPrint('Error uploading character image: $e');
      return null;
    }
  }

  /// Set character thumbnail
  Future<void> setThumbnail(String characterId, String imageUrl) async {
    try {
      await _supabase
          .from('characters')
          .update({'thumbnail_url': imageUrl})
          .eq('id', characterId);
    } catch (e) {
      debugPrint('Error setting thumbnail: $e');
    }
  }

  /// Update character image count
  Future<void> updateImageCount(String characterId, int count) async {
    try {
      await _supabase
          .from('characters')
          .update({'image_count': count})
          .eq('id', characterId);
    } catch (e) {
      debugPrint('Error updating image count: $e');
    }
  }

  /// Get images for a character
  Future<List<CharacterImageModel>> getCharacterImages(
      String characterId) async {
    try {
      final response = await _supabase
          .from('character_images')
          .select()
          .eq('character_id', characterId)
          .order('created_at', ascending: false);

      return (response as List)
          .map((json) => CharacterImageModel.fromJson(json))
          .toList();
    } catch (e) {
      debugPrint('Error fetching character images: $e');
      return [];
    }
  }

  /// Delete a character image
  Future<void> deleteCharacterImage(String imageId) async {
    try {
      await _supabase.from('character_images').delete().eq('id', imageId);
    } catch (e) {
      debugPrint('Error deleting character image: $e');
    }
  }

  /// Delete a character and all its images
  Future<void> deleteCharacter(String characterId) async {
    try {
      // Images will be cascade deleted due to FK constraint
      await _supabase.from('characters').delete().eq('id', characterId);
    } catch (e) {
      debugPrint('Error deleting character: $e');
    }
  }

  /// Start character training
  Future<void> startTraining(
    String characterId,
    String name,
    int imageCount,
  ) async {
    try {
      await _supabase.from('characters').update({
        'status': 'training',
        'training_started_at': DateTime.now().toIso8601String(),
        'name': name,
        'image_count': imageCount,
      }).eq('id', characterId);

      // Start simulated training progress
      _simulateTrainingProgress(characterId);
    } catch (e) {
      debugPrint('Error starting training: $e');
    }
  }

  /// Stop character training
  Future<void> stopTraining(String characterId) async {
    try {
      await _supabase.from('characters').update({
        'status': 'stopped',
        'training_progress': 0,
      }).eq('id', characterId);
    } catch (e) {
      debugPrint('Error stopping training: $e');
    }
  }

  /// Update character name
  Future<void> updateName(String characterId, String name) async {
    try {
      await _supabase
          .from('characters')
          .update({'name': name})
          .eq('id', characterId);
    } catch (e) {
      debugPrint('Error updating name: $e');
    }
  }

  /// Simulate training progress (in production, this would be handled by backend)
  void _simulateTrainingProgress(String characterId) async {
    int progress = 0;

    Timer.periodic(const Duration(seconds: 3), (timer) async {
      progress += (5 + (15 * (DateTime.now().millisecond / 1000)).round());

      if (progress >= 100) {
        progress = 100;
        timer.cancel();

        try {
          await _supabase.from('characters').update({
            'status': 'ready',
            'training_progress': 100,
            'training_completed_at': DateTime.now().toIso8601String(),
          }).eq('id', characterId);
        } catch (e) {
          debugPrint('Error completing training: $e');
        }
      } else {
        try {
          await _supabase.from('characters').update({
            'training_progress': progress,
          }).eq('id', characterId);
        } catch (e) {
          debugPrint('Error updating training progress: $e');
        }
      }
    });
  }

  /// Get quality label based on image count
  static ({String label, Color color}) getQualityLabel(int count) {
    if (count >= 20) {
      return (label: 'EXCELLENT', color: const Color(0xFF22C55E));
    }
    if (count >= 10) {
      return (label: 'GOOD', color: const Color(0xFF3B82F6));
    }
    if (count >= 5) {
      return (label: 'FAIR', color: const Color(0xFFFACC15));
    }
    return (label: 'BAD', color: const Color(0xFFEF4444));
  }
}
