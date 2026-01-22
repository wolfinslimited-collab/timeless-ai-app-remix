import 'dart:async';
import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/conversation_model.dart';

class ChatService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Send a chat message and get streaming response
  Future<String> sendMessage({
    required String conversationId,
    required String model,
    required List<Map<String, dynamic>> messages,
    List<String>? images,
  }) async {
    final response = await _supabase.functions.invoke(
      'chat',
      body: {
        'conversationId': conversationId,
        'model': model,
        'messages': messages,
        if (images != null && images.isNotEmpty) 'images': images,
      },
    );

    if (response.status != 200) {
      final error = response.data['error'] ?? 'Chat failed';
      throw Exception(error);
    }

    // Extract the response content
    final data = response.data as Map<String, dynamic>;
    return data['content'] as String? ?? '';
  }

  /// Get all conversations
  Future<List<Conversation>> getConversations() async {
    final response = await _supabase
        .from('conversations')
        .select()
        .order('updated_at', ascending: false);

    return (response as List)
        .map((json) => Conversation.fromJson(json))
        .toList();
  }

  /// Create a new conversation
  Future<Conversation> createConversation({
    required String model,
    String? title,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('Not authenticated');

    final response = await _supabase
        .from('conversations')
        .insert({
          'user_id': user.id,
          'model': model,
          'title': title,
        })
        .select()
        .single();

    return Conversation.fromJson(response);
  }

  /// Get messages for a conversation
  Future<List<ChatMessage>> getMessages(String conversationId) async {
    final response = await _supabase
        .from('chat_messages')
        .select()
        .eq('conversation_id', conversationId)
        .order('created_at', ascending: true);

    return (response as List)
        .map((json) => ChatMessage.fromJson(json))
        .toList();
  }

  /// Save a message to the database
  Future<ChatMessage> saveMessage({
    required String conversationId,
    required String role,
    required dynamic content,
    List<String>? images,
  }) async {
    final response = await _supabase
        .from('chat_messages')
        .insert({
          'conversation_id': conversationId,
          'role': role,
          'content': content,
          'images': images ?? [],
        })
        .select()
        .single();

    return ChatMessage.fromJson(response);
  }

  /// Update conversation title
  Future<void> updateConversationTitle(String id, String title) async {
    await _supabase
        .from('conversations')
        .update({'title': title, 'updated_at': DateTime.now().toIso8601String()})
        .eq('id', id);
  }

  /// Delete a conversation
  Future<void> deleteConversation(String id) async {
    await _supabase.from('conversations').delete().eq('id', id);
  }

  /// Toggle pin status
  Future<void> togglePin(String id, bool pinned) async {
    await _supabase
        .from('conversations')
        .update({'pinned': pinned})
        .eq('id', id);
  }
}
