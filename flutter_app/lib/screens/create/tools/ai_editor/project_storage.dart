import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:video_player/video_player.dart';
import 'package:path_provider/path_provider.dart';

/// Editor Project model for AI Editor
class EditorProject {
  final String id;
  String title;
  final DateTime createdAt;
  DateTime updatedAt;
  String? thumbnail; // Base64 encoded thumbnail
  
  // Video state
  String? videoUrl;
  double videoDuration;
  double videoWidth;
  double videoHeight;
  
  // Clip state
  List<SavedVideoClip> videoClips;
  
  // Overlay layers
  List<SavedTextOverlay> textOverlays;
  List<SavedAudioLayer> audioLayers;
  List<SavedEffectLayer> effectLayers;
  List<SavedCaptionLayer> captionLayers;
  List<SavedDrawingLayer> drawingLayers;
  List<SavedVideoOverlay> videoOverlays;
  
  // Adjustments
  Map<String, double> adjustments;
  
  // Background state
  String selectedAspectRatio;
  int backgroundColor; // Color value as int
  double backgroundBlur;
  String? backgroundImage;
  double videoPositionX;
  double videoPositionY;

  EditorProject({
    required this.id,
    required this.title,
    required this.createdAt,
    required this.updatedAt,
    this.thumbnail,
    this.videoUrl,
    this.videoDuration = 0,
    this.videoWidth = 0,
    this.videoHeight = 0,
    List<SavedVideoClip>? videoClips,
    List<SavedTextOverlay>? textOverlays,
    List<SavedAudioLayer>? audioLayers,
    List<SavedEffectLayer>? effectLayers,
    List<SavedCaptionLayer>? captionLayers,
    List<SavedDrawingLayer>? drawingLayers,
    List<SavedVideoOverlay>? videoOverlays,
    Map<String, double>? adjustments,
    this.selectedAspectRatio = 'original',
    this.backgroundColor = 0xFF000000,
    this.backgroundBlur = 0,
    this.backgroundImage,
    this.videoPositionX = 0,
    this.videoPositionY = 0,
  }) : videoClips = videoClips ?? [],
       textOverlays = textOverlays ?? [],
       audioLayers = audioLayers ?? [],
       effectLayers = effectLayers ?? [],
       captionLayers = captionLayers ?? [],
       drawingLayers = drawingLayers ?? [],
       videoOverlays = videoOverlays ?? [],
       adjustments = adjustments ?? {
         'brightness': 0,
         'contrast': 0,
         'saturation': 0,
         'exposure': 0,
         'sharpen': 0,
         'highlight': 0,
         'shadow': 0,
         'temp': 0,
         'hue': 0,
       };

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'createdAt': createdAt.toIso8601String(),
    'updatedAt': updatedAt.toIso8601String(),
    'thumbnail': thumbnail,
    'videoUrl': videoUrl,
    'videoDuration': videoDuration,
    'videoWidth': videoWidth,
    'videoHeight': videoHeight,
    'videoClips': videoClips.map((c) => c.toJson()).toList(),
    'textOverlays': textOverlays.map((t) => t.toJson()).toList(),
    'audioLayers': audioLayers.map((a) => a.toJson()).toList(),
    'effectLayers': effectLayers.map((e) => e.toJson()).toList(),
    'captionLayers': captionLayers.map((c) => c.toJson()).toList(),
    'drawingLayers': drawingLayers.map((d) => d.toJson()).toList(),
    'videoOverlays': videoOverlays.map((o) => o.toJson()).toList(),
    'adjustments': adjustments,
    'selectedAspectRatio': selectedAspectRatio,
    'backgroundColor': backgroundColor,
    'backgroundBlur': backgroundBlur,
    'backgroundImage': backgroundImage,
    'videoPositionX': videoPositionX,
    'videoPositionY': videoPositionY,
  };

  factory EditorProject.fromJson(Map<String, dynamic> json) => EditorProject(
    id: json['id'] as String,
    title: json['title'] as String,
    createdAt: DateTime.parse(json['createdAt'] as String),
    updatedAt: DateTime.parse(json['updatedAt'] as String),
    thumbnail: json['thumbnail'] as String?,
    videoUrl: json['videoUrl'] as String?,
    videoDuration: (json['videoDuration'] as num?)?.toDouble() ?? 0,
    videoWidth: (json['videoWidth'] as num?)?.toDouble() ?? 0,
    videoHeight: (json['videoHeight'] as num?)?.toDouble() ?? 0,
    videoClips: (json['videoClips'] as List<dynamic>?)
        ?.map((c) => SavedVideoClip.fromJson(c as Map<String, dynamic>))
        .toList() ?? [],
    textOverlays: (json['textOverlays'] as List<dynamic>?)
        ?.map((t) => SavedTextOverlay.fromJson(t as Map<String, dynamic>))
        .toList() ?? [],
    audioLayers: (json['audioLayers'] as List<dynamic>?)
        ?.map((a) => SavedAudioLayer.fromJson(a as Map<String, dynamic>))
        .toList() ?? [],
    effectLayers: (json['effectLayers'] as List<dynamic>?)
        ?.map((e) => SavedEffectLayer.fromJson(e as Map<String, dynamic>))
        .toList() ?? [],
    captionLayers: (json['captionLayers'] as List<dynamic>?)
        ?.map((c) => SavedCaptionLayer.fromJson(c as Map<String, dynamic>))
        .toList() ?? [],
    drawingLayers: (json['drawingLayers'] as List<dynamic>?)
        ?.map((d) => SavedDrawingLayer.fromJson(d as Map<String, dynamic>))
        .toList() ?? [],
    videoOverlays: (json['videoOverlays'] as List<dynamic>?)
        ?.map((o) => SavedVideoOverlay.fromJson(o as Map<String, dynamic>))
        .toList() ?? [],
    adjustments: (json['adjustments'] as Map<String, dynamic>?)
        ?.map((k, v) => MapEntry(k, (v as num).toDouble())) ?? {},
    selectedAspectRatio: json['selectedAspectRatio'] as String? ?? 'original',
    backgroundColor: json['backgroundColor'] as int? ?? 0xFF000000,
    backgroundBlur: (json['backgroundBlur'] as num?)?.toDouble() ?? 0,
    backgroundImage: json['backgroundImage'] as String?,
    videoPositionX: (json['videoPositionX'] as num?)?.toDouble() ?? 0,
    videoPositionY: (json['videoPositionY'] as num?)?.toDouble() ?? 0,
  );

  /// Check if this project contains any AI-generated content
  bool get hasAIContent =>
      effectLayers.any((e) => e.effectId == 'ai-generated') ||
      videoClips.any((c) => c.aiEnhanced);

  static EditorProject createNew() {
    final now = DateTime.now();
    final dateStr = '${_monthNames[now.month - 1]} ${now.day}, ${now.year}';
    return EditorProject(
      id: now.millisecondsSinceEpoch.toString(),
      title: 'Project $dateStr',
      createdAt: now,
      updatedAt: now,
    );
  }

  static const List<String> _monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
}

/// Saved video clip model
class SavedVideoClip {
  final String id;
  final String url;
  final double duration;
  final double startTime;
  final double inPoint;
  final double outPoint;
  final double volume;
  final double speed;
  final bool aiEnhanced;

  SavedVideoClip({
    required this.id,
    required this.url,
    required this.duration,
    this.startTime = 0,
    double? inPoint,
    double? outPoint,
    this.volume = 1.0,
    this.speed = 1.0,
    this.aiEnhanced = false,
  }) : inPoint = inPoint ?? 0,
       outPoint = outPoint ?? duration;

  Map<String, dynamic> toJson() => {
    'id': id,
    'url': url,
    'duration': duration,
    'startTime': startTime,
    'inPoint': inPoint,
    'outPoint': outPoint,
    'volume': volume,
    'speed': speed,
    'aiEnhanced': aiEnhanced,
  };

  factory SavedVideoClip.fromJson(Map<String, dynamic> json) => SavedVideoClip(
    id: json['id'] as String,
    url: json['url'] as String,
    duration: (json['duration'] as num).toDouble(),
    startTime: (json['startTime'] as num?)?.toDouble() ?? 0,
    inPoint: (json['inPoint'] as num?)?.toDouble(),
    outPoint: (json['outPoint'] as num?)?.toDouble(),
    volume: (json['volume'] as num?)?.toDouble() ?? 1.0,
    speed: (json['speed'] as num?)?.toDouble() ?? 1.0,
    aiEnhanced: json['aiEnhanced'] as bool? ?? false,
  );
}

/// Saved text overlay model
class SavedTextOverlay {
  final String id;
  final String text;
  final double positionX;
  final double positionY;
  final double fontSize;
  final int textColor;
  final String fontFamily;
  final String alignment;
  final bool hasBackground;
  final int backgroundColor;
  final double backgroundOpacity;
  final double startTime;
  final double endTime;
  final double opacity;
  final int layerOrder;
  final double rotation;
  final double scaleX;
  final double scaleY;

  SavedTextOverlay({
    required this.id,
    required this.text,
    this.positionX = 0.5,
    this.positionY = 0.5,
    this.fontSize = 24,
    this.textColor = 0xFFFFFFFF,
    this.fontFamily = 'Roboto',
    this.alignment = 'center',
    this.hasBackground = false,
    this.backgroundColor = 0xFF000000,
    this.backgroundOpacity = 0.5,
    this.startTime = 0,
    this.endTime = 5,
    this.opacity = 1.0,
    this.layerOrder = 0,
    this.rotation = 0,
    this.scaleX = 1.0,
    this.scaleY = 1.0,
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'text': text,
    'positionX': positionX, 'positionY': positionY,
    'fontSize': fontSize, 'textColor': textColor,
    'fontFamily': fontFamily, 'alignment': alignment,
    'hasBackground': hasBackground,
    'backgroundColor': backgroundColor,
    'backgroundOpacity': backgroundOpacity,
    'startTime': startTime, 'endTime': endTime,
    'opacity': opacity, 'layerOrder': layerOrder,
    'rotation': rotation, 'scaleX': scaleX, 'scaleY': scaleY,
  };

  factory SavedTextOverlay.fromJson(Map<String, dynamic> json) => SavedTextOverlay(
    id: json['id'] as String,
    text: json['text'] as String? ?? '',
    positionX: (json['positionX'] as num?)?.toDouble() ?? 0.5,
    positionY: (json['positionY'] as num?)?.toDouble() ?? 0.5,
    fontSize: (json['fontSize'] as num?)?.toDouble() ?? 24,
    textColor: json['textColor'] as int? ?? 0xFFFFFFFF,
    fontFamily: json['fontFamily'] as String? ?? 'Roboto',
    alignment: json['alignment'] as String? ?? 'center',
    hasBackground: json['hasBackground'] as bool? ?? false,
    backgroundColor: json['backgroundColor'] as int? ?? 0xFF000000,
    backgroundOpacity: (json['backgroundOpacity'] as num?)?.toDouble() ?? 0.5,
    startTime: (json['startTime'] as num?)?.toDouble() ?? 0,
    endTime: (json['endTime'] as num?)?.toDouble() ?? 5,
    opacity: (json['opacity'] as num?)?.toDouble() ?? 1.0,
    layerOrder: json['layerOrder'] as int? ?? 0,
    rotation: (json['rotation'] as num?)?.toDouble() ?? 0,
    scaleX: (json['scaleX'] as num?)?.toDouble() ?? 1.0,
    scaleY: (json['scaleY'] as num?)?.toDouble() ?? 1.0,
  );
}

/// Saved audio layer model
class SavedAudioLayer {
  final String id;
  final String name;
  final String filePath;
  final double volume;
  final double startTime;
  final double endTime;

  SavedAudioLayer({
    required this.id,
    required this.name,
    required this.filePath,
    this.volume = 1.0,
    this.startTime = 0,
    this.endTime = 30,
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'name': name, 'filePath': filePath,
    'volume': volume, 'startTime': startTime, 'endTime': endTime,
  };

  factory SavedAudioLayer.fromJson(Map<String, dynamic> json) => SavedAudioLayer(
    id: json['id'] as String,
    name: json['name'] as String? ?? 'Audio',
    filePath: json['filePath'] as String? ?? '',
    volume: (json['volume'] as num?)?.toDouble() ?? 1.0,
    startTime: (json['startTime'] as num?)?.toDouble() ?? 0,
    endTime: (json['endTime'] as num?)?.toDouble() ?? 30,
  );
}

/// Saved effect layer model
class SavedEffectLayer {
  final String id;
  final String effectId;
  final String name;
  final String category;
  final double intensity;
  final double startTime;
  final double endTime;

  SavedEffectLayer({
    required this.id,
    required this.effectId,
    required this.name,
    this.category = 'Basic',
    this.intensity = 0.7,
    this.startTime = 0,
    this.endTime = 3,
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'effectId': effectId, 'name': name,
    'category': category, 'intensity': intensity,
    'startTime': startTime, 'endTime': endTime,
  };

  factory SavedEffectLayer.fromJson(Map<String, dynamic> json) => SavedEffectLayer(
    id: json['id'] as String,
    effectId: json['effectId'] as String? ?? '',
    name: json['name'] as String? ?? 'Effect',
    category: json['category'] as String? ?? 'Basic',
    intensity: (json['intensity'] as num?)?.toDouble() ?? 0.7,
    startTime: (json['startTime'] as num?)?.toDouble() ?? 0,
    endTime: (json['endTime'] as num?)?.toDouble() ?? 3,
  );
}

/// Saved caption layer model
class SavedCaptionLayer {
  final String id;
  final String text;
  final double startTime;
  final double endTime;

  SavedCaptionLayer({
    required this.id,
    required this.text,
    this.startTime = 0,
    this.endTime = 3,
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'text': text, 'startTime': startTime, 'endTime': endTime,
  };

  factory SavedCaptionLayer.fromJson(Map<String, dynamic> json) => SavedCaptionLayer(
    id: json['id'] as String,
    text: json['text'] as String? ?? '',
    startTime: (json['startTime'] as num?)?.toDouble() ?? 0,
    endTime: (json['endTime'] as num?)?.toDouble() ?? 3,
  );
}

/// Saved drawing layer model
class SavedDrawingLayer {
  final String id;
  final List<SavedDrawingStroke> strokes;
  final double startTime;
  final double endTime;

  SavedDrawingLayer({
    required this.id,
    required this.strokes,
    this.startTime = 0,
    this.endTime = 5,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'strokes': strokes.map((s) => s.toJson()).toList(),
    'startTime': startTime, 'endTime': endTime,
  };

  factory SavedDrawingLayer.fromJson(Map<String, dynamic> json) => SavedDrawingLayer(
    id: json['id'] as String,
    strokes: (json['strokes'] as List<dynamic>?)
        ?.map((s) => SavedDrawingStroke.fromJson(s as Map<String, dynamic>))
        .toList() ?? [],
    startTime: (json['startTime'] as num?)?.toDouble() ?? 0,
    endTime: (json['endTime'] as num?)?.toDouble() ?? 5,
  );
}

/// Saved drawing stroke model
class SavedDrawingStroke {
  final String id;
  final List<Map<String, double>> points;
  final int color;
  final double size;
  final String tool;

  SavedDrawingStroke({
    required this.id,
    required this.points,
    required this.color,
    required this.size,
    required this.tool,
  });

  Map<String, dynamic> toJson() => {
    'id': id, 'points': points, 'color': color,
    'size': size, 'tool': tool,
  };

  factory SavedDrawingStroke.fromJson(Map<String, dynamic> json) => SavedDrawingStroke(
    id: json['id'] as String,
    points: (json['points'] as List<dynamic>?)
        ?.map((p) => {
          final m = p as Map<String, dynamic>;
          return {'x': (m['x'] as num).toDouble(), 'y': (m['y'] as num).toDouble()};
        })
        .toList() ?? [],
    color: json['color'] as int? ?? 0xFFFFFFFF,
    size: (json['size'] as num?)?.toDouble() ?? 5,
    tool: json['tool'] as String? ?? 'brush',
  );
}

/// Saved video overlay model
class SavedVideoOverlay {
  final String id;
  final String url;
  final double duration;
  final double positionX;
  final double positionY;
  final double width;
  final double height;
  final double startTime;
  final double endTime;
  final double volume;
  final double opacity;

  SavedVideoOverlay({
    required this.id,
    required this.url,
    required this.duration,
    this.positionX = 0.3,
    this.positionY = 0.3,
    this.width = 0.3,
    this.height = 0.3,
    this.startTime = 0,
    double? endTime,
    this.volume = 1.0,
    this.opacity = 1.0,
  }) : endTime = endTime ?? duration;

  Map<String, dynamic> toJson() => {
    'id': id, 'url': url, 'duration': duration,
    'positionX': positionX, 'positionY': positionY,
    'width': width, 'height': height,
    'startTime': startTime, 'endTime': endTime,
    'volume': volume, 'opacity': opacity,
  };

  factory SavedVideoOverlay.fromJson(Map<String, dynamic> json) => SavedVideoOverlay(
    id: json['id'] as String,
    url: json['url'] as String? ?? '',
    duration: (json['duration'] as num?)?.toDouble() ?? 0,
    positionX: (json['positionX'] as num?)?.toDouble() ?? 0.3,
    positionY: (json['positionY'] as num?)?.toDouble() ?? 0.3,
    width: (json['width'] as num?)?.toDouble() ?? 0.3,
    height: (json['height'] as num?)?.toDouble() ?? 0.3,
    startTime: (json['startTime'] as num?)?.toDouble() ?? 0,
    endTime: (json['endTime'] as num?)?.toDouble(),
    volume: (json['volume'] as num?)?.toDouble() ?? 1.0,
    opacity: (json['opacity'] as num?)?.toDouble() ?? 1.0,
  );
}

/// Project Storage Service
class ProjectStorage {
  static const String _storageKey = 'ai_editor_projects';
  
  static Future<List<EditorProject>> getAllProjects() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = prefs.getString(_storageKey);
      if (data == null) return [];
      
      final List<dynamic> jsonList = json.decode(data);
      final projects = jsonList
          .map((p) => EditorProject.fromJson(p as Map<String, dynamic>))
          .toList();
      
      // Sort by updatedAt descending
      projects.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
      return projects;
    } catch (e) {
      debugPrint('Error loading projects: $e');
      return [];
    }
  }

  static Future<EditorProject?> getProject(String id) async {
    final projects = await getAllProjects();
    return projects.where((p) => p.id == id).firstOrNull;
  }

  static Future<void> saveProject(EditorProject project) async {
    try {
      project.updatedAt = DateTime.now();
      final projects = await getAllProjects();
      final index = projects.indexWhere((p) => p.id == project.id);
      
      if (index >= 0) {
        projects[index] = project;
      } else {
        projects.add(project);
      }
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _storageKey,
        json.encode(projects.map((p) => p.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('Error saving project: $e');
    }
  }

  static Future<void> deleteProject(String id) async {
    try {
      final projects = await getAllProjects();
      projects.removeWhere((p) => p.id == id);
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _storageKey,
        json.encode(projects.map((p) => p.toJson()).toList()),
      );
    } catch (e) {
      debugPrint('Error deleting project: $e');
    }
  }

  static Future<EditorProject?> duplicateProject(String id) async {
    try {
      final original = await getProject(id);
      if (original == null) return null;
      
      final duplicate = EditorProject(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: '${original.title} (Copy)',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        thumbnail: original.thumbnail,
        videoUrl: original.videoUrl,
        videoDuration: original.videoDuration,
        videoWidth: original.videoWidth,
        videoHeight: original.videoHeight,
        videoClips: original.videoClips,
        textOverlays: original.textOverlays,
        audioLayers: original.audioLayers,
        effectLayers: original.effectLayers,
        captionLayers: original.captionLayers,
        drawingLayers: original.drawingLayers,
        videoOverlays: original.videoOverlays,
        adjustments: Map.from(original.adjustments),
        selectedAspectRatio: original.selectedAspectRatio,
        backgroundColor: original.backgroundColor,
        backgroundBlur: original.backgroundBlur,
        backgroundImage: original.backgroundImage,
        videoPositionX: original.videoPositionX,
        videoPositionY: original.videoPositionY,
      );
      
      await saveProject(duplicate);
      return duplicate;
    } catch (e) {
      debugPrint('Error duplicating project: $e');
      return null;
    }
  }

  static Future<void> renameProject(String id, String newTitle) async {
    try {
      final project = await getProject(id);
      if (project != null) {
        project.title = newTitle;
        await saveProject(project);
      }
    } catch (e) {
      debugPrint('Error renaming project: $e');
    }
  }
}
