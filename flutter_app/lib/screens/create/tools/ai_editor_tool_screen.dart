import 'dart:io';
import 'dart:async';
import 'dart:typed_data';
import 'dart:math' as math;
import 'dart:ui' show ImageFilter;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:video_player/video_player.dart';
import 'package:path_provider/path_provider.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:record/record.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../core/theme.dart';
import 'widgets/text_edit_panel.dart';

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
  // Extended text styling properties
  double opacity;
  bool strokeEnabled;
  Color strokeColor;
  double strokeWidth;
  bool glowEnabled;
  Color glowColor;
  double glowIntensity;
  bool shadowEnabled;
  Color shadowColor;
  double letterSpacing;
  double curveAmount;
  String animation;
  String bubbleStyle;
  // Transform properties
  double rotation;
  double scaleX;
  double scaleY;

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
    // Extended defaults
    this.opacity = 1.0,
    this.strokeEnabled = false,
    this.strokeColor = Colors.black,
    this.strokeWidth = 2.0,
    this.glowEnabled = false,
    this.glowColor = Colors.white,
    this.glowIntensity = 10.0,
    this.shadowEnabled = false,
    this.shadowColor = Colors.black,
    this.letterSpacing = 0.0,
    this.curveAmount = 0.0,
    this.animation = 'none',
    this.bubbleStyle = 'none',
    // Transform defaults
    this.rotation = 0.0,
    this.scaleX = 1.0,
    this.scaleY = 1.0,
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
  List<double> waveformData; // Normalized amplitudes 0-1
  
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
    List<double>? waveformData,
  }) : waveformData = waveformData ?? [];
  
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

/// Drawing stroke data model
class DrawingStroke {
  String id;
  List<Offset> points;
  Color color;
  double size;
  String tool; // 'brush' or 'eraser'
  
  DrawingStroke({
    required this.id,
    required this.points,
    required this.color,
    required this.size,
    required this.tool,
  });
}

/// Drawing layer data model for canvas drawings
class DrawingLayer {
  String id;
  List<DrawingStroke> strokes;
  double startTime;
  double endTime;
  
  DrawingLayer({
    required this.id,
    required this.strokes,
    this.startTime = 0,
    this.endTime = 5,
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

/// Clip animation data model
class ClipAnimation {
  String id;
  String type; // 'in', 'out', or 'combo'
  double duration;
  
  ClipAnimation({
    required this.id,
    required this.type,
    this.duration = 0.5,
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
  double volume; // Clip volume (0-2, where 1=100%, 2=200%)
  double speed; // Clip playback speed (0.25-4x)
  ClipAnimation? animationIn; // Entry animation
  ClipAnimation? animationOut; // Exit animation
  bool aiEnhanced; // Whether AI auto-adjustments have been applied
  
  VideoClip({
    required this.id,
    required this.url,
    required this.duration,
    this.startTime = 0,
    double? inPoint,
    double? outPoint,
    this.thumbnails,
    this.volume = 1.0,
    this.speed = 1.0,
    this.animationIn,
    this.animationOut,
    this.aiEnhanced = false,
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

/// Video overlay data model for picture-in-picture
class VideoOverlay {
  String id;
  String url;
  double duration;
  double startTime;
  double endTime;
  Offset position; // Normalized 0-1 position on canvas
  double width; // Normalized width (0-1)
  double height; // Normalized height (0-1)
  double scaleX;
  double scaleY;
  double volume;
  double opacity;
  VideoPlayerController? controller;
  bool isInitialized;
  List<Uint8List>? thumbnails; // Array of thumbnail image bytes
  
  VideoOverlay({
    required this.id,
    required this.url,
    required this.duration,
    this.startTime = 0,
    double? endTime,
    this.position = const Offset(0.6, 0.3),
    this.width = 0.35,
    this.height = 0.35,
    this.scaleX = 1.0,
    this.scaleY = 1.0,
    this.volume = 1.0,
    this.opacity = 1.0,
    this.controller,
    this.isInitialized = false,
    this.thumbnails,
  }) : endTime = endTime ?? duration;
  
  void dispose() {
    controller?.dispose();
  }
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
enum LayerType { text, audio, sticker, caption, effect, videoOverlay }

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
  final double volume;
  final double speed;
  
  VideoClipSnapshot({
    required this.id,
    required this.url,
    required this.duration,
    required this.startTime,
    required this.inPoint,
    required this.outPoint,
    this.volume = 1.0,
    this.speed = 1.0,
  });
  
  factory VideoClipSnapshot.from(VideoClip clip) => VideoClipSnapshot(
    id: clip.id,
    url: clip.url,
    duration: clip.duration,
    startTime: clip.startTime,
    inPoint: clip.inPoint,
    outPoint: clip.outPoint,
    volume: clip.volume,
    speed: clip.speed,
  );
  
  VideoClip toClip() => VideoClip(
    id: id,
    url: url,
    duration: duration,
    startTime: startTime,
    inPoint: inPoint,
    outPoint: outPoint,
    volume: volume,
    speed: speed,
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
  final List<double> waveformData;
  
  AudioLayerSnapshot({
    required this.id,
    required this.name,
    required this.filePath,
    required this.startTime,
    required this.endTime,
    required this.volume,
    required this.trackIndex,
    required this.waveformData,
  });
  
  factory AudioLayerSnapshot.from(AudioLayer layer) => AudioLayerSnapshot(
    id: layer.id,
    name: layer.name,
    filePath: layer.filePath,
    startTime: layer.startTime,
    endTime: layer.endTime,
    volume: layer.volume,
    trackIndex: layer.trackIndex,
    waveformData: List.from(layer.waveformData),
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
  // Output/Export settings
  bool _showOutputSettings = false;
  String _outputResolution = '1080p'; // '480p', '720p', '1080p', '2K/4K'
  int _outputFrameRate = 30; // 24, 25, 30, 50, 60
  int _outputBitrate = 10; // 5, 10, 20, 50, 100 Mbps
  bool _opticalFlowEnabled = false;
  // Export state
  bool _isExporting = false;
  double _exportProgress = 0;
  String _exportStage = '';

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
  
  // Editing layer type: 'clip' for main video clips, 'overlay' for video overlays
  String _editingLayerType = 'clip'; // 'clip' or 'overlay'
  
  // Adjust panel state
  String _adjustPanelTab = 'adjust'; // 'filters' or 'adjust'
  String _adjustSubTab = 'customize'; // 'smart' or 'customize'
  String _selectedAdjustmentId = 'brightness';
  bool _isAIEnhancing = false; // AI auto-adjust loading state
  
  // Stickers, Aspect Ratio, Background state
  String _selectedAspectRatio = 'original';
  Color _backgroundColor = Colors.black;
  double _backgroundBlur = 0.0;
  String? _backgroundImage;
  String _backgroundTab = 'main'; // 'main', 'color', 'image', 'blur'
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
  bool _showTextEditPanel = false; // Comprehensive text edit panel
  
  // Audio menu mode state - activated by clicking "Audio" tool
  bool _isAudioMenuMode = false;
  
  // Audio recording state
  bool _isRecording = false;
  bool _showRecordingOverlay = false;
  int _recordingDuration = 0;
  DateTime? _recordingStartTime;
  String? _recordedFilePath;
  
  // Edit menu mode state - activated by clicking "Edit" tool
  bool _isEditMenuMode = false;
  
  // Edit sub-panel state for volume/speed controls
  String _editSubPanel = 'none'; // 'none', 'volume', 'speed'
  
  // Speed mode: 'normal' for linear slider, 'curve' for presets
  String _speedMode = 'normal';
  
  // Selected speed curve preset
  String? _selectedSpeedCurve;
  
  // Speed curve presets
  final List<Map<String, dynamic>> _speedCurvePresets = [
    {'id': 'montage', 'name': 'Montage', 'description': 'Quick cuts with varying speed'},
    {'id': 'hero', 'name': 'Hero', 'description': 'Slow-mo emphasis on action'},
    {'id': 'bullet', 'name': 'Bullet', 'description': 'Extreme slow-motion effect'},
    {'id': 'jump_cut', 'name': 'Jump Cut', 'description': 'Sudden speed changes'},
    {'id': 'ramp_up', 'name': 'Ramp Up', 'description': 'Gradually accelerate'},
    {'id': 'ramp_down', 'name': 'Ramp Down', 'description': 'Gradually decelerate'},
  ];
  
  // Effects menu mode state - activated by clicking "Effects" tool
  bool _isEffectsMenuMode = false;
  
  // Overlay menu mode state - activated by clicking "Overlay" tool
  bool _isOverlayMenuMode = false;
  
  // Video overlay layers
  List<VideoOverlay> _videoOverlays = [];
  String? _selectedOverlayId;
  String? _draggingOverlayId;
  
  // Captions menu mode state - activated by clicking "Captions" tool
  bool _isCaptionsMenuMode = false;
  
  // Aspect ratio menu mode state - activated by clicking "Aspect" tool
  bool _isAspectMenuMode = false;
  
  // Background menu mode state - activated by clicking "Background" tool
  bool _isBackgroundMenuMode = false;
  
  // Draw mode state - activated by clicking "Draw" in Text menu
  bool _isDrawMode = false;
  String _drawTool = 'brush'; // 'brush' or 'eraser'
  Color _drawColor = Colors.white;
  double _drawSize = 5.0;
  List<DrawingLayer> _drawingLayers = [];
  List<DrawingStroke> _currentStrokes = [];
  String? _selectedDrawingId;
  List<Offset> _currentDrawingPoints = [];
  
  // Drawing undo/redo for strokes (local to current drawing session)
  final List<List<DrawingStroke>> _drawUndoStack = [];
  final List<List<DrawingStroke>> _drawRedoStack = [];
  
  // Drawing color presets
  final List<Color> _drawColorPresets = [
    Colors.white,
    const Color(0xFFFF4444),
    const Color(0xFF44FF44),
    const Color(0xFF4444FF),
    const Color(0xFFFFFF44),
    const Color(0xFFFF44FF),
    const Color(0xFF44FFFF),
    const Color(0xFFFFA500),
    const Color(0xFFFF69B4),
    const Color(0xFF8B5CF6),
  ];
  
  // Speed presets (legacy)
  final List<Map<String, dynamic>> _speedPresets = [
    {'value': 0.25, 'label': '0.25x'},
    {'value': 0.5, 'label': '0.5x'},
    {'value': 0.75, 'label': '0.75x'},
    {'value': 1.0, 'label': '1x'},
    {'value': 1.25, 'label': '1.25x'},
    {'value': 1.5, 'label': '1.5x'},
    {'value': 2.0, 'label': '2x'},
    {'value': 3.0, 'label': '3x'},
  ];
  
  // Crop mode state - activated by clicking "Crop" in Edit menu
  bool _isCropMode = false;
  String _cropAspectRatio = 'free';
  int _cropRotation = 0; // 0, 90, 180, 270
  bool _cropMirror = false;
  Rect _cropBox = const Rect.fromLTWH(0.1, 0.1, 0.8, 0.8); // Normalized 0-1
  String? _cropDragHandle;
  Offset _cropDragStart = Offset.zero;
  Rect _cropDragStartBox = const Rect.fromLTWH(0.1, 0.1, 0.8, 0.8);
  
  // Crop aspect ratio presets
  final List<Map<String, dynamic>> _cropPresets = [
    {'id': 'free', 'label': 'Free'},
    {'id': '1:1', 'label': '1:1'},
    {'id': '4:5', 'label': '4:5'},
    {'id': '16:9', 'label': '16:9'},
    {'id': '9:16', 'label': '9:16'},
    {'id': '3:4', 'label': '3:4'},
  ];
  
  // Computed: check if any overlay menu is currently open (to hide main toolbar)
  bool get _isAnyOverlayOpen => 
      _isEditMenuMode || _isAudioMenuMode || _isTextMenuMode || 
      _isEffectsMenuMode || _isOverlayMenuMode || _isCaptionsMenuMode || 
      _isAspectMenuMode || _isBackgroundMenuMode || _showTextEditPanel || _isDrawMode || _isCropMode;
  
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
          waveformData: s.waveformData,
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
    // Dispose all video overlay controllers
    for (final overlay in _videoOverlays) {
      overlay.dispose();
    }
    // Dispose audio recorder
    _recordingTimer?.cancel();
    _audioRecorder.dispose();
    super.dispose();
  }

  // ============================================
  // AUDIO LAYER FUNCTIONS
  // ============================================
  
  /// Generate waveform data from a seed for consistent visualization
  List<double> _generateWaveformFromSeed(int seed, int samples) {
    final random = math.Random(seed);
    final waveform = <double>[];
    
    for (int i = 0; i < samples; i++) {
      // Create organic-looking waveform with multiple frequencies
      final base = random.nextDouble() * 0.3 + 0.2;
      final wave1 = math.sin(i * 0.2 + random.nextDouble()) * 0.3;
      final wave2 = math.sin(i * 0.05 + random.nextDouble() * 2) * 0.2;
      final amplitude = (base + wave1.abs() + wave2.abs()).clamp(0.1, 1.0);
      waveform.add(amplitude);
    }
    
    return waveform;
  }
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
          
          // Generate waveform data from file name hash for consistent visualization
          // This creates a pseudo-random but reproducible waveform pattern
          final waveformData = _generateWaveformFromSeed(file.name.hashCode, 100);
          
          final newAudio = AudioLayer(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            name: file.name,
            filePath: filePath,
            startTime: 0,
            endTime: math.min(audioSeconds, videoDuration),
            player: player,
            duration: audioDuration,
            waveformData: waveformData,
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
  
  // Audio recorder instance
  final AudioRecorder _audioRecorder = AudioRecorder();
  Timer? _recordingTimer;
  
  /// Start recording audio from microphone
  Future<void> _startAudioRecording() async {
    try {
      // Request microphone permission
      final status = await Permission.microphone.request();
      if (status != PermissionStatus.granted) {
        _showSnackBar('Microphone permission denied');
        return;
      }
      
      // Check if we can record
      if (!await _audioRecorder.hasPermission()) {
        _showSnackBar('Microphone permission required');
        return;
      }
      
      // Get temp directory for recording
      final tempDir = await getTemporaryDirectory();
      final filePath = '${tempDir.path}/recording_${DateTime.now().millisecondsSinceEpoch}.m4a';
      
      // Configure and start recording
      await _audioRecorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          sampleRate: 44100,
          bitRate: 128000,
        ),
        path: filePath,
      );
      
      setState(() {
        _isRecording = true;
        _showRecordingOverlay = true;
        _recordingStartTime = DateTime.now();
        _recordingDuration = 0;
        _recordedFilePath = filePath;
        _isAudioMenuMode = false;
      });
      
      // Start timer to update duration
      _recordingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (_recordingStartTime != null) {
          setState(() {
            _recordingDuration = DateTime.now().difference(_recordingStartTime!).inSeconds;
          });
        }
      });
      
    } catch (e) {
      debugPrint('Error starting recording: $e');
      _showSnackBar('Failed to start recording');
    }
  }
  
  /// Stop recording audio
  Future<void> _stopAudioRecording() async {
    try {
      _recordingTimer?.cancel();
      _recordingTimer = null;
      
      final path = await _audioRecorder.stop();
      
      if (path != null && _recordedFilePath != null) {
        // Create audio player to get duration
        final player = AudioPlayer();
        await player.setSourceDeviceFile(path);
        
        Duration? audioDuration;
        try {
          audioDuration = await player.getDuration();
        } catch (e) {
          debugPrint('Could not get audio duration: $e');
        }
        
        final videoDuration = _videoController?.value.duration.inSeconds.toDouble() ?? 30.0;
        final audioSeconds = audioDuration?.inSeconds.toDouble() ?? _recordingDuration.toDouble();
        final currentPlayhead = _currentPosition;
        
        // Generate waveform data from recording
        final waveformData = _generateWaveformFromSeed(path.hashCode, 100);
        
        final recordingName = 'Recording ${DateTime.now().hour}:${DateTime.now().minute.toString().padLeft(2, '0')}';
        
        _saveStateToHistory();
        
        final newAudio = AudioLayer(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          name: recordingName,
          filePath: path,
          startTime: currentPlayhead, // Start at playhead position
          endTime: math.min(currentPlayhead + audioSeconds, videoDuration),
          player: player,
          duration: audioDuration,
          waveformData: waveformData,
        );
        
        setState(() {
          _audioLayers.add(newAudio);
          _selectedAudioId = newAudio.id;
          _isRecording = false;
          _showRecordingOverlay = false;
          _recordingDuration = 0;
          _recordingStartTime = null;
        });
        
        _showSnackBar('"$recordingName" added to timeline');
      } else {
        setState(() {
          _isRecording = false;
          _showRecordingOverlay = false;
          _recordingDuration = 0;
        });
      }
    } catch (e) {
      debugPrint('Error stopping recording: $e');
      _showSnackBar('Failed to save recording');
      setState(() {
        _isRecording = false;
        _showRecordingOverlay = false;
        _recordingDuration = 0;
      });
    }
  }
  
  /// Cancel recording without saving
  Future<void> _cancelAudioRecording() async {
    _recordingTimer?.cancel();
    _recordingTimer = null;
    
    try {
      await _audioRecorder.stop();
      // Delete the temp file
      if (_recordedFilePath != null) {
        final file = File(_recordedFilePath!);
        if (await file.exists()) {
          await file.delete();
        }
      }
    } catch (e) {
      debugPrint('Error cancelling recording: $e');
    }
    
    setState(() {
      _isRecording = false;
      _showRecordingOverlay = false;
      _recordingDuration = 0;
      _recordingStartTime = null;
      _recordedFilePath = null;
    });
  }
  
  /// Format recording duration as MM:SS
  String _formatRecordingTime(int seconds) {
    final mins = seconds ~/ 60;
    final secs = seconds % 60;
    return '$mins:${secs.toString().padLeft(2, '0')}';
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
      final clip = activeResult.clip;
      final localTime = activeResult.localTime;
      final newPosition = Duration(milliseconds: (localTime * 1000).toInt());
      
      // Only seek if position has drifted significantly
      final currentPos = _videoController!.value.position.inMilliseconds / 1000.0;
      if ((currentPos - localTime).abs() > 0.1) {
        _videoController!.seekTo(newPosition);
      }
      
      // Apply per-clip speed and volume
      _videoController!.setPlaybackSpeed(clip.speed);
      _videoController!.setVolume(_isMuted ? 0.0 : clip.volume.clamp(0.0, 1.0));
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
      _showTextEditPanel = true; // Open text edit panel
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
        // Automatically show text edit panel when selecting text on canvas
        _showTextEditPanel = true;
      } else {
        _showTextEditPanel = false;
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
  
  // ============================================
  // DRAWING LAYER FUNCTIONS
  // ============================================
  
  /// Save current drawing strokes as a layer
  void _saveDrawingAsLayer() {
    if (_currentStrokes.isEmpty) {
      _showSnackBar('No drawing to save');
      return;
    }
    
    _saveStateToHistory();
    final videoDuration = _videoController?.value.duration.inSeconds.toDouble() ?? 10.0;
    final defaultDuration = 5.0; // 5 second default duration
    final currentPosition = _videoController?.value.position.inMilliseconds.toDouble() ?? 0;
    final layerStart = currentPosition / 1000.0;
    final layerEnd = (layerStart + defaultDuration).clamp(layerStart + 0.5, videoDuration);
    
    final newLayer = DrawingLayer(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      strokes: List.from(_currentStrokes.map((s) => DrawingStroke(
        id: s.id,
        points: List.from(s.points),
        color: s.color,
        size: s.size,
        tool: s.tool,
      ))),
      startTime: layerStart,
      endTime: layerEnd,
    );
    
    setState(() {
      _drawingLayers.add(newLayer);
      _currentStrokes.clear();
      _isDrawMode = false;
      _drawUndoStack.clear();
      _drawRedoStack.clear();
    });
    
    _showSnackBar('Drawing saved to timeline');
  }
  
  /// Delete a drawing layer
  void _deleteDrawingLayer(String id) {
    _saveStateToHistory();
    setState(() {
      _drawingLayers.removeWhere((d) => d.id == id);
      if (_selectedDrawingId == id) {
        _selectedDrawingId = null;
      }
    });
  }
  
  /// Select a drawing layer
  void _selectDrawingLayer(String? id) {
    setState(() {
      _selectedDrawingId = id;
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
  // VIDEO OVERLAY FUNCTIONS
  // ============================================
  
  /// Pick and add a video overlay
  Future<void> _addVideoOverlay() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        allowMultiple: false,
      );
      
      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        final filePath = file.path;
        
        if (filePath != null) {
          final videoFile = File(filePath);
          final fileUrl = videoFile.uri.toString();
          
          // Create a temporary controller to get duration
          final tempController = VideoPlayerController.file(videoFile);
          await tempController.initialize();
          final overlayDuration = tempController.value.duration.inMilliseconds / 1000.0;
          await tempController.dispose();
          
          // Get the main video duration for default end time
          final mainDuration = _videoController?.value.duration.inSeconds.toDouble() ?? 10.0;
          
          final newOverlay = VideoOverlay(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            url: fileUrl,
            duration: overlayDuration,
            startTime: 0,
            endTime: math.min(overlayDuration, mainDuration),
            position: const Offset(0.65, 0.25),
            width: 0.35,
            height: 0.35,
          );
          
          // Initialize the overlay's video controller
          newOverlay.controller = VideoPlayerController.file(videoFile);
          await newOverlay.controller!.initialize();
          newOverlay.controller!.setVolume(newOverlay.volume);
          newOverlay.controller!.setLooping(false);
          newOverlay.isInitialized = true;
          
          // Generate placeholder thumbnails for overlay
          final numThumbs = math.min(10, (overlayDuration * 2).ceil());
          newOverlay.thumbnails = List.generate(numThumbs, (_) => Uint8List(0));
          
          setState(() {
            _videoOverlays.add(newOverlay);
            _selectedOverlayId = newOverlay.id;
            _isOverlayMenuMode = false;
          });
          
          _showSnackBar('Video overlay added');
        }
      }
    } catch (e) {
      debugPrint('Error adding video overlay: $e');
      _showSnackBar('Failed to add overlay');
    }
  }
  
  /// Remove a video overlay
  void _removeVideoOverlay(String id) {
    final overlay = _videoOverlays.firstWhere((o) => o.id == id, orElse: () => VideoOverlay(id: '', url: '', duration: 0));
    overlay.dispose();
    
    setState(() {
      _videoOverlays.removeWhere((o) => o.id == id);
      if (_selectedOverlayId == id) {
        _selectedOverlayId = null;
      }
    });
    _showSnackBar('Overlay removed');
  }
  
  /// Update a video overlay's properties
  void _updateVideoOverlay(String id, {
    Offset? position,
    double? width,
    double? height,
    double? scaleX,
    double? scaleY,
    double? volume,
    double? opacity,
    double? startTime,
    double? endTime,
  }) {
    setState(() {
      final index = _videoOverlays.indexWhere((o) => o.id == id);
      if (index != -1) {
        final overlay = _videoOverlays[index];
        if (position != null) overlay.position = position;
        if (width != null) overlay.width = width;
        if (height != null) overlay.height = height;
        if (scaleX != null) overlay.scaleX = scaleX;
        if (scaleY != null) overlay.scaleY = scaleY;
        if (volume != null) {
          overlay.volume = volume;
          overlay.controller?.setVolume(volume);
        }
        if (opacity != null) overlay.opacity = opacity;
        if (startTime != null) overlay.startTime = startTime;
        if (endTime != null) overlay.endTime = endTime;
      }
    });
  }
  
  /// Sync video overlays to the current timeline position
  void _syncVideoOverlaysToTime(double timelineTime) {
    for (final overlay in _videoOverlays) {
      if (overlay.controller == null || !overlay.isInitialized) continue;
      
      // Check if current time is within overlay's time range
      if (timelineTime >= overlay.startTime && timelineTime <= overlay.endTime) {
        final overlayLocalTime = timelineTime - overlay.startTime;
        
        // Clamp to overlay's actual duration
        final clampedTime = overlayLocalTime.clamp(0.0, overlay.duration);
        
        // Seek if drifted more than 0.2 seconds
        final currentPos = overlay.controller!.value.position.inMilliseconds / 1000.0;
        if ((currentPos - clampedTime).abs() > 0.2) {
          overlay.controller!.seekTo(Duration(milliseconds: (clampedTime * 1000).round()));
        }
        
        // Play if main video is playing
        if (_isPlaying && !overlay.controller!.value.isPlaying) {
          overlay.controller!.play();
        } else if (!_isPlaying && overlay.controller!.value.isPlaying) {
          overlay.controller!.pause();
        }
      } else {
        // Pause and hide if outside time range
        if (overlay.controller!.value.isPlaying) {
          overlay.controller!.pause();
        }
      }
    }
  }

  // ============================================
  // MULTI-CLIP VIDEO FUNCTIONS
  // ============================================
  
  /// Add a new video clip to the end of the timeline
  void _addVideoClip(String url, double clipDuration) {
    final lastClip = _videoClips.isNotEmpty ? _videoClips.last : null;
    final startTime = lastClip != null ? lastClip.startTime + lastClip.trimmedDuration : 0.0;
    
    debugPrint('AI Editor: Adding clip with duration: $clipDuration seconds');
    
    final newClip = VideoClip(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      url: url,
      duration: clipDuration,
      startTime: startTime,
      inPoint: 0,
      outPoint: clipDuration, // Explicitly set outPoint to full duration
      thumbnails: [],
      volume: 1.0,
      speed: 1.0,
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
      // Use milliseconds for precise duration (inSeconds.toDouble() truncates!)
      final durationMs = _videoController!.value.duration.inMilliseconds;
      final duration = durationMs / 1000.0;
      debugPrint('AI Editor: Initializing clip with duration: $duration seconds (${durationMs}ms)');
      setState(() {
        _videoClips.add(VideoClip(
          id: 'primary',
          url: _videoUrl!,
          duration: duration,
          startTime: 0,
          inPoint: 0,
          outPoint: duration, // Explicitly set outPoint to full duration
          thumbnails: [],
          volume: 1.0,
          speed: 1.0,
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
    // Load the clip's existing volume and speed values
    final clip = _videoClips.firstWhere((c) => c.id == clipId, orElse: () => _videoClips.first);
    setState(() {
      _editingClipId = clipId;
      _selectedClipId = clipId;
      _clipSpeed = clip.speed;
      _clipVolume = clip.volume;
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
      volume: clip.volume,
      speed: clip.speed,
    );
    final secondClip = VideoClip(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      url: clip.url,
      duration: clip.duration,
      startTime: 0, // Will be recalculated
      inPoint: splitPoint,
      outPoint: clip.outPoint,
      volume: clip.volume,
      speed: clip.speed,
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
      volume: clip.volume,
      speed: clip.speed,
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
  
  /// Apply clip speed to the selected clip or overlay
  void _applyClipSpeed() {
    if (_editingClipId == null) {
      _showSnackBar('Select a layer first');
      return;
    }
    
    if (_editingLayerType == 'overlay') {
      // Speed for overlays - show coming soon message
      _showSnackBar('Speed for overlays coming soon');
    } else {
      // Update the clip's speed in state
      final clipIndex = _videoClips.indexWhere((c) => c.id == _editingClipId);
      if (clipIndex != -1) {
        setState(() {
          _videoClips[clipIndex].speed = _clipSpeed;
        });
      }
      
      // Apply real-time preview
      _videoController?.setPlaybackSpeed(_clipSpeed);
      _showSnackBar('Speed set to ${_clipSpeed.toStringAsFixed(1)}x');
    }
  }
  
  /// Apply clip volume to the selected clip or overlay (clipVolume is 0-2 where 1=100%, 2=200%)
  void _applyClipVolume() {
    if (_editingClipId == null) {
      _showSnackBar('Select a layer first');
      return;
    }
    
    if (_editingLayerType == 'overlay') {
      // Update the overlay's volume
      _updateVideoOverlay(_editingClipId!, volume: _clipVolume);
      _showSnackBar('Overlay volume set to ${(_clipVolume * 100).round()}');
    } else {
      // Update the clip's volume in state
      final clipIndex = _videoClips.indexWhere((c) => c.id == _editingClipId);
      if (clipIndex != -1) {
        setState(() {
          _videoClips[clipIndex].volume = _clipVolume;
        });
      }
      
      // Apply real-time preview (capped at 1.0)
      _videoController?.setVolume(_clipVolume.clamp(0.0, 1.0));
      _showSnackBar('Volume set to ${(_clipVolume * 100).round()}');
    }
  }
  
  /// Show animations bottom sheet
  void _showAnimationsBottomSheet() {
    final animationPresetsIn = [
      {'id': 'none', 'name': 'None', 'icon': Icons.block},
      {'id': 'fade_in', 'name': 'Fade', 'icon': Icons.gradient},
      {'id': 'slide_left', 'name': 'Slide Left', 'icon': Icons.arrow_back},
      {'id': 'slide_right', 'name': 'Slide Right', 'icon': Icons.arrow_forward},
      {'id': 'slide_up', 'name': 'Slide Up', 'icon': Icons.arrow_upward},
      {'id': 'slide_down', 'name': 'Slide Down', 'icon': Icons.arrow_downward},
      {'id': 'zoom_in', 'name': 'Zoom', 'icon': Icons.zoom_in},
      {'id': 'spin_in', 'name': 'Spin', 'icon': Icons.rotate_right},
      {'id': 'bounce_in', 'name': 'Bounce', 'icon': Icons.swap_vert},
      {'id': 'flip_in', 'name': 'Flip', 'icon': Icons.flip},
    ];
    
    final animationPresetsOut = [
      {'id': 'none', 'name': 'None', 'icon': Icons.block},
      {'id': 'fade_out', 'name': 'Fade', 'icon': Icons.gradient},
      {'id': 'slide_left_out', 'name': 'Slide Left', 'icon': Icons.arrow_back},
      {'id': 'slide_right_out', 'name': 'Slide Right', 'icon': Icons.arrow_forward},
      {'id': 'slide_up_out', 'name': 'Slide Up', 'icon': Icons.arrow_upward},
      {'id': 'slide_down_out', 'name': 'Slide Down', 'icon': Icons.arrow_downward},
      {'id': 'zoom_out', 'name': 'Zoom', 'icon': Icons.zoom_out},
      {'id': 'spin_out', 'name': 'Spin', 'icon': Icons.rotate_left},
      {'id': 'shrink', 'name': 'Shrink', 'icon': Icons.compress},
      {'id': 'flip_out', 'name': 'Flip', 'icon': Icons.flip},
    ];
    
    final animationPresetsCombo = [
      {'id': 'none', 'name': 'None', 'icon': Icons.block},
      {'id': 'rock', 'name': 'Rock', 'icon': Icons.show_chart},
      {'id': 'swing', 'name': 'Swing', 'icon': Icons.vibration},
      {'id': 'pulse', 'name': 'Pulse', 'icon': Icons.favorite},
      {'id': 'shake', 'name': 'Shake', 'icon': Icons.vibration},
      {'id': 'wobble', 'name': 'Wobble', 'icon': Icons.waves},
      {'id': 'float', 'name': 'Float', 'icon': Icons.air},
      {'id': 'breathe', 'name': 'Breathe', 'icon': Icons.air},
      {'id': 'glitch', 'name': 'Glitch', 'icon': Icons.bolt},
      {'id': 'flash', 'name': 'Flash', 'icon': Icons.flash_on},
    ];
    
    int selectedTabIndex = 0;
    String? selectedAnimation;
    double animationDuration = 0.5;
    
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A1A1A),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          final currentPresets = selectedTabIndex == 0 
              ? animationPresetsIn 
              : selectedTabIndex == 1 
                  ? animationPresetsOut 
                  : animationPresetsCombo;
          
          return Container(
            padding: const EdgeInsets.only(top: 8),
            height: 420,
            child: Column(
              children: [
                // Handle bar
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                
                // Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: const Icon(Icons.arrow_back, color: Colors.white, size: 24),
                      ),
                      const Text(
                        'Animations',
                        style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      GestureDetector(
                        onTap: () {
                          if (selectedAnimation != null && selectedAnimation != 'none') {
                            _showSnackBar('Animation applied');
                          }
                          Navigator.pop(context);
                        },
                        child: const Icon(Icons.check, color: Colors.white, size: 24),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                
                // Tab bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      for (int i = 0; i < 3; i++)
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              setModalState(() {
                                selectedTabIndex = i;
                                selectedAnimation = null;
                              });
                            },
                            child: Container(
                              margin: EdgeInsets.only(left: i > 0 ? 8 : 0),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: selectedTabIndex == i 
                                    ? Theme.of(context).colorScheme.primary 
                                    : Colors.white.withOpacity(0.05),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: selectedTabIndex == i 
                                      ? Theme.of(context).colorScheme.primary 
                                      : Colors.white.withOpacity(0.1),
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  ['In', 'Out', 'Combo'][i],
                                  style: TextStyle(
                                    color: selectedTabIndex == i ? Colors.white : Colors.white70,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                
                // Animation grid
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: GridView.builder(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 5,
                        mainAxisSpacing: 8,
                        crossAxisSpacing: 8,
                        childAspectRatio: 0.85,
                      ),
                      itemCount: currentPresets.length,
                      itemBuilder: (context, index) {
                        final anim = currentPresets[index];
                        final isSelected = selectedAnimation == anim['id'];
                        return GestureDetector(
                          onTap: () {
                            setModalState(() {
                              selectedAnimation = anim['id'] as String;
                            });
                          },
                          child: Container(
                            decoration: BoxDecoration(
                              color: isSelected 
                                  ? Theme.of(context).colorScheme.primary.withOpacity(0.2) 
                                  : Colors.white.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isSelected 
                                    ? Theme.of(context).colorScheme.primary 
                                    : Colors.white.withOpacity(0.1),
                              ),
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  anim['icon'] as IconData,
                                  color: Colors.white.withOpacity(0.8),
                                  size: 20,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  anim['name'] as String,
                                  style: TextStyle(
                                    fontSize: 9,
                                    color: Colors.white.withOpacity(0.8),
                                    fontWeight: FontWeight.w500,
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
                ),
                
                // Duration slider (only show when animation is selected)
                if (selectedAnimation != null && selectedAnimation != 'none')
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        Text(
                          'Duration',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.6),
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: SliderTheme(
                            data: SliderTheme.of(context).copyWith(
                              trackHeight: 4,
                              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
                              activeTrackColor: Theme.of(context).colorScheme.primary,
                              inactiveTrackColor: Colors.white.withOpacity(0.1),
                              thumbColor: Colors.white,
                            ),
                            child: Slider(
                              value: animationDuration,
                              min: 0.1,
                              max: 2.0,
                              onChanged: (value) {
                                setModalState(() {
                                  animationDuration = value;
                                });
                              },
                            ),
                          ),
                        ),
                        SizedBox(
                          width: 40,
                          child: Text(
                            '${animationDuration.toStringAsFixed(1)}s',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.primary,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                            textAlign: TextAlign.right,
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 24),
              ],
            ),
          );
        },
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

  Future<void> _handleExport() async {
    if (_videoClips.isEmpty) {
      _showSnackBar('No video to export');
      return;
    }

    // Prevent multiple simultaneous exports
    if (_isExporting) {
      _showSnackBar('Export already in progress');
      return;
    }

    setState(() {
      _isExporting = true;
      _exportProgress = 0;
      _exportStage = 'Preparing export...';
    });

    try {
      // Get the active clip
      final activeClip = _videoClips.isNotEmpty ? _videoClips.first : null;
      final playbackSpeed = activeClip?.speed ?? 1.0;
      final clipVolume = activeClip?.volume ?? 1.0;
      final trimmedDuration = activeClip != null 
          ? (activeClip.outPoint - activeClip.inPoint) 
          : (_videoController?.value.duration.inSeconds.toDouble() ?? 0);
      
      setState(() {
        _exportStage = 'Processing video...';
        _exportProgress = 10;
      });

      // Get video file from clip URL or fall back to _videoFile
      File? sourceFile;
      if (activeClip != null && activeClip.url.isNotEmpty) {
        // Check if the clip URL is a local file path
        if (activeClip.url.startsWith('/') || activeClip.url.startsWith('file://')) {
          final path = activeClip.url.replaceFirst('file://', '');
          sourceFile = File(path);
        }
      }
      
      // Fall back to _videoFile if clip source not available
      sourceFile ??= _videoFile;
      
      if (sourceFile == null || !await sourceFile.exists()) {
        throw Exception('Video file not found');
      }

      // Read the original video file bytes
      final originalBytes = await sourceFile.readAsBytes();
      
      setState(() {
        _exportStage = 'Applying speed: ${playbackSpeed.toStringAsFixed(1)}x...';
        _exportProgress = 30;
      });
      await Future.delayed(const Duration(milliseconds: 300));

      setState(() {
        _exportStage = 'Applying volume: ${(clipVolume * 100).toInt()}%...';
        _exportProgress = 50;
      });
      await Future.delayed(const Duration(milliseconds: 300));

      setState(() {
        _exportStage = 'Rendering at $_outputResolution...';
        _exportProgress = 70;
      });
      await Future.delayed(const Duration(milliseconds: 300));

      // Generate unique filename with timestamp
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final extension = _videoFile!.path.split('.').last;
      final fileName = 'ai-editor-export-$timestamp.$extension';

      // Save to device gallery
      setState(() {
        _exportStage = 'Saving to gallery...';
        _exportProgress = 90;
      });

      // Try saving to gallery first
      String? savedPath;
      try {
        savedPath = await _saveToGallery(originalBytes, fileName, isVideo: true);
      } catch (e) {
        debugPrint('Gallery save failed: $e');
      }

      if (savedPath != null) {
        setState(() {
          _exportProgress = 100;
          _exportStage = 'Complete!';
        });
        await Future.delayed(const Duration(milliseconds: 300));
        
        _showSnackBar('Video exported to gallery!');
      } else {
        // Fallback: save to app documents with unique name
        final appDir = await getApplicationDocumentsDirectory();
        final exportDir = Directory('${appDir.path}/exports');
        if (!await exportDir.exists()) {
          await exportDir.create(recursive: true);
        }
        
        // Use unique filename to avoid overwriting
        final outputFile = File('${exportDir.path}/$fileName');
        await outputFile.writeAsBytes(originalBytes);
        
        setState(() {
          _exportProgress = 100;
          _exportStage = 'Complete!';
        });
        await Future.delayed(const Duration(milliseconds: 300));
        
        _showSnackBar('Video saved locally!');
      }

    } catch (e) {
      debugPrint('Export error: $e');
      _showSnackBar('Export failed: ${e.toString()}');
    } finally {
      // Always reset export state
      if (mounted) {
        setState(() {
          _isExporting = false;
          _exportProgress = 0;
          _exportStage = '';
        });
      }
    }
  }
  
  /// Save file to device gallery using platform channel
  Future<String?> _saveToGallery(Uint8List bytes, String fileName, {bool isVideo = false}) async {
    try {
      const channel = MethodChannel('com.wolfine.app/gallery');
      final result = await channel.invokeMethod<String>('saveToGallery', {
        'bytes': bytes,
        'fileName': fileName,
        'isVideo': isVideo,
      });
      return result;
    } catch (e) {
      debugPrint('Error saving to gallery: $e');
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    // Calculate video preview height - scales down when text edit panel is open
    final screenHeight = MediaQuery.of(context).size.height;
    final keyboardHeight = MediaQuery.of(context).viewInsets.bottom;
    final hasKeyboard = keyboardHeight > 0;
    
    // Dynamic max height based on text panel and keyboard state
    double videoMaxHeight;
    if (_showTextEditPanel || hasKeyboard) {
      // Scale down video when text panel or keyboard is open
      videoMaxHeight = (screenHeight * 0.25).clamp(100.0, 180.0);
    } else {
      videoMaxHeight = 280.0;
    }
    
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      resizeToAvoidBottomInset: true, // Allow keyboard to push content up
      body: SafeArea(
        // Main layout: Stack to allow export overlay on top
        child: Stack(
          children: [
            // Main content column
            Column(
              children: [
                _buildTopBar(),
                // Video preview - Scales down when text panel/keyboard is open (BoxFit.contain behavior)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  curve: Curves.easeInOut,
                  constraints: BoxConstraints(
                    maxHeight: videoMaxHeight,
                    minHeight: _showTextEditPanel || hasKeyboard ? 100.0 : 180.0,
                  ),
                  margin: const EdgeInsets.symmetric(horizontal: 8),
                  clipBehavior: Clip.hardEdge,
                  decoration: const BoxDecoration(
                    color: Colors.black,
                  ),
                  child: _buildVideoPreviewArea(),
                ),
                // Fixed position elements below video - always visible
                if (_isVideoInitialized && _videoController != null)
                  _buildVideoControlBar(),
                // Dynamic UI: Show timeline OR settings panel based on active tool
                // This section expands to fill remaining space, fixed at bottom
                if (_isVideoInitialized && _videoController != null)
                  Expanded(
                    child: Container(
                      constraints: BoxConstraints(
                        maxHeight: _showTextEditPanel ? 450 : 320,
                      ),
                      child: _buildDynamicBottomArea(),
                    ),
                  ),
              ],
            ),
            
            // Export Progress Overlay
            if (_isExporting)
              Positioned.fill(
                child: Container(
                  color: Colors.black.withOpacity(0.9),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Circular progress indicator
                      SizedBox(
                        width: 96,
                        height: 96,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 96,
                              height: 96,
                              child: CircularProgressIndicator(
                                value: _exportProgress / 100,
                                strokeWidth: 4,
                                backgroundColor: Colors.white.withOpacity(0.2),
                                valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
                              ),
                            ),
                            Text(
                              '${_exportProgress.toInt()}%',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      
                      // Stage text
                      const Text(
                        'Exporting Video',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _exportStage,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.6),
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 24),
                      
                      // Settings summary
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _outputResolution,
                              style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
                            ),
                            Container(
                              width: 4,
                              height: 4,
                              margin: const EdgeInsets.symmetric(horizontal: 8),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.3),
                                shape: BoxShape.circle,
                              ),
                            ),
                            Text(
                              '${_outputFrameRate}fps',
                              style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
                            ),
                            Container(
                              width: 4,
                              height: 4,
                              margin: const EdgeInsets.symmetric(horizontal: 8),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.3),
                                shape: BoxShape.circle,
                              ),
                            ),
                            Text(
                              '${_outputBitrate}Mbps',
                              style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      
                      // Cancel button
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _isExporting = false;
                            _exportProgress = 0;
                            _exportStage = '';
                          });
                          _showSnackBar('Export cancelled');
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Cancel',
                            style: TextStyle(
                              color: Colors.red,
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
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
            // Output Settings Button
            GestureDetector(
              onTap: () => _showOutputSettingsSheet(),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white.withOpacity(0.2)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _outputResolution.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.keyboard_arrow_down, color: Colors.white, size: 16),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 8),
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

  /// Show output settings dropdown from top
  void _showOutputSettingsSheet() {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Output Settings',
      barrierColor: Colors.black.withOpacity(0.5),
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (context, animation, secondaryAnimation) {
        return Align(
          alignment: Alignment.topCenter,
          child: Material(
            color: Colors.transparent,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0, -1),
                end: Offset.zero,
              ).animate(CurvedAnimation(
                parent: animation,
                curve: Curves.easeOutCubic,
              )),
              child: FadeTransition(
                opacity: animation,
                child: StatefulBuilder(
                  builder: (context, setSheetState) => Container(
                    width: double.infinity,
                    margin: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
                    padding: const EdgeInsets.all(12),
                    decoration: const BoxDecoration(
                      color: Color(0xFF0A0A0A),
                      borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 20,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                const Text(
                                  'Output Settings',
                                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  width: 16,
                                  height: 2,
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary,
                                    borderRadius: BorderRadius.circular(1),
                                  ),
                                ),
                              ],
                            ),
                            GestureDetector(
                              onTap: () => Navigator.of(context).pop(),
                              child: Container(
                                width: 20,
                                height: 20,
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close, size: 12, color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        
                        // Vertical Stack Layout - One item per row
                        // Resolution
                        _buildSettingsRow(
                          setSheetState,
                          'Resolution',
                          _outputResolution,
                          ['480p', '720p', '1080p', '2K/4K'],
                          ['480p', '720p', '1080p', '4K'],
                          (v) => _outputResolution = v,
                          showHelp: true,
                        ),
                        const SizedBox(height: 8),
                        
                        // Frame Rate
                        _buildSettingsRowInt(
                          setSheetState,
                          'Frame Rate',
                          _outputFrameRate,
                          [24, 25, 30, 50, 60],
                          (v) => _outputFrameRate = v,
                          suffix: 'fps',
                        ),
                        const SizedBox(height: 8),
                        
                        // Bitrate
                        _buildSettingsRowInt(
                          setSheetState,
                          'Bitrate (Mbps)',
                          _outputBitrate,
                          [5, 10, 20, 50, 100],
                          (v) => _outputBitrate = v,
                          suffix: ' Mbps',
                        ),
                        const SizedBox(height: 8),
                        
                        // Optical Flow
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Optical Flow', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w500)),
                                  const SizedBox(height: 2),
                                  Text('Smoother playback', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 8)),
                                ],
                              ),
                              Transform.scale(
                                scale: 0.7,
                                child: Switch(
                                  value: _opticalFlowEnabled,
                                  onChanged: (value) {
                                    setSheetState(() => _opticalFlowEnabled = value);
                                    setState(() {});
                                  },
                                  activeColor: AppTheme.primary,
                                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),
                        
                        // Estimated File Size
                        Center(
                          child: Text(
                            'Estimated file size: ~${_calculateEstimatedFileSize()} MB',
                            style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 9),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
  
  Widget _buildSettingsRow(
    StateSetter setSheetState,
    String label,
    String currentValue,
    List<String> values,
    List<String> displayLabels,
    Function(String) onChanged, {
    bool showHelp = false,
  }) {
    final currentIndex = values.indexOf(currentValue);
    final progress = currentIndex / (values.length - 1);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w500)),
                  if (showHelp) ...[
                    const SizedBox(width: 4),
                    Icon(Icons.help_outline, size: 10, color: Colors.white.withOpacity(0.4)),
                  ],
                ],
              ),
              Text(currentValue, style: TextStyle(color: AppTheme.primary, fontSize: 9, fontWeight: FontWeight.w500)),
            ],
          ),
          const SizedBox(height: 8),
          // Custom slider with purple fill from left
          LayoutBuilder(
            builder: (context, constraints) {
              final trackWidth = constraints.maxWidth;
              return GestureDetector(
                onHorizontalDragUpdate: (details) {
                  final newProgress = (details.localPosition.dx / trackWidth).clamp(0.0, 1.0);
                  final newIndex = (newProgress * (values.length - 1)).round();
                  if (newIndex != currentIndex) {
                    setSheetState(() => onChanged(values[newIndex]));
                    setState(() {});
                  }
                },
                onTapDown: (details) {
                  final newProgress = (details.localPosition.dx / trackWidth).clamp(0.0, 1.0);
                  final newIndex = (newProgress * (values.length - 1)).round();
                  setSheetState(() => onChanged(values[newIndex]));
                  setState(() {});
                },
                child: Container(
                  height: 20,
                  child: Stack(
                    alignment: Alignment.centerLeft,
                    children: [
                      // Background track
                      Container(
                        height: 3,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      // Active track (purple fill from left)
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 100),
                        height: 3,
                        width: trackWidth * progress,
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      // Thumb
                      AnimatedPositioned(
                        duration: const Duration(milliseconds: 100),
                        left: (trackWidth * progress) - 6,
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
              );
            },
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: displayLabels.map((r) => 
              Text(r, style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 8))
            ).toList(),
          ),
        ],
      ),
    );
  }
  
  Widget _buildSettingsRowInt(
    StateSetter setSheetState,
    String label,
    int currentValue,
    List<int> values,
    Function(int) onChanged, {
    String suffix = '',
  }) {
    final currentIndex = values.indexOf(currentValue);
    final progress = currentIndex / (values.length - 1);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(label, style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w500)),
              Text('$currentValue$suffix', style: TextStyle(color: AppTheme.primary, fontSize: 9, fontWeight: FontWeight.w500)),
            ],
          ),
          const SizedBox(height: 8),
          // Custom slider with purple fill from left
          LayoutBuilder(
            builder: (context, constraints) {
              final trackWidth = constraints.maxWidth;
              return GestureDetector(
                onHorizontalDragUpdate: (details) {
                  final newProgress = (details.localPosition.dx / trackWidth).clamp(0.0, 1.0);
                  final newIndex = (newProgress * (values.length - 1)).round();
                  if (newIndex != currentIndex) {
                    setSheetState(() => onChanged(values[newIndex]));
                    setState(() {});
                  }
                },
                onTapDown: (details) {
                  final newProgress = (details.localPosition.dx / trackWidth).clamp(0.0, 1.0);
                  final newIndex = (newProgress * (values.length - 1)).round();
                  setSheetState(() => onChanged(values[newIndex]));
                  setState(() {});
                },
                child: Container(
                  height: 20,
                  child: Stack(
                    alignment: Alignment.centerLeft,
                    children: [
                      // Background track
                      Container(
                        height: 3,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      // Active track (purple fill from left)
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 100),
                        height: 3,
                        width: trackWidth * progress,
                        decoration: BoxDecoration(
                          color: AppTheme.primary,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      // Thumb
                      AnimatedPositioned(
                        duration: const Duration(milliseconds: 100),
                        left: (trackWidth * progress) - 6,
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
              );
            },
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: values.map((r) => 
              Text('$r', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 8))
            ).toList(),
          ),
        ],
      ),
    );
  }
  
  int _calculateEstimatedFileSize() {
    // Rough estimation: bitrate * duration / 8 (bits to bytes) / 1024 (KB to MB)
    final durationSeconds = _totalTimelineDuration;
    return ((_outputBitrate * durationSeconds) / 8).round();
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
          // BoxFit.contain behavior: video fits within fixed container bounds
          final videoAspectRatio = _videoController!.value.aspectRatio;
          
          // Use the full available height from parent constraint (already limited to 40%/300px)
          final availableHeight = constraints.maxHeight;
          final availableWidth = constraints.maxWidth - 16;
          
          // Get target aspect ratio from selection
          double targetAspectRatio = videoAspectRatio;
          if (_selectedAspectRatio != 'original') {
            final preset = _aspectRatioPresets.firstWhere(
              (p) => p['id'] == _selectedAspectRatio,
              orElse: () => {'width': 16, 'height': 9},
            );
            targetAspectRatio = (preset['width'] as num) / (preset['height'] as num);
          }
          
          // BoxFit.contain: fit within available space while maintaining aspect ratio
          double containerWidth;
          double containerHeight;
          
          // Calculate dimensions that fit within bounds
          if (availableWidth / availableHeight > targetAspectRatio) {
            // Height constrained - use full height, calculate width
            containerHeight = availableHeight;
            containerWidth = containerHeight * targetAspectRatio;
          } else {
            // Width constrained - use full width, calculate height
            containerWidth = availableWidth;
            containerHeight = containerWidth / targetAspectRatio;
          }
          
          // Calculate video dimensions within container (Aspect Fit)
          double videoWidthPercent = 100;
          double videoHeightPercent = 100;
          
          if (_selectedAspectRatio != 'original') {
            if (videoAspectRatio > targetAspectRatio) {
              // Video is wider than container - fit by width
              videoWidthPercent = 100;
              videoHeightPercent = (targetAspectRatio / videoAspectRatio) * 100;
            } else {
              // Video is taller than container - fit by height
              videoHeightPercent = 100;
              videoWidthPercent = (videoAspectRatio / targetAspectRatio) * 100;
            }
          }
          
          // Build background decoration based on user selection
          BoxDecoration getBackgroundDecoration() {
            if (_selectedAspectRatio == 'original') {
              return const BoxDecoration(color: Colors.black);
            }
            
            if (_backgroundImage != null) {
              return BoxDecoration(
                image: DecorationImage(
                  image: NetworkImage(_backgroundImage!),
                  fit: BoxFit.cover,
                ),
              );
            }
            
            return BoxDecoration(color: _backgroundColor);
          }
          
          return Center(
            child: ClipRect(
              clipBehavior: Clip.hardEdge,
              child: Container(
                width: containerWidth,
                height: containerHeight,
                decoration: getBackgroundDecoration(),
                child: Stack(
                  clipBehavior: Clip.hardEdge,
                  children: [
                    // Blurred video background layer
                    if (_selectedAspectRatio != 'original' && _backgroundBlur > 0)
                      Positioned.fill(
                        child: Transform.scale(
                          scale: 1.1, // Prevent blur edges from showing
                          child: ImageFiltered(
                            imageFilter: ImageFilter.blur(
                              sigmaX: _backgroundBlur * 2,
                              sigmaY: _backgroundBlur * 2,
                            ),
                            child: ColorFiltered(
                              colorFilter: ColorFilter.mode(
                                Colors.black.withOpacity(0.3),
                                BlendMode.darken,
                              ),
                              child: VideoPlayer(_videoController!),
                            ),
                          ),
                        ),
                      ),
                    
                    // Main video layer - Aspect Fit with drag repositioning
                    Center(
                      child: GestureDetector(
                        onPanStart: _selectedAspectRatio == 'original' ? null : (details) {
                          setState(() {
                            _isDraggingVideo = true;
                            _dragStartPosition = details.localPosition;
                            _dragStartVideoPosition = _videoPosition;
                          });
                        },
                        onPanUpdate: _selectedAspectRatio == 'original' ? null : (details) {
                          if (!_isDraggingVideo) return;
                          final delta = details.localPosition - _dragStartPosition;
                          setState(() {
                            // Calculate max offset based on container size
                            final maxOffset = containerWidth * 0.3;
                            final newX = (_dragStartVideoPosition.dx + delta.dx).clamp(-maxOffset, maxOffset);
                            final newY = (_dragStartVideoPosition.dy + delta.dy).clamp(-maxOffset, maxOffset);
                            _videoPosition = Offset(newX, newY);
                          });
                        },
                        onPanEnd: _selectedAspectRatio == 'original' ? null : (_) {
                          setState(() => _isDraggingVideo = false);
                        },
                        child: Transform.translate(
                          offset: _selectedAspectRatio == 'original' ? Offset.zero : _videoPosition,
                          child: Container(
                            width: containerWidth * videoWidthPercent / 100,
                            height: containerHeight * videoHeightPercent / 100,
                            decoration: BoxDecoration(
                              boxShadow: _selectedAspectRatio != 'original' ? [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.3),
                                  blurRadius: 10,
                                  spreadRadius: 2,
                                ),
                              ] : null,
                            ),
                            child: ColorFiltered(
                              colorFilter: _buildColorFilter(),
                              child: AspectRatio(
                                aspectRatio: videoAspectRatio,
                                child: VideoPlayer(_videoController!),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    
                    // Video overlays (picture-in-picture)
                    ..._buildVideoOverlays(constraints),
                    // Text overlays for editing
                    ..._buildTextOverlays(constraints),
                    // Caption overlays at bottom of video
                    ..._buildCaptionOverlays(constraints),
                    // Drawing overlays (saved drawings)
                    ..._buildDrawingOverlays(constraints),
                    // Drawing canvas overlay (active when in draw mode)
                    if (_isDrawMode) _buildDrawingCanvas(containerWidth, containerHeight),
                    // Crop overlay when in crop mode
                    if (_isCropMode) _buildCropOverlay(containerWidth, containerHeight),
                    
                    // Drag indicator when not original aspect ratio
                    if (_selectedAspectRatio != 'original' && !_isDraggingVideo)
                      Positioned.fill(
                        child: IgnorePointer(
                          child: Center(
                            child: AnimatedOpacity(
                              opacity: 0.0,
                              duration: const Duration(milliseconds: 200),
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.black.withOpacity(0.5),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  Icons.open_with,
                                  color: Colors.white.withOpacity(0.7),
                                  size: 20,
                                ),
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
              child: GestureDetector(
                onTap: () {
                  // Deselect clip when tapping on empty timeline area
                  setState(() {
                    _selectedClipId = null;
                    _isEditMenuMode = false;
                    _editSubPanel = 'none';
                  });
                },
                behavior: HitTestBehavior.translucent,
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
                      
                      // Video Overlay Track (Purple layers) - between main video and audio
                      _buildVideoOverlayTrack(halfScreenPadding, trackWidth, duration),
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
                      
                      // Drawing Track (Pink/Magenta layers)
                      _buildDrawingTrack(halfScreenPadding, trackWidth, duration),
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
          
          // Fixed Add Video Button - Sticky on right side
          if (_videoUrl != null)
            Positioned(
              right: 8,
              top: 34,
              child: GestureDetector(
                onTap: _showMediaPickerSheet,
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Icon(Icons.add, color: Colors.black, size: 16),
                ),
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
  
  /// Build a single clip filmstrip segment with trim handles and indicator bars
  Widget _buildSingleClipFilmstrip(VideoClip clip, int clipIndex, bool isFirst, bool isLast) {
    final clipWidth = clip.trimmedDuration * _pixelsPerSecond;
    final thumbCount = (clipWidth / _thumbnailWidth).ceil().clamp(1, 100);
    final isSelected = clip.id == _selectedClipId;
    final isTrimming = clip.id == _trimmingClipId;
    
    const videoColor = Color(0xFFAA2222);
    
    // Check if clip has any indicators to show
    final hasAnimationIn = clip.animationIn != null;
    final hasAnimationOut = clip.animationOut != null;
    final hasAnyAnimation = hasAnimationIn || hasAnimationOut;
    final hasAIEnhanced = clip.aiEnhanced;
    
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Main filmstrip clip
        GestureDetector(
          onTap: () => setState(() {
            _selectedClipId = clip.id;
            _editingClipId = clip.id;
            _clipVolume = clip.volume;
            _clipSpeed = clip.speed;
            _isEditMenuMode = true;
            _editSubPanel = 'none';
          }),
          child: Container(
            width: clipWidth,
            height: _thumbnailHeight + 4,
            decoration: BoxDecoration(
              color: const Color(0xFF1a1a1a),
              border: isSelected ? Border.all(color: Colors.white, width: 2) : null,
              borderRadius: isSelected ? BorderRadius.circular(4) : null,
            ),
            child: ClipRRect(
              borderRadius: isSelected ? BorderRadius.circular(2) : BorderRadius.zero,
              child: Row(
                children: [
                  // Left trim handle - white box with black line when selected
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
                      width: isSelected ? 10 : 12,
                      color: isSelected ? Colors.white : Colors.white.withOpacity(0.2),
                      child: isSelected
                          ? Center(
                              child: Container(
                                width: 2,
                                height: 12,
                                decoration: BoxDecoration(
                                  color: Colors.black,
                                  borderRadius: BorderRadius.circular(1),
                                ),
                              ),
                            )
                          : null,
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
                        
                        
                      ],
                    ),
                  ),
                  
                  // Right trim handle - white box with black line when selected
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
                      width: isSelected ? 10 : 12,
                      color: isSelected ? Colors.white : Colors.white.withOpacity(0.2),
                      child: isSelected
                          ? Center(
                              child: Container(
                                width: 2,
                                height: 12,
                                decoration: BoxDecoration(
                                  color: Colors.black,
                                  borderRadius: BorderRadius.circular(1),
                                ),
                              ),
                            )
                          : null,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        
        // Animation indicators below the clip
        if (hasAnyAnimation)
          Container(
            width: clipWidth,
            height: 6,
            margin: const EdgeInsets.only(top: 2),
            child: Row(
              children: [
                // In animation indicator
                if (hasAnimationIn)
                  Container(
                    width: math.max(16, (clip.animationIn!.duration / clip.trimmedDuration) * clipWidth),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF06B6D4), Color(0xFF22D3EE)],
                      ),
                      borderRadius: const BorderRadius.only(
                        topLeft: Radius.circular(3),
                        bottomLeft: Radius.circular(3),
                      ),
                    ),
                    child: const Center(
                      child: Icon(Icons.auto_awesome, size: 8, color: Colors.white),
                    ),
                  ),
                // Spacer
                if (hasAnimationIn && hasAnimationOut)
                  const Spacer(),
                // Out animation indicator
                if (hasAnimationOut)
                  Container(
                    width: math.max(16, (clip.animationOut!.duration / clip.trimmedDuration) * clipWidth),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFB923C), Color(0xFFF97316)],
                      ),
                      borderRadius: const BorderRadius.only(
                        topRight: Radius.circular(3),
                        bottomRight: Radius.circular(3),
                      ),
                    ),
                    child: const Center(
                      child: Icon(Icons.auto_awesome, size: 8, color: Colors.white),
                    ),
                  ),
              ],
            ),
          ),
        
        // AI Enhancement indicator
        if (hasAIEnhanced)
          Container(
            width: clipWidth,
            height: 5,
            margin: const EdgeInsets.only(top: 2),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF8B5CF6), Color(0xFFA855F7), Color(0xFFD946EF)],
              ),
              borderRadius: BorderRadius.circular(2.5),
            ),
            child: const Center(
              child: Icon(Icons.auto_fix_high, size: 8, color: Colors.white),
            ),
          ),
      ],
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

  /// Build video overlay track (purple themed) - for picture-in-picture layers
  Widget _buildVideoOverlayTrack(double startPadding, double trackWidth, double duration) {
    if (_videoOverlays.isEmpty) {
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
              children: _videoOverlays.map((overlay) {
                final leftOffset = overlay.startTime * _pixelsPerSecond;
                final itemWidth = ((overlay.endTime - overlay.startTime) * _pixelsPerSecond).clamp(60.0, trackWidth);
                final isSelected = overlay.id == _selectedOverlayId;
                final isDragging = overlay.id == _draggingOverlayId;
                
                return Positioned(
                  left: leftOffset,
                  child: GestureDetector(
                    onTap: () {
                      // Select the overlay and open edit menu for it
                      setState(() {
                        _selectedOverlayId = overlay.id;
                        _editingClipId = overlay.id;
                        _editingLayerType = 'overlay';
                        _clipVolume = overlay.volume;
                        _clipSpeed = 1.0; // Overlays don't have speed yet
                        _isEditMenuMode = true;
                      });
                    },
                    onHorizontalDragUpdate: (details) {
                      final delta = details.primaryDelta ?? 0;
                      final timeDelta = delta / _pixelsPerSecond;
                      final itemDuration = overlay.endTime - overlay.startTime;
                      
                      setState(() {
                        var newStart = (overlay.startTime + timeDelta).clamp(0.0, duration - itemDuration);
                        overlay.startTime = newStart;
                        overlay.endTime = newStart + itemDuration;
                      });
                    },
                    child: Container(
                      width: itemWidth,
                      height: 34,
                      margin: const EdgeInsets.only(top: 3),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isSelected 
                              ? [const Color(0xFF8B5CF6), const Color(0xFFA78BFA)]
                              : [const Color(0xFF6D28D9), const Color(0xFF7C3AED)],
                        ),
                        borderRadius: BorderRadius.circular(6),
                        border: isSelected 
                            ? Border.all(color: Colors.white, width: 2)
                            : null,
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF8B5CF6).withOpacity(0.3),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
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
                                final newStart = (overlay.startTime + timeDelta).clamp(0.0, overlay.endTime - 0.5);
                                overlay.startTime = newStart;
                              });
                            },
                            child: Container(
                              width: 10,
                              height: 34,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(isSelected ? 0.5 : 0.3),
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(6),
                                  bottomLeft: Radius.circular(6),
                                ),
                              ),
                              child: Center(
                                child: Container(
                                  width: 2,
                                  height: 16,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.8),
                                    borderRadius: BorderRadius.circular(1),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          // Thumbnails content
                          Expanded(
                            child: ClipRRect(
                              child: LayoutBuilder(
                                builder: (context, constraints) {
                                  final contentWidth = constraints.maxWidth;
                                  const thumbWidth = 40.0;
                                  final thumbCount = math.max(1, (contentWidth / thumbWidth).floor());
                                  
                                  return Row(
                                    children: List.generate(thumbCount, (i) {
                                      final hasThumbnails = overlay.thumbnails != null && overlay.thumbnails!.isNotEmpty;
                                      final thumbIndex = hasThumbnails
                                          ? ((i / thumbCount) * overlay.thumbnails!.length).floor()
                                          : -1;
                                      final hasThumbnail = thumbIndex >= 0 && 
                                          overlay.thumbnails![thumbIndex].isNotEmpty;
                                      
                                      return Expanded(
                                        child: Container(
                                          height: 34,
                                          decoration: BoxDecoration(
                                            border: Border(
                                              right: i < thumbCount - 1 
                                                  ? BorderSide(color: const Color(0xFF8B5CF6).withOpacity(0.3))
                                                  : BorderSide.none,
                                            ),
                                          ),
                                          child: hasThumbnail
                                              ? Image.memory(
                                                  overlay.thumbnails![thumbIndex],
                                                  fit: BoxFit.cover,
                                                )
                                              : Container(
                                                  decoration: BoxDecoration(
                                                    gradient: LinearGradient(
                                                      colors: [
                                                        const Color(0xFF8B5CF6).withOpacity(0.2 + (i * 0.05)),
                                                        const Color(0xFFA78BFA).withOpacity(0.2 + (i * 0.05)),
                                                      ],
                                                    ),
                                                  ),
                                                  child: i == 0
                                                      ? Center(
                                                          child: Icon(
                                                            Icons.videocam,
                                                            size: 12,
                                                            color: Colors.white.withOpacity(0.5),
                                                          ),
                                                        )
                                                      : null,
                                                ),
                                        ),
                                      );
                                    }),
                                  );
                                },
                              ),
                            ),
                          ),
                          // Right trim handle
                          GestureDetector(
                            onHorizontalDragUpdate: (details) {
                              final delta = details.primaryDelta ?? 0;
                              final timeDelta = delta / _pixelsPerSecond;
                              setState(() {
                                final newEnd = (overlay.endTime + timeDelta).clamp(overlay.startTime + 0.5, duration);
                                overlay.endTime = newEnd;
                              });
                            },
                            child: Container(
                              width: 10,
                              height: 34,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(isSelected ? 0.5 : 0.3),
                                borderRadius: const BorderRadius.only(
                                  topRight: Radius.circular(6),
                                  bottomRight: Radius.circular(6),
                                ),
                              ),
                              child: Center(
                                child: Container(
                                  width: 2,
                                  height: 16,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.8),
                                    borderRadius: BorderRadius.circular(1),
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
              }).toList(),
            ),
          ),
          
          SizedBox(width: startPadding),
        ],
      ),
    );
  }

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
    // Simplified clip without the outer box - just the content
    return Container(
      width: itemWidth,
      height: 34,
      decoration: BoxDecoration(
        // Only show border when selected, no background box
        border: isSelected ? Border.all(color: Colors.white, width: 1.5) : null,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        children: [
          // Left trim handle - minimal, only visible when selected
          GestureDetector(
            onHorizontalDragStart: (_) {
              _saveStateToHistory();
              setState(() {
                _trimmingLayerId = overlay.id;
                _isTrimmingStart = true;
              });
            },
            onHorizontalDragUpdate: (details) {
              final delta = details.primaryDelta ?? 0;
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
              width: 8,
              child: Center(
                child: AnimatedOpacity(
                  opacity: isSelected ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 150),
                  child: Container(
                    width: 2,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(1),
                    ),
                  ),
                ),
              ),
            ),
          ),
          
          // Content - just icon and text label
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Row(
                children: [
                  Icon(icon, size: 12, color: Colors.white.withOpacity(0.7)),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      label,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.9),
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Right trim handle - minimal, only visible when selected
          GestureDetector(
            onHorizontalDragStart: (_) {
              _saveStateToHistory();
              setState(() {
                _trimmingLayerId = overlay.id;
                _isTrimmingEnd = true;
              });
            },
            onHorizontalDragUpdate: (details) {
              final delta = details.primaryDelta ?? 0;
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
              width: 8,
              child: Center(
                child: AnimatedOpacity(
                  opacity: isSelected ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 150),
                  child: Container(
                    width: 2,
                    height: 12,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.6),
                      borderRadius: BorderRadius.circular(1),
                    ),
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
            onTap: () {
              setState(() {
                _isTextMenuMode = true;
                _textMenuTab = 'add-text';
              });
            },
            child: Container(
              constraints: const BoxConstraints(maxWidth: 180),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
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
                        waveformData: audio.waveformData,
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
    // Check if a settings panel should be shown (overlays timeline) - adjust now uses inline overlay
    final bool showSettingsPanel = _selectedTool == 'stickers' || _selectedTool == 'aspect' || _selectedTool == 'background';
    
    if (showSettingsPanel) {
      return _buildContextualSettingsPanel();
    } else {
      // Show normal timeline + toolbar - wrapped in Stack for edit menu overlay and adjust overlay
      return Stack(
        children: [
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildTimelineSection(),
              _buildBottomToolbar(),
            ],
          ),
          // Edit Menu Overlay - positioned here to cover timeline and toolbar
          if (_isEditMenuMode)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: _editSubPanel != 'none' ? 200 : 160,
              child: Material(
                color: const Color(0xFF0A0A0A),
                elevation: 8,
                child: _buildEditMenu(),
              ),
            ),
          // Adjust Menu Overlay - inline overlay like edit menu
          if (_selectedTool == 'adjust')
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 280,
              child: Material(
                color: const Color(0xFF0A0A0A),
                elevation: 8,
                child: _buildAdjustMenuOverlay(),
              ),
            ),
        ],
      );
    }
  }
  
  /// Build adjust menu as inline overlay (like edit menu)
  Widget _buildAdjustMenuOverlay() {
    final selectedTool = _adjustmentTools.firstWhere(
      (t) => t.id == _selectedAdjustmentId,
      orElse: () => _adjustmentTools.first,
    );
    
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with back button, title and confirm
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              GestureDetector(
                onTap: () => setState(() => _selectedTool = 'edit'),
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.keyboard_arrow_down, size: 20, color: AppTheme.primary),
                ),
              ),
              const Expanded(
                child: Text(
                  'Adjust',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              GestureDetector(
                onTap: () {
                  setState(() => _selectedTool = 'edit');
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Adjustments applied'), duration: Duration(seconds: 1)),
                  );
                },
                child: Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppTheme.primary,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check, size: 16, color: Colors.white),
                ),
              ),
            ],
          ),
        ),
        
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
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Column(
                      children: [
                        Text(
                          'Filters',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: _adjustPanelTab == 'filters' ? Colors.white : Colors.white.withOpacity(0.5),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          height: 2,
                          width: 40,
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
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Column(
                      children: [
                        Text(
                          'Adjust',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: _adjustPanelTab == 'adjust' ? Colors.white : Colors.white.withOpacity(0.5),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          height: 2,
                          width: 40,
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
          // Sub-menu: Smart / Customize + AI Enhance Button
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => setState(() => _adjustSubTab = 'smart'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: _adjustSubTab == 'smart' ? AppTheme.primary.withOpacity(0.2) : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: _adjustSubTab == 'smart' ? AppTheme.primary.withOpacity(0.4) : Colors.transparent,
                      ),
                    ),
                    child: Text(
                      'Smart',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: _adjustSubTab == 'smart' ? AppTheme.primary : Colors.white.withOpacity(0.6),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => setState(() => _adjustSubTab = 'customize'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: _adjustSubTab == 'customize' ? AppTheme.primary.withOpacity(0.2) : Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: _adjustSubTab == 'customize' ? AppTheme.primary.withOpacity(0.4) : Colors.transparent,
                      ),
                    ),
                    child: Text(
                      'Customize',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: _adjustSubTab == 'customize' ? AppTheme.primary : Colors.white.withOpacity(0.6),
                      ),
                    ),
                  ),
                ),
                const Spacer(),
                // AI Enhance Button
                GestureDetector(
                  onTap: _isAIEnhancing ? null : () async {
                    setState(() => _isAIEnhancing = true);
                    await Future.delayed(const Duration(milliseconds: 1500));
                    for (var tool in _adjustmentTools) {
                      switch (tool.id) {
                        case 'brightness': tool.onChanged(0.08); break;
                        case 'contrast': tool.onChanged(0.12); break;
                        case 'saturation': tool.onChanged(0.15); break;
                        case 'exposure': tool.onChanged(0.05); break;
                        case 'sharpen': tool.onChanged(0.18); break;
                        case 'highlight': tool.onChanged(-0.1); break;
                        case 'shadow': tool.onChanged(0.12); break;
                        case 'temp': tool.onChanged(0.02); break;
                        case 'hue': tool.onChanged(0.0); break;
                      }
                    }
                    if (_selectedClipId != null) {
                      final clipIndex = _videoClips.indexWhere((c) => c.id == _selectedClipId);
                      if (clipIndex >= 0) {
                        setState(() => _videoClips[clipIndex].aiEnhanced = true);
                      }
                    }
                    setState(() => _isAIEnhancing = false);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('AI Enhancement applied'), duration: Duration(seconds: 2)),
                      );
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFFA855F7)]),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_isAIEnhancing)
                          const SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(strokeWidth: 1.5, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)),
                          )
                        else
                          const Icon(Icons.auto_fix_high, size: 12, color: Colors.white),
                        const SizedBox(width: 4),
                        Text(
                          _isAIEnhancing ? 'Analyzing...' : 'AI Enhance',
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Colors.white),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Horizontal Scrollable Adjustment Icons
          SizedBox(
            height: 70,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 6),
              itemCount: _adjustmentTools.length,
              itemBuilder: (context, index) {
                final tool = _adjustmentTools[index];
                final isSelected = tool.id == _selectedAdjustmentId;
                final hasValue = tool.value != 0;
                
                return GestureDetector(
                  onTap: () => setState(() => _selectedAdjustmentId = tool.id),
                  child: Container(
                    width: 56,
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primary.withOpacity(0.15) : Colors.transparent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.primary : hasValue ? Colors.white.withOpacity(0.15) : Colors.white.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            tool.icon,
                            size: 16,
                            color: isSelected ? Colors.white : hasValue ? AppTheme.primary : Colors.white.withOpacity(0.7),
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          tool.name,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w500,
                            color: isSelected ? AppTheme.primary : hasValue ? Colors.white : Colors.white.withOpacity(0.6),
                          ),
                        ),
                        if (hasValue)
                          Text(
                            '${tool.value >= 0 ? '+' : ''}${(tool.value * 100).round()}',
                            style: TextStyle(fontSize: 8, fontWeight: FontWeight.w600, color: AppTheme.primary),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          
          // Slider for Selected Adjustment
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(selectedTool.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: selectedTool.value != 0 ? AppTheme.primary.withOpacity(0.15) : Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${selectedTool.value >= 0 ? '+' : ''}${(selectedTool.value * 100).round()}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          fontFamily: 'monospace',
                          color: selectedTool.value != 0 ? AppTheme.primary : Colors.white.withOpacity(0.6),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    trackHeight: 4,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
                    activeTrackColor: AppTheme.primary,
                    inactiveTrackColor: Colors.white.withOpacity(0.1),
                    thumbColor: Colors.white,
                  ),
                  child: Slider(value: selectedTool.value, min: -1.0, max: 1.0, onChanged: selectedTool.onChanged),
                ),
              ],
            ),
          ),
          
          // Reset Button
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: GestureDetector(
                onTap: _resetAllAdjustments,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), shape: BoxShape.circle),
                  child: Icon(Icons.refresh, size: 14, color: Colors.white.withOpacity(0.7)),
                ),
              ),
            ),
          ),
        ],
        
        if (_adjustPanelTab == 'filters')
          Expanded(
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.circle_outlined, size: 32, color: Colors.white.withOpacity(0.3)),
                  const SizedBox(height: 8),
                  Text('Filter presets coming soon', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12)),
                ],
              ),
            ),
          ),
      ],
    );
  }

  // Contextual settings panel that overlays the timeline area (stickers, aspect, background only)
  Widget _buildContextualSettingsPanel() {
    String panelTitle = 'Editor';
    if (_selectedTool == 'stickers') {
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
          
          // Content based on selected tool (adjust removed - now uses inline overlay)
          if (_selectedTool == 'stickers')
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
          // Sub-menu: Smart / Customize + AI Enhance Button
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
                const Spacer(),
                // AI Enhance Button
                GestureDetector(
                  onTap: _isAIEnhancing ? null : () async {
                    setState(() => _isAIEnhancing = true);
                    // Simulate AI analysis (in production, this would call an AI service)
                    await Future.delayed(const Duration(milliseconds: 1500));
                    // Apply AI-suggested adjustments
                    for (var tool in _adjustmentTools) {
                      switch (tool.id) {
                        case 'brightness': tool.onChanged(0.08); break;
                        case 'contrast': tool.onChanged(0.12); break;
                        case 'saturation': tool.onChanged(0.15); break;
                        case 'exposure': tool.onChanged(0.05); break;
                        case 'sharpen': tool.onChanged(0.18); break;
                        case 'highlight': tool.onChanged(-0.1); break;
                        case 'shadow': tool.onChanged(0.12); break;
                        case 'temp': tool.onChanged(0.02); break;
                        case 'hue': tool.onChanged(0.0); break;
                      }
                    }
                    // Mark selected clip as AI enhanced
                    if (_selectedClipId != null) {
                      final clipIndex = _videoClips.indexWhere((c) => c.id == _selectedClipId);
                      if (clipIndex >= 0) {
                        setState(() {
                          _videoClips[clipIndex].aiEnhanced = true;
                        });
                      }
                    }
                    setState(() => _isAIEnhancing = false);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('AI Enhancement applied'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF8B5CF6), Color(0xFFA855F7)],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_isAIEnhancing)
                          const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        else
                          const Icon(Icons.auto_fix_high, size: 14, color: Colors.white),
                        const SizedBox(width: 6),
                        Text(
                          _isAIEnhancing ? 'Analyzing...' : 'AI Enhance',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Colors.white,
                          ),
                        ),
                      ],
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

  /// Build drawing track in timeline (Pink/Magenta themed)
  Widget _buildDrawingTrack(double startPadding, double trackWidth, double duration) {
    if (_drawingLayers.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 40,
      child: Row(
        children: [
          SizedBox(width: startPadding),
          SizedBox(
            width: trackWidth,
            child: Stack(
              clipBehavior: Clip.none,
              children: _drawingLayers.map((layer) {
                final leftOffset = layer.startTime * _pixelsPerSecond;
                final itemWidth = ((layer.endTime - layer.startTime) * _pixelsPerSecond).clamp(50.0, trackWidth);
                final isSelected = layer.id == _selectedDrawingId;
                return Positioned(
                  left: leftOffset,
                  child: GestureDetector(
                    onTap: () => _selectDrawingLayer(layer.id),
                    onHorizontalDragUpdate: (details) {
                      final delta = details.primaryDelta ?? 0;
                      final timeDelta = delta / _pixelsPerSecond;
                      final layerDuration = layer.endTime - layer.startTime;
                      setState(() {
                        var newStart = (layer.startTime + timeDelta).clamp(0.0, duration - layerDuration);
                        layer.startTime = newStart;
                        layer.endTime = newStart + layerDuration;
                      });
                    },
                    child: Container(
                      width: itemWidth,
                      height: 34,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: isSelected 
                              ? [const Color(0xFFEC4899), const Color(0xFFD946EF)] 
                              : [const Color(0xFFF472B6), const Color(0xFFE879F9)],
                        ),
                        borderRadius: BorderRadius.circular(6),
                        border: isSelected ? Border.all(color: Colors.white, width: 2) : null,
                        boxShadow: isSelected 
                            ? [BoxShadow(color: const Color(0xFFEC4899).withOpacity(0.3), blurRadius: 8)] 
                            : null,
                      ),
                      child: Row(
                        children: [
                          // Left trim handle
                          GestureDetector(
                            onHorizontalDragUpdate: (details) {
                              final delta = details.primaryDelta ?? 0;
                              final timeDelta = delta / _pixelsPerSecond;
                              setState(() {
                                final newStart = (layer.startTime + timeDelta).clamp(0.0, layer.endTime - 0.5);
                                layer.startTime = newStart;
                              });
                            },
                            child: Container(
                              width: 10,
                              decoration: BoxDecoration(
                                color: isSelected ? Colors.white.withOpacity(0.5) : Colors.white.withOpacity(0.3),
                                borderRadius: const BorderRadius.horizontal(left: Radius.circular(6)),
                              ),
                              child: Center(
                                child: Container(
                                  width: 2,
                                  height: 12,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.8),
                                    borderRadius: BorderRadius.circular(1),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.edit, size: 12, color: Colors.white),
                          const SizedBox(width: 4),
                          Expanded(child: Text('Drawing', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis)),
                          // Delete button when selected
                          if (isSelected)
                            GestureDetector(
                              onTap: () => _deleteDrawingLayer(layer.id),
                              child: Container(
                                width: 16,
                                height: 16,
                                margin: const EdgeInsets.only(right: 4),
                                decoration: BoxDecoration(
                                  color: Colors.red.withOpacity(0.9),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close, size: 10, color: Colors.white),
                              ),
                            ),
                          // Right trim handle
                          GestureDetector(
                            onHorizontalDragUpdate: (details) {
                              final delta = details.primaryDelta ?? 0;
                              final timeDelta = delta / _pixelsPerSecond;
                              setState(() {
                                final newEnd = (layer.endTime + timeDelta).clamp(layer.startTime + 0.5, duration);
                                layer.endTime = newEnd;
                              });
                            },
                            child: Container(
                              width: 10,
                              decoration: BoxDecoration(
                                color: isSelected ? Colors.white.withOpacity(0.5) : Colors.white.withOpacity(0.3),
                                borderRadius: const BorderRadius.horizontal(right: Radius.circular(6)),
                              ),
                              child: Center(
                                child: Container(
                                  width: 2,
                                  height: 12,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.8),
                                    borderRadius: BorderRadius.circular(1),
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
              }).toList(),
            ),
          ),
          SizedBox(width: startPadding),
        ],
      ),
    );
  }
  
  /// Build drawing overlays that appear on video preview when within time range
  List<Widget> _buildDrawingOverlays(BoxConstraints constraints) {
    final currentPosition = _videoController?.value.position.inMilliseconds.toDouble() ?? 0;
    final currentTime = currentPosition / 1000.0;
    
    return _drawingLayers
        .where((layer) => currentTime >= layer.startTime && currentTime <= layer.endTime)
        .map((layer) {
      return Positioned.fill(
        child: IgnorePointer(
          child: CustomPaint(
            painter: _DrawingLayerPainter(strokes: layer.strokes),
          ),
        ),
      );
    }).toList();
  }
  
  /// Build drawing canvas overlay for active drawing mode
  Widget _buildDrawingCanvas(double containerWidth, double containerHeight) {
    return Positioned.fill(
      child: GestureDetector(
        onPanStart: (details) {
          final box = context.findRenderObject() as RenderBox?;
          if (box == null) return;
          
          // Save current strokes to undo stack
          _drawUndoStack.add(List.from(_currentStrokes.map((s) => DrawingStroke(
            id: s.id,
            points: List.from(s.points),
            color: s.color,
            size: s.size,
            tool: s.tool,
          ))));
          _drawRedoStack.clear();
          
          // Start a new stroke
          final localPosition = details.localPosition;
          final normalizedX = localPosition.dx / containerWidth;
          final normalizedY = localPosition.dy / containerHeight;
          
          setState(() {
            _currentDrawingPoints = [Offset(normalizedX, normalizedY)];
          });
        },
        onPanUpdate: (details) {
          final localPosition = details.localPosition;
          final normalizedX = (localPosition.dx / containerWidth).clamp(0.0, 1.0);
          final normalizedY = (localPosition.dy / containerHeight).clamp(0.0, 1.0);
          
          setState(() {
            _currentDrawingPoints.add(Offset(normalizedX, normalizedY));
          });
        },
        onPanEnd: (details) {
          if (_currentDrawingPoints.length >= 2) {
            setState(() {
              _currentStrokes.add(DrawingStroke(
                id: DateTime.now().millisecondsSinceEpoch.toString(),
                points: List.from(_currentDrawingPoints),
                color: _drawColor,
                size: _drawSize,
                tool: _drawTool,
              ));
              _currentDrawingPoints.clear();
            });
          }
        },
        child: CustomPaint(
          painter: _DrawingCanvasPainter(
            strokes: _currentStrokes,
            currentPoints: _currentDrawingPoints,
            currentColor: _drawColor,
            currentSize: _drawSize,
            currentTool: _drawTool,
          ),
          size: Size(containerWidth, containerHeight),
        ),
      ),
    );
  }

  Widget _buildBottomToolbar() {
    return Container(
      constraints: BoxConstraints(maxHeight: _showTextEditPanel ? 450 : 160),
      decoration: BoxDecoration(
        color: const Color(0xFF0A0A0A),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
      ),
      child: Stack(
        children: [
          // Main toolbar - always rendered, fades out when overlay is open
          AnimatedOpacity(
            duration: const Duration(milliseconds: 200),
            opacity: _isAnyOverlayOpen ? 0.0 : 1.0,
            child: IgnorePointer(
              ignoring: _isAnyOverlayOpen,
              child: _buildMainToolbar(),
            ),
          ),
          
          // Overlay menus - slide up with fade
          if (_showTextEditPanel && _selectedTextOverlay != null)
            Positioned.fill(
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 200),
                opacity: 1.0,
                child: _buildTextEditPanel(),
              ),
            ),
          
          if (_isTextMenuMode)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 160,
              child: Material(
                color: const Color(0xFF0A0A0A),
                elevation: 8,
                child: _buildTextMenu(),
              ),
            ),
          
          if (_isAudioMenuMode)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 160,
              child: Material(
                color: const Color(0xFF0A0A0A),
                elevation: 8,
                child: _buildAudioMenu(),
              ),
            ),
          
          // Audio Recording Overlay
          if (_showRecordingOverlay)
            Positioned.fill(
              child: Material(
                color: const Color(0xFF0A0A0A).withOpacity(0.95),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Animated recording indicator
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        // Outer pulsing ring
                        TweenAnimationBuilder<double>(
                          tween: Tween(begin: 1.0, end: 1.3),
                          duration: const Duration(milliseconds: 1000),
                          builder: (context, value, child) {
                            return Container(
                              width: 120 * value,
                              height: 120 * value,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Colors.red.withOpacity(0.1 / value),
                              ),
                            );
                          },
                          onEnd: () {}, // Loops via rebuild
                        ),
                        // Inner pulsing ring
                        Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.red.withOpacity(0.15),
                          ),
                        ),
                        // Stop button
                        GestureDetector(
                          onTap: _stopAudioRecording,
                          child: Container(
                            width: 80,
                            height: 80,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.red,
                            ),
                            child: Icon(
                              _isRecording ? Icons.stop : Icons.mic,
                              size: 36,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                    
                    const SizedBox(height: 32),
                    
                    // Timer display
                    Text(
                      _formatRecordingTime(_recordingDuration),
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'monospace',
                        color: Colors.white,
                      ),
                    ),
                    
                    const SizedBox(height: 12),
                    
                    // Status text
                    Text(
                      _isRecording ? 'Recording... Tap to stop' : 'Tap to start recording',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.6),
                      ),
                    ),
                    
                    const SizedBox(height: 32),
                    
                    // Cancel button
                    TextButton(
                      onPressed: _cancelAudioRecording,
                      child: Text(
                        'Cancel',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.5),
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          
          if (_isEffectsMenuMode)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 160,
              child: Material(
                color: const Color(0xFF0A0A0A),
                elevation: 8,
                child: _buildEffectsMenu(),
              ),
            ),
          
          if (_isOverlayMenuMode)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 160,
              child: Material(
                color: const Color(0xFF0A0A0A),
                elevation: 8,
                child: _buildOverlayMenu(),
              ),
            ),
          
          if (_isCaptionsMenuMode)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 160,
              child: Material(
                color: const Color(0xFF0A0A0A),
                elevation: 8,
                child: _buildCaptionsMenu(),
              ),
            ),
          
          if (_isAspectMenuMode)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 200,
              child: Material(
                color: const Color(0xFF0A0A0A),
                elevation: 8,
                child: _buildAspectMenu(),
              ),
            ),
          
          if (_isBackgroundMenuMode)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 200,
              child: Material(
                color: const Color(0xFF0A0A0A),
                elevation: 8,
                child: _buildBackgroundMenu(),
              ),
            ),
          
          // Draw Mode Menu Overlay
          if (_isDrawMode)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 200,
              child: Material(
                color: const Color(0xFF0A0A0A),
                elevation: 8,
                child: _buildDrawMenu(),
              ),
            ),

          // Crop Mode Menu Overlay
          if (_isCropMode)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 180,
              child: Material(
                color: const Color(0xFF0A0A0A),
                elevation: 8,
                child: _buildCropMenu(),
              ),
            ),
          
          // Edit Menu Overlay - MOVED to _buildDynamicBottomArea Stack for proper z-ordering
        ],
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
        // Header with back button and centered title
        Container(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              // Back button
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: GestureDetector(
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
                    child: const Icon(Icons.chevron_left, size: 22, color: AppTheme.primary),
                  ),
                ),
              ),
              // Centered Title
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'Text',
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
        
        // Horizontal Scrollable Text Tools
        Container(
          height: 120,
          alignment: Alignment.topCenter,
          padding: const EdgeInsets.only(top: 16),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                _buildMenuToolButton('Add text', Icons.text_fields, () {
                  _addTextOverlay();
                  setState(() => _isTextMenuMode = false);
                }),
                _buildMenuToolButton('Auto captions', Icons.subtitles_outlined, () {
                  _generateCaptions();
                  setState(() => _isTextMenuMode = false);
                }),
                _buildMenuToolButton('Stickers', Icons.emoji_emotions_outlined, () {
                  setState(() => _textMenuTab = _textMenuTab == 'stickers' ? 'add-text' : 'stickers');
                }),
                _buildMenuToolButton('Draw', Icons.edit_outlined, () {
                  setState(() {
                    _isDrawMode = true;
                    _isTextMenuMode = false;
                  });
                }),
                _buildMenuToolButton('Text template', Icons.description_outlined, () {
                  _addTextOverlay();
                  setState(() => _isTextMenuMode = false);
                }),
                _buildMenuToolButton('Text to audio', Icons.audiotrack_outlined, () {
                  _showSnackBar('Text to audio coming soon');
                }),
                _buildMenuToolButton('Auto lyrics', Icons.music_note_outlined, () {
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
  
  /// Shared helper for menu tool buttons - matches Edit menu button style
  Widget _buildMenuToolButton(String label, IconData icon, VoidCallback onTap, {bool isDestructive = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 64,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: isDestructive 
                    ? Colors.red.withOpacity(0.2) 
                    : Colors.white.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 20,
                color: isDestructive ? Colors.red : Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isDestructive 
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
  }
  
  /// Build the comprehensive text edit panel using TextEditPanel widget
  Widget _buildTextEditPanel() {
    final overlay = _selectedTextOverlay;
    if (overlay == null) return const SizedBox.shrink();
    
    return TextEditPanel(
      onBack: () => setState(() => _showTextEditPanel = false),
      text: overlay.text,
      onTextChange: (text) => _updateSelectedText((t) => t.text = text),
      fontSize: overlay.fontSize,
      onFontSizeChange: (size) => _updateSelectedText((t) => t.fontSize = size),
      textColor: overlay.textColor,
      onTextColorChange: (color) => _updateSelectedText((t) => t.textColor = color),
      fontFamily: overlay.fontFamily,
      onFontFamilyChange: (font) => _updateSelectedText((t) => t.fontFamily = font),
      opacity: overlay.opacity,
      onOpacityChange: (opacity) => _updateSelectedText((t) => t.opacity = opacity),
      strokeEnabled: overlay.strokeEnabled,
      onStrokeEnabledChange: (enabled) => _updateSelectedText((t) => t.strokeEnabled = enabled),
      strokeColor: overlay.strokeColor,
      onStrokeColorChange: (color) => _updateSelectedText((t) => t.strokeColor = color),
      strokeWidth: overlay.strokeWidth,
      onStrokeWidthChange: (width) => _updateSelectedText((t) => t.strokeWidth = width),
      glowEnabled: overlay.glowEnabled,
      onGlowEnabledChange: (enabled) => _updateSelectedText((t) => t.glowEnabled = enabled),
      glowColor: overlay.glowColor,
      onGlowColorChange: (color) => _updateSelectedText((t) => t.glowColor = color),
      glowIntensity: overlay.glowIntensity,
      onGlowIntensityChange: (intensity) => _updateSelectedText((t) => t.glowIntensity = intensity),
      shadowEnabled: overlay.shadowEnabled,
      onShadowEnabledChange: (enabled) => _updateSelectedText((t) => t.shadowEnabled = enabled),
      shadowColor: overlay.shadowColor,
      onShadowColorChange: (color) => _updateSelectedText((t) => t.shadowColor = color),
      letterSpacing: overlay.letterSpacing,
      onLetterSpacingChange: (spacing) => _updateSelectedText((t) => t.letterSpacing = spacing),
      curveAmount: overlay.curveAmount,
      onCurveAmountChange: (curve) => _updateSelectedText((t) => t.curveAmount = curve),
      animation: overlay.animation,
      onAnimationChange: (anim) => _updateSelectedText((t) => t.animation = anim),
      bubbleStyle: overlay.bubbleStyle,
      onBubbleStyleChange: (style) => _updateSelectedText((t) => t.bubbleStyle = style),
    );
  }
  
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
        Container(
          height: 120,
          alignment: Alignment.topCenter,
          padding: const EdgeInsets.only(top: 16),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                // Upload - File Picker for audio files (primary themed)
                GestureDetector(
                  onTap: () => _importAudioFile(),
                  child: Container(
                    width: 64,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withOpacity(0.2),
                            shape: BoxShape.circle,
                            border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
                          ),
                          child: Icon(Icons.folder_open, size: 20, color: AppTheme.primary),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Upload',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: Colors.white.withOpacity(0.6)),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
                // Record - Voice recording (red themed)
                GestureDetector(
                  onTap: () => _startAudioRecording(),
                  child: Container(
                    width: 64,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.2),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.red.withOpacity(0.3)),
                          ),
                          child: const Icon(Icons.mic, size: 20, color: Colors.red),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Record',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: Colors.white.withOpacity(0.6)),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
                // Music - Music library (green themed)
                GestureDetector(
                  onTap: () => _showSnackBar('Music library coming soon'),
                  child: Container(
                    width: 64,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: const Color(0xFF22C55E).withOpacity(0.2),
                            shape: BoxShape.circle,
                            border: Border.all(color: const Color(0xFF22C55E).withOpacity(0.3)),
                          ),
                          child: const Icon(Icons.music_note, size: 20, color: Color(0xFF4ADE80)),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Music',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: Colors.white.withOpacity(0.6)),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
                // Sound FX
                _buildMenuToolButton('Sound FX', Icons.auto_awesome, () => _showSnackBar('Sound FX library coming soon')),
                _buildMenuToolButton('Extract', Icons.waves_outlined, () => _showSnackBar('Extract coming soon')),
                _buildMenuToolButton('Text to audio', Icons.record_voice_over_outlined, () => _showSnackBar('Text to audio coming soon')),
              ],
            ),
          ),
        ),
      ],
    );
  }
  
  /// Build the edit menu - horizontal scrollable menu with edit tools (with sub-panels)
  Widget _buildEditMenu() {
    // Split at playhead - finds clip under playhead if none selected
    void handleSplitAtPlayhead() {
      String? targetClipId = _selectedClipId;
      
      if (targetClipId == null && _videoClips.isNotEmpty) {
        // Find clip at current playhead position
        for (final clip in _videoClips) {
          final clipEnd = clip.startTime + _getClipTrimmedDuration(clip);
          if (_currentPosition >= clip.startTime && _currentPosition < clipEnd) {
            targetClipId = clip.id;
            break;
          }
        }
      }
      
      if (targetClipId != null) {
        _splitClipAtPlayhead(targetClipId);
      } else {
        _showSnackBar('No clip to split - move playhead over a video clip');
      }
    }
    
    // Delete current clip
    void handleDeleteClip() {
      String? targetClipId = _selectedClipId;
      
      if (targetClipId == null && _videoClips.isNotEmpty) {
        for (final clip in _videoClips) {
          final clipEnd = clip.startTime + _getClipTrimmedDuration(clip);
          if (_currentPosition >= clip.startTime && _currentPosition < clipEnd) {
            targetClipId = clip.id;
            break;
          }
        }
      }
      
      if (targetClipId != null) {
        _deleteVideoClip(targetClipId);
      } else {
        _showSnackBar('No clip to delete');
      }
    }
    
    final editTools = [
      {'id': 'split', 'name': 'Split', 'icon': Icons.content_cut, 'action': handleSplitAtPlayhead},
      {'id': 'volume', 'name': 'Volume', 'icon': Icons.volume_up, 'action': () => setState(() => _editSubPanel = 'volume')},
      {'id': 'speed', 'name': 'Speed', 'icon': Icons.speed, 'action': () => setState(() => _editSubPanel = 'speed')},
      {'id': 'animations', 'name': 'Animations', 'icon': Icons.auto_awesome, 'action': _showAnimationsBottomSheet},
      {'id': 'crop', 'name': 'Crop', 'icon': Icons.crop, 'action': () => setState(() { _isEditMenuMode = false; _isCropMode = true; _cropBox = const Rect.fromLTWH(0.1, 0.1, 0.8, 0.8); })},
      {'id': 'replace', 'name': 'Replace', 'icon': Icons.swap_horiz, 'action': () { _pickAndLoadVideo(); }},
      {'id': 'delete', 'name': 'Delete', 'icon': Icons.delete_outline, 'action': handleDeleteClip, 'isDestructive': true},
    ];
    
    final panelHeight = _editSubPanel != 'none' ? 200.0 : 160.0;
    
    return SizedBox(
      height: panelHeight,
      child: Column(
        key: const ValueKey('edit_menu'),
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header with back button, title, and checkmark (for sub-panels)
          Container(
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
            ),
            child: Row(
              children: [
                // Back/Close button
                Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: GestureDetector(
                    onTap: () {
                      if (_editSubPanel != 'none') {
                        setState(() => _editSubPanel = 'none');
                      } else {
                        setState(() {
                          _isEditMenuMode = false;
                          _editSubPanel = 'none';
                        });
                      }
                    },
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
                      child: Icon(
                        _editSubPanel != 'none' ? Icons.chevron_left : Icons.keyboard_arrow_down,
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
                      _editSubPanel == 'volume' 
                          ? 'Volume' 
                          : _editSubPanel == 'speed' 
                              ? 'Speed' 
                              : 'Edit',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
                // Checkmark button (only for sub-panels)
                if (_editSubPanel != 'none')
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () {
                        if (_editSubPanel == 'volume') {
                          _applyClipVolume();
                        } else if (_editSubPanel == 'speed') {
                          _applyClipSpeed();
                        }
                        setState(() => _editSubPanel = 'none');
                      },
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.check,
                          size: 18,
                          color: Color(0xFF0A0A0A),
                        ),
                      ),
                    ),
                  )
                else
                  const SizedBox(width: 40), // Balance for the back button
              ],
            ),
          ),
          
          // Sub-panel content or main tools
          Expanded(
            child: _editSubPanel == 'volume'
                ? _buildVolumeSubPanel()
                : _editSubPanel == 'speed'
                    ? _buildSpeedSubPanel()
                    : _buildEditToolsRow(editTools),
          ),
        ],
      ),
    );
  }
  
  /// Volume slider sub-panel - 0 to 200 range with purple slider
  Widget _buildVolumeSubPanel() {
    // Convert clipVolume (0-2) to display value (0-200)
    final displayValue = (_clipVolume * 100).round();
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Slider with custom purple track - uses 0-200 range
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: AppTheme.primary,
              inactiveTrackColor: Colors.white.withOpacity(0.15),
              thumbColor: Colors.white,
              trackHeight: 3,
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7),
              overlayColor: AppTheme.primary.withOpacity(0.2),
            ),
            child: Slider(
              value: displayValue.toDouble(),
              min: 0.0,
              max: 200.0,
              divisions: 200,
              onChanged: (value) {
                final newVolume = value / 100; // Convert 0-200 to 0-2
                setState(() => _clipVolume = newVolume);
                // Real-time volume update (capped at 1.0)
                _videoController?.setVolume(newVolume.clamp(0.0, 1.0));
              },
            ),
          ),
          const SizedBox(height: 8),
          // Labels row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '0',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                '$displayValue',
                style: TextStyle(
                  color: AppTheme.primary,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                '200',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
  
  /// Speed sub-panel with Normal/Curve modes
  Widget _buildSpeedSubPanel() {
    // Get the editing clip for duration calculation
    final clip = _editingClipId != null 
        ? _videoClips.firstWhere((c) => c.id == _editingClipId, orElse: () => _videoClips.first)
        : (_videoClips.isNotEmpty ? _videoClips.first : null);
    final originalDuration = clip?.trimmedDuration ?? 0;
    final newDuration = _clipSpeed > 0 ? originalDuration / _clipSpeed : 0;
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        children: [
          // Mode Toggle Buttons
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _speedMode = 'normal'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _speedMode == 'normal' ? AppTheme.primary : Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _speedMode == 'normal' ? AppTheme.primary : Colors.white.withOpacity(0.2),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        'Normal',
                        style: TextStyle(
                          color: _speedMode == 'normal' ? Colors.white : Colors.white.withOpacity(0.7),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: GestureDetector(
                  onTap: () => setState(() => _speedMode = 'curve'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: _speedMode == 'curve' ? AppTheme.primary : Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _speedMode == 'curve' ? AppTheme.primary : Colors.white.withOpacity(0.2),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        'Curve',
                        style: TextStyle(
                          color: _speedMode == 'curve' ? Colors.white : Colors.white.withOpacity(0.7),
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          // Content with fade transition
          Expanded(
            child: Stack(
              children: [
                // Normal Mode - Linear Speed Slider
                AnimatedOpacity(
                  opacity: _speedMode == 'normal' ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 200),
                  child: IgnorePointer(
                    ignoring: _speedMode != 'normal',
                    child: Column(
                      children: [
                        // Speed info header
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${_clipSpeed.toStringAsFixed(1)}x',
                              style: const TextStyle(
                                color: AppTheme.primary,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Duration: ${originalDuration.toStringAsFixed(1)}s → ${newDuration.toStringAsFixed(1)}s',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.5),
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        
                        // Logarithmic slider (0.1x to 100x)
                        SliderTheme(
                          data: SliderTheme.of(context).copyWith(
                            activeTrackColor: AppTheme.primary,
                            inactiveTrackColor: Colors.white.withOpacity(0.15),
                            thumbColor: Colors.white,
                            trackHeight: 4,
                            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
                            overlayColor: AppTheme.primary.withOpacity(0.2),
                          ),
                          child: Slider(
                            value: math.log(_clipSpeed.clamp(0.1, 100)) / math.ln10,
                            min: -1, // log10(0.1)
                            max: 2, // log10(100)
                            onChanged: (logValue) {
                              final newSpeed = math.pow(10, logValue).toDouble();
                              setState(() => _clipSpeed = newSpeed.clamp(0.1, 100));
                            },
                          ),
                        ),
                        
                        // Markers
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('0.1x', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 9)),
                            Text('1x', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 9)),
                            Text('2x', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 9)),
                            Text('5x', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 9)),
                            Text('10x', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 9)),
                            Text('100x', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 9)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                
                // Curve Mode - Preset Cards
                AnimatedOpacity(
                  opacity: _speedMode == 'curve' ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 200),
                  child: IgnorePointer(
                    ignoring: _speedMode != 'curve',
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _speedCurvePresets.map((preset) {
                          final isSelected = _selectedSpeedCurve == preset['id'];
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: GestureDetector(
                              onTap: () => setState(() => _selectedSpeedCurve = preset['id']),
                              child: Container(
                                width: 72,
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: isSelected ? AppTheme.primary.withOpacity(0.2) : Colors.white.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.2),
                                  ),
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    // Mini graph thumbnail
                                    Container(
                                      width: 56,
                                      height: 32,
                                      decoration: BoxDecoration(
                                        color: Colors.white.withOpacity(0.05),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: CustomPaint(
                                        painter: _SpeedCurvePainter(preset['id'], isSelected),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      preset['name'],
                                      style: TextStyle(
                                        color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.7),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w500,
                                      ),
                                      textAlign: TextAlign.center,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
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
  
  /// Build horizontal scrollable edit tools row
  Widget _buildEditToolsRow(List<Map<String, dynamic>> editTools) {
    return Container(
      height: 120,
      alignment: Alignment.topCenter,
      padding: const EdgeInsets.only(top: 16),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Row(
          children: editTools.map((tool) {
            final isDelete = tool['isDestructive'] == true;
            return GestureDetector(
              onTap: () {
                (tool['action'] as VoidCallback)();
                // Only close for actions that don't open sub-panels
                if (!['volume', 'speed', 'animations', 'crop', 'replace'].contains(tool['id'])) {
                  // Let the action decide whether to close
                }
              },
              child: SizedBox(
                width: 64,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
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
                    const SizedBox(height: 8),
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
    );
  }
  
  /// Build the edit menu overlay - slides up from bottom, covers timeline
  Widget _buildEditMenuOverlay() {
    final editTools = [
      {'id': 'split', 'name': 'Split', 'icon': Icons.content_cut, 'action': () {
        if (_editingLayerType == 'overlay') {
          _showSnackBar('Split for overlays coming soon');
        } else if (_editingClipId != null) {
          _splitClipAtPlayhead(_editingClipId!);
        }
      }},
      {'id': 'volume', 'name': 'Volume', 'icon': Icons.volume_up, 'action': () => setState(() => _editSubPanel = 'volume')},
      {'id': 'animations', 'name': 'Animations', 'icon': Icons.auto_awesome, 'action': _showAnimationsBottomSheet},
      {'id': 'effects', 'name': 'Effects', 'icon': Icons.star_outline, 'action': () { setState(() { _selectedTool = 'effects'; _isEditMenuMode = false; }); }},
      {'id': 'delete', 'name': 'Delete', 'icon': Icons.delete_outline, 'action': () {
        if (_editingClipId != null) {
          if (_editingLayerType == 'overlay') {
            _removeVideoOverlay(_editingClipId!);
          } else {
            _deleteVideoClip(_editingClipId!);
          }
        }
        setState(() {
          _isEditMenuMode = false;
          _editingClipId = null;
          _editingLayerType = 'clip';
        });
      }},
      {'id': 'speed', 'name': 'Speed', 'icon': Icons.speed, 'action': () => setState(() => _editSubPanel = 'speed')},
      {'id': 'beats', 'name': 'Beats', 'icon': Icons.waves, 'action': _showBeatsBottomSheet},
      {'id': 'crop', 'name': 'Crop', 'icon': Icons.crop, 'action': _showCropBottomSheet},
      {'id': 'duplicate', 'name': 'Duplicate', 'icon': Icons.copy, 'action': () { if (_editingClipId != null && _editingLayerType != 'overlay') { _duplicateClipInline(_editingClipId!); } else { _showSnackBar('Duplicate for overlays coming soon'); } }},
      {'id': 'replace', 'name': 'Replace', 'icon': Icons.swap_horiz, 'action': () { setState(() => _isEditMenuMode = false); _pickAndLoadVideo(); }},
      {'id': 'overlay', 'name': 'Overlay', 'icon': Icons.layers_outlined, 'action': () { setState(() { _selectedTool = 'overlay'; _isEditMenuMode = false; }); }},
      {'id': 'adjust', 'name': 'Adjust', 'icon': Icons.tune, 'action': () { setState(() { _selectedTool = 'adjust'; _isEditMenuMode = false; }); }},
      {'id': 'filter', 'name': 'Filter', 'icon': Icons.auto_fix_high, 'action': () { setState(() { _selectedTool = 'filters'; _isEditMenuMode = false; }); }},
    ];
    
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
      child: Column(
        children: [
          // Semi-transparent tap area to close
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _isEditMenuMode = false),
              child: Container(
                color: Colors.black.withOpacity(0.7),
              ),
            ),
          ),
          // Edit panel content
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF0A0A0A).withOpacity(0.95),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
              border: Border(
                top: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Header with down arrow and title
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    border: Border(
                      bottom: BorderSide(color: Colors.white.withOpacity(0.1)),
                    ),
                  ),
                  child: Row(
                    children: [
                      // Down arrow button
                      GestureDetector(
                        onTap: () => setState(() => _isEditMenuMode = false),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: AppTheme.primary.withOpacity(0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.keyboard_arrow_down,
                            size: 22,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                      // Title
                      Expanded(
                        child: Text(
                          _editingLayerType == 'overlay' ? 'Edit Overlay' : 'Edit',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                      const SizedBox(width: 32), // Balance for the button
                    ],
                  ),
                ),
                
                // Horizontal Scrollable Edit Tools
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.only(left: 8, right: 8, top: 16, bottom: 16),
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
            ),
          ),
        ],
      ),
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
        // Header with back button and centered title
        Container(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: GestureDetector(
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
                    child: const Icon(Icons.chevron_left, size: 22, color: AppTheme.primary),
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'Effects',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              const SizedBox(width: 40),
            ],
          ),
        ),
        
        // Horizontal Scrollable Effects Tools
        Container(
          height: 120,
          alignment: Alignment.topCenter,
          padding: const EdgeInsets.only(top: 16),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: effectsTools.map((tool) {
                return _buildMenuToolButton(
                  tool['name'] as String,
                  tool['icon'] as IconData,
                  () => _showSnackBar('${tool['name']} coming soon'),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }
  
  /// Build the overlay menu - single action button
  Widget _buildOverlayMenu() {
    return Column(
      key: const ValueKey('overlay_menu'),
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with back button and centered title
        Container(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: GestureDetector(
                  onTap: () => setState(() => _isOverlayMenuMode = false),
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
                    child: const Icon(Icons.chevron_left, size: 22, color: AppTheme.primary),
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'Overlay',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              const SizedBox(width: 40),
            ],
          ),
        ),
        
        // Horizontal Scrollable Overlay Tools
        Container(
          height: 120,
          alignment: Alignment.topCenter,
          padding: const EdgeInsets.only(top: 16),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                _buildMenuToolButton('Add overlay', Icons.add, () {
                  _addVideoOverlay();
                }),
                const SizedBox(width: 8),
                // Show existing overlays for selection
                ..._videoOverlays.map((overlay) {
                  final isSelected = overlay.id == _selectedOverlayId;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedOverlayId = overlay.id),
                      child: Container(
                        width: 64,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF8B5CF6).withOpacity(0.2) : Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF8B5CF6).withOpacity(0.5) : Colors.transparent,
                          ),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: const Color(0xFF8B5CF6).withOpacity(0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.videocam, size: 18, color: Color(0xFF8B5CF6)),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Overlay ${_videoOverlays.indexOf(overlay) + 1}',
                              style: TextStyle(
                                fontSize: 9,
                                color: isSelected ? Colors.white : Colors.white.withOpacity(0.6),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ],
            ),
          ),
        ),
      ],
    );
  }
  
  /// Build the captions menu - horizontal scrollable menu
  Widget _buildCaptionsMenu() {
    final captionsTools = [
      {'id': 'enter-captions', 'name': 'Enter captions', 'icon': Icons.text_fields},
      {'id': 'auto-captions', 'name': 'Auto captions', 'icon': Icons.subtitles_outlined},
      {'id': 'caption-templates', 'name': 'Caption templates', 'icon': Icons.description_outlined},
      {'id': 'auto-lyrics', 'name': 'Auto lyrics', 'icon': Icons.music_note_outlined},
      {'id': 'import-captions', 'name': 'Import captions', 'icon': Icons.download_outlined},
    ];
    
    return Column(
      key: const ValueKey('captions_menu'),
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with back button and centered title
        Container(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: GestureDetector(
                  onTap: () => setState(() => _isCaptionsMenuMode = false),
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
                    child: const Icon(Icons.chevron_left, size: 22, color: AppTheme.primary),
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'Captions',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              const SizedBox(width: 40),
            ],
          ),
        ),
        
        // Horizontal Scrollable Caption Tools
        Container(
          height: 120,
          alignment: Alignment.topCenter,
          padding: const EdgeInsets.only(top: 16),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: captionsTools.map((tool) {
                return _buildMenuToolButton(
                  tool['name'] as String,
                  tool['icon'] as IconData,
                  () {
                    if (tool['id'] == 'auto-captions') {
                      _generateCaptions();
                      setState(() => _isCaptionsMenuMode = false);
                    } else {
                      _showSnackBar('${tool['name']} coming soon');
                    }
                  },
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }
  
  /// Build the aspect ratio menu - horizontal scrollable menu
  Widget _buildAspectMenu() {
    final aspectOptions = [
      {'id': 'original', 'label': 'Original', 'width': 24.0, 'height': 24.0},
      {'id': '9:16', 'label': '9:16', 'width': 18.0, 'height': 32.0},
      {'id': '16:9', 'label': '16:9', 'width': 32.0, 'height': 18.0},
      {'id': '1:1', 'label': '1:1', 'width': 24.0, 'height': 24.0},
      {'id': '4:5', 'label': '4:5', 'width': 20.0, 'height': 25.0},
      {'id': '4:3', 'label': '4:3', 'width': 28.0, 'height': 21.0},
      {'id': '21:9', 'label': '21:9', 'width': 35.0, 'height': 15.0},
      {'id': '2.35:1', 'label': '2.35:1', 'width': 38.0, 'height': 16.0},
    ];
    
    return Column(
      key: const ValueKey('aspect_menu'),
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with back button, centered title, and confirm button
        Container(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              // Back button
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: GestureDetector(
                  onTap: () => setState(() => _isAspectMenuMode = false),
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
                    child: const Icon(Icons.chevron_left, size: 22, color: AppTheme.primary),
                  ),
                ),
              ),
              // Centered Title
              const Expanded(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'Aspect Ratio',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              // Confirm button
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () {
                    setState(() => _isAspectMenuMode = false);
                    _showSnackBar('Aspect ratio applied');
                  },
                  child: Container(
                    width: 32,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.check, size: 20, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
        
        // Horizontal Scrollable Aspect Ratio Options
        Container(
          height: 150,
          alignment: Alignment.topCenter,
          padding: const EdgeInsets.only(top: 16),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: aspectOptions.map((option) {
                final isSelected = _selectedAspectRatio == option['id'];
                final rectWidth = option['width'] as double;
                final rectHeight = option['height'] as double;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedAspectRatio = option['id'] as String;
                        _videoPosition = Offset.zero; // Reset position on aspect change
                      });
                    },
                    child: Container(
                      width: 64,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected 
                            ? AppTheme.primary.withOpacity(0.2) 
                            : Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected 
                              ? AppTheme.primary.withOpacity(0.4) 
                              : Colors.transparent,
                          width: 1.5,
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Visual aspect ratio rectangle
                          Container(
                            width: rectWidth,
                            height: rectHeight,
                            decoration: BoxDecoration(
                              color: isSelected 
                                  ? AppTheme.primary.withOpacity(0.2) 
                                  : Colors.white.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(2),
                              border: Border.all(
                                color: isSelected 
                                    ? AppTheme.primary 
                                    : Colors.white.withOpacity(0.4),
                                width: 2,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            option['label'] as String,
                            style: TextStyle(
                              color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.7),
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
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
        ),
      ],
    );
  }
  
  /// Build crop overlay on video with resizable handles
  Widget _buildCropOverlay(double containerWidth, double containerHeight) {
    return Positioned.fill(
      child: Stack(
        children: [
          // Dim overlay - top
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: containerHeight * _cropBox.top,
            child: Container(color: Colors.black.withOpacity(0.6)),
          ),
          // Dim overlay - bottom
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: containerHeight * (1 - _cropBox.top - _cropBox.height),
            child: Container(color: Colors.black.withOpacity(0.6)),
          ),
          // Dim overlay - left
          Positioned(
            top: containerHeight * _cropBox.top,
            left: 0,
            width: containerWidth * _cropBox.left,
            height: containerHeight * _cropBox.height,
            child: Container(color: Colors.black.withOpacity(0.6)),
          ),
          // Dim overlay - right
          Positioned(
            top: containerHeight * _cropBox.top,
            right: 0,
            width: containerWidth * (1 - _cropBox.left - _cropBox.width),
            height: containerHeight * _cropBox.height,
            child: Container(color: Colors.black.withOpacity(0.6)),
          ),
          // Crop box with border
          Positioned(
            left: containerWidth * _cropBox.left,
            top: containerHeight * _cropBox.top,
            width: containerWidth * _cropBox.width,
            height: containerHeight * _cropBox.height,
            child: Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 2),
              ),
              child: Stack(
                children: [
                  // Grid lines (rule of thirds)
                  Positioned(
                    left: containerWidth * _cropBox.width / 3 - 0.5,
                    top: 0,
                    bottom: 0,
                    child: Container(width: 1, color: Colors.white.withOpacity(0.3)),
                  ),
                  Positioned(
                    left: containerWidth * _cropBox.width * 2 / 3 - 0.5,
                    top: 0,
                    bottom: 0,
                    child: Container(width: 1, color: Colors.white.withOpacity(0.3)),
                  ),
                  Positioned(
                    top: containerHeight * _cropBox.height / 3 - 0.5,
                    left: 0,
                    right: 0,
                    child: Container(height: 1, color: Colors.white.withOpacity(0.3)),
                  ),
                  Positioned(
                    top: containerHeight * _cropBox.height * 2 / 3 - 0.5,
                    left: 0,
                    right: 0,
                    child: Container(height: 1, color: Colors.white.withOpacity(0.3)),
                  ),
                  // Corner handles
                  _buildCropHandle('top-left', -10, -10, null, null),
                  _buildCropHandle('top-right', null, -10, -10, null),
                  _buildCropHandle('bottom-left', -10, null, null, -10),
                  _buildCropHandle('bottom-right', null, null, -10, -10),
                  // Edge handles
                  _buildEdgeHandle('top'),
                  _buildEdgeHandle('bottom'),
                  _buildEdgeHandle('left'),
                  _buildEdgeHandle('right'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildCropHandle(String handle, double? left, double? top, double? right, double? bottom) {
    return Positioned(
      left: left,
      top: top,
      right: right,
      bottom: bottom,
      child: GestureDetector(
        onPanStart: (details) {
          _cropDragHandle = handle;
          _cropDragStart = details.globalPosition;
          _cropDragStartBox = _cropBox;
        },
        onPanUpdate: (details) {
          if (_cropDragHandle == null) return;
          final delta = details.globalPosition - _cropDragStart;
          final deltaX = delta.dx / 350; // Approximate container width
          final deltaY = delta.dy / 250; // Approximate container height
          
          setState(() {
            var newBox = _cropDragStartBox;
            
            if (handle.contains('left')) {
              final newLeft = (newBox.left + deltaX).clamp(0.0, newBox.right - 0.1);
              newBox = Rect.fromLTRB(newLeft, newBox.top, newBox.right, newBox.bottom);
            }
            if (handle.contains('right')) {
              final newRight = (newBox.right + deltaX).clamp(newBox.left + 0.1, 1.0);
              newBox = Rect.fromLTRB(newBox.left, newBox.top, newRight, newBox.bottom);
            }
            if (handle.contains('top')) {
              final newTop = (newBox.top + deltaY).clamp(0.0, newBox.bottom - 0.1);
              newBox = Rect.fromLTRB(newBox.left, newTop, newBox.right, newBox.bottom);
            }
            if (handle.contains('bottom')) {
              final newBottom = (newBox.bottom + deltaY).clamp(newBox.top + 0.1, 1.0);
              newBox = Rect.fromLTRB(newBox.left, newBox.top, newBox.right, newBottom);
            }
            
            _cropBox = newBox;
          });
        },
        onPanEnd: (_) => _cropDragHandle = null,
        child: Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
      ),
    );
  }
  
  Widget _buildEdgeHandle(String edge) {
    final isHorizontal = edge == 'top' || edge == 'bottom';
    
    return Positioned(
      left: edge == 'left' ? -3 : (edge == 'right' ? null : 0),
      right: edge == 'right' ? -3 : (edge == 'left' ? null : 0),
      top: edge == 'top' ? -3 : (edge == 'bottom' ? null : 0),
      bottom: edge == 'bottom' ? -3 : (edge == 'top' ? null : 0),
      child: Center(
        child: GestureDetector(
          onPanStart: (details) {
            _cropDragHandle = edge;
            _cropDragStart = details.globalPosition;
            _cropDragStartBox = _cropBox;
          },
          onPanUpdate: (details) {
            if (_cropDragHandle == null) return;
            final delta = details.globalPosition - _cropDragStart;
            final deltaX = delta.dx / 350;
            final deltaY = delta.dy / 250;
            
            setState(() {
              var newBox = _cropDragStartBox;
              
              if (edge == 'top') {
                final newTop = (newBox.top + deltaY).clamp(0.0, newBox.bottom - 0.1);
                newBox = Rect.fromLTRB(newBox.left, newTop, newBox.right, newBox.bottom);
              } else if (edge == 'bottom') {
                final newBottom = (newBox.bottom + deltaY).clamp(newBox.top + 0.1, 1.0);
                newBox = Rect.fromLTRB(newBox.left, newBox.top, newBox.right, newBottom);
              } else if (edge == 'left') {
                final newLeft = (newBox.left + deltaX).clamp(0.0, newBox.right - 0.1);
                newBox = Rect.fromLTRB(newLeft, newBox.top, newBox.right, newBox.bottom);
              } else if (edge == 'right') {
                final newRight = (newBox.right + deltaX).clamp(newBox.left + 0.1, 1.0);
                newBox = Rect.fromLTRB(newBox.left, newBox.top, newRight, newBox.bottom);
              }
              
              _cropBox = newBox;
            });
          },
          onPanEnd: (_) => _cropDragHandle = null,
          child: Container(
            width: isHorizontal ? 24 : 5,
            height: isHorizontal ? 5 : 24,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        ),
      ),
    );
  }
  
  /// Build the crop menu - aspect ratio presets, rotate, mirror controls
  Widget _buildCropMenu() {
    return Column(
      key: const ValueKey('crop_menu'),
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with back and confirm buttons
        Container(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              // Back button
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _isCropMode = false;
                      _cropRotation = 0;
                      _cropMirror = false;
                    });
                  },
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
              const Expanded(
                child: Center(
                  child: Text(
                    'Crop',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              // Confirm button
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () {
                    _showSnackBar('Crop applied: $_cropAspectRatio${_cropRotation > 0 ? ", ${_cropRotation}°" : ""}${_cropMirror ? ", mirrored" : ""}');
                    setState(() => _isCropMode = false);
                  },
                  child: Container(
                    width: 32,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.check,
                      size: 20,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        
        // Aspect Ratio Presets Row
        Container(
          height: 56,
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05))),
          ),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _cropPresets.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final preset = _cropPresets[index];
              final isSelected = _cropAspectRatio == preset['id'];
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _cropAspectRatio = preset['id'];
                    // Reset crop box for aspect ratio
                    if (preset['id'] != 'free') {
                      final parts = preset['id'].toString().split(':');
                      final w = double.parse(parts[0]);
                      final h = double.parse(parts[1]);
                      final ratio = w / h;
                      final newWidth = 0.8;
                      final newHeight = (newWidth / ratio).clamp(0.1, 0.8);
                      _cropBox = Rect.fromLTWH(
                        (1 - newWidth) / 2,
                        (1 - newHeight) / 2,
                        newWidth,
                        newHeight,
                      );
                    }
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.primary.withOpacity(0.2) : Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected ? AppTheme.primary : Colors.transparent,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      preset['label'],
                      style: TextStyle(
                        color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.7),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
        
        // Rotate and Mirror Row
        Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Rotate button
              GestureDetector(
                onTap: () => setState(() => _cropRotation = (_cropRotation + 90) % 360),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.rotate_right,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _cropRotation > 0 ? 'Rotate (${_cropRotation}°)' : 'Rotate',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.6),
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 40),
              // Mirror button
              GestureDetector(
                onTap: () => setState(() => _cropMirror = !_cropMirror),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _cropMirror ? AppTheme.primary.withOpacity(0.3) : Colors.white.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.flip,
                        color: _cropMirror ? AppTheme.primary : Colors.white,
                        size: 22,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Mirror',
                      style: TextStyle(
                        color: _cropMirror ? AppTheme.primary : Colors.white.withOpacity(0.6),
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
  
  /// Build the draw menu - brush/eraser tools, colors, size controls
  Widget _buildDrawMenu() {
    return Column(
      key: const ValueKey('draw_menu'),
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with undo/redo, back, and confirm buttons
        Container(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              // Undo button
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: GestureDetector(
                  onTap: () {
                    if (_drawUndoStack.isNotEmpty) {
                      _drawRedoStack.add(List.from(_currentStrokes.map((s) => DrawingStroke(
                        id: s.id,
                        points: List.from(s.points),
                        color: s.color,
                        size: s.size,
                        tool: s.tool,
                      ))));
                      setState(() {
                        _currentStrokes = _drawUndoStack.removeLast();
                      });
                    }
                  },
                  child: Container(
                    width: 32,
                    height: 36,
                    decoration: BoxDecoration(
                      color: _drawUndoStack.isEmpty 
                          ? Colors.white.withOpacity(0.05) 
                          : Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.undo,
                      size: 18,
                      color: _drawUndoStack.isEmpty 
                          ? Colors.white.withOpacity(0.3) 
                          : Colors.white.withOpacity(0.8),
                    ),
                  ),
                ),
              ),
              // Redo button
              Padding(
                padding: const EdgeInsets.only(left: 4),
                child: GestureDetector(
                  onTap: () {
                    if (_drawRedoStack.isNotEmpty) {
                      _drawUndoStack.add(List.from(_currentStrokes.map((s) => DrawingStroke(
                        id: s.id,
                        points: List.from(s.points),
                        color: s.color,
                        size: s.size,
                        tool: s.tool,
                      ))));
                      setState(() {
                        _currentStrokes = _drawRedoStack.removeLast();
                      });
                    }
                  },
                  child: Container(
                    width: 32,
                    height: 36,
                    decoration: BoxDecoration(
                      color: _drawRedoStack.isEmpty 
                          ? Colors.white.withOpacity(0.05) 
                          : Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.redo,
                      size: 18,
                      color: _drawRedoStack.isEmpty 
                          ? Colors.white.withOpacity(0.3) 
                          : Colors.white.withOpacity(0.8),
                    ),
                  ),
                ),
              ),
              const Spacer(),
              // Title
              const Text(
                'Draw',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              // Cancel button
              Padding(
                padding: const EdgeInsets.only(right: 4),
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _currentStrokes.clear();
                      _currentDrawingPoints.clear();
                      _drawUndoStack.clear();
                      _drawRedoStack.clear();
                      _isDrawMode = false;
                    });
                  },
                  child: Container(
                    width: 32,
                    height: 36,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.close, size: 18, color: Colors.white),
                  ),
                ),
              ),
              // Confirm button
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: _saveDrawingAsLayer,
                  child: Container(
                    width: 32,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.check, size: 20, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
        
        // Tools Row - Brush, Eraser, Clear
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Brush tool
              GestureDetector(
                onTap: () => setState(() => _drawTool = 'brush'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: _drawTool == 'brush' 
                        ? AppTheme.primary.withOpacity(0.2) 
                        : Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _drawTool == 'brush' ? AppTheme.primary.withOpacity(0.4) : Colors.transparent,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: _drawTool == 'brush' ? AppTheme.primary.withOpacity(0.3) : Colors.white.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.brush,
                          size: 18,
                          color: _drawTool == 'brush' ? AppTheme.primary : Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Brush',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          color: _drawTool == 'brush' ? AppTheme.primary : Colors.white.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // Eraser tool
              GestureDetector(
                onTap: () => setState(() => _drawTool = 'eraser'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: _drawTool == 'eraser' 
                        ? AppTheme.primary.withOpacity(0.2) 
                        : Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _drawTool == 'eraser' ? AppTheme.primary.withOpacity(0.4) : Colors.transparent,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: _drawTool == 'eraser' ? AppTheme.primary.withOpacity(0.3) : Colors.white.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.auto_fix_normal,
                          size: 18,
                          color: _drawTool == 'eraser' ? AppTheme.primary : Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Eraser',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                          color: _drawTool == 'eraser' ? AppTheme.primary : Colors.white.withOpacity(0.6),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // Clear All
              GestureDetector(
                onTap: () {
                  if (_currentStrokes.isNotEmpty) {
                    _drawUndoStack.add(List.from(_currentStrokes.map((s) => DrawingStroke(
                      id: s.id,
                      points: List.from(s.points),
                      color: s.color,
                      size: s.size,
                      tool: s.tool,
                    ))));
                    setState(() {
                      _currentStrokes.clear();
                    });
                  }
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Clear',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: Colors.red),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        
        // Color Picker Row
        Container(
          height: 40,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _drawColorPresets.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final color = _drawColorPresets[index];
              final isSelected = _drawColor == color && _drawTool == 'brush';
              return GestureDetector(
                onTap: () => setState(() {
                  _drawColor = color;
                  _drawTool = 'brush';
                }),
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? Colors.white : Colors.transparent,
                      width: 2,
                    ),
                    boxShadow: isSelected ? [
                      BoxShadow(color: color.withOpacity(0.5), blurRadius: 8),
                    ] : null,
                  ),
                ),
              );
            },
          ),
        ),
        
        // Size Slider
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Text('Size', style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12)),
              const SizedBox(width: 12),
              Expanded(
                child: SliderTheme(
                  data: SliderThemeData(
                    activeTrackColor: AppTheme.primary,
                    inactiveTrackColor: Colors.white.withOpacity(0.2),
                    thumbColor: Colors.white,
                    thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
                    trackHeight: 3,
                  ),
                  child: Slider(
                    value: _drawSize,
                    min: 1,
                    max: 30,
                    onChanged: (v) => setState(() => _drawSize = v),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text('${_drawSize.round()}px', style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12)),
            ],
          ),
        ),
      ],
    );
  }
  
  /// Build the background menu - horizontal scrollable menu with tabs
  Widget _buildBackgroundMenu() {
    return Column(
      key: const ValueKey('background_menu'),
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with back button, centered title, and confirm button
        Container(
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Row(
            children: [
              // Back button
              Padding(
                padding: const EdgeInsets.only(left: 8),
                child: GestureDetector(
                  onTap: () {
                    if (_backgroundTab == 'main') {
                      setState(() => _isBackgroundMenuMode = false);
                    } else {
                      setState(() => _backgroundTab = 'main');
                    }
                  },
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
                    child: const Icon(Icons.chevron_left, size: 22, color: AppTheme.primary),
                  ),
                ),
              ),
              // Centered Title
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    _backgroundTab == 'main' ? 'Background' : _backgroundTab[0].toUpperCase() + _backgroundTab.substring(1),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ),
              // Confirm button
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _isBackgroundMenuMode = false;
                      _backgroundTab = 'main';
                    });
                    _showSnackBar('Background applied');
                  },
                  child: Container(
                    width: 32,
                    height: 36,
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.check, size: 20, color: Colors.white),
                  ),
                ),
              ),
            ],
          ),
        ),
        
        // Content based on tab
        Expanded(
          child: _backgroundTab == 'main' 
            ? _buildBackgroundMainMenu()
            : _buildBackgroundSubContent(),
        ),
      ],
    );
  }
  
  /// Build the main background menu with Color, Image, Blur options
  Widget _buildBackgroundMainMenu() {
    final options = [
      {'id': 'color', 'label': 'Color', 'icon': Icons.palette_outlined},
      {'id': 'image', 'label': 'Image', 'icon': Icons.image_outlined},
      {'id': 'blur', 'label': 'Blur', 'icon': Icons.blur_on},
    ];
    
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 0),
      child: Row(
        children: options.map((option) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: GestureDetector(
              onTap: () => setState(() => _backgroundTab = option['id'] as String),
              child: Container(
                width: 64,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        option['icon'] as IconData,
                        size: 20,
                        color: Colors.white.withOpacity(0.7),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      option['label'] as String,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.7),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
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
              
              // Overlay tool opens the overlay menu
              if (tool.id == 'overlay') {
                setState(() {
                  _isOverlayMenuMode = true;
                  _selectedTool = 'overlay';
                });
                return;
              }
              
              // Captions tool opens the captions menu
              if (tool.id == 'captions') {
                setState(() {
                  _isCaptionsMenuMode = true;
                  _selectedTool = 'captions';
                });
                return;
              }
              
              setState(() => _selectedTool = tool.id);
              
              // Edit tool opens the edit menu (same style as audio)
              if (tool.id == 'edit') {
                if (_videoClips.isNotEmpty) {
                  // Always select the first clip (original layer) when clicking Edit button
                  final targetClipId = _videoClips.first.id;
                  _selectedClipId = targetClipId;
                  _editingClipId = targetClipId;
                  _editingLayerType = 'clip'; // Editing main video clip
                  
                  // Load the selected clip's volume and speed
                  final targetClip = _videoClips.first;
                  _clipVolume = targetClip.volume;
                  _clipSpeed = targetClip.speed;
                  
                  setState(() => _isEditMenuMode = true);
                } else {
                  _showSnackBar('Add a video clip first');
                }
                return;
              }
              
              // Aspect tool opens the aspect ratio menu
              if (tool.id == 'aspect') {
                setState(() => _isAspectMenuMode = true);
                return;
              }
              
              // Background tool opens the background menu
              if (tool.id == 'background') {
                setState(() {
                  _isBackgroundMenuMode = true;
                  _backgroundTab = 'main';
                });
                return;
              }
              
              // Only show coming soon for non-functional tools
              if (tool.id != 'adjust' && tool.id != 'filters' && tool.id != 'stickers') {
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
      volume: clip.volume,
      speed: clip.speed,
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
    if (_backgroundTab == 'main') {
      // Main Menu - Horizontal scrollable style like Edit/Audio
      return SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        child: Row(
          children: [
            _buildBackgroundMainButton('color', 'Color', Icons.palette_outlined),
            _buildBackgroundMainButton('image', 'Image', Icons.image_outlined),
            _buildBackgroundMainButton('blur', 'Blur', Icons.blur_on),
          ],
        ),
      );
    }
    
    // Sub-menu with Back Arrow
    return Column(
      children: [
        // Header with Back Arrow
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              GestureDetector(
                onTap: () => setState(() => _backgroundTab = 'main'),
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.arrow_back,
                    size: 16,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                _backgroundTab[0].toUpperCase() + _backgroundTab.substring(1),
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
        
        // Horizontal Divider
        Container(
          height: 1,
          margin: const EdgeInsets.symmetric(horizontal: 16),
          color: Colors.white.withOpacity(0.1),
        ),
        
        // Sub-menu Content
        Padding(
          padding: const EdgeInsets.all(16),
          child: _buildBackgroundSubContent(),
        ),
      ],
    );
  }
  
  Widget _buildBackgroundMainButton(String id, String label, IconData icon) {
    return GestureDetector(
      onTap: () => setState(() => _backgroundTab = id),
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
              child: Icon(icon, size: 20, color: Colors.white),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: Colors.white.withOpacity(0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildBackgroundSubContent() {
    switch (_backgroundTab) {
      case 'color':
        return SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: _backgroundColorPresets.map((color) {
              final isSelected = _backgroundColor == color;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: GestureDetector(
                  onTap: () => setState(() => _backgroundColor = color),
                  child: Container(
                    width: 40,
                    height: 40,
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
                ),
              );
            }).toList(),
          ),
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
            // Blur Slider
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Blur Intensity',
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
            const SizedBox(height: 12),
            SliderTheme(
              data: SliderTheme.of(context).copyWith(
                trackHeight: 8,
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
            
            const SizedBox(height: 16),
            
            // Quick Presets
            Row(
              children: blurPresets.map((preset) {
                final isSelected = _backgroundBlur == preset['value'];
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: GestureDetector(
                      onTap: () => setState(() => _backgroundBlur = preset['value'] as double),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primary : Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Center(
                          child: Text(
                            preset['label'] as String,
                            style: TextStyle(
                              fontSize: 11,
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

  /// Build video overlays (picture-in-picture) in the preview area
  List<Widget> _buildVideoOverlays(BoxConstraints constraints) {
    final currentTime = _currentTimelinePosition;
    
    return _videoOverlays.where((overlay) {
      // Only show overlay if current time is within its time range
      return currentTime >= overlay.startTime && currentTime <= overlay.endTime;
    }).map((overlay) {
      if (overlay.controller == null || !overlay.isInitialized) {
        return const SizedBox.shrink();
      }
      
      final isSelected = overlay.id == _selectedOverlayId;
      
      // Calculate position and size
      final overlayWidth = constraints.maxWidth * overlay.width * overlay.scaleX;
      final overlayHeight = constraints.maxHeight * overlay.height * overlay.scaleY;
      final left = (constraints.maxWidth * overlay.position.dx - overlayWidth / 2).clamp(0.0, constraints.maxWidth - overlayWidth);
      final top = (constraints.maxHeight * overlay.position.dy - overlayHeight / 2).clamp(0.0, constraints.maxHeight - overlayHeight);
      
      // Sync overlay playback
      _syncVideoOverlaysToTime(currentTime);
      
      return Positioned(
        left: left,
        top: top,
        width: overlayWidth,
        height: overlayHeight,
        child: GestureDetector(
          onTap: () => setState(() => _selectedOverlayId = overlay.id),
          onPanUpdate: (details) {
            // Drag to reposition with boundary constraints
            setState(() {
              final newX = (overlay.position.dx + details.delta.dx / constraints.maxWidth).clamp(0.05, 0.95);
              final newY = (overlay.position.dy + details.delta.dy / constraints.maxHeight).clamp(0.05, 0.95);
              overlay.position = Offset(newX, newY);
            });
          },
          child: Opacity(
            opacity: overlay.opacity,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                // Video container with border when selected
                Container(
                  decoration: BoxDecoration(
                    border: isSelected 
                        ? Border.all(color: Colors.white, width: 2)
                        : null,
                    borderRadius: BorderRadius.circular(4),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.5),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(isSelected ? 2 : 4),
                    child: AspectRatio(
                      aspectRatio: overlay.controller!.value.aspectRatio,
                      child: VideoPlayer(overlay.controller!),
                    ),
                  ),
                ),
                // Control handles when selected
                if (isSelected) ...[
                  // Delete button - top left
                  Positioned(
                    top: -12,
                    left: -12,
                    child: GestureDetector(
                      onTap: () => _removeVideoOverlay(overlay.id),
                      child: Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close, color: Colors.white, size: 14),
                      ),
                    ),
                  ),
                  // Resize handle - bottom right
                  Positioned(
                    bottom: -12,
                    right: -12,
                    child: GestureDetector(
                      onPanUpdate: (details) {
                        setState(() {
                          final deltaX = details.delta.dx * 0.003;
                          final deltaY = details.delta.dy * 0.003;
                          overlay.scaleX = (overlay.scaleX + deltaX).clamp(0.3, 2.0);
                          overlay.scaleY = (overlay.scaleY + deltaY).clamp(0.3, 2.0);
                        });
                      },
                      child: Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.9),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.open_in_full, color: Colors.black, size: 14),
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
          // Single tap: Select and show text edit panel
          onTap: () {
            if (isSelected) {
              // Already selected - ensure edit panel is open
              setState(() => _showTextEditPanel = true);
            } else {
              // Select the text overlay - will auto-open edit panel
              _selectTextOverlay(overlay.id);
            }
          },
          // Double tap: Always open inline editor
          onDoubleTap: () => _openInlineTextEditor(overlay),
          // Pan for smooth dragging - with boundary constraints
          onPanUpdate: (details) {
            if (!_isTextEditorInline) {
              setState(() {
                // Boundary constraints: keep text within 2%-98% of video area
                final newX = (overlay.position.dx + details.delta.dx / constraints.maxWidth).clamp(0.02, 0.98);
                final newY = (overlay.position.dy + details.delta.dy / constraints.maxHeight).clamp(0.02, 0.98);
                overlay.position = Offset(newX, newY);
              });
            }
          },
          child: Transform.rotate(
            angle: (overlay.rotation * math.pi / 180), // Convert degrees to radians
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                // Text content with independent scaleX/scaleY
                AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  transform: Matrix4.identity()
                    ..scale(overlay.scaleX, overlay.scaleY),
                  transformAlignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: overlay.hasBackground 
                        ? overlay.backgroundColor.withOpacity(overlay.backgroundOpacity)
                        : null,
                    borderRadius: BorderRadius.circular(4),
                    // Thin white border when selected - crisp and visible
                    border: isSelected 
                        ? Border.all(color: Colors.white.withOpacity(0.9), width: 1)
                        : null,
                  ),
                  child: Opacity(
                    opacity: overlay.opacity,
                    child: Text(
                      overlay.text,
                      style: TextStyle(
                        color: overlay.textColor,
                        fontSize: overlay.fontSize,
                        fontWeight: FontWeight.bold,
                        fontFamily: overlay.fontFamily,
                      ),
                      textAlign: overlay.alignment,
                    ),
                  ),
                ),
                // Transform handles - X in top-left, Free-form Resize in bottom-right
                if (isSelected) ...[
                  // X Delete button - top left corner
                  Positioned(
                    top: -14,
                    left: -14,
                    child: GestureDetector(
                      onTap: () {
                        _saveStateToHistory();
                        setState(() {
                          _textOverlays.removeWhere((t) => t.id == overlay.id);
                          if (_selectedTextId == overlay.id) {
                            _selectedTextId = null;
                            _showTextEditPanel = false;
                          }
                        });
                        _showSnackBar('Text deleted');
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.8),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withOpacity(0.5), width: 1),
                        ),
                        child: const Icon(Icons.close, color: Colors.white, size: 16),
                      ),
                    ),
                  ),
                  // Free-form Resize handle - bottom right corner (independent width/height)
                  Positioned(
                    bottom: -14,
                    right: -14,
                    child: GestureDetector(
                      onPanUpdate: (details) {
                        setState(() {
                          // Independent width/height scaling
                          final deltaX = details.delta.dx * 0.01;
                          final deltaY = details.delta.dy * 0.01;
                          
                          // Calculate new scales with boundary constraints
                          var newScaleX = (overlay.scaleX + deltaX).clamp(0.3, 3.0);
                          var newScaleY = (overlay.scaleY + deltaY).clamp(0.3, 3.0);
                          
                          // Boundary constraints: prevent text from exceeding video area
                          final textWidth = 100 * newScaleX;
                          final textHeight = 30 * newScaleY;
                          final posX = overlay.position.dx * constraints.maxWidth;
                          final posY = overlay.position.dy * constraints.maxHeight;
                          
                          if (posX + textWidth / 2 > constraints.maxWidth) {
                            newScaleX = ((constraints.maxWidth - posX) * 2 / 100).clamp(0.3, 3.0);
                          }
                          if (posY + textHeight / 2 > constraints.maxHeight) {
                            newScaleY = ((constraints.maxHeight - posY) * 2 / 30).clamp(0.3, 3.0);
                          }
                          
                          overlay.scaleX = newScaleX;
                          overlay.scaleY = newScaleY;
                        });
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.8),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withOpacity(0.5), width: 1),
                        ),
                        // 4-way diagonal resize arrow icon
                        child: CustomPaint(
                          size: const Size(16, 16),
                          painter: _FourWayResizeIconPainter(),
                        ),
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
  final List<double> waveformData;
  
  _AudioWaveformPainter({
    required this.color,
    required this.backgroundColor,
    this.waveformData = const [],
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
    
    if (waveformData.isNotEmpty) {
      // Use actual waveform data
      final barCount = waveformData.length;
      final spacing = size.width / barCount;
      
      for (int i = 0; i < barCount; i++) {
        final amp = waveformData[i].clamp(0.0, 1.0);
        final height = (0.1 + amp * 0.8) * size.height * 0.9;
        final halfHeight = height / 2;
        final x = i * spacing + spacing / 2;
        
        canvas.drawLine(
          Offset(x, centerY - halfHeight),
          Offset(x, centerY + halfHeight),
          barPaint,
        );
      }
    } else {
      // Fallback: pseudo-random waveform
      final barCount = (size.width / 4).toInt();
      final spacing = size.width / barCount;
      
      for (int i = 0; i < barCount; i++) {
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
  }
  
  @override
  bool shouldRepaint(covariant _AudioWaveformPainter oldDelegate) => 
    waveformData != oldDelegate.waveformData || 
    color != oldDelegate.color;
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

/// Custom painter for the rotate/resize icon (square with curved arrow)
class _RotateResizeIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    
    final center = Offset(size.width / 2, size.height / 2);
    
    // Draw small rectangle
    final rect = Rect.fromCenter(
      center: Offset(center.dx - 1, center.dy + 1),
      width: 8,
      height: 8,
    );
    canvas.drawRect(rect, paint);
    
    // Draw curved arrow (rotation indicator)
    final arrowPath = Path();
    arrowPath.moveTo(center.dx + 4, center.dy - 4);
    arrowPath.arcTo(
      Rect.fromCircle(center: center, radius: 5),
      -0.5, // start angle
      1.5,  // sweep angle
      false,
    );
    canvas.drawPath(arrowPath, paint);
    
    // Arrow head
    final arrowHeadPath = Path();
    arrowHeadPath.moveTo(center.dx + 4, center.dy - 6);
    arrowHeadPath.lineTo(center.dx + 4, center.dy - 2);
    arrowHeadPath.lineTo(center.dx + 7, center.dy - 4);
    canvas.drawPath(arrowHeadPath, paint);
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Custom painter for the 4-way diagonal resize arrow icon
class _FourWayResizeIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    
    final center = Offset(size.width / 2, size.height / 2);
    
    // Draw 4-way diagonal arrows
    // Top-left arrow
    canvas.drawLine(Offset(center.dx - 4, center.dy - 4), Offset(center.dx - 1, center.dy - 1), paint);
    canvas.drawLine(Offset(center.dx - 4, center.dy - 4), Offset(center.dx - 4, center.dy - 1), paint);
    canvas.drawLine(Offset(center.dx - 4, center.dy - 4), Offset(center.dx - 1, center.dy - 4), paint);
    
    // Bottom-right arrow
    canvas.drawLine(Offset(center.dx + 4, center.dy + 4), Offset(center.dx + 1, center.dy + 1), paint);
    canvas.drawLine(Offset(center.dx + 4, center.dy + 4), Offset(center.dx + 4, center.dy + 1), paint);
    canvas.drawLine(Offset(center.dx + 4, center.dy + 4), Offset(center.dx + 1, center.dy + 4), paint);
    
    // Top-right arrow
    canvas.drawLine(Offset(center.dx + 4, center.dy - 4), Offset(center.dx + 1, center.dy - 1), paint);
    canvas.drawLine(Offset(center.dx + 4, center.dy - 4), Offset(center.dx + 4, center.dy - 1), paint);
    canvas.drawLine(Offset(center.dx + 4, center.dy - 4), Offset(center.dx + 1, center.dy - 4), paint);
    
    // Bottom-left arrow
    canvas.drawLine(Offset(center.dx - 4, center.dy + 4), Offset(center.dx - 1, center.dy + 1), paint);
    canvas.drawLine(Offset(center.dx - 4, center.dy + 4), Offset(center.dx - 4, center.dy + 1), paint);
    canvas.drawLine(Offset(center.dx - 4, center.dy + 4), Offset(center.dx - 1, center.dy + 4), paint);
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Custom painter for speed curve preset thumbnails
class _SpeedCurvePainter extends CustomPainter {
  final String curveId;
  final bool isSelected;
  
  _SpeedCurvePainter(this.curveId, this.isSelected);
  
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = isSelected ? AppTheme.primary : Colors.white.withOpacity(0.5)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    
    final path = Path();
    
    switch (curveId) {
      case 'montage':
        path.moveTo(2, size.height - 4);
        path.lineTo(size.width * 0.25, 4);
        path.lineTo(size.width * 0.45, size.height * 0.6);
        path.lineTo(size.width * 0.65, 2);
        path.lineTo(size.width * 0.8, size.height * 0.5);
        path.lineTo(size.width - 2, 6);
        break;
      case 'hero':
        path.moveTo(2, 6);
        path.quadraticBezierTo(size.width * 0.35, 6, size.width * 0.5, size.height - 6);
        path.quadraticBezierTo(size.width * 0.65, 6, size.width - 2, 6);
        break;
      case 'bullet':
        path.moveTo(2, 4);
        path.lineTo(size.width * 0.35, 4);
        path.lineTo(size.width * 0.4, size.height - 4);
        path.lineTo(size.width * 0.6, size.height - 4);
        path.lineTo(size.width * 0.65, 4);
        path.lineTo(size.width - 2, 4);
        break;
      case 'jump_cut':
        path.moveTo(2, size.height * 0.6);
        path.lineTo(size.width * 0.28, size.height * 0.6);
        path.lineTo(size.width * 0.28, size.height * 0.25);
        path.lineTo(size.width * 0.5, size.height * 0.25);
        path.lineTo(size.width * 0.5, size.height * 0.75);
        path.lineTo(size.width * 0.72, size.height * 0.75);
        path.lineTo(size.width * 0.72, size.height * 0.4);
        path.lineTo(size.width - 2, size.height * 0.4);
        break;
      case 'ramp_up':
        path.moveTo(2, size.height - 4);
        path.quadraticBezierTo(size.width * 0.5, size.height - 4, size.width - 2, 4);
        break;
      case 'ramp_down':
        path.moveTo(2, 4);
        path.quadraticBezierTo(size.width * 0.5, 4, size.width - 2, size.height - 4);
        break;
    }
    
    canvas.drawPath(path, paint);
  }
  
  @override
  bool shouldRepaint(covariant _SpeedCurvePainter oldDelegate) => 
      oldDelegate.curveId != curveId || oldDelegate.isSelected != isSelected;
}

/// Custom painter for drawing layer overlay (saved drawings)
class _DrawingLayerPainter extends CustomPainter {
  final List<DrawingStroke> strokes;
  
  _DrawingLayerPainter({required this.strokes});
  
  @override
  void paint(Canvas canvas, Size size) {
    for (final stroke in strokes) {
      if (stroke.points.isEmpty || stroke.points.length < 2) continue;
      
      final paint = Paint()
        ..color = stroke.tool == 'eraser' ? Colors.transparent : stroke.color
        ..strokeWidth = stroke.size
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;
      
      if (stroke.tool == 'eraser') {
        paint.blendMode = BlendMode.clear;
      }
      
      final path = Path();
      final firstPoint = stroke.points.first;
      path.moveTo(firstPoint.dx * size.width, firstPoint.dy * size.height);
      
      for (int i = 1; i < stroke.points.length; i++) {
        final point = stroke.points[i];
        path.lineTo(point.dx * size.width, point.dy * size.height);
      }
      
      canvas.drawPath(path, paint);
    }
  }
  
  @override
  bool shouldRepaint(covariant _DrawingLayerPainter oldDelegate) => 
      strokes != oldDelegate.strokes;
}

/// Custom painter for active drawing canvas
class _DrawingCanvasPainter extends CustomPainter {
  final List<DrawingStroke> strokes;
  final List<Offset> currentPoints;
  final Color currentColor;
  final double currentSize;
  final String currentTool;
  
  _DrawingCanvasPainter({
    required this.strokes,
    required this.currentPoints,
    required this.currentColor,
    required this.currentSize,
    required this.currentTool,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    // Draw existing strokes
    for (final stroke in strokes) {
      if (stroke.points.isEmpty || stroke.points.length < 2) continue;
      
      final paint = Paint()
        ..color = stroke.tool == 'eraser' ? Colors.grey.withOpacity(0.5) : stroke.color
        ..strokeWidth = stroke.size
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;
      
      final path = Path();
      final firstPoint = stroke.points.first;
      path.moveTo(firstPoint.dx * size.width, firstPoint.dy * size.height);
      
      for (int i = 1; i < stroke.points.length; i++) {
        final point = stroke.points[i];
        path.lineTo(point.dx * size.width, point.dy * size.height);
      }
      
      canvas.drawPath(path, paint);
    }
    
    // Draw current active stroke
    if (currentPoints.length >= 2) {
      final paint = Paint()
        ..color = currentTool == 'eraser' ? Colors.grey.withOpacity(0.5) : currentColor
        ..strokeWidth = currentSize
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..style = PaintingStyle.stroke;
      
      final path = Path();
      final firstPoint = currentPoints.first;
      path.moveTo(firstPoint.dx * size.width, firstPoint.dy * size.height);
      
      for (int i = 1; i < currentPoints.length; i++) {
        final point = currentPoints[i];
        path.lineTo(point.dx * size.width, point.dy * size.height);
      }
      
      canvas.drawPath(path, paint);
    }
  }
  
  @override
  bool shouldRepaint(covariant _DrawingCanvasPainter oldDelegate) => true;
}
