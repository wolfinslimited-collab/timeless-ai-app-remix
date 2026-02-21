import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../core/http_client.dart';
import '../../services/voice_input_service.dart';
import '../../services/text_to_speech_service.dart';
import '../../utils/text_utils.dart';
import '../../widgets/voice_chat/voice_chat_visualizer.dart';

const String _voiceModel = 'gemini-3-flash';

class VoiceChatScreen extends StatefulWidget {
  const VoiceChatScreen({super.key});

  @override
  State<VoiceChatScreen> createState() => _VoiceChatScreenState();
}

class _VoiceChatScreenState extends State<VoiceChatScreen> {
  final VoiceInputService _voiceService = VoiceInputService();
  final TextToSpeechService _ttsService = TextToSpeechService();
  final _supabase = Supabase.instance.client;

  VoiceState _voiceState = VoiceState.idle;
  String _transcript = '';
  String _response = '';
  String? _error;
  bool _isMuted = false;
  
  final List<Map<String, String>> _conversationHistory = [];
  StreamSubscription? _streamSubscription;

  // History drawer state
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  List<Map<String, dynamic>> _sessions = [];
  bool _loadingSessions = false;

  @override
  void initState() {
    super.initState();
    _initServices();
  }

  Future<void> _initServices() async {
    await _voiceService.initialize();
    await _ttsService.initialize();
    
    _ttsService.setOnSpeakingComplete(() {
      if (mounted && _voiceState == VoiceState.speaking) {
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) _startListening();
        });
      }
    });
  }

  @override
  void dispose() {
    _streamSubscription?.cancel();
    _voiceService.cancelListening();
    _ttsService.stop();
    super.dispose();
  }

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

  /// Interrupt AI: stop TTS, clear queue, abort stream
  void _interruptAI() {
    _ttsService.stop();
    _streamSubscription?.cancel();
    _streamSubscription = null;
  }

  Future<void> _startListening() async {
    if (!_voiceService.isInitialized) {
      setState(() => _error = 'Voice recognition not available');
      return;
    }

    // If AI is speaking or processing, interrupt first
    if (_voiceState == VoiceState.speaking || _voiceState == VoiceState.processing) {
      _interruptAI();
    }

    setState(() {
      _error = null;
      _transcript = '';
      _response = '';
      _voiceState = VoiceState.listening;
    });

    await _ttsService.stop();
    Timer? silenceTimer;

    await _voiceService.startListening(
      onResult: (text) {
        silenceTimer?.cancel();
        // If AI is still speaking when user talks, interrupt
        if (_voiceState == VoiceState.speaking) {
          _interruptAI();
          setState(() => _voiceState = VoiceState.listening);
        }
        setState(() => _transcript = text);
        silenceTimer = Timer(const Duration(milliseconds: 800), () {
          _voiceService.stopListening();
          _sendMessage(text.trim());
        });
      },
      onPartialResult: (text) {
        silenceTimer?.cancel();
        // If AI is still speaking when user talks, interrupt
        if (_voiceState == VoiceState.speaking) {
          _interruptAI();
          setState(() => _voiceState = VoiceState.listening);
        }
        setState(() => _transcript = text);
        silenceTimer = Timer(const Duration(milliseconds: 800), () {
          if (_transcript.isNotEmpty) {
            _voiceService.stopListening();
            _sendMessage(_transcript.trim());
          }
        });
      },
      onListeningStopped: () {
        silenceTimer?.cancel();
        if (mounted && _voiceState == VoiceState.listening) {
          setState(() => _voiceState = VoiceState.idle);
        }
      },
    );
  }

  void _stopListening() {
    _voiceService.stopListening();
    setState(() => _voiceState = VoiceState.idle);
  }

  Future<void> _sendMessage(String text) async {
    if (text.isEmpty) {
      setState(() => _voiceState = VoiceState.idle);
      return;
    }

    setState(() {
      _voiceState = VoiceState.processing;
      _response = '';
      _error = null;
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

      // Check credits via REST API
      final creditsUrl = Uri.parse(
        '${AppConfig.supabaseUrl}/rest/v1/profiles?select=credits&user_id=eq.$userId',
      );
      final creditsRes = await http.get(creditsUrl, headers: {
        'apikey': AppConfig.supabaseAnonKey,
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      });
      if (creditsRes.statusCode == 200) {
        final creditsData = jsonDecode(creditsRes.body) as List;
        if (creditsData.isEmpty || (creditsData[0]['credits'] as int) < 1) {
          setState(() {
            _error = 'Insufficient credits';
            _voiceState = VoiceState.idle;
          });
          return;
        }
      }

      _conversationHistory.add({'role': 'user', 'content': text});
      final url = '${AppConfig.supabaseUrl}/functions/v1/chat';
      final request = http.Request('POST', Uri.parse(url));
      request.headers.addAll({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      });
      request.body = jsonEncode({
        'model': _voiceModel,
        'messages': _conversationHistory,
        'webSearch': false,
      });

      final streamedResponse = await httpClient.send(request);
      if (streamedResponse.statusCode != 200) {
        throw Exception('Chat failed with status ${streamedResponse.statusCode}');
      }

      String buffer = '';
      String fullResponse = '';
      String sentenceBuffer = '';

      await for (final chunk in streamedResponse.stream.transform(utf8.decoder)) {
        buffer += chunk;
        while (buffer.contains('\n')) {
          final newlineIndex = buffer.indexOf('\n');
          String line = buffer.substring(0, newlineIndex);
          buffer = buffer.substring(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.substring(0, line.length - 1);
          if (line.startsWith(':') || line.trim().isEmpty) continue;
          if (!line.startsWith('data: ')) continue;
          final jsonStr = line.substring(6).trim();
          if (jsonStr == '[DONE]') break;
          try {
            final parsed = jsonDecode(jsonStr) as Map<String, dynamic>;
            final content = parsed['choices']?[0]?['delta']?['content'] as String?;
            if (content != null) {
              fullResponse += content;
              setState(() => _response = fullResponse);
              sentenceBuffer += content;
              final phraseMatch = RegExp(r'^(.*?[.!?,;:])\s*').firstMatch(sentenceBuffer);
              if (phraseMatch != null && phraseMatch.group(1)!.length > 10) {
                final phrase = phraseMatch.group(1)!;
                sentenceBuffer = sentenceBuffer.substring(phraseMatch.end);
                if (!_isMuted) {
                  setState(() => _voiceState = VoiceState.speaking);
                  _ttsService.queueSpeech(phrase);
                }
              } else if (sentenceBuffer.length > 60) {
                final words = sentenceBuffer.split(' ');
                if (words.length > 5) {
                  final toSpeak = words.sublist(0, words.length - 1).join(' ');
                  sentenceBuffer = words.last;
                  if (!_isMuted) {
                    setState(() => _voiceState = VoiceState.speaking);
                    _ttsService.queueSpeech(toSpeak);
                  }
                }
              }
            }
          } catch (_) {}
        }
      }

      if (sentenceBuffer.trim().isNotEmpty && !_isMuted) {
        _ttsService.queueSpeech(sentenceBuffer.trim());
      }
      if (fullResponse.isNotEmpty) {
        _conversationHistory.add({'role': 'assistant', 'content': fullResponse});
      }
      if (_isMuted || !_ttsService.isSpeaking) {
        setState(() => _voiceState = VoiceState.idle);
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _voiceState = VoiceState.idle;
      });
    }
  }

  void _toggleMute() {
    setState(() => _isMuted = !_isMuted);
    if (_isMuted) {
      _ttsService.stop();
      if (_voiceState == VoiceState.speaking) {
        setState(() => _voiceState = VoiceState.idle);
      }
    }
  }

  void _handleClose() {
    _voiceService.cancelListening();
    _ttsService.stop();
    Navigator.of(context).pop();
  }

  String _getStatusLabel() {
    switch (_voiceState) {
      case VoiceState.listening:
        return 'Listening...';
      case VoiceState.processing:
        return 'Thinking...';
      case VoiceState.speaking:
        return '';
      case VoiceState.idle:
        return 'Say something...';
    }
  }

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
                // Top bar: History + Settings
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
                      IconButton(
                        icon: Icon(Icons.settings, color: AppTheme.muted, size: 22),
                        onPressed: () {},
                      ),
                    ],
                  ),
                ),

                // Response / transcript at top
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 80, maxHeight: 200),
                    child: SingleChildScrollView(
                      child: _response.isNotEmpty
                          ? Text(
                              cleanMarkdown(_response),
                              style: TextStyle(
                                color: AppTheme.foreground.withOpacity(0.8),
                                fontSize: 18,
                                height: 1.5,
                              ),
                            )
                          : _transcript.isNotEmpty
                              ? Text(
                                  _transcript,
                                  style: TextStyle(
                                    color: AppTheme.foreground.withOpacity(0.6),
                                    fontSize: 18,
                                  ),
                                )
                              : const SizedBox.shrink(),
                    ),
                  ),
                ),

                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      _error!,
                      style: TextStyle(color: AppTheme.destructive.withOpacity(0.8), fontSize: 14),
                    ),
                  ),

                // Center sphere - tappable to start/interrupt
                Expanded(
                  child: Center(
                    child: GestureDetector(
                      onTap: () {
                        if (_voiceState == VoiceState.listening) {
                          _stopListening();
                        } else if (_voiceState == VoiceState.speaking) {
                          // Interrupt AI and start listening
                          _startListening();
                        } else if (_voiceState == VoiceState.idle) {
                          _startListening();
                        }
                      },
                      child: VoiceChatVisualizer(state: _voiceState, size: 180),
                    ),
                  ),
                ),

                // Bottom controls with status in between
                Padding(
                  padding: const EdgeInsets.only(bottom: 16, left: 40, right: 40),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Close button
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

                      // Status text in the middle
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

                      // Mute toggle
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
            // Header
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

            // Session list
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
                                // TODO: Load session transcript
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
