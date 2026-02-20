import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../../core/theme.dart';
import '../../models/generation_model.dart';
import '../../models/download_model.dart';
import '../../providers/generation_provider.dart';
import '../../providers/download_provider.dart';
import '../../providers/favorites_provider.dart';
import '../../services/audio_player_service.dart';
import '../../widgets/music_player_bar.dart';
import '../../widgets/common/smart_media_image.dart';
import '../../widgets/report_content_dialog.dart';
import '../../widgets/common/cached_video_player.dart';

class LibraryScreen extends StatefulWidget {
  const LibraryScreen({super.key});

  @override
  State<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends State<LibraryScreen> {
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _loadGenerations();
  }

  Future<void> _loadGenerations() async {
    final provider = context.read<GenerationProvider>();
    await provider.loadGenerations(limit: 50);
  }

  Future<void> _handleRefresh() async {
    await _loadGenerations();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Library'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {},
          ),
        ],
      ),
      body: Stack(
        children: [
          Column(
            children: [
          // Filter Tabs
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterChip(
                    label: 'All',
                    isSelected: _filter == 'all',
                    onTap: () => setState(() => _filter = 'all'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Images',
                    isSelected: _filter == 'image',
                    onTap: () => setState(() => _filter = 'image'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Videos',
                    isSelected: _filter == 'video',
                    onTap: () => setState(() => _filter = 'video'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Music',
                    isSelected: _filter == 'music',
                    onTap: () => setState(() => _filter = 'music'),
                  ),
                ],
              ),
            ),
          ),

          // Grid
          Expanded(
            child: Consumer<GenerationProvider>(
              builder: (context, provider, child) {
                final filteredGenerations = _filter == 'all'
                    ? provider.generations
                    : provider.generations.where((g) {
                        switch (_filter) {
                          case 'image':
                            return g.type == GenerationType.image;
                          case 'video':
                            return g.type == GenerationType.video;
                          case 'music':
                            return g.type == GenerationType.music;
                          default:
                            return true;
                        }
                      }).toList();

                if (filteredGenerations.isEmpty) {
                  return _buildEmptyState();
                }

                return RefreshIndicator(
                  onRefresh: _handleRefresh,
                  child: GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1,
                    ),
                    itemCount: filteredGenerations.length,
                    itemBuilder: (context, index) {
                      return _GenerationCard(
                          generation: filteredGenerations[index]);
                    },
                  ),
                );
              },
            ),
          ),
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
    );
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
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(32),
            ),
            child: const Icon(Icons.image, size: 32, color: AppTheme.muted),
          ),
          const SizedBox(height: 16),
          const Text(
            'No creations yet',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          const Text(
            'Start creating to see them here',
            style: TextStyle(color: AppTheme.muted, fontSize: 14),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : AppTheme.secondary,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppTheme.mutedForeground,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

class _GenerationCard extends StatelessWidget {
  final Generation generation;

  const _GenerationCard({required this.generation});

  String get _typeString {
    switch (generation.type) {
      case GenerationType.image:
        return 'image';
      case GenerationType.video:
        return 'video';
      case GenerationType.music:
        return 'music';
    }
  }

  @override
  Widget build(BuildContext context) {
    final isVideo = generation.type == GenerationType.video;
    final isMusic = generation.type == GenerationType.music;
    final imageUrl = generation.thumbnailUrl ?? generation.outputUrl;

    return Consumer<FavoritesProvider>(
      builder: (context, favoritesProvider, _) {
        final isFavorite = favoritesProvider.isFavorite(generation.id);

        return GestureDetector(
          onTap: () => _showGenerationDetail(context),
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isMusic
                    ? [
                        const Color(0xFF10B981).withOpacity(0.3),
                        const Color(0xFF059669).withOpacity(0.3)
                      ]
                    : [
                        AppTheme.primary.withOpacity(0.3),
                        const Color(0xFF3B82F6).withOpacity(0.3)
                      ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (generation.isPending)
                  const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(strokeWidth: 2),
                        SizedBox(height: 8),
                        Text('Processing...',
                            style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                      ],
                    ),
                  )
                else if (generation.isFailed)
                  const Center(
                    child: Text('Failed',
                        style:
                            TextStyle(color: AppTheme.destructive, fontSize: 12)),
                  )
                else if (isMusic)
                  Consumer<AudioPlayerService>(
                    builder: (context, player, _) {
                      final isCurrentTrack = player.currentUrl == generation.outputUrl;
                      final isPlaying = isCurrentTrack && player.isPlaying;
                      
                      return GestureDetector(
                        onTap: () {
                          if (generation.outputUrl != null) {
                            player.play(
                              url: generation.outputUrl!,
                              title: generation.title ?? 'AI Track',
                              artist: 'AI Generated',
                            );
                          }
                        },
                        child: Container(
                          color: isCurrentTrack 
                              ? const Color(0xFF10B981).withOpacity(0.2) 
                              : AppTheme.card,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: isCurrentTrack
                                        ? [const Color(0xFF10B981), Colors.teal]
                                        : [const Color(0xFF10B981), const Color(0xFF059669)],
                                  ),
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                child: Icon(
                                  isPlaying ? Icons.pause : Icons.play_arrow,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(height: 8),
                              if (isCurrentTrack)
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 12),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(2),
                                    child: LinearProgressIndicator(
                                      value: player.progress,
                                      backgroundColor: AppTheme.border,
                                      valueColor: const AlwaysStoppedAnimation(Color(0xFF10B981)),
                                      minHeight: 3,
                                    ),
                                  ),
                                )
                              else
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: List.generate(12, (i) {
                                    final height = 8.0 + (i % 3) * 6.0 + (i % 2) * 4.0;
                                    return Container(
                                      width: 3,
                                      height: height,
                                      margin: const EdgeInsets.symmetric(horizontal: 1),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981),
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                    );
                                  }),
                                ),
                              const SizedBox(height: 8),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 8),
                                child: Text(
                                  generation.title ?? generation.prompt,
                                  style: const TextStyle(fontSize: 11),
                                  textAlign: TextAlign.center,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  )
                else if (imageUrl != null)
                  isVideo
                    ? Stack(
                        fit: StackFit.expand,
                        children: [
                          // Use thumbnail if available, otherwise show placeholder
                          if (generation.thumbnailUrl != null && generation.thumbnailUrl!.isNotEmpty)
                            SmartMediaImage(
                              imageUrl: generation.thumbnailUrl,
                              fit: BoxFit.cover,
                              isVideo: true,
                            )
                          else if (generation.outputUrl != null)
                            // Use CachedVideoPlayer to show first frame
                            CachedVideoPlayer(
                              videoUrl: generation.outputUrl!,
                              autoPlay: false,
                              looping: false,
                              muted: true,
                              fit: BoxFit.cover,
                              placeholder: Container(
                                color: AppTheme.secondary,
                                child: const Center(
                                  child: Icon(Icons.videocam_outlined, color: AppTheme.muted, size: 32),
                                ),
                              ),
                            )
                          else
                            Container(
                              color: AppTheme.secondary,
                              child: const Center(
                                child: Icon(Icons.videocam_outlined, color: AppTheme.muted, size: 32),
                              ),
                            ),
                        ],
                      )
                    : SmartMediaImage(
                        imageUrl: imageUrl,
                        fit: BoxFit.cover,
                      )
                else
                  Center(
                    child: Icon(
                      isVideo ? Icons.videocam : Icons.image,
                      color: AppTheme.muted,
                      size: 32,
                    ),
                  ),

                // Video play indicator
                if (isVideo && !generation.isPending)
                  Positioned.fill(
                    child: Container(
                      color: Colors.black26,
                      child: const Center(
                        child:
                            Icon(Icons.play_arrow, color: Colors.white, size: 32),
                      ),
                    ),
                  ),

                // Type badge
                Positioned(
                  bottom: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _typeString,
                      style: const TextStyle(color: Colors.white, fontSize: 10),
                    ),
                  ),
                ),

                // Favorite button
                Positioned(
                  bottom: 8,
                  right: 8,
                  child: GestureDetector(
                    onTap: () {
                      favoritesProvider.toggleFavorite(
                        id: generation.id,
                        type: _typeString,
                        url: generation.outputUrl,
                        thumbnailUrl: generation.thumbnailUrl,
                        title: generation.title,
                        prompt: generation.prompt,
                      );
                      
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            isFavorite ? 'Removed from favorites' : 'Added to favorites',
                          ),
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    },
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        isFavorite ? Icons.favorite : Icons.favorite_border,
                        color: isFavorite ? Colors.redAccent : Colors.white,
                        size: 14,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showGenerationDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppTheme.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Preview
                if (generation.type == GenerationType.music)
                  // Audio player preview
                  Consumer<AudioPlayerService>(
                    builder: (context, player, _) {
                      final isCurrentTrack = player.currentUrl == generation.outputUrl;
                      final isPlaying = isCurrentTrack && player.isPlaying;
                      
                      return GestureDetector(
                        onTap: () {
                          if (generation.outputUrl != null) {
                            player.play(
                              url: generation.outputUrl!,
                              title: generation.title ?? 'AI Track',
                              artist: 'AI Generated',
                            );
                          }
                        },
                        child: Container(
                          height: 140,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF10B981), Color(0xFF059669)],
                            ),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  isPlaying ? Icons.pause : Icons.play_arrow,
                                  color: Colors.white,
                                  size: 32,
                                ),
                              ),
                              const SizedBox(height: 8),
                              // Progress bar
                              if (isCurrentTrack)
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 24),
                                  child: Column(
                                    children: [
                                      ClipRRect(
                                        borderRadius: BorderRadius.circular(2),
                                        child: LinearProgressIndicator(
                                          value: player.progress,
                                          backgroundColor: Colors.white.withOpacity(0.3),
                                          valueColor: const AlwaysStoppedAnimation(Colors.white),
                                          minHeight: 4,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            player.formatDuration(player.position),
                                            style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 10),
                                          ),
                                          Text(
                                            player.formatDuration(player.duration),
                                            style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 10),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                )
                              else
                                // Waveform visualization
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: List.generate(20, (i) {
                                    final height = 8.0 + (i % 3) * 8.0 + (i % 2) * 4.0;
                                    return Container(
                                      width: 3,
                                      height: height,
                                      margin: const EdgeInsets.symmetric(horizontal: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withOpacity(0.8),
                                        borderRadius: BorderRadius.circular(2),
                                      ),
                                    );
                                  }),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  )
                else if (generation.outputUrl != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: generation.type == GenerationType.video
                      ? _VideoPlayerWidget(videoUrl: generation.outputUrl!)
                      : SmartMediaImage(
                          imageUrl: generation.outputUrl!,
                          fit: BoxFit.contain,
                        ),
                  ),
                const SizedBox(height: 16),

                // Model & Type badges
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        generation.model,
                        style: const TextStyle(
                            color: AppTheme.primary, fontSize: 12),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _getTypeLabel(generation.type),
                        style: const TextStyle(fontSize: 12),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Prompt
                const Text('Prompt',
                    style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Text(
                  generation.prompt,
                  style: const TextStyle(color: AppTheme.mutedForeground),
                ),
                const SizedBox(height: 20),

                // Details grid
                _DetailSection(generation: generation),
                const SizedBox(height: 24),

                // Actions
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _downloadGeneration(context),
                        icon: const Icon(Icons.download),
                        label: const Text('Save'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () {
                          context
                              .read<GenerationProvider>()
                              .deleteGeneration(generation.id);
                          Navigator.pop(context);
                        },
                        icon: const Icon(Icons.delete_outline,
                            color: AppTheme.destructive),
                        label: const Text('Delete',
                            style: TextStyle(color: AppTheme.destructive)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    IconButton(
                      onPressed: () => ReportContentDialog.show(context, contentType: 'AI Content'),
                      icon: const Icon(Icons.flag_outlined, color: AppTheme.muted),
                      tooltip: 'Report',
                      style: IconButton.styleFrom(
                        side: const BorderSide(color: AppTheme.border),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _getTypeLabel(GenerationType type) {
    switch (type) {
      case GenerationType.video:
        return 'Video';
      case GenerationType.music:
        return 'Music';
      default:
        return 'Image';
    }
  }

  DownloadType _getDownloadType(GenerationType type) {
    switch (type) {
      case GenerationType.video:
        return DownloadType.video;
      case GenerationType.music:
        return DownloadType.audio;
      default:
        return DownloadType.image;
    }
  }

  Future<void> _downloadGeneration(BuildContext context) async {
    if (generation.outputUrl == null) return;

    try {
      final downloadProvider = context.read<DownloadProvider>();

      await downloadProvider.downloadFile(
        url: generation.outputUrl!,
        title: generation.prompt.isNotEmpty
            ? generation.prompt
            : '${_getTypeLabel(generation.type)} Generation',
        type: _getDownloadType(generation.type),
        saveToGallery: generation.type !=
            GenerationType.music, // Audio doesn't go to photo gallery
        metadata: {
          'model': generation.model,
          'prompt': generation.prompt,
          'generationId': generation.id,
        },
      );

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(generation.type == GenerationType.music
                ? 'Saved to Downloads'
                : 'Saved to Downloads & Gallery'),
            backgroundColor: AppTheme.primary,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Save failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

/// Detail info section shown in the generation detail modal
class _DetailSection extends StatelessWidget {
  final Generation generation;

  const _DetailSection({required this.generation});

  @override
  Widget build(BuildContext context) {
    final rows = <_DetailRow>[];

    // Type
    rows.add(_DetailRow(
      icon: Icons.category_outlined,
      label: 'Type',
      value: _typeLabel(generation.type),
    ));

    // Model
    if (generation.model.isNotEmpty) {
      rows.add(_DetailRow(
        icon: Icons.smart_toy_outlined,
        label: 'Model',
        value: generation.model,
      ));
    }

    // Aspect ratio
    if (generation.aspectRatio != null && generation.aspectRatio!.isNotEmpty) {
      rows.add(_DetailRow(
        icon: Icons.aspect_ratio,
        label: 'Aspect Ratio',
        value: generation.aspectRatio!,
      ));
    }

    // Quality
    if (generation.quality != null && generation.quality!.isNotEmpty) {
      rows.add(_DetailRow(
        icon: Icons.high_quality_outlined,
        label: 'Quality',
        value: _capitalize(generation.quality!),
      ));
    }

    // Credits used
    rows.add(_DetailRow(
      icon: Icons.toll_outlined,
      label: 'Credits Used',
      value: generation.creditsUsed.toString(),
    ));

    // Created at
    rows.add(_DetailRow(
      icon: Icons.calendar_today_outlined,
      label: 'Created',
      value: _formatDate(generation.createdAt),
    ));

    // Status
    rows.add(_DetailRow(
      icon: Icons.info_outline,
      label: 'Status',
      value: _capitalize(generation.status.name),
      valueColor: _statusColor(generation.status),
    ));

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.secondary.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border.withOpacity(0.5)),
      ),
      child: Column(
        children: [
          for (int i = 0; i < rows.length; i++) ...[
            rows[i],
            if (i < rows.length - 1)
              Divider(height: 1, color: AppTheme.border.withOpacity(0.4), indent: 16, endIndent: 16),
          ],
        ],
      ),
    );
  }

  String _typeLabel(GenerationType type) {
    switch (type) {
      case GenerationType.video: return 'Video';
      case GenerationType.music: return 'Music';
      default: return 'Image';
    }
  }

  String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);

  String _formatDate(DateTime dt) {
    final months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
  }

  Color _statusColor(GenerationStatus status) {
    switch (status) {
      case GenerationStatus.completed: return const Color(0xFF10B981);
      case GenerationStatus.failed: return AppTheme.destructive;
      case GenerationStatus.pending:
      case GenerationStatus.processing: return const Color(0xFFF59E0B);
    }
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;

  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Icon(icon, size: 18, color: AppTheme.mutedForeground),
          const SizedBox(width: 12),
          Text(
            label,
            style: const TextStyle(color: AppTheme.mutedForeground, fontSize: 13),
          ),
          const Spacer(),
          Flexible(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: valueColor,
              ),
              textAlign: TextAlign.right,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

/// Video player widget for the detail modal with play/pause controls
class _VideoPlayerWidget extends StatefulWidget {
  final String videoUrl;

  const _VideoPlayerWidget({required this.videoUrl});

  @override
  State<_VideoPlayerWidget> createState() => _VideoPlayerWidgetState();
}

class _VideoPlayerWidgetState extends State<_VideoPlayerWidget> {
  late VideoPlayerController _controller;
  bool _isInitialized = false;
  bool _hasError = false;
  bool _showControls = true;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
    
    try {
      await _controller.initialize();
      _controller.setLooping(true);
      if (mounted) {
        setState(() {
          _isInitialized = true;
        });
      }
    } catch (e) {
      debugPrint('Error initializing video: $e');
      if (mounted) {
        setState(() {
          _hasError = true;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _togglePlayPause() {
    setState(() {
      if (_controller.value.isPlaying) {
        _controller.pause();
      } else {
        _controller.play();
        // Hide controls after a delay when playing
        Future.delayed(const Duration(seconds: 2), () {
          if (mounted && _controller.value.isPlaying) {
            setState(() => _showControls = false);
          }
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return Container(
        height: 200,
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, color: AppTheme.muted, size: 40),
              SizedBox(height: 8),
              Text('Video unavailable', style: TextStyle(color: AppTheme.muted)),
            ],
          ),
        ),
      );
    }

    if (!_isInitialized) {
      return Container(
        height: 200,
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      );
    }

    return GestureDetector(
      onTap: () {
        setState(() => _showControls = !_showControls);
        if (!_controller.value.isPlaying) {
          _togglePlayPause();
        }
      },
      child: AspectRatio(
        aspectRatio: _controller.value.aspectRatio,
        child: Stack(
          alignment: Alignment.center,
          children: [
            VideoPlayer(_controller),
            
            // Play/Pause overlay
            AnimatedOpacity(
              opacity: _showControls ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 200),
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(32),
                ),
                child: IconButton(
                  icon: Icon(
                    _controller.value.isPlaying ? Icons.pause : Icons.play_arrow,
                    color: Colors.white,
                    size: 32,
                  ),
                  onPressed: _togglePlayPause,
                ),
              ),
            ),
            
            // Progress indicator
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: AnimatedOpacity(
                opacity: _showControls ? 1.0 : 0.0,
                duration: const Duration(milliseconds: 200),
                child: VideoProgressIndicator(
                  _controller,
                  allowScrubbing: true,
                  colors: const VideoProgressColors(
                    playedColor: AppTheme.primary,
                    bufferedColor: Colors.white30,
                    backgroundColor: Colors.white10,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
