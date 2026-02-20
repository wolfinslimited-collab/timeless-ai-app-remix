import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/agent_model.dart';

const _rolePresets = [
  'Marketing', 'Developer', 'Writer', 'Analyst', 'Designer',
  'Trader', 'Financial', 'Investor', 'Researcher', 'Coach', 'Support', 'Custom',
];

const _availableTools = [
  {'id': 'web-search', 'label': 'Web Search'},
  {'id': 'image-gen', 'label': 'Image Gen'},
  {'id': 'code-exec', 'label': 'Code Exec'},
  {'id': 'file-analysis', 'label': 'File Analysis'},
];

const _aiModels = [
  {'id': 'runpod-vllm', 'label': 'RunPod vLLM (auto)', 'desc': 'Uses model from server tier', 'credits': 'Included', 'cat': 'open-source'},
  {'id': 'claude-sonnet-4-20250514', 'label': 'Claude Sonnet 4', 'desc': 'Fast & efficient', 'credits': '1/msg', 'cat': 'claude'},
  {'id': 'claude-3-5-haiku-20241022', 'label': 'Haiku 3.5', 'desc': 'Fastest', 'credits': '1/msg', 'cat': 'claude'},
  {'id': 'claude-3-7-sonnet-20250219', 'label': 'Sonnet 3.7', 'desc': 'Balanced', 'credits': '2/msg', 'cat': 'claude'},
  {'id': 'claude-sonnet-4-20250514-thinking', 'label': 'Sonnet 4 Think', 'desc': 'Deep analysis', 'credits': '3/msg', 'cat': 'claude'},
  {'id': 'claude-opus-4-20250514', 'label': 'Opus 4', 'desc': 'Max intelligence', 'credits': '5/msg', 'cat': 'claude'},
];

class EditAgentScreen extends StatefulWidget {
  final Agent agent;
  final Future<bool> Function(String id, Map<String, dynamic> updates) onSave;

  const EditAgentScreen({super.key, required this.agent, required this.onSave});

  @override
  State<EditAgentScreen> createState() => _EditAgentScreenState();
}

class _EditAgentScreenState extends State<EditAgentScreen> {
  late TextEditingController _nameController;
  late TextEditingController _promptController;
  late String _role;
  late List<String> _tools;
  late String _model;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.agent.name);
    _promptController = TextEditingController(text: widget.agent.systemPrompt ?? '');
    _role = widget.agent.role ?? '';
    _tools = List.from(widget.agent.tools);
    _model = widget.agent.model ?? 'runpod-vllm';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    setState(() => _saving = true);
    await widget.onSave(widget.agent.id, {
      'name': _nameController.text.trim(),
      'role': _role.isEmpty ? null : _role,
      'system_prompt': _promptController.text.isEmpty ? null : _promptController.text,
      'tools': _tools,
      'model': _model,
    });
    if (mounted) {
      setState(() => _saving = false);
      Navigator.pop(context, true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Edit ${widget.agent.name}',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Name
            _sectionLabel('Name'),
            TextField(
              controller: _nameController,
              style: const TextStyle(fontSize: 14, color: AppTheme.foreground),
              decoration: _inputDec(),
            ),

            const SizedBox(height: 20),
            _sectionLabel('Role'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _rolePresets.map((r) {
                final val = r.toLowerCase();
                final selected = _role == val;
                return ChoiceChip(
                  label: Text(r, style: TextStyle(
                    fontSize: 12,
                    color: selected ? AppTheme.foreground : AppTheme.muted,
                  )),
                  selected: selected,
                  onSelected: (_) => setState(() => _role = val),
                  backgroundColor: AppTheme.secondary.withOpacity(0.5),
                  selectedColor: AppTheme.primary.withOpacity(0.15),
                  side: BorderSide(
                    color: selected ? AppTheme.muted.withOpacity(0.3) : AppTheme.border.withOpacity(0.1),
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                );
              }).toList(),
            ),

            const SizedBox(height: 20),
            _sectionLabel('System Prompt'),
            TextField(
              controller: _promptController,
              maxLines: 4,
              style: const TextStyle(fontSize: 14, color: AppTheme.foreground),
              decoration: _inputDec(),
            ),

            const SizedBox(height: 20),
            _sectionLabel('Tools'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _availableTools.map((t) {
                final id = t['id']!;
                final selected = _tools.contains(id);
                return FilterChip(
                  label: Text(t['label']!, style: TextStyle(
                    fontSize: 12,
                    color: selected ? AppTheme.foreground : AppTheme.muted,
                  )),
                  selected: selected,
                  onSelected: (v) {
                    setState(() {
                      if (v) { _tools.add(id); } else { _tools.remove(id); }
                    });
                  },
                  backgroundColor: AppTheme.secondary.withOpacity(0.5),
                  selectedColor: AppTheme.primary.withOpacity(0.15),
                  side: BorderSide(
                    color: selected ? AppTheme.muted.withOpacity(0.3) : AppTheme.border.withOpacity(0.1),
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                );
              }).toList(),
            ),

            const SizedBox(height: 20),
            _sectionLabel('AI Model'),
            const SizedBox(height: 8),
            ..._aiModels.map((m) {
              final id = m['id']!;
              final selected = _model == id;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: () => setState(() => _model = id),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: selected ? AppTheme.primary.withOpacity(0.1) : AppTheme.secondary.withOpacity(0.3),
                      border: Border.all(
                        color: selected ? AppTheme.muted.withOpacity(0.3) : AppTheme.border.withOpacity(0.1),
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          m['cat'] == 'claude' ? Icons.psychology : Icons.memory,
                          size: 16,
                          color: selected ? AppTheme.foreground : AppTheme.muted,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(m['label']!, style: TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w500,
                                color: selected ? AppTheme.foreground : AppTheme.mutedForeground,
                              )),
                              Text(m['desc']!, style: TextStyle(
                                fontSize: 10, color: AppTheme.muted.withOpacity(0.6),
                              )),
                            ],
                          ),
                        ),
                        Text(m['credits']!, style: TextStyle(
                          fontSize: 9, color: AppTheme.muted.withOpacity(0.5),
                        )),
                      ],
                    ),
                  ),
                ),
              );
            }),

            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _saving || _nameController.text.trim().isEmpty ? null : _handleSave,
                icon: _saving
                    ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.save, size: 18),
                label: const Text('Save Changes'),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text, style: TextStyle(fontSize: 11, color: AppTheme.muted.withOpacity(0.7))),
      );

  InputDecoration _inputDec() => InputDecoration(
        filled: true,
        fillColor: AppTheme.secondary.withOpacity(0.5),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppTheme.border.withOpacity(0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppTheme.border.withOpacity(0.1)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      );
}
