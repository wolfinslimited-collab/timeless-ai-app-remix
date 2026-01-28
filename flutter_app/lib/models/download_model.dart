/// Model representing a downloaded file stored locally
class Download {
  final String id;
  final String userId;
  final String title;
  final String filePath; // Local file path
  final String originalUrl; // Original remote URL
  final DownloadType type;
  final int fileSize; // Bytes
  final String? thumbnailPath;
  final DateTime downloadedAt;
  final Map<String, dynamic>? metadata;

  Download({
    required this.id,
    required this.userId,
    required this.title,
    required this.filePath,
    required this.originalUrl,
    required this.type,
    required this.fileSize,
    this.thumbnailPath,
    required this.downloadedAt,
    this.metadata,
  });

  factory Download.fromJson(Map<String, dynamic> json) {
    return Download(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: json['title'] as String,
      filePath: json['file_path'] as String,
      originalUrl: json['original_url'] as String,
      type: DownloadType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => DownloadType.image,
      ),
      fileSize: json['file_size'] as int? ?? 0,
      thumbnailPath: json['thumbnail_path'] as String?,
      downloadedAt: DateTime.parse(json['downloaded_at'] as String),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'title': title,
      'file_path': filePath,
      'original_url': originalUrl,
      'type': type.name,
      'file_size': fileSize,
      'thumbnail_path': thumbnailPath,
      'downloaded_at': downloadedAt.toIso8601String(),
      'metadata': metadata,
    };
  }

  String get formattedSize {
    if (fileSize < 1024) return '$fileSize B';
    if (fileSize < 1024 * 1024) return '${(fileSize / 1024).toStringAsFixed(1)} KB';
    return '${(fileSize / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  bool get isImage => type == DownloadType.image;
  bool get isVideo => type == DownloadType.video;
  bool get isAudio => type == DownloadType.audio;
}

enum DownloadType { image, video, audio }
