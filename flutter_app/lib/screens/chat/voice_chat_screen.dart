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

  Future<void> _startListening() async {
    if (!_voiceService.isInitialized) {
      setState(() => _error = 'Voice recognition not available');
      return;
    }

    setState(() {
      _error = null;
      _transcript = '';
      _voiceState = VoiceState.listening;
    });

    await _ttsService.stop();
    Timer? silenceTimer;

    await _voiceService.startListening(
      onResult: (text) {
        silenceTimer?.cancel();
        setState(() => _transcript = text);
        silenceTimer = Timer(const Duration(milliseconds: 800), () {
          _voiceService.stopListening();
          _sendMessage(text.trim());
        });
      },
      onPartialResult: (text) {
        silenceTimer?.cancel();
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
      _conversationHistory.add({'role': 'user', 'content': text});
      final url = '${AppConfig.supabaseUrl}/functions/v1/chat';
      final request = http.Request('POST', Uri.parse(url));
      final token = _supabase.auth.currentSession?.accessToken;
      request.headers.addAll({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${token ?? AppConfig.supabaseAnonKey}',
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
      backgroundColor: Colors.transparent,
      body: Container(
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
              // Top bar: Settings
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
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

              // Center sphere
              Expanded(
                child: Center(
                  child: VoiceChatVisualizer(state: _voiceState, size: 180),
                ),
              ),

              // Status text
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  _getStatusLabel(),
                  style: TextStyle(
                    color: AppTheme.muted,
                    fontSize: 16,
                  ),
                ),
              ),

              // Bottom controls
              Padding(
                padding: const EdgeInsets.only(bottom: 40, left: 40, right: 40),
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

                    const SizedBox(width: 32),

                    // Mic button (main)
                    GestureDetector(
                      onTap: () {
                        if (_voiceState == VoiceState.processing) return;
                        if (_voiceState == VoiceState.listening) {
                          _stopListening();
                        } else {
                          _startListening();
                        }
                      },
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _voiceState == VoiceState.listening
                              ? Colors.red.withOpacity(0.9)
                              : Colors.white.withOpacity(0.1),
                        ),
                        child: Icon(
                          _isMuted ? Icons.mic_off : Icons.mic,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                    ),

                    const SizedBox(width: 32),

                    // Keyboard button
                    GestureDetector(
                      onTap: () {
                        _handleClose();
                        // Could navigate to chat screen here
                      },
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withOpacity(0.1),
                        ),
                        child: const Icon(Icons.keyboard, color: Colors.white, size: 22),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
