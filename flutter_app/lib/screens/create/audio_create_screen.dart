import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';

class AudioCreateScreen extends StatefulWidget {
  const AudioCreateScreen({super.key});

  @override
  State<AudioCreateScreen> createState() => _AudioCreateScreenState();
}

class _AudioCreateScreenState extends State<AudioCreateScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _supabase = Supabase.instance.client;
  
  final _lyricsController = TextEditingController();
  final _customStyleController = TextEditingController();
  final _titleController = TextEditingController();
  
  bool _isGenerating = false;
  bool _stylesExpanded = true;
  bool _advancedExpanded = false;
  
  final List<String> _styleOptions = [
    'overdrive', 'drunk', 'chitarra acustica', 'hybrid',
    'hall', 'pop', 'rock', 'jazz', 'electronic', 'ambient',
    'cinematic', 'lofi', 'trap', 'classical', 'reggae',
  ];
  
  final Set<String> _selectedStyles = {};
  List<Map<String, dynamic>> _libraryTracks = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadLibraryTracks();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _lyricsController.dispose();
    _customStyleController.dispose();
    _titleController.dispose();
    super.dispose();
  }

  Future<void> _loadLibraryTracks() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return;

      final response = await _supabase
          .from('generations')
          .select()
          .eq('user_id', user.id)
          .eq('type', 'music')
          .order('created_at', ascending: false)
          .limit(20);

      setState(() {
        _libraryTracks = List<Map<String, dynamic>>.from(response);
      });
    } catch (e) {
      debugPrint('Error loading tracks: $e');
    }
  }

  void _toggleStyle(String style) {
    setState(() {
      if (_selectedStyles.contains(style)) {
        _selectedStyles.remove(style);
      } else if (_selectedStyles.length < 5) {
        _selectedStyles.add(style);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Maximum 5 styles allowed')),
        );
      }
    });
  }

  void _addCustomStyle() {
    final style = _customStyleController.text.trim();
    if (style.isNotEmpty && _selectedStyles.length < 5) {
      setState(() {
        _selectedStyles.add(style);
        _customStyleController.clear();
      });
    }
  }

  Future<void> _generateMusic() async {
    final session = _supabase.auth.currentSession;
    if (session == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to generate music')),
      );
      return;
    }

    setState(() => _isGenerating = true);

    try {
      // Build prompt from lyrics and styles
      final prompt = [
        if (_lyricsController.text.isNotEmpty) _lyricsController.text,
        if (_selectedStyles.isNotEmpty)
          'Style: ${_selectedStyles.join(', ')}',
      ].join('\n\n');

      final response = await _supabase.functions.invoke(
        'music-generation',
        body: {
          'prompt': prompt.isNotEmpty ? prompt : 'Create an instrumental track',
          'title': _titleController.text.isNotEmpty 
              ? _titleController.text 
              : null,
          'styles': _selectedStyles.toList(),
        },
      );

      final result = response.data;

      if (result['error'] != null) {
        throw Exception(result['error']);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Music is being generated! Check Library for results.'),
          ),
        );
        _loadLibraryTracks();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Generation failed: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGenerating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Music'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/create'),
        ),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Create'),
            Tab(text: 'Tools'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCreateTab(),
          _buildToolsTab(),
        ],
      ),
    );
  }

  Widget _buildCreateTab() {
    return Row(
      children: [
        // Left sidebar - Music Apps
        Container(
          width: 200,
          decoration: BoxDecoration(
            color: AppTheme.card,
            border: Border(
              right: BorderSide(color: AppTheme.border),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'MUSIC APPS',
                  style: TextStyle(
                    color: AppTheme.muted,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1,
                  ),
                ),
              ),
              _buildMusicAppItem(
                icon: Icons.music_note,
                title: 'Generate Music',
                subtitle: 'Create music from text',
                isSelected: true,
                badge: 'AI',
                badgeColor: AppTheme.primary,
                onTap: () {},
              ),
              _buildMusicAppItem(
                icon: Icons.layers,
                title: 'Stem Separation',
                subtitle: 'Separate vocals, drums,...',
                badge: 'TOP',
                badgeColor: Colors.blue,
                onTap: () => context.go('/create/audio/stems'),
              ),
              _buildMusicAppItem(
                icon: Icons.tune,
                title: 'AI Remix',
                subtitle: 'Remix with AI variations',
                badge: 'NEW',
                badgeColor: AppTheme.primary,
                onTap: () => context.go('/create/audio/remix'),
              ),
              _buildMusicAppItem(
                icon: Icons.mic,
                title: 'Voice Generator',
                subtitle: 'Generate singing vocals',
                onTap: () => context.go('/create/audio/vocals'),
              ),
              _buildMusicAppItem(
                icon: Icons.volume_up,
                title: 'AI Mastering',
                subtitle: 'Professional audio mast...',
                onTap: () => context.go('/create/audio/mastering'),
              ),
              _buildMusicAppItem(
                icon: Icons.graphic_eq,
                title: 'Sound Effects',
                subtitle: 'Generate SFX from text',
                onTap: () => context.go('/create/audio/sound-effects'),
              ),
              _buildMusicAppItem(
                icon: Icons.auto_awesome,
                title: 'Audio Enhance',
                subtitle: 'Clean and enhance audio',
                onTap: () => context.go('/create/audio/enhance'),
              ),
              _buildMusicAppItem(
                icon: Icons.speed,
                title: 'Tempo & Pitch',
                subtitle: 'Adjust speed and key',
                onTap: () => context.go('/create/audio/tempo-pitch'),
              ),
            ],
          ),
        ),
        // Center - Generation controls
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Lyrics section
                _buildSectionHeader(
                  title: 'Lyrics',
                  icon: Icons.arrow_drop_down,
                  trailing: IconButton(
                    icon: const Icon(Icons.auto_fix_high, size: 20),
                    onPressed: () {
                      // AI enhance lyrics
                    },
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _lyricsController,
                  maxLines: 6,
                  decoration: InputDecoration(
                    hintText: 'Write some lyrics or a prompt — or leave blank for instrumental',
                    hintStyle: TextStyle(color: AppTheme.muted),
                    filled: true,
                    fillColor: AppTheme.background,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.open_in_full, size: 18),
                      onPressed: () {
                        // Expand editor
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Styles section
                _buildCollapsibleSection(
                  title: 'Styles',
                  isExpanded: _stylesExpanded,
                  onToggle: () => setState(() => _stylesExpanded = !_stylesExpanded),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Select up to 5 styles or type your own',
                        style: TextStyle(color: AppTheme.muted, fontSize: 13),
                      ),
                      const SizedBox(height: 12),
                      // Custom style input
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _customStyleController,
                              decoration: InputDecoration(
                                hintText: 'Type a custom style...',
                                hintStyle: TextStyle(color: AppTheme.muted),
                                filled: true,
                                fillColor: AppTheme.background,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                              ),
                              onSubmitted: (_) => _addCustomStyle(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: const Icon(Icons.add),
                            onPressed: _addCustomStyle,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      // Style chips
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          // Selected styles first
                          for (final style in _selectedStyles)
                            _buildStyleChip(style, isSelected: true),
                          // Then available options
                          for (final style in _styleOptions)
                            if (!_selectedStyles.contains(style))
                              _buildStyleChip(style),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Advanced Options section
                _buildCollapsibleSection(
                  title: 'Advanced Options',
                  isExpanded: _advancedExpanded,
                  onToggle: () => setState(() => _advancedExpanded = !_advancedExpanded),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.music_note, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextField(
                              controller: _titleController,
                              decoration: InputDecoration(
                                hintText: 'Song Title (Optional)',
                                hintStyle: TextStyle(color: AppTheme.muted),
                                filled: true,
                                fillColor: AppTheme.background,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide.none,
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // Generate button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isGenerating ? null : _generateMusic,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isGenerating
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              ),
                              SizedBox(width: 12),
                              Text('Generating...'),
                            ],
                          )
                        : const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.auto_awesome, size: 20),
                              SizedBox(width: 8),
                              Text('Create'),
                              SizedBox(width: 8),
                              Text(
                                '20',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
        // Right sidebar - Library
        Container(
          width: 280,
          decoration: BoxDecoration(
            color: AppTheme.card,
            border: Border(
              left: BorderSide(color: AppTheme.border),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    const Text(
                      'My Library',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.border,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${_libraryTracks.length} tracks',
                        style: TextStyle(
                          color: AppTheme.muted,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _libraryTracks.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.library_music,
                              size: 48,
                              color: AppTheme.muted.withOpacity(0.5),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'No tracks yet',
                              style: TextStyle(color: AppTheme.muted),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: _libraryTracks.length,
                        itemBuilder: (context, index) {
                          final track = _libraryTracks[index];
                          return _buildTrackItem(track);
                        },
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildToolsTab() {
    final tools = [
      {
        'icon': Icons.layers,
        'title': 'Stem Separation',
        'description': 'Separate vocals, drums, bass, and other',
        'badge': 'TOP',
        'badgeColor': Colors.blue,
        'route': '/create/audio/stems',
        'credits': 8,
      },
      {
        'icon': Icons.tune,
        'title': 'AI Remix',
        'description': 'Create unique AI-powered remixes',
        'badge': 'NEW',
        'badgeColor': AppTheme.primary,
        'route': '/create/audio/remix',
        'credits': 12,
      },
      {
        'icon': Icons.mic,
        'title': 'Voice Generator',
        'description': 'Generate AI singing vocals',
        'route': '/create/audio/vocals',
        'credits': 15,
      },
      {
        'icon': Icons.volume_up,
        'title': 'AI Mastering',
        'description': 'Professional-quality mastering',
        'route': '/create/audio/mastering',
        'credits': 6,
      },
      {
        'icon': Icons.graphic_eq,
        'title': 'Sound Effects',
        'description': 'Generate SFX from text',
        'route': '/create/audio/sound-effects',
        'credits': 5,
      },
      {
        'icon': Icons.auto_awesome,
        'title': 'Audio Enhance',
        'description': 'Clean and enhance audio quality',
        'route': '/create/audio/enhance',
        'credits': 4,
      },
      {
        'icon': Icons.speed,
        'title': 'Tempo & Pitch',
        'description': 'Adjust speed and key',
        'route': '/create/audio/tempo-pitch',
        'credits': 3,
      },
    ];

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.6,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: tools.length,
      itemBuilder: (context, index) {
        final tool = tools[index];
        return _buildToolCard(
          icon: tool['icon'] as IconData,
          title: tool['title'] as String,
          description: tool['description'] as String,
          credits: tool['credits'] as int,
          badge: tool['badge'] as String?,
          badgeColor: tool['badgeColor'] as Color?,
          onTap: () => context.go(tool['route'] as String),
        );
      },
    );
  }

  Widget _buildMusicAppItem({
    required IconData icon,
    required String title,
    required String subtitle,
    String? badge,
    Color? badgeColor,
    bool isSelected = false,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withOpacity(0.1) : null,
          border: Border(
            left: BorderSide(
              color: isSelected ? AppTheme.primary : Colors.transparent,
              width: 3,
            ),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: isSelected 
                    ? AppTheme.primary.withOpacity(0.2)
                    : AppTheme.border,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w500,
                            fontSize: 13,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (badge != null) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: badgeColor ?? AppTheme.primary,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            badge,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: AppTheme.muted,
                      fontSize: 11,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader({
    required String title,
    IconData? icon,
    Widget? trailing,
  }) {
    return Row(
      children: [
        if (icon != null) Icon(icon, size: 20),
        Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 15,
          ),
        ),
        const Spacer(),
        if (trailing != null) trailing,
      ],
    );
  }

  Widget _buildCollapsibleSection({
    required String title,
    required bool isExpanded,
    required VoidCallback onToggle,
    required Widget child,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InkWell(
          onTap: onToggle,
          child: Row(
            children: [
              Icon(
                isExpanded ? Icons.arrow_drop_down : Icons.arrow_right,
                size: 20,
              ),
              const SizedBox(width: 4),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
        if (isExpanded) ...[
          const SizedBox(height: 12),
          child,
        ],
      ],
    );
  }

  Widget _buildStyleChip(String style, {bool isSelected = false}) {
    return GestureDetector(
      onTap: () => _toggleStyle(style),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected 
              ? AppTheme.primary.withOpacity(0.2) 
              : AppTheme.background,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? AppTheme.primary : AppTheme.border,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? Icons.check : Icons.add,
              size: 14,
              color: isSelected ? AppTheme.primary : AppTheme.muted,
            ),
            const SizedBox(width: 6),
            Text(
              style,
              style: TextStyle(
                color: isSelected ? AppTheme.primary : AppTheme.foreground,
                fontSize: 13,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrackItem(Map<String, dynamic> track) {
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppTheme.border,
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Icon(Icons.music_note, size: 20),
      ),
      title: Text(
        track['title'] ?? track['prompt'] ?? 'Untitled',
        style: const TextStyle(fontSize: 14),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      subtitle: Text(
        track['status'] ?? 'completed',
        style: TextStyle(
          color: track['status'] == 'processing' 
              ? Colors.orange 
              : AppTheme.muted,
          fontSize: 12,
        ),
      ),
      trailing: IconButton(
        icon: const Icon(Icons.play_arrow, size: 20),
        onPressed: () {
          // Play track
        },
      ),
    );
  }

  Widget _buildToolCard({
    required IconData icon,
    required String title,
    required String description,
    required int credits,
    String? badge,
    Color? badgeColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppTheme.primary, Colors.deepPurple],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: Colors.white, size: 22),
                ),
                const Spacer(),
                if (badge != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: badgeColor ?? AppTheme.primary,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      badge,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 4),
            Expanded(
              child: Text(
                description,
                style: TextStyle(
                  color: AppTheme.muted,
                  fontSize: 12,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '$credits credits',
                style: TextStyle(
                  color: AppTheme.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
