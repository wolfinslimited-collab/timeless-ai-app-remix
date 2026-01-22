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

  Future<void> loadGenerations({String? type}) async {
    try {
      _generations = await _generationService.getGenerations(type: type);
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
    String? imageUrl,
    String? endImageUrl,
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
        imageUrl: imageUrl,
        endImageUrl: endImageUrl,
      );

      final status = result['status'] as String?;

      // If async generation (pending)
      if (status == 'pending' || status == 'processing') {
        final taskId = result['taskId'] as String?;
        final endpoint = result['endpoint'] as String?;
        final generationId = result['generationId'] as String?;

        if (taskId != null && endpoint != null && generationId != null) {
          // Start polling
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
