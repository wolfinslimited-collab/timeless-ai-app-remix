import 'package:flutter/material.dart';
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
  List<NotificationItem> _notifications = [];
  List<NotificationHistory> _history = [];
  bool _isLoading = false;
  bool _isListening = false;

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

    setState(() {
      _messages.add(NotifyMessage(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        role: 'user',
        content: message,
        createdAt: DateTime.now(),
      ));
      _isLoading = true;
    });
    _inputController.clear();
    _scrollToBottom();

    final response = await _notifyService.sendMessage(message);

    if (response != null && response['response'] != null) {
      setState(() {
        _messages.add(NotifyMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: 'assistant',
          content: response['response'],
          createdAt: DateTime.now(),
        ));
      });
      _scrollToBottom();
      _loadData();
    }

    setState(() => _isLoading = false);
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
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Chat'),
            Tab(text: 'Active'),
            Tab(text: 'History'),
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
          child: _messages.isEmpty
              ? _buildEmptyChat()
              : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) => _buildMessage(_messages[index]),
                ),
        ),
        _buildInputArea(),
      ],
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
          ...NotifyService.quickSuggestions.take(5).map(
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
              Expanded(child: Text(suggestion.text)),
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
                color: isUser
                    ? AppTheme.primary.withOpacity(0.2)
                    : AppTheme.secondary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(message.content),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        border: Border(top: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: () {
              setState(() => _isListening = !_isListening);
            },
            icon: Icon(
              _isListening ? Icons.mic : Icons.mic_none,
              color: _isListening ? Colors.red : AppTheme.muted,
            ),
          ),
          Expanded(
            child: TextField(
              controller: _inputController,
              decoration: const InputDecoration(
                hintText: 'What should I notify you about?',
                border: InputBorder.none,
              ),
              onSubmitted: (_) => _sendMessage(),
            ),
          ),
          IconButton(
            onPressed: _isLoading ? null : () => _sendMessage(),
            icon: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.send, color: AppTheme.primary),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveTab() {
    if (_notifications.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_off, size: 64, color: AppTheme.muted),
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

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _notifications.length,
      itemBuilder: (context, index) {
        final notification = _notifications[index];
        return _buildNotificationCard(notification);
      },
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

  Widget _buildHistoryTab() {
    if (_history.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 64, color: AppTheme.muted),
            SizedBox(height: 16),
            Text(
              'No notification history',
              style: TextStyle(color: AppTheme.muted),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _history.length,
      itemBuilder: (context, index) {
        final item = _history[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Icon(
              item.isRead ? Icons.mark_email_read : Icons.mark_email_unread,
              color: item.isRead ? AppTheme.muted : AppTheme.primary,
            ),
            title: Text(item.title),
            subtitle: Text(item.body),
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
    );
  }

  String _formatTime(String dateStr) {
    try {
      final date = DateTime.parse(dateStr);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 60) {
        return '${diff.inMinutes}m ago';
      } else if (diff.inHours < 24) {
        return '${diff.inHours}h ago';
      } else {
        return '${diff.inDays}d ago';
      }
    } catch (e) {
      return '';
    }
  }

  void _handleNotificationAction(NotificationItem notification, String action) async {
    switch (action) {
      case 'pause':
        await _notifyService.pauseNotification(notification.id);
        break;
      case 'resume':
        await _notifyService.resumeNotification(notification.id);
        break;
      case 'delete':
        await _notifyService.deleteNotification(notification.id);
        break;
    }
    _loadData();
  }
}
