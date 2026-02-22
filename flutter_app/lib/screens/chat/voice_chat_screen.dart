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
import 'package:web_socket_channel/io.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../widgets/voice_chat/voice_chat_visualizer.dart';

/// Flutter implementation of Ask AI voice chat using Gemini Live WebSocket
/// Mirrors the web AskAI.tsx exactly:
/// - Gets apiKey from edge function
/// - Connects directly to Gemini Live WebSocket
/// - Streams PCM16 16kHz mic audio
/// - Receives PCM16 24kHz audio and plays back with buffered WAV approach

const String _geminiWsUrl =
    'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

class VoiceChatScreen extends StatefulWidget {
  final bool autoStart;

  const VoiceChatScreen({super.key, this.autoStart = true});

  @override
  State<VoiceChatScreen> createState() => _VoiceChatScreenState();
}

class _VoiceChatScreenState extends State<VoiceChatScreen> {
  final _supabase = Supabase.instance.client;

  VoiceState _voiceState = VoiceState.idle;
  String _statusText = 'Tap to start';
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

  // Audio playback - buffer chunks per turn, play as single WAV on turnComplete
  final List<Uint8List> _turnAudioChunks = [];
  bool _isPlaying = false;
  AudioPlayer? _audioPlayer;

  // Transcript (matching web: liveUserText, liveAIText, transcript entries)
  final List<Map<String, String>> _transcriptEntries = [];
  String _liveUserText = '';
  String _liveAIText = '';

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
        if (mounted) _startSession();
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
    _stopAllAudio();
  }

  void _stopAllAudio() {
    _turnAudioChunks.clear();
    _isPlaying = false;
    _audioPlayer?.stop();
  }

  // ─── Start Session (matches web startSession) ───

  Future<void> _startSession() async {
    final token = _supabase.auth.currentSession?.accessToken;
    final userId = _supabase.auth.currentUser?.id;
    if (token == null || userId == null) {
      setState(() {
        _error = 'Please sign in to use voice chat';
        _voiceState = VoiceState.idle;
        _statusText = 'Tap to start';
      });
      return;
    }

    setState(() {
      _error = null;
      _voiceState = VoiceState.processing;
      _statusText = 'Connecting…';
    });

    try {
      // Step 1: Get API key from edge function (same as web)
      debugPrint('[VoiceChat] Requesting API key from edge function...');
      final tokenResp = await http.post(
        Uri.parse('${AppConfig.supabaseUrl}/functions/v1/gemini-live-token'),
        headers: {
          'Authorization': 'Bearer $token',
          'apikey': AppConfig.supabaseAnonKey,
          'Content-Type': 'application/json',
        },
      );

      if (tokenResp.statusCode != 200) {
        final errData = jsonDecode(tokenResp.body);
        throw Exception(errData['error'] ?? 'Failed to get API key: ${tokenResp.statusCode}');
      }

      final tokenData = jsonDecode(tokenResp.body);
      final apiKey = tokenData['apiKey'];
      if (apiKey == null) {
        throw Exception('No API key returned');
      }
      debugPrint('[VoiceChat] Got API key, opening WebSocket...');

      // Step 2: Connect WebSocket directly to Gemini (same as web)
      final wsUrl = '$_geminiWsUrl?key=$apiKey';

      try {
        final rawWs = await WebSocket.connect(wsUrl);
        _wsChannel = IOWebSocketChannel(rawWs);
      } catch (e) {
        debugPrint('[VoiceChat] WebSocket connect failed: $e');
        throw Exception('Failed to connect to voice service: $e');
      }

      debugPrint('[VoiceChat] WebSocket connected, sending setup...');

      // Step 3: Listen for messages
      _wsSubscription = _wsChannel!.stream.listen(
        _handleWsMessage,
        onError: (e) {
          debugPrint('[VoiceChat] WebSocket error: $e');
        },
        onDone: () {
          debugPrint('[VoiceChat] WebSocket closed');
          _isConnected = false;
          _keepaliveTimer?.cancel();
          _stopAllAudio();

          if (_isListening && _reconnectAttempts < _maxReconnectAttempts) {
            _reconnectAttempts++;
            debugPrint('[VoiceChat] Auto-reconnecting (attempt $_reconnectAttempts)...');
            setState(() {
              _error = 'Reconnecting...';
              _voiceState = VoiceState.processing;
              _statusText = 'Reconnecting…';
            });
            _micSubscription?.cancel();
            _recorder.stop();
            Future.delayed(const Duration(seconds: 1), () {
              if (mounted) _startSession();
            });
          } else if (_isListening) {
            setState(() {
              _error = 'Connection closed. Tap to reconnect.';
              _voiceState = VoiceState.idle;
              _statusText = 'Tap to retry';
            });
            _cleanup();
          }
        },
      );

      // Step 4: Send setup message (EXACTLY matching web)
      final setupMsg = {
        'setup': {
          'model': 'models/gemini-2.5-flash-native-audio-preview-12-2025',
          'generation_config': {
            'response_modalities': ['AUDIO'],
            'speech_config': {
              'voice_config': {
                'prebuilt_voice_config': {'voice_name': 'Aoede'},
              },
            },
          },
          'input_audio_transcription': {},
          'output_audio_transcription': {},
          'system_instruction': {
            'parts': [
              {
                'text':
                    'You are a helpful AI voice assistant. Keep your responses concise, natural, and conversational. Respond in the same language the user speaks.'
              }
            ],
          },
        },
      };
      debugPrint('[VoiceChat] Sending setup with model: ${setupMsg['setup']!['model']}');
      _wsChannel!.sink.add(jsonEncode(setupMsg));

      // Step 5: Start keepalive (15s silent audio, same as web)
      _keepaliveTimer?.cancel();
      _keepaliveTimer = Timer.periodic(const Duration(seconds: 15), (_) {
        if (_wsChannel != null && _isConnected) {
          final silence = Uint8List(320); // 10ms of silence at 16kHz
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
      debugPrint('[VoiceChat] Start session error: $e');
      if (mounted) {
        setState(() {
          _error = e.toString().replaceAll('Exception: ', '');
          _voiceState = VoiceState.idle;
          _statusText = 'Tap to retry';
        });
      }
    }
  }

  // ─── WebSocket Message Handling (matches web ws.onmessage) ───

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
      final keys = msg.keys.toList();
      debugPrint('[VoiceChat] WS msg keys: $keys');

      // setupComplete - start mic pipeline
      if (msg.containsKey('setupComplete')) {
        debugPrint('[VoiceChat] ✓ setupComplete! Starting mic pipeline.');
        _isConnected = true;
        _isListening = true;
        setState(() {
          _voiceState = VoiceState.listening;
          _statusText = 'Listening…';
        });
        _startMicCapture();
        return;
      }

      if (!msg.containsKey('serverContent')) return;

      final serverContent = msg['serverContent'] as Map<String, dynamic>;

      // Handle interrupted (matches web: msg?.serverContent?.interrupted)
      if (serverContent['interrupted'] == true) {
        debugPrint('[VoiceChat] AI interrupted');
        _stopAllAudio();
        // Commit any live AI text
        if (_liveAIText.isNotEmpty) {
          _transcriptEntries.add({'role': 'assistant', 'text': _liveAIText});
          _liveAIText = '';
        }
        if (mounted) setState(() {});
        return;
      }

      // Handle model turn parts (audio + transcription)
      final modelTurn = serverContent['modelTurn'] as Map<String, dynamic>?;
      if (modelTurn != null) {
        final parts = modelTurn['parts'] as List<dynamic>?;
        if (parts != null) {
          bool gotAudio = false;
          for (final part in parts) {
            final partMap = part as Map<String, dynamic>;

            // Audio data
            final inlineData = partMap['inlineData'] as Map<String, dynamic>?;
            if (inlineData != null) {
              final mimeType = inlineData['mimeType']?.toString() ?? '';
              if (mimeType.startsWith('audio/') && inlineData['data'] != null) {
                final audioBytes = base64Decode(inlineData['data'] as String);
                _turnAudioChunks.add(Uint8List.fromList(audioBytes));
                gotAudio = true;
              }
            }
            // Ignore text parts in audio mode (they contain internal thinking)
          }
          if (gotAudio && _voiceState != VoiceState.speaking) {
            setState(() {
              _voiceState = VoiceState.speaking;
              _statusText = 'Speaking…';
            });
          }
        }
      }

      // Handle output transcription (AI speech → text)
      final outputT = serverContent['outputTranscription'] as Map<String, dynamic>?;
      if (outputT != null && outputT['text'] != null) {
        _liveAIText += outputT['text'] as String;
        if (mounted) setState(() {});
      }

      // Handle input transcription (user speech → text)
      final inputT = serverContent['inputTranscription'] as Map<String, dynamic>?;
      if (inputT != null && inputT['text'] != null) {
        _liveUserText += inputT['text'] as String;
        if (mounted) setState(() {});
      }
      // Commit user text when finished
      if (inputT != null && inputT['finished'] == true && _liveUserText.isNotEmpty) {
        _transcriptEntries.add({'role': 'user', 'text': _liveUserText});
        _liveUserText = '';
        if (mounted) setState(() {});
      }

      // Turn complete (matches web: msg?.serverContent?.turnComplete)
      if (serverContent['turnComplete'] == true) {
        debugPrint('[VoiceChat] Turn complete, chunks: ${_turnAudioChunks.length}');

        // Commit live user text
        if (_liveUserText.isNotEmpty) {
          _transcriptEntries.add({'role': 'user', 'text': _liveUserText});
          _liveUserText = '';
        }
        // Commit live AI text
        if (_liveAIText.isNotEmpty) {
          _transcriptEntries.add({'role': 'assistant', 'text': _liveAIText});
          _liveAIText = '';
        }

        // Play accumulated audio
        if (_turnAudioChunks.isNotEmpty) {
          _playTurnAudio();
        } else if (!_isPlaying) {
          if (_isConnected && _isListening) {
            setState(() {
              _voiceState = VoiceState.listening;
              _statusText = 'Listening…';
            });
          }
        }
        if (mounted) setState(() {});
      }
    } catch (e, stack) {
      debugPrint('[VoiceChat] WS message error: $e\n$stack');
    }
  }

  // ─── Microphone Capture (matches web startMicPipeline) ───

  Future<void> _startMicCapture() async {
    try {
      final hasPermission = await _recorder.hasPermission();
      if (!hasPermission) {
        setState(() {
          _error = 'Microphone access denied';
          _voiceState = VoiceState.idle;
          _statusText = 'Tap to start';
        });
        _cleanup();
        return;
      }

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

      int chunkCount = 0;
      _micSubscription = stream.listen((data) {
        if (!_isListening || _isMuted || _wsChannel == null || !_isConnected) return;

        // Do NOT do client-side interrupt detection — the web relies on
        // Gemini's server-side interruption (serverContent.interrupted).
        // Client-side detection picks up the AI's own speaker output and
        // kills playback before it even starts.

        // Send PCM audio to Gemini (matches web processor.onaudioprocess)
        final b64 = base64Encode(data);
        try {
          _wsChannel?.sink.add(jsonEncode({
            'realtime_input': {
              'media_chunks': [
                {'data': b64, 'mime_type': 'audio/pcm;rate=16000'}
              ]
            }
          }));
          chunkCount++;
          if (chunkCount % 50 == 1) {
            debugPrint('[VoiceChat] Mic: sent $chunkCount chunks');
          }
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
        _statusText = 'Tap to start';
      });
      _cleanup();
    }
  }

  bool _hasSignificantAudio(Uint8List data) {
    if (data.length < 4) return false;
    double sum = 0;
    int count = 0;
    for (int i = 0; i < data.length - 1; i += 2) {
      int sample = data[i] | (data[i + 1] << 8);
      if (sample > 32767) sample -= 65536;
      sum += (sample * sample).toDouble();
      count++;
    }
    if (count == 0) return false;
    return sqrt(sum / count) > 500;
  }

  // ─── Audio Playback ───

  Future<void> _playTurnAudio() async {
    if (_turnAudioChunks.isEmpty) return;

    // Combine all PCM chunks
    int totalLen = 0;
    for (final c in _turnAudioChunks) totalLen += c.length;
    final combined = Uint8List(totalLen);
    int offset = 0;
    for (final c in _turnAudioChunks) {
      combined.setRange(offset, offset + c.length, c);
      offset += c.length;
    }
    _turnAudioChunks.clear();

    debugPrint('[VoiceChat] Playing turn audio: $totalLen bytes (${totalLen ~/ 48000} seconds @ 24kHz)');

    _isPlaying = true;
    if (mounted) {
      setState(() {
        _voiceState = VoiceState.speaking;
        _statusText = 'Speaking…';
      });
    }

    try {
      final wavData = _pcmToWav(combined, sampleRate: 24000);
      debugPrint('[VoiceChat] WAV created: ${wavData.length} bytes');

      _audioPlayer?.dispose();
      _audioPlayer = AudioPlayer();

      // Use BytesSource to play from memory (more reliable than temp files)
      await _audioPlayer!.play(BytesSource(wavData));
      debugPrint('[VoiceChat] AudioPlayer.play() called successfully');

      // Wait for playback to complete
      await _audioPlayer!.onPlayerComplete.first.timeout(
        const Duration(seconds: 120),
        onTimeout: () {
          debugPrint('[VoiceChat] Playback timeout after 120s');
          return null;
        },
      );
      debugPrint('[VoiceChat] Playback completed');
    } catch (e) {
      debugPrint('[VoiceChat] Playback error: $e');
    }

    _isPlaying = false;
    if (_isConnected && _isListening && mounted) {
      setState(() {
        _voiceState = VoiceState.listening;
        _statusText = 'Listening…';
      });
    }
  }

  Uint8List _pcmToWav(Uint8List pcmData, {int sampleRate = 24000, int channels = 1, int bitsPerSample = 16}) {
    final dataSize = pcmData.length;
    final fileSize = 36 + dataSize;
    final byteRate = sampleRate * channels * (bitsPerSample ~/ 8);
    final blockAlign = channels * (bitsPerSample ~/ 8);

    final header = ByteData(44);
    header.setUint8(0, 0x52); header.setUint8(1, 0x49); header.setUint8(2, 0x46); header.setUint8(3, 0x46);
    header.setUint32(4, fileSize, Endian.little);
    header.setUint8(8, 0x57); header.setUint8(9, 0x41); header.setUint8(10, 0x56); header.setUint8(11, 0x45);
    header.setUint8(12, 0x66); header.setUint8(13, 0x6D); header.setUint8(14, 0x74); header.setUint8(15, 0x20);
    header.setUint32(16, 16, Endian.little);
    header.setUint16(20, 1, Endian.little);
    header.setUint16(22, channels, Endian.little);
    header.setUint32(24, sampleRate, Endian.little);
    header.setUint32(28, byteRate, Endian.little);
    header.setUint16(32, blockAlign, Endian.little);
    header.setUint16(34, bitsPerSample, Endian.little);
    header.setUint8(36, 0x64); header.setUint8(37, 0x61); header.setUint8(38, 0x74); header.setUint8(39, 0x61);
    header.setUint32(40, dataSize, Endian.little);

    final wav = Uint8List(44 + dataSize);
    wav.setRange(0, 44, header.buffer.asUint8List());
    wav.setRange(44, 44 + dataSize, pcmData);
    return wav;
  }

  // ─── User Actions ───

  void _handleOrbTap() {
    if (_isInitializing) return;
    if (_voiceState == VoiceState.listening || _voiceState == VoiceState.speaking) {
      _stopListening();
    } else if (_voiceState == VoiceState.idle) {
      setState(() => _error = null);
      _startSession();
    }
  }

  void _stopListening() {
    _cleanup();
    setState(() {
      _voiceState = VoiceState.idle;
      _statusText = 'Tap to start';
    });
  }

  void _toggleMute() {
    setState(() {
      _isMuted = !_isMuted;
      if (_isMuted) {
        _statusText = 'Muted';
        _stopAllAudio();
      } else if (_voiceState == VoiceState.listening) {
        _statusText = 'Listening…';
      }
    });
  }

  void _handleClose() {
    _cleanup();
    Navigator.of(context).pop();
  }

  // ─── Sessions ───

  Future<void> _fetchSessions() async {
    setState(() => _loadingSessions = true);
    try {
      final token = _supabase.auth.currentSession?.accessToken;
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null || token == null) {
        setState(() { _sessions = []; _loadingSessions = false; });
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
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${date.month}/${date.day}';
  }

  // ─── Build ───

  @override
  Widget build(BuildContext context) {
    final hasTranscript = _transcriptEntries.isNotEmpty || _liveUserText.isNotEmpty || _liveAIText.isNotEmpty;

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
              colors: [Color(0xFF2D1F0D), Color(0xFF0D0D0D), Color(0xFF080808)],
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
                          style: TextStyle(color: AppTheme.muted.withOpacity(0.6), fontSize: 12),
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.settings, color: AppTheme.muted, size: 22),
                        onPressed: () {},
                      ),
                    ],
                  ),
                ),

                // Transcript area
                if (hasTranscript)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 200),
                      child: SingleChildScrollView(
                        reverse: true,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ..._transcriptEntries.map((e) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    e['role'] == 'user' ? 'You' : 'AI',
                                    style: TextStyle(
                                      color: e['role'] == 'user'
                                          ? AppTheme.primary.withOpacity(0.7)
                                          : AppTheme.muted.withOpacity(0.7),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    e['text'] ?? '',
                                    style: TextStyle(
                                      color: AppTheme.foreground.withOpacity(0.8),
                                      fontSize: 14,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            )),
                            if (_liveUserText.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('You', style: TextStyle(color: AppTheme.primary.withOpacity(0.7), fontSize: 11, fontWeight: FontWeight.w600)),
                                    const SizedBox(height: 2),
                                    Text(_liveUserText, style: TextStyle(color: AppTheme.foreground.withOpacity(0.6), fontSize: 14, height: 1.4)),
                                  ],
                                ),
                              ),
                            if (_liveAIText.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('AI', style: TextStyle(color: AppTheme.muted.withOpacity(0.7), fontSize: 11, fontWeight: FontWeight.w600)),
                                    const SizedBox(height: 2),
                                    Text(_liveAIText, style: TextStyle(color: AppTheme.foreground.withOpacity(0.6), fontSize: 14, height: 1.4)),
                                  ],
                                ),
                              ),
                          ],
                        ),
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
                      onTap: _handleOrbTap,
                      child: _isInitializing
                          ? const SizedBox(
                              width: 180, height: 180,
                              child: Center(child: CircularProgressIndicator(color: Color(0xFFD4A030), strokeWidth: 2)),
                            )
                          : VoiceChatVisualizer(state: _voiceState, size: 180),
                    ),
                  ),
                ),

                // Status text
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    _statusText,
                    style: TextStyle(color: AppTheme.muted, fontSize: 16),
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
                          width: 56, height: 56,
                          decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.1)),
                          child: const Icon(Icons.close, color: Colors.white, size: 24),
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: _toggleMute,
                        child: Container(
                          width: 56, height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _isMuted ? Colors.red.withOpacity(0.9) : Colors.white.withOpacity(0.1),
                          ),
                          child: Icon(_isMuted ? Icons.mic_off : Icons.mic, color: Colors.white, size: 22),
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
        borderRadius: BorderRadius.only(topRight: Radius.circular(16), bottomRight: Radius.circular(16)),
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
                  Text('Voice History', style: TextStyle(color: AppTheme.foreground.withOpacity(0.9), fontSize: 16, fontWeight: FontWeight.w600)),
                  IconButton(icon: Icon(Icons.close, color: AppTheme.muted, size: 20), onPressed: () => Navigator.of(context).pop()),
                ],
              ),
            ),
            Divider(color: Colors.white.withOpacity(0.06), height: 1),
            Expanded(
              child: _loadingSessions
                  ? const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white38)))
                  : _sessions.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.access_time, color: AppTheme.muted.withOpacity(0.3), size: 32),
                              const SizedBox(height: 12),
                              Text('No voice sessions yet', style: TextStyle(color: AppTheme.muted.withOpacity(0.5), fontSize: 14)),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          itemCount: _sessions.length,
                          itemBuilder: (context, index) {
                            final session = _sessions[index];
                            return InkWell(
                              onTap: () => Navigator.of(context).pop(),
                              borderRadius: BorderRadius.circular(10),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      session['title'] ?? 'Untitled',
                                      maxLines: 1, overflow: TextOverflow.ellipsis,
                                      style: TextStyle(color: AppTheme.foreground.withOpacity(0.8), fontSize: 14, fontWeight: FontWeight.w500),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      _formatSessionDate(session['created_at'] ?? ''),
                                      style: TextStyle(color: AppTheme.muted.withOpacity(0.5), fontSize: 12),
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
