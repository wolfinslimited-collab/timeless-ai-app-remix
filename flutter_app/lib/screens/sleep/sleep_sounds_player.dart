import 'dart:async';
import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import '../../core/theme.dart';

class SoundCategory {
  final String id;
  final String name;
  final IconData icon;
  final List<SoundItem> sounds;

  const SoundCategory({
    required this.id,
    required this.name,
    required this.icon,
    required this.sounds,
  });
}

class SoundItem {
  final String id;
  final String name;
  final String description;
  final String url;

  const SoundItem({
    required this.id,
    required this.name,
    required this.description,
    required this.url,
  });
}

const List<SoundCategory> soundCategories = [
  SoundCategory(
    id: 'rain',
    name: 'Rain',
    icon: Icons.water_drop,
    sounds: [
      SoundItem(
        id: 'rain-gentle',
        name: 'Gentle Rain',
        description: 'Soft, steady rainfall for deep relaxation',
        url: 'https://cdn.pixabay.com/audio/2022/05/16/audio_58e2fb8c85.mp3',
      ),
      SoundItem(
        id: 'rain-thunder',
        name: 'Rain & Thunder',
        description: 'Rain with soft rumbling thunder',
        url: 'https://cdn.pixabay.com/audio/2022/02/14/audio_c9e5c9e5a5.mp3',
      ),
      SoundItem(
        id: 'rain-window',
        name: 'Rain on Window',
        description: 'Cozy rain tapping on glass',
        url: 'https://cdn.pixabay.com/audio/2021/09/06/audio_4c14ed59fa.mp3',
      ),
    ],
  ),
  SoundCategory(
    id: 'ocean',
    name: 'Ocean',
    icon: Icons.waves,
    sounds: [
      SoundItem(
        id: 'ocean-waves',
        name: 'Ocean Waves',
        description: 'Gentle waves rolling onto shore',
        url: 'https://cdn.pixabay.com/audio/2022/04/27/audio_67bcfc198a.mp3',
      ),
      SoundItem(
        id: 'ocean-calm',
        name: 'Calm Sea',
        description: 'Peaceful ocean ambience',
        url: 'https://cdn.pixabay.com/audio/2024/02/14/audio_8e65a0c4af.mp3',
      ),
    ],
  ),
  SoundCategory(
    id: 'forest',
    name: 'Forest',
    icon: Icons.forest,
    sounds: [
      SoundItem(
        id: 'forest-birds',
        name: 'Forest Birds',
        description: 'Morning bird songs',
        url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_12b0c7443c.mp3',
      ),
      SoundItem(
        id: 'forest-night',
        name: 'Night Forest',
        description: 'Crickets and peaceful night sounds',
        url: 'https://cdn.pixabay.com/audio/2022/03/23/audio_2e6d56d7a8.mp3',
      ),
    ],
  ),
  SoundCategory(
    id: 'fireplace',
    name: 'Fireplace',
    icon: Icons.fireplace,
    sounds: [
      SoundItem(
        id: 'fire-crackling',
        name: 'Crackling Fire',
        description: 'Warm, cozy fireplace sounds',
        url: 'https://cdn.pixabay.com/audio/2022/01/18/audio_3bb4f88ff0.mp3',
      ),
      SoundItem(
        id: 'fire-campfire',
        name: 'Campfire',
        description: 'Outdoor campfire ambience',
        url: 'https://cdn.pixabay.com/audio/2021/08/04/audio_8ba3b95c21.mp3',
      ),
    ],
  ),
  SoundCategory(
    id: 'ambient',
    name: 'Ambient',
    icon: Icons.air,
    sounds: [
      SoundItem(
        id: 'ambient-white',
        name: 'White Noise',
        description: 'Steady white noise for focus',
        url: 'https://cdn.pixabay.com/audio/2022/10/30/audio_bb4b5e6d1d.mp3',
      ),
      SoundItem(
        id: 'ambient-meditation',
        name: 'Meditation',
        description: 'Calming meditation tones',
        url: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3',
      ),
    ],
  ),
];

const List<Map<String, dynamic>> sleepTimers = [
  {'label': '15 min', 'minutes': 15},
  {'label': '30 min', 'minutes': 30},
  {'label': '45 min', 'minutes': 45},
  {'label': '1 hour', 'minutes': 60},
  {'label': '2 hours', 'minutes': 120},
  {'label': '∞', 'minutes': null},
];

class SleepSoundsPlayer extends StatefulWidget {
  const SleepSoundsPlayer({super.key});

  @override
  State<SleepSoundsPlayer> createState() => _SleepSoundsPlayerState();
}

class _SleepSoundsPlayerState extends State<SleepSoundsPlayer> {
  String _selectedCategory = 'rain';
  SoundItem? _currentSound;
  bool _isPlaying = false;
  bool _isLoading = false;
  double _volume = 0.7;
  bool _isMuted = false;
  int? _sleepTimer;
  int? _timeRemaining;

  final AudioPlayer _audioPlayer = AudioPlayer();
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    _audioPlayer.onPlayerComplete.listen((_) {
      // Loop the audio
      if (_currentSound != null && _isPlaying) {
        _audioPlayer.play(UrlSource(_currentSound!.url));
      }
    });
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  SoundCategory get _currentCategory =>
      soundCategories.firstWhere((c) => c.id == _selectedCategory);

  Future<void> _playSound(SoundItem sound) async {
    if (_currentSound?.id == sound.id) {
      // Toggle play/pause
      if (_isPlaying) {
        await _audioPlayer.pause();
        setState(() => _isPlaying = false);
      } else {
        await _audioPlayer.resume();
        setState(() => _isPlaying = true);
      }
      return;
    }

    // New sound
    setState(() {
      _isLoading = true;
      _currentSound = sound;
    });

    try {
      await _audioPlayer.stop();
      await _audioPlayer.setVolume(_isMuted ? 0 : _volume);
      await _audioPlayer.play(UrlSource(sound.url));
      setState(() {
        _isPlaying = true;
        _isLoading = false;
      });
      _startTimer();
    } catch (e) {
      setState(() {
        _isPlaying = false;
        _isLoading = false;
      });
    }
  }

  void _stopPlayback() {
    _audioPlayer.stop();
    _countdownTimer?.cancel();
    setState(() {
      _currentSound = null;
      _isPlaying = false;
      _timeRemaining = null;
    });
  }

  void _setVolume(double value) {
    setState(() {
      _volume = value;
      if (value > 0) _isMuted = false;
    });
    _audioPlayer.setVolume(_isMuted ? 0 : value);
  }

  void _toggleMute() {
    setState(() => _isMuted = !_isMuted);
    _audioPlayer.setVolume(_isMuted ? 0 : _volume);
  }

  void _setSleepTimer(int? minutes) {
    setState(() => _sleepTimer = minutes);
    _startTimer();
  }

  void _startTimer() {
    _countdownTimer?.cancel();

    if (_sleepTimer == null || !_isPlaying) {
      setState(() => _timeRemaining = null);
      return;
    }

    setState(() => _timeRemaining = _sleepTimer! * 60);

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_timeRemaining == null || _timeRemaining! <= 1) {
        _stopPlayback();
        timer.cancel();
      } else {
        setState(() => _timeRemaining = _timeRemaining! - 1);
      }
    });
  }

  String _formatTime(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '$mins:${secs.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.music_note, color: Colors.indigo),
            const SizedBox(width: 8),
            const Text('Sleep Sounds'),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Now Playing Card
          if (_currentSound != null) _buildNowPlayingCard(),

          // Sleep Timer
          _buildTimerCard(),
          const SizedBox(height: 16),

          // Category Selection
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: soundCategories.map((category) {
                final isSelected = _selectedCategory == category.id;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(category.icon, size: 16),
                        const SizedBox(width: 6),
                        Text(category.name),
                      ],
                    ),
                    selected: isSelected,
                    onSelected: (_) => setState(() => _selectedCategory = category.id),
                    backgroundColor: AppTheme.secondary,
                    selectedColor: Colors.indigo.withOpacity(0.2),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 16),

          // Sounds List
          ...(_currentCategory.sounds.map((sound) => _buildSoundCard(sound))),
        ],
      ),
    );
  }

  Widget _buildNowPlayingCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _isPlaying
            ? Colors.indigo.withOpacity(0.1)
            : AppTheme.secondary,
        border: Border.all(
          color: _isPlaying ? Colors.indigo.withOpacity(0.3) : AppTheme.border,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Play/Pause Button
              GestureDetector(
                onTap: _currentSound != null ? () => _playSound(_currentSound!) : null,
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Colors.indigo, Colors.purple],
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: _isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Icon(
                            _isPlaying ? Icons.pause : Icons.play_arrow,
                            color: Colors.white,
                            size: 28,
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 16),

              // Track Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          _currentSound!.name,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        if (_isPlaying) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.indigo.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'Playing',
                              style: TextStyle(fontSize: 10, color: Colors.indigo),
                            ),
                          ),
                        ],
                      ],
                    ),
                    Text(
                      _currentSound!.description,
                      style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                    ),
                    if (_timeRemaining != null)
                      Row(
                        children: [
                          Icon(Icons.timer, size: 12, color: Colors.amber),
                          const SizedBox(width: 4),
                          Text(
                            '${_formatTime(_timeRemaining!)} remaining',
                            style: const TextStyle(color: Colors.amber, fontSize: 11),
                          ),
                        ],
                      ),
                  ],
                ),
              ),

              // Stop Button
              IconButton(
                onPressed: _stopPlayback,
                icon: const Icon(Icons.stop),
                color: AppTheme.muted,
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Volume Control
          Row(
            children: [
              IconButton(
                onPressed: _toggleMute,
                icon: Icon(
                  _isMuted || _volume == 0 ? Icons.volume_off : Icons.volume_up,
                  color: AppTheme.muted,
                ),
                iconSize: 20,
              ),
              Expanded(
                child: Slider(
                  value: _isMuted ? 0 : _volume,
                  onChanged: _setVolume,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTimerCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.timer, size: 18, color: Colors.amber),
              const SizedBox(width: 8),
              const Text('Sleep Timer', style: TextStyle(fontWeight: FontWeight.w500)),
            ],
          ),
          const SizedBox(height: 8),
          const Text('Auto-stop playback after', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: sleepTimers.map((timer) {
              final isSelected = _sleepTimer == timer['minutes'];
              return ChoiceChip(
                label: Text(timer['label'] as String),
                selected: isSelected,
                onSelected: (_) => _setSleepTimer(timer['minutes'] as int?),
                backgroundColor: AppTheme.card,
                selectedColor: Colors.indigo.withOpacity(0.2),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildSoundCard(SoundItem sound) {
    final isCurrentSound = _currentSound?.id == sound.id;
    final isPlaying = isCurrentSound && _isPlaying;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: isCurrentSound ? Colors.indigo.withOpacity(0.1) : AppTheme.secondary,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => _playSound(sound),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: isPlaying
                        ? Colors.indigo.withOpacity(0.2)
                        : AppTheme.card,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: isPlaying
                        ? Icon(Icons.pause, color: Colors.indigo)
                        : Icon(Icons.play_arrow, color: AppTheme.muted),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(sound.name, style: const TextStyle(fontWeight: FontWeight.w500)),
                      Text(
                        sound.description,
                        style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
