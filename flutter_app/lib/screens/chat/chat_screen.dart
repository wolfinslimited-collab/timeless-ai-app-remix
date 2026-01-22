import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:provider/provider.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../models/conversation_model.dart';
import '../../services/chat_service.dart';
import '../../providers/credits_provider.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ChatService _chatService = ChatService();
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  String _selectedModel = 'gemini-3-flash';
  Conversation? _currentConversation;
  List<ChatMessage> _messages = [];
  bool _isLoading = false;
  String _streamingContent = '';

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty || _isLoading) return;

    final creditsProvider = context.read<CreditsProvider>();
    if (!creditsProvider.hasEnoughCreditsForModel(_selectedModel)) {
      _showAddCreditsDialog();
      return;
    }

    _messageController.clear();

    // Create conversation if needed
    if (_currentConversation == null) {
      _currentConversation = await _chatService.createConversation(
        model: _selectedModel,
        title: text.length > 50 ? '${text.substring(0, 50)}...' : text,
      );
    }

    // Add user message
    final userMessage = await _chatService.saveMessage(
      conversationId: _currentConversation!.id,
      role: 'user',
      content: text,
    );

    setState(() {
      _messages.add(userMessage);
      _isLoading = true;
      _streamingContent = '';
    });

    _scrollToBottom();

    try {
      // Build messages array for API
      final messagesForApi = _messages.map((m) => {
        'role': m.role,
        'content': m.textContent,
      }).toList();

      // Send to API with streaming
      await _chatService.sendMessageStreaming(
        conversationId: _currentConversation!.id,
        model: _selectedModel,
        messages: messagesForApi,
        onChunk: (chunk) {
          setState(() {
            _streamingContent += chunk;
          });
          _scrollToBottom();
        },
      );

      // Save complete assistant response
      final assistantMessage = await _chatService.saveMessage(
        conversationId: _currentConversation!.id,
        role: 'assistant',
        content: _streamingContent,
      );

      setState(() {
        _messages.add(assistantMessage);
        _streamingContent = '';
      });

      creditsProvider.refresh();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
      setState(() {
        _streamingContent = '';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
      _scrollToBottom();
    }
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

  void _showAddCreditsDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.toll, size: 48, color: AppTheme.accent),
            const SizedBox(height: 16),
            const Text(
              'Insufficient Credits',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Get Credits'),
            ),
          ],
        ),
      ),
    );
  }

  void _startNewChat() {
    setState(() {
      _currentConversation = null;
      _messages = [];
      _streamingContent = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('AI Chat', style: TextStyle(fontSize: 16)),
            Text(
              _getModelDisplayName(_selectedModel),
              style: const TextStyle(color: AppTheme.muted, fontSize: 12),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _startNewChat,
            tooltip: 'New Chat',
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages
          Expanded(
            child: _messages.isEmpty && _streamingContent.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: _messages.length + (_streamingContent.isNotEmpty ? 1 : 0) + (_isLoading && _streamingContent.isEmpty ? 1 : 0),
                    itemBuilder: (context, index) {
                      // Show typing indicator
                      if (_isLoading && _streamingContent.isEmpty && index == _messages.length) {
                        return const _TypingIndicator();
                      }
                      // Show streaming content
                      if (_streamingContent.isNotEmpty && index == _messages.length) {
                        return _MessageBubble(
                          content: _streamingContent,
                          isUser: false,
                        );
                      }
                      final message = _messages[index];
                      return _MessageBubble(
                        content: message.textContent,
                        isUser: message.isUser,
                      );
                    },
                  ),
          ),

          // Input
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: AppTheme.card,
              border: Border(top: BorderSide(color: AppTheme.border)),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(Icons.mic, size: 16, color: AppTheme.muted),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppTheme.secondary,
                      borderRadius: BorderRadius.circular(25),
                    ),
                    child: TextField(
                      controller: _messageController,
                      decoration: const InputDecoration(
                        hintText: 'Type a message...',
                        hintStyle: TextStyle(color: AppTheme.muted),
                        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: InputBorder.none,
                      ),
                      style: const TextStyle(fontSize: 14),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: _isLoading ? null : _sendMessage,
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: _isLoading ? AppTheme.muted : AppTheme.primary,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: _isLoading
                        ? const Padding(
                            padding: EdgeInsets.all(8),
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.send, size: 16, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getModelDisplayName(String modelId) {
    final model = AppConfig.chatModels.firstWhere(
      (m) => m['id'] == modelId,
      orElse: () => {'name': modelId},
    );
    return model['name'] as String;
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.2),
              borderRadius: BorderRadius.circular(32),
            ),
            child: const Icon(Icons.send, size: 32, color: AppTheme.primary),
          ),
          const SizedBox(height: 16),
          const Text(
            'Start a conversation',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          const Text(
            'Ask me anything!',
            style: TextStyle(color: AppTheme.muted, fontSize: 14),
          ),
        ],
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final String content;
  final bool isUser;

  const _MessageBubble({required this.content, required this.isUser});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isUser ? AppTheme.primary : AppTheme.secondary,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(16),
                  topRight: const Radius.circular(16),
                  bottomLeft: Radius.circular(isUser ? 16 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 16),
                ),
              ),
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.8,
              ),
              child: isUser
                  ? Text(
                      content,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                      ),
                    )
                  : MarkdownBody(
                      data: content,
                      selectable: true,
                      styleSheet: MarkdownStyleSheet(
                        p: const TextStyle(
                          color: AppTheme.foreground,
                          fontSize: 14,
                          height: 1.5,
                        ),
                        strong: const TextStyle(
                          color: AppTheme.foreground,
                          fontWeight: FontWeight.bold,
                        ),
                        em: const TextStyle(
                          color: AppTheme.foreground,
                          fontStyle: FontStyle.italic,
                        ),
                        listBullet: const TextStyle(
                          color: AppTheme.foreground,
                          fontSize: 14,
                        ),
                        h1: const TextStyle(
                          color: AppTheme.foreground,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                        h2: const TextStyle(
                          color: AppTheme.foreground,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                        h3: const TextStyle(
                          color: AppTheme.foreground,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                        code: TextStyle(
                          color: AppTheme.accent,
                          backgroundColor: AppTheme.card,
                          fontFamily: 'monospace',
                          fontSize: 13,
                        ),
                        codeblockDecoration: BoxDecoration(
                          color: AppTheme.card,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        blockquote: const TextStyle(
                          color: AppTheme.muted,
                          fontStyle: FontStyle.italic,
                        ),
                        a: const TextStyle(
                          color: AppTheme.primary,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TypingIndicator extends StatelessWidget {
  const _TypingIndicator();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(16),
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
                Text('...', style: TextStyle(color: AppTheme.muted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
