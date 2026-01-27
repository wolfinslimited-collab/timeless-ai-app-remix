import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
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
  final _supabase = Supabase.instance.client;
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final ImagePicker _imagePicker = ImagePicker();

  String _selectedModel = 'grok-3';
  Conversation? _currentConversation;
  List<ChatMessage> _messages = [];
  bool _isLoading = false;
  String _streamingContent = '';
  bool _webSearchEnabled = false;
  List<String> _pendingImages = [];
  bool _isUploadingImage = false;

  bool get _supportsVision => AppConfig.supportsVision(_selectedModel);

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _imagePicker.pickImage(
        source: source,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 85,
      );
      if (image == null) return;

      setState(() => _isUploadingImage = true);

      final user = _supabase.auth.currentUser;
      if (user == null) throw Exception('Not authenticated');

      final bytes = await image.readAsBytes();
      final ext = image.name.split('.').last;
      final path =
          '${user.id}/chat/${DateTime.now().millisecondsSinceEpoch}.$ext';

      await _supabase.storage.from('generation-inputs').uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(contentType: 'image/$ext'),
          );

      final publicUrl =
          _supabase.storage.from('generation-inputs').getPublicUrl(path);

      setState(() {
        _pendingImages.add(publicUrl);
        _isUploadingImage = false;
      });
    } catch (e) {
      setState(() => _isUploadingImage = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to upload image: $e')),
      );
    }
  }

  void _showImageOptions() {
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
              leading: const Icon(Icons.camera_alt),
              title: const Text('Take Photo'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library),
              title: const Text('Choose from Gallery'),
              onTap: () {
                Navigator.pop(context);
                _pickImage(ImageSource.gallery);
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _removePendingImage(int index) {
    setState(() => _pendingImages.removeAt(index));
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if ((text.isEmpty && _pendingImages.isEmpty) || _isLoading) return;

    final creditsProvider = context.read<CreditsProvider>();
    if (!creditsProvider.hasEnoughCreditsForModel(_selectedModel)) {
      _showAddCreditsDialog();
      return;
    }

    _messageController.clear();
    final images = List<String>.from(_pendingImages);
    _pendingImages.clear();

    // Create conversation if needed
    if (_currentConversation == null) {
      _currentConversation = await _chatService.createConversation(
        model: _selectedModel,
        title:
            text.isNotEmpty ? (text.length > 50 ? '${text.substring(0, 50)}...' : text) : 'Image conversation',
      );
    }

    // Build message content for API
    dynamic messageContent;
    if (images.isNotEmpty) {
      messageContent = [
        ...images.map((url) => {
              'type': 'image_url',
              'image_url': {'url': url}
            }),
        if (text.isNotEmpty) {'type': 'text', 'text': text},
      ];
    } else {
      messageContent = text;
    }

    // Add user message
    final userMessage = await _chatService.saveMessage(
      conversationId: _currentConversation!.id,
      role: 'user',
      content: messageContent,
      images: images.isNotEmpty ? images : null,
    );

    setState(() {
      _messages.add(userMessage);
      _isLoading = true;
      _streamingContent = '';
    });

    _scrollToBottom();

    try {
      // Build messages array for API
      final messagesForApi = _messages.map((m) {
        if (m.images != null && m.images!.isNotEmpty) {
          return {
            'role': m.role,
            'content': [
              ...m.images!.map((url) => {
                    'type': 'image_url',
                    'image_url': {'url': url}
                  }),
              {'type': 'text', 'text': m.textContent},
            ],
          };
        }
        return {'role': m.role, 'content': m.textContent};
      }).toList();

      // Send to API with streaming
      await _chatService.sendMessageStreaming(
        conversationId: _currentConversation!.id,
        model: _selectedModel,
        messages: messagesForApi,
        webSearch: _webSearchEnabled,
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
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, controller) => ModelSelectorModal(
          selectedModel: _selectedModel,
          onSelect: (modelId) {
            setState(() {
              _selectedModel = modelId;
              // Clear conversation when changing model
              _currentConversation = null;
              _messages = [];
              _streamingContent = '';
              _pendingImages = [];
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
      _pendingImages = [];
    });
  }

  Future<void> _loadConversation(String id) async {
    try {
      final messages = await _chatService.getMessages(id);
      // Get the conversation details
      final convData = await _supabase
          .from('conversations')
          .select()
          .eq('id', id)
          .single();

      setState(() {
        _selectedModel = convData['model'] as String;
        _currentConversation = Conversation.fromJson(convData);
        _messages = messages;
      });
      _scrollToBottom();
    } catch (e) {
      debugPrint('Error loading conversation: $e');
    }
  }

  Map<String, dynamic> get _currentModelInfo {
    return AppConfig.chatModels.firstWhere(
      (m) => m['id'] == _selectedModel,
      orElse: () => {'name': _selectedModel, 'credits': 1},
    );
  }

  @override
  Widget build(BuildContext context) {
    final creditsProvider = context.watch<CreditsProvider>();
    final modelInfo = _currentModelInfo;
    final creditCost = modelInfo['credits'] as int? ?? 1;
    final modelName = modelInfo['name'] as String? ?? _selectedModel;
    final badge = modelInfo['badge'] as String?;

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
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            modelName,
                            style: const TextStyle(
                                fontSize: 14, fontWeight: FontWeight.w600),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (badge != null) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: badge == 'TOP'
                                  ? AppTheme.primary
                                  : Colors.green,
                              borderRadius: BorderRadius.circular(3),
                            ),
                            child: Text(
                              badge,
                              style: const TextStyle(
                                fontSize: 8,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(width: 4),
                        const Icon(Icons.keyboard_arrow_down, size: 18),
                      ],
                    ),
                    Row(
                      children: [
                        if (_supportsVision) ...[
                          const Icon(Icons.image,
                              size: 11, color: AppTheme.muted),
                          const SizedBox(width: 4),
                        ],
                        const Icon(Icons.toll, size: 11, color: AppTheme.accent),
                        const SizedBox(width: 3),
                        Text(
                          creditsProvider.isUnlimited
                              ? 'Unlimited'
                              : '$creditCost/msg',
                          style: const TextStyle(
                              color: AppTheme.muted, fontSize: 10),
                        ),
                      ],
                    ),
                  ],
                ),
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
                      if (_isLoading &&
                          _streamingContent.isEmpty &&
                          index == _messages.length) {
                        return ChatMessageSkeleton(modelId: _selectedModel);
                      }
                      // Show streaming content
                      if (_streamingContent.isNotEmpty &&
                          index == _messages.length) {
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

          // Pending images preview
          if (_pendingImages.isNotEmpty)
            Container(
              height: 80,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _pendingImages.length,
                itemBuilder: (context, index) {
                  return Container(
                    margin: const EdgeInsets.only(right: 8),
                    child: Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            _pendingImages[index],
                            width: 70,
                            height: 70,
                            fit: BoxFit.cover,
                          ),
                        ),
                        Positioned(
                          top: 2,
                          right: 2,
                          child: GestureDetector(
                            onTap: () => _removePendingImage(index),
                            child: Container(
                              padding: const EdgeInsets.all(2),
                              decoration: const BoxDecoration(
                                color: Colors.black54,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.close,
                                  size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

          // Input Area
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.card,
              border: Border(
                  top: BorderSide(color: AppTheme.border.withOpacity(0.5))),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      // Image button (for vision models)
                      if (_supportsVision)
                        GestureDetector(
                          onTap: _isUploadingImage ? null : _showImageOptions,
                          child: Container(
                            width: 40,
                            height: 40,
                            margin: const EdgeInsets.only(right: 8),
                            decoration: BoxDecoration(
                              color: AppTheme.secondary,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: _isUploadingImage
                                ? const Padding(
                                    padding: EdgeInsets.all(10),
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  )
                                : const Icon(Icons.image,
                                    size: 20, color: AppTheme.muted),
                          ),
                        ),

                      // Web search toggle
                      GestureDetector(
                        onTap: () =>
                            setState(() => _webSearchEnabled = !_webSearchEnabled),
                        child: Container(
                          width: 40,
                          height: 40,
                          margin: const EdgeInsets.only(right: 8),
                          decoration: BoxDecoration(
                            color: _webSearchEnabled
                                ? AppTheme.primary.withOpacity(0.2)
                                : AppTheme.secondary,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: _webSearchEnabled
                                  ? AppTheme.primary
                                  : Colors.transparent,
                              width: 1.5,
                            ),
                          ),
                          child: Icon(
                            Icons.language,
                            size: 20,
                            color: _webSearchEnabled
                                ? AppTheme.primary
                                : AppTheme.muted,
                          ),
                        ),
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
                              hintText: _webSearchEnabled
                                  ? 'Search the web with $modelName...'
                                  : 'Message $modelName...',
                              hintStyle: const TextStyle(
                                  color: AppTheme.muted, fontSize: 14),
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
                            color:
                                _isLoading ? AppTheme.muted : AppTheme.primary,
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
                              : const Icon(Icons.arrow_upward,
                                  size: 20, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Footer info
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (_webSearchEnabled) ...[
                        const Icon(Icons.language, size: 10, color: AppTheme.primary),
                        const SizedBox(width: 4),
                        const Text(
                          'Web search enabled',
                          style: TextStyle(fontSize: 10, color: AppTheme.primary),
                        ),
                        const Text(
                          ' • ',
                          style: TextStyle(fontSize: 10, color: AppTheme.muted),
                        ),
                      ],
                      Text(
                        'AI can make mistakes',
                        style: TextStyle(
                          fontSize: 10,
                          color: AppTheme.muted.withOpacity(0.7),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    final modelInfo = _currentModelInfo;
    final modelName = modelInfo['name'] as String? ?? _selectedModel;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ModelLogo(modelId: _selectedModel, size: 64),
            const SizedBox(height: 16),
            Text(
              'Chat with $modelName',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              _supportsVision
                  ? 'Start a conversation. You can also share images for visual analysis.'
                  : 'Start a conversation with one of the most advanced AI models.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppTheme.muted, fontSize: 14),
            ),
            const SizedBox(height: 24),
            // Suggestion chips
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                if (_supportsVision)
                  'Analyze this image'
                else
                  'Explain a concept',
                'Help me brainstorm',
                'Write something creative',
                'Answer a question',
              ].map((suggestion) {
                return GestureDetector(
                  onTap: () {
                    _messageController.text = suggestion;
                  },
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.secondary,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.auto_awesome,
                            size: 14, color: AppTheme.primary),
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
