import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';
import '../../models/conversation_model.dart';
import '../../services/chat_service.dart';
import 'model_logo.dart';

/// Chat folder model
class ChatFolder {
  final String id;
  final String name;
  final Color color;
  final DateTime createdAt;

  ChatFolder({
    required this.id,
    required this.name,
    required this.color,
    required this.createdAt,
  });

  factory ChatFolder.fromJson(Map<String, dynamic> json) {
    return ChatFolder(
      id: json['id'] as String,
      name: json['name'] as String,
      color: _parseColor(json['color'] as String?),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  static Color _parseColor(String? hex) {
    if (hex == null) return const Color(0xFF6366F1);
    final buffer = StringBuffer();
    if (hex.length == 6 || hex.length == 7) buffer.write('FF');
    buffer.write(hex.replaceFirst('#', ''));
    return Color(int.parse(buffer.toString(), radix: 16));
  }
}

/// Time group for organizing conversations
enum TimeGroup { today, yesterday, thisWeek, lastWeek, thisMonth, older }

extension TimeGroupExt on TimeGroup {
  String get label {
    switch (this) {
      case TimeGroup.today:
        return 'Today';
      case TimeGroup.yesterday:
        return 'Yesterday';
      case TimeGroup.thisWeek:
        return 'This Week';
      case TimeGroup.lastWeek:
        return 'Last Week';
      case TimeGroup.thisMonth:
        return 'This Month';
      case TimeGroup.older:
        return 'Older';
    }
  }
}

TimeGroup _getTimeGroup(DateTime date) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final yesterday = today.subtract(const Duration(days: 1));
  final thisWeekStart = today.subtract(Duration(days: today.weekday - 1));
  final lastWeekStart = thisWeekStart.subtract(const Duration(days: 7));
  final thisMonthStart = DateTime(now.year, now.month, 1);

  if (date.isAfter(today) || date.isAtSameMomentAs(today)) {
    return TimeGroup.today;
  } else if (date.isAfter(yesterday)) {
    return TimeGroup.yesterday;
  } else if (date.isAfter(thisWeekStart)) {
    return TimeGroup.thisWeek;
  } else if (date.isAfter(lastWeekStart)) {
    return TimeGroup.lastWeek;
  } else if (date.isAfter(thisMonthStart)) {
    return TimeGroup.thisMonth;
  }
  return TimeGroup.older;
}

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
  final _supabase = Supabase.instance.client;
  final _searchController = TextEditingController();

  List<Conversation> _conversations = [];
  List<ChatFolder> _folders = [];
  bool _isLoading = true;
  bool _isSearchOpen = false;
  String _searchQuery = '';
  final Set<String> _expandedFolders = {};
  final Set<TimeGroup> _expandedGroups = {
    TimeGroup.today,
    TimeGroup.yesterday,
    TimeGroup.thisWeek
  };

  @override
  void initState() {
    super.initState();
    _loadData();
    _searchController.addListener(() {
      setState(() => _searchQuery = _searchController.text);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return;

      final [convsResult, foldersResult] = await Future.wait([
        _chatService.getConversations(),
        _supabase
            .from('chat_folders')
            .select()
            .eq('user_id', user.id)
            .order('name'),
      ]);

      if (mounted) {
        setState(() {
          _conversations = (convsResult as List<Conversation>)
              .where((c) => c.model == widget.currentModel)
              .toList();
          _folders = (foldersResult as List<dynamic>)
              .map((f) => ChatFolder.fromJson(f))
              .toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
      debugPrint('Error loading data: $e');
    }
  }

  List<Conversation> get _filteredConversations {
    if (_searchQuery.isEmpty) return _conversations;
    final query = _searchQuery.toLowerCase();
    return _conversations
        .where((c) => c.title?.toLowerCase().contains(query) ?? false)
        .toList();
  }

  List<Conversation> get _pinnedConversations =>
      _filteredConversations.where((c) => c.pinned && c.folderId == null).toList();

  Map<TimeGroup, List<Conversation>> get _groupedConversations {
    final unpinned =
        _filteredConversations.where((c) => !c.pinned && c.folderId == null);
    final groups = <TimeGroup, List<Conversation>>{};
    for (final group in TimeGroup.values) {
      groups[group] = [];
    }
    for (final conv in unpinned) {
      final group = _getTimeGroup(conv.updatedAt);
      groups[group]!.add(conv);
    }
    return groups;
  }

  List<Conversation> _getConversationsInFolder(String folderId) =>
      _filteredConversations.where((c) => c.folderId == folderId).toList();

  Future<void> _togglePin(Conversation conv) async {
    try {
      await _supabase
          .from('conversations')
          .update({'pinned': !conv.pinned}).eq('id', conv.id);
      await _loadData();
    } catch (e) {
      debugPrint('Error toggling pin: $e');
    }
  }

  Future<void> _moveToFolder(Conversation conv, String? folderId) async {
    try {
      await _supabase
          .from('conversations')
          .update({'folder_id': folderId}).eq('id', conv.id);
      await _loadData();
    } catch (e) {
      debugPrint('Error moving to folder: $e');
    }
  }

  Future<void> _deleteConversation(String id) async {
    try {
      await _chatService.deleteConversation(id);
      await _loadData();
      if (widget.currentConversationId == id) {
        widget.onNewConversation();
      }
    } catch (e) {
      debugPrint('Error deleting conversation: $e');
    }
  }

  Future<void> _createFolder() async {
    final nameController = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.card,
        title: const Text('Create Folder'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            hintText: 'Folder name',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, nameController.text.trim()),
            child: const Text('Create'),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty) {
      try {
        final user = _supabase.auth.currentUser;
        if (user == null) return;
        await _supabase.from('chat_folders').insert({
          'user_id': user.id,
          'name': result,
          'color': '#6366f1',
        });
        await _loadData();
      } catch (e) {
        debugPrint('Error creating folder: $e');
      }
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
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppTheme.border)),
              ),
              child: Row(
                children: [
                  ModelLogo(modelId: widget.currentModel, size: 32),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'History',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                  // Search button
                  IconButton(
                    icon: Icon(
                      _isSearchOpen ? Icons.close : Icons.search,
                      size: 20,
                    ),
                    onPressed: () {
                      setState(() {
                        _isSearchOpen = !_isSearchOpen;
                        if (!_isSearchOpen) {
                          _searchController.clear();
                        }
                      });
                    },
                  ),
                  // Create folder button
                  IconButton(
                    icon: const Icon(Icons.create_new_folder_outlined, size: 20),
                    onPressed: _createFolder,
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),

            // Search bar
            if (_isSearchOpen)
              Padding(
                padding: const EdgeInsets.all(8),
                child: TextField(
                  controller: _searchController,
                  autofocus: true,
                  decoration: InputDecoration(
                    hintText: 'Search conversations...',
                    prefixIcon: const Icon(Icons.search, size: 20),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () => _searchController.clear(),
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppTheme.border),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                  ),
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

            // Content
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _filteredConversations.isEmpty
                      ? _buildEmptyState()
                      : RefreshIndicator(
                          onRefresh: _loadData,
                          child: ListView(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            children: [
                              // Folders
                              ..._folders.map((folder) => _FolderSection(
                                    folder: folder,
                                    conversations:
                                        _getConversationsInFolder(folder.id),
                                    isExpanded:
                                        _expandedFolders.contains(folder.id),
                                    onToggle: () {
                                      setState(() {
                                        if (_expandedFolders
                                            .contains(folder.id)) {
                                          _expandedFolders.remove(folder.id);
                                        } else {
                                          _expandedFolders.add(folder.id);
                                        }
                                      });
                                    },
                                    currentConversationId:
                                        widget.currentConversationId,
                                    onSelectConversation: (id) {
                                      widget.onSelectConversation(id);
                                      Navigator.pop(context);
                                    },
                                    onDeleteConversation: _deleteConversation,
                                    onTogglePin: _togglePin,
                                    allFolders: _folders,
                                    onMoveToFolder: _moveToFolder,
                                  )),

                              // Pinned
                              if (_pinnedConversations.isNotEmpty) ...[
                                _SectionHeader(
                                  title: 'Pinned',
                                  icon: Icons.push_pin,
                                ),
                                ..._pinnedConversations.map(
                                  (conv) => _ConversationTile(
                                    conversation: conv,
                                    isSelected:
                                        conv.id == widget.currentConversationId,
                                    onTap: () {
                                      widget.onSelectConversation(conv.id);
                                      Navigator.pop(context);
                                    },
                                    onDelete: () =>
                                        _deleteConversation(conv.id),
                                    onTogglePin: () => _togglePin(conv),
                                    folders: _folders,
                                    onMoveToFolder: (folderId) =>
                                        _moveToFolder(conv, folderId),
                                  ),
                                ),
                              ],

                              // Time grouped
                              ...TimeGroup.values.map((group) {
                                final convs = _groupedConversations[group]!;
                                if (convs.isEmpty) return const SizedBox();
                                return _TimeGroupSection(
                                  group: group,
                                  conversations: convs,
                                  isExpanded: _expandedGroups.contains(group),
                                  onToggle: () {
                                    setState(() {
                                      if (_expandedGroups.contains(group)) {
                                        _expandedGroups.remove(group);
                                      } else {
                                        _expandedGroups.add(group);
                                      }
                                    });
                                  },
                                  currentConversationId:
                                      widget.currentConversationId,
                                  onSelectConversation: (id) {
                                    widget.onSelectConversation(id);
                                    Navigator.pop(context);
                                  },
                                  onDeleteConversation: _deleteConversation,
                                  onTogglePin: _togglePin,
                                  folders: _folders,
                                  onMoveToFolder: _moveToFolder,
                                );
                              }),
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
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.chat_bubble_outline,
            size: 48,
            color: AppTheme.muted.withOpacity(0.5),
          ),
          const SizedBox(height: 12),
          Text(
            _searchQuery.isNotEmpty
                ? 'No conversations found'
                : 'No conversations yet',
            style: const TextStyle(color: AppTheme.muted),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;

  const _SectionHeader({required this.title, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Row(
        children: [
          Icon(icon, size: 14, color: AppTheme.muted),
          const SizedBox(width: 6),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppTheme.muted,
            ),
          ),
        ],
      ),
    );
  }
}

class _FolderSection extends StatelessWidget {
  final ChatFolder folder;
  final List<Conversation> conversations;
  final bool isExpanded;
  final VoidCallback onToggle;
  final String? currentConversationId;
  final Function(String) onSelectConversation;
  final Function(String) onDeleteConversation;
  final Function(Conversation) onTogglePin;
  final List<ChatFolder> allFolders;
  final Function(Conversation, String?) onMoveToFolder;

  const _FolderSection({
    required this.folder,
    required this.conversations,
    required this.isExpanded,
    required this.onToggle,
    this.currentConversationId,
    required this.onSelectConversation,
    required this.onDeleteConversation,
    required this.onTogglePin,
    required this.allFolders,
    required this.onMoveToFolder,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: onToggle,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Icon(
                  isExpanded ? Icons.expand_more : Icons.chevron_right,
                  size: 18,
                  color: AppTheme.muted,
                ),
                const SizedBox(width: 4),
                Icon(
                  isExpanded ? Icons.folder_open : Icons.folder,
                  size: 18,
                  color: folder.color,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    folder.name,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${conversations.length}',
                    style:
                        const TextStyle(fontSize: 11, color: AppTheme.muted),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (isExpanded && conversations.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(left: 24),
            child: Column(
              children: conversations
                  .map((conv) => _ConversationTile(
                        conversation: conv,
                        isSelected: conv.id == currentConversationId,
                        onTap: () => onSelectConversation(conv.id),
                        onDelete: () => onDeleteConversation(conv.id),
                        onTogglePin: () => onTogglePin(conv),
                        folders: allFolders,
                        onMoveToFolder: (folderId) =>
                            onMoveToFolder(conv, folderId),
                        currentFolderId: folder.id,
                      ))
                  .toList(),
            ),
          ),
      ],
    );
  }
}

class _TimeGroupSection extends StatelessWidget {
  final TimeGroup group;
  final List<Conversation> conversations;
  final bool isExpanded;
  final VoidCallback onToggle;
  final String? currentConversationId;
  final Function(String) onSelectConversation;
  final Function(String) onDeleteConversation;
  final Function(Conversation) onTogglePin;
  final List<ChatFolder> folders;
  final Function(Conversation, String?) onMoveToFolder;

  const _TimeGroupSection({
    required this.group,
    required this.conversations,
    required this.isExpanded,
    required this.onToggle,
    this.currentConversationId,
    required this.onSelectConversation,
    required this.onDeleteConversation,
    required this.onTogglePin,
    required this.folders,
    required this.onMoveToFolder,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: onToggle,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Icon(
                  isExpanded ? Icons.expand_more : Icons.chevron_right,
                  size: 18,
                  color: AppTheme.muted,
                ),
                const SizedBox(width: 8),
                Text(
                  group.label,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.muted,
                  ),
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${conversations.length}',
                    style:
                        const TextStyle(fontSize: 11, color: AppTheme.muted),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (isExpanded)
          ...conversations.map((conv) => _ConversationTile(
                conversation: conv,
                isSelected: conv.id == currentConversationId,
                onTap: () => onSelectConversation(conv.id),
                onDelete: () => onDeleteConversation(conv.id),
                onTogglePin: () => onTogglePin(conv),
                folders: folders,
                onMoveToFolder: (folderId) => onMoveToFolder(conv, folderId),
              )),
      ],
    );
  }
}

class _ConversationTile extends StatelessWidget {
  final Conversation conversation;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback onDelete;
  final VoidCallback onTogglePin;
  final List<ChatFolder> folders;
  final Function(String?) onMoveToFolder;
  final String? currentFolderId;

  const _ConversationTile({
    required this.conversation,
    required this.isSelected,
    required this.onTap,
    required this.onDelete,
    required this.onTogglePin,
    required this.folders,
    required this.onMoveToFolder,
    this.currentFolderId,
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
        onLongPress: () => _showContextMenu(context),
        selected: isSelected,
        selectedTileColor: AppTheme.primary.withOpacity(0.1),
        dense: true,
        leading: conversation.pinned
            ? const Icon(Icons.push_pin, size: 18, color: AppTheme.primary)
            : const Icon(Icons.chat_bubble_outline, size: 18),
        title: Text(
          conversation.title ?? 'New conversation',
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
        trailing: IconButton(
          icon: const Icon(Icons.more_horiz, size: 18),
          onPressed: () => _showContextMenu(context),
        ),
      ),
    );
  }

  void _showContextMenu(BuildContext context) {
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
              leading: Icon(
                conversation.pinned ? Icons.push_pin_outlined : Icons.push_pin,
                color: AppTheme.foreground,
              ),
              title: Text(conversation.pinned ? 'Unpin' : 'Pin to top'),
              onTap: () {
                Navigator.pop(context);
                onTogglePin();
              },
            ),
            if (folders.isNotEmpty) ...[
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.folder_outlined),
                title: const Text('Move to folder'),
                trailing: const Icon(Icons.chevron_right, size: 18),
                onTap: () {
                  Navigator.pop(context);
                  _showFolderPicker(context);
                },
              ),
            ],
            if (currentFolderId != null) ...[
              ListTile(
                leading: const Icon(Icons.folder_off_outlined),
                title: const Text('Remove from folder'),
                onTap: () {
                  Navigator.pop(context);
                  onMoveToFolder(null);
                },
              ),
            ],
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: Colors.red),
              title: const Text('Delete', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(context);
                onDelete();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  void _showFolderPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              margin: const EdgeInsets.only(top: 8),
              alignment: Alignment.center,
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Move to folder',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
            ...folders.map((folder) => ListTile(
                  leading: Icon(Icons.folder, color: folder.color),
                  title: Text(folder.name),
                  trailing: currentFolderId == folder.id
                      ? const Icon(Icons.check, color: AppTheme.primary)
                      : null,
                  onTap: () {
                    Navigator.pop(context);
                    onMoveToFolder(folder.id);
                  },
                )),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
