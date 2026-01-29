import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';
import '../../providers/credits_provider.dart';
import '../../services/audio_player_service.dart';
import '../../widgets/music_player_bar.dart';
import '../../widgets/add_credits_dialog.dart';

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
  int _duration = 30;
  bool _isInstrumental = false;
  String _vocalGender = 'female';
  int _weirdness = 50;
  int _styleInfluence = 50;

  final List<String> _styleOptions = [
    'overdrive',
    'drunk',
    'chitarra acustica',
    'hybrid',
    'hall',
    'pop',
    'rock',
    'jazz',
    'electronic',
    'ambient',
    'cinematic',
    'lofi',
    'trap',
    'classical',
    'reggae',
    'hip-hop',
    'r&b',
  ];

  final Set<String> _selectedStyles = {};
  List<Map<String, dynamic>> _libraryTracks = [];
  List<Map<String, dynamic>> _pendingTracks = [];
  bool _isLoadingTracks = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadTracks();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _lyricsController.dispose();
    _customStyleController.dispose();
    _titleController.dispose();
    super.dispose();
  }

  int get _selectedModelCredits {
    final model = _musicModels.firstWhere(
      (m) => m['id'] == _selectedMusicModel,
      orElse: () => {'credits': 5},
    );
    return model['credits'] as int;
  }

  Future<void> _loadTracks() async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        setState(() => _isLoadingTracks = false);
        return;
      }

      // Load completed tracks
      final completedResponse = await _supabase
          .from('generations')
          .select()
          .eq('user_id', user.id)
          .eq('type', 'music')
          .eq('status', 'completed')
          .not('output_url', 'is', null)
          .order('created_at', ascending: false)
          .limit(50);

      // Load pending tracks
      final pendingResponse = await _supabase
          .from('generations')
          .select()
          .eq('user_id', user.id)
          .eq('type', 'music')
          .inFilter('status', ['pending', 'processing']).order('created_at',
              ascending: false);

      setState(() {
        _libraryTracks = List<Map<String, dynamic>>.from(completedResponse);
        _pendingTracks = List<Map<String, dynamic>>.from(pendingResponse);
        _isLoadingTracks = false;
      });
    } catch (e) {
      debugPrint('Error loading tracks: $e');
      setState(() => _isLoadingTracks = false);
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

  // Music models - Kie.ai Suno models
  static const List<Map<String, dynamic>> _musicModels = [
    {'id': 'kie-music-v4', 'name': 'Suno V4', 'credits': 5, 'badge': 'TOP'},
    {
      'id': 'kie-music-v3.5',
      'name': 'Suno V3.5',
      'credits': 4,
      'badge': 'FAST'
    },
  ];

  String _selectedMusicModel = 'kie-music-v4';

  Future<void> _generateMusic() async {
    final session = _supabase.auth.currentSession;
    if (session == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to generate music')),
      );
      return;
    }

    // Check credits
    final creditsProvider = context.read<CreditsProvider>();
    if (!creditsProvider.hasActiveSubscription && 
        creditsProvider.credits < _selectedModelCredits) {
      showAddCreditsDialog(
        context: context,
        currentCredits: creditsProvider.credits,
        requiredCredits: _selectedModelCredits,
      );
      return;
    }

    setState(() => _isGenerating = true);

    try {
      // Build prompt with styles if provided
      final prompt = [
        if (_lyricsController.text.isNotEmpty) _lyricsController.text,
        if (_selectedStyles.isNotEmpty) 'Style: ${_selectedStyles.join(', ')}',
      ].join('\n\n');

      // Call unified generate endpoint with type='music' (same as web app)
      final response = await _supabase.functions.invoke(
        'generate',
        body: {
          'prompt': prompt.isNotEmpty ? prompt : 'Create an instrumental track',
          'type': 'music',
          'model': _selectedMusicModel,
          'duration': _duration,
          'lyrics': _lyricsController.text,
          'instrumental': _isInstrumental,
          'vocalGender': _vocalGender,
          'weirdness': _weirdness,
          'styleInfluence': _styleInfluence,
        },
      );

      final result = response.data;

      if (result['error'] != null) {
        throw Exception(result['error']);
      }

      // Music generation returns immediately with output_url in result
      final outputUrl = result['result']?['output_url'] as String?;

      if (mounted) {
        if (outputUrl != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🎵 Music generated successfully!'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                  'Music is being generated! Check the library for results.'),
            ),
          );
        }
        _loadTracks();
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
        title: const Text('Music Studio'),
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
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: Stack(
          children: [
            TabBarView(
              controller: _tabController,
              children: [
                _buildCreateTab(),
                _buildToolsTab(),
              ],
            ),
            // Bottom music player bar
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: const MusicPlayerBar(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCreateTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 100),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Generated music list on top
          if (_isLoadingTracks)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_pendingTracks.isNotEmpty || _libraryTracks.isNotEmpty)
            _buildMusicLibrary(),

          // Divider
          if (_libraryTracks.isNotEmpty || _pendingTracks.isNotEmpty)
            Divider(color: AppTheme.border, height: 1),

          // Generation form
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Model selector section
                _buildSectionHeader(title: 'Model'),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _musicModels.map((model) {
                      final isSelected = _selectedMusicModel == model['id'];
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          onTap: () => setState(() =>
                              _selectedMusicModel = model['id'] as String),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 12),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppTheme.primary.withOpacity(0.1)
                                  : AppTheme.card,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected
                                    ? AppTheme.primary
                                    : AppTheme.border,
                                width: isSelected ? 2 : 1,
                              ),
                            ),
                            child: Row(
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Text(
                                          model['name'] as String,
                                          style: TextStyle(
                                            fontWeight: FontWeight.w600,
                                            color: isSelected
                                                ? AppTheme.primary
                                                : AppTheme.foreground,
                                          ),
                                        ),
                                        if (model['badge'] != null) ...[
                                          const SizedBox(width: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: AppTheme.accent,
                                              borderRadius:
                                                  BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              model['badge'] as String,
                                              style: const TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.w600,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${model['credits']} credits',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.muted,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 24),

                // Lyrics / Prompt section
                _buildSectionHeader(
                  title: 'Lyrics / Prompt',
                  trailing: IconButton(
                    icon: const Icon(Icons.auto_fix_high, size: 20),
                    onPressed: () {
                      // AI enhance
                    },
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _lyricsController,
                  maxLines: 5,
                  decoration: InputDecoration(
                    hintText:
                        'Write some lyrics or a prompt — or leave blank for instrumental...',
                    hintStyle: TextStyle(color: AppTheme.muted),
                    filled: true,
                    fillColor: AppTheme.card,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppTheme.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppTheme.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppTheme.primary),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Styles section
                _buildCollapsibleSection(
                  title: 'Styles',
                  subtitle: _selectedStyles.isEmpty
                      ? 'Select up to 5 styles'
                      : _selectedStyles.join(', '),
                  isExpanded: _stylesExpanded,
                  onToggle: () =>
                      setState(() => _stylesExpanded = !_stylesExpanded),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
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
                                fillColor: AppTheme.card,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(24),
                                  borderSide:
                                      BorderSide(color: AppTheme.border),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(24),
                                  borderSide:
                                      BorderSide(color: AppTheme.border),
                                ),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 12,
                                ),
                              ),
                              onSubmitted: (_) => _addCustomStyle(),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            icon: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(Icons.add, color: AppTheme.primary),
                            ),
                            onPressed: _addCustomStyle,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Style chips
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          for (final style in _selectedStyles)
                            _buildStyleChip(style, isSelected: true),
                          for (final style in _styleOptions)
                            if (!_selectedStyles.contains(style))
                              _buildStyleChip(style),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Advanced Options
                _buildCollapsibleSection(
                  title: 'Advanced Options',
                  isExpanded: _advancedExpanded,
                  onToggle: () =>
                      setState(() => _advancedExpanded = !_advancedExpanded),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Song Title
                      TextField(
                        controller: _titleController,
                        decoration: InputDecoration(
                          hintText: 'Song Title (Optional)',
                          hintStyle: TextStyle(color: AppTheme.muted),
                          prefixIcon:
                              Icon(Icons.music_note, color: AppTheme.muted),
                          filled: true,
                          fillColor: AppTheme.card,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: AppTheme.border),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide(color: AppTheme.border),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Instrumental Toggle
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.card,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'Instrumental Only',
                                  style: TextStyle(
                                    color: AppTheme.foreground,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Tooltip(
                                  message: 'Generate music without vocals',
                                  child: Icon(
                                    Icons.info_outline,
                                    size: 16,
                                    color: AppTheme.muted,
                                  ),
                                ),
                              ],
                            ),
                            Switch(
                              value: _isInstrumental,
                              onChanged: (value) =>
                                  setState(() => _isInstrumental = value),
                              activeColor: AppTheme.primary,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Vocal Gender (only when not instrumental)
                      if (!_isInstrumental)
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.card,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    'Vocal Gender',
                                    style: TextStyle(
                                      color: AppTheme.foreground,
                                      fontSize: 14,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Tooltip(
                                    message: 'Choose the voice type for vocals',
                                    child: Icon(
                                      Icons.info_outline,
                                      size: 16,
                                      color: AppTheme.muted,
                                    ),
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  _buildGenderButton('Male', 'male'),
                                  const SizedBox(width: 8),
                                  _buildGenderButton('Female', 'female'),
                                ],
                              ),
                            ],
                          ),
                        ),
                      if (!_isInstrumental) const SizedBox(height: 12),

                      // Duration slider
                      _buildSliderOption(
                        label: 'Duration',
                        value: _duration,
                        min: 15,
                        max: 120,
                        divisions: 7,
                        suffix: 's',
                        tooltip: 'Length of the generated track',
                        onChanged: (value) =>
                            setState(() => _duration = value.round()),
                      ),
                      const SizedBox(height: 12),

                      // Weirdness slider
                      _buildSliderOption(
                        label: 'Weirdness',
                        value: _weirdness,
                        min: 0,
                        max: 100,
                        divisions: 20,
                        suffix: '%',
                        tooltip:
                            'Higher values create more experimental sounds',
                        onChanged: (value) =>
                            setState(() => _weirdness = value.round()),
                      ),
                      const SizedBox(height: 12),

                      // Style Influence slider
                      _buildSliderOption(
                        label: 'Style Influence',
                        value: _styleInfluence,
                        min: 0,
                        max: 100,
                        divisions: 20,
                        suffix: '%',
                        tooltip: 'How closely to follow genre conventions',
                        onChanged: (value) =>
                            setState(() => _styleInfluence = value.round()),
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
                              Text('Generating...',
                                  style: TextStyle(color: Colors.white)),
                            ],
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.auto_awesome,
                                  size: 20, color: Colors.white),
                              const SizedBox(width: 8),
                              const Text(
                                'Create Music',
                                style: TextStyle(
                                  color: Colors.white,
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
                                  color: Colors.white.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  '$_selectedModelCredits',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMusicLibrary() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
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
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '${_libraryTracks.length} tracks',
                  style: TextStyle(color: AppTheme.muted, fontSize: 12),
                ),
              ),
            ],
          ),
        ),

        // Pending tracks
        for (final track in _pendingTracks) _buildPendingTrackItem(track),

        // Completed tracks
        SizedBox(
          height: 180,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _libraryTracks.length,
            itemBuilder: (context, index) {
              final track = _libraryTracks[index];
              return _buildTrackCard(track);
            },
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildPendingTrackItem(Map<String, dynamic> track) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.primary.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primary.withOpacity(0.3),
                  AppTheme.primary.withOpacity(0.1)
                ],
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Creating...',
                  style: TextStyle(
                    color: AppTheme.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  track['prompt'] ?? '',
                  style: TextStyle(color: AppTheme.muted, fontSize: 12),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(Icons.close, color: AppTheme.muted, size: 20),
            onPressed: () {
              // Cancel generation
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTrackCard(Map<String, dynamic> track) {
    final player = Provider.of<AudioPlayerService>(context);
    final isCurrentTrack = player.currentUrl == track['output_url'];
    final isPlaying = isCurrentTrack && player.isPlaying;

    return GestureDetector(
      onTap: () {
        if (track['output_url'] != null) {
          player.play(
            url: track['output_url'],
            title: track['title'] ?? 'AI Track',
            artist: 'AI Generated',
          );
        }
      },
      child: Container(
        width: 140,
        margin: const EdgeInsets.symmetric(horizontal: 6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Album art with play button
            Container(
              height: 120,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: isCurrentTrack
                      ? [AppTheme.primary, Colors.purple]
                      : [
                          AppTheme.primary.withOpacity(0.3),
                          AppTheme.primary.withOpacity(0.1)
                        ],
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Stack(
                children: [
                  Center(
                    child: Icon(
                      Icons.music_note,
                      size: 40,
                      color: Colors.white.withOpacity(0.5),
                    ),
                  ),
                  // Play/Pause overlay
                  Center(
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.4),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isPlaying ? Icons.pause : Icons.play_arrow,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              track['title'] ?? 'AI Track',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 2),
            Text(
              (_musicModels.firstWhere(
                    (i) => i['id'] == track['model'],
                    orElse: () => {
                      'id': 'AI',
                      'name': 'AI Model',
                      'credits': 5,
                      'badge': 'TOP'
                    },
                  )["name"]) ??
                  'AI',
              style: TextStyle(
                color: AppTheme.muted,
                fontSize: 11,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
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
        'credits': 8
      },
      {
        'icon': Icons.tune,
        'title': 'AI Remix',
        'description': 'Create unique AI-powered remixes',
        'badge': 'NEW',
        'badgeColor': AppTheme.primary,
        'route': '/create/audio/remix',
        'credits': 12
      },
      {
        'icon': Icons.mic,
        'title': 'Voice Generator',
        'description': 'Generate AI singing vocals',
        'route': '/create/audio/vocals',
        'credits': 15
      },
      {
        'icon': Icons.volume_up,
        'title': 'AI Mastering',
        'description': 'Professional-quality mastering',
        'route': '/create/audio/mastering',
        'credits': 6
      },
      {
        'icon': Icons.graphic_eq,
        'title': 'Sound Effects',
        'description': 'Generate SFX from text',
        'route': '/create/audio/sound-effects',
        'credits': 5
      },
      {
        'icon': Icons.auto_awesome,
        'title': 'Audio Enhance',
        'description': 'Clean and enhance audio quality',
        'route': '/create/audio/enhance',
        'credits': 4
      },
      {
        'icon': Icons.speed,
        'title': 'Tempo & Pitch',
        'description': 'Adjust speed and key',
        'route': '/create/audio/tempo-pitch',
        'credits': 3
      },
    ];

    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 1.5,
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

  Widget _buildSectionHeader({
    required String title,
    Widget? trailing,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
        if (trailing != null) trailing,
      ],
    );
  }

  Widget _buildCollapsibleSection({
    required String title,
    String? subtitle,
    required bool isExpanded,
    required VoidCallback onToggle,
    required Widget child,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: onToggle,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    isExpanded
                        ? Icons.keyboard_arrow_down
                        : Icons.keyboard_arrow_right,
                    size: 20,
                    color: AppTheme.muted,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                        if (subtitle != null) ...[
                          const SizedBox(height: 2),
                          Text(
                            subtitle,
                            style: TextStyle(
                              color: AppTheme.muted,
                              fontSize: 12,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (isExpanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: child,
            ),
        ],
      ),
    );
  }

  Widget _buildStyleChip(String style, {bool isSelected = false}) {
    return GestureDetector(
      onTap: () => _toggleStyle(style),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? AppTheme.primary.withOpacity(0.15)
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
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                        colors: [AppTheme.primary, Colors.deepPurple]),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: Colors.white, size: 20),
                ),
                const Spacer(),
                if (badge != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: badgeColor ?? AppTheme.primary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      badge,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 4),
            Expanded(
              child: Text(
                description,
                style: TextStyle(color: AppTheme.muted, fontSize: 11),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '$credits credits',
                style: TextStyle(
                    color: AppTheme.primary,
                    fontSize: 10,
                    fontWeight: FontWeight.w500),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGenderButton(String label, String value) {
    final isSelected = _vocalGender == value;
    return GestureDetector(
      onTap: () => setState(() => _vocalGender = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? AppTheme.primary : AppTheme.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppTheme.muted,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildSliderOption({
    required String label,
    required num value,
    required double min,
    required double max,
    required int divisions,
    required String suffix,
    required String tooltip,
    required ValueChanged<double> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      color: AppTheme.foreground,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Tooltip(
                    message: tooltip,
                    child: Icon(
                      Icons.info_outline,
                      size: 16,
                      color: AppTheme.muted,
                    ),
                  ),
                ],
              ),
              Text(
                '$value$suffix',
                style: TextStyle(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SliderTheme(
            data: SliderThemeData(
              activeTrackColor: AppTheme.primary,
              inactiveTrackColor: AppTheme.border,
              thumbColor: AppTheme.primary,
              overlayColor: AppTheme.primary.withOpacity(0.1),
              trackHeight: 4,
            ),
            child: Slider(
              value: value.toDouble(),
              min: min,
              max: max,
              divisions: divisions,
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }
}
