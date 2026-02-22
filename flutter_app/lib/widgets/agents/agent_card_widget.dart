import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/agent_model.dart';

const _statusConfig = {
  'active': {'label': 'Active', 'color': Colors.green},
  'running': {'label': 'Running', 'color': Colors.blue},
  'cold': {'label': 'Cold', 'color': Colors.amber},
  'error': {'label': 'Error', 'color': Colors.red},
  'unknown': {'label': 'Unknown', 'color': Colors.grey},
  'no_endpoint': {'label': 'No GPU', 'color': Colors.grey},
};

const _modelLabels = {
  'runpod-vllm': 'RunPod vLLM',
  'claude-sonnet-4-20250514': 'Sonnet 4',
  'claude-3-5-haiku-20241022': 'Haiku 3.5',
  'claude-3-7-sonnet-20250219': 'Sonnet 3.7',
  'claude-sonnet-4-20250514-thinking': 'Sonnet 4 Think',
  'claude-opus-4-20250514': 'Opus 4',
};

class AgentCardWidget extends StatelessWidget {
  final Agent agent;
  final String? status;
  final VoidCallback onChat;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onTogglePause;

  const AgentCardWidget({
    super.key,
    required this.agent,
    this.status,
    required this.onChat,
    required this.onEdit,
    required this.onDelete,
    required this.onTogglePause,
  });

  @override
  Widget build(BuildContext context) {
    final isPaused = agent.paused;
    final statusInfo = isPaused
        ? {'label': 'Paused', 'color': Colors.grey}
        : status != null
            ? _statusConfig[status] ?? _statusConfig['unknown']!
            : null;
    final modelLabel = agent.model != null ? (_modelLabels[agent.model] ?? agent.model) : null;

    return Opacity(
      opacity: isPaused ? 0.6 : 1.0,
      child: Card(
        color: AppTheme.card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: AppTheme.border.withOpacity(0.3)),
        ),
        elevation: 0,
        child: InkWell(
          onTap: isPaused ? null : onChat,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top row: avatar + status + menu
                Row(
                  children: [
                    Container(
                      height: 48,
                      width: 48,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: agent.avatarUrl != null
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(14),
                              child: Image.network(agent.avatarUrl!, fit: BoxFit.cover),
                            )
                          : const Icon(Icons.smart_toy, color: AppTheme.primary, size: 24),
                    ),
                    const SizedBox(width: 12),
                    if (statusInfo != null) ...[
                      Container(
                        height: 8,
                        width: 8,
                        decoration: BoxDecoration(
                          color: statusInfo['color'] as Color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        statusInfo['label'] as String,
                        style: const TextStyle(fontSize: 12, color: AppTheme.muted),
                      ),
                    ],
                    const Spacer(),
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_horiz, size: 20, color: AppTheme.muted),
                      color: AppTheme.card,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      onSelected: (v) {
                        switch (v) {
                          case 'edit': onEdit(); break;
                          case 'pause': onTogglePause(); break;
                          case 'delete': onDelete(); break;
                        }
                      },
                      itemBuilder: (_) => [
                        const PopupMenuItem(value: 'edit', child: Row(children: [
                          Icon(Icons.edit_outlined, size: 18, color: AppTheme.mutedForeground),
                          SizedBox(width: 10),
                          Text('Edit', style: TextStyle(fontSize: 14)),
                        ])),
                        PopupMenuItem(value: 'pause', child: Row(children: [
                          Icon(isPaused ? Icons.play_circle_outline : Icons.pause_circle_outline,
                              size: 18, color: AppTheme.mutedForeground),
                          const SizedBox(width: 10),
                          Text(isPaused ? 'Resume' : 'Pause', style: const TextStyle(fontSize: 14)),
                        ])),
                        const PopupMenuDivider(),
                        const PopupMenuItem(value: 'delete', child: Row(children: [
                          Icon(Icons.delete_outline, size: 18, color: AppTheme.destructive),
                          SizedBox(width: 10),
                          Text('Delete', style: TextStyle(fontSize: 14, color: AppTheme.destructive)),
                        ])),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 14),

                // Name
                Text(agent.name,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppTheme.foreground),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text(
                  agent.systemPrompt ?? 'No instructions set',
                  style: const TextStyle(fontSize: 13, color: AppTheme.muted, height: 1.4),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 12),

                // Tags
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _tag(agent.roleLabel),
                    if (modelLabel != null) _tag(modelLabel),
                    if (agent.tools.isNotEmpty) _tag('${agent.tools.length} tools'),
                  ],
                ),
                const SizedBox(height: 14),

                // Chat button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: isPaused ? null : onChat,
                    icon: Icon(isPaused ? Icons.pause_circle_outline : Icons.chat_bubble_outline, size: 16),
                    label: Text(isPaused ? 'Paused' : 'Chat', style: const TextStyle(fontWeight: FontWeight.w600)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isPaused ? AppTheme.secondary : AppTheme.primary.withOpacity(0.12),
                      foregroundColor: isPaused ? AppTheme.muted : AppTheme.primary,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _tag(String text) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(text, style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground)),
      );
}
