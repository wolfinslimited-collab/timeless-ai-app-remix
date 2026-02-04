import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import '../../core/theme.dart';
import '../../services/tts_settings_service.dart';
import '../../services/text_to_speech_service.dart';

class TtsSettingsDialog extends StatefulWidget {
  const TtsSettingsDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => const TtsSettingsDialog(),
    );
  }

  @override
  State<TtsSettingsDialog> createState() => _TtsSettingsDialogState();
}

class _TtsSettingsDialogState extends State<TtsSettingsDialog> {
  final TtsSettingsService _settings = TtsSettingsService();
  final TextToSpeechService _tts = TextToSpeechService();
  final FlutterTts _flutterTts = FlutterTts();

  List<Map<String, String>> _voices = [];
  bool _isLoading = true;
  late double _speechRate;
  late double _pitch;
  late double _volume;
  String? _selectedVoiceName;

  @override
  void initState() {
    super.initState();
    _speechRate = _settings.speechRate;
    _pitch = _settings.pitch;
    _volume = _settings.volume;
    _selectedVoiceName = _settings.voiceName;
    _loadVoices();
  }

  Future<void> _loadVoices() async {
    try {
      final voices = await _flutterTts.getVoices;
      if (voices != null && voices is List) {
        final englishVoices = <Map<String, String>>[];
        for (final voice in voices) {
          if (voice is Map) {
            final locale = voice['locale']?.toString().toLowerCase() ?? '';
            if (locale.startsWith('en')) {
              englishVoices.add({
                'name': voice['name']?.toString() ?? 'Unknown',
                'locale': voice['locale']?.toString() ?? 'en-US',
              });
            }
          }
        }
        // Sort by name
        englishVoices.sort((a, b) => a['name']!.compareTo(b['name']!));
        setState(() {
          _voices = englishVoices;
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  String _getSpeechRateLabel(double rate) {
    if (rate <= 0.25) return 'Very Slow';
    if (rate <= 0.4) return 'Slow';
    if (rate <= 0.55) return 'Normal';
    if (rate <= 0.7) return 'Fast';
    return 'Very Fast';
  }

  Future<void> _testVoice() async {
    await _tts.stop();
    await _tts.applySettings();
    await _tts.queueSpeech('Hello! This is a test of the current voice settings.');
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.record_voice_over,
                      color: AppTheme.primary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Voice Settings',
                    style: TextStyle(
                      color: AppTheme.foreground,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close, color: AppTheme.muted),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Speech Rate
              _buildSectionHeader('Speech Rate', _getSpeechRateLabel(_speechRate)),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.speed, color: AppTheme.muted, size: 18),
                  Expanded(
                    child: Slider(
                      value: _speechRate,
                      min: 0.1,
                      max: 1.0,
                      divisions: 9,
                      activeColor: AppTheme.primary,
                      inactiveColor: AppTheme.border,
                      onChanged: (value) async {
                        setState(() => _speechRate = value);
                        await _settings.setSpeechRate(value);
                        await _tts.applySettings();
                      },
                    ),
                  ),
                  SizedBox(
                    width: 40,
                    child: Text(
                      '${(_speechRate * 100).round()}%',
                      style: const TextStyle(
                        color: AppTheme.muted,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Pitch
              _buildSectionHeader('Pitch', _pitch == 1.0 ? 'Normal' : '${_pitch.toStringAsFixed(1)}x'),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.tune, color: AppTheme.muted, size: 18),
                  Expanded(
                    child: Slider(
                      value: _pitch,
                      min: 0.5,
                      max: 2.0,
                      divisions: 15,
                      activeColor: AppTheme.accent,
                      inactiveColor: AppTheme.border,
                      onChanged: (value) async {
                        setState(() => _pitch = value);
                        await _settings.setPitch(value);
                        await _tts.applySettings();
                      },
                    ),
                  ),
                  SizedBox(
                    width: 40,
                    child: Text(
                      '${_pitch.toStringAsFixed(1)}x',
                      style: const TextStyle(
                        color: AppTheme.muted,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Volume
              _buildSectionHeader('Volume', '${(_volume * 100).round()}%'),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    _volume == 0 ? Icons.volume_off : Icons.volume_up,
                    color: AppTheme.muted,
                    size: 18,
                  ),
                  Expanded(
                    child: Slider(
                      value: _volume,
                      min: 0.0,
                      max: 1.0,
                      divisions: 10,
                      activeColor: AppTheme.success,
                      inactiveColor: AppTheme.border,
                      onChanged: (value) async {
                        setState(() => _volume = value);
                        await _settings.setVolume(value);
                        await _tts.applySettings();
                      },
                    ),
                  ),
                  SizedBox(
                    width: 40,
                    child: Text(
                      '${(_volume * 100).round()}%',
                      style: const TextStyle(
                        color: AppTheme.muted,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Voice Selection
              _buildSectionHeader('Voice', _selectedVoiceName ?? 'Default'),
              const SizedBox(height: 12),
              if (_isLoading)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: CircularProgressIndicator(color: AppTheme.primary),
                  ),
                )
              else
                Container(
                  height: 180,
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(4),
                    itemCount: _voices.length + 1,
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        return _buildVoiceItem(
                          name: 'System Default',
                          locale: 'Auto',
                          isSelected: _selectedVoiceName == null,
                          onTap: () async {
                            setState(() => _selectedVoiceName = null);
                            await _settings.clearVoice();
                            await _tts.applySettings();
                          },
                        );
                      }
                      final voice = _voices[index - 1];
                      return _buildVoiceItem(
                        name: voice['name']!,
                        locale: voice['locale']!,
                        isSelected: _selectedVoiceName == voice['name'],
                        onTap: () async {
                          setState(() => _selectedVoiceName = voice['name']);
                          await _settings.setVoice(voice['name']!, voice['locale']!);
                          await _tts.applySettings();
                        },
                      );
                    },
                  ),
                ),
              const SizedBox(height: 20),

              // Test Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _testVoice,
                  icon: const Icon(Icons.play_arrow, size: 20),
                  label: const Text('Test Voice'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: AppTheme.foreground,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: AppTheme.secondary,
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            value,
            style: const TextStyle(
              color: AppTheme.muted,
              fontSize: 12,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildVoiceItem({
    required String name,
    required String locale,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: isSelected ? Border.all(color: AppTheme.primary.withOpacity(0.3)) : null,
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.check_circle : Icons.circle_outlined,
              color: isSelected ? AppTheme.primary : AppTheme.muted,
              size: 18,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      color: isSelected ? AppTheme.foreground : AppTheme.mutedForeground,
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.w500 : FontWeight.normal,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    locale,
                    style: TextStyle(
                      color: AppTheme.muted,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
