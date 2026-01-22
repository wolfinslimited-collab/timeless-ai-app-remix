import 'package:supabase_flutter/supabase_flutter.dart';

class ToolsService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Image tools (upscale, background remove, etc.)
  Future<Map<String, dynamic>> runImageTool({
    required String tool,
    required String imageUrl,
    Map<String, dynamic>? options,
  }) async {
    final response = await _supabase.functions.invoke(
      'image-tools',
      body: {
        'tool': tool,
        'imageUrl': imageUrl,
        if (options != null) ...options,
      },
    );

    if (response.status != 200) {
      final error = response.data['error'] ?? 'Tool failed';
      throw Exception(error);
    }

    return response.data as Map<String, dynamic>;
  }

  /// Video tools (upscale, stabilize, interpolate, etc.)
  Future<Map<String, dynamic>> runVideoTool({
    required String tool,
    required String videoUrl,
    Map<String, dynamic>? options,
  }) async {
    final response = await _supabase.functions.invoke(
      'video-tools',
      body: {
        'tool': tool,
        'videoUrl': videoUrl,
        if (options != null) ...options,
      },
    );

    if (response.status != 200) {
      final error = response.data['error'] ?? 'Tool failed';
      throw Exception(error);
    }

    return response.data as Map<String, dynamic>;
  }

  /// Music/audio tools
  Future<Map<String, dynamic>> runMusicTool({
    required String tool,
    required String audioUrl,
    Map<String, dynamic>? options,
  }) async {
    final response = await _supabase.functions.invoke(
      'music-tools',
      body: {
        'tool': tool,
        'audioUrl': audioUrl,
        if (options != null) ...options,
      },
    );

    if (response.status != 200) {
      final error = response.data['error'] ?? 'Tool failed';
      throw Exception(error);
    }

    return response.data as Map<String, dynamic>;
  }

  /// Cinema studio tools
  Future<Map<String, dynamic>> runCinemaTool({
    required String tool,
    Map<String, dynamic>? options,
  }) async {
    final response = await _supabase.functions.invoke(
      'cinema-tools',
      body: {
        'tool': tool,
        if (options != null) ...options,
      },
    );

    if (response.status != 200) {
      final error = response.data['error'] ?? 'Tool failed';
      throw Exception(error);
    }

    return response.data as Map<String, dynamic>;
  }
}

/// Available tools
class ToolDefinition {
  final String id;
  final String name;
  final String description;
  final String icon;
  final int credits;
  final String category;

  const ToolDefinition({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.credits,
    required this.category,
  });
}

const imageTools = [
  ToolDefinition(id: 'upscale', name: 'Upscale', description: 'Enhance image resolution', icon: '🔍', credits: 3, category: 'image'),
  ToolDefinition(id: 'background-remove', name: 'Background Remove', description: 'Remove background from images', icon: '✂️', credits: 2, category: 'image'),
  ToolDefinition(id: 'colorize', name: 'Colorize', description: 'Add color to B&W images', icon: '🎨', credits: 3, category: 'image'),
  ToolDefinition(id: 'relight', name: 'Relight', description: 'Change lighting in images', icon: '💡', credits: 4, category: 'image'),
  ToolDefinition(id: 'inpainting', name: 'Inpainting', description: 'Edit parts of images', icon: '🖌️', credits: 4, category: 'image'),
];

const videoTools = [
  ToolDefinition(id: 'upscale', name: 'Video Upscale', description: 'Enhance video resolution', icon: '📹', credits: 8, category: 'video'),
  ToolDefinition(id: 'stabilize', name: 'Stabilize', description: 'Remove camera shake', icon: '🎯', credits: 5, category: 'video'),
  ToolDefinition(id: 'interpolate', name: 'Interpolate', description: 'Increase frame rate', icon: '⚡', credits: 6, category: 'video'),
  ToolDefinition(id: 'extend', name: 'Extend Video', description: 'Extend video duration', icon: '➕', credits: 10, category: 'video'),
  ToolDefinition(id: 'lip-sync', name: 'Lip Sync', description: 'Sync lips to audio', icon: '👄', credits: 12, category: 'video'),
];

const audioTools = [
  ToolDefinition(id: 'enhance', name: 'Audio Enhance', description: 'Improve audio quality', icon: '🔊', credits: 3, category: 'audio'),
  ToolDefinition(id: 'stems', name: 'Stem Separation', description: 'Separate vocals/instruments', icon: '🎵', credits: 5, category: 'audio'),
  ToolDefinition(id: 'mastering', name: 'Mastering', description: 'Professional audio mastering', icon: '🎚️', credits: 4, category: 'audio'),
  ToolDefinition(id: 'vocals', name: 'Vocal Isolation', description: 'Extract vocals from audio', icon: '🎤', credits: 4, category: 'audio'),
  ToolDefinition(id: 'sound-effects', name: 'Sound Effects', description: 'Generate sound effects', icon: '🔉', credits: 3, category: 'audio'),
];
