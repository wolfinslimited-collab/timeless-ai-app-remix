import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../services/notify_service.dart';

/// Parse question options from AI response with **bold** markers
class ParsedQuestion {
  final String text;
  final List<String> options;

  ParsedQuestion({required this.text, required this.options});
}

/// Parse AI response to detect question patterns with options
ParsedQuestion? parseQuestionFromContent(String content) {
  // Pattern: Look for questions with **bold** options
  final patterns = [
    RegExp(r'Would you like.*?\*\*([^*]+)\*\*.*?or.*?\*\*([^*]+)\*\*', caseSensitive: false),
    RegExp(r'[Ss]hould.*?(?:be|this).*?\*\*([^*]+)\*\*.*?or.*?\*\*([^*]+)\*\*', caseSensitive: false),
    RegExp(r'(?:choose|prefer|want).*?\*\*([^*]+)\*\*.*?or.*?\*\*([^*]+)\*\*', caseSensitive: false),
    RegExp(r'\*\*([^*]+)\*\*.*?or.*?\*\*([^*]+)\*\*\?', caseSensitive: false),
  ];

  for (final pattern in patterns) {
    final match = pattern.firstMatch(content);
    if (match != null && match.groupCount >= 2) {
      final option1 = match.group(1)?.trim();
      final option2 = match.group(2)?.trim();
      if (option1 != null && option2 != null) {
        // Extract the question text (everything before the options or the full sentence)
        final questionEndIndex = content.indexOf('?');
        final questionText = questionEndIndex != -1
            ? content.substring(0, questionEndIndex + 1)
            : content.split('\n').first;

        return ParsedQuestion(
          text: questionText,
          options: [option1, option2],
        );
      }
    }
  }

  return null;
}

class NotifyAIScreen extends StatefulWidget {
  const NotifyAIScreen({super.key});

  @override
  State<NotifyAIScreen> createState() => _NotifyAIScreenState();
}

class _NotifyAIScreenState extends State<NotifyAIScreen>
    with SingleTickerProviderStateMixin {
  final NotifyService _notifyService = NotifyService();
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  late TabController _tabController;

  List<NotifyMessage> _messages = [];
  List<Map<String, dynamic>> _conversationHistory = [];
  List<NotificationItem> _notifications = [];
  List<NotificationHistory> _history = [];
  bool _isLoading = false;
  String _streamingContent = '';
  Map<String, dynamic>? _pendingNotification;
  bool _isConfirming = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final notifications = await _notifyService.getNotifications();
    final history = await _notifyService.getHistory();
    setState(() {
      _notifications = notifications;
      _history = history;
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? text]) async {
    final message = text ?? _inputController.text.trim();
    if (message.isEmpty || _isLoading) return;

    // Add user message to UI
    setState(() {
      _messages.add(NotifyMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: 'user',
        content: message,
        createdAt: DateTime.now(),
      ));
      _isLoading = true;
      _streamingContent = '';
    });
    _inputController.clear();
    _scrollToBottom();

    // Add to conversation history for API
    _conversationHistory.add({'role': 'user', 'content': message});

    try {
      await _streamChatResponse(message);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _streamChatResponse(String userMessage) async {
    final supabase = Supabase.instance.client;
    final session = supabase.auth.currentSession;
    if (session == null) return;

    final url = '${AppConfig.supabaseUrl}/functions/v1/notify-ai';
    final timezone = DateTime.now().timeZoneName;
    final timezoneOffset = DateTime.now().timeZoneOffset.inMinutes;

    final request = http.Request('POST', Uri.parse(url));
    request.headers.addAll({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${session.accessToken}',
    });
    request.body = jsonEncode({
      'messages': _conversationHistory,
      'timezone': timezone,
      'timezoneOffset': timezoneOffset,
    });

    final response = await http.Client().send(request);

    if (response.statusCode != 200) {
      throw Exception('Chat failed: ${response.statusCode}');
    }

    String buffer = '';
    String fullContent = '';
    Map<String, dynamic>? toolCall;
    String toolCallArgs = '';

    await for (final chunk in response.stream.transform(utf8.decoder)) {
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
          final choices = parsed['choices'] as List?;
          if (choices == null || choices.isEmpty) continue;

          final delta = choices[0]['delta'] as Map<String, dynamic>?;
          if (delta == null) continue;

          // Handle text content
          final content = delta['content'] as String?;
          if (content != null) {
            fullContent += content;
            setState(() {
              _streamingContent = fullContent;
            });
            _scrollToBottom();
          }

          // Handle tool calls
          final toolCalls = delta['tool_calls'] as List?;
          if (toolCalls != null && toolCalls.isNotEmpty) {
            final tc = toolCalls[0] as Map<String, dynamic>;
            final function = tc['function'] as Map<String, dynamic>?;
            if (function != null) {
              if (function['name'] != null) {
                toolCall = {'name': function['name'], 'arguments': ''};
              }
              if (function['arguments'] != null) {
                toolCallArgs += function['arguments'] as String;
              }
            }
          }
        } catch (_) {
          // Incomplete JSON, continue
        }
      }
    }

    // Finalize message
    if (fullContent.isNotEmpty || toolCall != null) {
      // Add assistant response to conversation history
      _conversationHistory.add({'role': 'assistant', 'content': fullContent});

      // Handle tool call if present
      Map<String, dynamic>? parsedArgs;
      if (toolCall != null && toolCallArgs.isNotEmpty) {
        try {
          parsedArgs = jsonDecode(toolCallArgs) as Map<String, dynamic>;
          if (toolCall['name'] == 'create_notification') {
            setState(() {
              _pendingNotification = parsedArgs;
            });
          }
        } catch (e) {
          debugPrint('Error parsing tool call args: $e');
        }
      }

      setState(() {
        _messages.add(NotifyMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: 'assistant',
          content: fullContent,
          createdAt: DateTime.now(),
          toolCall: toolCall != null && parsedArgs != null
              ? {'name': toolCall['name'], 'arguments': parsedArgs}
              : null,
        ));
        _streamingContent = '';
      });
    }

    _scrollToBottom();
    _loadData();
  }

  Future<void> _confirmNotification() async {
    if (_pendingNotification == null || _isConfirming) return;

    setState(() => _isConfirming = true);

    final result = await _notifyService.saveNotification(
      _pendingNotification!,
      _messages.isNotEmpty ? _messages.first.content : '',
    );

    setState(() {
      _isConfirming = false;
      _pendingNotification = null;
    });

    if (result != null && result['success'] == true) {
      // Add confirmation message
      setState(() {
        _messages.add(NotifyMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: 'assistant',
          content: "✅ I've set up your notification. You can view and manage it in the Active tab.",
          createdAt: DateTime.now(),
        ));
      });
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Notification created successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      _loadData();
      _tabController.animateTo(1); // Switch to Active tab
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result?['error'] ?? 'Failed to create notification'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _cancelNotification() {
    setState(() {
      _pendingNotification = null;
    });
  }

  void _startNewChat() {
    setState(() {
      _messages = [];
      _conversationHistory = [];
      _streamingContent = '';
      _pendingNotification = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.amber.withOpacity(0.2),
                    Colors.orange.withOpacity(0.2),
                  ],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.notifications_active, color: Colors.amber),
            ),
            const SizedBox(width: 12),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Notify AI', style: TextStyle(fontSize: 18)),
                Text(
                  'Smart Notifications',
                  style: TextStyle(fontSize: 12, color: AppTheme.muted),
                ),
              ],
            ),
          ],
        ),
        actions: [
          if (_messages.isNotEmpty)
            IconButton(
              onPressed: _startNewChat,
              icon: const Icon(Icons.add),
              tooltip: 'New Chat',
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(icon: Icon(Icons.chat_bubble_outline), text: 'Chat'),
            Tab(icon: Icon(Icons.notifications_active_outlined), text: 'Active'),
            Tab(icon: Icon(Icons.history), text: 'History'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildChatTab(),
          _buildActiveTab(),
          _buildHistoryTab(),
        ],
      ),
    );
  }

  Widget _buildChatTab() {
    return Column(
      children: [
        Expanded(
          child: _messages.isEmpty && _streamingContent.isEmpty
              ? _buildEmptyChat()
              : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length +
                      (_streamingContent.isNotEmpty ? 1 : 0) +
                      (_isLoading && _streamingContent.isEmpty ? 1 : 0),
                  itemBuilder: (context, index) {
                    // Show typing indicator
                    if (_isLoading &&
                        _streamingContent.isEmpty &&
                        index == _messages.length) {
                      return _buildTypingIndicator();
                    }
                    // Show streaming content
                    if (_streamingContent.isNotEmpty &&
                        index == _messages.length) {
                      return _buildMessage(
                        NotifyMessage(
                          id: 'streaming',
                          role: 'assistant',
                          content: _streamingContent,
                          createdAt: DateTime.now(),
                        ),
                        isLast: true,
                      );
                    }
                    final isLast = index == _messages.length - 1;
                    return _buildMessage(_messages[index], isLast: isLast);
                  },
                ),
        ),
        _buildInputArea(),
      ],
    );
  }

  Widget _buildTypingIndicator() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.amber.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.smart_toy, color: Colors.amber, size: 20),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                SizedBox(width: 8),
                Text('Thinking...', style: TextStyle(color: AppTheme.muted)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyChat() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 40),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.amber.withOpacity(0.2),
                  Colors.orange.withOpacity(0.2),
                ],
              ),
              borderRadius: BorderRadius.circular(24),
            ),
            child: const Icon(
              Icons.notifications_active,
              size: 64,
              color: Colors.amber,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Create Smart Notifications',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          const Text(
            'Tell me what you want to be notified about and I\'ll set it up for you.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.muted),
          ),
          const SizedBox(height: 32),
          const Text(
            'Try these suggestions:',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          ...NotifyService.quickSuggestions.take(6).map(
                (s) => _buildSuggestionChip(s),
              ),
        ],
      ),
    );
  }

  Widget _buildSuggestionChip(QuickSuggestion suggestion) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => _sendMessage(suggestion.text),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.secondary,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppTheme.border),
          ),
          child: Row(
            children: [
              Text(suggestion.icon, style: const TextStyle(fontSize: 20)),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  suggestion.text,
                  style: const TextStyle(fontSize: 13),
                ),
              ),
              const Icon(Icons.arrow_forward_ios, size: 14, color: AppTheme.muted),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMessage(NotifyMessage message, {bool isLast = false}) {
    final isUser = message.role == 'user';
    final hasToolCall = message.toolCall != null && _pendingNotification != null;
    
    // Parse question options for the last assistant message
    final parsedQuestion = !isUser && isLast && !hasToolCall && !_isLoading
        ? parseQuestionFromContent(message.content)
        : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: isUser ? _buildUserMessage(message) : _buildAssistantMessage(message, parsedQuestion, hasToolCall),
    );
  }

  Widget _buildUserMessage(NotifyMessage message) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Flexible(
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: const BoxDecoration(
              color: AppTheme.primary,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(4),
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
            ),
            child: Text(
              message.content,
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.secondary,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.person, size: 20, color: AppTheme.muted),
        ),
      ],
    );
  }

  Widget _buildAssistantMessage(NotifyMessage message, ParsedQuestion? parsedQuestion, bool hasToolCall) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.amber.withOpacity(0.2),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Icon(Icons.smart_toy, color: Colors.amber, size: 20),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Question card with options
              if (parsedQuestion != null)
                _buildQuestionCard(parsedQuestion)
              else if (message.content.isNotEmpty)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(4),
                      topRight: Radius.circular(16),
                      bottomLeft: Radius.circular(16),
                      bottomRight: Radius.circular(16),
                    ),
                  ),
                  child: _buildFormattedText(message.content),
                ),
              
              // Inline notification preview card
              if (hasToolCall && message.toolCall != null)
                _buildInlineNotificationCard(message.toolCall!),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQuestionCard(ParsedQuestion question) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildFormattedText(question.text),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: question.options.map((option) {
              return OutlinedButton(
                onPressed: _isLoading ? null : () => _sendMessage(option),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.foreground,
                  side: BorderSide(color: AppTheme.border),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                ),
                child: Text(option),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildFormattedText(String text) {
    // Parse **bold** text
    final parts = <InlineSpan>[];
    final boldPattern = RegExp(r'\*\*([^*]+)\*\*');
    int lastIndex = 0;

    for (final match in boldPattern.allMatches(text)) {
      // Add text before match
      if (match.start > lastIndex) {
        parts.add(TextSpan(
          text: text.substring(lastIndex, match.start),
          style: const TextStyle(color: AppTheme.foreground),
        ));
      }
      // Add bold text
      parts.add(TextSpan(
        text: match.group(1),
        style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.foreground),
      ));
      lastIndex = match.end;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.add(TextSpan(
        text: text.substring(lastIndex),
        style: const TextStyle(color: AppTheme.foreground),
      ));
    }

    if (parts.isEmpty) {
      return Text(text, style: const TextStyle(color: AppTheme.foreground));
    }

    return RichText(text: TextSpan(children: parts));
  }

  Widget _buildInlineNotificationCard(Map<String, dynamic> toolCall) {
    final args = toolCall['arguments'] as Map<String, dynamic>?;
    if (args == null) return const SizedBox();

    final title = args['title'] as String? ?? 'New Notification';
    final config = args['condition_config'] as Map<String, dynamic>? ?? {};
    final repeat = config['repeat'] as String?;
    final triggerTime = config['trigger_time'] as String? ?? config['trigger_at'] as String?;

    // Format schedule text
    String scheduleText = 'Ready to create';
    if (triggerTime != null) {
      try {
        final date = DateTime.parse(triggerTime);
        final timeStr = '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
        if (repeat == 'daily') {
          scheduleText = 'Daily at $timeStr';
        } else if (repeat == 'weekly') {
          final days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          final dayStr = days[date.weekday - 1];
          scheduleText = 'Weekly on $dayStr at $timeStr';
        } else {
          scheduleText = '${date.day}/${date.month}/${date.year}';
        }
      } catch (_) {}
    }

    return Container(
      margin: const EdgeInsets.only(top: 12),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        scheduleText,
                        style: const TextStyle(color: AppTheme.muted, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => _showNotificationOptions(),
                  icon: const Icon(Icons.more_horiz, size: 20),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              children: [
                ElevatedButton(
                  onPressed: _isConfirming ? null : _confirmNotification,
                  style: ElevatedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  ),
                  child: _isConfirming
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Create'),
                ),
                const SizedBox(width: 8),
                OutlinedButton(
                  onPressed: _cancelNotification,
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                  ),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                Row(
                  children: [
                    Icon(Icons.toll, size: 14, color: AppTheme.muted.withOpacity(0.7)),
                    const SizedBox(width: 4),
                    Text(
                      '1 credit',
                      style: TextStyle(color: AppTheme.muted.withOpacity(0.7), fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showNotificationOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.check_circle, color: Colors.green),
              title: const Text('Create'),
              onTap: () {
                Navigator.pop(context);
                _confirmNotification();
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Colors.red),
              title: const Text('Cancel', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(context);
                _cancelNotification();
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.card,
        border: Border(top: BorderSide(color: AppTheme.border.withOpacity(0.5))),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: TextField(
                  controller: _inputController,
                  decoration: const InputDecoration(
                    hintText: 'Tell me what to notify you about...',
                    hintStyle: TextStyle(color: AppTheme.muted),
                    border: InputBorder.none,
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _isLoading ? null : () => _sendMessage(),
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _isLoading ? AppTheme.muted : Colors.amber,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: _isLoading
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.send, size: 20, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveTab() {
    if (_notifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_off,
                size: 64, color: AppTheme.muted.withOpacity(0.5)),
            const SizedBox(height: 16),
            const Text(
              'No active notifications',
              style: TextStyle(color: AppTheme.muted),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _tabController.animateTo(0),
              icon: const Icon(Icons.add),
              label: const Text('Create One'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _notifications.length,
        itemBuilder: (context, index) {
          final notification = _notifications[index];
          return _buildNotificationCard(notification);
        },
      ),
    );
  }

  Widget _buildNotificationCard(NotificationItem notification) {
    final icon = _notifyService.getNotificationTypeIcon(notification.type);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppTheme.secondary,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(icon, style: const TextStyle(fontSize: 24)),
        ),
        title: Text(notification.title),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(notification.description),
            const SizedBox(height: 4),
            Row(
              children: [
                _buildStatusBadge(notification.status),
                const SizedBox(width: 8),
                Text(
                  '${notification.triggerCount}x triggered',
                  style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                ),
              ],
            ),
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (action) =>
              _handleNotificationAction(notification, action),
          itemBuilder: (context) => [
            PopupMenuItem(
              value: notification.isPaused ? 'resume' : 'pause',
              child: Row(
                children: [
                  Icon(
                    notification.isPaused ? Icons.play_arrow : Icons.pause,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(notification.isPaused ? 'Resume' : 'Pause'),
                ],
              ),
            ),
            const PopupMenuItem(
              value: 'delete',
              child: Row(
                children: [
                  Icon(Icons.delete, size: 20, color: Colors.red),
                  SizedBox(width: 8),
                  Text('Delete', style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    switch (status) {
      case 'active':
        color = Colors.green;
        break;
      case 'paused':
        color = Colors.orange;
        break;
      case 'triggered':
        color = Colors.blue;
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        status.toUpperCase(),
        style:
            TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Future<void> _handleNotificationAction(
      NotificationItem notification, String action) async {
    bool success = false;

    switch (action) {
      case 'pause':
        success = await _notifyService.pauseNotification(notification.id);
        break;
      case 'resume':
        success = await _notifyService.resumeNotification(notification.id);
        break;
      case 'delete':
        success = await _notifyService.deleteNotification(notification.id);
        break;
    }

    if (success) {
      _loadData();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Notification ${action}d successfully')),
      );
    }
  }

  Widget _buildHistoryTab() {
    if (_history.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history,
                size: 64, color: AppTheme.muted.withOpacity(0.5)),
            const SizedBox(height: 16),
            const Text(
              'No notification history',
              style: TextStyle(color: AppTheme.muted),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _history.length,
        itemBuilder: (context, index) {
          final item = _history[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(
                item.isRead ? Icons.mark_email_read : Icons.mark_email_unread,
                color: item.isRead ? AppTheme.muted : Colors.amber,
              ),
              title: Text(item.title),
              subtitle:
                  Text(item.body, maxLines: 2, overflow: TextOverflow.ellipsis),
              trailing: Text(
                _formatTime(item.createdAt),
                style: const TextStyle(color: AppTheme.muted, fontSize: 12),
              ),
              onTap: () {
                if (!item.isRead) {
                  _notifyService.markHistoryAsRead(item.id);
                  _loadData();
                }
              },
            ),
          );
        },
      ),
    );
  }

  String _formatTime(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) return 'Just now';
      if (diff.inHours < 1) return '${diff.inMinutes}m ago';
      if (diff.inDays < 1) return '${diff.inHours}h ago';
      if (diff.inDays < 7) return '${diff.inDays}d ago';
      return '${date.day}/${date.month}/${date.year}';
    } catch (_) {
      return dateStr;
    }
  }
}
