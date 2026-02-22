import 'package:flutter/material.dart';
import '../../core/theme.dart';
import '../../models/agent_model.dart';
import '../../services/agent_service.dart';

const _rolePresets = [
  {'label': 'Marketing', 'value': 'marketing', 'icon': Icons.campaign, 'prompt': 'You are an expert marketing strategist. Help users design campaigns, write copy, and grow their brand.'},
  {'label': 'Developer', 'value': 'developer', 'icon': Icons.code, 'prompt': 'You are a senior software developer. Help users write code, debug issues, and architect solutions.'},
  {'label': 'Writer', 'value': 'writer', 'icon': Icons.edit_note, 'prompt': 'You are a creative writer and editor. Help users write compelling content, stories, and copy.'},
  {'label': 'Analyst', 'value': 'analyst', 'icon': Icons.analytics, 'prompt': 'You are a data analyst. Help users interpret data, build reports, and find insights.'},
  {'label': 'Designer', 'value': 'designer', 'icon': Icons.palette, 'prompt': 'You are a UX/UI designer. Help users create beautiful, usable interfaces and design systems.'},
  {'label': 'Trader', 'value': 'trader', 'icon': Icons.candlestick_chart, 'prompt': 'You are an expert trader and market analyst. Help users analyze charts, identify trading opportunities, and manage risk.'},
  {'label': 'Financial', 'value': 'financial', 'icon': Icons.account_balance, 'prompt': 'You are a financial advisor and planner. Help users with budgeting, financial planning, and wealth management.'},
  {'label': 'Investor', 'value': 'investor', 'icon': Icons.trending_up, 'prompt': 'You are a seasoned investor. Help users evaluate investment opportunities and build portfolios.'},
  {'label': 'Researcher', 'value': 'researcher', 'icon': Icons.science, 'prompt': 'You are an AI researcher. Help users find information, summarize papers, and conduct deep research.'},
  {'label': 'Coach', 'value': 'coach', 'icon': Icons.emoji_events, 'prompt': 'You are a personal development coach. Help users set goals, build habits, and unlock their potential.'},
  {'label': 'Support', 'value': 'support', 'icon': Icons.support_agent, 'prompt': 'You are a customer support specialist. Help users resolve issues and provide excellent service.'},
  {'label': 'Custom', 'value': 'custom', 'icon': Icons.tune, 'prompt': ''},
];

const _gpuTemplates = [
  {'id': 'easy', 'label': 'Economy', 'description': 'RTX A4000 · Mistral 7B', 'price': '\$0.05/hr', 'icon': Icons.bolt},
  {'id': 'medium', 'label': 'Standard', 'description': 'RTX 3090 · Llama 3.1 8B', 'price': '\$0.15/hr', 'icon': Icons.memory},
  {'id': 'powerful', 'label': 'Pro', 'description': 'RTX A5000 · Llama 3.1 70B', 'price': '\$0.35/hr', 'icon': Icons.rocket_launch},
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
      _promptController.text = preset['prompt'] as String;
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
    final stepSubtitles = [
      'Give your agent a name and personality',
      'Choose a specialization for your agent',
      'Select compute power for your agent',
      'Pick the AI model to power your agent',
    ];

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: _step == 0 ? () => Navigator.pop(context) : () => setState(() => _step--),
        ),
        title: const Text('Create Agent', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                '${_step + 1} of $_totalSteps',
                style: const TextStyle(fontSize: 13, color: AppTheme.muted),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Progress bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: (_step + 1) / _totalSteps,
                backgroundColor: AppTheme.secondary,
                valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
                minHeight: 3,
              ),
            ),
          ),

          // Step header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 4),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                stepTitles[_step],
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.foreground),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                stepSubtitles[_step],
                style: const TextStyle(fontSize: 14, color: AppTheme.muted),
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
              color: AppTheme.background,
              border: Border(top: BorderSide(color: AppTheme.border.withOpacity(0.3))),
            ),
            child: _isSubmitting
                ? Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                      ),
                      const SizedBox(width: 12),
                      Text(_provisioningStatus,
                          style: const TextStyle(fontSize: 13, color: AppTheme.muted)),
                    ],
                  )
                : Row(
                    children: [
                      if (_step > 0)
                        TextButton.icon(
                          onPressed: () => setState(() => _step--),
                          icon: const Icon(Icons.arrow_back, size: 16),
                          label: const Text('Back'),
                          style: TextButton.styleFrom(foregroundColor: AppTheme.mutedForeground),
                        ),
                      const Spacer(),
                      if (_step < _totalSteps - 1)
                        ElevatedButton(
                          onPressed: _canProceed ? () => setState(() => _step++) : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: AppTheme.primaryForeground,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('Next', style: TextStyle(fontWeight: FontWeight.w600)),
                              SizedBox(width: 4),
                              Icon(Icons.arrow_forward, size: 16),
                            ],
                          ),
                        )
                      else
                        ElevatedButton.icon(
                          onPressed: _canProceed ? _handleSubmit : null,
                          icon: const Icon(Icons.rocket_launch, size: 16),
                          label: const Text('Deploy Agent', style: TextStyle(fontWeight: FontWeight.w600)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            foregroundColor: AppTheme.primaryForeground,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
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
            _sectionLabel('Name *'),
            TextField(
              controller: _nameController,
              autofocus: true,
              style: const TextStyle(fontSize: 15, color: AppTheme.foreground),
              decoration: _inputDec('e.g. CryptoOracle'),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 20),
            _sectionLabel('Description'),
            TextField(
              controller: _descController,
              style: const TextStyle(fontSize: 15, color: AppTheme.foreground),
              decoration: _inputDec('What does your agent do?'),
            ),
            const SizedBox(height: 20),
            _sectionLabel('Personality & Instructions'),
            TextField(
              controller: _promptController,
              maxLines: 4,
              maxLength: 500,
              style: const TextStyle(fontSize: 15, color: AppTheme.foreground),
              decoration: _inputDec('Add personality, backstory, or special instructions...'),
            ),
          ],
        );

      case 1:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ..._rolePresets.map((r) {
              final value = r['value'] as String;
              final selected = _selectedRole == value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: () => _handleRoleSelect(value),
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
                          height: 40,
                          width: 40,
                          decoration: BoxDecoration(
                            color: selected ? AppTheme.primary.withOpacity(0.15) : AppTheme.card,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Icon(
                            r['icon'] as IconData,
                            size: 20,
                            color: selected ? AppTheme.primary : AppTheme.muted,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Text(r['label'] as String, style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            color: selected ? AppTheme.foreground : AppTheme.mutedForeground,
                          )),
                        ),
                        if (selected)
                          const Icon(Icons.check_circle, color: AppTheme.primary, size: 20),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ],
        );

      case 2:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ..._gpuTemplates.map((t) {
              final id = t['id'] as String;
              final selected = _selectedTemplate == id;
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  onTap: () => setState(() => _selectedTemplate = id),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    padding: const EdgeInsets.all(16),
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
                          height: 44,
                          width: 44,
                          decoration: BoxDecoration(
                            color: selected ? AppTheme.primary.withOpacity(0.15) : AppTheme.card,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(
                            t['icon'] as IconData,
                            size: 22,
                            color: selected ? AppTheme.primary : AppTheme.muted,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(t['label'] as String, style: TextStyle(
                                fontSize: 15, fontWeight: FontWeight.w600,
                                color: selected ? AppTheme.foreground : AppTheme.mutedForeground,
                              )),
                              const SizedBox(height: 2),
                              Text(t['description'] as String, style: const TextStyle(
                                fontSize: 12, color: AppTheme.muted,
                              )),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppTheme.card,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(t['price'] as String, style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: selected ? AppTheme.foreground : AppTheme.muted,
                          )),
                        ),
                        if (selected) ...[
                          const SizedBox(width: 10),
                          const Icon(Icons.check_circle, color: AppTheme.primary, size: 20),
                        ],
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
            _sectionLabel('Open Source'),
            const SizedBox(height: 6),
            ..._aiModels.where((m) => m['category'] == 'open-source').map(_modelTile),
            const SizedBox(height: 20),
            _sectionLabel('Claude Models'),
            const SizedBox(height: 6),
            ..._aiModels.where((m) => m['category'] == 'claude').map(_modelTile),
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
                height: 40,
                width: 40,
                decoration: BoxDecoration(
                  color: selected ? AppTheme.primary.withOpacity(0.15) : AppTheme.card,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  m['category'] == 'claude' ? Icons.psychology : Icons.memory,
                  size: 20,
                  color: selected ? AppTheme.primary : AppTheme.muted,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(m['label']!, style: TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w500,
                      color: selected ? AppTheme.foreground : AppTheme.mutedForeground,
                    )),
                    const SizedBox(height: 2),
                    Text(m['desc']!, style: const TextStyle(
                      fontSize: 12, color: AppTheme.muted,
                    )),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.card,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(m['credits']!, style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: selected ? AppTheme.primary : AppTheme.muted,
                )),
              ),
              if (selected) ...[
                const SizedBox(width: 8),
                const Icon(Icons.check_circle, color: AppTheme.primary, size: 20),
              ],
            ],
          ),
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
