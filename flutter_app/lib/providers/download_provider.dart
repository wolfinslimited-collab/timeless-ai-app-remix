import 'package:flutter/foundation.dart';
import '../models/download_model.dart';
import '../services/download_service.dart';

/// Provider for managing downloads state
class DownloadProvider extends ChangeNotifier {
  final DownloadService _downloadService = DownloadService();

  List<Download> _downloads = [];
  bool _isLoading = false;
  String? _error;
  int _totalSize = 0;

  List<Download> get downloads => _downloads;
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get totalSize => _totalSize;
  int get downloadCount => _downloads.length;

  String get formattedTotalSize {
    if (_totalSize < 1024) return '$_totalSize B';
    if (_totalSize < 1024 * 1024) return '${(_totalSize / 1024).toStringAsFixed(1)} KB';
    return '${(_totalSize / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  List<Download> get images => _downloads.where((d) => d.isImage).toList();
  List<Download> get videos => _downloads.where((d) => d.isVideo).toList();
  List<Download> get audio => _downloads.where((d) => d.isAudio).toList();

  /// Load all downloads
  Future<void> loadDownloads({DownloadType? filterType}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _downloads = await _downloadService.getDownloads(filterType: filterType);
      _totalSize = await _downloadService.getTotalDownloadSize();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Download a file
  Future<Download?> downloadFile({
    required String url,
    required String title,
    required DownloadType type,
    bool saveToGallery = true,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final download = await _downloadService.downloadFile(
        url: url,
        title: title,
        type: type,
        saveToGallery: saveToGallery,
        metadata: metadata,
      );

      if (download != null) {
        _downloads.insert(0, download);
        _totalSize += download.fileSize;
        notifyListeners();
      }

      return download;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  /// Delete a download
  Future<void> deleteDownload(String id) async {
    try {
      final download = _downloads.firstWhere((d) => d.id == id);
      await _downloadService.deleteDownload(id);
      _downloads.removeWhere((d) => d.id == id);
      _totalSize -= download.fileSize;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  /// Clear all downloads
  Future<void> clearAll() async {
    try {
      await _downloadService.clearAllDownloads();
      _downloads.clear();
      _totalSize = 0;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  /// Check if already downloaded
  Future<bool> isDownloaded(String url) async {
    return _downloadService.isAlreadyDownloaded(url);
  }
}
