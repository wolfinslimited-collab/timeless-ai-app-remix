import 'package:flutter_tts/flutter_tts.dart';
import '../core/logger.dart';
import '../utils/text_utils.dart';

class TextToSpeechService {
  static final TextToSpeechService _instance = TextToSpeechService._internal();
  factory TextToSpeechService() => _instance;
  TextToSpeechService._internal();

  final FlutterTts _tts = FlutterTts();
  bool _isInitialized = false;
  bool _isSpeaking = false;
  final List<String> _speechQueue = [];
  Function? _onSpeakingComplete;

  bool get isSpeaking => _isSpeaking;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      await _tts.setLanguage('en-US');
      await _tts.setSpeechRate(0.5); // Slightly faster but natural
      await _tts.setVolume(1.0);
      await _tts.setPitch(1.0);

      // Try to set a natural voice
      final voices = await _tts.getVoices;
      if (voices != null && voices is List) {
        // Find a good English voice
        for (final voice in voices) {
          if (voice is Map) {
            final name = voice['name']?.toString().toLowerCase() ?? '';
            final locale = voice['locale']?.toString().toLowerCase() ?? '';
            
            if (locale.startsWith('en') && 
                (name.contains('samantha') || 
                 name.contains('karen') ||
                 name.contains('google') ||
                 name.contains('premium'))) {
              await _tts.setVoice(voice.cast<String, String>());
              logger.info('Selected voice: ${voice['name']}', 'TTS');
              break;
            }
          }
        }
      }

      _tts.setCompletionHandler(() {
        _speakNext();
      });

      _tts.setErrorHandler((message) {
        logger.error('TTS error: $message', 'TTS');
        _isSpeaking = false;
        _speakNext();
      });

      _isInitialized = true;
      logger.success('TTS initialized', 'TTS');
    } catch (e) {
      logger.error('Failed to initialize TTS: $e', 'TTS');
    }
  }

  void setOnSpeakingComplete(Function callback) {
    _onSpeakingComplete = callback;
  }

  Future<void> queueSpeech(String text) async {
    if (!_isInitialized) await initialize();

    // Clean text for speech
    final cleaned = prepareForSpeech(text);
    if (cleaned.isEmpty) return;

    logger.info('Queueing speech: ${cleaned.substring(0, cleaned.length > 50 ? 50 : cleaned.length)}...', 'TTS');
    _speechQueue.add(cleaned);

    if (!_isSpeaking) {
      _speakNext();
    }
  }

  void _speakNext() {
    if (_speechQueue.isEmpty) {
      _isSpeaking = false;
      _onSpeakingComplete?.call();
      return;
    }

    final text = _speechQueue.removeAt(0);
    _isSpeaking = true;
    _tts.speak(text);
  }

  Future<void> stop() async {
    _speechQueue.clear();
    _isSpeaking = false;
    await _tts.stop();
  }

  Future<void> pause() async {
    await _tts.pause();
  }

  Future<void> setVolume(double volume) async {
    await _tts.setVolume(volume.clamp(0.0, 1.0));
  }
}
