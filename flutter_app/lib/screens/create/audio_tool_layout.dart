import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/download_provider.dart';
import '../../models/download_model.dart';
import '../create/audio_waveform_widget.dart';

/// Reusable layout for audio processing tools
class AudioToolLayout extends StatefulWidget {
  final String title;
  final String description;
  final String toolId;
  final int creditCost;
  final bool showPrompt;
  final String promptPlaceholder;
  final bool showAudioUpload;
  final bool showDuration;
  final bool showTempo;
  final bool showPitch;
  final Widget? additionalControls;

  const AudioToolLayout({
    super.key,
    required this.title,
    required this.description,
    required this.toolId,
    required this.creditCost,
    this.showPrompt = false,
    this.promptPlaceholder = 'Describe what you want...',
    this.showAudioUpload = true,
    this.showDuration = false,
    this.showTempo = false,
    this.showPitch = false,
    this.additionalControls,
  });

  @override
  State<AudioToolLayout> createState() => _AudioToolLayoutState();
}

class _AudioToolLayoutState extends State<AudioToolLayout> {
  final _promptController = TextEditingController();
  final _supabase = Supabase.instance.client;

  String? _inputAudioUrl;
  String? _inputAudioName;
  String? _outputUrl;
  bool _isProcessing = false;
  bool _isInputPlaying = false;
  bool _isOutputPlaying = false;

  double _duration = 30;
  double _tempo = 1.0;
  double _pitch = 0;

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _pickAudioFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.audio,
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;

        // Check file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Audio must be under 50MB')),
            );
          }
          return;
        }

        final user = _supabase.auth.currentUser;
        if (user == null) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Please sign in to upload')),
            );
          }
          return;
        }

        // Upload to Supabase storage
        final fileName = '${user.id}/${DateTime.now().millisecondsSinceEpoch}_${file.name}';
        final bytes = file.bytes;

        if (bytes != null) {
          await _supabase.storage.from('generation-inputs').uploadBinary(
            fileName,
            bytes,
            fileOptions: FileOptions(
              contentType: file.extension != null
                  ? 'audio/${file.extension}'
                  : 'audio/mpeg',
            ),
          );

          final publicUrl = _supabase.storage
              .from('generation-inputs')
              .getPublicUrl(fileName);

          setState(() {
            _inputAudioUrl = publicUrl;
            _inputAudioName = file.name;
          });

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Audio uploaded successfully')),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    }
  }

  Future<void> _processAudio() async {
    final session = _supabase.auth.currentSession;
    if (session == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to use this tool')),
      );
      return;
    }

    setState(() {
      _isProcessing = true;
      _outputUrl = null;
    });

    try {
      final response = await _supabase.functions.invoke(
        'music-tools',
        body: {
          'tool': widget.toolId,
          'audioUrl': _inputAudioUrl,
          'prompt': _promptController.text.isNotEmpty 
              ? _promptController.text 
              : null,
          'duration': _duration.toInt(),
          if (widget.showTempo) 'tempo': _tempo,
          if (widget.showPitch) 'pitch': _pitch.toInt(),
        },
      );

      final result = response.data;

      if (result['error'] != null) {
        throw Exception(result['error']);
      }

      if (result['status'] == 'processing') {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Audio is being processed! Check Library for results.'),
            ),
          );
        }
      } else if (result['outputUrl'] != null) {
        setState(() {
          _outputUrl = result['outputUrl'];
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Processing complete!')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Processing failed: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  Future<void> _saveOutput() async {
    if (_outputUrl == null) return;

    final downloadProvider = context.read<DownloadProvider>();

    try {
      await downloadProvider.downloadFile(
        url: _outputUrl!,
        title: '${widget.toolId}_output',
        type: DownloadType.audio,
        saveToGallery: false, // Audio files don't go to photo gallery
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Audio saved to downloads')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Save failed: $e')),
        );
      }
    }
  }

  bool get _canProcess {
    if (widget.showAudioUpload && _inputAudioUrl == null) return false;
    if (widget.showPrompt && _promptController.text.trim().isEmpty && !widget.showAudioUpload) {
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Text(
              widget.description,
              style: TextStyle(
                color: AppTheme.muted,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.bolt, size: 16, color: AppTheme.primary),
                  const SizedBox(width: 4),
                  Text(
                    '${widget.creditCost} credits',
                    style: TextStyle(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Audio Upload
            if (widget.showAudioUpload) ...[
              const Text(
                'Input Audio',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              ),
              const SizedBox(height: 12),
              if (_inputAudioUrl != null)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          // Play button
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: IconButton(
                              icon: Icon(
                                _isInputPlaying ? Icons.pause : Icons.play_arrow,
                                color: AppTheme.primary,
                              ),
                              onPressed: () {
                                setState(() {
                                  _isInputPlaying = !_isInputPlaying;
                                });
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Waveform visualization
                          Expanded(
                            child: AudioWaveformWidget(
                              isPlaying: _isInputPlaying,
                              barCount: 20,
                              height: 40,
                            ),
                          ),
                          // Remove button
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.red),
                            onPressed: () {
                              setState(() {
                                _inputAudioUrl = null;
                                _inputAudioName = null;
                              });
                            },
                          ),
                        ],
                      ),
                      if (_inputAudioName != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          _inputAudioName!,
                          style: TextStyle(
                            color: AppTheme.muted,
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                )
              else
                GestureDetector(
                  onTap: _pickAudioFile,
                  child: Container(
                    height: 120,
                    decoration: BoxDecoration(
                      color: AppTheme.card,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: AppTheme.border,
                        style: BorderStyle.solid,
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.music_note,
                            color: AppTheme.primary,
                            size: 28,
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Upload Audio',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'MP3, WAV, FLAC - Max 50MB',
                          style: TextStyle(
                            color: AppTheme.muted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 24),
            ],

            // Prompt
            if (widget.showPrompt) ...[
              const Text(
                'Prompt',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _promptController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: widget.promptPlaceholder,
                  hintStyle: TextStyle(color: AppTheme.muted),
                  filled: true,
                  fillColor: AppTheme.card,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: AppTheme.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: AppTheme.border),
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Duration slider
            if (widget.showDuration) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Duration',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                  Text(
                    '${_duration.toInt()}s',
                    style: TextStyle(color: AppTheme.muted),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Slider(
                value: _duration,
                min: 5,
                max: 120,
                divisions: 23,
                onChanged: (value) {
                  setState(() {
                    _duration = value;
                  });
                },
              ),
              const SizedBox(height: 24),
            ],

            // Tempo slider
            if (widget.showTempo) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Tempo',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                  Text(
                    '${(_tempo * 100).toInt()}%',
                    style: TextStyle(color: AppTheme.muted),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Slider(
                value: _tempo,
                min: 0.5,
                max: 2.0,
                divisions: 30,
                onChanged: (value) {
                  setState(() {
                    _tempo = value;
                  });
                },
              ),
              const SizedBox(height: 24),
            ],

            // Pitch slider
            if (widget.showPitch) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Pitch Shift',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                  Text(
                    '${_pitch > 0 ? '+' : ''}${_pitch.toInt()} semitones',
                    style: TextStyle(color: AppTheme.muted),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Slider(
                value: _pitch,
                min: -12,
                max: 12,
                divisions: 24,
                onChanged: (value) {
                  setState(() {
                    _pitch = value;
                  });
                },
              ),
              const SizedBox(height: 24),
            ],

            // Additional controls from child widget
            if (widget.additionalControls != null) ...[
              widget.additionalControls!,
              const SizedBox(height: 24),
            ],

            // Process button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _canProcess && !_isProcessing ? _processAudio : null,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isProcessing
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          ),
                          SizedBox(width: 12),
                          Text('Processing...'),
                        ],
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.auto_awesome, size: 20),
                          const SizedBox(width: 8),
                          Text('Process (${widget.creditCost} credits)'),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 32),

            // Output section
            const Text(
              'Output',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
            ),
            const SizedBox(height: 12),
            Container(
              height: 200,
              decoration: BoxDecoration(
                color: AppTheme.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: _isProcessing
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: 60,
                                height: 60,
                                child: CircularProgressIndicator(
                                  color: AppTheme.primary.withOpacity(0.3),
                                  strokeWidth: 4,
                                ),
                              ),
                              Icon(
                                Icons.auto_awesome,
                                color: AppTheme.primary,
                                size: 24,
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Processing audio...',
                            style: TextStyle(color: AppTheme.muted),
                          ),
                        ],
                      ),
                    )
                  : _outputUrl != null
                      ? Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Row(
                                children: [
                                  // Play button
                                  Container(
                                    width: 56,
                                    height: 56,
                                    decoration: BoxDecoration(
                                      color: AppTheme.primary.withOpacity(0.1),
                                      shape: BoxShape.circle,
                                    ),
                                    child: IconButton(
                                      icon: Icon(
                                        _isOutputPlaying 
                                            ? Icons.pause 
                                            : Icons.play_arrow,
                                        color: AppTheme.primary,
                                        size: 28,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _isOutputPlaying = !_isOutputPlaying;
                                        });
                                      },
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  // Waveform
                                  Expanded(
                                    child: AudioWaveformWidget(
                                      isPlaying: _isOutputPlaying,
                                      barCount: 30,
                                      height: 60,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 24),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      onPressed: _saveOutput,
                                      icon: const Icon(Icons.download),
                                      label: const Text('Download'),
                                      style: OutlinedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(
                                          vertical: 12,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        )
                      : Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.music_note,
                                size: 48,
                                color: AppTheme.muted.withOpacity(0.5),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Result will appear here',
                                style: TextStyle(color: AppTheme.muted),
                              ),
                            ],
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
