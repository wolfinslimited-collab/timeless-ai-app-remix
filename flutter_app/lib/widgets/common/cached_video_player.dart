import 'dart:io';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import '../../core/theme.dart';

/// A custom cache manager for video files with longer cache duration
class VideoCacheManager {
  static const key = 'videoCache';
  static CacheManager instance = CacheManager(
    Config(
      key,
      stalePeriod: const Duration(days: 7),
      maxNrOfCacheObjects: 50,
      repo: JsonCacheInfoRepository(databaseName: key),
      fileService: HttpFileService(),
    ),
  );
}

/// A video player widget that caches videos locally for better performance.
/// 
/// Features:
/// - Downloads and caches videos from network URLs
/// - Plays from local cache on subsequent loads
/// - Shows loading indicator while downloading
/// - Auto-plays with loop and muted options
class CachedVideoPlayer extends StatefulWidget {
  final String videoUrl;
  final bool autoPlay;
  final bool looping;
  final bool muted;
  final BoxFit fit;
  final Widget? placeholder;
  final Widget? errorWidget;

  const CachedVideoPlayer({
    super.key,
    required this.videoUrl,
    this.autoPlay = true,
    this.looping = true,
    this.muted = true,
    this.fit = BoxFit.cover,
    this.placeholder,
    this.errorWidget,
  });

  @override
  State<CachedVideoPlayer> createState() => _CachedVideoPlayerState();
}

class _CachedVideoPlayerState extends State<CachedVideoPlayer> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _hasError = false;
  bool _isDownloading = false;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  @override
  void didUpdateWidget(CachedVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.videoUrl != widget.videoUrl) {
      _disposeController();
      _initializeVideo();
    }
  }

  Future<void> _initializeVideo() async {
    if (!mounted) return;
    
    setState(() {
      _hasError = false;
      _isInitialized = false;
      _isDownloading = false;
    });

    try {
      final fileInfo = await VideoCacheManager.instance.getFileFromCache(widget.videoUrl);
      
      File videoFile;
      if (fileInfo != null) {
        videoFile = fileInfo.file;
      } else {
        if (mounted) {
          setState(() => _isDownloading = true);
        }
        final file = await VideoCacheManager.instance.getSingleFile(widget.videoUrl);
        videoFile = file;
        if (mounted) {
          setState(() => _isDownloading = false);
        }
      }

      if (!mounted) return;

      _controller = VideoPlayerController.file(
        videoFile,
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      );

      await _controller!.initialize();
      
      if (!mounted) {
        _controller?.dispose();
        return;
      }

      _controller!.setLooping(widget.looping);
      _controller!.setVolume(widget.muted ? 0 : 1);
      
      if (widget.autoPlay) {
        _controller!.play();
      }

      setState(() {
        _isInitialized = true;
      });
    } catch (e) {
      debugPrint('CachedVideoPlayer: Error loading video: $e');
      if (mounted) {
        setState(() {
          _hasError = true;
          _isDownloading = false;
        });
      }
    }
  }

  void _disposeController() {
    _controller?.pause();
    _controller?.dispose();
    _controller = null;
  }

  @override
  void dispose() {
    _disposeController();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return widget.errorWidget ?? _buildErrorWidget();
    }

    if (_isInitialized && _controller != null) {
      return ClipRect(
        child: FittedBox(
          fit: widget.fit,
          child: SizedBox(
            width: _controller!.value.size.width,
            height: _controller!.value.size.height,
            child: VideoPlayer(_controller!),
          ),
        ),
      );
    }

    // Only show spinner when actively downloading from network
    if (_isDownloading) {
      return widget.placeholder ?? _buildLoadingWidget();
    }

    // Initializing from cache — show quiet placeholder (no spinner)
    return _buildCachePlaceholder();
  }

  Widget _buildLoadingWidget() {
    return Container(
      color: AppTheme.secondary,
      child: const Center(
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: AppTheme.primary,
        ),
      ),
    );
  }

  Widget _buildCachePlaceholder() {
    return Container(
      color: AppTheme.secondary,
    );
  }

  Widget _buildErrorWidget() {
    return Container(
      color: AppTheme.secondary,
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.videocam_off_outlined, color: AppTheme.muted, size: 32),
            SizedBox(height: 8),
            Text(
              'Video unavailable',
              style: TextStyle(color: AppTheme.muted, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

/// A simpler cached video thumbnail that shows the first frame
class CachedVideoThumbnail extends StatefulWidget {
  final String videoUrl;
  final BoxFit fit;
  final Widget? placeholder;

  const CachedVideoThumbnail({
    super.key,
    required this.videoUrl,
    this.fit = BoxFit.cover,
    this.placeholder,
  });

  @override
  State<CachedVideoThumbnail> createState() => _CachedVideoThumbnailState();
}

class _CachedVideoThumbnailState extends State<CachedVideoThumbnail> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    try {
      final file = await VideoCacheManager.instance.getSingleFile(widget.videoUrl);
      
      if (!mounted) return;

      _controller = VideoPlayerController.file(
        file,
        videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
      );

      await _controller!.initialize();
      
      if (!mounted) {
        _controller?.dispose();
        return;
      }

      // Don't play, just show first frame
      _controller!.setVolume(0);
      _controller!.pause();

      setState(() {
        _isInitialized = true;
      });
    } catch (e) {
      debugPrint('CachedVideoThumbnail: Error loading video: $e');
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized || _controller == null) {
      return widget.placeholder ?? Container(
        color: AppTheme.secondary,
        child: const Center(
          child: Icon(Icons.videocam_outlined, color: AppTheme.muted, size: 32),
        ),
      );
    }

    return ClipRect(
      child: FittedBox(
        fit: widget.fit,
        child: SizedBox(
          width: _controller!.value.size.width,
          height: _controller!.value.size.height,
          child: VideoPlayer(_controller!),
        ),
      ),
    );
  }
}
