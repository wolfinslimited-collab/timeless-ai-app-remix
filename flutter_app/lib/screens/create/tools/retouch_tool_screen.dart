import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:video_player/video_player.dart';
import '../../../core/theme.dart';

class RetouchToolScreen extends StatefulWidget {
  const RetouchToolScreen({super.key});

  @override
  State<RetouchToolScreen> createState() => _RetouchToolScreenState();
}

class _RetouchToolScreenState extends State<RetouchToolScreen> {
  String? _videoUrl;
  File? _videoFile;
  bool _isUploading = false;
  double _uploadProgress = 0;
  VideoPlayerController? _videoController;
  bool _isVideoInitialized = false;
  String _selectedAction = '';

  final List<RetouchAction> _actions = [
    RetouchAction(id: 'face', name: 'Face', icon: Icons.face_outlined),
    RetouchAction(id: 'body', name: 'Body', icon: Icons.accessibility_new_outlined),
    RetouchAction(id: 'adjust', name: 'Adjust', icon: Icons.tune_outlined),
    RetouchAction(id: 'edit_more', name: 'Edit More', icon: Icons.auto_fix_high_outlined),
  ];

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _pickVideo() async {
    final picker = ImagePicker();
    final video = await picker.pickVideo(source: ImageSource.gallery);
    if (video == null) return;

    setState(() {
      _isUploading = true;
      _uploadProgress = 0;
      _videoFile = File(video.path);
    });

    // Simulate progress for better UX
    _simulateUploadProgress();

    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('Not authenticated');

      final file = File(video.path);
      final bytes = await file.readAsBytes();
      final fileName =
          '${session.user.id}/${DateTime.now().millisecondsSinceEpoch}-${video.name}';

      await Supabase.instance.client.storage
          .from('generation-inputs')
          .uploadBinary(fileName, bytes);

      final publicUrl = Supabase.instance.client.storage
          .from('generation-inputs')
          .getPublicUrl(fileName);

      setState(() {
        _videoUrl = publicUrl;
        _uploadProgress = 1.0;
      });

      await _initializeVideoPlayer(publicUrl);
      _showSnackBar('Video uploaded successfully');
    } catch (e) {
      _showSnackBar('Failed to upload video: $e');
      setState(() {
        _videoFile = null;
      });
    } finally {
      setState(() => _isUploading = false);
    }
  }

  void _simulateUploadProgress() async {
    for (var i = 0; i < 9; i++) {
      await Future.delayed(const Duration(milliseconds: 200));
      if (mounted && _isUploading && _uploadProgress < 0.9) {
        setState(() => _uploadProgress = (i + 1) * 0.1);
      }
    }
  }

  Future<void> _initializeVideoPlayer(String url) async {
    _videoController?.dispose();
    _videoController = VideoPlayerController.networkUrl(Uri.parse(url));
    
    try {
      await _videoController!.initialize();
      _videoController!.setLooping(true);
      setState(() => _isVideoInitialized = true);
    } catch (e) {
      debugPrint('Failed to initialize video: $e');
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  void _handleActionTap(String actionId) {
    setState(() => _selectedAction = actionId);
    _showSnackBar('$actionId tools coming soon');
  }

  void _clearVideo() {
    _videoController?.dispose();
    setState(() {
      _videoUrl = null;
      _videoFile = null;
      _videoController = null;
      _isVideoInitialized = false;
      _selectedAction = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.foreground),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Retouch',
          style: TextStyle(
            color: AppTheme.foreground,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.bolt, color: AppTheme.primary, size: 14),
                const SizedBox(width: 4),
                const Text(
                  '10',
                  style: TextStyle(
                    color: AppTheme.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Video preview area
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: _buildVideoPreviewArea(),
            ),
          ),

          // Timeline scrubber (only show when video is loaded)
          if (_isVideoInitialized && _videoController != null)
            _buildTimeline(),

          // Action bar
          _buildActionBar(),

          // Bottom safe area
          SizedBox(height: MediaQuery.of(context).padding.bottom + 8),
        ],
      ),
    );
  }

  Widget _buildVideoPreviewArea() {
    if (_isUploading) {
      return Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 80,
              height: 80,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  CircularProgressIndicator(
                    value: _uploadProgress,
                    strokeWidth: 3,
                    backgroundColor: AppTheme.border,
                    valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
                  ),
                  Text(
                    '${(_uploadProgress * 100).toInt()}%',
                    style: const TextStyle(
                      color: AppTheme.foreground,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Uploading video...',
              style: TextStyle(color: AppTheme.muted, fontSize: 14),
            ),
          ],
        ),
      );
    }

    if (_isVideoInitialized && _videoController != null) {
      return Stack(
        children: [
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(15),
              child: AspectRatio(
                aspectRatio: _videoController!.value.aspectRatio,
                child: VideoPlayer(_videoController!),
              ),
            ),
          ),
          // Play/Pause overlay
          Positioned.fill(
            child: GestureDetector(
              onTap: () {
                setState(() {
                  if (_videoController!.value.isPlaying) {
                    _videoController!.pause();
                  } else {
                    _videoController!.play();
                  }
                });
              },
              child: Container(
                color: Colors.transparent,
                child: Center(
                  child: AnimatedOpacity(
                    opacity: _videoController!.value.isPlaying ? 0 : 1,
                    duration: const Duration(milliseconds: 200),
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.5),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.play_arrow,
                        color: Colors.white,
                        size: 32,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          // Clear video button
          Positioned(
            top: 8,
            right: 8,
            child: GestureDetector(
              onTap: _clearVideo,
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.5),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.close,
                  color: Colors.white,
                  size: 18,
                ),
              ),
            ),
          ),
        ],
      );
    }

    // Empty state - upload prompt
    return GestureDetector(
      onTap: _pickVideo,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border, width: 2),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Icon(
                Icons.video_library_outlined,
                size: 40,
                color: AppTheme.primary,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Upload Video',
              style: TextStyle(
                color: AppTheme.foreground,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Tap to select a video from your gallery',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppTheme.muted,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.cloud_upload_outlined, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Choose Video',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimeline() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          // Video frame thumbnails strip
          Container(
            height: 56,
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Stack(
              children: [
                // Frame thumbnails placeholder - simulated frames
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Row(
                    children: List.generate(10, (index) {
                      return Expanded(
                        child: GestureDetector(
                          onTap: () {
                            if (_videoController != null && _videoController!.value.isInitialized) {
                              final duration = _videoController!.value.duration.inMilliseconds;
                              final targetTime = Duration(
                                milliseconds: ((duration / 10) * index).toInt(),
                              );
                              _videoController!.seekTo(targetTime);
                            }
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppTheme.border.withOpacity(0.3),
                              border: Border(
                                right: index < 9
                                    ? BorderSide(color: AppTheme.border.withOpacity(0.2), width: 1)
                                    : BorderSide.none,
                              ),
                            ),
                            child: Center(
                              child: Icon(
                                Icons.movie_outlined,
                                size: 16,
                                color: AppTheme.muted.withOpacity(0.5),
                              ),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                ),
                // Playhead indicator
                ValueListenableBuilder<VideoPlayerValue>(
                  valueListenable: _videoController!,
                  builder: (context, value, child) {
                    final duration = value.duration.inMilliseconds;
                    final position = value.position.inMilliseconds;
                    final progress = duration > 0 ? position / duration : 0.0;
                    
                    return Positioned(
                      left: (MediaQuery.of(context).size.width - 32) * progress - 1,
                      top: 0,
                      bottom: 0,
                      child: Container(
                        width: 2,
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primary.withOpacity(0.5),
                              blurRadius: 4,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: AppTheme.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: AppTheme.primary,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
          // Video progress indicator
          ValueListenableBuilder<VideoPlayerValue>(
            valueListenable: _videoController!,
            builder: (context, value, child) {
              final duration = value.duration.inMilliseconds;
              final position = value.position.inMilliseconds;
              final progress = duration > 0 ? position / duration : 0.0;

              return Column(
                children: [
                  // Timeline slider
                  SliderTheme(
                    data: SliderThemeData(
                      trackHeight: 4,
                      thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
                      overlayShape: const RoundSliderOverlayShape(overlayRadius: 16),
                      activeTrackColor: AppTheme.primary,
                      inactiveTrackColor: AppTheme.border,
                      thumbColor: AppTheme.primary,
                      overlayColor: AppTheme.primary.withOpacity(0.2),
                    ),
                    child: Slider(
                      value: progress.clamp(0.0, 1.0),
                      onChanged: (newValue) {
                        final newPosition = Duration(
                          milliseconds: (newValue * duration).toInt(),
                        );
                        _videoController!.seekTo(newPosition);
                      },
                    ),
                  ),
                  // Time labels
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          _formatDuration(value.position),
                          style: const TextStyle(
                            color: AppTheme.muted,
                            fontSize: 12,
                          ),
                        ),
                        Text(
                          _formatDuration(value.duration),
                          style: const TextStyle(
                            color: AppTheme.muted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes;
    final seconds = duration.inSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  Widget _buildActionBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.card,
        border: Border(
          top: BorderSide(color: AppTheme.border, width: 1),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: _actions.map((action) {
          final isSelected = _selectedAction == action.id;
          final isEnabled = _videoUrl != null;

          return GestureDetector(
            onTap: isEnabled ? () => _handleActionTap(action.id) : null,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppTheme.primary.withOpacity(0.15)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppTheme.primary : Colors.transparent,
                  width: 1,
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    action.icon,
                    size: 24,
                    color: isEnabled
                        ? (isSelected ? AppTheme.primary : AppTheme.foreground)
                        : AppTheme.muted,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    action.name,
                    style: TextStyle(
                      color: isEnabled
                          ? (isSelected ? AppTheme.primary : AppTheme.foreground)
                          : AppTheme.muted,
                      fontSize: 12,
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class RetouchAction {
  final String id;
  final String name;
  final IconData icon;

  const RetouchAction({
    required this.id,
    required this.name,
    required this.icon,
  });
}
