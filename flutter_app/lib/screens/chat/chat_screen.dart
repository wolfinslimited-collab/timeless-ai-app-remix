import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../models/conversation_model.dart';
import '../../services/chat_service.dart';
import '../../providers/credits_provider.dart';
import '../../widgets/chat/model_selector_modal.dart';
import '../../widgets/chat/model_logo.dart';
import '../../widgets/chat/chat_message_skeleton.dart';
import '../../widgets/chat/chat_message_bubble.dart';
import '../../widgets/chat/conversation_drawer.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ChatService _chatService = ChatService();
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  String _selectedModel = 'chatgpt-5.2';
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
            const SizedBox(height: 8),
            Text(
              'This model requires ${AppConfig.modelCredits[_selectedModel] ?? 1} credits.',
              style: const TextStyle(color: AppTheme.muted),
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

  void _showModelSelector() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        builder: (_, controller) => ModelSelectorModal(
          selectedModel: _selectedModel,
          onSelect: (modelId) {
            setState(() {
              _selectedModel = modelId;
              // Clear conversation when changing model
              _currentConversation = null;
              _messages = [];
              _streamingContent = '';
            });
          },
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

  Future<void> _loadConversation(String id) async {
    try {
      final messages = await _chatService.getMessages(id);
      setState(() {
        _currentConversation = Conversation(
          id: id,
          userId: '',
          model: _selectedModel,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );
        _messages = messages;
      });
      _scrollToBottom();
    } catch (e) {
      debugPrint('Error loading conversation: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final creditsProvider = context.watch<CreditsProvider>();
    final creditCost = AppConfig.modelCredits[_selectedModel] ?? 1;

    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.menu),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        title: GestureDetector(
          onTap: _showModelSelector,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              ModelLogo(modelId: _selectedModel, size: 28),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        _getModelDisplayName(_selectedModel),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.keyboard_arrow_down, size: 18),
                    ],
                  ),
                  Row(
                    children: [
                      const Icon(Icons.toll, size: 12, color: AppTheme.accent),
                      const SizedBox(width: 4),
                      Text(
                        creditsProvider.isUnlimited
                            ? 'Unlimited'
                            : '$creditCost credits/msg',
                        style: const TextStyle(color: AppTheme.muted, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            onPressed: _startNewChat,
            tooltip: 'New Chat',
          ),
        ],
      ),
      drawer: ConversationDrawer(
        currentConversationId: _currentConversation?.id,
        currentModel: _selectedModel,
        onSelectConversation: (id) {
          if (id != null) _loadConversation(id);
        },
        onNewConversation: _startNewChat,
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
                    itemCount: _messages.length +
                        (_streamingContent.isNotEmpty ? 1 : 0) +
                        (_isLoading && _streamingContent.isEmpty ? 1 : 0),
                    itemBuilder: (context, index) {
                      // Show skeleton loader
                      if (_isLoading && _streamingContent.isEmpty && index == _messages.length) {
                        return ChatMessageSkeleton(modelId: _selectedModel);
                      }
                      // Show streaming content
                      if (_streamingContent.isNotEmpty && index == _messages.length) {
                        return ChatMessageBubble(
                          content: _streamingContent,
                          isUser: false,
                          modelId: _selectedModel,
                        );
                      }
                      final message = _messages[index];
                      return ChatMessageBubble(
                        content: message.textContent,
                        isUser: message.isUser,
                        modelId: message.isUser ? null : _selectedModel,
                        images: message.images,
                      );
                    },
                  ),
          ),

          // Input Area
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.card,
              border: Border(top: BorderSide(color: AppTheme.border.withOpacity(0.5))),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      // Mic button
                      Container(
                        width: 44,
                        height: 44,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          color: AppTheme.secondary,
                          borderRadius: BorderRadius.circular(22),
                        ),
                        child: const Icon(Icons.mic, size: 20, color: AppTheme.muted),
                      ),
                      // Text input
                      Expanded(
                        child: Container(
                          constraints: const BoxConstraints(maxHeight: 120),
                          decoration: BoxDecoration(
                            color: AppTheme.secondary,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: TextField(
                            controller: _messageController,
                            maxLines: null,
                            textInputAction: TextInputAction.send,
                            onSubmitted: (_) => _sendMessage(),
                            decoration: InputDecoration(
                              hintText: 'Message ${_getModelDisplayName(_selectedModel)}...',
                              hintStyle: const TextStyle(color: AppTheme.muted, fontSize: 14),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                              border: InputBorder.none,
                            ),
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Send button
                      GestureDetector(
                        onTap: _isLoading ? null : _sendMessage,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: _isLoading ? AppTheme.muted : AppTheme.primary,
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
                              : const Icon(Icons.arrow_upward, size: 20, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Footer info
                  Text(
                    'AI can make mistakes. Consider checking important information.',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.muted.withOpacity(0.7),
                    ),
                  ),
                ],
              ),
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
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ModelLogo(modelId: _selectedModel, size: 64),
            const SizedBox(height: 16),
            Text(
              'Chat with ${_getModelDisplayName(_selectedModel)}',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            const Text(
              'Start a conversation with one of the most advanced AI models.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.muted, fontSize: 14),
            ),
            const SizedBox(height: 24),
            // Suggestion chips
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                'Explain quantum computing',
                'Write a poem about space',
                'Help me brainstorm ideas',
                'Summarize a complex topic',
              ].map((suggestion) {
                return GestureDetector(
                  onTap: () {
                    _messageController.text = suggestion;
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.secondary,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.auto_awesome, size: 14, color: AppTheme.primary),
                        const SizedBox(width: 6),
                        Text(
                          suggestion,
                          style: const TextStyle(fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
