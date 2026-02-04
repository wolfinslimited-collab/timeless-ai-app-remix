import 'package:flutter_tts/flutter_tts.dart';
import '../core/logger.dart';
import '../utils/text_utils.dart';
import 'tts_settings_service.dart';

class TextToSpeechService {
  static final TextToSpeechService _instance = TextToSpeechService._internal();
  factory TextToSpeechService() => _instance;
  TextToSpeechService._internal();

  final FlutterTts _tts = FlutterTts();
  final TtsSettingsService _settings = TtsSettingsService();
  bool _isInitialized = false;
  bool _isSpeaking = false;
  final List<String> _speechQueue = [];
  Function? _onSpeakingComplete;

  bool get isSpeaking => _isSpeaking;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Initialize settings first
      await _settings.initialize();

      await _tts.setLanguage('en-US');
      await _applyUserSettings();

      _tts.setCompletionHandler(() {
        _speakNext();
      });

      _tts.setErrorHandler((message) {
        logger.error('TTS error: $message', 'TTS');
        _isSpeaking = false;
        _speakNext();
      });

      _isInitialized = true;
      logger.success('TTS initialized with user settings', 'TTS');
    } catch (e) {
      logger.error('Failed to initialize TTS: $e', 'TTS');
    }
  }

  Future<void> _applyUserSettings() async {
    await _tts.setSpeechRate(_settings.speechRate);
    await _tts.setPitch(_settings.pitch);
    await _tts.setVolume(_settings.volume);

    // Apply selected voice if any
    if (_settings.voiceName != null && _settings.voiceLocale != null) {
      try {
        await _tts.setVoice({
          'name': _settings.voiceName!,
          'locale': _settings.voiceLocale!,
        });
        logger.info('Applied voice: ${_settings.voiceName}', 'TTS');
      } catch (e) {
        logger.error('Failed to apply voice: $e', 'TTS');
        // Fall back to finding a default voice
        await _selectDefaultVoice();
      }
    } else {
      await _selectDefaultVoice();
    }
  }

  Future<void> _selectDefaultVoice() async {
    try {
      final voices = await _tts.getVoices;
      if (voices != null && voices is List) {
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
              logger.info('Selected default voice: ${voice['name']}', 'TTS');
              break;
            }
          }
        }
      }
    } catch (e) {
      logger.error('Failed to select default voice: $e', 'TTS');
    }
  }

  /// Apply current settings (call after settings change)
  Future<void> applySettings() async {
    await _applyUserSettings();
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
    await _settings.setVolume(volume);
    await _tts.setVolume(volume.clamp(0.0, 1.0));
  }
}
