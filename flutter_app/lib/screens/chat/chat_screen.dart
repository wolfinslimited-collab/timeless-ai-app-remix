import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../models/conversation_model.dart';
import '../../services/chat_service.dart';
import '../../services/voice_input_service.dart';
import '../../providers/credits_provider.dart';
import '../../widgets/chat/model_selector_modal.dart';
import '../../widgets/chat/model_logo.dart';
import '../../widgets/chat/chat_message_skeleton.dart';
import '../../widgets/chat/chat_message_bubble.dart';
import '../../widgets/chat/conversation_drawer.dart';
import '../../widgets/common/smart_media_image.dart';
import '../../widgets/add_credits_dialog.dart';
import 'voice_chat_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final ChatService _chatService = ChatService();
  final VoiceInputService _voiceService = VoiceInputService();
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
  bool _isListening = false;
  bool _voiceAvailable = false;

  bool get _supportsVision => AppConfig.supportsVision(_selectedModel);

  @override
  void initState() {
    super.initState();
    _initVoice();
  }

  Future<void> _initVoice() async {
    final available = await _voiceService.isAvailable();
    if (mounted) {
      setState(() => _voiceAvailable = available);
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _voiceService.cancelListening();
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

  Future<void> _toggleVoiceInput() async {
    if (_isListening) {
      await _voiceService.stopListening();
      setState(() => _isListening = false);
    } else {
      setState(() => _isListening = true);
      await _voiceService.startListening(
        onResult: (text) {
          setState(() {
            if (_messageController.text.isNotEmpty) {
              _messageController.text += ' $text';
            } else {
              _messageController.text = text;
            }
            _messageController.selection = TextSelection.fromPosition(
              TextPosition(offset: _messageController.text.length),
            );
            _isListening = false;
          });
        },
        onPartialResult: (text) {
          // Could show partial results in UI if needed
        },
        onListeningStopped: () {
          if (mounted) {
            setState(() => _isListening = false);
          }
        },
      );
    }
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
        title: text.isNotEmpty
            ? (text.length > 50 ? '${text.substring(0, 50)}...' : text)
            : 'Image conversation',
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
    final creditsProvider = context.read<CreditsProvider>();
    showAddCreditsDialog(
      context: context,
      currentCredits: creditsProvider.credits,
      requiredCredits: AppConfig.modelCredits[_selectedModel] ?? 1,
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

  void _openVoiceChat() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const VoiceChatScreen(),
      ),
    );
  }

  Future<void> _loadConversation(String id) async {
    try {
      final messages = await _chatService.getMessages(id);
      // Get the conversation details
      final convData =
          await _supabase.from('conversations').select().eq('id', id).single();

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
                        const Icon(Icons.toll,
                            size: 11, color: AppTheme.accent),
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
            icon: const Icon(Icons.record_voice_over),
            onPressed: _openVoiceChat,
            tooltip: 'Voice Chat',
          ),
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
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: Column(
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
                            child: SmartNetworkImage(
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

            // Input Area — compact redesigned bar
            Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              decoration: BoxDecoration(
                color: AppTheme.card,
                border: Border(
                    top: BorderSide(color: AppTheme.border.withOpacity(0.5))),
              ),
              child: SafeArea(
                top: false,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Unified input bar with inline actions
                    Container(
                      constraints: const BoxConstraints(minHeight: 44),
                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(
                          color: AppTheme.border.withOpacity(0.4),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          // Left actions — compact inline icons
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (_supportsVision)
                                _CompactActionButton(
                                  onTap: _isUploadingImage ? null : _showImageOptions,
                                  icon: PhosphorIconsRegular.imageSquare,
                                  isActive: false,
                                  isLoading: _isUploadingImage,
                                ),
                              _CompactActionButton(
                                onTap: () => setState(() =>
                                    _webSearchEnabled = !_webSearchEnabled),
                                icon: _webSearchEnabled
                                    ? PhosphorIconsFill.globe
                                    : PhosphorIconsRegular.globe,
                                isActive: _webSearchEnabled,
                              ),
                              if (_voiceAvailable)
                                _CompactActionButton(
                                  onTap: _isLoading ? null : _toggleVoiceInput,
                                  icon: _isListening
                                      ? PhosphorIconsFill.microphoneSlash
                                      : PhosphorIconsRegular.microphone,
                                  isActive: _isListening,
                                  activeColor: Colors.red,
                                ),
                            ],
                          ),
                          // Text field - takes remaining space
                          Expanded(
                            child: TextField(
                              controller: _messageController,
                              minLines: 1,
                              maxLines: 3,
                              textInputAction: TextInputAction.send,
                              onSubmitted: (_) => _sendMessage(),
                              decoration: InputDecoration(
                                hintText: _isListening
                                    ? 'Listening...'
                                    : _webSearchEnabled
                                        ? 'Search the web...'
                                        : 'Message...',
                                hintStyle: TextStyle(
                                  color: _isListening
                                      ? Colors.red.withOpacity(0.7)
                                      : AppTheme.muted,
                                  fontSize: 14,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 6,
                                ),
                                border: InputBorder.none,
                                isDense: true,
                              ),
                              style: const TextStyle(fontSize: 14),
                            ),
                          ),
                          // Send button — compact
                          GestureDetector(
                            onTap: _isLoading ? null : _sendMessage,
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              width: 32,
                              height: 32,
                              margin: const EdgeInsets.only(left: 4),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: _isLoading
                                    ? AppTheme.muted
                                    : AppTheme.primary,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: _isLoading
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : PhosphorIcon(
                                      PhosphorIconsFill.paperPlaneTilt,
                                      size: 16,
                                      color: Colors.white,
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
          ],
        ),
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

/// Compact action button for chat input bar
class _CompactActionButton extends StatelessWidget {
  const _CompactActionButton({
    required this.onTap,
    required this.icon,
    this.isActive = false,
    this.isLoading = false,
    this.activeColor,
  });

  final VoidCallback? onTap;
  final IconData icon;
  final bool isActive;
  final bool isLoading;
  final Color? activeColor;

  @override
  Widget build(BuildContext context) {
    final color = isActive ? (activeColor ?? AppTheme.primary) : AppTheme.mutedForeground;
    
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 28,
        height: 28,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: isActive ? color.withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: isLoading
            ? SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: AppTheme.mutedForeground,
                ),
              )
            : PhosphorIcon(
                icon,
                size: 16,
                color: color,
              ),
      ),
    );
  }
}
