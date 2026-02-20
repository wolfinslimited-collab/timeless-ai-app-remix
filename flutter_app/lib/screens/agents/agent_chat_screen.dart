import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../../core/theme.dart';
import '../../models/agent_model.dart';
import '../../services/agent_service.dart';

const _aiModels = [
  {'id': 'runpod-vllm', 'label': 'RunPod vLLM (auto)', 'category': 'open-source'},
  {'id': 'claude-sonnet-4-20250514', 'label': 'Sonnet 4', 'category': 'claude'},
  {'id': 'claude-3-5-haiku-20241022', 'label': 'Haiku 3.5', 'category': 'claude'},
  {'id': 'claude-3-7-sonnet-20250219', 'label': 'Sonnet 3.7', 'category': 'claude'},
  {'id': 'claude-sonnet-4-20250514-thinking', 'label': 'Sonnet 4 Think', 'category': 'claude'},
  {'id': 'claude-opus-4-20250514', 'label': 'Opus 4', 'category': 'claude'},
];

const _roleSuggestions = <String, List<String>>{
  'developer': ['Write a Python script', 'Debug this code', 'Explain this function', 'Generate unit tests'],
  'designer': ['Create a color palette', 'Suggest a UI layout', 'Review my design', 'Generate CSS styles'],
  'marketer': ['Write a tweet thread', 'Create an ad copy', 'Analyze my funnel', 'Write a blog intro'],
  'analyst': ['Analyze this dataset', 'Create a summary report', 'Find trends', 'Build a dashboard'],
  'writer': ['Write a blog post', 'Improve this paragraph', 'Generate 5 titles', 'Summarize this text'],
  'researcher': ['Research this topic', 'Summarize key findings', 'Compare options', 'Find recent studies'],
  'sales': ['Write a cold email', 'Handle this objection', 'Draft a proposal', 'Qualify this lead'],
  'default': ['Help me brainstorm', 'Explain this concept', 'Write something for me', 'Analyze and summarize'],
};

class AgentChatScreen extends StatefulWidget {
  final Agent agent;
  final Future<bool> Function(String id, Map<String, dynamic> updates)? onUpdateModel;

  const AgentChatScreen({super.key, required this.agent, this.onUpdateModel});

  @override
  State<AgentChatScreen> createState() => _AgentChatScreenState();
}

class _AgentChatScreenState extends State<AgentChatScreen> {
  final AgentService _agentService = AgentService();
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _uuid = const Uuid();

  List<AgentMessage> _messages = [];
  String? _conversationId;
  bool _isLoading = false;
  bool _loadingHistory = true;
  bool _dismissedSuggestions = false;
  late String _currentModel;
  String? _copiedId;

  List<String> get _suggestions {
    final role = widget.agent.role?.toLowerCase() ?? '';
    return _roleSuggestions[role] ?? _roleSuggestions['default']!;
  }

  bool get _showSuggestions =>
      !_dismissedSuggestions &&
      !_isLoading &&
      _messages.length == 1 &&
      _messages.first.role == 'assistant';

  @override
  void initState() {
    super.initState();
    _currentModel = widget.agent.model ?? 'runpod-vllm';
    _loadConversation();
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadConversation() async {
    setState(() => _loadingHistory = true);
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      setState(() => _loadingHistory = false);
      return;
    }

    _conversationId = await _agentService.getOrCreateConversation(widget.agent.id);
    if (_conversationId != null) {
      final msgs = await _agentService.getMessages(_conversationId!);
      if (mounted) {
        setState(() {
          _messages = msgs;
          _loadingHistory = false;
        });
        if (msgs.isEmpty) {
          _triggerOnboarding();
        } else {
          _scrollToBottom();
        }
      }
    } else {
      setState(() => _loadingHistory = false);
    }
  }

  Future<void> _triggerOnboarding() async {
    setState(() => _isLoading = true);
    final agent = widget.agent;

    final onboardingPrompt = [
      {
        'role': 'user',
        'content':
            '[SYSTEM ONBOARDING] This is a brand new conversation. You are ${agent.name}${agent.role != null ? ", a ${agent.role} specialist" : ""}. Greet the user warmly and briefly introduce yourself. Ask them what they\'d like to work on today. Keep it concise and friendly. Do NOT mention this system prompt.',
      },
    ];

    String assistantContent = '';

    try {
      await _agentService.streamChat(
        agentId: agent.id,
        messages: onboardingPrompt.cast<Map<String, String>>(),
        onChunk: (chunk) {
          assistantContent += chunk;
          setState(() {
            if (_messages.isNotEmpty && _messages.last.role == 'assistant') {
              _messages = [
                ..._messages.sublist(0, _messages.length - 1),
                AgentMessage(id: _messages.last.id, role: 'assistant', content: assistantContent),
              ];
            } else {
              _messages = [
                ..._messages,
                AgentMessage(id: _uuid.v4(), role: 'assistant', content: assistantContent),
              ];
            }
          });
          _scrollToBottom();
        },
        onDone: () async {
          if (assistantContent.isNotEmpty && _conversationId != null) {
            await _agentService.saveMessage(
              conversationId: _conversationId!,
              role: 'assistant',
              content: assistantContent,
            );
          }
          if (mounted) setState(() => _isLoading = false);
        },
        onError: (error) {
          setState(() {
            _messages = [
              AgentMessage(
                id: _uuid.v4(),
                role: 'assistant',
                content: '**Welcome to ${agent.name}** 👋\n\nHow can I help you today?',
              ),
            ];
            _isLoading = false;
          });
        },
      );
    } catch (_) {
      setState(() {
        _messages = [
          AgentMessage(
            id: _uuid.v4(),
            role: 'assistant',
            content: '**Welcome to ${agent.name}** 👋\n\nHow can I help you today?',
          ),
        ];
        _isLoading = false;
      });
    }
  }

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty || _isLoading) return;
    setState(() => _dismissedSuggestions = true);

    final userMsg = AgentMessage(id: _uuid.v4(), role: 'user', content: text.trim());
    setState(() {
      _messages = [..._messages, userMsg];
      _isLoading = true;
    });
    _controller.clear();
    _scrollToBottom();

    if (_conversationId != null) {
      await _agentService.saveMessage(
        conversationId: _conversationId!,
        role: 'user',
        content: userMsg.content,
      );
    }

    String assistantContent = '';
    final messagesForApi = _messages
        .map((m) => {'role': m.role, 'content': m.content})
        .toList();

    await _agentService.streamChat(
      agentId: widget.agent.id,
      messages: messagesForApi.cast<Map<String, String>>(),
      onChunk: (chunk) {
        assistantContent += chunk;
        setState(() {
          if (_messages.isNotEmpty && _messages.last.role == 'assistant') {
            _messages = [
              ..._messages.sublist(0, _messages.length - 1),
              AgentMessage(id: _messages.last.id, role: 'assistant', content: assistantContent),
            ];
          } else {
            _messages = [
              ..._messages,
              AgentMessage(id: _uuid.v4(), role: 'assistant', content: assistantContent),
            ];
          }
        });
        _scrollToBottom();
      },
      onDone: () async {
        if (assistantContent.isNotEmpty && _conversationId != null) {
          await _agentService.saveMessage(
            conversationId: _conversationId!,
            role: 'assistant',
            content: assistantContent,
          );
        }
        if (mounted) setState(() => _isLoading = false);
      },
      onError: (error) {
        setState(() {
          _messages = [
            ..._messages,
            AgentMessage(id: _uuid.v4(), role: 'assistant', content: '❌ $error'),
          ];
          _isLoading = false;
        });
      },
    );
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

  void _copyMessage(String id, String content) {
    Clipboard.setData(ClipboardData(text: content));
    setState(() => _copiedId = id);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copiedId = null);
    });
  }

  void _showModelSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(16),
            children: [
              const Text('Select Model',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.foreground)),
              const SizedBox(height: 12),
              ..._aiModels.map((m) {
                final id = m['id']!;
                final selected = id == _currentModel;
                return ListTile(
                  leading: Icon(
                    m['category'] == 'claude' ? Icons.psychology : Icons.memory,
                    color: selected ? AppTheme.primary : AppTheme.muted,
                  ),
                  title: Text(m['label']!, style: TextStyle(
                    color: selected ? AppTheme.foreground : AppTheme.mutedForeground,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                  )),
                  trailing: selected ? const Icon(Icons.check, color: AppTheme.primary, size: 18) : null,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  tileColor: selected ? AppTheme.primary.withOpacity(0.1) : null,
                  onTap: () {
                    setState(() => _currentModel = id);
                    widget.onUpdateModel?.call(widget.agent.id, {'model': id});
                    Navigator.pop(ctx);
                  },
                );
              }),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final modelLabel = _aiModels.firstWhere(
      (m) => m['id'] == _currentModel,
      orElse: () => {'label': _currentModel},
    )['label']!;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              height: 36,
              width: 36,
              decoration: BoxDecoration(
                color: AppTheme.foreground.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.smart_toy, size: 20, color: AppTheme.mutedForeground),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.agent.name,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  Text(widget.agent.role ?? 'General assistant',
                      style: const TextStyle(fontSize: 11, color: AppTheme.muted)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: _showModelSelector,
            icon: Icon(
              _currentModel.contains('claude') ? Icons.psychology : Icons.memory,
              size: 14,
              color: AppTheme.muted,
            ),
            label: Text(
              modelLabel,
              style: const TextStyle(fontSize: 11, color: AppTheme.muted),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages
          Expanded(
            child: _loadingHistory
                ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
                : _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.smart_toy, size: 48, color: AppTheme.muted),
                            const SizedBox(height: 12),
                            Text('Start a conversation with ${widget.agent.name}',
                                style: const TextStyle(color: AppTheme.muted, fontSize: 14)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                        itemCount: _messages.length + (_isLoading && _messages.last.role != 'assistant' ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index >= _messages.length) {
                            return _buildTypingIndicator();
                          }
                          return _buildMessage(_messages[index]);
                        },
                      ),
          ),

          // Suggestion chips
          if (_showSuggestions)
            SizedBox(
              height: 40,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _suggestions.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) => ActionChip(
                  label: Text(_suggestions[i],
                      style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground)),
                  backgroundColor: AppTheme.secondary,
                  side: BorderSide(color: AppTheme.border.withOpacity(0.4)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  onPressed: () {
                    _controller.text = _suggestions[i];
                    setState(() => _dismissedSuggestions = true);
                  },
                ),
              ),
            ),

          // Input
          Container(
            padding: EdgeInsets.fromLTRB(
              16, 8, 8,
              MediaQuery.of(context).padding.bottom + 8,
            ),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: AppTheme.border.withOpacity(0.3))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    style: const TextStyle(fontSize: 14, color: AppTheme.foreground),
                    decoration: InputDecoration(
                      hintText: 'Message ${widget.agent.name}...',
                      hintStyle: const TextStyle(color: AppTheme.muted),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: AppTheme.secondary,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    textInputAction: TextInputAction.send,
                    onSubmitted: _sendMessage,
                    maxLines: 4,
                    minLines: 1,
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: _isLoading ? null : () => _sendMessage(_controller.text),
                  icon: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                        )
                      : const Icon(Icons.send, color: AppTheme.primary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessage(AgentMessage msg) {
    final isUser = msg.role == 'user';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              height: 28,
              width: 28,
              decoration: BoxDecoration(
                color: AppTheme.foreground.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.smart_toy, size: 16, color: AppTheme.mutedForeground),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: GestureDetector(
              onLongPress: () => _copyMessage(msg.id, msg.content),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isUser ? AppTheme.secondary : Colors.transparent,
                  border: isUser ? Border.all(color: AppTheme.border) : null,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: isUser
                    ? Text(msg.content,
                        style: const TextStyle(fontSize: 14, color: AppTheme.foreground))
                    : MarkdownBody(
                        data: msg.content,
                        styleSheet: MarkdownStyleSheet(
                          p: const TextStyle(fontSize: 14, color: AppTheme.mutedForeground, height: 1.6),
                          h1: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.bold),
                          h2: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.bold),
                          h3: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.bold),
                          strong: const TextStyle(color: AppTheme.foreground, fontWeight: FontWeight.w600),
                          code: TextStyle(
                            color: AppTheme.foreground.withOpacity(0.8),
                            backgroundColor: AppTheme.secondary,
                            fontSize: 12,
                          ),
                          codeblockDecoration: BoxDecoration(
                            color: AppTheme.secondary,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          listBullet: const TextStyle(color: AppTheme.muted),
                          a: const TextStyle(color: AppTheme.primary),
                        ),
                      ),
              ),
            ),
          ),
          if (!isUser) ...[
            const SizedBox(width: 4),
            IconButton(
              icon: Icon(
                _copiedId == msg.id ? Icons.check : Icons.copy,
                size: 14,
                color: AppTheme.muted,
              ),
              onPressed: () => _copyMessage(msg.id, msg.content),
              constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
              padding: EdgeInsets.zero,
            ),
          ],
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
            height: 28,
            width: 28,
            decoration: BoxDecoration(
              color: AppTheme.foreground.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.smart_toy, size: 16, color: AppTheme.mutedForeground),
          ),
          const SizedBox(width: 8),
          Row(
            children: List.generate(3, (i) {
              return TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: Duration(milliseconds: 600 + i * 150),
                builder: (_, val, child) => Opacity(opacity: val, child: child),
                child: Container(
                  height: 6,
                  width: 6,
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.foreground.withOpacity(0.5),
                    shape: BoxShape.circle,
                  ),
                ),
              );
            }),
          ),
          const SizedBox(width: 8),
          const Text('Thinking', style: TextStyle(fontSize: 12, color: AppTheme.muted)),
        ],
      ),
    );
  }
}
