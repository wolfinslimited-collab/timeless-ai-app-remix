import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/conversation_model.dart';
import '../../services/chat_service.dart';
import 'model_logo.dart';

class ConversationDrawer extends StatefulWidget {
  final String? currentConversationId;
  final String currentModel;
  final Function(String?) onSelectConversation;
  final VoidCallback onNewConversation;

  const ConversationDrawer({
    super.key,
    this.currentConversationId,
    required this.currentModel,
    required this.onSelectConversation,
    required this.onNewConversation,
  });

  @override
  State<ConversationDrawer> createState() => _ConversationDrawerState();
}

class _ConversationDrawerState extends State<ConversationDrawer> {
  final ChatService _chatService = ChatService();
  List<Conversation> _conversations = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    try {
      final conversations = await _chatService.getConversations();
      if (mounted) {
        setState(() {
          _conversations = conversations
              .where((c) => c.model == widget.currentModel)
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteConversation(String id) async {
    try {
      await _chatService.deleteConversation(id);
      _loadConversations();
      if (widget.currentConversationId == id) {
        widget.onNewConversation();
      }
    } catch (e) {
      debugPrint('Error deleting conversation: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: AppTheme.background,
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppTheme.border)),
              ),
              child: Row(
                children: [
                  ModelLogo(modelId: widget.currentModel, size: 32),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Conversations',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            // New Chat Button
            Padding(
              padding: const EdgeInsets.all(12),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    widget.onNewConversation();
                    Navigator.pop(context);
                  },
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('New Chat'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ),
            const Divider(height: 1, color: AppTheme.border),
            // Conversations List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _conversations.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.chat_bubble_outline,
                                size: 48,
                                color: AppTheme.muted.withOpacity(0.5),
                              ),
                              const SizedBox(height: 12),
                              const Text(
                                'No conversations yet',
                                style: TextStyle(color: AppTheme.muted),
                              ),
                            ],
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _loadConversations,
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            itemCount: _conversations.length,
                            itemBuilder: (context, index) {
                              final conv = _conversations[index];
                              final isSelected =
                                  conv.id == widget.currentConversationId;

                              return _ConversationTile(
                                conversation: conv,
                                isSelected: isSelected,
                                onTap: () {
                                  widget.onSelectConversation(conv.id);
                                  Navigator.pop(context);
                                },
                                onDelete: () => _deleteConversation(conv.id),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  final Conversation conversation;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _ConversationTile({
    required this.conversation,
    required this.isSelected,
    required this.onTap,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: Key(conversation.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        color: Colors.red,
        child: const Icon(Icons.delete, color: Colors.white),
      ),
      onDismissed: (_) => onDelete(),
      child: ListTile(
        onTap: onTap,
        selected: isSelected,
        selectedTileColor: AppTheme.primary.withOpacity(0.1),
        leading: ModelLogo(modelId: conversation.model, size: 32),
        title: Text(
          conversation.title ?? 'New conversation',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
        subtitle: Text(
          _formatDate(conversation.updatedAt),
          style: const TextStyle(fontSize: 12, color: AppTheme.muted),
        ),
        trailing: conversation.pinned
            ? const Icon(Icons.push_pin, size: 16, color: AppTheme.accent)
            : null,
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${date.day}/${date.month}/${date.year}';
  }
}
