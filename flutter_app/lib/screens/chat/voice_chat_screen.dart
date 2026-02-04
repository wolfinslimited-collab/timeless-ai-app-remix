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

// Fast model for voice chat - optimized for low latency
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
    
    // Set up auto-restart listening after speaking completes
    _ttsService.setOnSpeakingComplete(() {
      if (mounted && _voiceState == VoiceState.speaking) {
        // Small delay before restarting to feel natural
        Future.delayed(const Duration(milliseconds: 500), () {
          if (mounted) {
            _startListening();
          }
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

    // Stop any ongoing speech
    await _ttsService.stop();

    Timer? silenceTimer;

    await _voiceService.startListening(
      onResult: (text) {
        silenceTimer?.cancel();
        setState(() => _transcript = text);
        
        // Set a short silence timeout to detect end of speech
        silenceTimer = Timer(const Duration(milliseconds: 800), () {
          _voiceService.stopListening();
          _sendMessage(text.trim());
        });
      },
      onPartialResult: (text) {
        silenceTimer?.cancel();
        setState(() => _transcript = text);
        
        // Reset silence timer on partial results too
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

      final body = {
        'model': _voiceModel,
        'messages': _conversationHistory,
        'webSearch': false,
      };
      request.body = jsonEncode(body);

      final streamedResponse = await httpClient.send(request);

      if (streamedResponse.statusCode != 200) {
        throw Exception('Chat failed with status ${streamedResponse.statusCode}');
      }

      String buffer = '';
      String fullResponse = '';
      String sentenceBuffer = '';

      await for (final chunk in streamedResponse.stream.transform(utf8.decoder)) {
        buffer += chunk;

        // Process SSE events
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

              // Stream speech: queue smaller chunks for faster response
              sentenceBuffer += content;

              // Speak after shorter phrases (comma, period, question, exclamation, or 60+ chars)
              final phraseMatch = RegExp(r'^(.*?[.!?,;:])\s*').firstMatch(sentenceBuffer);
              if (phraseMatch != null && phraseMatch.group(1)!.length > 10) {
                final phrase = phraseMatch.group(1)!;
                sentenceBuffer = sentenceBuffer.substring(phraseMatch.end);
                
                if (!_isMuted) {
                  setState(() => _voiceState = VoiceState.speaking);
                  _ttsService.queueSpeech(phrase);
                }
              } else if (sentenceBuffer.length > 60) {
                // Speak longer chunks even without punctuation
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
          } catch (_) {
            // Incomplete JSON, continue
          }
        }
      }

      // Speak any remaining text
      if (sentenceBuffer.trim().isNotEmpty && !_isMuted) {
        _ttsService.queueSpeech(sentenceBuffer.trim());
      }

      // Add to conversation history
      if (fullResponse.isNotEmpty) {
        _conversationHistory.add({'role': 'assistant', 'content': fullResponse});
      }

      // If muted or nothing to speak, go back to idle
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            _buildHeader(),
            
            // Main content
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Visualization
                  VoiceChatVisualizer(state: _voiceState),
                  
                  const SizedBox(height: 32),
                  
                  // Transcript / Response
                  _buildTranscriptArea(),
                  
                  // Instructions
                  if (_voiceState == VoiceState.idle && _transcript.isEmpty && _response.isEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 24),
                      child: Text(
                        'Tap the microphone to start talking',
                        style: TextStyle(
                          color: AppTheme.muted,
                          fontSize: 14,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            
            // Mic button
            _buildMicButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppTheme.border, width: 1),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Status indicator
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: _getStatusColor(),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                _getStatusText(),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '• Flash mode',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.muted,
                ),
              ),
            ],
          ),
          
          // Actions
          Row(
            children: [
              IconButton(
                icon: Icon(
                  _isMuted ? Icons.volume_off : Icons.volume_up,
                  size: 20,
                ),
                onPressed: _toggleMute,
                tooltip: _isMuted ? 'Unmute' : 'Mute',
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 20),
                onPressed: _handleClose,
                tooltip: 'Close',
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getStatusColor() {
    switch (_voiceState) {
      case VoiceState.idle:
        return AppTheme.muted;
      case VoiceState.listening:
        return Colors.green;
      case VoiceState.processing:
        return Colors.amber;
      case VoiceState.speaking:
        return AppTheme.primary;
    }
  }

  String _getStatusText() {
    switch (_voiceState) {
      case VoiceState.idle:
        return 'Ready';
      case VoiceState.listening:
        return 'Listening';
      case VoiceState.processing:
        return 'Processing';
      case VoiceState.speaking:
        return 'Speaking';
    }
  }

  Widget _buildTranscriptArea() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          if (_transcript.isNotEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: AppTheme.secondary.withOpacity(0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'You said:',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppTheme.muted,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _transcript,
                    style: const TextStyle(fontSize: 14),
                  ),
                ],
              ),
            ),
          
          if (_response.isNotEmpty)
            Container(
              width: double.infinity,
              constraints: const BoxConstraints(maxHeight: 200),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'AI response:',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.muted,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      cleanMarkdown(_response),
                      style: const TextStyle(fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
          
          if (_error != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _error!,
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.red,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMicButton() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: GestureDetector(
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
                ? Colors.red
                : _voiceState == VoiceState.speaking
                    ? AppTheme.primary.withOpacity(0.5)
                    : AppTheme.primary,
            boxShadow: [
              BoxShadow(
                color: (_voiceState == VoiceState.listening
                        ? Colors.red
                        : AppTheme.primary)
                    .withOpacity(0.3),
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Icon(
            _voiceState == VoiceState.listening ? Icons.mic_off : Icons.mic,
            color: Colors.white,
            size: 28,
          ),
        ),
      ),
    );
  }
}
