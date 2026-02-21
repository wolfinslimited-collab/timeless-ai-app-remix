import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import '../core/theme.dart';
import '../services/audio_player_service.dart';
import '../providers/download_provider.dart';
import '../providers/favorites_provider.dart';
import '../models/download_model.dart';
import 'report_content_dialog.dart';

class MusicPlayerSheet extends StatelessWidget {
  const MusicPlayerSheet({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AudioPlayerService>(
      builder: (context, player, child) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.85,
          decoration: BoxDecoration(
            color: AppTheme.background,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.only(top: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppTheme.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.keyboard_arrow_down),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Spacer(),
                    const Text(
                      'Now Playing',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.more_vert),
                      onPressed: () {
                        // Show options menu
                      },
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Album art
              Container(
                width: 280,
                height: 280,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppTheme.primary,
                      Colors.purple,
                      Colors.deepPurple,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primary.withOpacity(0.4),
                      blurRadius: 40,
                      offset: const Offset(0, 20),
                    ),
                  ],
                ),
                child: Center(
                  child: Icon(
                    Icons.music_note,
                    size: 100,
                    color: Colors.white.withOpacity(0.8),
                  ),
                ),
              ),

              const SizedBox(height: 40),

              // Track info
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  children: [
                    Text(
                      player.currentTitle ?? 'Unknown Track',
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      player.currentArtist ?? 'AI Generated',
                      style: TextStyle(
                        fontSize: 16,
                        color: AppTheme.muted,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Progress bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  children: [
                    SliderTheme(
                      data: SliderThemeData(
                        trackHeight: 4,
                        thumbShape: const RoundSliderThumbShape(
                          enabledThumbRadius: 6,
                        ),
                        overlayShape: const RoundSliderOverlayShape(
                          overlayRadius: 16,
                        ),
                        activeTrackColor: AppTheme.primary,
                        inactiveTrackColor: AppTheme.border,
                        thumbColor: AppTheme.primary,
                      ),
                      child: Slider(
                        value: player.progress.clamp(0.0, 1.0),
                        onChanged: (value) => player.seekToProgress(value),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            player.formatDuration(player.position),
                            style: TextStyle(
                              color: AppTheme.muted,
                              fontSize: 12,
                            ),
                          ),
                          Text(
                            player.formatDuration(player.duration),
                            style: TextStyle(
                              color: AppTheme.muted,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Controls
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.shuffle),
                      iconSize: 24,
                      color: AppTheme.muted,
                      onPressed: () {},
                    ),
                    IconButton(
                      icon: const Icon(Icons.skip_previous),
                      iconSize: 36,
                      onPressed: () => player.skipBackward(),
                    ),
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppTheme.primary, Colors.purple],
                        ),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: Icon(
                          player.isPlaying ? Icons.pause : Icons.play_arrow,
                          color: Colors.white,
                        ),
                        iconSize: 36,
                        onPressed: () {
                          if (player.isPlaying) {
                            player.pause();
                          } else {
                            player.resume();
                          }
                        },
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.skip_next),
                      iconSize: 36,
                      onPressed: () => player.skipForward(),
                    ),
                    IconButton(
                      icon: const Icon(Icons.repeat),
                      iconSize: 24,
                      color: AppTheme.muted,
                      onPressed: () {},
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Bottom actions
              Padding(
                padding: const EdgeInsets.all(32),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    Consumer<FavoritesProvider>(
                      builder: (context, favorites, _) {
                        final isFavorite = player.currentUrl != null &&
                            favorites.isFavoriteByUrl(player.currentUrl!);
                        return _buildActionButton(
                          icon: isFavorite
                              ? Icons.favorite
                              : Icons.favorite_border,
                          label: 'Like',
                          isActive: isFavorite,
                          onTap: () {
                            if (player.currentUrl != null) {
                              favorites.toggleFavorite(
                                id: player.currentUrl!,
                                type: 'music',
                                url: player.currentUrl,
                                title: player.currentTitle,
                              );
                            }
                          },
                        );
                      },
                    ),
                    _buildActionButton(
                      icon: Icons.download,
                      label: 'Download',
                      onTap: () async {
                        if (player.currentUrl != null) {
                          try {
                            await context.read<DownloadProvider>().downloadFile(
                                  url: player.currentUrl!,
                                  title: player.currentTitle ?? 'AI Track',
                                  type: DownloadType.audio,
                                  saveToGallery: false,
                                );
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                    content: Text('Saved to Downloads')),
                              );
                            }
                          } catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Download failed: $e')),
                              );
                            }
                          }
                        }
                      },
                    ),
                    _buildActionButton(
                      icon: Icons.share,
                      label: 'Share',
                      onTap: () {
                        if (player.currentUrl != null) {
                          Share.share(
                            'Check out this AI-generated track: ${player.currentTitle ?? "AI Track"}\n${player.currentUrl}',
                          );
                        }
                      },
                    ),
                    _buildActionButton(
                      icon: Icons.flag_outlined,
                      label: 'Report',
                      onTap: () => ReportContentDialog.show(context, contentType: 'music'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool isActive = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color:
                  isActive ? AppTheme.primary.withOpacity(0.1) : AppTheme.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isActive ? AppTheme.primary : AppTheme.border,
              ),
            ),
            child: Icon(
              icon,
              size: 22,
              color: isActive ? AppTheme.primary : null,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              color: isActive ? AppTheme.primary : AppTheme.muted,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
