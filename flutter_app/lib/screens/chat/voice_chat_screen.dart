import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:record/record.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../widgets/voice_chat/voice_chat_visualizer.dart';

/// Flutter implementation of Ask AI voice chat using Gemini Live WebSocket
/// Mirrors the web VoiceChat.tsx: bidirectional PCM audio streaming
/// - Captures mic audio as PCM16 16kHz mono
/// - Streams to Gemini Live via WebSocket
/// - Receives PCM16 24kHz audio responses and plays them back
/// - Supports any language natively (Gemini handles it)

class VoiceChatScreen extends StatefulWidget {
  final bool autoStart;

  const VoiceChatScreen({super.key, this.autoStart = true});

  @override
  State<VoiceChatScreen> createState() => _VoiceChatScreenState();
}

class _VoiceChatScreenState extends State<VoiceChatScreen> {
  final _supabase = Supabase.instance.client;

  VoiceState _voiceState = VoiceState.idle;
  String _transcript = '';
  String? _error;
  bool _isMuted = false;
  bool _isInitializing = true;

  // WebSocket
  WebSocketChannel? _wsChannel;
  StreamSubscription? _wsSubscription;
  bool _isConnected = false;
  bool _isListening = false;
  Timer? _keepaliveTimer;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 3;

  // Mic recording
  final AudioRecorder _recorder = AudioRecorder();
  StreamSubscription<List<int>>? _micSubscription;

  // Audio playback
  final List<Uint8List> _audioQueue = [];
  bool _isPlaying = false;
  AudioPlayer? _audioPlayer;

  // History
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  List<Map<String, dynamic>> _sessions = [];
  bool _loadingSessions = false;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    setState(() => _isInitializing = true);

    try {
      // Request mic permission
      final status = await Permission.microphone.request();
      if (status != PermissionStatus.granted) {
        setState(() {
          _isInitializing = false;
          _error = 'Microphone permission denied';
        });
        return;
      }

      setState(() => _isInitializing = false);

      if (widget.autoStart) {
        await Future.delayed(const Duration(milliseconds: 300));
        if (mounted) _connectToGemini();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isInitializing = false;
          _error = 'Failed to initialize: $e';
        });
      }
    }
  }

  @override
  void dispose() {
    _cleanup();
    _recorder.dispose();
    _audioPlayer?.dispose();
    super.dispose();
  }

  void _cleanup() {
    _isListening = false;
    _isConnected = false;
    _keepaliveTimer?.cancel();
    _keepaliveTimer = null;
    _micSubscription?.cancel();
    _micSubscription = null;
    _wsSubscription?.cancel();
    _wsSubscription = null;
    _wsChannel?.sink.close();
    _wsChannel = null;
    _recorder.stop();
    _interruptAI();
  }

  void _interruptAI() {
    _audioQueue.clear();
    _isPlaying = false;
    _audioPlayer?.stop();
  }

  // ─── Gemini Live WebSocket Connection ───

  Future<void> _connectToGemini() async {
    setState(() {
      _error = null;
      _voiceState = VoiceState.processing;
      _transcript = '';
    });

    try {
      final token = _supabase.auth.currentSession?.accessToken;
      final userId = _supabase.auth.currentUser?.id;
      if (token == null || userId == null) {
        setState(() {
          _error = 'Please sign in to use voice chat';
          _voiceState = VoiceState.idle;
        });
        return;
      }

      // Check credits
      final hasCredits = await _checkCredits(token, userId);
      if (!hasCredits) {
        setState(() {
          _error = 'Insufficient credits';
          _voiceState = VoiceState.idle;
        });
        return;
      }

      // Get WebSocket URL from edge function
      final res = await http.post(
        Uri.parse('${AppConfig.supabaseUrl}/functions/v1/gemini-live-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (res.statusCode != 200) {
        final errData = jsonDecode(res.body);
        throw Exception(errData['error'] ?? 'Failed to get token: ${res.statusCode}');
      }

      final tokenData = jsonDecode(res.body);
      String? wsUrl = tokenData['websocket_url'];
      final apiKey = tokenData['apiKey'];

      if (wsUrl == null && apiKey != null) {
        wsUrl = apiKey.toString().startsWith('wss://')
            ? apiKey
            : 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=$apiKey';
      }

      if (wsUrl == null) {
        throw Exception('No WebSocket URL returned');
      }

      debugPrint('[VoiceChat] Connecting to Gemini Live WebSocket: ${wsUrl.substring(0, 80)}...');

      // Open WebSocket
      _wsChannel = WebSocketChannel.connect(Uri.parse(wsUrl));

      // CRITICAL: Wait for WebSocket to actually connect before sending setup
      try {
        await _wsChannel!.ready;
      } catch (e) {
        debugPrint('[VoiceChat] WebSocket failed to connect: $e');
        throw Exception('Failed to connect to voice service');
      }

      debugPrint('[VoiceChat] WebSocket connected, sending setup');

      _wsSubscription = _wsChannel!.stream.listen(
        _handleWsMessage,
        onError: (e) {
          debugPrint('[VoiceChat] WebSocket error: $e');
        },
        onDone: () {
          debugPrint('[VoiceChat] WebSocket closed');
          _isConnected = false;
          _keepaliveTimer?.cancel();

          // Auto-reconnect
          if (_isListening && _reconnectAttempts < _maxReconnectAttempts) {
            _reconnectAttempts++;
            debugPrint('[VoiceChat] Auto-reconnecting (attempt $_reconnectAttempts)...');
            setState(() {
              _error = 'Reconnecting...';
              _voiceState = VoiceState.processing;
            });
            _micSubscription?.cancel();
            _recorder.stop();
            _interruptAI();
            Future.delayed(const Duration(seconds: 1), () {
              if (mounted) _connectToGemini();
            });
          } else if (_isListening) {
            setState(() {
              _error = 'Connection closed. Tap to reconnect.';
              _voiceState = VoiceState.idle;
            });
            _cleanup();
          }
        },
      );

      // Send setup message (matching web implementation)
      _wsChannel!.sink.add(jsonEncode({
        'setup': {
          'model': 'models/gemini-2.5-flash-native-audio-preview-12-2025',
          'generation_config': {
            'response_modalities': ['AUDIO'],
            'speech_config': {
              'voice_config': {
                'prebuilt_voice_config': {
                  'voice_name': 'Aoede',
                }
              }
            }
          },
          'system_instruction': {
            'parts': [
              {
                'text':
                    'You are a helpful, friendly AI assistant. Keep responses concise and conversational. Respond naturally as in a spoken conversation.'
              }
            ]
          }
        }
      }));

      // Start keepalive: send silent audio every 15s
      _keepaliveTimer?.cancel();
      _keepaliveTimer = Timer.periodic(const Duration(seconds: 15), (_) {
        if (_wsChannel != null && _isConnected) {
          // 10ms of silence at 16kHz = 160 samples * 2 bytes = 320 bytes
          final silence = Uint8List(320);
          final b64 = base64Encode(silence);
          _wsChannel!.sink.add(jsonEncode({
            'realtime_input': {
              'media_chunks': [
                {'data': b64, 'mime_type': 'audio/pcm;rate=16000'}
              ]
            }
          }));
        }
      });

      _reconnectAttempts = 0;
    } catch (e) {
      debugPrint('[VoiceChat] Connection error: $e');
      if (mounted) {
        setState(() {
          _error = e.toString().replaceAll('Exception: ', '');
          _voiceState = VoiceState.idle;
        });
      }
    }
  }

  // ─── WebSocket Message Handling ───

  void _handleWsMessage(dynamic rawMessage) {
    try {
      final String data;
      if (rawMessage is String) {
        data = rawMessage;
      } else if (rawMessage is List<int>) {
        data = utf8.decode(rawMessage);
      } else {
        return;
      }

      final msg = jsonDecode(data) as Map<String, dynamic>;

      // Handle server content with audio
      if (msg.containsKey('serverContent')) {
        final serverContent = msg['serverContent'] as Map<String, dynamic>;
        final modelTurn = serverContent['modelTurn'] as Map<String, dynamic>?;

        if (modelTurn != null) {
          final parts = modelTurn['parts'] as List<dynamic>?;
          if (parts != null) {
            for (final part in parts) {
              // Audio response
              final inlineData = part['inlineData'] as Map<String, dynamic>?;
              if (inlineData != null) {
                final mimeType = inlineData['mimeType']?.toString() ?? '';
                if (mimeType.startsWith('audio/pcm')) {
                  final audioB64 = inlineData['data'] as String;
                  final audioBytes = base64Decode(audioB64);
                  _audioQueue.add(Uint8List.fromList(audioBytes));
                  if (!_isPlaying) _playNextAudioChunk();
                }
              }

              // Text response (transcript from AI)
              if (part['text'] != null) {
                setState(() {
                  _transcript += part['text'].toString();
                });
              }
            }
          }
        }

        // Turn complete
        if (serverContent['turnComplete'] == true) {
          debugPrint('[VoiceChat] Turn complete');
          if (_audioQueue.isEmpty && !_isPlaying) {
            if (_isConnected && _isListening) {
              setState(() => _voiceState = VoiceState.listening);
            }
          }
        }
      }

      // Setup complete
      if (msg.containsKey('setupComplete')) {
        debugPrint('[VoiceChat] Setup complete, starting mic capture');
        _isConnected = true;
        _isListening = true;
        setState(() => _voiceState = VoiceState.listening);
        _startMicCapture();
      }
    } catch (e) {
      debugPrint('[VoiceChat] Failed to parse WS message: $e');
    }
  }

  // ─── Microphone Capture ───

  Future<void> _startMicCapture() async {
    try {
      final hasPermission = await _recorder.hasPermission();
      if (!hasPermission) {
        setState(() => _error = 'Microphone access denied');
        _cleanup();
        setState(() => _voiceState = VoiceState.idle);
        return;
      }

      // Start streaming PCM16 at 16kHz mono
      final stream = await _recorder.startStream(
        const RecordConfig(
          encoder: AudioEncoder.pcm16bits,
          sampleRate: 16000,
          numChannels: 1,
          autoGain: true,
          echoCancel: true,
          noiseSuppress: true,
        ),
      );

      _micSubscription = stream.listen((data) {
        if (!_isListening || _isMuted || _wsChannel == null || !_isConnected) return;

        // If AI is speaking and user starts talking, interrupt
        if (_voiceState == VoiceState.speaking) {
          // Check if there's actual audio (not silence)
          if (_hasSignificantAudio(Uint8List.fromList(data))) {
            _interruptAI();
            setState(() => _voiceState = VoiceState.listening);
          }
        }

        // Send PCM audio to Gemini via WebSocket
        final b64 = base64Encode(data);
        try {
          _wsChannel?.sink.add(jsonEncode({
            'realtime_input': {
              'media_chunks': [
                {'data': b64, 'mime_type': 'audio/pcm;rate=16000'}
              ]
            }
          }));
        } catch (e) {
          debugPrint('[VoiceChat] Failed to send audio: $e');
        }
      });

      debugPrint('[VoiceChat] Mic capture started at 16kHz PCM16');
    } catch (e) {
      debugPrint('[VoiceChat] Mic error: $e');
      setState(() {
        _error = 'Microphone access failed';
        _voiceState = VoiceState.idle;
      });
      _cleanup();
    }
  }

  /// Check if audio data contains significant signal (not silence)
  bool _hasSignificantAudio(Uint8List data) {
    if (data.length < 4) return false;
    // Read PCM16 samples and check RMS
    double sum = 0;
    int count = 0;
    for (int i = 0; i < data.length - 1; i += 2) {
      int sample = data[i] | (data[i + 1] << 8);
      if (sample > 32767) sample -= 65536; // Convert to signed
      sum += (sample * sample).toDouble();
      count++;
    }
    if (count == 0) return false;
    final rms = sqrt(sum / count);
    return rms > 500; // Threshold for "significant" audio
  }

  // ─── Audio Playback ───

  Future<void> _playNextAudioChunk() async {
    if (_audioQueue.isEmpty) {
      _isPlaying = false;
      // AI finished speaking, go back to listening
      if (_isConnected && _isListening && mounted) {
        setState(() => _voiceState = VoiceState.listening);
      }
      return;
    }

    _isPlaying = true;
    if (mounted) setState(() => _voiceState = VoiceState.speaking);

    final pcmData = _audioQueue.removeAt(0);

    try {
      // Convert PCM16 24kHz to WAV for playback
      final wavData = _pcmToWav(pcmData, sampleRate: 24000);

      // Write to temp file and play
      final tempDir = await getTemporaryDirectory();
      final tempFile = File('${tempDir.path}/voice_chunk_${DateTime.now().millisecondsSinceEpoch}.wav');
      await tempFile.writeAsBytes(wavData);

      _audioPlayer?.dispose();
      _audioPlayer = AudioPlayer();

      await _audioPlayer!.play(DeviceFileSource(tempFile.path));

      // Wait for playback to complete
      await _audioPlayer!.onPlayerComplete.first.timeout(
        const Duration(seconds: 30),
        onTimeout: () => null,
      );

      // Clean up temp file
      try {
        await tempFile.delete();
      } catch (_) {}

      // Play next chunk
      if (mounted) _playNextAudioChunk();
    } catch (e) {
      debugPrint('[VoiceChat] Playback error: $e');
      _isPlaying = false;
      if (mounted) _playNextAudioChunk(); // Try next chunk
    }
  }

  /// Convert raw PCM16 LE data to WAV format
  Uint8List _pcmToWav(Uint8List pcmData, {int sampleRate = 24000, int channels = 1, int bitsPerSample = 16}) {
    final dataSize = pcmData.length;
    final fileSize = 36 + dataSize;
    final byteRate = sampleRate * channels * (bitsPerSample ~/ 8);
    final blockAlign = channels * (bitsPerSample ~/ 8);

    final header = ByteData(44);
    // RIFF header
    header.setUint8(0, 0x52); // R
    header.setUint8(1, 0x49); // I
    header.setUint8(2, 0x46); // F
    header.setUint8(3, 0x46); // F
    header.setUint32(4, fileSize, Endian.little);
    header.setUint8(8, 0x57); // W
    header.setUint8(9, 0x41); // A
    header.setUint8(10, 0x56); // V
    header.setUint8(11, 0x45); // E
    // fmt chunk
    header.setUint8(12, 0x66); // f
    header.setUint8(13, 0x6D); // m
    header.setUint8(14, 0x74); // t
    header.setUint8(15, 0x20); // (space)
    header.setUint32(16, 16, Endian.little); // chunk size
    header.setUint16(20, 1, Endian.little); // PCM format
    header.setUint16(22, channels, Endian.little);
    header.setUint32(24, sampleRate, Endian.little);
    header.setUint32(28, byteRate, Endian.little);
    header.setUint16(32, blockAlign, Endian.little);
    header.setUint16(34, bitsPerSample, Endian.little);
    // data chunk
    header.setUint8(36, 0x64); // d
    header.setUint8(37, 0x61); // a
    header.setUint8(38, 0x74); // t
    header.setUint8(39, 0x61); // a
    header.setUint32(40, dataSize, Endian.little);

    final wav = Uint8List(44 + dataSize);
    wav.setRange(0, 44, header.buffer.asUint8List());
    wav.setRange(44, 44 + dataSize, pcmData);
    return wav;
  }

  // ─── Credits ───

  Future<bool> _checkCredits(String token, String userId) async {
    try {
      final url = Uri.parse(
        '${AppConfig.supabaseUrl}/rest/v1/profiles?select=credits,subscription_status&user_id=eq.$userId',
      );
      final res = await http.get(url, headers: {
        'apikey': AppConfig.supabaseAnonKey,
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      });
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as List;
        if (data.isEmpty) return false;
        if (data[0]['subscription_status'] == 'active') return true;
        if ((data[0]['credits'] as int? ?? 0) < 1) return false;
        return true;
      }
    } catch (e) {
      debugPrint('Credit check failed: $e');
    }
    return false;
  }

  // ─── Sessions ───

  Future<void> _fetchSessions() async {
    setState(() => _loadingSessions = true);
    try {
      final token = _supabase.auth.currentSession?.accessToken;
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null || token == null) {
        setState(() {
          _sessions = [];
          _loadingSessions = false;
        });
        return;
      }

      final url = Uri.parse(
        '${AppConfig.supabaseUrl}/rest/v1/voice_sessions'
        '?select=id,title,transcript,created_at'
        '&user_id=eq.$userId'
        '&order=created_at.desc'
        '&limit=50',
      );

      final res = await http.get(url, headers: {
        'apikey': AppConfig.supabaseAnonKey,
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      });

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as List;
        setState(() => _sessions = data.cast<Map<String, dynamic>>());
      }
    } catch (e) {
      debugPrint('Failed to fetch voice sessions: $e');
    } finally {
      if (mounted) setState(() => _loadingSessions = false);
    }
  }

  String _formatSessionDate(String dateStr) {
    final date = DateTime.tryParse(dateStr);
    if (date == null) return '';
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${date.month}/${date.day}';
  }

  // ─── User Actions ───

  void _startListening() {
    if (_voiceState == VoiceState.speaking) {
      _interruptAI();
      setState(() => _voiceState = VoiceState.listening);
      return;
    }
    setState(() {
      _transcript = '';
      _error = null;
    });
    _connectToGemini();
  }

  void _stopListening() {
    _cleanup();
    setState(() => _voiceState = VoiceState.idle);
  }

  void _toggleMute() {
    setState(() => _isMuted = !_isMuted);
    if (_isMuted) {
      _interruptAI();
    }
  }

  void _handleClose() {
    _cleanup();
    Navigator.of(context).pop();
  }

  String _getStatusLabel() {
    if (_isInitializing) return 'Initializing...';
    switch (_voiceState) {
      case VoiceState.listening:
        return 'Listening...';
      case VoiceState.processing:
        return 'Connecting...';
      case VoiceState.speaking:
        return '';
      case VoiceState.idle:
        return _error != null ? 'Tap to retry' : 'Tap to start';
    }
  }

  // ─── Build ───

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: Colors.transparent,
      drawer: _buildHistoryDrawer(),
      drawerEnableOpenDragGesture: true,
      body: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        child: Container(
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(0, 0.2),
              radius: 1.2,
              colors: [
                Color(0xFF2D1F0D),
                Color(0xFF0D0D0D),
                Color(0xFF080808),
              ],
              stops: [0, 0.6, 1],
            ),
          ),
          child: SafeArea(
            child: Column(
              children: [
                // Top bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: Icon(Icons.history, color: AppTheme.muted, size: 22),
                        onPressed: () {
                          _fetchSessions();
                          _scaffoldKey.currentState?.openDrawer();
                        },
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.06),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          'Gemini Live',
                          style: TextStyle(
                            color: AppTheme.muted.withOpacity(0.6),
                            fontSize: 12,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.settings, color: AppTheme.muted, size: 22),
                        onPressed: () {},
                      ),
                    ],
                  ),
                ),

                // Transcript display
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 80, maxHeight: 200),
                    child: SingleChildScrollView(
                      child: _transcript.isNotEmpty
                          ? Text(
                              _transcript,
                              style: TextStyle(
                                color: AppTheme.foreground.withOpacity(0.8),
                                fontSize: 18,
                                height: 1.5,
                              ),
                            )
                          : const SizedBox.shrink(),
                    ),
                  ),
                ),

                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
                    child: Text(
                      _error!,
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppTheme.destructive.withOpacity(0.8), fontSize: 14),
                    ),
                  ),

                // Center sphere
                Expanded(
                  child: Center(
                    child: GestureDetector(
                      onTap: () {
                        if (_isInitializing) return;
                        if (_voiceState == VoiceState.listening || _voiceState == VoiceState.speaking) {
                          _stopListening();
                        } else if (_voiceState == VoiceState.idle) {
                          setState(() => _error = null);
                          _startListening();
                        }
                      },
                      child: _isInitializing
                          ? SizedBox(
                              width: 180,
                              height: 180,
                              child: Center(
                                child: CircularProgressIndicator(
                                  color: const Color(0xFFD4A030),
                                  strokeWidth: 2,
                                ),
                              ),
                            )
                          : VoiceChatVisualizer(state: _voiceState, size: 180),
                    ),
                  ),
                ),

                // Bottom controls
                Padding(
                  padding: const EdgeInsets.only(bottom: 16, left: 40, right: 40),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      GestureDetector(
                        onTap: _handleClose,
                        child: Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withOpacity(0.1),
                          ),
                          child: const Icon(Icons.close, color: Colors.white, size: 24),
                        ),
                      ),
                      Expanded(
                        child: Center(
                          child: Text(
                            _getStatusLabel(),
                            style: TextStyle(
                              color: AppTheme.muted,
                              fontSize: 16,
                            ),
                          ),
                        ),
                      ),
                      GestureDetector(
                        onTap: _toggleMute,
                        child: Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _isMuted
                                ? Colors.red.withOpacity(0.9)
                                : Colors.white.withOpacity(0.1),
                          ),
                          child: Icon(
                            _isMuted ? Icons.mic_off : Icons.mic,
                            color: Colors.white,
                            size: 22,
                          ),
                        ),
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

  Widget _buildHistoryDrawer() {
    return Drawer(
      backgroundColor: const Color(0xFF111111),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(16),
          bottomRight: Radius.circular(16),
        ),
      ),
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Voice History',
                    style: TextStyle(
                      color: AppTheme.foreground.withOpacity(0.9),
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: AppTheme.muted, size: 20),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            Divider(color: Colors.white.withOpacity(0.06), height: 1),
            Expanded(
              child: _loadingSessions
                  ? const Center(
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white38,
                        ),
                      ),
                    )
                  : _sessions.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.access_time, color: AppTheme.muted.withOpacity(0.3), size: 32),
                              const SizedBox(height: 12),
                              Text(
                                'No voice sessions yet',
                                style: TextStyle(
                                  color: AppTheme.muted.withOpacity(0.5),
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          itemCount: _sessions.length,
                          itemBuilder: (context, index) {
                            final session = _sessions[index];
                            final title = session['title'] ?? 'Untitled Session';
                            final createdAt = session['created_at'] ?? '';
                            return InkWell(
                              onTap: () {
                                Navigator.of(context).pop();
                              },
                              borderRadius: BorderRadius.circular(10),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      title,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: AppTheme.foreground.withOpacity(0.8),
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      _formatSessionDate(createdAt),
                                      style: TextStyle(
                                        color: AppTheme.muted.withOpacity(0.5),
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
