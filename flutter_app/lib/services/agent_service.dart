import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/config.dart';
import '../models/agent_model.dart';

class AgentService {
  final SupabaseClient _supabase = Supabase.instance.client;

  String? get _userId => _supabase.auth.currentUser?.id;

  // ─── CRUD ───

  Future<List<Agent>> getAgents() async {
    if (_userId == null) return [];
    final data = await _supabase
        .from('agents')
        .select()
        .eq('user_id', _userId!)
        .order('created_at', ascending: false);
    return (data as List).map((e) => Agent.fromJson(e)).toList();
  }

  Future<Agent?> createAgent(CreateAgentInput input) async {
    if (_userId == null) return null;
    final data = await _supabase
        .from('agents')
        .insert({...input.toJson(), 'user_id': _userId})
        .select()
        .single();
    return Agent.fromJson(data);
  }

  Future<bool> updateAgent(String id, Map<String, dynamic> updates) async {
    try {
      await _supabase.from('agents').update(updates).eq('id', id);
      return true;
    } catch (e) {
      debugPrint('Update agent error: $e');
      return false;
    }
  }

  Future<bool> deleteAgent(String id) async {
    try {
      // Delete conversations and messages first
      final convs = await _supabase
          .from('agent_conversations')
          .select('id')
          .eq('agent_id', id);
      for (final conv in convs) {
        await _supabase
            .from('agent_messages')
            .delete()
            .eq('conversation_id', conv['id']);
      }
      await _supabase.from('agent_conversations').delete().eq('agent_id', id);
      await _supabase.from('agents').delete().eq('id', id);
      return true;
    } catch (e) {
      debugPrint('Delete agent error: $e');
      return false;
    }
  }

  // ─── Conversations ───

  Future<String?> getOrCreateConversation(String agentId) async {
    if (_userId == null) return null;

    final convs = await _supabase
        .from('agent_conversations')
        .select('id')
        .eq('agent_id', agentId)
        .eq('user_id', _userId!)
        .order('updated_at', ascending: false)
        .limit(1);

    if (convs.isNotEmpty) return convs[0]['id'] as String;

    final data = await _supabase
        .from('agent_conversations')
        .insert({
          'agent_id': agentId,
          'user_id': _userId,
          'title': 'Chat',
        })
        .select()
        .single();
    return data['id'] as String;
  }

  Future<List<AgentMessage>> getMessages(String conversationId) async {
    final data = await _supabase
        .from('agent_messages')
        .select()
        .eq('conversation_id', conversationId)
        .order('created_at', ascending: true);
    return (data as List).map((e) => AgentMessage.fromJson(e)).toList();
  }

  Future<void> saveMessage({
    required String conversationId,
    required String role,
    required String content,
  }) async {
    await _supabase.from('agent_messages').insert({
      'conversation_id': conversationId,
      'role': role,
      'content': content,
    });
  }

  // ─── Chat streaming ───

  Future<void> streamChat({
    required String agentId,
    required List<Map<String, String>> messages,
    required void Function(String chunk) onChunk,
    required void Function() onDone,
    required void Function(String error) onError,
  }) async {
    try {
      final session = _supabase.auth.currentSession;
      if (session == null) {
        onError('Not authenticated');
        return;
      }

      final url = Uri.parse(
        '${AppConfig.supabaseUrl}/functions/v1/agent-chat',
      );

      final request = http.Request('POST', url);
      request.headers.addAll({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${session.accessToken}',
        'apikey': AppConfig.supabaseAnonKey,
      });
      request.body = jsonEncode({
        'agentId': agentId,
        'messages': messages,
      });

      final client = http.Client();
      final response = await client.send(request);

      if (response.statusCode != 200) {
        final body = await response.stream.bytesToString();
        try {
          final err = jsonDecode(body);
          onError(err['error'] ?? 'Chat failed');
        } catch (_) {
          onError('Chat failed (${response.statusCode})');
        }
        client.close();
        return;
      }

      final completer = Completer<void>();
      String buffer = '';

      response.stream
          .transform(utf8.decoder)
          .listen(
            (chunk) {
              buffer += chunk;
              int newlineIdx;
              while ((newlineIdx = buffer.indexOf('\n')) != -1) {
                String line = buffer.substring(0, newlineIdx);
                buffer = buffer.substring(newlineIdx + 1);
                if (line.endsWith('\r')) line = line.substring(0, line.length - 1);
                if (line.startsWith(':') || line.trim().isEmpty) continue;
                if (!line.startsWith('data: ')) continue;
                final jsonStr = line.substring(6).trim();
                if (jsonStr == '[DONE]') continue;
                try {
                  final parsed = jsonDecode(jsonStr);
                  final content = parsed['choices']?[0]?['delta']?['content'];
                  if (content != null && content is String) {
                    onChunk(content);
                  }
                } catch (_) {}
              }
            },
            onDone: () {
              onDone();
              client.close();
              completer.complete();
            },
            onError: (e) {
              onError(e.toString());
              client.close();
              completer.complete();
            },
          );

      await completer.future;
    } catch (e) {
      onError(e.toString());
    }
  }

  // ─── Agent statuses ───

  Future<Map<String, String>> fetchStatuses() async {
    try {
      final session = _supabase.auth.currentSession;
      if (session == null) return {};

      final url = Uri.parse(
        '${AppConfig.supabaseUrl}/functions/v1/agent-status',
      );
      final resp = await http.get(url, headers: {
        'Authorization': 'Bearer ${session.accessToken}',
        'apikey': AppConfig.supabaseAnonKey,
      });

      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        if (data['statuses'] != null) {
          final map = <String, String>{};
          (data['statuses'] as Map<String, dynamic>).forEach((id, info) {
            map[id] = (info as Map<String, dynamic>)['status'] ?? 'unknown';
          });
          return map;
        }
      }
    } catch (e) {
      debugPrint('Fetch statuses error: $e');
    }
    return {};
  }

  // ─── RunPod ───

  Future<String?> createRunpodEndpoint(String agentId, String template) async {
    try {
      final resp = await _supabase.functions.invoke(
        'create-runpod-endpoint',
        body: {'agentId': agentId, 'template': template},
      );
      return resp.data?['endpointId'] as String?;
    } catch (e) {
      debugPrint('RunPod provision error: $e');
      return null;
    }
  }

  Future<void> deleteRunpodEndpoint(String agentId) async {
    try {
      await _supabase.functions.invoke(
        'delete-runpod-endpoint',
        body: {'agentId': agentId},
      );
    } catch (e) {
      debugPrint('RunPod cleanup error: $e');
    }
  }
}
