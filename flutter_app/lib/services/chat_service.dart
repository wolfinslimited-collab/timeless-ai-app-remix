import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/config.dart';
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

  /// Send a chat message with streaming response
  Future<void> sendMessageStreaming({
    required String conversationId,
    required String model,
    required List<Map<String, dynamic>> messages,
    required Function(String) onChunk,
    List<String>? images,
  }) async {
    final url = '${AppConfig.supabaseUrl}/functions/v1/chat';
    
    final request = http.Request('POST', Uri.parse(url));
    request.headers.addAll({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${AppConfig.supabaseAnonKey}',
    });
    request.body = jsonEncode({
      'conversationId': conversationId,
      'model': model,
      'messages': messages,
      if (images != null && images.isNotEmpty) 'images': images,
    });

    final streamedResponse = await http.Client().send(request);
    
    if (streamedResponse.statusCode != 200) {
      throw Exception('Chat failed with status ${streamedResponse.statusCode}');
    }

    String buffer = '';
    
    await for (final chunk in streamedResponse.stream.transform(utf8.decoder)) {
      buffer += chunk;
      
      // Process SSE events
      while (buffer.contains('\n')) {
        final newlineIndex = buffer.indexOf('\n');
        String line = buffer.substring(0, newlineIndex);
        buffer = buffer.substring(newlineIndex + 1);
        
        if (line.endsWith('\r')) line = line.substring(0, line.length - 1);
        if (line.startsWith(':') || line.trim().isEmpty) continue;
        if (!line.startsWith('data: ')) continue;
        
        final jsonStr = line.substring(6).trim();
        if (jsonStr == '[DONE]') break;
        
        try {
          final parsed = jsonDecode(jsonStr) as Map<String, dynamic>;
          final content = parsed['choices']?[0]?['delta']?['content'] as String?;
          if (content != null) {
            onChunk(content);
          }
        } catch (_) {
          // Incomplete JSON, continue
        }
      }
    }
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
