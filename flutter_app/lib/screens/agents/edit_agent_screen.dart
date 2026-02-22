import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/agent_model.dart';

const _rolePresets = [
  'Marketing', 'Developer', 'Writer', 'Analyst', 'Designer',
  'Trader', 'Financial', 'Investor', 'Researcher', 'Coach', 'Support', 'Custom',
];

const _availableTools = [
  {'id': 'web-search', 'label': 'Web Search', 'icon': Icons.search},
  {'id': 'image-gen', 'label': 'Image Gen', 'icon': Icons.image},
  {'id': 'code-exec', 'label': 'Code Exec', 'icon': Icons.code},
  {'id': 'file-analysis', 'label': 'File Analysis', 'icon': Icons.description},
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
        title: const Text('Edit Agent', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _sectionLabel('Name'),
            TextField(
              controller: _nameController,
              style: const TextStyle(fontSize: 15, color: AppTheme.foreground),
              decoration: _inputDec('Agent name'),
            ),

            const SizedBox(height: 24),
            _sectionLabel('Role'),
            const SizedBox(height: 4),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _rolePresets.map((r) {
                final val = r.toLowerCase();
                final selected = _role == val;
                return ChoiceChip(
                  label: Text(r, style: TextStyle(
                    fontSize: 13,
                    color: selected ? AppTheme.foreground : AppTheme.mutedForeground,
                  )),
                  selected: selected,
                  onSelected: (_) => setState(() => _role = val),
                  backgroundColor: AppTheme.secondary,
                  selectedColor: AppTheme.primary.withOpacity(0.15),
                  side: BorderSide(
                    color: selected ? AppTheme.primary.withOpacity(0.4) : AppTheme.border.withOpacity(0.2),
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  checkmarkColor: AppTheme.primary,
                );
              }).toList(),
            ),

            const SizedBox(height: 24),
            _sectionLabel('System Prompt'),
            TextField(
              controller: _promptController,
              maxLines: 4,
              style: const TextStyle(fontSize: 15, color: AppTheme.foreground),
              decoration: _inputDec('Instructions for your agent...'),
            ),

            const SizedBox(height: 24),
            _sectionLabel('Tools'),
            const SizedBox(height: 4),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _availableTools.map((t) {
                final id = t['id'] as String;
                final selected = _tools.contains(id);
                return FilterChip(
                  avatar: Icon(t['icon'] as IconData, size: 16,
                    color: selected ? AppTheme.primary : AppTheme.muted),
                  label: Text(t['label'] as String, style: TextStyle(
                    fontSize: 13,
                    color: selected ? AppTheme.foreground : AppTheme.mutedForeground,
                  )),
                  selected: selected,
                  onSelected: (v) {
                    setState(() {
                      if (v) { _tools.add(id); } else { _tools.remove(id); }
                    });
                  },
                  backgroundColor: AppTheme.secondary,
                  selectedColor: AppTheme.primary.withOpacity(0.15),
                  side: BorderSide(
                    color: selected ? AppTheme.primary.withOpacity(0.4) : AppTheme.border.withOpacity(0.2),
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  checkmarkColor: AppTheme.primary,
                );
              }).toList(),
            ),

            const SizedBox(height: 24),
            _sectionLabel('AI Model'),
            const SizedBox(height: 8),
            ..._aiModels.map((m) {
              final id = m['id']!;
              final selected = _model == id;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: () => setState(() => _model = id),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: selected ? AppTheme.primary.withOpacity(0.1) : AppTheme.secondary.withOpacity(0.5),
                      border: Border.all(
                        color: selected ? AppTheme.primary.withOpacity(0.4) : AppTheme.border.withOpacity(0.15),
                      ),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Container(
                          height: 36,
                          width: 36,
                          decoration: BoxDecoration(
                            color: selected ? AppTheme.primary.withOpacity(0.15) : AppTheme.card,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            m['cat'] == 'claude' ? Icons.psychology : Icons.memory,
                            size: 18,
                            color: selected ? AppTheme.primary : AppTheme.muted,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(m['label']!, style: TextStyle(
                                fontSize: 14, fontWeight: FontWeight.w500,
                                color: selected ? AppTheme.foreground : AppTheme.mutedForeground,
                              )),
                              Text(m['desc']!, style: const TextStyle(
                                fontSize: 12, color: AppTheme.muted,
                              )),
                            ],
                          ),
                        ),
                        Text(m['credits']!, style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: selected ? AppTheme.primary : AppTheme.muted,
                        )),
                        if (selected) ...[
                          const SizedBox(width: 8),
                          const Icon(Icons.check_circle, color: AppTheme.primary, size: 18),
                        ],
                      ],
                    ),
                  ),
                ),
              );
            }),

            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _saving || _nameController.text.trim().isEmpty ? null : _handleSave,
                icon: _saving
                    ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryForeground))
                    : const Icon(Icons.save, size: 18),
                label: const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.w600)),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
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
        child: Text(text, style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppTheme.mutedForeground,
        )),
      );

  InputDecoration _inputDec(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: AppTheme.muted),
        filled: true,
        fillColor: AppTheme.secondary.withOpacity(0.5),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppTheme.border.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: AppTheme.border.withOpacity(0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      );
}
