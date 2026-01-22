class UserProfile {
  final String id;
  final String odID;
  final String? displayName;
  final String? avatarUrl;
  final int credits;
  final String plan;
  final String? subscriptionStatus;
  final String? subscriptionId;
  final DateTime? subscriptionEndDate;
  final DateTime createdAt;
  final DateTime updatedAt;

  UserProfile({
    required this.id,
    required this.odID,
    this.displayName,
    this.avatarUrl,
    required this.credits,
    required this.plan,
    this.subscriptionStatus,
    this.subscriptionId,
    this.subscriptionEndDate,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      odID: json['user_id'] as String,
      displayName: json['display_name'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      credits: json['credits'] as int? ?? 0,
      plan: json['plan'] as String? ?? 'free',
      subscriptionStatus: json['subscription_status'] as String?,
      subscriptionId: json['subscription_id'] as String?,
      subscriptionEndDate: json['subscription_end_date'] != null
          ? DateTime.parse(json['subscription_end_date'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  bool get hasActiveSubscription => subscriptionStatus == 'active';

  bool get isProUser => hasActiveSubscription || plan == 'pro';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': odID,
      'display_name': displayName,
      'avatar_url': avatarUrl,
      'credits': credits,
      'plan': plan,
      'subscription_status': subscriptionStatus,
      'subscription_id': subscriptionId,
      'subscription_end_date': subscriptionEndDate?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  UserProfile copyWith({
    String? id,
    String? odID,
    String? displayName,
    String? avatarUrl,
    int? credits,
    String? plan,
    String? subscriptionStatus,
    String? subscriptionId,
    DateTime? subscriptionEndDate,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserProfile(
      id: id ?? this.id,
      odID: odID ?? this.odID,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      credits: credits ?? this.credits,
      plan: plan ?? this.plan,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
      subscriptionId: subscriptionId ?? this.subscriptionId,
      subscriptionEndDate: subscriptionEndDate ?? this.subscriptionEndDate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
