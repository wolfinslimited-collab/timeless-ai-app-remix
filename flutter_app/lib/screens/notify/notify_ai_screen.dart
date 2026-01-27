import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../services/notify_service.dart';

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

      setState(() {
        _messages.add(NotifyMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: 'assistant',
          content: fullContent,
          createdAt: DateTime.now(),
          toolCall: toolCall,
        ));
        _streamingContent = '';
      });

      // Handle tool call if present
      if (toolCall != null && toolCallArgs.isNotEmpty) {
        try {
          final args = jsonDecode(toolCallArgs) as Map<String, dynamic>;
          if (toolCall['name'] == 'create_notification') {
            setState(() {
              _pendingNotification = args;
            });
          }
        } catch (e) {
          debugPrint('Error parsing tool call args: $e');
        }
      }
    }

    _scrollToBottom();
    _loadData();
  }

  Future<void> _confirmNotification() async {
    if (_pendingNotification == null) return;

    setState(() => _isLoading = true);

    final result = await _notifyService.saveNotification(
      _pendingNotification!,
      _messages.isNotEmpty ? _messages.first.content : '',
    );

    setState(() {
      _isLoading = false;
      _pendingNotification = null;
    });

    if (result != null && result['success'] == true) {
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
                    if (_isLoading && _streamingContent.isEmpty && index == _messages.length) {
                      return _buildTypingIndicator();
                    }
                    // Show streaming content
                    if (_streamingContent.isNotEmpty && index == _messages.length) {
                      return _buildMessage(NotifyMessage(
                        id: 'streaming',
                        role: 'assistant',
                        content: _streamingContent,
                        createdAt: DateTime.now(),
                      ));
                    }
                    return _buildMessage(_messages[index]);
                  },
                ),
        ),
        // Pending notification confirmation
        if (_pendingNotification != null) _buildNotificationPreview(),
        _buildInputArea(),
      ],
    );
  }

  Widget _buildNotificationPreview() {
    final notification = _pendingNotification!;
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.primary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _notifyService.getNotificationTypeIcon(notification['type'] ?? 'custom'),
                  style: const TextStyle(fontSize: 20),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      notification['title'] ?? 'New Notification',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      notification['description'] ?? '',
                      style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _cancelNotification,
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isLoading ? null : _confirmNotification,
                  icon: _isLoading 
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check),
                  label: const Text('Create'),
                ),
              ),
            ],
          ),
        ],
      ),
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

  Widget _buildMessage(NotifyMessage message) {
    final isUser = message.role == 'user';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment:
            isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.amber.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.smart_toy,
                color: Colors.amber,
                size: 20,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isUser ? AppTheme.primary : AppTheme.secondary,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(isUser ? 16 : 4),
                  topRight: Radius.circular(isUser ? 4 : 16),
                  bottomLeft: const Radius.circular(16),
                  bottomRight: const Radius.circular(16),
                ),
              ),
              child: Text(
                message.content,
                style: TextStyle(
                  color: isUser ? Colors.white : AppTheme.foreground,
                ),
              ),
            ),
          ),
          if (isUser) ...[
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
        ],
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
                    hintText: 'What should I notify you about?',
                    hintStyle: TextStyle(color: AppTheme.muted),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
            Icon(Icons.notifications_off, size: 64, color: AppTheme.muted.withOpacity(0.5)),
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
          onSelected: (action) => _handleNotificationAction(notification, action),
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
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }

  Future<void> _handleNotificationAction(NotificationItem notification, String action) async {
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
            Icon(Icons.history, size: 64, color: AppTheme.muted.withOpacity(0.5)),
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
              subtitle: Text(item.body, maxLines: 2, overflow: TextOverflow.ellipsis),
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
