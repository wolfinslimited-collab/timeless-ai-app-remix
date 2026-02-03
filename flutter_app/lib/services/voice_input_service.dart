import 'package:flutter/foundation.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';
import '../core/logger.dart';

class VoiceInputService {
  static final VoiceInputService _instance = VoiceInputService._internal();
  factory VoiceInputService() => _instance;
  VoiceInputService._internal();

  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isInitialized = false;
  bool _isListening = false;
  String _lastError = '';

  bool get isListening => _isListening;
  bool get isInitialized => _isInitialized;
  String get lastError => _lastError;

  /// Initialize the speech recognition service
  Future<bool> initialize() async {
    if (_isInitialized) return true;

    try {
      // Request microphone permission
      final status = await Permission.microphone.request();
      if (status != PermissionStatus.granted) {
        _lastError = 'Microphone permission denied';
        logger.warning('Microphone permission denied', 'VOICE');
        return false;
      }

      _isInitialized = await _speech.initialize(
        onError: (error) {
          logger.error('Speech recognition error: ${error.errorMsg}', 'VOICE');
          _lastError = error.errorMsg;
          _isListening = false;
        },
        onStatus: (status) {
          logger.info('Speech status: $status', 'VOICE');
          if (status == 'done' || status == 'notListening') {
            _isListening = false;
          }
        },
        debugLogging: kDebugMode,
      );

      if (_isInitialized) {
        logger.success('Speech recognition initialized', 'VOICE');
      } else {
        _lastError = 'Speech recognition not available';
        logger.warning('Speech recognition not available on this device', 'VOICE');
      }

      return _isInitialized;
    } catch (e) {
      _lastError = 'Failed to initialize: $e';
      logger.error('Failed to initialize speech: $e', 'VOICE');
      return false;
    }
  }

  /// Start listening for speech
  Future<void> startListening({
    required Function(String) onResult,
    Function(String)? onPartialResult,
    Function()? onListeningStarted,
    Function()? onListeningStopped,
    String localeId = 'en_US',
  }) async {
    if (!_isInitialized) {
      final success = await initialize();
      if (!success) return;
    }

    if (_isListening) {
      logger.warning('Already listening', 'VOICE');
      return;
    }

    try {
      _isListening = true;
      onListeningStarted?.call();

      await _speech.listen(
        onResult: (result) {
          if (result.finalResult) {
            onResult(result.recognizedWords);
            logger.success('Final result: ${result.recognizedWords}', 'VOICE');
          } else {
            onPartialResult?.call(result.recognizedWords);
          }
        },
        localeId: localeId,
        listenMode: stt.ListenMode.dictation,
        cancelOnError: true,
        partialResults: true,
        listenFor: const Duration(seconds: 30),
        pauseFor: const Duration(seconds: 3),
      );
    } catch (e) {
      _isListening = false;
      _lastError = 'Failed to start listening: $e';
      logger.error('Failed to start listening: $e', 'VOICE');
      onListeningStopped?.call();
    }
  }

  /// Stop listening for speech
  Future<void> stopListening() async {
    if (!_isListening) return;

    try {
      await _speech.stop();
      _isListening = false;
      logger.info('Stopped listening', 'VOICE');
    } catch (e) {
      logger.error('Failed to stop listening: $e', 'VOICE');
    }
  }

  /// Cancel the current listening session
  Future<void> cancelListening() async {
    if (!_isListening) return;

    try {
      await _speech.cancel();
      _isListening = false;
      logger.info('Cancelled listening', 'VOICE');
    } catch (e) {
      logger.error('Failed to cancel listening: $e', 'VOICE');
    }
  }

  /// Get available locales for speech recognition
  Future<List<stt.LocaleName>> getLocales() async {
    if (!_isInitialized) {
      await initialize();
    }
    return _speech.locales();
  }

  /// Check if speech recognition is available
  Future<bool> isAvailable() async {
    if (!_isInitialized) {
      return await initialize();
    }
    return _isInitialized;
  }
}
