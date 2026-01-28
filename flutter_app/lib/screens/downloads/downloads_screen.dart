import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:video_player/video_player.dart';
import '../../core/theme.dart';
import '../../models/download_model.dart';
import '../../providers/download_provider.dart';

class DownloadsScreen extends StatefulWidget {
  const DownloadsScreen({super.key});

  @override
  State<DownloadsScreen> createState() => _DownloadsScreenState();
}

class _DownloadsScreenState extends State<DownloadsScreen> {
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DownloadProvider>().loadDownloads();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Text('Downloads'),
        actions: [
          Consumer<DownloadProvider>(
            builder: (context, provider, _) {
              if (provider.downloads.isEmpty) return const SizedBox();
              return IconButton(
                icon: const Icon(Icons.delete_outline),
                onPressed: () => _showClearAllDialog(context, provider),
                tooltip: 'Clear all',
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Storage info
          Consumer<DownloadProvider>(
            builder: (context, provider, _) {
              return Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppTheme.primary.withOpacity(0.3),
                      const Color(0xFF3B82F6).withOpacity(0.3),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.folder_outlined,
                        color: AppTheme.primary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${provider.downloadCount} files',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Using ${provider.formattedTotalSize}',
                            style: const TextStyle(
                              color: AppTheme.muted,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),

          // Filter Tabs
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
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
                  label: 'Audio',
                  isSelected: _filter == 'audio',
                  onTap: () => setState(() => _filter = 'audio'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Downloads Grid
          Expanded(
            child: Consumer<DownloadProvider>(
              builder: (context, provider, _) {
                if (provider.isLoading) {
                  return const Center(child: CircularProgressIndicator());
                }

                final filteredDownloads = _filter == 'all'
                    ? provider.downloads
                    : provider.downloads.where((d) {
                        return d.type.name == _filter;
                      }).toList();

                if (filteredDownloads.isEmpty) {
                  return _buildEmptyState();
                }

                return RefreshIndicator(
                  onRefresh: () => provider.loadDownloads(),
                  child: GridView.builder(
                    padding: const EdgeInsets.all(12),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1,
                    ),
                    itemCount: filteredDownloads.length,
                    itemBuilder: (context, index) {
                      return _DownloadCard(
                        download: filteredDownloads[index],
                        onTap: () => _showDownloadDetail(context, filteredDownloads[index]),
                      );
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
            child: const Icon(Icons.download_outlined, size: 32, color: AppTheme.muted),
          ),
          const SizedBox(height: 16),
          const Text(
            'No downloads yet',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          const Text(
            'Saved media will appear here',
            style: TextStyle(color: AppTheme.muted, fontSize: 14),
          ),
        ],
      ),
    );
  }

  void _showClearAllDialog(BuildContext context, DownloadProvider provider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppTheme.card,
        title: const Text('Clear all downloads?'),
        content: Text(
          'This will delete ${provider.downloadCount} files (${provider.formattedTotalSize}). This action cannot be undone.',
          style: const TextStyle(color: AppTheme.muted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              provider.clearAll();
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(foregroundColor: AppTheme.destructive),
            child: const Text('Delete All'),
          ),
        ],
      ),
    );
  }

  void _showDownloadDetail(BuildContext context, Download download) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => _DownloadDetailSheet(download: download),
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

class _DownloadCard extends StatelessWidget {
  final Download download;
  final VoidCallback onTap;

  const _DownloadCard({
    required this.download,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppTheme.primary.withOpacity(0.3),
              const Color(0xFF3B82F6).withOpacity(0.3),
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
            // Preview
            if (download.isImage)
              Image.file(
                File(download.filePath),
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _buildPlaceholder(),
              )
            else if (download.isVideo)
              _VideoThumbnail(filePath: download.filePath)
            else
              _buildPlaceholder(),

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
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      download.isImage
                          ? Icons.image
                          : download.isVideo
                              ? Icons.videocam
                              : Icons.music_note,
                      color: Colors.white,
                      size: 12,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      download.type.name,
                      style: const TextStyle(color: Colors.white, fontSize: 10),
                    ),
                  ],
                ),
              ),
            ),

            // Size badge
            Positioned(
              bottom: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  download.formattedSize,
                  style: const TextStyle(color: Colors.white, fontSize: 9),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      color: AppTheme.secondary,
      child: Icon(
        download.isAudio ? Icons.music_note : Icons.file_present,
        color: AppTheme.muted,
        size: 32,
      ),
    );
  }
}

class _VideoThumbnail extends StatefulWidget {
  final String filePath;

  const _VideoThumbnail({required this.filePath});

  @override
  State<_VideoThumbnail> createState() => _VideoThumbnailState();
}

class _VideoThumbnailState extends State<_VideoThumbnail> {
  VideoPlayerController? _controller;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _initController();
  }

  Future<void> _initController() async {
    _controller = VideoPlayerController.file(File(widget.filePath));
    await _controller!.initialize();
    if (mounted) {
      setState(() => _initialized = true);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized || _controller == null) {
      return Container(
        color: AppTheme.secondary,
        child: const Center(
          child: Icon(Icons.videocam, color: AppTheme.muted, size: 32),
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        FittedBox(
          fit: BoxFit.cover,
          child: SizedBox(
            width: _controller!.value.size.width,
            height: _controller!.value.size.height,
            child: VideoPlayer(_controller!),
          ),
        ),
        Container(
          color: Colors.black26,
          child: const Center(
            child: Icon(Icons.play_arrow, color: Colors.white, size: 32),
          ),
        ),
      ],
    );
  }
}

class _DownloadDetailSheet extends StatelessWidget {
  final Download download;

  const _DownloadDetailSheet({required this.download});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
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
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: download.isImage
                    ? Image.file(
                        File(download.filePath),
                        fit: BoxFit.contain,
                        width: double.infinity,
                      )
                    : download.isVideo
                        ? _FullVideoPlayer(filePath: download.filePath)
                        : _AudioPlayer(filePath: download.filePath),
              ),
              const SizedBox(height: 16),

              // Title
              Text(
                download.title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 8),

              // Info
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      download.type.name.toUpperCase(),
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
                      download.formattedSize,
                      style: const TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Downloaded ${_formatDate(download.downloadedAt)}',
                style: const TextStyle(color: AppTheme.muted, fontSize: 12),
              ),
              const SizedBox(height: 24),

              // Actions
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _shareFile(context),
                      icon: const Icon(Icons.share),
                      label: const Text('Share'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _deleteFile(context),
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
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) return 'just now';
    if (diff.inHours < 1) return '${diff.inMinutes}m ago';
    if (diff.inDays < 1) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${date.day}/${date.month}/${date.year}';
  }

  Future<void> _shareFile(BuildContext context) async {
    await Share.shareXFiles([XFile(download.filePath)], text: download.title);
  }

  void _deleteFile(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.card,
        title: const Text('Delete download?'),
        content: const Text(
          'This file will be permanently deleted from your device.',
          style: TextStyle(color: AppTheme.muted),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              context.read<DownloadProvider>().deleteDownload(download.id);
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(foregroundColor: AppTheme.destructive),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }
}

class _FullVideoPlayer extends StatefulWidget {
  final String filePath;

  const _FullVideoPlayer({required this.filePath});

  @override
  State<_FullVideoPlayer> createState() => _FullVideoPlayerState();
}

class _FullVideoPlayerState extends State<_FullVideoPlayer> {
  late VideoPlayerController _controller;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.file(File(widget.filePath))
      ..initialize().then((_) {
        if (mounted) {
          setState(() => _initialized = true);
        }
      });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return Container(
        height: 200,
        color: AppTheme.secondary,
        child: const Center(child: CircularProgressIndicator()),
      );
    }

    return AspectRatio(
      aspectRatio: _controller.value.aspectRatio,
      child: GestureDetector(
        onTap: () {
          setState(() {
            if (_controller.value.isPlaying) {
              _controller.pause();
            } else {
              _controller.play();
            }
          });
        },
        child: Stack(
          alignment: Alignment.center,
          children: [
            VideoPlayer(_controller),
            if (!_controller.value.isPlaying)
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(32),
                ),
                child: const Icon(Icons.play_arrow, color: Colors.white, size: 32),
              ),
          ],
        ),
      ),
    );
  }
}

class _AudioPlayer extends StatelessWidget {
  final String filePath;

  const _AudioPlayer({required this.filePath});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.music_note, color: AppTheme.primary, size: 48),
            SizedBox(height: 8),
            Text('Audio file', style: TextStyle(color: AppTheme.muted)),
          ],
        ),
      ),
    );
  }
}
