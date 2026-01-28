import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../services/audio_player_service.dart';
import 'music_player_sheet.dart';

class MusicPlayerBar extends StatelessWidget {
  const MusicPlayerBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AudioPlayerService>(
      builder: (context, player, child) {
        if (!player.hasCurrentTrack) {
          return const SizedBox.shrink();
        }
        
        return GestureDetector(
          onTap: () => _showPlayerSheet(context, player),
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    // Album art
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [AppTheme.primary, Colors.purple],
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.music_note,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    
                    // Track info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            player.currentTitle ?? 'Unknown Track',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            player.currentArtist ?? 'AI Generated',
                            style: TextStyle(
                              color: AppTheme.muted,
                              fontSize: 12,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    
                    // Controls
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: Icon(
                            player.isPlaying ? Icons.pause : Icons.play_arrow,
                            color: AppTheme.foreground,
                          ),
                          onPressed: () {
                            if (player.isPlaying) {
                              player.pause();
                            } else {
                              player.resume();
                            }
                          },
                        ),
                        IconButton(
                          icon: Icon(
                            Icons.close,
                            color: AppTheme.muted,
                            size: 20,
                          ),
                          onPressed: () => player.stop(),
                        ),
                      ],
                    ),
                  ],
                ),
                
                // Progress bar
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: player.progress,
                    backgroundColor: AppTheme.border,
                    valueColor: AlwaysStoppedAnimation(AppTheme.primary),
                    minHeight: 3,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showPlayerSheet(BuildContext context, AudioPlayerService player) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const MusicPlayerSheet(),
    );
  }
}
