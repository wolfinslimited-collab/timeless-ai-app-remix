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
    Map<String, double>? adjustments,
    this.selectedAspectRatio = 'original',
    this.backgroundColor = 0xFF000000,
    this.backgroundBlur = 0,
    this.backgroundImage,
    this.videoPositionX = 0,
    this.videoPositionY = 0,
  }) : videoClips = videoClips ?? [],
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
    adjustments: (json['adjustments'] as Map<String, dynamic>?)
        ?.map((k, v) => MapEntry(k, (v as num).toDouble())) ?? {},
    selectedAspectRatio: json['selectedAspectRatio'] as String? ?? 'original',
    backgroundColor: json['backgroundColor'] as int? ?? 0xFF000000,
    backgroundBlur: (json['backgroundBlur'] as num?)?.toDouble() ?? 0,
    backgroundImage: json['backgroundImage'] as String?,
    videoPositionX: (json['videoPositionX'] as num?)?.toDouble() ?? 0,
    videoPositionY: (json['videoPositionY'] as num?)?.toDouble() ?? 0,
  );

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
