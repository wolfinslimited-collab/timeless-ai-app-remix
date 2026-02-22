import 'dart:async';
import 'package:flutter/material.dart';
import '../models/generation_model.dart';
import '../services/generation_service.dart';

class GenerationProvider extends ChangeNotifier {
  final GenerationService _generationService = GenerationService();

  List<Generation> _generations = [];
  Generation? _currentGeneration;
  bool _isGenerating = false;
  String? _error;
  double _progress = 0.0;

  List<Generation> get generations => _generations;
  Generation? get currentGeneration => _currentGeneration;
  bool get isGenerating => _isGenerating;
  String? get error => _error;
  double get progress => _progress;

  List<Generation> get images =>
      _generations.where((g) => g.type == GenerationType.image).toList();

  List<Generation> get videos =>
      _generations.where((g) => g.type == GenerationType.video).toList();

  List<Generation> get pendingGenerations =>
      _generations.where((g) => g.isPending).toList();

  Future<void> loadGenerations({String? type, int limit = 50}) async {
    try {
      _generations =
          await _generationService.getGenerations(type: type, limit: limit);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<Generation?> generate({
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
    _isGenerating = true;
    _error = null;
    _progress = 0.0;
    notifyListeners();

    try {
      final result = await _generationService.generate(
        prompt: prompt,
        model: model,
        type: type,
        aspectRatio: aspectRatio,
        quality: quality,
        referenceImageUrl: referenceImageUrl,
        referenceImageUrls: referenceImageUrls,
        imageUrl: imageUrl,
        endImageUrl: endImageUrl,
        background: background,
      );

      debugPrint('Generation API response: $result');

      // Handle image generation response
      // API returns: { success: true, result: { type: 'image', output_url: '...' }, credits_remaining: X }
      if (type == 'image') {
        final resultData = result['result'] as Map<String, dynamic>?;
        final outputUrl = resultData?['output_url'] as String?;

        if (outputUrl != null) {
          _isGenerating = false;
          notifyListeners();

          // Reload generations to get the saved record
          await loadGenerations();

          // Return a generation object with the output URL
          return Generation(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            prompt: prompt,
            model: model,
            type: GenerationType.image,
            status: GenerationStatus.completed,
            outputUrl: outputUrl,
            thumbnailUrl: outputUrl,
            createdAt: DateTime.now(),
          );
        }
      }

      // Handle video generation response
      // API returns: { success: true, message: "Video generation started", taskId: "...", generationId: "..." }
      if (type == 'video') {
        final taskId = result['taskId'] as String?;
        final generationId = result['generationId'] as String?;

        // For background video generation, return a pending generation
        if (taskId != null) {
          _isGenerating = false;
          notifyListeners();

          // Reload to get the pending generation from DB
          await loadGenerations();

          // Return generation with the actual DB ID for proper polling
          return Generation(
            id: generationId ?? taskId,
            prompt: prompt,
            model: model,
            type: GenerationType.video,
            status: GenerationStatus.pending,
            taskId: taskId,
            createdAt: DateTime.now(),
          );
        }
      }

      // Handle music generation response
      // API returns: { success: true, result: { type: 'music', output_url: '...' }, credits_remaining: X }
      if (type == 'music') {
        final resultData = result['result'] as Map<String, dynamic>?;
        final outputUrl = resultData?['output_url'] as String?;

        if (outputUrl != null) {
          _isGenerating = false;
          notifyListeners();

          await loadGenerations();

          return Generation(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            prompt: prompt,
            model: model,
            type: GenerationType.music,
            status: GenerationStatus.completed,
            outputUrl: outputUrl,
            createdAt: DateTime.now(),
          );
        }
      }

      // Legacy handling: check for generationId and poll if needed
      final status = result['status'] as String?;
      final generationId = result['generationId'] as String?;

      if (status == 'pending' || status == 'processing') {
        final taskId = result['taskId'] as String?;
        final endpoint = result['endpoint'] as String?;

        if (taskId != null && endpoint != null && generationId != null) {
          await _pollForCompletion(
            taskId: taskId,
            endpoint: endpoint,
            generationId: generationId,
          );
        }
      }

      // Reload generations to get the new one
      await loadGenerations();

      _isGenerating = false;
      notifyListeners();

      return _generations.isNotEmpty ? _generations.first : null;
    } catch (e) {
      debugPrint('Generation error: $e');
      _error = e.toString();
      _isGenerating = false;
      notifyListeners();
      return null;
    }
  }

  Future<void> _pollForCompletion({
    required String taskId,
    required String endpoint,
    required String generationId,
  }) async {
    int attempts = 0;
    const maxAttempts = 120;
    const interval = Duration(seconds: 3);

    while (attempts < maxAttempts) {
      attempts++;
      await Future.delayed(interval);

      try {
        final result = await _generationService.checkGeneration(
          taskId: taskId,
          endpoint: endpoint,
          generationId: generationId,
        );

        final status = result['status'] as String?;
        _progress = (result['progress'] as num?)?.toDouble() ?? 0.0;
        notifyListeners();

        if (status == 'completed' || status == 'failed') {
          break;
        }
      } catch (e) {
        debugPrint('Polling error: $e');
        break;
      }
    }
  }

  Future<void> deleteGeneration(String id) async {
    try {
      await _generationService.deleteGeneration(id);
      _generations.removeWhere((g) => g.id == id);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
