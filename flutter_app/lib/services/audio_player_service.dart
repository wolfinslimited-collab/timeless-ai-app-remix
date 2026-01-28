import 'package:flutter/foundation.dart';
import 'package:audioplayers/audioplayers.dart';

class AudioPlayerService extends ChangeNotifier {
  static final AudioPlayerService _instance = AudioPlayerService._internal();
  factory AudioPlayerService() => _instance;
  
  AudioPlayerService._internal() {
    _setupListeners();
  }

  final AudioPlayer _player = AudioPlayer();
  
  String? _currentUrl;
  String? _currentTitle;
  String? _currentArtist;
  bool _isPlaying = false;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  
  String? get currentUrl => _currentUrl;
  String? get currentTitle => _currentTitle;
  String? get currentArtist => _currentArtist;
  bool get isPlaying => _isPlaying;
  Duration get position => _position;
  Duration get duration => _duration;
  AudioPlayer get player => _player;
  
  bool get hasCurrentTrack => _currentUrl != null;
  
  double get progress {
    if (_duration.inMilliseconds == 0) return 0;
    return _position.inMilliseconds / _duration.inMilliseconds;
  }

  void _setupListeners() {
    _player.onPositionChanged.listen((pos) {
      _position = pos;
      notifyListeners();
    });
    
    _player.onDurationChanged.listen((dur) {
      _duration = dur;
      notifyListeners();
    });
    
    _player.onPlayerStateChanged.listen((state) {
      _isPlaying = state == PlayerState.playing;
      notifyListeners();
    });
    
    _player.onPlayerComplete.listen((_) {
      _isPlaying = false;
      _position = Duration.zero;
      notifyListeners();
    });
  }

  Future<void> play({
    required String url,
    String? title,
    String? artist,
  }) async {
    try {
      if (_currentUrl == url) {
        // Same track - toggle play/pause
        if (_isPlaying) {
          await pause();
        } else {
          await resume();
        }
        return;
      }
      
      // New track
      _currentUrl = url;
      _currentTitle = title ?? 'Unknown Track';
      _currentArtist = artist ?? 'AI Generated';
      _position = Duration.zero;
      
      await _player.play(UrlSource(url));
      
      notifyListeners();
    } catch (e) {
      debugPrint('Error playing audio: $e');
    }
  }

  Future<void> pause() async {
    await _player.pause();
  }

  Future<void> resume() async {
    await _player.resume();
  }

  Future<void> stop() async {
    await _player.stop();
    _currentUrl = null;
    _currentTitle = null;
    _currentArtist = null;
    _position = Duration.zero;
    _duration = Duration.zero;
    notifyListeners();
  }

  Future<void> seek(Duration position) async {
    await _player.seek(position);
  }

  Future<void> seekToProgress(double progress) async {
    final newPosition = Duration(
      milliseconds: (progress * _duration.inMilliseconds).round(),
    );
    await seek(newPosition);
  }

  void skipForward() {
    final newPos = _position + const Duration(seconds: 10);
    if (newPos < _duration) {
      seek(newPos);
    }
  }

  void skipBackward() {
    final newPos = _position - const Duration(seconds: 10);
    seek(newPos.isNegative ? Duration.zero : newPos);
  }

  String formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }
}
