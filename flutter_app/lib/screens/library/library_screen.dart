import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/generation_model.dart';
import '../../models/download_model.dart';
import '../../providers/generation_provider.dart';
import '../../providers/download_provider.dart';

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
      body: Column(
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
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1,
                    ),
                    itemCount: filteredGenerations.length,
                    itemBuilder: (context, index) {
                      return _GenerationCard(generation: filteredGenerations[index]);
                    },
                  ),
                );
              },
            ),
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

  @override
  Widget build(BuildContext context) {
    final isVideo = generation.type == GenerationType.video;
    final isMusic = generation.type == GenerationType.music;
    final imageUrl = generation.thumbnailUrl ?? generation.outputUrl;

    return GestureDetector(
      onTap: () => _showGenerationDetail(context),
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isMusic
                ? [const Color(0xFF10B981).withOpacity(0.3), const Color(0xFF059669).withOpacity(0.3)]
                : [AppTheme.primary.withOpacity(0.3), const Color(0xFF3B82F6).withOpacity(0.3)],
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
                    Text('Processing...', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                  ],
                ),
              )
            else if (generation.isFailed)
              const Center(
                child: Text('Failed', style: TextStyle(color: AppTheme.destructive, fontSize: 12)),
              )
            else if (isMusic)
              // Music/Audio card with waveform visualization
              Container(
                color: AppTheme.card,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF10B981), Color(0xFF059669)],
                        ),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: const Icon(Icons.music_note, color: Colors.white, size: 24),
                    ),
                    const SizedBox(height: 8),
                    // Static waveform bars
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
              )
            else if (imageUrl != null)
              CachedNetworkImage(
                imageUrl: imageUrl,
                fit: BoxFit.cover,
                placeholder: (context, url) => const Center(
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                errorWidget: (context, url, error) => Container(
                  color: AppTheme.secondary,
                  child: const Icon(Icons.error_outline, color: AppTheme.muted),
                ),
              )
            else
              Center(
                child: Icon(
                  isVideo ? Icons.videocam : Icons.image,
                  color: AppTheme.muted,
                  size: 32,
                ),
              ),

            // Video/Music play indicator
            if ((isVideo || isMusic) && !generation.isPending && !isMusic)
              Positioned.fill(
                child: Container(
                  color: Colors.black26,
                  child: const Center(
                    child: Icon(Icons.play_arrow, color: Colors.white, size: 32),
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
                  isMusic ? 'music' : (isVideo ? 'video' : 'image'),
                  style: const TextStyle(color: Colors.white, fontSize: 10),
                ),
              ),
            ),

            // Favorite button
            Positioned(
              bottom: 8,
              right: 8,
              child: Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.favorite_border, color: Colors.white, size: 12),
              ),
            ),
          ],
      ),
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
                  Container(
                    height: 120,
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
                          child: const Icon(
                            Icons.play_arrow,
                            color: Colors.white,
                            size: 32,
                          ),
                        ),
                        const SizedBox(height: 8),
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
                  )
                else if (generation.outputUrl != null)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: CachedNetworkImage(
                      imageUrl: generation.outputUrl!,
                      fit: BoxFit.contain,
                    ),
                  ),
                const SizedBox(height: 16),

                // Model & Type badges
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        generation.model,
                        style: const TextStyle(color: AppTheme.primary, fontSize: 12),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
                const Text('Prompt', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Text(
                  generation.prompt,
                  style: const TextStyle(color: AppTheme.mutedForeground),
                ),
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
                          context.read<GenerationProvider>().deleteGeneration(generation.id);
                          Navigator.pop(context);
                        },
                        icon: const Icon(Icons.delete_outline, color: AppTheme.destructive),
                        label: const Text('Delete', style: TextStyle(color: AppTheme.destructive)),
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
        saveToGallery: generation.type != GenerationType.music, // Audio doesn't go to photo gallery
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
