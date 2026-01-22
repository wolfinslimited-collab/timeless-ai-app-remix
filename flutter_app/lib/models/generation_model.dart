enum GenerationType { image, video }

enum GenerationStatus { pending, processing, completed, failed }

class Generation {
  final String id;
  final String userId;
  final String prompt;
  final String model;
  final GenerationType type;
  final GenerationStatus status;
  final String? outputUrl;
  final String? thumbnailUrl;
  final String? taskId;
  final String? providerEndpoint;
  final String? aspectRatio;
  final String? quality;
  final String? title;
  final int creditsUsed;
  final DateTime createdAt;

  Generation({
    required this.id,
    required this.userId,
    required this.prompt,
    required this.model,
    required this.type,
    required this.status,
    this.outputUrl,
    this.thumbnailUrl,
    this.taskId,
    this.providerEndpoint,
    this.aspectRatio,
    this.quality,
    this.title,
    required this.creditsUsed,
    required this.createdAt,
  });

  factory Generation.fromJson(Map<String, dynamic> json) {
    return Generation(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      prompt: json['prompt'] as String,
      model: json['model'] as String,
      type: json['type'] == 'video' ? GenerationType.video : GenerationType.image,
      status: _parseStatus(json['status'] as String),
      outputUrl: json['output_url'] as String?,
      thumbnailUrl: json['thumbnail_url'] as String?,
      taskId: json['task_id'] as String?,
      providerEndpoint: json['provider_endpoint'] as String?,
      aspectRatio: json['aspect_ratio'] as String?,
      quality: json['quality'] as String?,
      title: json['title'] as String?,
      creditsUsed: json['credits_used'] as int? ?? 1,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  static GenerationStatus _parseStatus(String status) {
    switch (status) {
      case 'pending':
        return GenerationStatus.pending;
      case 'processing':
        return GenerationStatus.processing;
      case 'completed':
        return GenerationStatus.completed;
      case 'failed':
        return GenerationStatus.failed;
      default:
        return GenerationStatus.pending;
    }
  }

  bool get isComplete => status == GenerationStatus.completed;
  bool get isPending =>
      status == GenerationStatus.pending || status == GenerationStatus.processing;
  bool get isFailed => status == GenerationStatus.failed;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'prompt': prompt,
      'model': model,
      'type': type == GenerationType.video ? 'video' : 'image',
      'status': status.name,
      'output_url': outputUrl,
      'thumbnail_url': thumbnailUrl,
      'task_id': taskId,
      'provider_endpoint': providerEndpoint,
      'aspect_ratio': aspectRatio,
      'quality': quality,
      'title': title,
      'credits_used': creditsUsed,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
