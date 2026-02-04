import 'package:shared_preferences/shared_preferences.dart';
import '../core/logger.dart';

class TtsSettingsService {
  static final TtsSettingsService _instance = TtsSettingsService._internal();
  factory TtsSettingsService() => _instance;
  TtsSettingsService._internal();

  static const String _speechRateKey = 'tts_speech_rate';
  static const String _voiceNameKey = 'tts_voice_name';
  static const String _voiceLocaleKey = 'tts_voice_locale';
  static const String _pitchKey = 'tts_pitch';
  static const String _volumeKey = 'tts_volume';

  SharedPreferences? _prefs;

  // Default values
  double _speechRate = 0.5;
  String? _voiceName;
  String? _voiceLocale;
  double _pitch = 1.0;
  double _volume = 1.0;

  double get speechRate => _speechRate;
  String? get voiceName => _voiceName;
  String? get voiceLocale => _voiceLocale;
  double get pitch => _pitch;
  double get volume => _volume;

  Future<void> initialize() async {
    try {
      _prefs = await SharedPreferences.getInstance();
      _speechRate = _prefs?.getDouble(_speechRateKey) ?? 0.5;
      _voiceName = _prefs?.getString(_voiceNameKey);
      _voiceLocale = _prefs?.getString(_voiceLocaleKey);
      _pitch = _prefs?.getDouble(_pitchKey) ?? 1.0;
      _volume = _prefs?.getDouble(_volumeKey) ?? 1.0;
      logger.info('TTS settings loaded: rate=$_speechRate, voice=$_voiceName', 'TTS_SETTINGS');
    } catch (e) {
      logger.error('Failed to load TTS settings: $e', 'TTS_SETTINGS');
    }
  }

  Future<void> setSpeechRate(double rate) async {
    _speechRate = rate.clamp(0.1, 1.0);
    await _prefs?.setDouble(_speechRateKey, _speechRate);
    logger.info('Speech rate set to: $_speechRate', 'TTS_SETTINGS');
  }

  Future<void> setVoice(String name, String locale) async {
    _voiceName = name;
    _voiceLocale = locale;
    await _prefs?.setString(_voiceNameKey, name);
    await _prefs?.setString(_voiceLocaleKey, locale);
    logger.info('Voice set to: $name ($locale)', 'TTS_SETTINGS');
  }

  Future<void> setPitch(double pitch) async {
    _pitch = pitch.clamp(0.5, 2.0);
    await _prefs?.setDouble(_pitchKey, _pitch);
    logger.info('Pitch set to: $_pitch', 'TTS_SETTINGS');
  }

  Future<void> setVolume(double volume) async {
    _volume = volume.clamp(0.0, 1.0);
    await _prefs?.setDouble(_volumeKey, _volume);
    logger.info('Volume set to: $_volume', 'TTS_SETTINGS');
  }

  Future<void> clearVoice() async {
    _voiceName = null;
    _voiceLocale = null;
    await _prefs?.remove(_voiceNameKey);
    await _prefs?.remove(_voiceLocaleKey);
    logger.info('Voice cleared, using default', 'TTS_SETTINGS');
  }
}
