import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:video_player/video_player.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Save status for UI feedback
enum SaveStatus { idle, saving, saved, error }

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
  static final _primarySupabase = Supabase.instance.client;
  static final _cloudSupabase = SupabaseClient(
    'https://hpuqeabtgwbwcnklxolt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwdXFlYWJ0Z3did2Nua2x4b2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNDczMTgsImV4cCI6MjA4NDYyMzMxOH0.uBRcVNQcTdJNk9gstOCW6xRcQsZ8pnQwy5IGxbhZD6g',
  );
  static const String _tableName = 'ai_editor_projects';
  static const String _localStorageKey = 'ai_editor_projects';
  
  // Track save status for UI
  static SaveStatus _currentStatus = SaveStatus.idle;
  static final ValueNotifier<SaveStatus> saveStatusNotifier = ValueNotifier(SaveStatus.idle);
  
  /// Check if user is authenticated (against primary project)
  static bool get isAuthenticated => _primarySupabase.auth.currentUser != null;
  
  /// Get current user ID (from primary project)
  static String? get currentUserId => _primarySupabase.auth.currentUser?.id;
  
  /// Get all projects from Supabase
  static Future<List<EditorProject>> getAllProjects() async {
    if (!isAuthenticated) {
      debugPrint('User not authenticated, returning empty list');
      return [];
    }
    
    try {
      final response = await _cloudSupabase
          .from(_tableName)
          .select()
          .eq('user_id', currentUserId!)
          .order('updated_at', ascending: false);
      
      final projects = (response as List).map((data) {
        final editorState = data['editor_state'] as Map<String, dynamic>? ?? {};
        return EditorProject.fromJson({
          ...editorState,
          'id': data['id'],
          'title': data['title'],
          'thumbnail': data['thumbnail'],
          'createdAt': data['created_at'],
          'updatedAt': data['updated_at'],
        });
      }).toList();
      
      return projects;
    } catch (e) {
      debugPrint('Error loading projects from Supabase: $e');
      return [];
    }
  }

  /// Get a single project by ID
  static Future<EditorProject?> getProject(String id) async {
    if (!isAuthenticated) return null;
    
    try {
      final response = await _cloudSupabase
          .from(_tableName)
          .select()
          .eq('id', id)
          .maybeSingle();
      
      if (response == null) return null;
      
      final editorState = response['editor_state'] as Map<String, dynamic>? ?? {};
      return EditorProject.fromJson({
        ...editorState,
        'id': response['id'],
        'title': response['title'],
        'thumbnail': response['thumbnail'],
        'createdAt': response['created_at'],
        'updatedAt': response['updated_at'],
      });
    } catch (e) {
      debugPrint('Error getting project: $e');
      return null;
    }
  }

  /// Save project to Supabase
  static Future<bool> saveProject(
    EditorProject project, {
    void Function(SaveStatus)? onStatusChange,
  }) async {
    if (!isAuthenticated) {
      debugPrint('User not authenticated, cannot save');
      onStatusChange?.call(SaveStatus.error);
      return false;
    }
    
    _currentStatus = SaveStatus.saving;
    saveStatusNotifier.value = SaveStatus.saving;
    onStatusChange?.call(SaveStatus.saving);
    
    try {
      project.updatedAt = DateTime.now();
      
      final editorState = {
        'videoUrl': project.videoUrl,
        'videoDuration': project.videoDuration,
        'videoWidth': project.videoWidth,
        'videoHeight': project.videoHeight,
        'videoClips': project.videoClips.map((c) => c.toJson()).toList(),
        'adjustments': project.adjustments,
        'selectedAspectRatio': project.selectedAspectRatio,
        'backgroundColor': project.backgroundColor,
        'backgroundBlur': project.backgroundBlur,
        'backgroundImage': project.backgroundImage,
        'videoPositionX': project.videoPositionX,
        'videoPositionY': project.videoPositionY,
      };
      
      await _cloudSupabase.from(_tableName).upsert({
        'id': project.id,
        'user_id': currentUserId,
        'title': project.title,
        'thumbnail': project.thumbnail,
        'editor_state': editorState,
      });
      
      _currentStatus = SaveStatus.saved;
      saveStatusNotifier.value = SaveStatus.saved;
      onStatusChange?.call(SaveStatus.saved);
      return true;
    } catch (e) {
      debugPrint('Error saving project: $e');
      _currentStatus = SaveStatus.error;
      saveStatusNotifier.value = SaveStatus.error;
      onStatusChange?.call(SaveStatus.error);
      return false;
    }
  }

  /// Delete project from Supabase
  static Future<bool> deleteProject(String id) async {
    if (!isAuthenticated) return false;
    
    try {
      await _cloudSupabase.from(_tableName).delete().eq('id', id);
      return true;
    } catch (e) {
      debugPrint('Error deleting project: $e');
      return false;
    }
  }

  /// Duplicate a project
  static Future<EditorProject?> duplicateProject(String id) async {
    if (!isAuthenticated) return null;
    
    try {
      final original = await getProject(id);
      if (original == null) return null;
      
      final newId = DateTime.now().millisecondsSinceEpoch.toString();
      final duplicate = EditorProject(
        id: newId,
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
      
      final success = await saveProject(duplicate);
      return success ? duplicate : null;
    } catch (e) {
      debugPrint('Error duplicating project: $e');
      return null;
    }
  }

  /// Rename a project
  static Future<bool> renameProject(String id, String newTitle) async {
    if (!isAuthenticated) return false;
    
    try {
      await _cloudSupabase
          .from(_tableName)
          .update({'title': newTitle})
          .eq('id', id);
      return true;
    } catch (e) {
      debugPrint('Error renaming project: $e');
      return false;
    }
  }

  /// Create a new project in Supabase
  static Future<EditorProject?> createNewProject() async {
    if (!isAuthenticated) return null;
    
    try {
      final now = DateTime.now();
      final newProject = EditorProject.createNew();
      
      final editorState = {
        'videoUrl': newProject.videoUrl,
        'videoDuration': newProject.videoDuration,
        'videoWidth': newProject.videoWidth,
        'videoHeight': newProject.videoHeight,
        'videoClips': <Map<String, dynamic>>[],
        'adjustments': newProject.adjustments,
        'selectedAspectRatio': newProject.selectedAspectRatio,
        'backgroundColor': newProject.backgroundColor,
        'backgroundBlur': newProject.backgroundBlur,
        'backgroundImage': newProject.backgroundImage,
        'videoPositionX': newProject.videoPositionX,
        'videoPositionY': newProject.videoPositionY,
      };
      
      await _cloudSupabase.from(_tableName).insert({
        'id': newProject.id,
        'user_id': currentUserId,
        'title': newProject.title,
        'thumbnail': null,
        'editor_state': editorState,
      });
      
      return newProject;
    } catch (e) {
      debugPrint('Error creating project: $e');
      return null;
    }
  }
}
