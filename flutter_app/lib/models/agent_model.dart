class Agent {
  final String id;
  final String name;
  final String? role;
  final String? systemPrompt;
  final List<String> tools;
  final String? model;
  final String? avatarUrl;
  final bool paused;
  final String? runpodEndpointId;
  final String? runpodModel;
  final String userId;
  final DateTime createdAt;
  final DateTime updatedAt;

  Agent({
    required this.id,
    required this.name,
    this.role,
    this.systemPrompt,
    this.tools = const [],
    this.model,
    this.avatarUrl,
    this.paused = false,
    this.runpodEndpointId,
    this.runpodModel,
    required this.userId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Agent.fromJson(Map<String, dynamic> json) {
    return Agent(
      id: json['id'] as String,
      name: json['name'] as String,
      role: json['role'] as String?,
      systemPrompt: json['system_prompt'] as String?,
      tools: (json['tools'] as List<dynamic>?)?.cast<String>() ?? [],
      model: json['model'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      paused: json['paused'] as bool? ?? false,
      runpodEndpointId: json['runpod_endpoint_id'] as String?,
      runpodModel: json['runpod_model'] as String?,
      userId: json['user_id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Agent copyWith({
    String? name,
    String? role,
    String? systemPrompt,
    List<String>? tools,
    String? model,
    bool? paused,
    String? runpodEndpointId,
  }) {
    return Agent(
      id: id,
      name: name ?? this.name,
      role: role ?? this.role,
      systemPrompt: systemPrompt ?? this.systemPrompt,
      tools: tools ?? this.tools,
      model: model ?? this.model,
      avatarUrl: avatarUrl,
      paused: paused ?? this.paused,
      runpodEndpointId: runpodEndpointId ?? this.runpodEndpointId,
      runpodModel: runpodModel,
      userId: userId,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  String get roleLabel =>
      role != null && role!.isNotEmpty
          ? '${role![0].toUpperCase()}${role!.substring(1)}'
          : 'Custom';
}

class CreateAgentInput {
  final String name;
  final String? role;
  final String? systemPrompt;
  final List<String> tools;
  final String? model;
  final String? runpodEndpointId;
  final String? runpodModel;

  CreateAgentInput({
    required this.name,
    this.role,
    this.systemPrompt,
    this.tools = const [],
    this.model,
    this.runpodEndpointId,
    this.runpodModel,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'role': role,
    'system_prompt': systemPrompt,
    'tools': tools,
    'model': model,
    'runpod_endpoint_id': runpodEndpointId,
    'runpod_model': runpodModel,
  };
}

class AgentMessage {
  final String id;
  final String role;
  final String content;

  AgentMessage({required this.id, required this.role, required this.content});

  factory AgentMessage.fromJson(Map<String, dynamic> json) {
    return AgentMessage(
      id: json['id'] as String,
      role: json['role'] as String,
      content: json['content'] as String,
    );
  }
}
