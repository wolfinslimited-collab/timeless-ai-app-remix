class Conversation {
  final String id;
  final String userId;
  final String model;
  final String? title;
  final String? folderId;
  final bool pinned;
  final DateTime createdAt;
  final DateTime updatedAt;

  Conversation({
    required this.id,
    required this.userId,
    required this.model,
    this.title,
    this.folderId,
    this.pinned = false,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      model: json['model'] as String,
      title: json['title'] as String?,
      folderId: json['folder_id'] as String?,
      pinned: json['pinned'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'model': model,
      'title': title,
      'folder_id': folderId,
      'pinned': pinned,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }
}

class ChatMessage {
  final String id;
  final String conversationId;
  final String role;
  final dynamic content;
  final List<String>? images;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.role,
    required this.content,
    this.images,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      conversationId: json['conversation_id'] as String,
      role: json['role'] as String,
      content: json['content'],
      images: (json['images'] as List<dynamic>?)?.cast<String>(),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  String get textContent {
    if (content is String) {
      return content as String;
    } else if (content is Map) {
      return content['text'] as String? ?? '';
    }
    return '';
  }

  bool get isUser => role == 'user';
  bool get isAssistant => role == 'assistant';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'conversation_id': conversationId,
      'role': role,
      'content': content,
      'images': images,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
