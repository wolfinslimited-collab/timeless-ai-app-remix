import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/agent_model.dart';
import '../../services/agent_service.dart';

const _rolePresets = [
  {'label': 'Marketing', 'value': 'marketing', 'prompt': 'You are an expert marketing strategist. Help users design campaigns, write copy, and grow their brand.'},
  {'label': 'Developer', 'value': 'developer', 'prompt': 'You are a senior software developer. Help users write code, debug issues, and architect solutions.'},
  {'label': 'Writer', 'value': 'writer', 'prompt': 'You are a creative writer and editor. Help users write compelling content, stories, and copy.'},
  {'label': 'Analyst', 'value': 'analyst', 'prompt': 'You are a data analyst. Help users interpret data, build reports, and find insights.'},
  {'label': 'Designer', 'value': 'designer', 'prompt': 'You are a UX/UI designer. Help users create beautiful, usable interfaces and design systems.'},
  {'label': 'Trader', 'value': 'trader', 'prompt': 'You are an expert trader and market analyst. Help users analyze charts, identify trading opportunities, and manage risk.'},
  {'label': 'Financial', 'value': 'financial', 'prompt': 'You are a financial advisor and planner. Help users with budgeting, financial planning, and wealth management.'},
  {'label': 'Investor', 'value': 'investor', 'prompt': 'You are a seasoned investor. Help users evaluate investment opportunities and build portfolios.'},
  {'label': 'Researcher', 'value': 'researcher', 'prompt': 'You are an AI researcher. Help users find information, summarize papers, and conduct deep research.'},
  {'label': 'Coach', 'value': 'coach', 'prompt': 'You are a personal development coach. Help users set goals, build habits, and unlock their potential.'},
  {'label': 'Support', 'value': 'support', 'prompt': 'You are a customer support specialist. Help users resolve issues and provide excellent service.'},
  {'label': 'Custom', 'value': 'custom', 'prompt': ''},
];

const _gpuTemplates = [
  {'id': 'easy', 'label': 'Economy', 'description': 'RTX A4000 · Mistral 7B', 'price': '\$0.05/hr'},
  {'id': 'medium', 'label': 'Medium', 'description': 'RTX 3090 · Llama 3.1 8B', 'price': '\$0.15/hr'},
  {'id': 'powerful', 'label': 'Pro', 'description': 'RTX A5000 · Llama 3.1 70B', 'price': '\$0.35/hr'},
];

const _aiModels = [
  {'id': 'runpod-vllm', 'label': 'RunPod vLLM (auto)', 'desc': 'Uses model from your server tier', 'credits': 'Included', 'category': 'open-source'},
  {'id': 'claude-sonnet-4-20250514', 'label': 'Claude Sonnet 4', 'desc': 'Fast & efficient', 'credits': '1 credit/msg', 'category': 'claude'},
  {'id': 'claude-3-5-haiku-20241022', 'label': 'Claude 3.5 Haiku', 'desc': 'Fastest responses', 'credits': '1 credit/msg', 'category': 'claude'},
  {'id': 'claude-3-7-sonnet-20250219', 'label': 'Claude 3.7 Sonnet', 'desc': 'Balanced', 'credits': '2 credits/msg', 'category': 'claude'},
  {'id': 'claude-sonnet-4-20250514-thinking', 'label': 'Sonnet 4 Thinking', 'desc': 'Deep analysis', 'credits': '3 credits/msg', 'category': 'claude'},
  {'id': 'claude-opus-4-20250514', 'label': 'Claude Opus 4', 'desc': 'Max intelligence', 'credits': '5 credits/msg', 'category': 'claude'},
];

const _allTools = ['web-search', 'image-gen', 'code-exec', 'file-analysis'];

class CreateAgentScreen extends StatefulWidget {
  final Future<Agent?> Function(CreateAgentInput input) onSubmit;

  const CreateAgentScreen({super.key, required this.onSubmit});

  @override
  State<CreateAgentScreen> createState() => _CreateAgentScreenState();
}

class _CreateAgentScreenState extends State<CreateAgentScreen> {
  final AgentService _agentService = AgentService();
  int _step = 0;
  final _nameController = TextEditingController();
  final _descController = TextEditingController();
  final _promptController = TextEditingController();
  String _selectedRole = '';
  String _selectedTemplate = 'easy';
  String _selectedModel = 'runpod-vllm';
  bool _isSubmitting = false;
  String _provisioningStatus = '';

  static const _totalSteps = 4;

  bool get _canProceed {
    switch (_step) {
      case 0: return _nameController.text.trim().isNotEmpty;
      case 1: return _selectedRole.isNotEmpty;
      case 2: return _selectedTemplate.isNotEmpty;
      case 3: return _selectedModel.isNotEmpty;
      default: return true;
    }
  }

  void _handleRoleSelect(String value) {
    setState(() => _selectedRole = value);
    final preset = _rolePresets.firstWhere((r) => r['value'] == value, orElse: () => {});
    if (value != 'custom' && preset.isNotEmpty) {
      _promptController.text = preset['prompt']!;
    }
  }

  Future<void> _handleSubmit() async {
    setState(() {
      _isSubmitting = true;
      _provisioningStatus = 'Creating agent...';
    });

    try {
      final agent = await widget.onSubmit(CreateAgentInput(
        name: _nameController.text.trim(),
        role: _selectedRole.isEmpty ? null : _selectedRole,
        systemPrompt: _promptController.text.isEmpty ? null : _promptController.text,
        tools: _allTools,
        model: _selectedModel,
      ));

      if (agent == null) throw Exception('Failed to create agent');

      // Try RunPod provisioning (non-blocking)
      try {
        setState(() => _provisioningStatus = 'Provisioning GPU endpoint...');
        await _agentService.createRunpodEndpoint(agent.id, _selectedTemplate);
      } catch (_) {}

      if (mounted) Navigator.pop(context, agent);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: ${e.toString()}')),
      );
    } finally {
      if (mounted) setState(() {
        _isSubmitting = false;
        _provisioningStatus = '';
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    _promptController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final stepTitles = ['Identity', 'Role', 'GPU Tier', 'AI Model'];

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _step == 0 ? () => Navigator.pop(context) : () => setState(() => _step--),
        ),
        title: Row(
          children: [
            const Icon(Icons.terminal, size: 16, color: AppTheme.muted),
            const SizedBox(width: 8),
            Text('agent-wizard', style: const TextStyle(fontSize: 13, fontFamily: 'monospace', color: AppTheme.mutedForeground)),
            const SizedBox(width: 8),
            Text('step ${_step + 1}/$_totalSteps',
                style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: AppTheme.muted)),
          ],
        ),
        actions: [
          // Progress dots
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Row(
              children: List.generate(_totalSteps, (i) {
                return Container(
                  height: 6,
                  width: i <= _step ? 20 : 6,
                  margin: const EdgeInsets.only(left: 4),
                  decoration: BoxDecoration(
                    color: i < _step
                        ? AppTheme.foreground
                        : i == _step
                            ? AppTheme.foreground.withOpacity(0.5)
                            : AppTheme.muted.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(3),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Step header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                stepTitles[_step],
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.foreground),
              ),
            ),
          ),

          // Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: _buildStepContent(),
            ),
          ),

          // Bottom bar
          Container(
            padding: EdgeInsets.fromLTRB(
              20, 12, 20,
              MediaQuery.of(context).padding.bottom + 12,
            ),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: AppTheme.border.withOpacity(0.2))),
            ),
            child: _isSubmitting
                ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(
                        height: 16,
                        width: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.foreground),
                      ),
                      const SizedBox(width: 12),
                      Text(_provisioningStatus,
                          style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: AppTheme.foreground)),
                    ],
                  )
                : Row(
                    children: [
                      if (_step > 0)
                        TextButton(
                          onPressed: () => setState(() => _step--),
                          child: const Text('← back',
                              style: TextStyle(fontSize: 12, fontFamily: 'monospace', color: AppTheme.muted)),
                        ),
                      const Spacer(),
                      if (_step < _totalSteps - 1)
                        ElevatedButton(
                          onPressed: _canProceed ? () => setState(() => _step++) : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.foreground,
                            foregroundColor: AppTheme.background,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('next →', style: TextStyle(fontSize: 12, fontFamily: 'monospace')),
                        )
                      else
                        ElevatedButton.icon(
                          onPressed: _canProceed ? _handleSubmit : null,
                          icon: const Icon(Icons.terminal, size: 14),
                          label: const Text('deploy agent', style: TextStyle(fontSize: 12, fontFamily: 'monospace')),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.foreground,
                            foregroundColor: AppTheme.background,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_step) {
      case 0:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            _label('agent.name *'),
            TextField(
              controller: _nameController,
              autofocus: true,
              style: const TextStyle(fontSize: 14, fontFamily: 'monospace', color: AppTheme.foreground),
              decoration: _inputDec('CryptoOracle'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
            _label('agent.description'),
            TextField(
              controller: _descController,
              style: const TextStyle(fontSize: 14, fontFamily: 'monospace', color: AppTheme.foreground),
              decoration: _inputDec('What does your agent do?'),
            ),
            const SizedBox(height: 16),
            _label('agent.lore'),
            TextField(
              controller: _promptController,
              maxLines: 4,
              maxLength: 500,
              style: const TextStyle(fontSize: 14, fontFamily: 'monospace', color: AppTheme.foreground),
              decoration: _inputDec('Add personality, backstory, or special instructions...'),
            ),
          ],
        );

      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            _label('select role_preset'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _rolePresets.map((r) {
                final value = r['value']!;
                final selected = _selectedRole == value;
                return ChoiceChip(
                  label: Text(r['label']!.toLowerCase(),
                      style: TextStyle(
                        fontSize: 12,
                        fontFamily: 'monospace',
                        color: selected ? AppTheme.foreground : AppTheme.muted,
                      )),
                  selected: selected,
                  onSelected: (_) => _handleRoleSelect(value),
                  backgroundColor: AppTheme.secondary.withOpacity(0.3),
                  selectedColor: AppTheme.foreground.withOpacity(0.1),
                  side: BorderSide(
                    color: selected ? AppTheme.foreground.withOpacity(0.3) : AppTheme.border.withOpacity(0.1),
                  ),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                );
              }).toList(),
            ),
          ],
        );

      case 2:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            _label('select gpu_tier'),
            const SizedBox(height: 8),
            ..._gpuTemplates.map((t) {
              final id = t['id']!;
              final selected = _selectedTemplate == id;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: () => setState(() => _selectedTemplate = id),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: selected ? AppTheme.foreground.withOpacity(0.1) : AppTheme.secondary.withOpacity(0.3),
                      border: Border.all(
                        color: selected ? AppTheme.foreground.withOpacity(0.3) : AppTheme.border.withOpacity(0.1),
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          id == 'easy' ? Icons.bolt : id == 'medium' ? Icons.memory : Icons.rocket_launch,
                          size: 18,
                          color: selected ? AppTheme.foreground : AppTheme.muted,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(t['label']!, style: TextStyle(
                                fontSize: 14, fontWeight: FontWeight.w500,
                                color: selected ? AppTheme.foreground : AppTheme.mutedForeground,
                              )),
                              Text(t['description']!, style: TextStyle(
                                fontSize: 11, color: AppTheme.muted.withOpacity(0.6),
                                fontFamily: 'monospace',
                              )),
                            ],
                          ),
                        ),
                        Text(t['price']!, style: TextStyle(
                          fontSize: 10,
                          fontFamily: 'monospace',
                          color: selected ? AppTheme.foreground.withOpacity(0.6) : AppTheme.muted.withOpacity(0.4),
                        )),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ],
        );

      case 3:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            _label('models.open_source'),
            const SizedBox(height: 8),
            ..._aiModels.where((m) => m['category'] == 'open-source').map((m) => _modelTile(m)),
            const SizedBox(height: 16),
            _label('models.claude'),
            const SizedBox(height: 8),
            ..._aiModels.where((m) => m['category'] == 'claude').map((m) => _modelTile(m)),
          ],
        );

      default:
        return const SizedBox.shrink();
    }
  }

  Widget _modelTile(Map<String, String> m) {
    final id = m['id']!;
    final selected = _selectedModel == id;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: () => setState(() => _selectedModel = id),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? AppTheme.foreground.withOpacity(0.1) : AppTheme.secondary.withOpacity(0.3),
            border: Border.all(
              color: selected ? AppTheme.foreground.withOpacity(0.3) : AppTheme.border.withOpacity(0.1),
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(
                m['category'] == 'claude' ? Icons.psychology : Icons.memory,
                size: 18,
                color: selected ? AppTheme.foreground : AppTheme.muted,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(m['label']!, style: TextStyle(
                      fontSize: 13, fontWeight: FontWeight.w500,
                      color: selected ? AppTheme.foreground : AppTheme.mutedForeground,
                    )),
                    Text(m['desc']!, style: TextStyle(
                      fontSize: 11, color: AppTheme.muted.withOpacity(0.6),
                    )),
                  ],
                ),
              ),
              Text(m['credits']!, style: TextStyle(
                fontSize: 9,
                fontFamily: 'monospace',
                color: selected ? AppTheme.foreground.withOpacity(0.6) : AppTheme.muted.withOpacity(0.4),
              )),
            ],
          ),
        ),
      ),
    );
  }

  Widget _label(String text) => Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontFamily: 'monospace',
          color: AppTheme.foreground.withOpacity(0.6),
        ),
      );

  InputDecoration _inputDec(String hint) => InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: AppTheme.muted.withOpacity(0.3), fontFamily: 'monospace'),
        filled: true,
        fillColor: AppTheme.secondary.withOpacity(0.3),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: AppTheme.border.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: AppTheme.border.withOpacity(0.2)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      );
}
