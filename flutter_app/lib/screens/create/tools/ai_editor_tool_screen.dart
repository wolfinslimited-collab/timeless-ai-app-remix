import 'dart:io';
import 'dart:typed_data';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:video_player/video_player.dart';
import 'package:path_provider/path_provider.dart';
import 'package:audioplayers/audioplayers.dart';
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
  String filePath;
  double startTime;
  double endTime;
  double volume;
  int trackIndex;
  AudioPlayer? player;
  Duration? duration;
  
  AudioLayer({
    required this.id,
    required this.name,
    required this.filePath,
    this.startTime = 0,
    this.endTime = 30,
    this.volume = 1.0,
    this.trackIndex = 0,
    this.player,
    this.duration,
  });
  
  void dispose() {
    player?.dispose();
  }
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

/// Caption/Subtitle layer data model
class CaptionLayer {
  String id;
  String text;
  double startTime;
  double endTime;
  
  CaptionLayer({
    required this.id,
    this.text = 'Caption',
    this.startTime = 0,
    this.endTime = 3,
  });
}

/// Video clip data model for multi-clip timeline
class VideoClip {
  String id;
  String url;
  double duration; // Total source duration
  double startTime; // Position on timeline (auto-calculated when appending)
  double inPoint; // Trim in point (0 = start of clip)
  double outPoint; // Trim out point (duration = end of clip)
  List<Uint8List>? thumbnails; // Array of thumbnail image bytes
  
  VideoClip({
    required this.id,
    required this.url,
    required this.duration,
    this.startTime = 0,
    double? inPoint,
    double? outPoint,
    this.thumbnails,
  }) : inPoint = inPoint ?? 0,
       outPoint = outPoint ?? duration;
  
  /// Get the trimmed duration (what's visible on timeline)
  double get trimmedDuration => outPoint - inPoint;
}

/// Effect layer data model
class EffectLayer {
  String id;
  String effectId;
  String name;
  String category;
  String icon;
  double intensity;
  double startTime;
  double endTime;
  
  EffectLayer({
    required this.id,
    required this.effectId,
    required this.name,
    this.category = 'Basic',
    this.icon = '✨',
    this.intensity = 0.7,
    this.startTime = 0,
    this.endTime = 3,
  });
}

/// Effect preset definition
class EffectPreset {
  final String id;
  final String name;
  final String category;
  final String icon;
  
  const EffectPreset({
    required this.id,
    required this.name,
    required this.category,
    required this.icon,
  });
}

/// Layer type enum for track management
enum LayerType { text, audio, sticker, caption, effect }

/// Timeline state snapshot for undo/redo functionality
class EditorStateSnapshot {
  final List<VideoClipSnapshot> videoClips;
  final List<TextOverlaySnapshot> textOverlays;
  final List<AudioLayerSnapshot> audioLayers;
  final List<CaptionLayerSnapshot> captionLayers;
  final List<EffectLayerSnapshot> effectLayers;
  final DateTime timestamp;
  
  EditorStateSnapshot({
    required this.videoClips,
    required this.textOverlays,
    required this.audioLayers,
    required this.captionLayers,
    required this.effectLayers,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();
}

/// Immutable snapshot of VideoClip for history
class VideoClipSnapshot {
  final String id;
  final String url;
  final double duration;
  final double startTime;
  final double inPoint;
  final double outPoint;
  
  VideoClipSnapshot({
    required this.id,
    required this.url,
    required this.duration,
    required this.startTime,
    required this.inPoint,
    required this.outPoint,
  });
  
  factory VideoClipSnapshot.from(VideoClip clip) => VideoClipSnapshot(
    id: clip.id,
    url: clip.url,
    duration: clip.duration,
    startTime: clip.startTime,
    inPoint: clip.inPoint,
    outPoint: clip.outPoint,
  );
  
  VideoClip toClip() => VideoClip(
    id: id,
    url: url,
    duration: duration,
    startTime: startTime,
    inPoint: inPoint,
    outPoint: outPoint,
  );
}

/// Immutable snapshot of TextOverlay for history
class TextOverlaySnapshot {
  final String id;
  final String text;
  final Offset position;
  final double fontSize;
  final Color textColor;
  final String fontFamily;
  final TextAlign alignment;
  final bool hasBackground;
  final Color backgroundColor;
  final double backgroundOpacity;
  final double startTime;
  final double endTime;
  final double scale;
  final int trackIndex;
  
  TextOverlaySnapshot({
    required this.id,
    required this.text,
    required this.position,
    required this.fontSize,
    required this.textColor,
    required this.fontFamily,
    required this.alignment,
    required this.hasBackground,
    required this.backgroundColor,
    required this.backgroundOpacity,
    required this.startTime,
    required this.endTime,
    required this.scale,
    required this.trackIndex,
  });
  
  factory TextOverlaySnapshot.from(TextOverlay overlay) => TextOverlaySnapshot(
    id: overlay.id,
    text: overlay.text,
    position: overlay.position,
    fontSize: overlay.fontSize,
    textColor: overlay.textColor,
    fontFamily: overlay.fontFamily,
    alignment: overlay.alignment,
    hasBackground: overlay.hasBackground,
    backgroundColor: overlay.backgroundColor,
    backgroundOpacity: overlay.backgroundOpacity,
    startTime: overlay.startTime,
    endTime: overlay.endTime,
    scale: overlay.scale,
    trackIndex: overlay.trackIndex,
  );
  
  TextOverlay toOverlay() => TextOverlay(
    id: id,
    text: text,
    position: position,
    fontSize: fontSize,
    textColor: textColor,
    fontFamily: fontFamily,
    alignment: alignment,
    hasBackground: hasBackground,
    backgroundColor: backgroundColor,
    backgroundOpacity: backgroundOpacity,
    startTime: startTime,
    endTime: endTime,
    scale: scale,
    trackIndex: trackIndex,
  );
}

/// Immutable snapshot of AudioLayer for history (without AudioPlayer reference)
class AudioLayerSnapshot {
  final String id;
  final String name;
  final String filePath;
  final double startTime;
  final double endTime;
  final double volume;
  final int trackIndex;
  
  AudioLayerSnapshot({
    required this.id,
    required this.name,
    required this.filePath,
    required this.startTime,
    required this.endTime,
    required this.volume,
    required this.trackIndex,
  });
  
  factory AudioLayerSnapshot.from(AudioLayer layer) => AudioLayerSnapshot(
    id: layer.id,
    name: layer.name,
    filePath: layer.filePath,
    startTime: layer.startTime,
    endTime: layer.endTime,
    volume: layer.volume,
    trackIndex: layer.trackIndex,
  );
}

/// Immutable snapshot of CaptionLayer for history
class CaptionLayerSnapshot {
  final String id;
  final String text;
  final double startTime;
  final double endTime;
  
  CaptionLayerSnapshot({
    required this.id,
    required this.text,
    required this.startTime,
    required this.endTime,
  });
  
  factory CaptionLayerSnapshot.from(CaptionLayer layer) => CaptionLayerSnapshot(
    id: layer.id,
    text: layer.text,
    startTime: layer.startTime,
    endTime: layer.endTime,
  );
  
  CaptionLayer toLayer() => CaptionLayer(
    id: id,
    text: text,
    startTime: startTime,
    endTime: endTime,
  );
}

/// Immutable snapshot of EffectLayer for history
class EffectLayerSnapshot {
  final String id;
  final String effectId;
  final String name;
  final String category;
  final String icon;
  final double intensity;
  final double startTime;
  final double endTime;
  
  EffectLayerSnapshot({
    required this.id,
    required this.effectId,
    required this.name,
    required this.category,
    required this.icon,
    required this.intensity,
    required this.startTime,
    required this.endTime,
  });
  
  factory EffectLayerSnapshot.from(EffectLayer layer) => EffectLayerSnapshot(
    id: layer.id,
    effectId: layer.effectId,
    name: layer.name,
    category: layer.category,
    icon: layer.icon,
    intensity: layer.intensity,
    startTime: layer.startTime,
    endTime: layer.endTime,
  );
  
  EffectLayer toLayer() => EffectLayer(
    id: id,
    effectId: effectId,
    name: name,
    category: category,
    icon: icon,
    intensity: intensity,
    startTime: startTime,
    endTime: endTime,
  );
}

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
  // Export settings removed - coming soon

  // Timeline Sync Engine - Global Constants
  static const double _pixelsPerSecond = 80.0; // Master time-to-pixel ratio
  static const double _thumbnailHeight = 80.0; // Increased for better quality
  
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
  
  // Audio layer state
  List<AudioLayer> _audioLayers = [];
  String? _selectedAudioId;
  bool _isImportingAudio = false;
  
  // Caption/Subtitle layer state
  List<CaptionLayer> _captionLayers = [];
  String? _selectedCaptionId;
  bool _isGeneratingCaptions = false;
  
  // Effect layer state
  List<EffectLayer> _effectLayers = [];
  String? _selectedEffectId;
  
  // Available effect presets - expanded with filter effects
  final List<EffectPreset> _effectPresets = const [
    EffectPreset(id: 'bw', name: 'B&W', category: 'Filter', icon: '🖤'),
    EffectPreset(id: 'sepia', name: 'Sepia', category: 'Filter', icon: '🟤'),
    EffectPreset(id: 'vintage', name: 'Vintage', category: 'Filter', icon: '📷'),
    EffectPreset(id: 'blur', name: 'Blur', category: 'Basic', icon: '🌫️'),
    EffectPreset(id: 'glow', name: 'Glow', category: 'Basic', icon: '✨'),
    EffectPreset(id: 'vignette', name: 'Vignette', category: 'Basic', icon: '🔲'),
    EffectPreset(id: 'shake', name: 'Shake', category: 'Motion', icon: '📳'),
    EffectPreset(id: 'zoom-pulse', name: 'Zoom Pulse', category: 'Motion', icon: '🔍'),
    EffectPreset(id: 'film-grain', name: 'Film Grain', category: 'Cinematic', icon: '🎞️'),
    EffectPreset(id: 'vhs', name: 'VHS', category: 'Retro', icon: '📼'),
    EffectPreset(id: 'glitch', name: 'Glitch', category: 'Retro', icon: '⚡'),
    EffectPreset(id: 'chromatic', name: 'Chromatic', category: 'Retro', icon: '🌈'),
    EffectPreset(id: 'letterbox', name: 'Letterbox', category: 'Cinematic', icon: '🎬'),
    EffectPreset(id: 'light-leak', name: 'Light Leak', category: 'Cinematic', icon: '☀️'),
    EffectPreset(id: 'flash', name: 'Flash', category: 'Motion', icon: '💥'),
  ];
  
  // Multi-clip video support
  List<VideoClip> _videoClips = [];
  String? _selectedClipId;
  
  // Video clip trimming state
  String? _trimmingClipId;
  bool _isTrimmingClipStart = false;
  bool _isTrimmingClipEnd = false;
  
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
  
  // Video clip editing panel state
  String? _editingClipId;
  double _clipSpeed = 1.0;
  double _clipVolume = 1.0;
  bool _isEditToolbarMode = false; // Edit toolbar replaces main toolbar
  
  // Adjust panel state
  String _adjustPanelTab = 'adjust'; // 'filters' or 'adjust'
  String _adjustSubTab = 'customize'; // 'smart' or 'customize'
  String _selectedAdjustmentId = 'brightness';
  
  // Stickers, Aspect Ratio, Background state
  String _selectedAspectRatio = 'original';
  Color _backgroundColor = Colors.black;
  double _backgroundBlur = 0.0;
  String? _backgroundImage;
  String _backgroundTab = 'color'; // 'color', 'image', 'blur'
  String _selectedStickerCategory = 'emoji';
  
  // Video position within frame (for drag repositioning)
  Offset _videoPosition = Offset.zero;
  bool _isDraggingVideo = false;
  Offset _dragStartPosition = Offset.zero;
  Offset _dragStartVideoPosition = Offset.zero;
  
  // Sticker presets
  final List<Map<String, dynamic>> _stickerCategories = [
    {'id': 'emoji', 'name': 'Emoji', 'stickers': ['😀', '😂', '🥰', '😎', '🔥', '💯', '⭐', '❤️', '👍', '🎉', '✨', '🚀']},
    {'id': 'shapes', 'name': 'Shapes', 'stickers': ['⬤', '◆', '★', '▲', '◯', '□', '♦', '♠', '♥', '♣', '●', '■']},
    {'id': 'arrows', 'name': 'Arrows', 'stickers': ['→', '←', '↑', '↓', '↗', '↘', '↙', '↖', '⇒', '⇐', '⇑', '⇓']},
  ];
  
  // Extended aspect ratio presets
  final List<Map<String, dynamic>> _aspectRatioPresets = [
    {'id': 'original', 'label': 'Original', 'width': 16, 'height': 9},
    {'id': '9:16', 'label': '9:16', 'width': 9, 'height': 16},
    {'id': '16:9', 'label': '16:9', 'width': 16, 'height': 9},
    {'id': '1:1', 'label': '1:1', 'width': 1, 'height': 1},
    {'id': '4:3', 'label': '4:3', 'width': 4, 'height': 3},
    {'id': '3:4', 'label': '3:4', 'width': 3, 'height': 4},
    {'id': '5.8"', 'label': '5.8"', 'width': 9, 'height': 19.5},
    {'id': '128:27', 'label': '128:27', 'width': 128, 'height': 27},
    {'id': '2:1', 'label': '2:1', 'width': 2, 'height': 1},
    {'id': '2.35:1', 'label': '2.35:1', 'width': 2.35, 'height': 1},
    {'id': '1.85:1', 'label': '1.85:1', 'width': 1.85, 'height': 1},
  ];
  
  // Text menu mode state - activated by clicking "+ Add text" row
  bool _isTextMenuMode = false;
  String _textMenuTab = 'add-text'; // 'add-text', 'auto-captions', 'stickers', 'draw'
  
  // Audio menu mode state - activated by clicking "Audio" tool
  bool _isAudioMenuMode = false;
  
  // Edit menu mode state - activated by clicking "Edit" tool
  bool _isEditMenuMode = false;
  
  // Effects menu mode state - activated by clicking "Effects" tool
  bool _isEffectsMenuMode = false;
  
  // Background color presets
  final List<Color> _backgroundColorPresets = [
    const Color(0xFF000000), const Color(0xFFFFFFFF), const Color(0xFF1A1A1A), const Color(0xFF2D2D2D),
    const Color(0xFFFF6B6B), const Color(0xFF4ECDC4), const Color(0xFF45B7D1), const Color(0xFF96CEB4),
    const Color(0xFFFFEAA7), const Color(0xFFDDA0DD), const Color(0xFF98D8C8), const Color(0xFFF7DC6F),
  ];
  
  // Undo/Redo history stacks
  static const int _maxHistoryLength = 50;
  final List<EditorStateSnapshot> _undoStack = [];
  final List<EditorStateSnapshot> _redoStack = [];
  bool _isRestoringState = false; // Prevent recursive history pushes during restore
  
  // Calculate total timeline duration from all clips (using trimmed durations)
  double get _totalTimelineDuration {
    if (_videoClips.isNotEmpty) {
      return _videoClips.fold(0.0, (sum, clip) => sum + clip.trimmedDuration);
    }
    return _videoController?.value.duration.inSeconds.toDouble() ?? 10.0;
  }
  
  /// Recalculate clip start times after a trim operation
  void _recalculateClipStartTimes() {
    double currentStart = 0;
    for (final clip in _videoClips) {
      clip.startTime = currentStart;
      currentStart += clip.trimmedDuration;
    }
  }

  // Quality options removed - coming soon

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
    EditorTool(id: 'stickers', name: 'Stickers', icon: Icons.emoji_emotions_outlined),
    EditorTool(id: 'aspect', name: 'Aspect', icon: Icons.aspect_ratio),
    EditorTool(id: 'background', name: 'Background', icon: Icons.format_paint_outlined),
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
    _saveStateToHistory(); // Save before resetting
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
  
  // ============================================
  // UNDO/REDO HISTORY MANAGEMENT
  // ============================================
  
  /// Create a snapshot of current editor state
  EditorStateSnapshot _createStateSnapshot() {
    return EditorStateSnapshot(
      videoClips: _videoClips.map((c) => VideoClipSnapshot.from(c)).toList(),
      textOverlays: _textOverlays.map((t) => TextOverlaySnapshot.from(t)).toList(),
      audioLayers: _audioLayers.map((a) => AudioLayerSnapshot.from(a)).toList(),
      captionLayers: _captionLayers.map((c) => CaptionLayerSnapshot.from(c)).toList(),
      effectLayers: _effectLayers.map((e) => EffectLayerSnapshot.from(e)).toList(),
    );
  }
  
  /// Save current state to undo history (call BEFORE making changes)
  void _saveStateToHistory() {
    if (_isRestoringState) return; // Don't save during restore operations
    
    final snapshot = _createStateSnapshot();
    _undoStack.add(snapshot);
    
    // Limit stack size
    if (_undoStack.length > _maxHistoryLength) {
      _undoStack.removeAt(0);
    }
    
    // Clear redo stack when new action is performed
    _redoStack.clear();
  }
  
  /// Check if undo is available
  bool get _canUndo => _undoStack.isNotEmpty;
  
  /// Check if redo is available
  bool get _canRedo => _redoStack.isNotEmpty;
  
  /// Undo last action
  void _undo() {
    if (!_canUndo) {
      _showSnackBar('Nothing to undo');
      return;
    }
    
    // Save current state to redo stack before restoring
    _redoStack.add(_createStateSnapshot());
    
    // Pop and restore previous state
    final previousState = _undoStack.removeLast();
    _restoreState(previousState);
    
    _showSnackBar('Undo');
  }
  
  /// Redo last undone action
  void _redo() {
    if (!_canRedo) {
      _showSnackBar('Nothing to redo');
      return;
    }
    
    // Save current state to undo stack before restoring
    _undoStack.add(_createStateSnapshot());
    
    // Pop and restore redo state
    final redoState = _redoStack.removeLast();
    _restoreState(redoState);
    
    _showSnackBar('Redo');
  }
  
  /// Restore editor state from a snapshot
  void _restoreState(EditorStateSnapshot snapshot) {
    _isRestoringState = true;
    
    setState(() {
      // Restore video clips
      _videoClips = snapshot.videoClips.map((s) => s.toClip()).toList();
      _recalculateClipStartTimes();
      
      // Restore text overlays
      _textOverlays = snapshot.textOverlays.map((s) => s.toOverlay()).toList();
      
      // Restore audio layers (without disposing existing players - just update data)
      // Note: We preserve existing AudioPlayer references for layers that still exist
      final existingAudioMap = Map.fromEntries(
        _audioLayers.map((a) => MapEntry(a.id, a.player))
      );
      
      _audioLayers = snapshot.audioLayers.map((s) {
        final layer = AudioLayer(
          id: s.id,
          name: s.name,
          filePath: s.filePath,
          startTime: s.startTime,
          endTime: s.endTime,
          volume: s.volume,
          trackIndex: s.trackIndex,
          player: existingAudioMap[s.id], // Preserve existing player if any
        );
        return layer;
      }).toList();
      
      // Dispose players for removed audio layers
      for (final id in existingAudioMap.keys) {
        if (!_audioLayers.any((a) => a.id == id)) {
          existingAudioMap[id]?.dispose();
        }
      }
      
      // Restore caption layers
      _captionLayers = snapshot.captionLayers.map((s) => s.toLayer()).toList();
      
      // Restore effect layers
      _effectLayers = snapshot.effectLayers.map((s) => s.toLayer()).toList();
      
      // Clear selections
      _selectedClipId = null;
      _selectedTextId = null;
      _selectedAudioId = null;
      _selectedCaptionId = null;
      _selectedEffectId = null;
    });
    
    _isRestoringState = false;
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
      1, 0, 0, 0, tempR.toDouble(),
      0, 1, 0, 0, 0,
      0, 0, 1, 0, tempB.toDouble(),
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
    // Dispose all audio players
    for (final audio in _audioLayers) {
      audio.dispose();
    }
    super.dispose();
  }

  // ============================================
  // AUDIO LAYER FUNCTIONS
  // ============================================
  
  /// Import audio file from device
  Future<void> _importAudioFile() async {
    setState(() => _isImportingAudio = true);
    
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.audio,
        allowMultiple: false,
      );
      
      if (result != null && result.files.isNotEmpty) {
        _saveStateToHistory(); // Save state before adding audio
        final file = result.files.first;
        final filePath = file.path;
        
        if (filePath != null) {
          // Create audio player to get duration
          final player = AudioPlayer();
          
          // Load the audio file
          await player.setSourceDeviceFile(filePath);
          
          // Get duration (may need a small delay for loading)
          Duration? audioDuration;
          try {
            audioDuration = await player.getDuration();
          } catch (e) {
            debugPrint('Could not get audio duration: $e');
          }
          
          final videoDuration = _videoController?.value.duration.inSeconds.toDouble() ?? 30.0;
          final audioSeconds = audioDuration?.inSeconds.toDouble() ?? 30.0;
          
          final newAudio = AudioLayer(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            name: file.name,
            filePath: filePath,
            startTime: 0,
            endTime: math.min(audioSeconds, videoDuration),
            player: player,
            duration: audioDuration,
          );
          
          setState(() {
            _audioLayers.add(newAudio);
            _selectedAudioId = newAudio.id;
          });
          
          _showSnackBar('Audio imported: ${file.name}');
        }
      }
    } catch (e) {
      debugPrint('Error importing audio: $e');
      _showSnackBar('Failed to import audio');
    } finally {
      setState(() => _isImportingAudio = false);
    }
  }
  
  // ============================================
  // UNIFIED PLAYBACK CONTROLLER
  // Multi-layer synchronization engine
  // ============================================
  
  /// Current playhead position on timeline (in seconds)
  double _currentTimelinePosition = 0.0;
  
  /// Track which clip is currently active
  int _activeClipIndex = 0;
  
  /// Map of clip controllers for multi-clip playback
  final Map<String, VideoPlayerController> _clipControllers = {};
  
  /// Get the active clip and local time based on timeline position
  ({VideoClip clip, double localTime})? _getActiveClipAtTime(double timelineTime) {
    for (int i = 0; i < _videoClips.length; i++) {
      final clip = _videoClips[i];
      final clipEnd = clip.startTime + clip.trimmedDuration;
      if (timelineTime >= clip.startTime && timelineTime < clipEnd) {
        final localTime = clip.inPoint + (timelineTime - clip.startTime);
        return (clip: clip, localTime: localTime);
      }
    }
    // Return last clip if past all clips
    if (_videoClips.isNotEmpty) {
      final lastClip = _videoClips.last;
      return (clip: lastClip, localTime: lastClip.outPoint);
    }
    return null;
  }
  
  /// Sync all layers to the current timeline position
  void _syncAllLayersToTime(double timelineTime) {
    _currentTimelinePosition = timelineTime;
    
    // 1. Sync video - seek to correct position within active clip
    final activeResult = _getActiveClipAtTime(timelineTime);
    if (activeResult != null && _videoController != null && _isVideoInitialized) {
      final localTime = activeResult.localTime;
      final newPosition = Duration(milliseconds: (localTime * 1000).toInt());
      
      // Only seek if position has drifted significantly
      final currentPos = _videoController!.value.position.inMilliseconds / 1000.0;
      if ((currentPos - localTime).abs() > 0.1) {
        _videoController!.seekTo(newPosition);
      }
    }
    
    // 2. Sync audio layers
    _syncAudioLayersToTime(timelineTime);
    
    // Update UI
    if (mounted) {
      setState(() {});
    }
  }
  
  /// Sync audio playback with timeline position
  void _syncAudioLayersToTime(double timelineTime) {
    final isPlaying = _videoController?.value.isPlaying ?? false;
    
    for (final audio in _audioLayers) {
      if (audio.player == null) continue;
      
      // Check if current time is within audio layer's time range
      if (timelineTime >= audio.startTime && timelineTime <= audio.endTime) {
        final audioTime = timelineTime - audio.startTime;
        
        if (isPlaying) {
          // Play audio and seek to correct position
          audio.player!.seek(Duration(milliseconds: (audioTime * 1000).round()));
          audio.player!.resume();
        } else {
          audio.player!.pause();
        }
        
        // Apply volume
        audio.player!.setVolume(audio.volume);
      } else {
        // Outside range, pause
        audio.player!.pause();
      }
    }
  }
  
  /// Legacy sync function - now calls the unified sync
  void _syncAudioWithVideo() {
    if (_videoController == null || !_isVideoInitialized) return;
    final videoPosition = _videoController!.value.position.inMilliseconds / 1000.0;
    _syncAudioLayersToTime(videoPosition);
  }
  
  /// Unified play function - starts all active layers from current playhead position
  void _unifiedPlay() {
    if (_videoController == null || !_isVideoInitialized) return;
    
    // Sync all layers to current timeline position (playhead)
    _syncAllLayersToTime(_currentTimelinePosition);
    
    // Seek video to current playhead position before playing
    final activeResult = _getActiveClipAtTime(_currentTimelinePosition);
    if (activeResult != null) {
      final newPosition = Duration(milliseconds: (activeResult.localTime * 1000).toInt());
      _videoController!.seekTo(newPosition);
    }
    
    // Start video playback
    _videoController!.play();
    
    // Audio layers will start via the sync listener
  }
  
  /// Unified pause function - pauses all layers
  void _unifiedPause() {
    // Pause video
    _videoController?.pause();
    
    // Pause all audio layers
    for (final audio in _audioLayers) {
      audio.player?.pause();
    }
  }
  
  /// Unified toggle play/pause
  void _unifiedTogglePlayPause() {
    if (_videoController == null || !_isVideoInitialized) return;
    
    if (_videoController!.value.isPlaying) {
      _unifiedPause();
    } else {
      _unifiedPlay();
    }
  }
  
  /// Unified seek function - seeks all layers to timeline position
  void _unifiedSeekTo(double timelineSeconds) {
    final clampedTime = timelineSeconds.clamp(0.0, _totalTimelineDuration);
    _currentTimelinePosition = clampedTime;
    
    // Sync all layers to new position
    _syncAllLayersToTime(clampedTime);
    
    // Seek video
    if (_videoController != null && _isVideoInitialized) {
      final activeResult = _getActiveClipAtTime(clampedTime);
      if (activeResult != null) {
        final newPosition = Duration(milliseconds: (activeResult.localTime * 1000).toInt());
        _videoController!.seekTo(newPosition);
      }
    }
  }
  
  /// Delete audio layer
  void _deleteAudioLayer(String id) {
    _saveStateToHistory();
    setState(() {
      final index = _audioLayers.indexWhere((a) => a.id == id);
      if (index != -1) {
        _audioLayers[index].dispose();
        _audioLayers.removeAt(index);
      }
      if (_selectedAudioId == id) {
        _selectedAudioId = null;
      }
    });
  }
  
  /// Select audio layer
  void _selectAudioLayer(String? id) {
    setState(() {
      _selectedAudioId = id;
    });
  }
  
  /// Update audio volume
  void _updateAudioVolume(String id, double volume) {
    final index = _audioLayers.indexWhere((a) => a.id == id);
    if (index != -1) {
      setState(() {
        _audioLayers[index].volume = volume.clamp(0.0, 1.0);
        _audioLayers[index].player?.setVolume(volume);
      });
    }
  }

  AudioLayer? get _selectedAudioLayer {
    if (_selectedAudioId == null) return null;
    try {
      return _audioLayers.firstWhere((a) => a.id == _selectedAudioId);
    } catch (_) {
      return null;
    }
  }

  // Text overlay functions
  void _addTextOverlay() {
    _saveStateToHistory();
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
    _saveStateToHistory();
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
  // CAPTION/SUBTITLE FUNCTIONS
  // ============================================
  
  CaptionLayer? get _selectedCaptionLayer {
    if (_selectedCaptionId == null) return null;
    try {
      return _captionLayers.firstWhere((c) => c.id == _selectedCaptionId);
    } catch (_) {
      return null;
    }
  }
  
  /// Add a new caption layer at current playhead position
  void _addCaptionLayer() {
    _saveStateToHistory();
    final duration = _videoController?.value.duration.inSeconds.toDouble() ?? 10.0;
    final currentTime = _videoController?.value.position.inMilliseconds.toDouble() ?? 0;
    final startTime = currentTime / 1000.0;
    
    final newCaption = CaptionLayer(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      text: 'New caption',
      startTime: startTime,
      endTime: math.min(startTime + 3.0, duration),
    );
    
    setState(() {
      _captionLayers.add(newCaption);
      _selectedCaptionId = newCaption.id;
      _selectedTool = 'captions';
    });
  }
  
  /// Generate auto-captions from video audio
  Future<void> _generateAutoCaptions() async {
    if (_videoController == null || !_isVideoInitialized) {
      _showSnackBar('Please load a video first');
      return;
    }
    
    _saveStateToHistory();
    setState(() => _isGeneratingCaptions = true);
    _showSnackBar('Generating captions...');
    
    try {
      // Mock caption generation - in production this would call a transcription API
      await Future.delayed(const Duration(seconds: 2));
      
      final duration = _videoController!.value.duration.inSeconds.toDouble();
      const captionDuration = 3.0; // seconds per caption
      final numCaptions = (duration / captionDuration).ceil();
      
      final newCaptions = <CaptionLayer>[];
      for (int i = 0; i < numCaptions; i++) {
        newCaptions.add(CaptionLayer(
          id: '${DateTime.now().millisecondsSinceEpoch}_$i',
          text: 'Caption ${i + 1}',
          startTime: i * captionDuration,
          endTime: math.min((i + 1) * captionDuration, duration),
        ));
      }
      
      setState(() {
        _captionLayers = newCaptions;
        _selectedTool = 'captions';
      });
      
      _showSnackBar('$numCaptions captions generated');
    } catch (e) {
      _showSnackBar('Failed to generate captions');
    } finally {
      setState(() => _isGeneratingCaptions = false);
    }
  }
  
  /// Delete a caption layer
  void _deleteCaptionLayer(String id) {
    _saveStateToHistory();
    setState(() {
      _captionLayers.removeWhere((c) => c.id == id);
      if (_selectedCaptionId == id) {
        _selectedCaptionId = null;
      }
    });
  }
  
  /// Select a caption layer
  void _selectCaptionLayer(String? id) {
    setState(() {
      _selectedCaptionId = id;
    });
  }
  
  /// Update caption text
  void _updateCaptionText(String id, String newText) {
    setState(() {
      final index = _captionLayers.indexWhere((c) => c.id == id);
      if (index != -1) {
        _captionLayers[index].text = newText;
      }
    });
  }

  // ============================================
  // MULTI-CLIP VIDEO FUNCTIONS
  // ============================================
  
  /// Add a new video clip to the end of the timeline
  void _addVideoClip(String url, double clipDuration) {
    final lastClip = _videoClips.isNotEmpty ? _videoClips.last : null;
    final startTime = lastClip != null ? lastClip.startTime + lastClip.duration : 0.0;
    
    final newClip = VideoClip(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      url: url,
      duration: clipDuration,
      startTime: startTime,
      thumbnails: [],
    );
    
    setState(() {
      _videoClips.add(newClip);
    });
    
    // Extract thumbnails for this clip
    _extractClipThumbnails(newClip.id, url, clipDuration);
    
    _showSnackBar('Video clip added to timeline');
  }
  
  /// Initialize first clip when primary video is loaded
  void _initializeFirstClip() {
    if (_videoUrl != null && _videoController != null && _isVideoInitialized && _videoClips.isEmpty) {
      final duration = _videoController!.value.duration.inSeconds.toDouble();
      setState(() {
        _videoClips.add(VideoClip(
          id: 'primary',
          url: _videoUrl!,
          duration: duration,
          startTime: 0,
          thumbnails: [],
        ));
      });
      
      // Extract thumbnails for primary clip
      _extractClipThumbnails('primary', _videoUrl!, duration);
    }
  }
  
  /// Delete a video clip from the timeline
  void _deleteVideoClip(String clipId) {
    _saveStateToHistory();
    setState(() {
      _videoClips.removeWhere((c) => c.id == clipId);
      _recalculateClipStartTimes();
      if (_selectedClipId == clipId) {
        _selectedClipId = null;
      }
      if (_editingClipId == clipId) {
        _editingClipId = null;
      }
    });
    Navigator.of(context).pop(); // Close bottom sheet if open
    _showSnackBar('Clip deleted');
  }
  
  /// Open clip editing panel
  void _openClipEditPanel(String clipId) {
    setState(() {
      _editingClipId = clipId;
      _selectedClipId = clipId;
      _clipSpeed = 1.0;
      _clipVolume = 1.0;
    });
    _showClipEditBottomSheet(clipId);
  }
  
  /// Split video clip at playhead position
  void _splitClipAtPlayhead(String clipId) {
    final clip = _videoClips.firstWhere((c) => c.id == clipId, orElse: () => _videoClips.first);
    final currentPos = _videoController?.value.position.inMilliseconds.toDouble() ?? 0;
    final currentTime = currentPos / 1000.0;
    
    // Calculate local time within the clip
    final localTime = currentTime - clip.startTime;
    if (localTime <= 0.5 || localTime >= clip.trimmedDuration - 0.5) {
      Navigator.of(context).pop();
      _showSnackBar('Move playhead to middle of clip');
      return;
    }
    
    _saveStateToHistory();
    
    // Create two clips from the split
    final splitPoint = clip.inPoint + localTime;
    final firstClip = VideoClip(
      id: clip.id,
      url: clip.url,
      duration: clip.duration,
      startTime: clip.startTime,
      inPoint: clip.inPoint,
      outPoint: splitPoint,
    );
    final secondClip = VideoClip(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      url: clip.url,
      duration: clip.duration,
      startTime: 0, // Will be recalculated
      inPoint: splitPoint,
      outPoint: clip.outPoint,
    );
    
    setState(() {
      final index = _videoClips.indexWhere((c) => c.id == clipId);
      if (index != -1) {
        _videoClips.removeAt(index);
        _videoClips.insert(index, firstClip);
        _videoClips.insert(index + 1, secondClip);
        _recalculateClipStartTimes();
      }
    });
    
    Navigator.of(context).pop();
    _showSnackBar('Clip split');
  }
  
  /// Duplicate video clip
  void _duplicateClip(String clipId) {
    final clip = _videoClips.firstWhere((c) => c.id == clipId, orElse: () => _videoClips.first);
    
    _saveStateToHistory();
    
    final duplicatedClip = VideoClip(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      url: clip.url,
      duration: clip.duration,
      startTime: 0, // Will be recalculated
      inPoint: clip.inPoint,
      outPoint: clip.outPoint,
    );
    
    setState(() {
      final index = _videoClips.indexWhere((c) => c.id == clipId);
      if (index != -1) {
        _videoClips.insert(index + 1, duplicatedClip);
        _recalculateClipStartTimes();
      }
    });
    
    Navigator.of(context).pop();
    _showSnackBar('Clip duplicated');
  }
  
  /// Apply clip speed to video
  void _applyClipSpeed() {
    _videoController?.setPlaybackSpeed(_clipSpeed);
    _showSnackBar('Speed set to ${_clipSpeed.toStringAsFixed(1)}x');
  }
  
  /// Apply clip volume to video
  void _applyClipVolume() {
    _videoController?.setVolume(_clipVolume);
    _showSnackBar('Volume set to ${(_clipVolume * 100).round()}%');
  }
  
  /// Show animations bottom sheet
  void _showAnimationsBottomSheet() {
    final animationPresets = [
      {'id': 'fade_in', 'name': 'Fade In', 'icon': '🌅'},
      {'id': 'fade_out', 'name': 'Fade Out', 'icon': '🌆'},
      {'id': 'zoom_in', 'name': 'Zoom In', 'icon': '🔍'},
      {'id': 'zoom_out', 'name': 'Zoom Out', 'icon': '🔭'},
      {'id': 'slide_left', 'name': 'Slide Left', 'icon': '⬅️'},
      {'id': 'slide_right', 'name': 'Slide Right', 'icon': '➡️'},
      {'id': 'rotate', 'name': 'Rotate', 'icon': '🔄'},
      {'id': 'bounce', 'name': 'Bounce', 'icon': '⬆️'},
    ];
    
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A1A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.only(top: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Animations',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Wrap(
                spacing: 12,
                runSpacing: 12,
                children: animationPresets.map((anim) => GestureDetector(
                  onTap: () {
                    Navigator.pop(context);
                    _showSnackBar('${anim['name']} animation applied');
                  },
                  child: Container(
                    width: 80,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Column(
                      children: [
                        Text(anim['icon']!, style: const TextStyle(fontSize: 24)),
                        const SizedBox(height: 6),
                        Text(
                          anim['name']!,
                          style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.8)),
                        ),
                      ],
                    ),
                  ),
                )).toList(),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
  
  /// Show beats sync bottom sheet
  void _showBeatsBottomSheet() {
    final beatPresets = [
      {'id': 'auto_sync', 'name': 'Auto Sync', 'desc': 'Sync cuts to beat'},
      {'id': 'bass_drop', 'name': 'Bass Drop', 'desc': 'Emphasize bass hits'},
      {'id': 'rhythm', 'name': 'Rhythm', 'desc': 'Match rhythm pattern'},
      {'id': 'tempo', 'name': 'Tempo', 'desc': 'Match video tempo'},
    ];
    
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A1A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.only(top: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Beat Sync',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            ...beatPresets.map((beat) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: GestureDetector(
                onTap: () {
                  Navigator.pop(context);
                  _showSnackBar('${beat['name']} applied');
                },
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Theme.of(context).primaryColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(Icons.waves, color: Theme.of(context).primaryColor, size: 24),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              beat['name']!,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              beat['desc']!,
                              style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            )),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
  
  /// Show crop bottom sheet
  void _showCropBottomSheet() {
    final cropPresets = [
      {'id': '16:9', 'name': '16:9', 'desc': 'Landscape'},
      {'id': '9:16', 'name': '9:16', 'desc': 'Portrait'},
      {'id': '1:1', 'name': '1:1', 'desc': 'Square'},
      {'id': '4:3', 'name': '4:3', 'desc': 'Standard'},
      {'id': '4:5', 'name': '4:5', 'desc': 'Instagram'},
      {'id': 'free', 'name': 'Free', 'desc': 'Custom'},
    ];
    
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A1A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.only(top: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Crop & Aspect Ratio',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Wrap(
                spacing: 12,
                runSpacing: 12,
                children: cropPresets.map((preset) => GestureDetector(
                  onTap: () {
                    Navigator.pop(context);
                    _showSnackBar('Crop: ${preset['name']} applied');
                  },
                  child: Container(
                    width: 100,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Column(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.crop, color: Colors.white, size: 20),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          preset['name']!,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          preset['desc']!,
                          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                )).toList(),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
  
  /// Show clip edit bottom sheet
  void _showClipEditBottomSheet(String clipId) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A1A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      isScrollControlled: true,
      builder: (context) => _buildClipEditSheet(clipId),
    );
  }
  
  /// Build clip edit sheet content
  Widget _buildClipEditSheet(String clipId) {
    return StatefulBuilder(
      builder: (context, setSheetState) {
        final clipEditTools = [
          _ClipEditTool(id: 'split', name: 'Split', icon: Icons.content_cut, onTap: () => _splitClipAtPlayhead(clipId)),
          _ClipEditTool(id: 'volume', name: 'Volume', icon: Icons.volume_up, onTap: () { Navigator.pop(context); _applyClipVolume(); }),
          _ClipEditTool(id: 'animations', name: 'Animations', icon: Icons.auto_awesome, onTap: () { Navigator.pop(context); _showAnimationsBottomSheet(); }),
          _ClipEditTool(id: 'effects', name: 'Effects', icon: Icons.star_outline, onTap: () { Navigator.pop(context); setState(() => _selectedTool = 'effects'); }),
          _ClipEditTool(id: 'delete', name: 'Delete', icon: Icons.delete_outline, onTap: () => _deleteVideoClip(clipId), isDestructive: true),
          _ClipEditTool(id: 'speed', name: 'Speed', icon: Icons.speed, onTap: () { Navigator.pop(context); _applyClipSpeed(); }),
          _ClipEditTool(id: 'beats', name: 'Beats', icon: Icons.waves, onTap: () { Navigator.pop(context); _showBeatsBottomSheet(); }),
          _ClipEditTool(id: 'crop', name: 'Crop', icon: Icons.crop, onTap: () { Navigator.pop(context); _showCropBottomSheet(); }),
          _ClipEditTool(id: 'duplicate', name: 'Duplicate', icon: Icons.copy, onTap: () => _duplicateClip(clipId)),
          _ClipEditTool(id: 'replace', name: 'Replace', icon: Icons.swap_horiz, onTap: () { Navigator.pop(context); _pickAndLoadVideo(); }),
          _ClipEditTool(id: 'overlay', name: 'Overlay', icon: Icons.layers_outlined, onTap: () { Navigator.pop(context); setState(() => _selectedTool = 'overlay'); }),
          _ClipEditTool(id: 'adjust', name: 'Adjust', icon: Icons.tune, onTap: () { Navigator.pop(context); setState(() => _selectedTool = 'adjust'); }),
          _ClipEditTool(id: 'filter', name: 'Filter', icon: Icons.auto_fix_high, onTap: () { Navigator.pop(context); setState(() => _selectedTool = 'filters'); }),
        ];
        
        return Container(
          padding: const EdgeInsets.only(top: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              
              // Title
              const Text(
                'Edit Clip',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              
              // Speed slider
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Speed',
                          style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                        ),
                        Text(
                          '${_clipSpeed.toStringAsFixed(1)}x',
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        activeTrackColor: Theme.of(context).primaryColor,
                        inactiveTrackColor: Colors.white.withOpacity(0.1),
                        thumbColor: Theme.of(context).primaryColor,
                        trackHeight: 4,
                      ),
                      child: Slider(
                        value: _clipSpeed,
                        min: 0.25,
                        max: 2.0,
                        onChanged: (value) {
                          setSheetState(() => _clipSpeed = value);
                          setState(() => _clipSpeed = value);
                        },
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('0.25x', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 10)),
                        Text('1x', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 10)),
                        Text('2x', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 10)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              
              // Volume slider
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.volume_up, size: 16, color: Colors.white.withOpacity(0.7)),
                            const SizedBox(width: 8),
                            Text(
                              'Clip Volume',
                              style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                            ),
                          ],
                        ),
                        Text(
                          '${(_clipVolume * 100).round()}%',
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        activeTrackColor: Theme.of(context).primaryColor,
                        inactiveTrackColor: Colors.white.withOpacity(0.1),
                        thumbColor: Theme.of(context).primaryColor,
                        trackHeight: 4,
                      ),
                      child: Slider(
                        value: _clipVolume,
                        min: 0.0,
                        max: 1.0,
                        onChanged: (value) {
                          setSheetState(() => _clipVolume = value);
                          setState(() => _clipVolume = value);
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              
              // Tools grid (scrollable horizontally)
              SizedBox(
                height: 90,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: clipEditTools.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, index) {
                    final tool = clipEditTools[index];
                    return GestureDetector(
                      onTap: tool.onTap,
                      child: Container(
                        width: 70,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: tool.isDestructive
                              ? Colors.red.withOpacity(0.15)
                              : Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: tool.isDestructive
                                ? Colors.red.withOpacity(0.3)
                                : Colors.white.withOpacity(0.1),
                          ),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: tool.isDestructive
                                    ? Colors.red.withOpacity(0.2)
                                    : Colors.white.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                tool.icon,
                                size: 20,
                                color: tool.isDestructive ? Colors.red : Colors.white,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              tool.name,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                                color: tool.isDestructive
                                    ? Colors.red
                                    : Colors.white.withOpacity(0.8),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }
  
  /// Delete a text overlay from the timeline
  void _deleteTextFromTimeline(String id) {
    _saveStateToHistory();
    setState(() {
      _textOverlays.removeWhere((t) => t.id == id);
      if (_selectedTextId == id) {
        _selectedTextId = null;
      }
    });
    _showSnackBar('Text deleted');
  }
  
  /// Delete a caption layer from the timeline
  void _deleteCaptionFromTimeline(String id) {
    _saveStateToHistory();
    setState(() {
      _captionLayers.removeWhere((c) => c.id == id);
      if (_selectedCaptionId == id) {
        _selectedCaptionId = null;
      }
    });
    _showSnackBar('Caption deleted');
  }
  
  /// Delete an effect layer from the timeline
  void _deleteEffectFromTimeline(String id) {
    _saveStateToHistory();
    setState(() {
      _effectLayers.removeWhere((e) => e.id == id);
      if (_selectedEffectId == id) {
        _selectedEffectId = null;
      }
    });
    _showSnackBar('Effect deleted');
  }
  
  /// Delete an audio layer from the timeline
  void _deleteAudioFromTimeline(String id) {
    _saveStateToHistory();
    setState(() {
      final index = _audioLayers.indexWhere((a) => a.id == id);
      if (index != -1) {
        _audioLayers[index].dispose();
        _audioLayers.removeAt(index);
      }
      if (_selectedAudioId == id) {
        _selectedAudioId = null;
      }
    });
    _showSnackBar('Audio deleted');
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
  
  /// Get total timeline width based on video duration (supports multi-clip)
  double get _totalTimelineWidth {
    return _totalTimelineDuration * _pixelsPerSecond;
  }

  void _onTimelineScroll() {
    // Only process manual scrolling (not auto-scroll from video playback)
    if (!_isUserScrolling || _isAutoScrolling) return;
    if (_videoController == null || !_isVideoInitialized) return;
    
    // PAUSE all layers immediately when user starts manual scrubbing
    if (_videoController!.value.isPlaying) {
      _unifiedPause();
    }
    
    final scrollOffset = _timelineScrollController.offset;
    
    // Calculate exact time position under the center playhead
    final timeUnderPlayhead = _scrollToTime(scrollOffset);
    final clampedTime = timeUnderPlayhead.clamp(0.0, _totalTimelineDuration);
    
    // Update timeline position and sync all layers
    _currentTimelinePosition = clampedTime;
    _syncAllLayersToTime(clampedTime);
  }

  void _onScrollEnd() {
    // Called when user stops scrolling - sync all layers to exact playhead position
    if (_videoController == null || !_isVideoInitialized) return;
    if (!_timelineScrollController.hasClients) return;
    
    final scrollOffset = _timelineScrollController.offset;
    final timeUnderPlayhead = _scrollToTime(scrollOffset);
    final clampedTime = timeUnderPlayhead.clamp(0.0, _totalTimelineDuration);
    
    // Use unified seek to sync all layers
    _unifiedSeekTo(clampedTime);
  }

  void _onVideoPositionChanged() {
    // Don't auto-scroll if user is manually scrolling
    if (_isUserScrolling || _videoController == null || !_isVideoInitialized) return;
    if (!_timelineScrollController.hasClients) return;
    
    final positionSeconds = _videoController!.value.position.inMilliseconds / 1000.0;
    
    // Update current timeline position
    _currentTimelinePosition = positionSeconds;
    
    // Check if video reached the end - stop playback (no loop)
    if (positionSeconds >= _totalTimelineDuration - 0.1 && _videoController!.value.isPlaying) {
      _unifiedPause();
      _currentTimelinePosition = _totalTimelineDuration;
      if (mounted) {
        setState(() {});
      }
      return;
    }
    
    // Sync all layers (audio, text visibility, etc.) to current time
    _syncAudioLayersToTime(positionSeconds);
    
    // Only auto-scroll during playback
    if (!_videoController!.value.isPlaying) return;
    
    final targetScroll = _timeToScroll(positionSeconds);
    
    // Use flag to prevent feedback loops
    _isAutoScrolling = true;
    
    // Scroll timeline to keep current frame under center playhead
    _timelineScrollController.jumpTo(
      targetScroll.clamp(0.0, _timelineScrollController.position.maxScrollExtent)
    );
    
    _isAutoScrolling = false;
    
    // Trigger rebuild for text/caption/effect visibility
    if (mounted) {
      setState(() {});
    }
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

  /// Pick video directly from device - no upload, fully local processing
  Future<void> _pickLocalVideo() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        allowMultiple: false,
      );
      
      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final filePath = file.path;
        
        if (filePath != null) {
          setState(() {
            _isUploading = true;
            _uploadProgress = 0.3;
            _videoFile = File(filePath);
          });
          
          // Initialize video directly from local file - no server upload
          await _initializeVideoFromLocalFile(filePath);
        }
      }
    } catch (e) {
      debugPrint('Error picking video: $e');
      _showSnackBar('Failed to load video: $e');
      setState(() => _isUploading = false);
    }
  }
  
  /// Initialize video player from local file path (no network required)
  Future<void> _initializeVideoFromLocalFile(String filePath) async {
    try {
      setState(() => _uploadProgress = 0.5);
      
      _videoController?.removeListener(_onVideoPositionChanged);
      _videoController?.dispose();
      
      // Use local file controller instead of network URL
      _videoController = VideoPlayerController.file(File(filePath));
      
      await _videoController!.initialize();
      _videoController!.setLooping(false); // Play once, no loop
      _videoController!.addListener(_onVideoPositionChanged);
      
      setState(() {
        _videoUrl = filePath; // Store local path
        _uploadProgress = 1.0;
        _isVideoInitialized = true;
        _isUploading = false;
      });
      
      // Initialize first video clip
      _initializeFirstClip();
      
      // Extract thumbnails from local file
      _extractThumbnails(filePath);
      
      _showSnackBar('Video loaded successfully');
    } catch (e) {
      debugPrint('Failed to initialize local video: $e');
      _showSnackBar('Failed to initialize video: $e');
      setState(() {
        _isUploading = false;
        _videoFile = null;
      });
    }
  }

  /// Add another video clip to the timeline from local device
  Future<void> _addLocalVideoClip() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        allowMultiple: false,
      );
      
      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final filePath = file.path;
        
        if (filePath != null) {
          // Create a temporary controller to get duration
          final tempController = VideoPlayerController.file(File(filePath));
          await tempController.initialize();
          final clipDuration = tempController.value.duration.inSeconds.toDouble();
          await tempController.dispose();
          
          // Add clip to timeline
          _addVideoClip(filePath, clipDuration);
        }
      }
    } catch (e) {
      debugPrint('Error adding video clip: $e');
      _showSnackBar('Failed to add video clip: $e');
    }
  }

  Future<void> _extractThumbnails(String videoUrl) async {
    if (_videoController == null || !_isVideoInitialized) return;
    
    // Thumbnails are now extracted per-clip via _extractClipThumbnails
    // This method is kept for backwards compatibility but defers to clip-based extraction
    if (_videoClips.isNotEmpty) {
      final primaryClip = _videoClips.firstWhere((c) => c.id == 'primary', orElse: () => _videoClips.first);
      if (primaryClip.thumbnails == null || primaryClip.thumbnails!.isEmpty) {
        await _extractClipThumbnails(primaryClip.id, videoUrl, primaryClip.duration);
      }
    }
  }
  
  /// Extract thumbnails for a specific video clip using the video controller
  Future<void> _extractClipThumbnails(String clipId, String videoPath, double clipDuration) async {
    if (!mounted) return;
    
    setState(() => _isExtractingThumbnails = true);
    
    try {
      // Create a temporary controller for thumbnail extraction
      final tempController = VideoPlayerController.file(File(videoPath));
      await tempController.initialize();
      
      final numThumbnails = math.min(15, (clipDuration * 2).ceil()); // Max 2 per second, up to 15
      final List<Uint8List> thumbnails = [];
      
      for (int i = 0; i < numThumbnails; i++) {
        if (!mounted) break;
        
        final time = Duration(milliseconds: ((i / numThumbnails) * clipDuration * 1000).toInt());
        await tempController.seekTo(time);
        await Future.delayed(const Duration(milliseconds: 100)); // Wait for seek
        
        // Note: VideoPlayer doesn't provide direct frame capture
        // We'll generate placeholder thumbnails with gradient colors based on position
        // In production, you'd use ffmpeg_kit_flutter or video_thumbnail package
        
        // For now, create a colored placeholder that varies with time
        // This gives visual variety on the timeline
        thumbnails.add(Uint8List(0)); // Empty bytes as placeholder marker
      }
      
      await tempController.dispose();
      
      // Update the clip with thumbnails
      if (mounted) {
        setState(() {
          final clipIndex = _videoClips.indexWhere((c) => c.id == clipId);
          if (clipIndex >= 0) {
            _videoClips[clipIndex].thumbnails = thumbnails;
          }
        });
      }
    } catch (e) {
      debugPrint('Failed to extract clip thumbnails: $e');
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
    if (_videoController == null || !_isVideoInitialized) return;
    // Use unified play/pause to sync all layers
    _unifiedTogglePlayPause();
    setState(() {});
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

  void _handleExport() {
    _showSnackBar('Coming soon!');
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
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.arrow_back, color: Colors.white, size: 16),
            ),
          ),
          const Spacer(),
          if (_isVideoInitialized) ...[
            // Export Button
            GestureDetector(
              onTap: _handleExport,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.primary, AppTheme.primary.withOpacity(0.8)],
                  ),
                  borderRadius: BorderRadius.circular(8),
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
                    Icon(Icons.file_upload_outlined, color: Colors.white, size: 14),
                    SizedBox(width: 4),
                    Text(
                      'Export',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
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
    
    // Open fullscreen dialog with total timeline duration
    final totalDuration = Duration(milliseconds: (_totalTimelineDuration * 1000).round());
    showDialog(
      context: context,
      barrierDismissible: false,
      useSafeArea: false,
      builder: (context) => _FullScreenVideoDialog(
        videoController: _videoController!,
        onClose: () => Navigator.of(context).pop(),
        totalDuration: totalDuration,
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
    // Calculate total duration from all clips for dynamic display
    final totalDuration = Duration(milliseconds: (_totalTimelineDuration * 1000).round());
    
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
          // Time counter - uses totalTimelineDuration for dynamic multi-clip support
          ValueListenableBuilder<VideoPlayerValue>(
            valueListenable: _videoController!,
            builder: (context, value, child) {
              return Text(
                '${_formatDuration(value.position)} / ${_formatDuration(totalDuration)}',
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
                onPressed: _canUndo ? _undo : null,
                icon: Icon(
                  Icons.undo, 
                  color: _canUndo 
                      ? Colors.white.withOpacity(0.9) 
                      : Colors.white.withOpacity(0.3), 
                  size: 20,
                ),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
              ),
              // Redo
              IconButton(
                onPressed: _canRedo ? _redo : null,
                icon: Icon(
                  Icons.redo, 
                  color: _canRedo 
                      ? Colors.white.withOpacity(0.9) 
                      : Colors.white.withOpacity(0.3), 
                  size: 20,
                ),
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
                      // Caption overlays at bottom of video
                      ..._buildCaptionOverlays(constraints),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      );
    }

    // Direct file picker - no popup, just tap to select local video
    return Center(
      child: GestureDetector(
        onTap: _pickLocalVideo,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 32, vertical: 80),
          padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 48),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: AppTheme.primary.withOpacity(0.3),
              width: 2,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.primary.withOpacity(0.3), AppTheme.primary.withOpacity(0.1)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Icon(Icons.folder_open_outlined, size: 40, color: AppTheme.primary),
              ),
              const SizedBox(height: 28),
              const Text(
                'Select Video',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Tap to pick from device',
                style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 15),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.lock_outline, color: Colors.green.shade400, size: 14),
                    const SizedBox(width: 6),
                    Text(
                      'Private • No upload',
                      style: TextStyle(color: Colors.green.shade400, fontSize: 12, fontWeight: FontWeight.w500),
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
    final duration = _totalTimelineDuration; // Use total duration for multi-clip support
    final trackWidth = _totalTimelineWidth; // duration * pixelsPerSecond
    
    // Fixed 50% padding for perfect playhead alignment at scroll limits
    final double halfScreenPadding = screenWidth * 0.5;
    
    // Total scrollable width: 50% + track + 50%
    final totalScrollWidth = halfScreenPadding + trackWidth + halfScreenPadding;
    
    // Calculate height based on tracks
    const baseHeight = 200.0;
    
    // Playhead positioned at center of screen
    final double playheadOffset = screenWidth / 2;
    
    return Container(
      height: baseHeight,
      color: const Color(0xFF0D0D0D),
      child: Stack(
        children: [
          // Scrollable timeline content (full width, no fixed controls)
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
                    _buildTimeRuler(halfScreenPadding),
                    const SizedBox(height: 4),
                    
                    // Video Track (filmstrip only) - supports multi-clip
                    _buildVideoTrackFilmstripOnly(halfScreenPadding, trackWidth),
                    const SizedBox(height: 6),
                    
                    // Audio Track (Green waveform layers)
                    _buildAudioTrack(halfScreenPadding, trackWidth, duration),
                    const SizedBox(height: 6),
                    
                    // Text Track (Purple/Yellow layers)
                    _buildTextTrack(halfScreenPadding, trackWidth, duration),
                    const SizedBox(height: 6),
                    
                    // Caption/Subtitle Track (Cyan layers)
                    _buildCaptionTrack(halfScreenPadding, trackWidth, duration),
                    const SizedBox(height: 6),
                    
                    // Effects Track (Amber/Gold layers)
                    _buildEffectsTrack(halfScreenPadding, trackWidth, duration),
                    const SizedBox(height: 6),
                    
                    // Add layer buttons row
                    _buildAddLayerRow(halfScreenPadding),
                  ],
                ),
              ),
            ),
          ),
          
          // Fixed Playhead at center of screen
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

  /// Build video track filmstrip only (no controls - they are fixed now) - supports multi-clip
  Widget _buildVideoTrackFilmstripOnly(double startPadding, double trackWidth) {
    return SizedBox(
      height: _thumbnailHeight + 8,
      child: Row(
        children: [
          // Left padding (half screen width)
          SizedBox(width: startPadding),
          
          // Video Track - Multi-clip filmstrip row
          _buildMultiClipFilmstrip(trackWidth),
          
          const SizedBox(width: 10),
          
          // Add clip button - now adds to end of timeline
          GestureDetector(
            onTap: () {
              // Show media picker to add another video clip
              _showMediaPickerSheet();
            },
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
          
          // Right padding (half screen width)
          SizedBox(width: startPadding),
        ],
      ),
    );
  }
  
  /// Build multi-clip filmstrip row - renders all video clips snapped together
  Widget _buildMultiClipFilmstrip(double trackWidth) {
    if (_videoClips.isEmpty) {
      // Fallback to single video filmstrip
      return _buildVideoTrackFilmstrip(trackWidth);
    }
    
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (int clipIndex = 0; clipIndex < _videoClips.length; clipIndex++)
          _buildSingleClipFilmstrip(
            _videoClips[clipIndex], 
            clipIndex, 
            clipIndex == 0, 
            clipIndex == _videoClips.length - 1,
          ),
      ],
    );
  }
  
  /// Build a single clip filmstrip segment with trim handles
  Widget _buildSingleClipFilmstrip(VideoClip clip, int clipIndex, bool isFirst, bool isLast) {
    final clipWidth = clip.trimmedDuration * _pixelsPerSecond;
    final thumbCount = (clipWidth / _thumbnailWidth).ceil().clamp(1, 100);
    final isSelected = clip.id == _selectedClipId;
    final isTrimming = clip.id == _trimmingClipId;
    
    const videoColor = Color(0xFFAA2222);
    
    return GestureDetector(
      onTap: () => setState(() => _selectedClipId = clip.id),
      child: Container(
        width: clipWidth,
        height: _thumbnailHeight + 4,
        decoration: BoxDecoration(
          color: const Color(0xFF2A1515),
          // Only round corners on first/last clips for seamless join
          borderRadius: BorderRadius.horizontal(
            left: isFirst ? const Radius.circular(8) : Radius.zero,
            right: isLast ? const Radius.circular(8) : Radius.zero,
          ),
          // Only show border when selected
          border: isSelected 
              ? Border.all(color: Colors.white, width: 2.5)
              : null,
          boxShadow: isSelected ? [
            BoxShadow(
              color: videoColor.withOpacity(0.5),
              blurRadius: 12,
            ),
          ] : null,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.horizontal(
            left: isFirst ? const Radius.circular(6) : Radius.zero,
            right: isLast ? const Radius.circular(6) : Radius.zero,
          ),
          child: Row(
            children: [
              // Left trim handle
              GestureDetector(
                onHorizontalDragStart: (_) {
                  _saveStateToHistory(); // Save state before trimming
                  setState(() {
                    _trimmingClipId = clip.id;
                    _isTrimmingClipStart = true;
                    _selectedClipId = clip.id;
                  });
                },
                onHorizontalDragUpdate: (details) {
                  final delta = details.primaryDelta ?? 0;
                  final timeDelta = delta / _pixelsPerSecond;
                  setState(() {
                    // Adjust in point - min 0, max outPoint - 0.5s
                    clip.inPoint = (clip.inPoint + timeDelta).clamp(0.0, clip.outPoint - 0.5);
                    _recalculateClipStartTimes();
                  });
                },
                onHorizontalDragEnd: (_) {
                  setState(() {
                    _trimmingClipId = null;
                    _isTrimmingClipStart = false;
                  });
                },
                child: Container(
                  width: 12,
                  decoration: BoxDecoration(
                    color: isSelected 
                        ? Colors.white.withOpacity(0.6) 
                        : videoColor.withOpacity(0.8),
                    borderRadius: isFirst 
                        ? const BorderRadius.only(
                            topLeft: Radius.circular(6),
                            bottomLeft: Radius.circular(6),
                          ) 
                        : null,
                  ),
                  child: Center(
                    child: Container(
                      width: 3,
                      height: 20,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(1.5),
                      ),
                    ),
                  ),
                ),
              ),
              
              // Thumbnails content area
              Expanded(
                child: Stack(
                  children: [
                    // Thumbnails row
                    ListView.builder(
                      scrollDirection: Axis.horizontal,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: thumbCount,
                      itemBuilder: (context, index) {
                        // Adjust thumbTime to account for inPoint
                        final thumbTime = clip.inPoint + (index / thumbCount) * clip.trimmedDuration;
                        
                        // Get thumbnail from clip's thumbnails array
                        final clipThumbnails = clip.thumbnails;
                        final hasThumbnails = clipThumbnails != null && clipThumbnails.isNotEmpty;
                        final thumbnailIndex = hasThumbnails 
                            ? (index * clipThumbnails.length / thumbCount).floor().clamp(0, clipThumbnails.length - 1)
                            : -1;
                        final thumbnail = thumbnailIndex >= 0 && clipThumbnails != null && thumbnailIndex < clipThumbnails.length 
                            ? clipThumbnails[thumbnailIndex] 
                            : null;
                        final hasValidThumbnail = thumbnail != null && thumbnail.isNotEmpty;
                        
                        // Generate a gradient color that varies based on position for visual variety
                        final gradientProgress = index / thumbCount;
                        final baseHue = 0.0; // Red hue for video
                        final saturation = 0.7 + (gradientProgress * 0.1);
                        final lightness = 0.15 + (math.sin(gradientProgress * math.pi) * 0.05);
                        
                        return Container(
                          width: _thumbnailWidth,
                          height: _thumbnailHeight,
                          decoration: BoxDecoration(
                            border: Border(
                              right: index < thumbCount - 1
                                  ? BorderSide(color: const Color(0xFF5A0000).withOpacity(0.4), width: 0.5)
                                  : BorderSide.none,
                            ),
                          ),
                          child: hasValidThumbnail
                              ? Image.memory(thumbnail, fit: BoxFit.cover, gaplessPlayback: true)
                              : Container(
                                  decoration: BoxDecoration(
                                    gradient: LinearGradient(
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                      colors: [
                                        HSLColor.fromAHSL(1.0, baseHue, saturation, lightness + 0.05).toColor(),
                                        HSLColor.fromAHSL(1.0, baseHue, saturation - 0.1, lightness).toColor(),
                                      ],
                                    ),
                                  ),
                                  child: Stack(
                                    children: [
                                      // Film grain effect
                                      Positioned.fill(
                                        child: Container(
                                          decoration: BoxDecoration(
                                            gradient: LinearGradient(
                                              begin: Alignment.topCenter,
                                              end: Alignment.bottomCenter,
                                              colors: [
                                                Colors.white.withOpacity(0.03),
                                                Colors.transparent,
                                                Colors.black.withOpacity(0.1),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                      // Timestamp
                                      Center(
                                        child: Text(
                                          '${thumbTime.toInt()}s',
                                          style: TextStyle(
                                            color: Colors.white.withOpacity(0.4),
                                            fontSize: 8,
                                            fontFamily: 'monospace',
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                        );
                      },
                    ),
                    
                    // Clip info overlay when selected
                    if (isSelected)
                      Positioned(
                        left: 4,
                        top: 2,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.6),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.videocam, size: 10, color: Colors.white.withOpacity(0.9)),
                              const SizedBox(width: 3),
                              Text(
                                '${clip.trimmedDuration.toStringAsFixed(1)}s',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 9,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    
                    // Edit button when selected
                    if (isSelected)
                      Positioned(
                        right: _videoClips.length > 1 ? 28 : 4,
                        top: 2,
                        child: GestureDetector(
                          onTap: () => _openClipEditPanel(clip.id),
                          child: Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: Theme.of(context).primaryColor.withOpacity(0.9),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.content_cut, size: 10, color: Colors.white),
                          ),
                        ),
                      ),
                    
                  ],
                ),
              ),
              
              // Right trim handle
              GestureDetector(
                onHorizontalDragStart: (_) {
                  _saveStateToHistory(); // Save state before trimming
                  setState(() {
                    _trimmingClipId = clip.id;
                    _isTrimmingClipEnd = true;
                    _selectedClipId = clip.id;
                  });
                },
                onHorizontalDragUpdate: (details) {
                  final delta = details.primaryDelta ?? 0;
                  final timeDelta = delta / _pixelsPerSecond;
                  setState(() {
                    // Adjust out point - min inPoint + 0.5s, max duration
                    clip.outPoint = (clip.outPoint + timeDelta).clamp(clip.inPoint + 0.5, clip.duration);
                    _recalculateClipStartTimes();
                  });
                },
                onHorizontalDragEnd: (_) {
                  setState(() {
                    _trimmingClipId = null;
                    _isTrimmingClipEnd = false;
                  });
                },
                child: Container(
                  width: 12,
                  decoration: BoxDecoration(
                    color: isSelected 
                        ? Colors.white.withOpacity(0.6) 
                        : videoColor.withOpacity(0.8),
                    borderRadius: isLast 
                        ? const BorderRadius.only(
                            topRight: Radius.circular(6),
                            bottomRight: Radius.circular(6),
                          ) 
                        : null,
                  ),
                  child: Center(
                    child: Container(
                      width: 3,
                      height: 20,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(1.5),
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

  /// Build filmstrip video track using ListView.builder with actual thumbnails
  Widget _buildVideoTrackFilmstrip(double trackWidth) {
    final duration = _videoController?.value.duration.inSeconds.toDouble() ?? 10.0;
    // Calculate how many thumbnails fit in the track
    final thumbCount = (trackWidth / _thumbnailWidth).ceil();
    
    return Container(
      width: trackWidth,
      height: _thumbnailHeight + 4,
      decoration: BoxDecoration(
        color: const Color(0xFF2A1515),
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
            
            // Calculate the time position for this frame
            final thumbTime = (index / thumbCount) * duration;
            
            return Container(
              width: _thumbnailWidth,
              height: _thumbnailHeight,
              decoration: BoxDecoration(
                border: Border(
                  right: index < thumbCount - 1
                      ? BorderSide(color: const Color(0xFF5A0000).withOpacity(0.4), width: 0.5)
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
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            const Color(0xFF8B0000).withOpacity(0.3),
                            const Color(0xFF5A0000).withOpacity(0.5),
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
                                  color: Colors.white.withOpacity(0.4),
                                ),
                              ),
                            )
                          : Center(
                              // Show time indicator while loading
                              child: Text(
                                '${thumbTime.toInt()}s',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.4),
                                  fontSize: 8,
                                  fontFamily: 'monospace',
                                ),
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
              _saveStateToHistory(); // Save state before trimming
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
                children: [
                  Icon(icon, size: 12, color: Colors.white.withOpacity(0.9)),
                  const SizedBox(width: 4),
                  Expanded(
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
                  // Delete button when selected
                  if (isSelected)
                    GestureDetector(
                      onTap: () => _deleteTextFromTimeline(overlay.id),
                      child: Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close, size: 10, color: Colors.white),
                      ),
                    ),
                ],
              ),
            ),
          ),
          
          // Right trim handle - uses pixelsPerSecond
          GestureDetector(
            onHorizontalDragStart: (_) {
              _saveStateToHistory(); // Save state before trimming
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
          
          // Add audio button
          GestureDetector(
            onTap: _isImportingAudio ? null : _importAudioFile,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF2A2A2A),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: Colors.white.withOpacity(0.15)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      color: const Color(0xFF3A3A3A),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: _isImportingAudio
                        ? const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(
                              strokeWidth: 1.5,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.add, size: 12, color: Colors.white),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'Add audio',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(width: 10),
          
          // Add text button
          GestureDetector(
            onTap: () {
              setState(() {
                _isTextMenuMode = true;
                _textMenuTab = 'add-text';
              });
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF2A2A2A),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: Colors.white.withOpacity(0.15)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      color: const Color(0xFF3A3A3A),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Icon(Icons.add, size: 12, color: Colors.white),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'Add text',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(width: 10),
          
          // Add effect button
          GestureDetector(
            onTap: () => setState(() => _selectedTool = 'effects'),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF2A2A2A),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.4)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 16,
                    height: 16,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withOpacity(0.3),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Icon(Icons.add, size: 12, color: Color(0xFFF59E0B)),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'Add effect',
                    style: TextStyle(
                      color: Color(0xFFF59E0B),
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
  
  /// Build audio track with waveform clips synchronized to pixelsPerSecond
  Widget _buildAudioTrack(double startPadding, double trackWidth, double duration) {
    if (_audioLayers.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return SizedBox(
      height: 44,
      child: Row(
        children: [
          SizedBox(width: startPadding),
          
          SizedBox(
            width: trackWidth,
            child: Stack(
              clipBehavior: Clip.none,
              children: _audioLayers.map((audio) {
                // Use pixelsPerSecond for consistent positioning
                final leftOffset = audio.startTime * _pixelsPerSecond;
                final itemWidth = ((audio.endTime - audio.startTime) * _pixelsPerSecond).clamp(60.0, trackWidth);
                final isSelected = audio.id == _selectedAudioId;
                final isDragging = audio.id == _draggingLayerId;
                
                return Positioned(
                  left: leftOffset,
                  child: GestureDetector(
                    onTap: () => _selectAudioLayer(audio.id),
                    onLongPressStart: (details) {
                      setState(() {
                        _draggingLayerId = audio.id;
                        _draggingLayerType = LayerType.audio;
                        _dragOffsetY = 0;
                      });
                    },
                    onLongPressMoveUpdate: (details) {
                      setState(() {
                        _dragOffsetY = details.localOffsetFromOrigin.dy;
                      });
                    },
                    onLongPressEnd: (details) {
                      setState(() {
                        _draggingLayerId = null;
                        _draggingLayerType = null;
                        _dragOffsetY = 0;
                      });
                    },
                    onHorizontalDragUpdate: (details) {
                      final delta = details.primaryDelta ?? 0;
                      final timeDelta = delta / _pixelsPerSecond;
                      final itemDuration = audio.endTime - audio.startTime;
                      
                      setState(() {
                        var newStart = (audio.startTime + timeDelta).clamp(0.0, duration - itemDuration);
                        
                        // Snapping logic
                        final playheadTime = _videoController?.value.position.inSeconds.toDouble() ?? 0;
                        final snapTimeThreshold = _snapThreshold / _pixelsPerSecond;
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
                        
                        audio.startTime = newStart;
                        audio.endTime = newStart + itemDuration;
                      });
                    },
                    onHorizontalDragEnd: (_) {
                      setState(() => _snapLinePosition = null);
                    },
                    child: Transform.translate(
                      offset: isDragging ? Offset(0, _dragOffsetY) : Offset.zero,
                      child: _buildAudioClip(
                        audio: audio,
                        itemWidth: itemWidth,
                        isSelected: isSelected,
                        isDragging: isDragging,
                        duration: duration,
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
  
  /// Build a single audio clip with waveform visualization
  Widget _buildAudioClip({
    required AudioLayer audio,
    required double itemWidth,
    required bool isSelected,
    required bool isDragging,
    required double duration,
  }) {
    const audioColor = Color(0xFF22C55E);
    
    return Container(
      width: itemWidth,
      height: 38,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isSelected 
              ? [const Color(0xFF16A34A), const Color(0xFF15803D)]
              : [audioColor, audioColor.withOpacity(0.8)],
        ),
        borderRadius: BorderRadius.circular(6),
        border: isSelected ? Border.all(color: Colors.white, width: 2) : null,
        boxShadow: [
          BoxShadow(
            color: audioColor.withOpacity(isDragging ? 0.6 : 0.3),
            blurRadius: isDragging ? 16 : 8,
          ),
        ],
      ),
      child: Row(
        children: [
          // Left trim handle
          GestureDetector(
            onHorizontalDragStart: (_) {
              _saveStateToHistory(); // Save state before trimming
              setState(() {
                _trimmingLayerId = audio.id;
                _isTrimmingStart = true;
              });
            },
            onHorizontalDragUpdate: (details) {
              final delta = details.primaryDelta ?? 0;
              final timeDelta = delta / _pixelsPerSecond;
              setState(() {
                audio.startTime = (audio.startTime + timeDelta).clamp(0.0, audio.endTime - 0.5);
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
                  height: 18,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(1.5),
                  ),
                ),
              ),
            ),
          ),
          
          // Waveform content area
          Expanded(
            child: Stack(
              children: [
                // Waveform visualization
                Positioned.fill(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(2),
                    child: CustomPaint(
                      painter: _AudioWaveformPainter(
                        color: Colors.white.withOpacity(0.8),
                        backgroundColor: Colors.transparent,
                      ),
                    ),
                  ),
                ),
                // Audio info overlay
                Positioned(
                  left: 4,
                  top: 4,
                  right: 4,
                  child: Row(
                    children: [
                      Icon(Icons.music_note, size: 12, color: Colors.white.withOpacity(0.9)),
                      const SizedBox(width: 4),
                      Flexible(
                        child: Text(
                          audio.name,
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
                // Delete button (when selected)
                if (isSelected)
                  Positioned(
                    top: 2,
                    right: 4,
                    child: GestureDetector(
                      onTap: () => _deleteAudioLayer(audio.id),
                      child: Container(
                        width: 18,
                        height: 18,
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close, size: 10, color: Colors.white),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          
          // Right trim handle
          GestureDetector(
            onHorizontalDragStart: (_) {
              _saveStateToHistory(); // Save state before trimming
              setState(() {
                _trimmingLayerId = audio.id;
                _isTrimmingEnd = true;
              });
            },
            onHorizontalDragUpdate: (details) {
              final delta = details.primaryDelta ?? 0;
              final timeDelta = delta / _pixelsPerSecond;
              setState(() {
                audio.endTime = (audio.endTime + timeDelta).clamp(audio.startTime + 0.5, duration);
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
                  height: 18,
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
                  final position = seconds * _pixelsPerSecond;
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
                  final position = i * _pixelsPerSecond;
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
    final bool showSettingsPanel = _selectedTool == 'adjust' || _selectedTool == 'stickers' || _selectedTool == 'aspect' || _selectedTool == 'background';
    
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
    String panelTitle = 'Editor';
    if (_selectedTool == 'adjust') {
      panelTitle = 'Adjust';
    } else if (_selectedTool == 'stickers') {
      panelTitle = 'Stickers';
    } else if (_selectedTool == 'aspect') {
      panelTitle = 'Aspect Ratio';
    } else if (_selectedTool == 'background') {
      panelTitle = 'Background';
    }
    
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
                  panelTitle,
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
          if (_selectedTool == 'adjust')
            _buildAdjustSettingsContent()
          else if (_selectedTool == 'stickers')
            _buildStickersSettingsContent()
          else if (_selectedTool == 'aspect')
            _buildAspectRatioSettingsContent()
          else if (_selectedTool == 'background')
            _buildBackgroundSettingsContent(),
        ],
      ),
    );
  }

  void _cancelSettingsPanel() {
    setState(() {
      _selectedTool = 'edit';
      _selectedTextId = null;
      _selectedAudioId = null;
      _selectedCaptionId = null;
      _selectedEffectId = null;
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
                    _buildTextBackgroundTab(),
                    _buildAlignmentTab(),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildAdjustSettingsContent() {
    // Get selected adjustment tool
    final selectedTool = _adjustmentTools.firstWhere(
      (t) => t.id == _selectedAdjustmentId,
      orElse: () => _adjustmentTools.first,
    );
    
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Top Tabs: Filters / Adjust
        Container(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _adjustPanelTab = 'filters'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Column(
                      children: [
                        Text(
                          'Filters',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: _adjustPanelTab == 'filters' ? Colors.white : Colors.white.withOpacity(0.5),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          height: 2,
                          width: 48,
                          decoration: BoxDecoration(
                            color: _adjustPanelTab == 'filters' ? AppTheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(1),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _adjustPanelTab = 'adjust'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Column(
                      children: [
                        Text(
                          'Adjust',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: _adjustPanelTab == 'adjust' ? Colors.white : Colors.white.withOpacity(0.5),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          height: 2,
                          width: 48,
                          decoration: BoxDecoration(
                            color: _adjustPanelTab == 'adjust' ? AppTheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(1),
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
        
        if (_adjustPanelTab == 'adjust') ...[
          // Sub-menu: Smart / Customize
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => setState(() => _adjustSubTab = 'smart'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: _adjustSubTab == 'smart' ? AppTheme.primary.withOpacity(0.2) : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: _adjustSubTab == 'smart' ? AppTheme.primary.withOpacity(0.4) : Colors.transparent,
                      ),
                    ),
                    child: Text(
                      'Smart',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: _adjustSubTab == 'smart' ? AppTheme.primary : Colors.white.withOpacity(0.6),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                GestureDetector(
                  onTap: () => setState(() => _adjustSubTab = 'customize'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: _adjustSubTab == 'customize' ? AppTheme.primary.withOpacity(0.2) : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: _adjustSubTab == 'customize' ? AppTheme.primary.withOpacity(0.4) : Colors.transparent,
                      ),
                    ),
                    child: Text(
                      'Customize',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: _adjustSubTab == 'customize' ? AppTheme.primary : Colors.white.withOpacity(0.6),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Horizontal Scrollable Adjustment Icons
          SizedBox(
            height: 90,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              itemCount: _adjustmentTools.length,
              itemBuilder: (context, index) {
                final tool = _adjustmentTools[index];
                final isSelected = tool.id == _selectedAdjustmentId;
                final hasValue = tool.value != 0;
                
                return GestureDetector(
                  onTap: () => setState(() => _selectedAdjustmentId = tool.id),
                  child: Container(
                    width: 64,
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primary.withOpacity(0.15) : Colors.transparent,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isSelected 
                                ? AppTheme.primary 
                                : hasValue 
                                    ? Colors.white.withOpacity(0.15) 
                                    : Colors.white.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            tool.icon,
                            size: 20,
                            color: isSelected 
                                ? Colors.white 
                                : hasValue 
                                    ? AppTheme.primary 
                                    : Colors.white.withOpacity(0.7),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          tool.name,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                            color: isSelected 
                                ? AppTheme.primary 
                                : hasValue 
                                    ? Colors.white 
                                    : Colors.white.withOpacity(0.6),
                          ),
                        ),
                        if (hasValue)
                          Text(
                            '${tool.value >= 0 ? '+' : ''}${(tool.value * 100).round()}',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.primary,
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          
          // Single Slider for Selected Adjustment
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      selectedTool.name,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Colors.white,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: selectedTool.value != 0 
                            ? AppTheme.primary.withOpacity(0.15) 
                            : Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${selectedTool.value >= 0 ? '+' : ''}${(selectedTool.value * 100).round()}',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          fontFamily: 'monospace',
                          color: selectedTool.value != 0 ? AppTheme.primary : Colors.white.withOpacity(0.6),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    trackHeight: 6,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
                    overlayShape: const RoundSliderOverlayShape(overlayRadius: 20),
                    activeTrackColor: AppTheme.primary,
                    inactiveTrackColor: Colors.white.withOpacity(0.1),
                    thumbColor: Colors.white,
                  ),
                  child: Slider(
                    value: selectedTool.value,
                    min: -1.0,
                    max: 1.0,
                    onChanged: selectedTool.onChanged,
                  ),
                ),
              ],
            ),
          ),
          
          // Reset Button - Bottom Left
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: GestureDetector(
                onTap: _resetAllAdjustments,
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.refresh,
                    size: 20,
                    color: Colors.white.withOpacity(0.7),
                  ),
                ),
              ),
            ),
          ),
        ],
        
        if (_adjustPanelTab == 'filters')
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.circle_outlined, size: 40, color: Colors.white.withOpacity(0.3)),
                const SizedBox(height: 8),
                Text(
                  'Filter presets coming soon',
                  style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14),
                ),
              ],
            ),
          ),
      ],
    );
  }
  
  /// Audio settings panel content
  Widget _buildAudioSettingsContent() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Import audio button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: GestureDetector(
            onTap: _isImportingAudio ? null : _importAudioFile,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF22C55E).withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF22C55E).withOpacity(0.4)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_isImportingAudio)
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Color(0xFF22C55E),
                      ),
                    )
                  else
                    const Icon(Icons.add, color: Color(0xFF22C55E), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    _isImportingAudio ? 'Importing...' : 'Import Audio File',
                    style: const TextStyle(
                      color: Color(0xFF22C55E),
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        
        // Audio layers list
        if (_audioLayers.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.music_note, size: 40, color: Colors.white.withOpacity(0.3)),
                const SizedBox(height: 8),
                Text(
                  'No audio layers yet',
                  style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  'Import audio to add to your video',
                  style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 12),
                ),
              ],
            ),
          )
        else
          SizedBox(
            height: 160,
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _audioLayers.length,
              itemBuilder: (context, index) {
                final audio = _audioLayers[index];
                final isSelected = audio.id == _selectedAudioId;
                
                return GestureDetector(
                  onTap: () => _selectAudioLayer(audio.id),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isSelected 
                          ? const Color(0xFF22C55E).withOpacity(0.2)
                          : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: isSelected
                          ? Border.all(color: const Color(0xFF22C55E), width: 2)
                          : Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Row(
                      children: [
                        // Audio icon
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: const Color(0xFF22C55E).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.music_note,
                            color: Color(0xFF22C55E),
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        
                        // Audio info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                audio.name,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${audio.startTime.toStringAsFixed(1)}s - ${audio.endTime.toStringAsFixed(1)}s',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.5),
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                        ),
                        
                        // Volume slider (when selected)
                        if (isSelected) ...[
                          SizedBox(
                            width: 80,
                            child: SliderTheme(
                              data: SliderThemeData(
                                activeTrackColor: const Color(0xFF22C55E),
                                inactiveTrackColor: Colors.white.withOpacity(0.2),
                                thumbColor: Colors.white,
                                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                                trackHeight: 3,
                              ),
                              child: Slider(
                                value: audio.volume,
                                onChanged: (value) => _updateAudioVolume(audio.id, value),
                              ),
                            ),
                          ),
                          Icon(
                            audio.volume > 0 ? Icons.volume_up : Icons.volume_off,
                            size: 16,
                            color: Colors.white.withOpacity(0.6),
                          ),
                        ],
                        
                        // Delete button
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => _deleteAudioLayer(audio.id),
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(
                              Icons.delete_outline,
                              color: Colors.red,
                              size: 16,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  // Caption style options
  String _selectedCaptionStyle = 'classic';
  final List<Map<String, dynamic>> _captionStyles = const [
    {'id': 'classic', 'name': 'Classic', 'preview': 'Aa', 'bgColor': Color(0xFF000000), 'textColor': Color(0xFFFFFFFF)},
    {'id': 'bold', 'name': 'Bold', 'preview': 'Aa', 'bgColor': Color(0xFFFFFFFF), 'textColor': Color(0xFF000000)},
    {'id': 'neon', 'name': 'Neon', 'preview': 'Aa', 'bgColor': Color(0xFF000000), 'textColor': Color(0xFF00FF88)},
    {'id': 'minimal', 'name': 'Minimal', 'preview': 'Aa', 'bgColor': Colors.transparent, 'textColor': Color(0xFFFFFFFF)},
    {'id': 'cinematic', 'name': 'Cinematic', 'preview': 'Aa', 'bgColor': Color(0xFF1A1A2E), 'textColor': Color(0xFFEAB308)},
    {'id': 'karaoke', 'name': 'Karaoke', 'preview': 'Aa', 'bgColor': Color(0xFF7C3AED), 'textColor': Color(0xFFFFFFFF)},
  ];

  /// Captions/Subtitles settings panel content
  Widget _buildCaptionsSettingsContent() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Subtitle Styles Section
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Subtitle Style',
                style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 70,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _captionStyles.length,
                  itemBuilder: (context, index) {
                    final style = _captionStyles[index];
                    final isSelected = _selectedCaptionStyle == style['id'];
                    return GestureDetector(
                      onTap: () => setState(() => _selectedCaptionStyle = style['id'] as String),
                      child: Container(
                        width: 70,
                        margin: const EdgeInsets.only(right: 10),
                        decoration: BoxDecoration(
                          color: style['bgColor'] as Color,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF06B6D4) : Colors.white.withOpacity(0.2),
                            width: isSelected ? 2 : 1,
                          ),
                          boxShadow: isSelected
                              ? [BoxShadow(color: const Color(0xFF06B6D4).withOpacity(0.4), blurRadius: 8)]
                              : null,
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              style['preview'] as String,
                              style: TextStyle(
                                color: style['textColor'] as Color,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              style['name'] as String,
                              style: TextStyle(
                                color: (style['textColor'] as Color).withOpacity(0.8),
                                fontSize: 9,
                                fontWeight: FontWeight.w500,
                              ),
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
        ),
        
        // Auto-Caption button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: GestureDetector(
            onTap: _isGeneratingCaptions ? null : _generateAutoCaptions,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF06B6D4).withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF06B6D4).withOpacity(0.4)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_isGeneratingCaptions)
                    const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF06B6D4)))
                  else
                    const Icon(Icons.auto_awesome, color: Color(0xFF06B6D4), size: 20),
                  const SizedBox(width: 8),
                  Text(_isGeneratingCaptions ? 'Generating...' : 'Auto-Generate', style: const TextStyle(color: Color(0xFF06B6D4), fontSize: 15, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
        ),
        // Add caption button
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: GestureDetector(
            onTap: _addCaptionLayer,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF06B6D4).withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF06B6D4).withOpacity(0.3)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add, color: Color(0xFF06B6D4), size: 18),
                  SizedBox(width: 6),
                  Text('Add Caption', style: TextStyle(color: Color(0xFF06B6D4), fontSize: 13, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
        ),
        // Caption layers list
        if (_captionLayers.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.subtitles_off, size: 40, color: Colors.white.withOpacity(0.3)),
                const SizedBox(height: 8),
                Text('No captions yet', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14)),
              ],
            ),
          )
        else
          SizedBox(
            height: 120,
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _captionLayers.length,
              itemBuilder: (context, index) {
                final caption = _captionLayers[index];
                final isSelected = caption.id == _selectedCaptionId;
                return GestureDetector(
                  onTap: () => _selectCaptionLayer(caption.id),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF06B6D4).withOpacity(0.2) : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: isSelected ? Border.all(color: const Color(0xFF06B6D4), width: 2) : Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Row(
                      children: [
                        Container(width: 36, height: 36, decoration: BoxDecoration(color: const Color(0xFF06B6D4).withOpacity(0.2), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.chat_bubble_outline, color: Color(0xFF06B6D4), size: 18)),
                        const SizedBox(width: 12),
                        Expanded(child: Text(caption.text, style: const TextStyle(color: Colors.white, fontSize: 13), overflow: TextOverflow.ellipsis)),
                        GestureDetector(onTap: () => _deleteCaptionLayer(caption.id), child: Container(padding: const EdgeInsets.all(6), decoration: BoxDecoration(color: Colors.red.withOpacity(0.2), borderRadius: BorderRadius.circular(8)), child: const Icon(Icons.delete_outline, color: Colors.red, size: 16))),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  /// Build caption track in timeline (Cyan themed)
  Widget _buildCaptionTrack(double startPadding, double trackWidth, double duration) {
    if (_captionLayers.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 40,
      child: Row(
        children: [
          SizedBox(width: startPadding),
          SizedBox(
            width: trackWidth,
            child: Stack(
              clipBehavior: Clip.none,
              children: _captionLayers.map((caption) {
                final leftOffset = caption.startTime * _pixelsPerSecond;
                final itemWidth = ((caption.endTime - caption.startTime) * _pixelsPerSecond).clamp(50.0, trackWidth);
                final isSelected = caption.id == _selectedCaptionId;
                return Positioned(
                  left: leftOffset,
                  child: GestureDetector(
                    onTap: () => _selectCaptionLayer(caption.id),
                    child: Container(
                      width: itemWidth,
                      height: 34,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: isSelected ? [const Color(0xFF0891B2), const Color(0xFF0E7490)] : [const Color(0xFF06B6D4), const Color(0xFF0891B2)]),
                        borderRadius: BorderRadius.circular(6),
                        border: isSelected ? Border.all(color: Colors.white, width: 2) : null,
                      ),
                      child: Row(
                        children: [
                          const SizedBox(width: 8),
                          const Icon(Icons.subtitles, size: 12, color: Colors.white),
                          const SizedBox(width: 4),
                          Expanded(child: Text(caption.text, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
                          // Delete button when selected
                          if (isSelected)
                            GestureDetector(
                              onTap: () => _deleteCaptionFromTimeline(caption.id),
                              child: Container(
                                width: 16,
                                height: 16,
                                margin: const EdgeInsets.only(right: 6),
                                decoration: BoxDecoration(
                                  color: Colors.red.withOpacity(0.9),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close, size: 10, color: Colors.white),
                              ),
                            ),
                        ],
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

  Widget _buildBottomToolbar() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0A),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 200),
        child: _isTextMenuMode 
            ? _buildTextMenu()
            : (_isAudioMenuMode 
                ? _buildAudioMenu()
                : (_isEffectsMenuMode 
                    ? _buildEffectsMenu()
                    : (_isEditMenuMode 
                        ? _buildEditMenu()
                        : _buildMainToolbar()))),
      ),
    );
  }
  
  /// Build the text menu - single horizontal scrollable row matching Audio/Edit style
  Widget _buildTextMenu() {
    final isStickersExpanded = _textMenuTab == 'stickers';
    
    return Column(
      key: const ValueKey('text_menu'),
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with back button and title
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              GestureDetector(
                onTap: () => setState(() => _isTextMenuMode = false),
                child: Container(
                  width: 32,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppTheme.primary.withOpacity(0.2),
                      width: 1,
                    ),
                  ),
                  child: Icon(Icons.chevron_left, size: 22, color: AppTheme.primary),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Text',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
        
        // Horizontal Scrollable Icons - single row
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildTextToolIcon('Add text', Icons.text_fields, false, () {
                  _addTextOverlay();
                  setState(() => _isTextMenuMode = false);
                }),
                _buildTextToolIcon('Auto captions', Icons.subtitles_outlined, false, () {
                  _generateCaptions();
                  setState(() => _isTextMenuMode = false);
                }),
                _buildTextToolIcon('Stickers', Icons.emoji_emotions_outlined, false, () {
                  setState(() => _textMenuTab = _textMenuTab == 'stickers' ? 'add-text' : 'stickers');
                }),
                _buildTextToolIcon('Draw', Icons.edit_outlined, false, () {
                  _showSnackBar('Drawing tools coming soon');
                }),
                _buildTextToolIcon('Text template', Icons.description_outlined, false, () {
                  _addTextOverlay();
                  setState(() => _isTextMenuMode = false);
                }),
                _buildTextToolIcon('Text to audio', Icons.audiotrack_outlined, false, () {
                  _showSnackBar('Text to audio coming soon');
                }),
                _buildTextToolIcon('Auto lyrics', Icons.music_note_outlined, false, () {
                  _showSnackBar('Auto lyrics coming soon');
                }),
              ],
            ),
          ),
        ),
        
        // Sticker Grid - shows when stickers is selected
        if (isStickersExpanded) ...[
          Container(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
            ),
            child: Column(
              children: [
                const SizedBox(height: 12),
                // Category selector
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _stickerCategories.map((cat) {
                      final isSelected = _selectedStickerCategory == cat['id'];
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedStickerCategory = cat['id']),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Text(
                              cat['name'] as String,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: isSelected ? Colors.white : Colors.white.withOpacity(0.7),
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 12),
                // Sticker grid
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: (_stickerCategories.firstWhere((c) => c['id'] == _selectedStickerCategory)['stickers'] as List<String>).map((sticker) {
                    return GestureDetector(
                      onTap: () {
                        _addTextOverlay();
                        if (_textOverlays.isNotEmpty) {
                          final lastOverlay = _textOverlays.last;
                          lastOverlay.text = sticker;
                          lastOverlay.fontSize = 48;
                        }
                        setState(() => _isTextMenuMode = false);
                      },
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: Text(sticker, style: const TextStyle(fontSize: 20)),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
  
  Widget _buildTextToolIcon(String label, IconData icon, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 64,
        padding: const EdgeInsets.symmetric(vertical: 8),
        margin: const EdgeInsets.symmetric(horizontal: 2),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 20,
                color: isSelected ? Colors.white : Colors.white.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildStickerCategoryIcon(String label, String emoji, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 64,
        padding: const EdgeInsets.symmetric(vertical: 8),
        margin: const EdgeInsets.symmetric(horizontal: 2),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(emoji, style: const TextStyle(fontSize: 22)),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  /// Build the audio menu - horizontal scrollable menu with audio tools
  Widget _buildAudioMenu() {
    final audioTools = [
      {'id': 'extract', 'name': 'Extract', 'icon': Icons.waves_outlined},
      {'id': 'sounds', 'name': 'Sounds', 'icon': Icons.music_note},
      {'id': 'sound-fx', 'name': 'Sound FX', 'icon': Icons.auto_awesome},
      {'id': 'record', 'name': 'Record', 'icon': Icons.circle_outlined},
      {'id': 'text-to-audio', 'name': 'Text to audio', 'icon': Icons.record_voice_over_outlined},
    ];
    
    return Column(
      key: const ValueKey('audio_menu'),
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with back button and title
        Container(
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
          ),
          child: Row(
            children: [
              // Back button
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: GestureDetector(
                  onTap: () => setState(() => _isAudioMenuMode = false),
                  child: Container(
                    width: 32,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppTheme.primary.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                    child: const Icon(
                      Icons.chevron_left,
                      size: 22,
                      color: AppTheme.primary,
                    ),
                  ),
                ),
              ),
              // Title
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'Audio',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              const SizedBox(width: 40), // Balance for the back button
            ],
          ),
        ),
        
        // Horizontal Scrollable Audio Tools
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
          child: Row(
            children: audioTools.map((tool) {
              return GestureDetector(
                onTap: () => _showSnackBar('${tool['name']} coming soon'),
                child: Container(
                  width: 64,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          tool['icon'] as IconData,
                          size: 20,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        tool['name'] as String,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          color: Colors.white.withOpacity(0.6),
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
  
  /// Build the edit menu - horizontal scrollable menu with edit tools (same style as audio)
  Widget _buildEditMenu() {
    final editTools = [
      {'id': 'split', 'name': 'Split', 'icon': Icons.content_cut, 'action': () => _editingClipId != null ? _splitClipAtPlayhead(_editingClipId!) : null},
      {'id': 'volume', 'name': 'Volume', 'icon': Icons.volume_up, 'action': _applyClipVolume},
      {'id': 'animations', 'name': 'Animations', 'icon': Icons.auto_awesome, 'action': _showAnimationsBottomSheet},
      {'id': 'effects', 'name': 'Effects', 'icon': Icons.star_outline, 'action': () { setState(() { _selectedTool = 'effects'; _isEditMenuMode = false; }); }},
      {'id': 'delete', 'name': 'Delete', 'icon': Icons.delete_outline, 'action': () { if (_editingClipId != null) _deleteVideoClip(_editingClipId!); setState(() => _isEditMenuMode = false); }},
      {'id': 'speed', 'name': 'Speed', 'icon': Icons.speed, 'action': _applyClipSpeed},
      {'id': 'beats', 'name': 'Beats', 'icon': Icons.waves, 'action': _showBeatsBottomSheet},
      {'id': 'crop', 'name': 'Crop', 'icon': Icons.crop, 'action': _showCropBottomSheet},
      {'id': 'duplicate', 'name': 'Duplicate', 'icon': Icons.copy, 'action': () { if (_editingClipId != null) { _duplicateClipInline(_editingClipId!); } }},
      {'id': 'replace', 'name': 'Replace', 'icon': Icons.swap_horiz, 'action': () { setState(() => _isEditMenuMode = false); _pickAndLoadVideo(); }},
      {'id': 'overlay', 'name': 'Overlay', 'icon': Icons.layers_outlined, 'action': () { setState(() { _selectedTool = 'overlay'; _isEditMenuMode = false; }); }},
      {'id': 'adjust', 'name': 'Adjust', 'icon': Icons.tune, 'action': () { setState(() { _selectedTool = 'adjust'; _isEditMenuMode = false; }); }},
      {'id': 'filter', 'name': 'Filter', 'icon': Icons.auto_fix_high, 'action': () { setState(() { _selectedTool = 'filters'; _isEditMenuMode = false; }); }},
    ];
    
    return Column(
      key: const ValueKey('edit_menu'),
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with back button and title
        Container(
          decoration: BoxDecoration(
            border: Border(
              bottom: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
          ),
          child: Row(
            children: [
              // Back button
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: GestureDetector(
                  onTap: () => setState(() => _isEditMenuMode = false),
                  child: Container(
                    width: 32,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppTheme.primary.withOpacity(0.2),
                        width: 1,
                      ),
                    ),
                    child: const Icon(
                      Icons.chevron_left,
                      size: 22,
                      color: AppTheme.primary,
                    ),
                  ),
                ),
              ),
              // Title
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'Edit',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              const SizedBox(width: 40), // Balance for the back button
            ],
          ),
        ),
        
        // Horizontal Scrollable Edit Tools
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
          child: Row(
            children: editTools.map((tool) {
              final isDelete = tool['id'] == 'delete';
              return GestureDetector(
                onTap: () {
                  (tool['action'] as VoidCallback)();
                  // Don't close for tools that need to stay open
                  if (!['volume', 'speed', 'animations', 'beats', 'crop'].contains(tool['id'])) {
                    setState(() => _isEditMenuMode = false);
                  }
                },
                child: Container(
                  width: 64,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: isDelete 
                              ? Colors.red.withOpacity(0.2) 
                              : Colors.white.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          tool['icon'] as IconData,
                          size: 20,
                          color: isDelete ? Colors.red : Colors.white,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        tool['name'] as String,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          color: isDelete 
                              ? Colors.red 
                              : Colors.white.withOpacity(0.6),
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
  
  /// Build the effects menu - horizontal scrollable menu with effects tools
  Widget _buildEffectsMenu() {
    final effectsTools = [
      {'id': 'video-effects', 'name': 'Video effects', 'icon': Icons.videocam_outlined},
      {'id': 'body-effects', 'name': 'Body effects', 'icon': Icons.star_outline},
      {'id': 'photo-effects', 'name': 'Photo effects', 'icon': Icons.image_outlined},
    ];
    
    return Column(
      key: const ValueKey('effects_menu'),
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with back button and title
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              GestureDetector(
                onTap: () => setState(() => _isEffectsMenuMode = false),
                child: Container(
                  width: 32,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: AppTheme.primary.withOpacity(0.2),
                      width: 1,
                    ),
                  ),
                  child: Icon(Icons.chevron_left, size: 22, color: AppTheme.primary),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Effects',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
        
        // Horizontal Scrollable Effects Tools
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: effectsTools.map((tool) {
                return GestureDetector(
                  onTap: () => _showSnackBar('${tool['name']} coming soon'),
                  child: Container(
                    width: 80,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            tool['icon'] as IconData,
                            size: 20,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          tool['name'] as String,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                            color: Colors.white.withOpacity(0.7),
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }
  
  /// Build the main editor toolbar
  Widget _buildMainToolbar() {
    return SingleChildScrollView(
      key: const ValueKey('main_toolbar'),
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      child: Row(
        children: _editorTools.map((tool) {
          final isSelected = _selectedTool == tool.id;
          return GestureDetector(
            onTap: () {
              // Audio tool opens the audio menu
              if (tool.id == 'audio') {
                setState(() {
                  _isAudioMenuMode = true;
                  _selectedTool = 'audio';
                });
                return;
              }
              
              // Text tool opens the text menu
              if (tool.id == 'text') {
                setState(() {
                  _isTextMenuMode = true;
                  _textMenuTab = 'add-text';
                  _selectedTool = 'text';
                });
                return;
              }
              
              // Effects tool opens the effects menu
              if (tool.id == 'effects') {
                setState(() {
                  _isEffectsMenuMode = true;
                  _selectedTool = 'effects';
                });
                return;
              }
              
              // Coming soon tools - show snackbar and don't change selection
              if (tool.id == 'captions') {
                _showSnackBar('${tool.name} coming soon');
                return;
              }
              
              setState(() => _selectedTool = tool.id);
              
              // Edit tool opens the edit menu (same style as audio)
              if (tool.id == 'edit') {
                if (_videoClips.isNotEmpty) {
                  if (_selectedClipId == null) {
                    _selectedClipId = _videoClips.first.id;
                    _editingClipId = _videoClips.first.id;
                  } else {
                    _editingClipId = _selectedClipId;
                  }
                  setState(() => _isEditMenuMode = true);
                } else {
                  _showSnackBar('Add a video clip first');
                }
                return;
              }
              
              // Only show coming soon for non-functional tools
              if (tool.id != 'adjust' && tool.id != 'filters' && tool.id != 'overlay' && tool.id != 'stickers' && tool.id != 'aspect' && tool.id != 'background') {
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
    );
  }
  
  /// Build the edit mode toolbar with all clip editing tools
  Widget _buildEditToolbar() {
    final editTools = [
      _ClipEditTool(id: 'split', name: 'Split', icon: Icons.content_cut, onTap: () => _editingClipId != null ? _splitClipAtPlayhead(_editingClipId!) : null),
      _ClipEditTool(id: 'volume', name: 'Volume', icon: Icons.volume_up, onTap: _applyClipVolume),
      _ClipEditTool(id: 'animations', name: 'Animations', icon: Icons.auto_awesome, onTap: _showAnimationsBottomSheet),
      _ClipEditTool(id: 'effects', name: 'Effects', icon: Icons.star_outline, onTap: () { setState(() { _selectedTool = 'effects'; _isEditToolbarMode = false; }); }),
      _ClipEditTool(id: 'delete', name: 'Delete', icon: Icons.delete_outline, onTap: () { if (_editingClipId != null) _deleteVideoClip(_editingClipId!); setState(() => _isEditToolbarMode = false); }, isDestructive: true),
      _ClipEditTool(id: 'speed', name: 'Speed', icon: Icons.speed, onTap: _applyClipSpeed),
      _ClipEditTool(id: 'beats', name: 'Beats', icon: Icons.waves, onTap: _showBeatsBottomSheet),
      _ClipEditTool(id: 'crop', name: 'Crop', icon: Icons.crop, onTap: _showCropBottomSheet),
      _ClipEditTool(id: 'duplicate', name: 'Duplicate', icon: Icons.copy, onTap: () { if (_editingClipId != null) { _duplicateClipInline(_editingClipId!); } }),
      _ClipEditTool(id: 'replace', name: 'Replace', icon: Icons.swap_horiz, onTap: () { setState(() => _isEditToolbarMode = false); _pickAndLoadVideo(); }),
      _ClipEditTool(id: 'overlay', name: 'Overlay', icon: Icons.layers_outlined, onTap: () { setState(() { _selectedTool = 'overlay'; _isEditToolbarMode = false; }); }),
      _ClipEditTool(id: 'adjust', name: 'Adjust', icon: Icons.tune, onTap: () { setState(() { _selectedTool = 'adjust'; _isEditToolbarMode = false; }); }),
      _ClipEditTool(id: 'filter', name: 'Filter', icon: Icons.auto_fix_high, onTap: () { setState(() { _selectedTool = 'filters'; _isEditToolbarMode = false; }); }),
    ];
    
    return Row(
      key: const ValueKey('edit_toolbar'),
      children: [
        // Fixed Back Icon Button - Sleek rectangular chevron
        Padding(
          padding: const EdgeInsets.only(left: 8, right: 4),
          child: GestureDetector(
            onTap: () => setState(() => _isEditToolbarMode = false),
            child: Container(
              width: 32,
              height: 36,
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: Theme.of(context).primaryColor.withOpacity(0.2),
                  width: 1,
                ),
              ),
              child: Icon(
                Icons.chevron_left,
                size: 22,
                color: Theme.of(context).primaryColor,
              ),
            ),
          ),
        ),
        
        // Scrollable Edit Tools
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
            child: Row(
              children: editTools.map((tool) {
                return GestureDetector(
                  onTap: tool.onTap,
                  child: Container(
                    width: 56,
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          tool.icon,
                          size: 20,
                          color: tool.isDestructive ? Colors.red : Colors.white.withOpacity(0.8),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          tool.name,
                          style: TextStyle(
                            fontSize: 10,
                            color: tool.isDestructive ? Colors.red : Colors.white.withOpacity(0.7),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }
  
  /// Duplicate clip inline (without bottom sheet)
  void _duplicateClipInline(String clipId) {
    _saveStateToHistory();
    final clip = _videoClips.firstWhere((c) => c.id == clipId, orElse: () => _videoClips.first);
    
    final duplicatedClip = VideoClip(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      url: clip.url,
      duration: clip.duration,
      inPoint: clip.inPoint,
      outPoint: clip.outPoint,
    );
    
    setState(() {
      final index = _videoClips.indexWhere((c) => c.id == clipId);
      if (index != -1) {
        _videoClips.insert(index + 1, duplicatedClip);
        _recalculateClipStartTimes();
      }
    });
    
    _showSnackBar('Clip duplicated');
  }

  /// Build effects track in timeline (Amber/Gold themed)
  Widget _buildEffectsTrack(double startPadding, double trackWidth, double duration) {
    if (_effectLayers.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 40,
      child: Row(
        children: [
          SizedBox(width: startPadding),
          SizedBox(
            width: trackWidth,
            child: Stack(
              clipBehavior: Clip.none,
              children: _effectLayers.map((effect) {
                final leftOffset = effect.startTime * _pixelsPerSecond;
                final itemWidth = ((effect.endTime - effect.startTime) * _pixelsPerSecond).clamp(50.0, trackWidth);
                final isSelected = effect.id == _selectedEffectId;
                final isDragging = effect.id == _draggingLayerId;
                
                return Positioned(
                  left: leftOffset,
                  child: GestureDetector(
                    onTap: () => _selectEffectLayer(effect.id),
                    onHorizontalDragUpdate: (details) {
                      final delta = details.primaryDelta ?? 0;
                      final timeDelta = delta / _pixelsPerSecond;
                      final itemDuration = effect.endTime - effect.startTime;
                      
                      setState(() {
                        var newStart = (effect.startTime + timeDelta).clamp(0.0, duration - itemDuration);
                        
                        // Snapping logic
                        final playheadTime = _videoController?.value.position.inSeconds.toDouble() ?? 0;
                        final snapTimeThreshold = _snapThreshold / _pixelsPerSecond;
                        
                        if ((newStart - playheadTime).abs() < snapTimeThreshold) {
                          newStart = playheadTime;
                        } else if ((newStart + itemDuration - playheadTime).abs() < snapTimeThreshold) {
                          newStart = playheadTime - itemDuration;
                        }
                        
                        effect.startTime = newStart;
                        effect.endTime = newStart + itemDuration;
                      });
                    },
                    child: Transform.translate(
                      offset: isDragging ? Offset(0, _dragOffsetY) : Offset.zero,
                      child: Container(
                        width: itemWidth,
                        height: 34,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isSelected 
                                ? [const Color(0xFFF59E0B), const Color(0xFFF97316)]
                                : [const Color(0xFFD97706), const Color(0xFFEA580C)],
                          ),
                          borderRadius: BorderRadius.circular(6),
                          border: isSelected ? Border.all(color: Colors.white, width: 2) : null,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFF59E0B).withOpacity(isDragging ? 0.6 : 0.3),
                              blurRadius: isDragging ? 16 : 8,
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            // Left trim handle
                            GestureDetector(
                              onHorizontalDragUpdate: (details) {
                                final delta = details.primaryDelta ?? 0;
                                final timeDelta = delta / _pixelsPerSecond;
                                setState(() {
                                  effect.startTime = (effect.startTime + timeDelta).clamp(0.0, effect.endTime - 0.5);
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
                                  children: [
                                    Text(effect.icon, style: const TextStyle(fontSize: 12)),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        effect.name,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    // Delete button when selected
                                    if (isSelected)
                                      GestureDetector(
                                        onTap: () => _deleteEffectFromTimeline(effect.id),
                                        child: Container(
                                          width: 16,
                                          height: 16,
                                          decoration: BoxDecoration(
                                            color: Colors.red.withOpacity(0.9),
                                            shape: BoxShape.circle,
                                          ),
                                          child: const Icon(Icons.close, size: 10, color: Colors.white),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                            
                            // Right trim handle
                            GestureDetector(
                              onHorizontalDragUpdate: (details) {
                                final delta = details.primaryDelta ?? 0;
                                final timeDelta = delta / _pixelsPerSecond;
                                setState(() {
                                  effect.endTime = (effect.endTime + timeDelta).clamp(effect.startTime + 0.5, duration);
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

  /// Effects settings content panel
  Widget _buildEffectsSettingsContent() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Effects grid
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Select an effect to add',
                style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 90,
                child: GridView.builder(
                  scrollDirection: Axis.horizontal,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 1,
                    mainAxisSpacing: 8,
                    childAspectRatio: 1.0,
                  ),
                  itemCount: _effectPresets.length,
                  itemBuilder: (context, index) {
                    final preset = _effectPresets[index];
                    return GestureDetector(
                      onTap: () => _addEffectLayer(preset),
                      child: Container(
                        width: 80,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.3)),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(preset.icon, style: const TextStyle(fontSize: 24)),
                            const SizedBox(height: 4),
                            Text(
                              preset.name,
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.8),
                                fontSize: 10,
                                fontWeight: FontWeight.w500,
                              ),
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
        ),
        
        // Applied effects list
        if (_effectLayers.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Applied Effects',
                  style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 100,
                  child: ListView.builder(
                    scrollDirection: Axis.vertical,
                    itemCount: _effectLayers.length,
                    itemBuilder: (context, index) {
                      final effect = _effectLayers[index];
                      final isSelected = effect.id == _selectedEffectId;
                      return GestureDetector(
                        onTap: () => _selectEffectLayer(effect.id),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isSelected 
                                ? const Color(0xFFF59E0B).withOpacity(0.2) 
                                : Colors.white.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(12),
                            border: isSelected 
                                ? Border.all(color: const Color(0xFFF59E0B), width: 2) 
                                : Border.all(color: Colors.white.withOpacity(0.1)),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF59E0B).withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Center(child: Text(effect.icon, style: const TextStyle(fontSize: 18))),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      effect.name,
                                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
                                    ),
                                    if (isSelected)
                                      Slider(
                                        value: effect.intensity,
                                        onChanged: (value) => setState(() => effect.intensity = value),
                                        activeColor: const Color(0xFFF59E0B),
                                        inactiveColor: Colors.white.withOpacity(0.2),
                                      ),
                                  ],
                                ),
                              ),
                              GestureDetector(
                                onTap: () => _deleteEffectLayer(effect.id),
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: Colors.red.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.delete_outline, color: Colors.red, size: 16),
                                ),
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
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.star_border, size: 40, color: Colors.white.withOpacity(0.3)),
                const SizedBox(height: 8),
                Text('No effects applied', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 14)),
              ],
            ),
          ),
      ],
    );
  }

  /// Stickers settings content panel
  Widget _buildStickersSettingsContent() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Category tabs
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: _stickerCategories.map((cat) {
              final isSelected = _selectedStickerCategory == cat['id'];
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () => setState(() => _selectedStickerCategory = cat['id'] as String),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primary.withOpacity(0.2) : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? AppTheme.primary.withOpacity(0.4) : Colors.transparent,
                      ),
                    ),
                    child: Text(
                      cat['name'] as String,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.6),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        
        // Stickers grid
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: (_stickerCategories.firstWhere(
              (c) => c['id'] == _selectedStickerCategory,
              orElse: () => _stickerCategories.first,
            )['stickers'] as List<String>).map((sticker) {
              return GestureDetector(
                onTap: () {
                  final currentPos = _videoController?.value.position.inSeconds.toDouble() ?? 0;
                  final duration = _videoController?.value.duration.inSeconds.toDouble() ?? 10;
                  
                  final newSticker = TextOverlay(
                    id: DateTime.now().millisecondsSinceEpoch.toString(),
                    text: sticker,
                    position: const Offset(0.5, 0.5),
                    fontSize: 48,
                    textColor: Colors.white,
                    fontFamily: 'Arial',
                    alignment: TextAlign.center,
                    hasBackground: false,
                    startTime: currentPos,
                    endTime: (currentPos + 3).clamp(0, duration),
                  );
                  
                  setState(() {
                    _textOverlays.add(newSticker);
                    _selectedTextId = newSticker.id;
                  });
                  _showSnackBar('Sticker added!');
                },
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Center(
                    child: Text(sticker, style: const TextStyle(fontSize: 24)),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  /// Aspect Ratio settings content panel
  Widget _buildAspectRatioSettingsContent() {
    return Column(
      children: [
        // Horizontal scrollable ratio row
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: _aspectRatioPresets.map((preset) {
              final isSelected = _selectedAspectRatio == preset['id'];
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () => setState(() {
                    _selectedAspectRatio = preset['id'] as String;
                    _videoPosition = Offset.zero; // Reset position on ratio change
                  }),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      preset['label'] as String,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: isSelected ? Colors.white : Colors.white.withOpacity(0.7),
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
        
        // Instruction
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Drag the video to reposition within the frame',
            style: TextStyle(
              fontSize: 10,
              color: Colors.white.withOpacity(0.5),
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }

  /// Background settings content panel
  Widget _buildBackgroundSettingsContent() {
    return Column(
      children: [
        // Tab Navigation
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              _buildBackgroundTab('color', 'Color', Icons.palette_outlined),
              _buildBackgroundTab('image', 'Image', Icons.image_outlined),
              _buildBackgroundTab('blur', 'Blur', Icons.blur_on),
            ],
          ),
        ),
        
        // Horizontal Divider
        Container(
          height: 1,
          margin: const EdgeInsets.symmetric(horizontal: 16),
          color: Colors.white.withOpacity(0.1),
        ),
        
        // Tab Content
        Padding(
          padding: const EdgeInsets.all(16),
          child: _buildBackgroundTabContent(),
        ),
      ],
    );
  }
  
  Widget _buildBackgroundTab(String id, String label, IconData icon) {
    final isActive = _backgroundTab == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _backgroundTab = id),
        child: Column(
          children: [
            Icon(
              icon,
              size: 18,
              color: isActive ? AppTheme.primary : Colors.white.withOpacity(0.6),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isActive ? AppTheme.primary : Colors.white.withOpacity(0.6),
              ),
            ),
            const SizedBox(height: 6),
            Container(
              height: 2,
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: isActive ? AppTheme.primary : Colors.transparent,
                borderRadius: BorderRadius.circular(1),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildBackgroundTabContent() {
    switch (_backgroundTab) {
      case 'color':
        return Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _backgroundColorPresets.map((color) {
            final isSelected = _backgroundColor == color;
            return GestureDetector(
              onTap: () => setState(() => _backgroundColor = color),
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isSelected ? AppTheme.primary : Colors.transparent,
                    width: 2,
                  ),
                  boxShadow: isSelected ? [
                    BoxShadow(
                      color: AppTheme.primary.withOpacity(0.4),
                      blurRadius: 8,
                    ),
                  ] : null,
                ),
              ),
            );
          }).toList(),
        );
        
      case 'image':
        final imagePresets = [
          {'id': 'gradient-sunset', 'colors': [const Color(0xFFFF6B6B), const Color(0xFFFFA07A)]},
          {'id': 'gradient-ocean', 'colors': [const Color(0xFF4ECDC4), const Color(0xFF45B7D1)]},
          {'id': 'gradient-forest', 'colors': [const Color(0xFF96CEB4), const Color(0xFF2E8B57)]},
          {'id': 'gradient-night', 'colors': [const Color(0xFF1A1A2E), const Color(0xFF16213E)]},
          {'id': 'gradient-purple', 'colors': [const Color(0xFF667eea), const Color(0xFF764ba2)]},
          {'id': 'gradient-pink', 'colors': [const Color(0xFFf093fb), const Color(0xFFf5576c)]},
          {'id': 'gradient-gold', 'colors': [const Color(0xFFf7971e), const Color(0xFFffd200)]},
          {'id': 'gradient-mint', 'colors': [const Color(0xFF56ab2f), const Color(0xFFa8e063)]},
        ];
        
        return Column(
          children: [
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
              ),
              itemCount: imagePresets.length,
              itemBuilder: (context, index) {
                final preset = imagePresets[index];
                final isSelected = _backgroundImage == preset['id'];
                final colors = preset['colors'] as List<Color>;
                return GestureDetector(
                  onTap: () => setState(() => _backgroundImage = preset['id'] as String),
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: colors,
                      ),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected ? AppTheme.primary : Colors.transparent,
                        width: 2,
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () => _showSnackBar('Upload background coming soon'),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.upload_outlined, size: 18, color: Colors.white.withOpacity(0.7)),
                    const SizedBox(width: 8),
                    Text(
                      'Upload Custom Image',
                      style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.7)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
        
      case 'blur':
        final blurPresets = [
          {'label': 'None', 'value': 0.0},
          {'label': 'Light', 'value': 10.0},
          {'label': 'Medium', 'value': 25.0},
          {'label': 'Heavy', 'value': 50.0},
        ];
        
        return Column(
          children: [
            // Blur Presets
            Row(
              children: blurPresets.map((preset) {
                final isSelected = _backgroundBlur == preset['value'];
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: GestureDetector(
                      onTap: () => setState(() => _backgroundBlur = preset['value'] as double),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Center(
                          child: Text(
                            preset['label'] as String,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: isSelected ? Colors.white : Colors.white.withOpacity(0.7),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            
            const SizedBox(height: 20),
            
            // Custom Slider
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Custom Intensity',
                  style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '${_backgroundBlur.round()}px',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      fontFamily: 'monospace',
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SliderTheme(
              data: SliderTheme.of(context).copyWith(
                trackHeight: 6,
                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
                overlayShape: const RoundSliderOverlayShape(overlayRadius: 20),
                activeTrackColor: AppTheme.primary,
                inactiveTrackColor: Colors.white.withOpacity(0.1),
                thumbColor: Colors.white,
              ),
              child: Slider(
                value: _backgroundBlur,
                min: 0,
                max: 50,
                onChanged: (value) => setState(() => _backgroundBlur = value),
              ),
            ),
          ],
        );
        
      default:
        return const SizedBox.shrink();
    }
  }

  void _addEffectLayer(EffectPreset preset) {
    _saveStateToHistory();
    final currentPos = _videoController?.value.position.inSeconds.toDouble() ?? 0;
    final duration = _videoController?.value.duration.inSeconds.toDouble() ?? 10;
    
    final newEffect = EffectLayer(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      effectId: preset.id,
      name: preset.name,
      category: preset.category,
      icon: preset.icon,
      startTime: currentPos,
      endTime: (currentPos + 3).clamp(0, duration),
    );
    
    setState(() {
      _effectLayers.add(newEffect);
      _selectedEffectId = newEffect.id;
    });
    
    _showSnackBar('Effect added: ${preset.name}');
  }

  /// Select an effect layer
  void _selectEffectLayer(String id) {
    setState(() {
      _selectedEffectId = id;
      _selectedTool = 'effects';
    });
  }

  /// Delete an effect layer
  void _deleteEffectLayer(String id) {
    _saveStateToHistory();
    setState(() {
      _effectLayers.removeWhere((e) => e.id == id);
      if (_selectedEffectId == id) {
        _selectedEffectId = null;
      }
    });
    _showSnackBar('Effect removed');
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
                      _buildTextBackgroundTab(),
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

  Widget _buildTextBackgroundTab() {
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
    // Use unified timeline position for layer visibility
    final currentTime = _currentTimelinePosition;
    
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
                  // Delete button (top-right) - larger hit area for mobile
                  Positioned(
                    top: -28,
                    right: -28,
                    child: GestureDetector(
                      onTap: () {
                        _saveStateToHistory();
                        setState(() {
                          _textOverlays.removeWhere((t) => t.id == overlay.id);
                          if (_selectedTextId == overlay.id) {
                            _selectedTextId = null;
                          }
                        });
                        _showSnackBar('Text deleted');
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: Colors.red.withOpacity(0.5), blurRadius: 10, spreadRadius: 2)],
                        ),
                        child: const Icon(Icons.close, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                  // Edit button (top-left) - opens inline editor
                  Positioned(
                    top: -28,
                    left: -28,
                    child: GestureDetector(
                      onTap: () => _openInlineTextEditor(overlay),
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: AppTheme.primary.withOpacity(0.5), blurRadius: 10, spreadRadius: 2)],
                        ),
                        child: const Icon(Icons.edit, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                  // Scale handle (bottom-right corner) - larger for mobile touch
                  Positioned(
                    bottom: -20,
                    right: -20,
                    child: GestureDetector(
                      onPanStart: (_) {
                        // Capture initial scale
                      },
                      onPanUpdate: (details) {
                        setState(() {
                          final scaleDelta = 1 + (details.delta.dx + details.delta.dy) * 0.008;
                          overlay.scale = (overlay.scale * scaleDelta).clamp(0.5, 3.0);
                        });
                      },
                      onPanEnd: (_) {
                        _showSnackBar('Scale: ${(overlay.scale * 100).round()}%');
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppTheme.primary, width: 3),
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 8)],
                        ),
                        child: const Icon(Icons.open_in_full, color: AppTheme.primary, size: 16),
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

  /// Build caption overlays positioned at bottom of video preview
  /// Synced with unified timeline position
  List<Widget> _buildCaptionOverlays(BoxConstraints constraints) {
    // Use unified timeline position for layer visibility
    final currentTime = _currentTimelinePosition;
    
    return _captionLayers.where((caption) {
      // Only show caption if current time is within its time range
      return currentTime >= caption.startTime && currentTime <= caption.endTime;
    }).map((caption) {
      final isSelected = caption.id == _selectedCaptionId;
      
      return Positioned(
        bottom: 16,
        left: 16,
        right: 16,
        child: GestureDetector(
          onTap: () {
            setState(() {
              _selectedCaptionId = caption.id;
              _selectedTool = 'captions';
            });
          },
          child: Center(
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.75),
                borderRadius: BorderRadius.circular(8),
                border: isSelected 
                    ? Border.all(color: const Color(0xFF06B6D4), width: 2)
                    : null,
                boxShadow: isSelected 
                    ? [BoxShadow(color: const Color(0xFF06B6D4).withOpacity(0.3), blurRadius: 12)]
                    : null,
              ),
              child: Text(
                caption.text,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
                textAlign: TextAlign.center,
              ),
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

  /// Pick and load a new video (for replace functionality)
  Future<void> _pickAndLoadVideo() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        allowMultiple: false,
      );
      
      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        if (file.path != null) {
          // Load the selected video
          await _initializeVideoFromLocalFile(file.path!);
        }
      }
    } catch (e) {
      debugPrint('Error picking video: $e');
      _showSnackBar('Failed to pick video');
    }
  }

  /// Generate auto captions (placeholder)
  void _generateCaptions() {
    _showSnackBar('Auto captions coming soon!');
    // TODO: Implement actual caption generation using speech-to-text
  }

  /// Show media picker bottom sheet
  void _showMediaPickerSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A1A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Add Media',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            ListTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.video_library, color: AppTheme.primary),
              ),
              title: const Text('Video from Gallery', style: TextStyle(color: Colors.white)),
              subtitle: Text('Select a video file', style: TextStyle(color: Colors.white.withOpacity(0.5))),
              onTap: () {
                Navigator.pop(context);
                _pickAndLoadVideo();
              },
            ),
            ListTile(
              leading: Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.cloud_download, color: Colors.blue),
              ),
              title: const Text('Recent Videos', style: TextStyle(color: Colors.white)),
              subtitle: Text('From your uploads', style: TextStyle(color: Colors.white.withOpacity(0.5))),
              onTap: () {
                Navigator.pop(context);
                // Show recent videos
              },
            ),
            const SizedBox(height: 20),
          ],
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
  final Duration totalDuration; // Total timeline duration for multi-clip support

  const _FullScreenVideoDialog({
    required this.videoController,
    required this.onClose,
    required this.totalDuration,
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
    // Use widget.totalDuration for seek calculation to support multi-clip timeline
    final newPosition = Duration(
      milliseconds: (widget.totalDuration.inMilliseconds * progress).round(),
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
                          // Use widget.totalDuration for progress calculation to support multi-clip timeline
                          final progress = widget.totalDuration.inMilliseconds > 0
                              ? value.position.inMilliseconds / widget.totalDuration.inMilliseconds
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
                                  
                                  // Total duration - uses widget.totalDuration for multi-clip support
                                  SizedBox(
                                    width: 60,
                                    child: Text(
                                      _formatDuration(widget.totalDuration),
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

/// Clip edit tool model for the editing bottom sheet
class _ClipEditTool {
  final String id;
  final String name;
  final IconData icon;
  final VoidCallback onTap;
  final bool isDestructive;

  const _ClipEditTool({
    required this.id,
    required this.name,
    required this.icon,
    required this.onTap,
    this.isDestructive = false,
  });
}
