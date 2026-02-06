import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:video_player/video_player.dart';
import 'package:video_thumbnail/video_thumbnail.dart';
import '../../../core/theme.dart';

class RecentVideo {
  final String url;
  final String name;
  final DateTime uploadedAt;

  const RecentVideo({
    required this.url,
    required this.name,
    required this.uploadedAt,
  });
}

class AIEditorToolScreen extends StatefulWidget {
  const AIEditorToolScreen({super.key});

  @override
  State<AIEditorToolScreen> createState() => _AIEditorToolScreenState();
}

class _AIEditorToolScreenState extends State<AIEditorToolScreen> {
  String? _videoUrl;
  File? _videoFile;
  bool _isUploading = false;
  double _uploadProgress = 0;
  VideoPlayerController? _videoController;
  bool _isVideoInitialized = false;
  String _selectedTool = 'edit';
  bool _isMuted = false;
  bool _isFullScreen = false;
  List<RecentVideo> _recentVideos = [];
  bool _isLoadingRecent = false;
  String _selectedQuality = '1080p';

  // Timeline state
  final ScrollController _timelineScrollController = ScrollController();
  List<Uint8List?> _thumbnails = [];
  bool _isExtractingThumbnails = false;
  bool _isUserScrolling = false;
  static const int _thumbnailCount = 20;
  static const double _thumbnailWidth = 60.0;
  static const double _thumbnailHeight = 48.0;

  final List<String> _qualityOptions = ['720p', '1080p', '2K', '4K'];

  final List<EditorTool> _editorTools = [
    EditorTool(id: 'edit', name: 'Edit', icon: Icons.content_cut),
    EditorTool(id: 'audio', name: 'Audio', icon: Icons.music_note),
    EditorTool(id: 'text', name: 'Text', icon: Icons.text_fields),
    EditorTool(id: 'effects', name: 'Effects', icon: Icons.star_outline),
    EditorTool(id: 'overlay', name: 'Overlay', icon: Icons.picture_in_picture_alt),
    EditorTool(id: 'captions', name: 'Captions', icon: Icons.subtitles_outlined),
    EditorTool(id: 'filters', name: 'Filters', icon: Icons.blur_circular),
    EditorTool(id: 'adjust', name: 'Adjust', icon: Icons.tune),
  ];

  @override
  void initState() {
    super.initState();
    _timelineScrollController.addListener(_onTimelineScroll);
  }

  @override
  void dispose() {
    _timelineScrollController.removeListener(_onTimelineScroll);
    _timelineScrollController.dispose();
    _videoController?.removeListener(_onVideoPositionChanged);
    _videoController?.dispose();
    super.dispose();
  }

  void _onTimelineScroll() {
    if (!_isUserScrolling || _videoController == null || !_isVideoInitialized) return;
    
    final screenWidth = MediaQuery.of(context).size.width;
    final halfScreen = screenWidth / 2;
    final totalTimelineWidth = _thumbnailCount * _thumbnailWidth;
    final scrollOffset = _timelineScrollController.offset;
    
    // Calculate position based on scroll
    final progress = scrollOffset / totalTimelineWidth;
    final clampedProgress = progress.clamp(0.0, 1.0);
    final duration = _videoController!.value.duration;
    final newPosition = Duration(milliseconds: (duration.inMilliseconds * clampedProgress).toInt());
    
    _videoController!.seekTo(newPosition);
  }

  void _onVideoPositionChanged() {
    if (_isUserScrolling || _videoController == null || !_isVideoInitialized) return;
    if (!_timelineScrollController.hasClients) return;
    
    final duration = _videoController!.value.duration.inMilliseconds;
    final position = _videoController!.value.position.inMilliseconds;
    if (duration <= 0) return;
    
    final progress = position / duration;
    final totalTimelineWidth = _thumbnailCount * _thumbnailWidth;
    final targetScroll = totalTimelineWidth * progress;
    
    // Animate scroll to keep timeline synced with video
    _timelineScrollController.jumpTo(targetScroll.clamp(0.0, _timelineScrollController.position.maxScrollExtent));
  }

  Future<void> _loadRecentVideos() async {
    setState(() => _isLoadingRecent = true);
    
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) {
        setState(() => _isLoadingRecent = false);
        return;
      }

      final result = await Supabase.instance.client.storage
          .from('generation-inputs')
          .list(path: session.user.id);

      final videos = result
          .where((file) => 
            file.name.endsWith('.mp4') || 
            file.name.endsWith('.mov') || 
            file.name.endsWith('.webm') ||
            file.name.endsWith('.avi'))
          .map((file) {
            final publicUrl = Supabase.instance.client.storage
                .from('generation-inputs')
                .getPublicUrl('${session.user.id}/${file.name}');
            return RecentVideo(
              url: publicUrl,
              name: file.name,
              uploadedAt: DateTime.tryParse(file.createdAt ?? '') ?? DateTime.now(),
            );
          })
          .toList();

      videos.sort((a, b) => b.uploadedAt.compareTo(a.uploadedAt));

      setState(() {
        _recentVideos = videos.take(12).toList();
        _isLoadingRecent = false;
      });
    } catch (e) {
      debugPrint('Failed to load recent videos: $e');
      setState(() => _isLoadingRecent = false);
    }
  }

  void _showMediaPickerSheet() {
    _loadRecentVideos();
    
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => _buildMediaPickerSheet(),
    );
  }

  Widget _buildMediaPickerSheet() {
    return StatefulBuilder(
      builder: (context, setSheetState) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.7,
          decoration: const BoxDecoration(
            color: Color(0xFF1A1A1A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(top: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Select Video',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: GestureDetector(
                  onTap: () {
                    Navigator.pop(context);
                    _pickNewVideo();
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [AppTheme.primary, AppTheme.primary.withOpacity(0.8)],
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primary.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.cloud_upload_outlined, color: Colors.white, size: 24),
                        SizedBox(width: 12),
                        Text(
                          'Upload New Video',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Icon(Icons.history, color: Colors.white.withOpacity(0.6), size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Recent Uploads',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: _isLoadingRecent
                    ? const Center(
                        child: CircularProgressIndicator(color: AppTheme.primary),
                      )
                    : _recentVideos.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.video_library_outlined,
                                  size: 48,
                                  color: Colors.white.withOpacity(0.3),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'No recent videos',
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.5),
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Upload a video to get started',
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.3),
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : GridView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 20),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              crossAxisSpacing: 12,
                              mainAxisSpacing: 12,
                              childAspectRatio: 1,
                            ),
                            itemCount: _recentVideos.length,
                            itemBuilder: (context, index) {
                              final video = _recentVideos[index];
                              return _buildRecentVideoThumbnail(video);
                            },
                          ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildRecentVideoThumbnail(RecentVideo video) {
    return GestureDetector(
      onTap: () {
        Navigator.pop(context);
        _loadVideoFromUrl(video.url);
      },
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Colors.white.withOpacity(0.1),
            width: 1,
          ),
        ),
        child: Stack(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: double.infinity,
                height: double.infinity,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.purple.shade900.withOpacity(0.5),
                      Colors.blue.shade900.withOpacity(0.5),
                    ],
                  ),
                ),
                child: Center(
                  child: Icon(
                    Icons.play_circle_outline,
                    color: Colors.white.withOpacity(0.8),
                    size: 32,
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 6,
              right: 6,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'Video',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _loadVideoFromUrl(String url) async {
    setState(() {
      _isUploading = true;
      _uploadProgress = 0.5;
    });

    try {
      setState(() {
        _videoUrl = url;
        _uploadProgress = 1.0;
      });

      await _initializeVideoPlayer(url);
      _showSnackBar('Video loaded successfully');
    } catch (e) {
      _showSnackBar('Failed to load video: $e');
    } finally {
      setState(() => _isUploading = false);
    }
  }

  Future<void> _pickNewVideo() async {
    final picker = ImagePicker();
    final video = await picker.pickVideo(source: ImageSource.gallery);
    if (video == null) return;

    setState(() {
      _isUploading = true;
      _uploadProgress = 0;
      _videoFile = File(video.path);
    });

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
    _videoController?.removeListener(_onVideoPositionChanged);
    _videoController?.dispose();
    _videoController = VideoPlayerController.networkUrl(Uri.parse(url));

    try {
      await _videoController!.initialize();
      _videoController!.setLooping(true);
      _videoController!.addListener(_onVideoPositionChanged);
      setState(() => _isVideoInitialized = true);
      
      // Extract thumbnails after video is initialized
      _extractThumbnails(url);
    } catch (e) {
      debugPrint('Failed to initialize video: $e');
    }
  }

  Future<void> _extractThumbnails(String videoUrl) async {
    if (_videoController == null || !_isVideoInitialized) return;
    
    setState(() => _isExtractingThumbnails = true);
    
    final duration = _videoController!.value.duration.inMilliseconds;
    final List<Uint8List?> thumbnails = List.filled(_thumbnailCount, null);
    
    try {
      for (int i = 0; i < _thumbnailCount; i++) {
        if (!mounted) break;
        
        final timeMs = (duration * i / _thumbnailCount).toInt();
        
        try {
          final thumbnail = await VideoThumbnail.thumbnailData(
            video: videoUrl,
            imageFormat: ImageFormat.JPEG,
            maxWidth: 120,
            quality: 50,
            timeMs: timeMs,
          );
          
          if (mounted && thumbnail != null) {
            thumbnails[i] = thumbnail;
            setState(() {
              _thumbnails = List.from(thumbnails);
            });
          }
        } catch (e) {
          debugPrint('Failed to extract thumbnail at $timeMs: $e');
        }
      }
    } catch (e) {
      debugPrint('Failed to extract thumbnails: $e');
    } finally {
      if (mounted) {
        setState(() => _isExtractingThumbnails = false);
      }
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  void _clearVideo() {
    _videoController?.removeListener(_onVideoPositionChanged);
    _videoController?.dispose();
    setState(() {
      _videoUrl = null;
      _videoFile = null;
      _videoController = null;
      _isVideoInitialized = false;
      _thumbnails = [];
    });
  }

  void _togglePlayPause() {
    if (_videoController == null) return;
    setState(() {
      if (_videoController!.value.isPlaying) {
        _videoController!.pause();
      } else {
        _videoController!.play();
      }
    });
  }

  void _toggleMute() {
    if (_videoController == null) return;
    setState(() {
      _isMuted = !_isMuted;
      _videoController!.setVolume(_isMuted ? 0 : 1);
    });
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  void _showQualityPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFF1A1A1A),
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Export Quality',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ..._qualityOptions.map((quality) => ListTile(
              onTap: () {
                setState(() => _selectedQuality = quality);
                Navigator.pop(context);
              },
              leading: Icon(
                _selectedQuality == quality
                    ? Icons.radio_button_checked
                    : Icons.radio_button_off,
                color: _selectedQuality == quality
                    ? AppTheme.primary
                    : Colors.white.withOpacity(0.5),
              ),
              title: Text(
                quality,
                style: TextStyle(
                  color: _selectedQuality == quality
                      ? Colors.white
                      : Colors.white.withOpacity(0.7),
                  fontWeight: _selectedQuality == quality
                      ? FontWeight.w600
                      : FontWeight.normal,
                ),
              ),
            )),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _handleExport() {
    _showSnackBar('Exporting video in $_selectedQuality...');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      body: SafeArea(
        // Main layout is NOT scrollable - only timeline scrolls horizontally
        child: Column(
          children: [
            _buildTopBar(),
            // Video preview takes remaining space but is NOT scrollable
            Expanded(
              child: _buildVideoPreviewArea(),
            ),
            // Fixed position elements below video
            if (_isVideoInitialized && _videoController != null)
              _buildVideoControlBar(),
            if (_isVideoInitialized && _videoController != null)
              _buildTimelineSection(),
            if (_isVideoInitialized && _videoController != null)
              _buildBottomToolbar(),
          ],
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.of(context).pop(),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
            ),
          ),
          const Spacer(),
          if (_isVideoInitialized) ...[
            // Quality Selector
            GestureDetector(
              onTap: _showQualityPicker,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    Text(
                      _selectedQuality,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.keyboard_arrow_down,
                      color: Colors.white.withOpacity(0.7),
                      size: 18,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Export Button
            GestureDetector(
              onTap: _handleExport,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.primary, AppTheme.primary.withOpacity(0.8)],
                  ),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primary.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Row(
                  children: [
                    Icon(Icons.file_upload_outlined, color: Colors.white, size: 18),
                    SizedBox(width: 6),
                    Text(
                      'Export',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _toggleFullScreen() {
    if (!_isVideoInitialized || _videoController == null) return;
    
    // Open fullscreen dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      useSafeArea: false,
      builder: (context) => _FullScreenVideoDialog(
        videoController: _videoController!,
        onClose: () => Navigator.of(context).pop(),
      ),
    );
  }

  Future<void> _addAudioFromGallery() async {
    final picker = ImagePicker();
    // Note: For audio, we'd typically use file_picker package
    // For now, show a message since ImagePicker doesn't support audio
    _showSnackBar('Audio picker - Coming soon!');
  }

  Widget _buildVideoControlBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0A),
        border: Border(
          bottom: BorderSide(color: Colors.white.withOpacity(0.05)),
        ),
      ),
      child: Row(
        children: [
          // Time counter
          ValueListenableBuilder<VideoPlayerValue>(
            valueListenable: _videoController!,
            builder: (context, value, child) {
              return Text(
                '${_formatDuration(value.position)} / ${_formatDuration(value.duration)}',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.6),
                  fontSize: 12,
                  fontFamily: 'monospace',
                ),
              );
            },
          ),
          const Spacer(),
          // Control buttons
          Row(
            children: [
              // Undo
              IconButton(
                onPressed: () => _showSnackBar('Undo'),
                icon: Icon(Icons.undo, color: Colors.white.withOpacity(0.7), size: 20),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
              // Redo
              IconButton(
                onPressed: () => _showSnackBar('Redo'),
                icon: Icon(Icons.redo, color: Colors.white.withOpacity(0.7), size: 20),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
              const SizedBox(width: 8),
              // Play/Pause
              GestureDetector(
                onTap: _togglePlayPause,
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _videoController!.value.isPlaying ? Icons.pause : Icons.play_arrow,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Fullscreen toggle
              GestureDetector(
                onTap: _toggleFullScreen,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: _isFullScreen 
                        ? AppTheme.primary.withOpacity(0.2) 
                        : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    _isFullScreen ? Icons.fullscreen_exit : Icons.fullscreen,
                    color: _isFullScreen ? AppTheme.primary : Colors.white.withOpacity(0.7),
                    size: 22,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVideoPreviewArea() {
    if (_isUploading) {
      return Center(
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
                    strokeWidth: 4,
                    backgroundColor: Colors.white.withOpacity(0.2),
                    valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
                  ),
                  Text(
                    '${(_uploadProgress * 100).toInt()}%',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Loading video...',
              style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 14),
            ),
          ],
        ),
      );
    }

    if (_isVideoInitialized && _videoController != null) {
      return Center(
        child: Stack(
          children: [
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(12),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: AspectRatio(
                  aspectRatio: _videoController!.value.aspectRatio,
                  child: VideoPlayer(_videoController!),
                ),
              ),
            ),
            Positioned(
              top: 8,
              right: 24,
              child: GestureDetector(
                onTap: _clearVideo,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.6),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.close, color: Colors.white, size: 16),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Center(
      child: GestureDetector(
        onTap: _showMediaPickerSheet,
        child: Container(
          margin: const EdgeInsets.all(24),
          padding: const EdgeInsets.all(32),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: Colors.white.withOpacity(0.2),
              width: 2,
              style: BorderStyle.solid,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.videocam_outlined, size: 32, color: AppTheme.primary),
              ),
              const SizedBox(height: 20),
              const Text(
                'Upload Video',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Tap to select a video',
                style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: AppTheme.primary,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.cloud_upload_outlined, color: Colors.white, size: 18),
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
      ),
    );
  }

  Widget _buildTimelineSection() {
    final screenWidth = MediaQuery.of(context).size.width;
    final halfScreen = screenWidth / 2;
    final trackLeftPadding = 70.0; // Width of left fixed panel
    
    // Fixed-height container for timeline - NOT scrollable vertically
    return Container(
      height: 200, // Increased height for time ruler + video + audio + add text
      color: const Color(0xFF0A0A0A),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Fixed Left Panel (doesn't scroll)
          Container(
            width: trackLeftPadding,
            padding: const EdgeInsets.only(left: 8, top: 24),
            child: Column(
              children: [
                // Mute clip audio button
                GestureDetector(
                  onTap: _toggleMute,
                  child: Container(
                    width: 54,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _isMuted 
                          ? AppTheme.primary.withOpacity(0.15)
                          : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: _isMuted 
                            ? AppTheme.primary.withOpacity(0.4)
                            : Colors.white.withOpacity(0.1),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(
                          _isMuted ? Icons.volume_off : Icons.volume_up,
                          size: 20,
                          color: _isMuted ? AppTheme.primary : Colors.white.withOpacity(0.7),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Mute\naudio',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: _isMuted ? AppTheme.primary : Colors.white.withOpacity(0.5),
                            fontSize: 9,
                            height: 1.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                // Cover button
                GestureDetector(
                  onTap: () => _showSnackBar('Cover editor coming soon'),
                  child: Container(
                    width: 54,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: Colors.white.withOpacity(0.1),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        Stack(
                          children: [
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Icon(
                                Icons.image_outlined,
                                size: 16,
                                color: Colors.white.withOpacity(0.6),
                              ),
                            ),
                            Positioned(
                              right: -2,
                              bottom: -2,
                              child: Container(
                                width: 12,
                                height: 12,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF0A0A0A),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.edit,
                                  size: 8,
                                  color: Colors.white.withOpacity(0.6),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Cover',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.5),
                            fontSize: 9,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Main timeline area with Stack for playhead overlay
          Expanded(
            child: Stack(
              children: [
                // Scrollable timeline content
                NotificationListener<ScrollNotification>(
                  onNotification: (notification) {
                    if (notification is ScrollStartNotification) {
                      _isUserScrolling = true;
                    } else if (notification is ScrollEndNotification) {
                      _isUserScrolling = false;
                    }
                    return false;
                  },
                  child: SingleChildScrollView(
                    controller: _timelineScrollController,
                    scrollDirection: Axis.horizontal,
                    physics: const ClampingScrollPhysics(),
                    child: SizedBox(
                      width: halfScreen + (_thumbnailCount * _thumbnailWidth) + 60 + halfScreen,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Time Ruler
                          _buildTimeRuler(halfScreen),
                          const SizedBox(height: 4),
                          
                          // Video Track
                          _buildVideoTrack(halfScreen),
                          const SizedBox(height: 8),
                          
                          // Extracted Audio Waveform Track
                          _buildExtractedAudioTrack(halfScreen),
                          const SizedBox(height: 8),
                          
                          // Add Text Button
                          _buildAddTextButton(halfScreen),
                        ],
                      ),
                    ),
                  ),
                ),
                
                // Fixed Centered Playhead (Top Layer)
                Positioned.fill(
                  child: IgnorePointer(
                    child: CustomPaint(
                      painter: _PlayheadPainter(),
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
  
  Widget _buildTimeRuler(double halfScreen) {
    final duration = _videoController?.value.duration ?? Duration.zero;
    final totalSeconds = duration.inSeconds > 0 ? duration.inSeconds : 10;
    final pixelsPerSecond = (_thumbnailCount * _thumbnailWidth) / totalSeconds;
    
    return Container(
      height: 20,
      child: Row(
        children: [
          // Left padding
          SizedBox(width: halfScreen),
          
          // Time ticks
          SizedBox(
            width: _thumbnailCount * _thumbnailWidth,
            child: Stack(
              children: List.generate(
                (totalSeconds ~/ 2) + 1,
                (i) {
                  final seconds = i * 2;
                  final position = seconds * pixelsPerSecond;
                  return Positioned(
                    left: position,
                    child: Column(
                      children: [
                        Container(
                          width: 1,
                          height: 8,
                          color: Colors.white.withOpacity(0.3),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _formatSecondsToTimestamp(seconds),
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.4),
                            fontSize: 8,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
          
          // Right padding
          SizedBox(width: halfScreen),
        ],
      ),
    );
  }
  
  String _formatSecondsToTimestamp(int seconds) {
    final mins = (seconds ~/ 60).toString().padLeft(2, '0');
    final secs = (seconds % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }
  
  Widget _buildVideoTrack(double halfScreen) {
    return SizedBox(
      height: _thumbnailHeight + 4,
      child: Row(
        children: [
          // Left padding so video starts at center playhead
          SizedBox(width: halfScreen),
          
          // Video thumbnails
          Container(
            height: _thumbnailHeight,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: Colors.white.withOpacity(0.3),
                width: 2,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Row(
                children: List.generate(_thumbnailCount, (index) {
                  final thumbnail = index < _thumbnails.length ? _thumbnails[index] : null;
                  
                  return Container(
                    width: _thumbnailWidth,
                    height: _thumbnailHeight,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      border: Border(
                        right: index < _thumbnailCount - 1
                            ? BorderSide(color: Colors.black.withOpacity(0.3), width: 0.5)
                            : BorderSide.none,
                      ),
                    ),
                    child: thumbnail != null
                        ? Image.memory(
                            thumbnail,
                            fit: BoxFit.cover,
                            width: _thumbnailWidth,
                            height: _thumbnailHeight,
                          )
                        : Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.red.shade900.withOpacity(0.3),
                                  Colors.red.shade900.withOpacity(0.5),
                                ],
                              ),
                            ),
                            child: _isExtractingThumbnails
                                ? Center(
                                    child: SizedBox(
                                      width: 10,
                                      height: 10,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 1.5,
                                        color: Colors.white.withOpacity(0.3),
                                      ),
                                    ),
                                  )
                                : Center(
                                    child: Icon(
                                      Icons.movie_outlined,
                                      size: 12,
                                      color: Colors.white.withOpacity(0.25),
                                    ),
                                  ),
                          ),
                  );
                }),
              ),
            ),
          ),
          
          const SizedBox(width: 10),
          
          // White + button in rounded square
          GestureDetector(
            onTap: _showMediaPickerSheet,
            child: Container(
              width: 44,
              height: _thumbnailHeight,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: Colors.white.withOpacity(0.2),
                    blurRadius: 8,
                    spreadRadius: 0,
                  ),
                ],
              ),
              child: const Icon(
                Icons.add,
                color: Colors.black,
                size: 24,
              ),
            ),
          ),
          
          // Right padding
          SizedBox(width: halfScreen),
        ],
      ),
    );
  }
  
  Widget _buildExtractedAudioTrack(double halfScreen) {
    return SizedBox(
      height: 36,
      child: Row(
        children: [
          // Left padding
          SizedBox(width: halfScreen),
          
          // Teal waveform track for extracted audio
          Container(
            width: _thumbnailCount * _thumbnailWidth,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFF00BFA5).withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: const Color(0xFF00BFA5).withOpacity(0.5),
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                const SizedBox(width: 8),
                Icon(
                  Icons.music_note,
                  size: 14,
                  color: const Color(0xFF00BFA5),
                ),
                const SizedBox(width: 6),
                Text(
                  'Extracted',
                  style: TextStyle(
                    color: const Color(0xFF00BFA5),
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(width: 12),
                // Waveform visualization
                Expanded(
                  child: CustomPaint(
                    painter: _WaveformPainter(
                      color: const Color(0xFF00BFA5),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
              ],
            ),
          ),
          
          // Right padding
          SizedBox(width: halfScreen + 54),
        ],
      ),
    );
  }
  
  Widget _buildAddTextButton(double halfScreen) {
    return SizedBox(
      height: 32,
      child: Row(
        children: [
          // Left padding
          SizedBox(width: halfScreen),
          
          // + Add text button
          GestureDetector(
            onTap: () => _showSnackBar('Text editor coming soon'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Colors.white.withOpacity(0.15),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.add,
                    size: 14,
                    color: Colors.white.withOpacity(0.6),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Add text',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.6),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Right padding
          SizedBox(width: halfScreen),
        ],
      ),
    );
  }

  Widget _buildBottomToolbar() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0A),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        child: Row(
          children: _editorTools.map((tool) {
            final isSelected = _selectedTool == tool.id;
            return GestureDetector(
              onTap: () {
                setState(() => _selectedTool = tool.id);
                _showSnackBar('${tool.name} coming soon');
              },
              child: Container(
                width: 64,
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      tool.icon,
                      size: 24,
                      color: isSelected ? Colors.white : Colors.white.withOpacity(0.6),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      tool.name,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.w500 : FontWeight.normal,
                        color: isSelected ? Colors.white : Colors.white.withOpacity(0.6),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

/// Custom painter for the static playhead line at center
class _PlayheadPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final centerX = size.width / 2;
    
    // Draw glow effect
    final glowPaint = Paint()
      ..color = Colors.white.withOpacity(0.4)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    
    canvas.drawLine(
      Offset(centerX, 0),
      Offset(centerX, size.height),
      glowPaint,
    );
    
    // Draw main line
    final linePaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;
    
    canvas.drawLine(
      Offset(centerX, 0),
      Offset(centerX, size.height),
      linePaint,
    );
    
    // Draw top circle indicator
    final circlePaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    
    canvas.drawCircle(
      Offset(centerX, 8),
      6,
      circlePaint,
    );
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Custom painter for waveform visualization
class _WaveformPainter extends CustomPainter {
  final Color color;
  
  _WaveformPainter({required this.color});
  
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    
    final centerY = size.height / 2;
    final barCount = 60;
    final spacing = size.width / barCount;
    
    for (int i = 0; i < barCount; i++) {
      // Create a pseudo-random but consistent pattern
      final seed = (i * 0.3).toDouble();
      final height = (0.2 + (seed % 1) * 0.6) * size.height * 0.8;
      final halfHeight = height / 2;
      
      final x = i * spacing + spacing / 2;
      
      canvas.drawLine(
        Offset(x, centerY - halfHeight),
        Offset(x, centerY + halfHeight),
        paint,
      );
    }
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class EditorTool {
  final String id;
  final String name;
  final IconData icon;

  const EditorTool({
    required this.id,
    required this.name,
    required this.icon,
  });
}

/// Full-screen video dialog that covers the entire screen
class _FullScreenVideoDialog extends StatefulWidget {
  final VideoPlayerController videoController;
  final VoidCallback onClose;

  const _FullScreenVideoDialog({
    required this.videoController,
    required this.onClose,
  });

  @override
  State<_FullScreenVideoDialog> createState() => _FullScreenVideoDialogState();
}

class _FullScreenVideoDialogState extends State<_FullScreenVideoDialog> {
  bool _showControls = true;

  @override
  void initState() {
    super.initState();
    // Auto-hide controls after 3 seconds
    _scheduleHideControls();
  }

  void _scheduleHideControls() {
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted && widget.videoController.value.isPlaying) {
        setState(() => _showControls = false);
      }
    });
  }

  void _toggleControls() {
    setState(() => _showControls = !_showControls);
    if (_showControls) {
      _scheduleHideControls();
    }
  }

  void _togglePlayPause() {
    if (widget.videoController.value.isPlaying) {
      widget.videoController.pause();
    } else {
      widget.videoController.play();
      _scheduleHideControls();
    }
    setState(() {});
  }

  String _formatDuration(Duration duration) {
    final minutes = duration.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = duration.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTap: _toggleControls,
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Full-screen video
            Center(
              child: AspectRatio(
                aspectRatio: widget.videoController.value.aspectRatio,
                child: VideoPlayer(widget.videoController),
              ),
            ),
            
            // Controls overlay
            AnimatedOpacity(
              opacity: _showControls ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 200),
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.5),
                      Colors.transparent,
                      Colors.transparent,
                      Colors.black.withOpacity(0.5),
                    ],
                    stops: const [0.0, 0.2, 0.8, 1.0],
                  ),
                ),
                child: SafeArea(
                  child: Column(
                    children: [
                      // Top bar with close button
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            GestureDetector(
                              onTap: widget.onClose,
                              child: Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: Colors.black.withOpacity(0.5),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.close,
                                  color: Colors.white,
                                  size: 24,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              'Full Screen',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.8),
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const Spacer(),
                            const SizedBox(width: 44), // Balance the close button
                          ],
                        ),
                      ),
                      
                      const Spacer(),
                      
                      // Center play/pause button
                      GestureDetector(
                        onTap: _togglePlayPause,
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            widget.videoController.value.isPlaying
                                ? Icons.pause
                                : Icons.play_arrow,
                            color: Colors.white,
                            size: 40,
                          ),
                        ),
                      ),
                      
                      const Spacer(),
                      
                      // Bottom bar with time
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: ValueListenableBuilder<VideoPlayerValue>(
                          valueListenable: widget.videoController,
                          builder: (context, value, child) {
                            return Column(
                              children: [
                                // Progress bar
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(2),
                                  child: LinearProgressIndicator(
                                    value: value.duration.inMilliseconds > 0
                                        ? value.position.inMilliseconds /
                                            value.duration.inMilliseconds
                                        : 0,
                                    backgroundColor: Colors.white.withOpacity(0.3),
                                    valueColor: const AlwaysStoppedAnimation<Color>(
                                      AppTheme.primary,
                                    ),
                                    minHeight: 4,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      _formatDuration(value.position),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 13,
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                    Text(
                                      _formatDuration(value.duration),
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.6),
                                        fontSize: 13,
                                        fontFamily: 'monospace',
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                    ],
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
