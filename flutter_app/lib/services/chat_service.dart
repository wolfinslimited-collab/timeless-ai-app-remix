import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/config.dart';
import '../core/logger.dart';
import '../core/http_client.dart';
import '../core/supabase_logger.dart';
import '../models/conversation_model.dart';

class ChatService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Send a chat message and get response
  Future<String> sendMessage({
    required String conversationId,
    required String model,
    required List<Map<String, dynamic>> messages,
    List<String>? images,
  }) async {
    final body = {
      'conversationId': conversationId,
      'model': model,
      'messages': messages,
      if (images != null && images.isNotEmpty) 'images': images,
    };

    final response = await _supabase.functions.invokeWithLogging(
      'chat',
      body: body,
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
    bool webSearch = false,
  }) async {
    final url = '${AppConfig.supabaseUrl}/functions/v1/chat';
    
    final request = http.Request('POST', Uri.parse(url));
    request.headers.addAll({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${AppConfig.supabaseAnonKey}',
    });
    
    final body = {
      'conversationId': conversationId,
      'model': model,
      'messages': messages,
      'webSearch': webSearch,
      if (images != null && images.isNotEmpty) 'images': images,
    };
    request.body = jsonEncode(body);

    // Log the streaming request
    final streamedResponse = await httpClient.send(request);
    
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
        if (jsonStr == '[DONE]') {
          logger.success('Streaming completed', 'CHAT');
          break;
        }
        
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

  /// Get all conversations for current user
  Future<List<Conversation>> getConversations() async {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      logger.warning('Cannot fetch conversations: not authenticated', 'SUPABASE');
      return [];
    }

    logger.info('Fetching conversations for user: ${user.id}', 'SUPABASE');
    
    try {
      final response = await _supabase
          .from('conversations')
          .select()
          .eq('user_id', user.id)
          .order('updated_at', ascending: false);

      logger.success('Fetched ${(response as List).length} conversations', 'SUPABASE');
      
      return (response)
          .map((json) => Conversation.fromJson(json))
          .toList();
    } catch (e) {
      logger.error('Error fetching conversations: $e', 'SUPABASE');
      return [];
    }
  }

  /// Get all folders for current user
  Future<List<Map<String, dynamic>>> getFolders() async {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      logger.warning('Cannot fetch folders: not authenticated', 'SUPABASE');
      return [];
    }

    logger.info('Fetching folders for user: ${user.id}', 'SUPABASE');
    
    try {
      final response = await _supabase
          .from('chat_folders')
          .select()
          .eq('user_id', user.id)
          .order('name');

      logger.success('Fetched ${(response as List).length} folders', 'SUPABASE');
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      logger.error('Error fetching folders: $e', 'SUPABASE');
      return [];
    }
  }

  /// Create a new folder
  Future<Map<String, dynamic>?> createFolder({
    required String name,
    String color = '#6366f1',
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('Not authenticated');

    logger.info('Creating folder: $name', 'SUPABASE');

    try {
      final response = await _supabase
          .from('chat_folders')
          .insert({
            'user_id': user.id,
            'name': name,
            'color': color,
          })
          .select()
          .single();

      logger.success('Created folder: ${response['id']}', 'SUPABASE');
      return response;
    } catch (e) {
      logger.error('Error creating folder: $e', 'SUPABASE');
      return null;
    }
  }

  /// Delete a folder
  Future<bool> deleteFolder(String id) async {
    logger.info('Deleting folder: $id', 'SUPABASE');
    try {
      // First, move all conversations out of the folder
      await _supabase
          .from('conversations')
          .update({'folder_id': null})
          .eq('folder_id', id);
      
      // Then delete the folder
      await _supabase.from('chat_folders').delete().eq('id', id);
      logger.success('Deleted folder: $id', 'SUPABASE');
      return true;
    } catch (e) {
      logger.error('Error deleting folder: $e', 'SUPABASE');
      return false;
    }
  }

  /// Move conversation to folder
  Future<bool> moveToFolder(String conversationId, String? folderId) async {
    logger.info('Moving conversation $conversationId to folder: $folderId', 'SUPABASE');
    try {
      await _supabase
          .from('conversations')
          .update({'folder_id': folderId})
          .eq('id', conversationId);
      logger.success('Moved conversation to folder', 'SUPABASE');
      return true;
    } catch (e) {
      logger.error('Error moving to folder: $e', 'SUPABASE');
      return false;
    }
  }

  /// Create a new conversation
  Future<Conversation> createConversation({
    required String model,
    String? title,
  }) async {
    final user = _supabase.auth.currentUser;
    if (user == null) throw Exception('Not authenticated');

    logger.info('Creating conversation with model: $model', 'SUPABASE');

    final response = await _supabase
        .from('conversations')
        .insert({
          'user_id': user.id,
          'model': model,
          'title': title,
        })
        .select()
        .single();

    logger.success('Created conversation: ${response['id']}', 'SUPABASE');
    
    return Conversation.fromJson(response);
  }

  /// Get messages for a conversation
  Future<List<ChatMessage>> getMessages(String conversationId) async {
    logger.info('Fetching messages for: $conversationId', 'SUPABASE');

    final response = await _supabase
        .from('chat_messages')
        .select()
        .eq('conversation_id', conversationId)
        .order('created_at', ascending: true);

    logger.success('Fetched ${(response as List).length} messages', 'SUPABASE');

    return (response)
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
    logger.info('Saving $role message to: $conversationId', 'SUPABASE');

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

    logger.success('Saved message: ${response['id']}', 'SUPABASE');

    return ChatMessage.fromJson(response);
  }

  /// Update conversation title
  Future<void> updateConversationTitle(String id, String title) async {
    logger.info('Updating conversation title: $id', 'SUPABASE');
    
    await _supabase
        .from('conversations')
        .update({'title': title, 'updated_at': DateTime.now().toIso8601String()})
        .eq('id', id);

    logger.success('Updated title for: $id', 'SUPABASE');
  }

  /// Delete a conversation
  Future<void> deleteConversation(String id) async {
    logger.info('Deleting conversation: $id', 'SUPABASE');
    await _supabase.from('conversations').delete().eq('id', id);
    logger.success('Deleted conversation: $id', 'SUPABASE');
  }

  /// Toggle pin status
  Future<void> togglePin(String id, bool pinned) async {
    logger.info('${pinned ? 'Pinning' : 'Unpinning'} conversation: $id', 'SUPABASE');
    await _supabase
        .from('conversations')
        .update({'pinned': pinned})
        .eq('id', id);
    logger.success('Updated pin status for: $id', 'SUPABASE');
  }
}
