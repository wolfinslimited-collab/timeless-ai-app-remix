import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/download_model.dart';

/// Service for downloading and managing saved media files
class DownloadService {
  static const String _downloadsKey = 'downloads_list';
  static const _methodChannel = MethodChannel('com.timelessai.app/gallery');
  
  final SupabaseClient _supabase = Supabase.instance.client;
  
  /// Get the downloads directory
  Future<Directory> get _downloadsDirectory async {
    final appDir = await getApplicationDocumentsDirectory();
    final downloadsDir = Directory('${appDir.path}/downloads');
    if (!await downloadsDir.exists()) {
      await downloadsDir.create(recursive: true);
    }
    return downloadsDir;
  }

  /// Check if URL is a base64 data URI
  bool _isBase64DataUri(String url) {
    return url.startsWith('data:image/') || url.startsWith('data:video/') || url.startsWith('data:audio/');
  }

  /// Extract bytes from base64 data URI
  Uint8List? _decodeBase64DataUri(String dataUri) {
    try {
      final parts = dataUri.split(',');
      if (parts.length != 2) return null;
      return base64Decode(parts[1]);
    } catch (e) {
      debugPrint('Error decoding base64: $e');
      return null;
    }
  }

  /// Get extension from base64 data URI
  String? _getExtensionFromBase64(String dataUri) {
    try {
      // Format: data:image/png;base64,...
      final mimeMatch = RegExp(r'data:(\w+)/(\w+);').firstMatch(dataUri);
      if (mimeMatch != null) {
        final subtype = mimeMatch.group(2);
        switch (subtype) {
          case 'jpeg':
            return 'jpg';
          case 'png':
          case 'gif':
          case 'webp':
          case 'mp4':
          case 'mp3':
          case 'wav':
            return subtype;
          default:
            return subtype;
        }
      }
    } catch (_) {}
    return null;
  }

  /// Download a file from URL (or base64) and save locally + to gallery
  Future<Download?> downloadFile({
    required String url,
    required String title,
    required DownloadType type,
    bool saveToGallery = true,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      Uint8List bytes;
      String extension;

      // Handle base64 data URI
      if (_isBase64DataUri(url)) {
        final decodedBytes = _decodeBase64DataUri(url);
        if (decodedBytes == null) {
          throw Exception('Failed to decode base64 data');
        }
        bytes = decodedBytes;
        extension = _getExtensionFromBase64(url) ?? _getDefaultExtension(type);
      } else {
        // Handle regular URL
        extension = _getExtensionFromUrl(url) ?? _getDefaultExtension(type);
        
        // Download the file
        final response = await http.get(Uri.parse(url));
        if (response.statusCode != 200) {
          throw Exception('Failed to download file: ${response.statusCode}');
        }
        bytes = response.bodyBytes;
      }
      
      // Generate unique filename
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final fileName = '${type.name}_$timestamp.$extension';

      // Save to local storage
      final downloadsDir = await _downloadsDirectory;
      final filePath = '${downloadsDir.path}/$fileName';
      final file = File(filePath);
      await file.writeAsBytes(bytes);

      // Save to gallery if requested (for images and videos)
      if (saveToGallery && (type == DownloadType.image || type == DownloadType.video)) {
        await _saveToGallery(file, type, fileName);
      }

      // Create download record
      final download = Download(
        id: 'dl_$timestamp',
        userId: user.id,
        title: title.isNotEmpty ? title : 'Untitled ${type.name}',
        filePath: filePath,
        originalUrl: url.length > 500 ? 'base64_data' : url, // Don't store huge base64 strings
        type: type,
        fileSize: bytes.length,
        thumbnailPath: type == DownloadType.image ? filePath : null,
        downloadedAt: DateTime.now(),
        metadata: metadata,
      );

      // Save to local storage
      await _saveDownloadRecord(download);

      return download;
    } catch (e) {
      debugPrint('Download error: $e');
      rethrow;
    }
  }

  /// Save file to device gallery or music folder
  Future<void> _saveToGallery(File file, DownloadType type, String fileName) async {
    try {
      if (Platform.isIOS) {
        // Use iOS Photos framework via method channel (only for images/videos)
        if (type == DownloadType.audio) {
          // Audio files are saved locally only on iOS
          return;
        }
        final bytes = await file.readAsBytes();
        await _methodChannel.invokeMethod('saveToGallery', {
          'bytes': bytes,
          'fileName': fileName,
          'isVideo': type == DownloadType.video,
        });
      } else if (Platform.isAndroid) {
        // On Android, copy to appropriate directory
        final Directory? externalDir;
        if (type == DownloadType.video) {
          externalDir = Directory('/storage/emulated/0/Movies/Timeless AI');
        } else if (type == DownloadType.audio) {
          externalDir = Directory('/storage/emulated/0/Music/Timeless AI');
        } else {
          externalDir = Directory('/storage/emulated/0/Pictures/Timeless AI');
        }
        
        if (!await externalDir.exists()) {
          await externalDir.create(recursive: true);
        }
        
        final galleryFile = File('${externalDir.path}/$fileName');
        await file.copy(galleryFile.path);
        
        // Notify media scanner
        await _methodChannel.invokeMethod('scanFile', {'path': galleryFile.path});
      }
    } catch (e) {
      // Gallery save is optional, don't fail the whole download
      debugPrint('Gallery save failed: $e');
    }
  }

  /// Get all downloads for current user
  Future<List<Download>> getDownloads({DownloadType? filterType}) async {
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) return [];

      final prefs = await SharedPreferences.getInstance();
      final downloadsJson = prefs.getStringList(_downloadsKey) ?? [];
      
      final downloads = downloadsJson
          .map((json) => Download.fromJson(jsonDecode(json)))
          .where((d) => d.userId == user.id)
          .where((d) => filterType == null || d.type == filterType)
          .toList();

      // Sort by date, newest first
      downloads.sort((a, b) => b.downloadedAt.compareTo(a.downloadedAt));

      // Filter out downloads where the file no longer exists
      final validDownloads = <Download>[];
      for (final download in downloads) {
        if (await File(download.filePath).exists()) {
          validDownloads.add(download);
        }
      }

      return validDownloads;
    } catch (e) {
      debugPrint('Error getting downloads: $e');
      return [];
    }
  }

  /// Delete a download
  Future<void> deleteDownload(String id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final downloadsJson = prefs.getStringList(_downloadsKey) ?? [];
      
      // Find and remove the download
      Download? toDelete;
      final updatedList = <String>[];
      
      for (final json in downloadsJson) {
        final download = Download.fromJson(jsonDecode(json));
        if (download.id == id) {
          toDelete = download;
        } else {
          updatedList.add(json);
        }
      }

      // Delete the file
      if (toDelete != null) {
        final file = File(toDelete.filePath);
        if (await file.exists()) {
          await file.delete();
        }
        
        // Delete thumbnail if different from main file
        if (toDelete.thumbnailPath != null && 
            toDelete.thumbnailPath != toDelete.filePath) {
          final thumbnail = File(toDelete.thumbnailPath!);
          if (await thumbnail.exists()) {
            await thumbnail.delete();
          }
        }
      }

      // Update stored list
      await prefs.setStringList(_downloadsKey, updatedList);
    } catch (e) {
      debugPrint('Error deleting download: $e');
      rethrow;
    }
  }

  /// Clear all downloads
  Future<void> clearAllDownloads() async {
    try {
      final downloads = await getDownloads();
      for (final download in downloads) {
        await deleteDownload(download.id);
      }
    } catch (e) {
      debugPrint('Error clearing downloads: $e');
      rethrow;
    }
  }

  /// Get total download size
  Future<int> getTotalDownloadSize() async {
    final downloads = await getDownloads();
    return downloads.fold<int>(0, (sum, d) => sum + d.fileSize);
  }

  /// Save download record to local storage
  Future<void> _saveDownloadRecord(Download download) async {
    final prefs = await SharedPreferences.getInstance();
    final downloadsJson = prefs.getStringList(_downloadsKey) ?? [];
    
    downloadsJson.add(jsonEncode(download.toJson()));
    
    await prefs.setStringList(_downloadsKey, downloadsJson);
  }

  /// Get file extension from URL
  String? _getExtensionFromUrl(String url) {
    try {
      final uri = Uri.parse(url);
      final path = uri.path;
      if (path.contains('.')) {
        final ext = path.split('.').last.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mp3', 'wav', 'aac', 'm4a'].contains(ext)) {
          return ext;
        }
      }
    } catch (_) {}
    return null;
  }

  /// Get default extension for type
  String _getDefaultExtension(DownloadType type) {
    switch (type) {
      case DownloadType.image:
        return 'png';
      case DownloadType.video:
        return 'mp4';
      case DownloadType.audio:
        return 'mp3';
    }
  }

  /// Check if a URL has already been downloaded
  Future<bool> isAlreadyDownloaded(String url) async {
    final downloads = await getDownloads();
    return downloads.any((d) => d.originalUrl == url);
  }

  /// Get download by original URL
  Future<Download?> getDownloadByUrl(String url) async {
    final downloads = await getDownloads();
    try {
      return downloads.firstWhere((d) => d.originalUrl == url);
    } catch (_) {
      return null;
    }
  }
}
