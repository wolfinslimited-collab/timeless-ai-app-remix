import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/agent_model.dart';

Future<void> showDeleteAgentDialog({
  required BuildContext context,
  required Agent agent,
  required Future<void> Function(Agent) onConfirm,
}) {
  return showDialog(
    context: context,
    builder: (ctx) => _DeleteAgentDialog(agent: agent, onConfirm: onConfirm),
  );
}

class _DeleteAgentDialog extends StatefulWidget {
  final Agent agent;
  final Future<void> Function(Agent) onConfirm;

  const _DeleteAgentDialog({required this.agent, required this.onConfirm});

  @override
  State<_DeleteAgentDialog> createState() => _DeleteAgentDialogState();
}

class _DeleteAgentDialogState extends State<_DeleteAgentDialog> {
  final _controller = TextEditingController();
  bool _deleting = false;

  bool get _canDelete => _controller.text.trim() == widget.agent.name.trim();

  Future<void> _handleDelete() async {
    if (!_canDelete) return;
    setState(() => _deleting = true);
    await widget.onConfirm(widget.agent);
    if (mounted) Navigator.pop(context);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppTheme.background,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: const [
          Icon(Icons.delete, color: AppTheme.destructive, size: 20),
          SizedBox(width: 8),
          Text('Delete Agent', style: TextStyle(fontSize: 16, color: AppTheme.foreground)),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 13, color: AppTheme.muted),
              children: [
                const TextSpan(text: 'This will permanently delete '),
                TextSpan(
                  text: widget.agent.name,
                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.foreground),
                ),
                const TextSpan(text: ' and all its conversations.'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          RichText(
            text: TextSpan(
              style: const TextStyle(fontSize: 11, color: AppTheme.muted),
              children: [
                const TextSpan(text: 'Type '),
                TextSpan(
                  text: widget.agent.name,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace', color: AppTheme.foreground),
                ),
                const TextSpan(text: ' to confirm.'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            autofocus: true,
            style: const TextStyle(fontSize: 14, color: AppTheme.foreground),
            decoration: InputDecoration(
              hintText: widget.agent.name,
              hintStyle: const TextStyle(color: AppTheme.muted),
            ),
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _deleting ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton.icon(
          onPressed: _canDelete && !_deleting ? _handleDelete : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.destructive,
            foregroundColor: Colors.white,
          ),
          icon: _deleting
              ? const SizedBox(height: 14, width: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Icon(Icons.delete, size: 16),
          label: const Text('Delete Agent'),
        ),
      ],
    );
  }
}
