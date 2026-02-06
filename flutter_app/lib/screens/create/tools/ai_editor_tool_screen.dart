import 'dart:io';
import 'dart:typed_data';
import 'dart:math' as math;
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

/// Text overlay data model
class TextOverlay {
  String id;
  String text;
  Offset position;
  double fontSize;
  Color textColor;
  String fontFamily;
  TextAlign alignment;
  bool hasBackground;
  Color backgroundColor;
  double backgroundOpacity;
  double startTime; // in seconds
  double endTime; // in seconds
  double scale;
  int trackIndex; // Z-index/track order for layer stacking

  TextOverlay({
    required this.id,
    this.text = 'Sample Text',
    this.position = const Offset(0.5, 0.5), // Normalized 0-1
    this.fontSize = 24,
    this.textColor = Colors.white,
    this.fontFamily = 'Roboto',
    this.alignment = TextAlign.center,
    this.hasBackground = false,
    this.backgroundColor = Colors.black,
    this.backgroundOpacity = 0.5,
    this.startTime = 0,
    this.endTime = 5,
    this.scale = 1.0,
    this.trackIndex = 0,
  });
}

/// Audio layer data model
class AudioLayer {
  String id;
  String name;
  double startTime;
  double endTime;
  int trackIndex;
  
  AudioLayer({
    required this.id,
    required this.name,
    this.startTime = 0,
    this.endTime = 5,
    this.trackIndex = 0,
  });
}

/// Sticker layer data model
class StickerLayer {
  String id;
  String assetPath;
  Offset position;
  double startTime;
  double endTime;
  double scale;
  int trackIndex;
  
  StickerLayer({
    required this.id,
    required this.assetPath,
    this.position = const Offset(0.5, 0.5),
    this.startTime = 0,
    this.endTime = 5,
    this.scale = 1.0,
    this.trackIndex = 0,
  });
}

/// Layer type enum for track management
enum LayerType { text, audio, sticker }

class AIEditorToolScreen extends StatefulWidget {
  const AIEditorToolScreen({super.key});

  @override
  State<AIEditorToolScreen> createState() => _AIEditorToolScreenState();
}

class _AIEditorToolScreenState extends State<AIEditorToolScreen> with SingleTickerProviderStateMixin {
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

  // Timeline Sync Engine - Global Constants
  static const double _pixelsPerSecond = 80.0; // Master time-to-pixel ratio
  static const double _thumbnailHeight = 48.0;
  
  // Timeline state
  final ScrollController _timelineScrollController = ScrollController();
  List<Uint8List?> _thumbnails = [];
  bool _isExtractingThumbnails = false;
  bool _isUserScrolling = false;
  bool _isAutoScrolling = false; // Prevent feedback loops during auto-scroll
  
  // Calculated values based on video duration
  int get _thumbnailCount {
    final duration = _videoController?.value.duration.inSeconds.toDouble() ?? 10.0;
    return (duration * _pixelsPerSecond / 60.0).ceil().clamp(10, 100);
  }
  
  double get _thumbnailWidth => 60.0;

  // Snapping state
  static const double _snapThreshold = 10.0; // pixels
  double? _snapLinePosition;
  
  // Text overlay state
  List<TextOverlay> _textOverlays = [];
  String? _selectedTextId;
  final TextEditingController _textInputController = TextEditingController();
  TabController? _textTabController;
  
  // Layer dragging state
  String? _draggingLayerId;
  LayerType? _draggingLayerType;
  double _dragOffsetY = 0;
  
  // Layer trimming state
  String? _trimmingLayerId;
  bool _isTrimmingStart = false;
  bool _isTrimmingEnd = false;
  
  // Settings panel state - for dynamic UI overlap
  bool _isTextEditorInline = false; // For inline keyboard editing
  
  // Quality options
  final List<String> _qualityOptions = ['720p', '1080p', '2K', '4K'];

  // Available fonts
  final List<String> _availableFonts = [
    'Roboto',
    'Serif',
    'Montserrat',
    'Handwriting',
    'Impact',
    'Comic Sans',
  ];

  // Available colors for text
  final List<Color> _availableColors = [
    Colors.white,
    Colors.black,
    Colors.red,
    Colors.orange,
    Colors.yellow,
    Colors.green,
    Colors.blue,
    Colors.purple,
    Colors.pink,
    const Color(0xFF8B5CF6), // Primary violet
  ];

  // Adjustment values (range -1.0 to 1.0, default 0)
  double _brightness = 0.0;
  double _contrast = 0.0;
  double _saturation = 0.0;
  double _exposure = 0.0;
  double _sharpen = 0.0;
  double _highlight = 0.0;
  double _shadow = 0.0;
  double _temperature = 0.0;
  double _hue = 0.0;

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

  // Adjustment tool definitions
  List<AdjustmentTool> get _adjustmentTools => [
    AdjustmentTool(id: 'brightness', name: 'Brightness', icon: Icons.brightness_6, value: _brightness, onChanged: (v) => setState(() => _brightness = v)),
    AdjustmentTool(id: 'contrast', name: 'Contrast', icon: Icons.contrast, value: _contrast, onChanged: (v) => setState(() => _contrast = v)),
    AdjustmentTool(id: 'saturation', name: 'Saturation', icon: Icons.palette_outlined, value: _saturation, onChanged: (v) => setState(() => _saturation = v)),
    AdjustmentTool(id: 'exposure', name: 'Exposure', icon: Icons.exposure, value: _exposure, onChanged: (v) => setState(() => _exposure = v)),
    AdjustmentTool(id: 'sharpen', name: 'Sharpen', icon: Icons.blur_on, value: _sharpen, onChanged: (v) => setState(() => _sharpen = v)),
    AdjustmentTool(id: 'highlight', name: 'Highlight', icon: Icons.wb_sunny_outlined, value: _highlight, onChanged: (v) => setState(() => _highlight = v)),
    AdjustmentTool(id: 'shadow', name: 'Shadow', icon: Icons.nights_stay_outlined, value: _shadow, onChanged: (v) => setState(() => _shadow = v)),
    AdjustmentTool(id: 'temp', name: 'Temp', icon: Icons.thermostat_outlined, value: _temperature, onChanged: (v) => setState(() => _temperature = v)),
    AdjustmentTool(id: 'hue', name: 'Hue', icon: Icons.color_lens_outlined, value: _hue, onChanged: (v) => setState(() => _hue = v)),
  ];

  TextOverlay? get _selectedTextOverlay {
    if (_selectedTextId == null) return null;
    try {
      return _textOverlays.firstWhere((t) => t.id == _selectedTextId);
    } catch (_) {
      return null;
    }
  }

  @override
  void initState() {
    super.initState();
    _textTabController = TabController(length: 5, vsync: this);
    _loadRecentVideos();
  }

  void _resetAllAdjustments() {
    setState(() {
      _brightness = 0.0;
      _contrast = 0.0;
      _saturation = 0.0;
      _exposure = 0.0;
      _sharpen = 0.0;
      _highlight = 0.0;
      _shadow = 0.0;
      _temperature = 0.0;
      _hue = 0.0;
    });
    _showSnackBar('All adjustments reset');
  }

  // Build color matrix for video filtering
  ColorFilter _buildColorFilter() {
    // Start with identity matrix
    List<double> matrix = [
      1, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 1, 0,
    ];

    // Apply brightness (add to RGB channels)
    final brightnessValue = _brightness * 50;
    matrix = _multiplyMatrix(matrix, [
      1, 0, 0, 0, brightnessValue,
      0, 1, 0, 0, brightnessValue,
      0, 0, 1, 0, brightnessValue,
      0, 0, 0, 1, 0,
    ]);

    // Apply contrast
    final contrastValue = 1 + _contrast;
    final contrastOffset = 128 * (1 - contrastValue);
    matrix = _multiplyMatrix(matrix, [
      contrastValue, 0, 0, 0, contrastOffset,
      0, contrastValue, 0, 0, contrastOffset,
      0, 0, contrastValue, 0, contrastOffset,
      0, 0, 0, 1, 0,
    ]);

    // Apply saturation
    final saturationValue = 1 + _saturation;
    const lumR = 0.3086;
    const lumG = 0.6094;
    const lumB = 0.0820;
    final sr = (1 - saturationValue) * lumR;
    final sg = (1 - saturationValue) * lumG;
    final sb = (1 - saturationValue) * lumB;
    matrix = _multiplyMatrix(matrix, [
      sr + saturationValue, sg, sb, 0, 0,
      sr, sg + saturationValue, sb, 0, 0,
      sr, sg, sb + saturationValue, 0, 0,
      0, 0, 0, 1, 0,
    ]);

    // Apply exposure (multiply RGB)
    final exposureValue = 1 + (_exposure * 0.5);
    matrix = _multiplyMatrix(matrix, [
      exposureValue, 0, 0, 0, 0,
      0, exposureValue, 0, 0, 0,
      0, 0, exposureValue, 0, 0,
      0, 0, 0, 1, 0,
    ]);

    // Apply temperature (warm/cool tint)
    final tempR = _temperature > 0 ? _temperature * 30 : 0;
    final tempB = _temperature < 0 ? -_temperature * 30 : 0;
    matrix = _multiplyMatrix(matrix, [
      1, 0, 0, 0, tempR,
      0, 1, 0, 0, 0,
      0, 0, 1, 0, tempB,
      0, 0, 0, 1, 0,
    ]);

    // Apply highlights (affects bright areas - simplified)
    final highlightValue = _highlight * 20;
    matrix = _multiplyMatrix(matrix, [
      1, 0, 0, 0, highlightValue,
      0, 1, 0, 0, highlightValue,
      0, 0, 1, 0, highlightValue,
      0, 0, 0, 1, 0,
    ]);

    // Apply shadows (affects dark areas - simplified)
    final shadowValue = _shadow * 15;
    matrix = _multiplyMatrix(matrix, [
      1, 0, 0, 0, shadowValue,
      0, 1, 0, 0, shadowValue,
      0, 0, 1, 0, shadowValue,
      0, 0, 0, 1, 0,
    ]);

    return ColorFilter.matrix(matrix);
  }

  List<double> _multiplyMatrix(List<double> a, List<double> b) {
    // Multiply two 5x4 color matrices
    final result = List<double>.filled(20, 0);
    for (int i = 0; i < 4; i++) {
      for (int j = 0; j < 5; j++) {
        double sum = 0;
        for (int k = 0; k < 4; k++) {
          sum += a[i * 5 + k] * b[k * 5 + j];
        }
        if (j == 4) {
          sum += a[i * 5 + 4];
        }
        result[i * 5 + j] = sum;
      }
    }
    return result;
  }

  @override
  void dispose() {
    _timelineScrollController.removeListener(_onTimelineScroll);
    _timelineScrollController.dispose();
    _videoController?.removeListener(_onVideoPositionChanged);
    _videoController?.dispose();
    _textTabController?.dispose();
    _textInputController.dispose();
    super.dispose();
  }

  // Text overlay functions
  void _addTextOverlay() {
    final duration = _videoController?.value.duration.inSeconds.toDouble() ?? 10.0;
    final newText = TextOverlay(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      text: 'Sample Text',
      startTime: 0,
      endTime: math.min(5.0, duration),
    );
    setState(() {
      _textOverlays.add(newText);
      _selectedTextId = newText.id;
      _textInputController.text = newText.text;
    });
  }

  void _updateSelectedText(void Function(TextOverlay) updater) {
    if (_selectedTextId == null) return;
    setState(() {
      final index = _textOverlays.indexWhere((t) => t.id == _selectedTextId);
      if (index != -1) {
        updater(_textOverlays[index]);
      }
    });
  }

  void _deleteTextOverlay(String id) {
    setState(() {
      _textOverlays.removeWhere((t) => t.id == id);
      if (_selectedTextId == id) {
        _selectedTextId = null;
      }
    });
  }

  void _selectTextOverlay(String? id) {
    setState(() {
      _selectedTextId = id;
      if (id != null) {
        final overlay = _textOverlays.firstWhere((t) => t.id == id);
        _textInputController.text = overlay.text;
      }
    });
  }

  // ============================================
  // TIMELINE SYNC ENGINE - Core Logic
  // ============================================
  
  /// Convert video time (seconds) to scroll offset (pixels)
  double _timeToScroll(double timeSeconds) {
    return timeSeconds * _pixelsPerSecond;
  }
  
  /// Convert scroll offset (pixels) to video time (seconds)
  double _scrollToTime(double scrollOffset) {
    return scrollOffset / _pixelsPerSecond;
  }
  
  /// Get total timeline width based on video duration
  double get _totalTimelineWidth {
    final duration = _videoController?.value.duration.inSeconds.toDouble() ?? 10.0;
    return duration * _pixelsPerSecond;
  }

  void _onTimelineScroll() {
    // Only process manual scrolling (not auto-scroll from video playback)
    if (!_isUserScrolling || _isAutoScrolling) return;
    if (_videoController == null || !_isVideoInitialized) return;
    
    // PAUSE video immediately when user starts manual scrubbing
    if (_videoController!.value.isPlaying) {
      _videoController!.pause();
    }
    
    final scrollOffset = _timelineScrollController.offset;
    
    // Calculate exact time position under the center playhead
    final timeUnderPlayhead = _scrollToTime(scrollOffset);
    final duration = _videoController!.value.duration;
    final clampedTime = timeUnderPlayhead.clamp(0.0, duration.inSeconds.toDouble());
    final newPosition = Duration(milliseconds: (clampedTime * 1000).toInt());
    
    // Seek video to exact millisecond under playhead
    _videoController!.seekTo(newPosition);
  }

  void _onScrollEnd() {
    // Called when user stops scrolling - ensure video is at exact playhead position
    if (_videoController == null || !_isVideoInitialized) return;
    if (!_timelineScrollController.hasClients) return;
    
    final scrollOffset = _timelineScrollController.offset;
    final timeUnderPlayhead = _scrollToTime(scrollOffset);
    final duration = _videoController!.value.duration;
    final clampedTime = timeUnderPlayhead.clamp(0.0, duration.inSeconds.toDouble());
    final exactPosition = Duration(milliseconds: (clampedTime * 1000).toInt());
    
    // Jump to exact millisecond when scrolling stops
    _videoController!.seekTo(exactPosition);
  }

  void _onVideoPositionChanged() {
    // Don't auto-scroll if user is manually scrolling
    if (_isUserScrolling || _videoController == null || !_isVideoInitialized) return;
    if (!_timelineScrollController.hasClients) return;
    
    // Only auto-scroll during playback
    if (!_videoController!.value.isPlaying) return;
    
    final positionSeconds = _videoController!.value.position.inMilliseconds / 1000.0;
    final targetScroll = _timeToScroll(positionSeconds);
    
    // Use flag to prevent feedback loops
    _isAutoScrolling = true;
    
    // Scroll timeline to keep current frame under center playhead
    _timelineScrollController.jumpTo(
      targetScroll.clamp(0.0, _timelineScrollController.position.maxScrollExtent)
    );
    
    _isAutoScrolling = false;
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
            // Dynamic UI: Show timeline OR settings panel based on active tool
            if (_isVideoInitialized && _videoController != null)
              _buildDynamicBottomArea(),
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
      return LayoutBuilder(
        builder: (context, constraints) {
          // Calculate maximized video dimensions - use full available space
          final videoAspectRatio = _videoController!.value.aspectRatio;
          final availableHeight = constraints.maxHeight;
          final availableWidth = constraints.maxWidth - 16; // Minimal horizontal margin
          
          // Calculate video dimensions to maximize space while maintaining aspect ratio
          double videoWidth = availableWidth;
          double videoHeight = videoWidth / videoAspectRatio;
          
          // Fill up to 98% of available height for maximum video size
          if (videoHeight > availableHeight * 0.98) {
            videoHeight = availableHeight * 0.98;
            videoWidth = videoHeight * videoAspectRatio;
          }
          
          return Center(
            child: Container(
              width: videoWidth,
              height: videoHeight,
              margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(12),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: ColorFiltered(
                  colorFilter: _buildColorFilter(),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      // Video player only - no overlay buttons
                      VideoPlayer(_videoController!),
                      // Text overlays for editing
                      ..._buildTextOverlays(constraints),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
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
    final duration = _videoController?.value.duration.inSeconds.toDouble() ?? 10.0;
    final trackWidth = _totalTimelineWidth; // duration * pixelsPerSecond
    
    // Minimal edge padding for visual clarity
    const double edgePadding = 16.0;
    
    // Total scrollable width: small padding + track + small padding
    final totalScrollWidth = edgePadding + trackWidth + edgePadding;
    
    // Calculate height based on tracks
    const baseHeight = 200.0;
    
    // Playhead positioned at left edge with small offset
    const double playheadOffset = edgePadding;
    
    return Container(
      height: baseHeight,
      color: const Color(0xFF0D0D0D),
      child: Stack(
        children: [
          // Scrollable timeline content with manual scroll detection
          NotificationListener<ScrollNotification>(
            onNotification: (notification) {
              if (notification is ScrollStartNotification) {
                setState(() => _isUserScrolling = true);
                // Pause video when user starts scrolling
                if (_videoController?.value.isPlaying ?? false) {
                  _videoController!.pause();
                }
              } else if (notification is ScrollUpdateNotification) {
                // Continuous seeking while scrolling
                _onTimelineScroll();
              } else if (notification is ScrollEndNotification) {
                setState(() => _isUserScrolling = false);
                // Final sync when scrolling stops
                _onScrollEnd();
              }
              return false;
            },
            child: SingleChildScrollView(
              controller: _timelineScrollController,
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: SizedBox(
                width: totalScrollWidth,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Time Ruler
                    _buildTimeRuler(edgePadding),
                    const SizedBox(height: 4),
                    
                    // Video Track with Controls (scrollable together)
                    _buildVideoTrackWithControls(edgePadding, trackWidth),
                    const SizedBox(height: 6),
                    
                    // Text Track (Purple/Yellow layers)
                    _buildTextTrack(edgePadding, trackWidth, duration),
                    const SizedBox(height: 6),
                    
                    // Add layer buttons row
                    _buildAddLayerRow(edgePadding),
                  ],
                ),
              ),
            ),
          ),
          
          // Fixed Playhead at left edge (with small offset for visibility)
          Positioned(
            left: playheadOffset,
            top: 0,
            bottom: 0,
            child: IgnorePointer(
              child: Stack(
                children: [
                  // Main playhead line
                  Container(
                    width: 2,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.white.withOpacity(0.5),
                          blurRadius: 4,
                        ),
                      ],
                    ),
                  ),
                  // Playhead top indicator
                  Positioned(
                    top: 0,
                    left: -5,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Snap indicator (green line when snapping)
          if (_snapLinePosition != null)
            Positioned(
              left: _snapLinePosition!,
              top: 0,
              bottom: 0,
              child: Container(
                width: 2,
                color: const Color(0xFF00FF00).withOpacity(0.8),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildVideoTrackWithControls(double startPadding, double trackWidth) {
    return SizedBox(
      height: _thumbnailHeight + 8,
      child: Row(
        children: [
          // Minimal left padding to align with screen edge
          SizedBox(width: startPadding),
          
          // Mute button (scrolls with timeline)
          GestureDetector(
            onTap: _toggleMute,
            child: Container(
              width: 50,
              height: _thumbnailHeight,
              margin: const EdgeInsets.only(right: 6),
              decoration: BoxDecoration(
                color: _isMuted 
                    ? AppTheme.primary.withOpacity(0.15)
                    : Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: _isMuted 
                      ? AppTheme.primary.withOpacity(0.4)
                      : Colors.white.withOpacity(0.1),
                  width: 1,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    _isMuted ? Icons.volume_off : Icons.volume_up,
                    size: 18,
                    color: _isMuted ? AppTheme.primary : Colors.white.withOpacity(0.7),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Mute',
                    style: TextStyle(
                      color: _isMuted ? AppTheme.primary : Colors.white.withOpacity(0.5),
                      fontSize: 8,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Cover button (scrolls with timeline)
          GestureDetector(
            onTap: () => _showSnackBar('Set cover image'),
            child: Container(
              width: 50,
              height: _thumbnailHeight,
              margin: const EdgeInsets.only(right: 10),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.image_outlined, size: 18, color: Colors.white.withOpacity(0.6)),
                  const SizedBox(height: 2),
                  Text(
                    'Cover',
                    style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 8),
                  ),
                ],
              ),
            ),
          ),
          
          // Video Track - Filmstrip using ListView.builder
          _buildVideoTrackFilmstrip(trackWidth),
          
          const SizedBox(width: 10),
          
          // Add clip button
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
                    color: Colors.white.withOpacity(0.25),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: const Icon(Icons.add, color: Colors.black, size: 26),
            ),
          ),
          
          // Minimal right padding
          SizedBox(width: startPadding),
        ],
      ),
    );
  }

  /// Build filmstrip video track using ListView.builder for performance
  Widget _buildVideoTrackFilmstrip(double trackWidth) {
    final duration = _videoController?.value.duration.inSeconds.toDouble() ?? 10.0;
    // Calculate how many thumbnails fit in the track
    final thumbCount = (trackWidth / _thumbnailWidth).ceil();
    
    return Container(
      width: trackWidth,
      height: _thumbnailHeight + 4,
      decoration: BoxDecoration(
        color: const Color(0xFF8B0000),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFAA2222), width: 2),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(6),
        child: ListView.builder(
          scrollDirection: Axis.horizontal,
          physics: const NeverScrollableScrollPhysics(), // Timeline scrolls, not this
          itemCount: thumbCount,
          itemBuilder: (context, index) {
            // Get corresponding thumbnail if available
            final thumbnailIndex = _thumbnails.isNotEmpty 
                ? (index * _thumbnails.length / thumbCount).floor().clamp(0, _thumbnails.length - 1)
                : -1;
            final thumbnail = thumbnailIndex >= 0 && thumbnailIndex < _thumbnails.length 
                ? _thumbnails[thumbnailIndex] 
                : null;
            
            return Container(
              width: _thumbnailWidth,
              height: _thumbnailHeight,
              decoration: BoxDecoration(
                border: Border(
                  right: index < thumbCount - 1
                      ? BorderSide(color: const Color(0xFF5A0000).withOpacity(0.5), width: 0.5)
                      : BorderSide.none,
                ),
              ),
              child: thumbnail != null
                  ? Image.memory(
                      thumbnail,
                      fit: BoxFit.cover,
                      gaplessPlayback: true,
                    )
                  : Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Color(0xFF8B0000), Color(0xFF5A0000)],
                        ),
                      ),
                      child: _isExtractingThumbnails
                          ? Center(
                              child: SizedBox(
                                width: 10,
                                height: 10,
                                child: CircularProgressIndicator(
                                  strokeWidth: 1.5,
                                  color: Colors.white.withOpacity(0.4),
                                ),
                              ),
                            )
                          : Center(
                              child: Icon(
                                Icons.movie_outlined,
                                size: 14,
                                color: Colors.white.withOpacity(0.3),
                              ),
                            ),
                    ),
            );
          },
        ),
      ),
    );
  }

  // Audio track removed - space dedicated to text/other layers only

  Widget _buildTextTrack(double startPadding, double trackWidth, double duration) {
    if (_textOverlays.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return SizedBox(
      height: 40,
      child: Row(
        children: [
          SizedBox(width: startPadding),
          
          SizedBox(
            width: trackWidth,
            child: Stack(
              clipBehavior: Clip.none,
              children: _textOverlays.map((overlay) {
                // Use pixelsPerSecond for consistent positioning
                final leftOffset = overlay.startTime * _pixelsPerSecond;
                final itemWidth = ((overlay.endTime - overlay.startTime) * _pixelsPerSecond).clamp(50.0, trackWidth);
                final isSelected = overlay.id == _selectedTextId;
                final isDragging = overlay.id == _draggingLayerId;
                
                return Positioned(
                  left: leftOffset,
                  child: GestureDetector(
                    onTap: () => _selectTextOverlay(overlay.id),
                    onLongPressStart: (details) {
                      setState(() {
                        _draggingLayerId = overlay.id;
                        _draggingLayerType = LayerType.text;
                        _dragOffsetY = 0;
                      });
                    },
                    onLongPressMoveUpdate: (details) {
                      setState(() {
                        _dragOffsetY = details.localOffsetFromOrigin.dy;
                      });
                    },
                    onLongPressEnd: (details) {
                      if (_dragOffsetY.abs() > 20) {
                        _reorderLayers(overlay.id, LayerType.text, _dragOffsetY > 0);
                      }
                      setState(() {
                        _draggingLayerId = null;
                        _draggingLayerType = null;
                        _dragOffsetY = 0;
                      });
                    },
                    onHorizontalDragUpdate: (details) {
                      final delta = details.primaryDelta ?? 0;
                      // Convert pixel delta to time using pixelsPerSecond
                      final timeDelta = delta / _pixelsPerSecond;
                      final itemDuration = overlay.endTime - overlay.startTime;
                      
                      setState(() {
                        var newStart = (overlay.startTime + timeDelta).clamp(0.0, duration - itemDuration);
                        
                        // Snapping logic using pixelsPerSecond
                        final playheadTime = _videoController?.value.position.inSeconds.toDouble() ?? 0;
                        final snapTimeThreshold = _snapThreshold / _pixelsPerSecond;
                        
                        // Snap to playhead (now at left edge with 16px offset)
                        const playheadScreenOffset = 16.0;
                        if ((newStart - playheadTime).abs() < snapTimeThreshold) {
                          newStart = playheadTime;
                          _snapLinePosition = playheadScreenOffset;
                        } else if ((newStart + itemDuration - playheadTime).abs() < snapTimeThreshold) {
                          newStart = playheadTime - itemDuration;
                          _snapLinePosition = playheadScreenOffset;
                        } else {
                          _snapLinePosition = null;
                        }
                        
                        // Snap to other clips
                        for (final other in _textOverlays) {
                          if (other.id == overlay.id) continue;
                          if ((newStart - other.endTime).abs() < snapTimeThreshold) {
                            newStart = other.endTime;
                            break;
                          }
                          if ((newStart + itemDuration - other.startTime).abs() < snapTimeThreshold) {
                            newStart = other.startTime - itemDuration;
                            break;
                          }
                        }
                        
                        overlay.startTime = newStart;
                        overlay.endTime = newStart + itemDuration;
                      });
                    },
                    onHorizontalDragEnd: (_) {
                      setState(() => _snapLinePosition = null);
                    },
                    child: Transform.translate(
                      offset: isDragging ? Offset(0, _dragOffsetY) : Offset.zero,
                      child: _buildLayerClip(
                        overlay: overlay,
                        itemWidth: itemWidth,
                        isSelected: isSelected,
                        isDragging: isDragging,
                        trackWidth: trackWidth,
                        duration: duration,
                        color: isSelected ? const Color(0xFFF59E0B) : const Color(0xFF8B5CF6),
                        icon: Icons.text_fields,
                        label: overlay.text,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          
          SizedBox(width: startPadding),
        ],
      ),
    );
  }

  Widget _buildLayerClip({
    required TextOverlay overlay,
    required double itemWidth,
    required bool isSelected,
    required bool isDragging,
    required double trackWidth,
    required double duration,
    required Color color,
    required IconData icon,
    required String label,
  }) {
    return Container(
      width: itemWidth,
      height: 34,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isSelected 
              ? [const Color(0xFFF59E0B), const Color(0xFFD97706)]
              : [color, color.withOpacity(0.8)],
        ),
        borderRadius: BorderRadius.circular(6),
        border: isSelected ? Border.all(color: Colors.white, width: 2) : null,
        boxShadow: [
          BoxShadow(
            color: color.withOpacity(isDragging ? 0.6 : 0.3),
            blurRadius: isDragging ? 16 : 8,
          ),
        ],
      ),
      child: Row(
        children: [
          // Left trim handle - uses pixelsPerSecond
          GestureDetector(
            onHorizontalDragStart: (_) {
              setState(() {
                _trimmingLayerId = overlay.id;
                _isTrimmingStart = true;
              });
            },
            onHorizontalDragUpdate: (details) {
              final delta = details.primaryDelta ?? 0;
              // Convert pixel delta to time using global pixelsPerSecond
              final timeDelta = delta / _pixelsPerSecond;
              setState(() {
                overlay.startTime = (overlay.startTime + timeDelta).clamp(0.0, overlay.endTime - 0.5);
              });
            },
            onHorizontalDragEnd: (_) {
              setState(() {
                _trimmingLayerId = null;
                _isTrimmingStart = false;
              });
            },
            child: Container(
              width: 10,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(isSelected ? 0.5 : 0.3),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(6),
                  bottomLeft: Radius.circular(6),
                ),
              ),
              child: Center(
                child: Container(
                  width: 3,
                  height: 16,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ),
            ),
          ),
          
          // Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(icon, size: 12, color: Colors.white.withOpacity(0.9)),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      label,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Right trim handle - uses pixelsPerSecond
          GestureDetector(
            onHorizontalDragStart: (_) {
              setState(() {
                _trimmingLayerId = overlay.id;
                _isTrimmingEnd = true;
              });
            },
            onHorizontalDragUpdate: (details) {
              final delta = details.primaryDelta ?? 0;
              // Convert pixel delta to time using global pixelsPerSecond
              final timeDelta = delta / _pixelsPerSecond;
              setState(() {
                overlay.endTime = (overlay.endTime + timeDelta).clamp(overlay.startTime + 0.5, duration);
              });
            },
            onHorizontalDragEnd: (_) {
              setState(() {
                _trimmingLayerId = null;
                _isTrimmingEnd = false;
              });
            },
            child: Container(
              width: 10,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(isSelected ? 0.5 : 0.3),
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(6),
                  bottomRight: Radius.circular(6),
                ),
              ),
              child: Center(
                child: Container(
                  width: 3,
                  height: 16,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _reorderLayers(String layerId, LayerType type, bool moveDown) {
    if (type == LayerType.text) {
      final index = _textOverlays.indexWhere((t) => t.id == layerId);
      if (index == -1) return;
      
      if (moveDown && index < _textOverlays.length - 1) {
        final temp = _textOverlays[index].trackIndex;
        _textOverlays[index].trackIndex = _textOverlays[index + 1].trackIndex;
        _textOverlays[index + 1].trackIndex = temp;
        // Swap positions
        final item = _textOverlays.removeAt(index);
        _textOverlays.insert(index + 1, item);
      } else if (!moveDown && index > 0) {
        final temp = _textOverlays[index].trackIndex;
        _textOverlays[index].trackIndex = _textOverlays[index - 1].trackIndex;
        _textOverlays[index - 1].trackIndex = temp;
        final item = _textOverlays.removeAt(index);
        _textOverlays.insert(index - 1, item);
      }
    }
    _showSnackBar('Layer reordered');
  }

  Widget _buildAddLayerRow(double startPadding) {
    return SizedBox(
      height: 36,
      child: Row(
        children: [
          SizedBox(width: startPadding),
          
          // Add text button
          GestureDetector(
            onTap: _addTextOverlay,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF2A2A2A),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF8B5CF6).withOpacity(0.4)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      color: const Color(0xFF8B5CF6).withOpacity(0.3),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Icon(Icons.add, size: 12, color: Color(0xFF8B5CF6)),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'Add text',
                    style: TextStyle(
                      color: Color(0xFF8B5CF6),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(width: 10),
          
          // Add sticker button
          GestureDetector(
            onTap: () => _showSnackBar('Add sticker coming soon'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF2A2A2A),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFEC4899).withOpacity(0.4)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      color: const Color(0xFFEC4899).withOpacity(0.3),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Icon(Icons.add, size: 12, color: Color(0xFFEC4899)),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'Add sticker',
                    style: TextStyle(
                      color: Color(0xFFEC4899),
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          SizedBox(width: startPadding),
        ],
      ),
    );
  }
  
  Widget _buildTimeRuler(double startPadding) {
    final duration = _videoController?.value.duration ?? Duration.zero;
    final totalSeconds = duration.inSeconds > 0 ? duration.inSeconds : 10;
    final trackWidth = _totalTimelineWidth; // Use consistent timeline width
    
    // Calculate number of 2-second intervals
    final numMajorTicks = (totalSeconds ~/ 2) + 1;
    
    return Container(
      height: 24,
      child: Row(
        children: [
          // Left padding to align with video track start
          SizedBox(width: startPadding),
          
          // Time ticks with 2-second major intervals
          SizedBox(
            width: trackWidth,
            child: Stack(
              children: [
                // Major ticks every 2 seconds
                ...List.generate(numMajorTicks, (i) {
                  final seconds = i * 2;
                  if (seconds > totalSeconds) return const SizedBox.shrink();
                  final position = seconds * pixelsPerSecond;
                  return Positioned(
                    left: position.clamp(0, trackWidth - 30),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          width: 1.5,
                          height: 10,
                          color: Colors.white.withOpacity(0.5),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _formatSecondsToTimestamp(seconds),
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.6),
                            fontSize: 10,
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
                // Minor ticks every 1 second (smaller)
                ...List.generate(totalSeconds + 1, (i) {
                  if (i % 2 == 0) return const SizedBox.shrink(); // Skip major tick positions
                  final position = i * pixelsPerSecond;
                  return Positioned(
                    left: position.clamp(0, trackWidth - 1),
                    child: Container(
                      width: 1,
                      height: 6,
                      color: Colors.white.withOpacity(0.25),
                    ),
                  );
                }),
              ],
            ),
          ),
          
          // Right padding
          SizedBox(width: startPadding),
        ],
      ),
    );
  }
  
  String _formatSecondsToTimestamp(int seconds) {
    final mins = (seconds ~/ 60).toString().padLeft(2, '0');
    final secs = (seconds % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }
  
  // Old methods removed - replaced by new multi-track system

  // Dynamic bottom area that switches between timeline and settings panel
  Widget _buildDynamicBottomArea() {
    // Check if a settings panel should be shown (overlays timeline)
    final bool showSettingsPanel = _selectedTool == 'text' || _selectedTool == 'adjust';
    
    if (showSettingsPanel) {
      return _buildContextualSettingsPanel();
    } else {
      // Show normal timeline + toolbar
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildTimelineSection(),
          _buildBottomToolbar(),
        ],
      );
    }
  }

  // Contextual settings panel that overlays the timeline area
  Widget _buildContextualSettingsPanel() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0A),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header with Done (checkmark) and Cancel (X) buttons
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
            child: Row(
              children: [
                // Cancel button (X)
                GestureDetector(
                  onTap: _cancelSettingsPanel,
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.close, color: Colors.white.withOpacity(0.8), size: 20),
                  ),
                ),
                const Spacer(),
                // Title
                Text(
                  _selectedTool == 'text' ? 'Text Editor' : 'Adjust',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                // Done button (checkmark)
                GestureDetector(
                  onTap: _confirmSettingsPanel,
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: AppTheme.primary.withOpacity(0.4), blurRadius: 8)],
                    ),
                    child: const Icon(Icons.check, color: Colors.white, size: 22),
                  ),
                ),
              ],
            ),
          ),
          
          // Content based on selected tool
          if (_selectedTool == 'text')
            _buildTextSettingsContent()
          else if (_selectedTool == 'adjust')
            _buildAdjustSettingsContent(),
        ],
      ),
    );
  }

  void _cancelSettingsPanel() {
    setState(() {
      _selectedTool = 'edit';
      _selectedTextId = null;
    });
  }

  void _confirmSettingsPanel() {
    setState(() {
      _selectedTool = 'edit';
    });
    _showSnackBar('Changes applied');
  }

  Widget _buildTextSettingsContent() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Add text button if no text selected
        if (_selectedTextId == null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: GestureDetector(
              onTap: _addTextOverlay,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.primary.withOpacity(0.4)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add, color: AppTheme.primary, size: 20),
                    SizedBox(width: 8),
                    Text('Add Text', style: TextStyle(color: AppTheme.primary, fontSize: 15, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
        
        // Tab bar for text options
        TabBar(
          controller: _textTabController,
          isScrollable: true,
          indicatorColor: AppTheme.primary,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white.withOpacity(0.5),
          indicatorSize: TabBarIndicatorSize.label,
          labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          tabs: const [
            Tab(icon: Icon(Icons.edit_note, size: 18), text: 'Input'),
            Tab(icon: Icon(Icons.font_download_outlined, size: 18), text: 'Font'),
            Tab(icon: Icon(Icons.style_outlined, size: 18), text: 'Style'),
            Tab(icon: Icon(Icons.square_outlined, size: 18), text: 'Background'),
            Tab(icon: Icon(Icons.format_align_center, size: 18), text: 'Align'),
          ],
        ),
        
        // Tab content
        SizedBox(
          height: 140,
          child: _selectedTextId == null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.text_fields, size: 32, color: Colors.white.withOpacity(0.3)),
                      const SizedBox(height: 8),
                      Text(
                        'Select or add text',
                        style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13),
                      ),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _textTabController,
                  children: [
                    _buildTextInputTab(),
                    _buildFontTab(),
                    _buildStyleTab(),
                    _buildBackgroundTab(),
                    _buildAlignmentTab(),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildAdjustSettingsContent() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Reset button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              GestureDetector(
                onTap: _resetAllAdjustments,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.primary.withOpacity(0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.refresh, size: 14, color: AppTheme.primary),
                      const SizedBox(width: 6),
                      Text('Reset', style: TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        // Sliders
        SizedBox(
          height: 180,
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
            itemCount: _adjustmentTools.length,
            itemBuilder: (context, index) {
              final tool = _adjustmentTools[index];
              return _buildAdjustmentSlider(tool);
            },
          ),
        ),
      ],
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
                if (tool.id != 'adjust' && tool.id != 'text') {
                  _showSnackBar('${tool.name} coming soon');
                }
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

  Widget _buildTextPanel() {
    return Container(
      height: 280,
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0A),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
      ),
      child: Column(
        children: [
          // Header with back button and add text
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 12, 8, 8),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => setState(() => _selectedTool = 'edit'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.arrow_back, size: 16, color: Colors.white.withOpacity(0.8)),
                        const SizedBox(width: 6),
                        Text(
                          'Back',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.8),
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                const Text(
                  'Text Editor',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: _addTextOverlay,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.add, size: 16, color: AppTheme.primary),
                        SizedBox(width: 4),
                        Text(
                          'Add',
                          style: TextStyle(
                            color: AppTheme.primary,
                            fontSize: 13,
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
          
          // Tab bar
          TabBar(
            controller: _textTabController,
            isScrollable: true,
            indicatorColor: AppTheme.primary,
            labelColor: Colors.white,
            unselectedLabelColor: Colors.white.withOpacity(0.5),
            indicatorSize: TabBarIndicatorSize.label,
            labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            tabs: const [
              Tab(icon: Icon(Icons.edit_note, size: 18), text: 'Input'),
              Tab(icon: Icon(Icons.font_download_outlined, size: 18), text: 'Font'),
              Tab(icon: Icon(Icons.style_outlined, size: 18), text: 'Style'),
              Tab(icon: Icon(Icons.square_outlined, size: 18), text: 'Background'),
              Tab(icon: Icon(Icons.format_align_center, size: 18), text: 'Align'),
            ],
          ),
          
          // Tab content
          Expanded(
            child: _selectedTextId == null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.text_fields, size: 40, color: Colors.white.withOpacity(0.3)),
                        const SizedBox(height: 8),
                        Text(
                          'Add text to get started',
                          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14),
                        ),
                      ],
                    ),
                  )
                : TabBarView(
                    controller: _textTabController,
                    children: [
                      _buildTextInputTab(),
                      _buildFontTab(),
                      _buildStyleTab(),
                      _buildBackgroundTab(),
                      _buildAlignmentTab(),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextInputTab() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          TextField(
            controller: _textInputController,
            style: const TextStyle(color: Colors.white),
            maxLines: 3,
            decoration: InputDecoration(
              hintText: 'Enter your text...',
              hintStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
              filled: true,
              fillColor: Colors.white.withOpacity(0.1),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppTheme.primary, width: 2),
              ),
            ),
            onChanged: (value) {
              _updateSelectedText((t) => t.text = value);
            },
          ),
          const SizedBox(height: 16),
          if (_selectedTextId != null)
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () {
                      if (_selectedTextId != null) {
                        _deleteTextOverlay(_selectedTextId!);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.delete_outline, color: Colors.red, size: 18),
                          SizedBox(width: 8),
                          Text('Delete Text', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildFontTab() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Select Font', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
          const SizedBox(height: 12),
          SizedBox(
            height: 70,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _availableFonts.length,
              itemBuilder: (context, index) {
                final font = _availableFonts[index];
                final isSelected = _selectedTextOverlay?.fontFamily == font;
                return GestureDetector(
                  onTap: () => _updateSelectedText((t) => t.fontFamily = font),
                  child: Container(
                    width: 80,
                    margin: const EdgeInsets.only(right: 12),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primary.withOpacity(0.2) : Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: isSelected ? Border.all(color: AppTheme.primary, width: 2) : null,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          'Aa',
                          style: TextStyle(
                            color: isSelected ? AppTheme.primary : Colors.white,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          font,
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.7),
                            fontSize: 9,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStyleTab() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Color picker
          Text('Text Color', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
          const SizedBox(height: 8),
          SizedBox(
            height: 40,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: _availableColors.length,
              itemBuilder: (context, index) {
                final color = _availableColors[index];
                final isSelected = _selectedTextOverlay?.textColor == color;
                return GestureDetector(
                  onTap: () => _updateSelectedText((t) => t.textColor = color),
                  child: Container(
                    width: 36,
                    height: 36,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: color,
                      shape: BoxShape.circle,
                      border: isSelected 
                          ? Border.all(color: AppTheme.primary, width: 3)
                          : Border.all(color: Colors.white.withOpacity(0.3), width: 1),
                      boxShadow: isSelected
                          ? [BoxShadow(color: color.withOpacity(0.5), blurRadius: 8)]
                          : null,
                    ),
                    child: isSelected
                        ? const Icon(Icons.check, color: Colors.black, size: 18)
                        : null,
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          
          // Font size slider
          Row(
            children: [
              Text('Font Size', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
              const Spacer(),
              Text(
                '${(_selectedTextOverlay?.fontSize ?? 24).toInt()}',
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          Slider(
            value: _selectedTextOverlay?.fontSize ?? 24,
            min: 12,
            max: 72,
            activeColor: AppTheme.primary,
            inactiveColor: Colors.white.withOpacity(0.2),
            onChanged: (value) => _updateSelectedText((t) => t.fontSize = value),
          ),
        ],
      ),
    );
  }

  Widget _buildBackgroundTab() {
    final overlay = _selectedTextOverlay;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Toggle background
          Row(
            children: [
              Text('Enable Background', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
              const Spacer(),
              Switch(
                value: overlay?.hasBackground ?? false,
                activeColor: AppTheme.primary,
                onChanged: (value) => _updateSelectedText((t) => t.hasBackground = value),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          if (overlay?.hasBackground ?? false) ...[
            // Background color
            Text('Background Color', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
            const SizedBox(height: 8),
            SizedBox(
              height: 36,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _availableColors.length,
                itemBuilder: (context, index) {
                  final color = _availableColors[index];
                  final isSelected = overlay?.backgroundColor == color;
                  return GestureDetector(
                    onTap: () => _updateSelectedText((t) => t.backgroundColor = color),
                    child: Container(
                      width: 32,
                      height: 32,
                      margin: const EdgeInsets.only(right: 8),
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: isSelected ? Border.all(color: AppTheme.primary, width: 2) : null,
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
            
            // Opacity slider
            Row(
              children: [
                Text('Opacity', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
                const Spacer(),
                Text(
                  '${((overlay?.backgroundOpacity ?? 0.5) * 100).toInt()}%',
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
              ],
            ),
            Slider(
              value: overlay?.backgroundOpacity ?? 0.5,
              min: 0.1,
              max: 1.0,
              activeColor: AppTheme.primary,
              inactiveColor: Colors.white.withOpacity(0.2),
              onChanged: (value) => _updateSelectedText((t) => t.backgroundOpacity = value),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAlignmentTab() {
    final overlay = _selectedTextOverlay;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Text Alignment', style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildAlignmentButton(Icons.format_align_left, TextAlign.left, overlay?.alignment),
              _buildAlignmentButton(Icons.format_align_center, TextAlign.center, overlay?.alignment),
              _buildAlignmentButton(Icons.format_align_right, TextAlign.right, overlay?.alignment),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAlignmentButton(IconData icon, TextAlign alignment, TextAlign? currentAlignment) {
    final isSelected = currentAlignment == alignment;
    return GestureDetector(
      onTap: () => _updateSelectedText((t) => t.alignment = alignment),
      child: Container(
        width: 60,
        height: 60,
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withOpacity(0.2) : Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: isSelected ? Border.all(color: AppTheme.primary, width: 2) : null,
        ),
        child: Icon(
          icon,
          color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.7),
          size: 28,
        ),
      ),
    );
  }

  List<Widget> _buildTextOverlays(BoxConstraints constraints) {
    final currentTime = _videoController?.value.position.inSeconds.toDouble() ?? 0;
    
    return _textOverlays.where((overlay) {
      // Only show text if current time is within the overlay's time range
      return currentTime >= overlay.startTime && currentTime <= overlay.endTime;
    }).map((overlay) {
      final isSelected = overlay.id == _selectedTextId;
      
      return Positioned(
        left: constraints.maxWidth * overlay.position.dx - 75,
        top: constraints.maxHeight * overlay.position.dy - 25,
        child: GestureDetector(
          // Single tap: Select OR open inline editor if already selected
          onTap: () {
            if (isSelected) {
              // Already selected - open inline text editor
              _openInlineTextEditor(overlay);
            } else {
              // Select the text overlay
              _selectTextOverlay(overlay.id);
            }
          },
          // Double tap: Always open inline editor
          onDoubleTap: () => _openInlineTextEditor(overlay),
          // Pan for smooth dragging
          onPanUpdate: (details) {
            if (!_isTextEditorInline) {
              setState(() {
                final newX = (overlay.position.dx + details.delta.dx / constraints.maxWidth).clamp(0.05, 0.95);
                final newY = (overlay.position.dy + details.delta.dy / constraints.maxHeight).clamp(0.05, 0.95);
                overlay.position = Offset(newX, newY);
              });
            }
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            transform: Matrix4.identity()..scale(overlay.scale),
            transformAlignment: Alignment.center,
            decoration: BoxDecoration(
              color: overlay.hasBackground 
                  ? overlay.backgroundColor.withOpacity(overlay.backgroundOpacity)
                  : null,
              borderRadius: BorderRadius.circular(8),
              // Show bounding box only when selected
              border: isSelected 
                  ? Border.all(color: AppTheme.primary, width: 2)
                  : null,
              boxShadow: isSelected 
                  ? [BoxShadow(color: AppTheme.primary.withOpacity(0.3), blurRadius: 12)]
                  : null,
            ),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Text(
                  overlay.text,
                  style: TextStyle(
                    color: overlay.textColor,
                    fontSize: overlay.fontSize,
                    fontWeight: FontWeight.bold,
                    fontFamily: overlay.fontFamily,
                  ),
                  textAlign: overlay.alignment,
                ),
                // Selection handles - only when selected
                if (isSelected) ...[
                  // Delete button (top-right)
                  Positioned(
                    top: -24,
                    right: -24,
                    child: GestureDetector(
                      onTap: () => _deleteTextOverlay(overlay.id),
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: Colors.red.withOpacity(0.4), blurRadius: 8)],
                        ),
                        child: const Icon(Icons.close, color: Colors.white, size: 16),
                      ),
                    ),
                  ),
                  // Edit button (top-left) - opens inline editor
                  Positioned(
                    top: -24,
                    left: -24,
                    child: GestureDetector(
                      onTap: () => _openInlineTextEditor(overlay),
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: AppTheme.primary.withOpacity(0.4), blurRadius: 8)],
                        ),
                        child: const Icon(Icons.edit, color: Colors.white, size: 16),
                      ),
                    ),
                  ),
                  // Scale handle (bottom-right corner)
                  Positioned(
                    bottom: -16,
                    right: -16,
                    child: GestureDetector(
                      onPanUpdate: (details) {
                        setState(() {
                          final scaleDelta = 1 + (details.delta.dx + details.delta.dy) * 0.005;
                          overlay.scale = (overlay.scale * scaleDelta).clamp(0.5, 3.0);
                        });
                      },
                      child: Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppTheme.primary, width: 2),
                        ),
                        child: const Icon(Icons.open_in_full, color: AppTheme.primary, size: 12),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }).toList();
  }

  // Open inline text editor dialog
  void _openInlineTextEditor(TextOverlay overlay) {
    _textInputController.text = overlay.text;
    showDialog(
      context: context,
      barrierColor: Colors.black54,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Edit Text', style: TextStyle(color: Colors.white, fontSize: 16)),
        content: TextField(
          controller: _textInputController,
          autofocus: true,
          style: const TextStyle(color: Colors.white),
          maxLines: 3,
          decoration: InputDecoration(
            hintText: 'Enter text...',
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
            filled: true,
            fillColor: Colors.white.withOpacity(0.1),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppTheme.primary, width: 2),
            ),
          ),
          onChanged: (value) {
            setState(() {
              overlay.text = value;
            });
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel', style: TextStyle(color: Colors.white.withOpacity(0.7))),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                overlay.text = _textInputController.text;
              });
              Navigator.pop(context);
            },
            child: const Text('Done', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  // Dynamic bottom area that switches between timeline and settings panel
  Widget _buildDynamicBottomArea() {
    // Check if a settings panel should be shown
    final bool showSettingsPanel = _selectedTool == 'text' || _selectedTool == 'adjust';
    
    if (showSettingsPanel) {
      return _buildContextualSettingsPanel();
    } else {
      // Show normal timeline + toolbar
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildTimelineSection(),
          _buildBottomToolbar(),
        ],
      );
    }
  }

  // Contextual settings panel that overlays the timeline area
  Widget _buildContextualSettingsPanel() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0A),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header with Done (checkmark) and Cancel (X) buttons
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
            child: Row(
              children: [
                // Cancel button (X)
                GestureDetector(
                  onTap: _cancelSettingsPanel,
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.close, color: Colors.white.withOpacity(0.8), size: 20),
                  ),
                ),
                const Spacer(),
                // Title
                Text(
                  _selectedTool == 'text' ? 'Text Editor' : 'Adjust',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                // Done button (checkmark)
                GestureDetector(
                  onTap: _confirmSettingsPanel,
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: AppTheme.primary.withOpacity(0.4), blurRadius: 8)],
                    ),
                    child: const Icon(Icons.check, color: Colors.white, size: 22),
                  ),
                ),
              ],
            ),
          ),
          
          // Content based on selected tool
          if (_selectedTool == 'text')
            _buildTextSettingsContent()
          else if (_selectedTool == 'adjust')
            _buildAdjustSettingsContent(),
        ],
      ),
    );
  }

  void _cancelSettingsPanel() {
    setState(() {
      _selectedTool = 'edit';
      _selectedTextId = null;
    });
  }

  void _confirmSettingsPanel() {
    setState(() {
      _selectedTool = 'edit';
    });
    _showSnackBar('Changes applied');
  }

  Widget _buildTextSettingsContent() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Add text button if no text selected
        if (_selectedTextId == null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: GestureDetector(
              onTap: _addTextOverlay,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.primary.withOpacity(0.4)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.add, color: AppTheme.primary, size: 20),
                    SizedBox(width: 8),
                    Text('Add Text', style: TextStyle(color: AppTheme.primary, fontSize: 15, fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ),
          ),
        
        // Tab bar for text options
        TabBar(
          controller: _textTabController,
          isScrollable: true,
          indicatorColor: AppTheme.primary,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white.withOpacity(0.5),
          indicatorSize: TabBarIndicatorSize.label,
          labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          tabs: const [
            Tab(icon: Icon(Icons.edit_note, size: 18), text: 'Input'),
            Tab(icon: Icon(Icons.font_download_outlined, size: 18), text: 'Font'),
            Tab(icon: Icon(Icons.style_outlined, size: 18), text: 'Style'),
            Tab(icon: Icon(Icons.square_outlined, size: 18), text: 'Background'),
            Tab(icon: Icon(Icons.format_align_center, size: 18), text: 'Align'),
          ],
        ),
        
        // Tab content
        SizedBox(
          height: 140,
          child: _selectedTextId == null
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.text_fields, size: 32, color: Colors.white.withOpacity(0.3)),
                      const SizedBox(height: 8),
                      Text(
                        'Select or add text',
                        style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13),
                      ),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _textTabController,
                  children: [
                    _buildTextInputTab(),
                    _buildFontTab(),
                    _buildStyleTab(),
                    _buildBackgroundTab(),
                    _buildAlignmentTab(),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildAdjustSettingsContent() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Reset button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              GestureDetector(
                onTap: _resetAllAdjustments,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.primary.withOpacity(0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.refresh, size: 14, color: AppTheme.primary),
                      const SizedBox(width: 6),
                      Text('Reset', style: TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        // Sliders
        SizedBox(
          height: 180,
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
            itemCount: _adjustmentTools.length,
            itemBuilder: (context, index) {
              final tool = _adjustmentTools[index];
              return _buildAdjustmentSlider(tool);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildAdjustPanel() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0A),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header with back button and reset
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 12, 8, 8),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => setState(() => _selectedTool = 'edit'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.arrow_back, size: 16, color: Colors.white.withOpacity(0.8)),
                        const SizedBox(width: 6),
                        Text(
                          'Back',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.8),
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  'Adjust',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: _resetAllAdjustments,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.primary.withOpacity(0.4)),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.refresh, size: 16, color: AppTheme.primary),
                        const SizedBox(width: 6),
                        Text(
                          'Reset',
                          style: TextStyle(
                            color: AppTheme.primary,
                            fontSize: 13,
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
          
          // Adjustment sliders
          SizedBox(
            height: 200,
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              itemCount: _adjustmentTools.length,
              itemBuilder: (context, index) {
                final tool = _adjustmentTools[index];
                return _buildAdjustmentSlider(tool);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAdjustmentSlider(AdjustmentTool tool) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                tool.icon,
                size: 18,
                color: tool.value != 0 ? AppTheme.primary : Colors.white.withOpacity(0.6),
              ),
              const SizedBox(width: 10),
              Text(
                tool.name,
                style: TextStyle(
                  color: tool.value != 0 ? Colors.white : Colors.white.withOpacity(0.7),
                  fontSize: 13,
                  fontWeight: tool.value != 0 ? FontWeight.w600 : FontWeight.normal,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: tool.value != 0 
                      ? AppTheme.primary.withOpacity(0.15)
                      : Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  tool.value >= 0 ? '+${(tool.value * 100).toInt()}' : '${(tool.value * 100).toInt()}',
                  style: TextStyle(
                    color: tool.value != 0 ? AppTheme.primary : Colors.white.withOpacity(0.6),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SliderTheme(
            data: SliderThemeData(
              activeTrackColor: AppTheme.primary,
              inactiveTrackColor: Colors.white.withOpacity(0.1),
              thumbColor: Colors.white,
              overlayColor: AppTheme.primary.withOpacity(0.2),
              trackHeight: 4,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
              overlayShape: const RoundSliderOverlayShape(overlayRadius: 16),
            ),
            child: Slider(
              value: tool.value,
              min: -1.0,
              max: 1.0,
              onChanged: tool.onChanged,
            ),
          ),
        ],
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

/// Custom painter for audio waveform with filled bars
class _AudioWaveformPainter extends CustomPainter {
  final Color color;
  final Color backgroundColor;
  
  _AudioWaveformPainter({
    required this.color,
    required this.backgroundColor,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    final barPaint = Paint()
      ..color = color
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    
    final bgPaint = Paint()
      ..color = backgroundColor;
    
    // Fill background
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), bgPaint);
    
    final centerY = size.height / 2;
    final barCount = (size.width / 4).toInt(); // More bars for denser waveform
    final spacing = size.width / barCount;
    
    for (int i = 0; i < barCount; i++) {
      // Create a pseudo-random but consistent waveform pattern
      final seed1 = (i * 0.7 + 0.5);
      final seed2 = (i * 0.3 + 1.2);
      final combinedSeed = (seed1.abs() % 1) * 0.5 + (seed2.abs() % 1) * 0.5;
      final height = (0.15 + combinedSeed * 0.7) * size.height * 0.85;
      final halfHeight = height / 2;
      
      final x = i * spacing + spacing / 2;
      
      canvas.drawLine(
        Offset(x, centerY - halfHeight),
        Offset(x, centerY + halfHeight),
        barPaint,
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

/// Full-screen video dialog that stays within the mobile frame
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
  bool _isDragging = false;

  @override
  void initState() {
    super.initState();
    _scheduleHideControls();
  }

  void _scheduleHideControls() {
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted && widget.videoController.value.isPlaying && !_isDragging) {
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

  void _seekToPosition(double progress) {
    final duration = widget.videoController.value.duration;
    final newPosition = Duration(
      milliseconds: (duration.inMilliseconds * progress).round(),
    );
    widget.videoController.seekTo(newPosition);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: GestureDetector(
          onTap: _toggleControls,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Full-screen video centered
              Center(
                child: AspectRatio(
                  aspectRatio: widget.videoController.value.aspectRatio,
                  child: VideoPlayer(widget.videoController),
                ),
              ),
              
              // Floating close button at top right
              Positioned(
                top: 16,
                right: 16,
                child: AnimatedOpacity(
                  opacity: _showControls ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 200),
                  child: GestureDetector(
                    onTap: widget.onClose,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white.withOpacity(0.2),
                          width: 1,
                        ),
                      ),
                      child: const Icon(
                        Icons.close,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                  ),
                ),
              ),
              
              // Bottom control bar
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: AnimatedOpacity(
                  opacity: _showControls ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 200),
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.transparent,
                          Colors.black.withOpacity(0.7),
                          Colors.black.withOpacity(0.9),
                        ],
                        stops: const [0.0, 0.4, 1.0],
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(16, 32, 16, 16),
                      child: ValueListenableBuilder<VideoPlayerValue>(
                        valueListenable: widget.videoController,
                        builder: (context, value, child) {
                          final progress = value.duration.inMilliseconds > 0
                              ? value.position.inMilliseconds / value.duration.inMilliseconds
                              : 0.0;
                          
                          return Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Seek bar
                              GestureDetector(
                                onHorizontalDragStart: (_) {
                                  setState(() => _isDragging = true);
                                },
                                onHorizontalDragUpdate: (details) {
                                  final RenderBox box = context.findRenderObject() as RenderBox;
                                  final localX = details.localPosition.dx;
                                  final width = box.size.width - 32; // Account for padding
                                  final seekProgress = (localX / width).clamp(0.0, 1.0);
                                  _seekToPosition(seekProgress);
                                },
                                onHorizontalDragEnd: (_) {
                                  setState(() => _isDragging = false);
                                  _scheduleHideControls();
                                },
                                onTapUp: (details) {
                                  final RenderBox box = context.findRenderObject() as RenderBox;
                                  final localX = details.localPosition.dx - 16; // Account for padding
                                  final width = box.size.width - 32;
                                  final seekProgress = (localX / width).clamp(0.0, 1.0);
                                  _seekToPosition(seekProgress);
                                },
                                child: Container(
                                  height: 24,
                                  alignment: Alignment.center,
                                  child: Stack(
                                    alignment: Alignment.centerLeft,
                                    children: [
                                      // Background track
                                      Container(
                                        height: 4,
                                        decoration: BoxDecoration(
                                          color: Colors.white.withOpacity(0.3),
                                          borderRadius: BorderRadius.circular(2),
                                        ),
                                      ),
                                      // Progress track
                                      FractionallySizedBox(
                                        widthFactor: progress.clamp(0.0, 1.0),
                                        child: Container(
                                          height: 4,
                                          decoration: BoxDecoration(
                                            color: Colors.white,
                                            borderRadius: BorderRadius.circular(2),
                                          ),
                                        ),
                                      ),
                                      // Seek thumb
                                      Positioned(
                                        left: (MediaQuery.of(context).size.width - 32) * progress.clamp(0.0, 1.0) - 6,
                                        child: Container(
                                          width: 12,
                                          height: 12,
                                          decoration: BoxDecoration(
                                            color: Colors.white,
                                            shape: BoxShape.circle,
                                            boxShadow: [
                                              BoxShadow(
                                                color: Colors.black.withOpacity(0.3),
                                                blurRadius: 4,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              
                              const SizedBox(height: 16),
                              
                              // Control row: Time | Play/Pause | Duration
                              Row(
                                children: [
                                  // Current time
                                  SizedBox(
                                    width: 60,
                                    child: Text(
                                      _formatDuration(value.position),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 13,
                                        fontFamily: 'monospace',
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                  
                                  const Spacer(),
                                  
                                  // Large central play/pause button
                                  GestureDetector(
                                    onTap: _togglePlayPause,
                                    child: Container(
                                      width: 56,
                                      height: 56,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withOpacity(0.15),
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: Colors.white.withOpacity(0.3),
                                          width: 2,
                                        ),
                                      ),
                                      child: Icon(
                                        value.isPlaying
                                            ? Icons.pause_rounded
                                            : Icons.play_arrow_rounded,
                                        color: Colors.white,
                                        size: 32,
                                      ),
                                    ),
                                  ),
                                  
                                  const Spacer(),
                                  
                                  // Total duration
                                  SizedBox(
                                    width: 60,
                                    child: Text(
                                      _formatDuration(value.duration),
                                      textAlign: TextAlign.right,
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.6),
                                        fontSize: 13,
                                        fontFamily: 'monospace',
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Data class for adjustment tool configuration
class AdjustmentTool {
  final String id;
  final String name;
  final IconData icon;
  final double value;
  final ValueChanged<double> onChanged;

  const AdjustmentTool({
    required this.id,
    required this.name,
    required this.icon,
    required this.value,
    required this.onChanged,
  });
}
