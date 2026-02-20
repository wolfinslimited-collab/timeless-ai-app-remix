import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/agent_model.dart';
import '../../services/agent_service.dart';
import '../../providers/credits_provider.dart';
import '../../widgets/agents/agent_card_widget.dart';
import '../../widgets/agents/delete_agent_dialog.dart';
import 'agent_chat_screen.dart';
import 'create_agent_screen.dart';
import 'edit_agent_screen.dart';

class AgentsScreen extends StatefulWidget {
  const AgentsScreen({super.key});

  @override
  State<AgentsScreen> createState() => _AgentsScreenState();
}

class _AgentsScreenState extends State<AgentsScreen>
    with AutomaticKeepAliveClientMixin {
  final AgentService _agentService = AgentService();
  List<Agent> _agents = [];
  Map<String, String> _statuses = {};
  bool _loading = true;
  Timer? _statusTimer;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _loadAgents();
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadAgents() async {
    setState(() => _loading = true);
    final agents = await _agentService.getAgents();
    if (mounted) {
      setState(() {
        _agents = agents;
        _loading = false;
      });
      _fetchStatuses();
      _statusTimer?.cancel();
      _statusTimer = Timer.periodic(
        const Duration(seconds: 30),
        (_) => _fetchStatuses(),
      );
    }
  }

  Future<void> _fetchStatuses() async {
    if (_agents.isEmpty) return;
    if (!_agents.any((a) => a.runpodEndpointId != null)) return;
    final statuses = await _agentService.fetchStatuses();
    if (mounted) setState(() => _statuses = statuses);
  }

  Future<void> _togglePause(Agent agent) async {
    final newPaused = !agent.paused;
    final ok = await _agentService.updateAgent(agent.id, {'paused': newPaused});
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(newPaused
              ? '${agent.name} paused'
              : '${agent.name} resumed'),
        ),
      );
      _loadAgents();
    }
  }

  Future<void> _deleteAgent(Agent agent) async {
    if (agent.runpodEndpointId != null) {
      await _agentService.deleteRunpodEndpoint(agent.id);
    }
    await _agentService.deleteAgent(agent.id);
    _loadAgents();
  }

  void _openChat(Agent agent) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AgentChatScreen(
          agent: agent,
          onUpdateModel: (id, updates) =>
              _agentService.updateAgent(id, updates),
        ),
      ),
    );
  }

  void _openEdit(Agent agent) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => EditAgentScreen(
          agent: agent,
          onSave: (id, updates) => _agentService.updateAgent(id, updates),
        ),
      ),
    );
    if (result == true) _loadAgents();
  }

  void _openCreate() async {
    final result = await Navigator.of(context).push<Agent>(
      MaterialPageRoute(
        builder: (_) => CreateAgentScreen(
          onSubmit: (input) => _agentService.createAgent(input),
        ),
      ),
    );
    if (result != null) {
      _loadAgents();
      if (mounted) _openChat(result);
    }
  }

  void _showSubGate() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.background,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 56,
              width: 56,
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.lock_outline,
                  color: AppTheme.muted, size: 28),
            ),
            const SizedBox(height: 16),
            const Text(
              'Subscription Required',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.foreground,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Creating custom AI agents requires an active subscription.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.muted, fontSize: 13),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  // Navigate to pricing
                },
                icon: const Icon(Icons.bolt, size: 18),
                label: const Text('Upgrade Now'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleNewAgent() {
    final credits = context.read<CreditsProvider>();
    if (!credits.hasActiveSubscription) {
      _showSubGate();
    } else {
      _openCreate();
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Agents', style: TextStyle(fontWeight: FontWeight.bold)),
        automaticallyImplyLeading: false,
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: AppTheme.primary),
            )
          : _agents.isEmpty
              ? _buildEmpty()
              : _buildGrid(),
      floatingActionButton: FloatingActionButton(
        onPressed: _handleNewAgent,
        backgroundColor: AppTheme.foreground,
        child: const Icon(Icons.add, color: AppTheme.background),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 80,
              width: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.border),
              ),
              child: const Icon(Icons.smart_toy_outlined,
                  size: 36, color: AppTheme.muted),
            ),
            const SizedBox(height: 24),
            const Text(
              'No agents yet',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppTheme.foreground,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Create your first AI agent to get started.',
              style: TextStyle(color: AppTheme.muted),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _handleNewAgent,
              icon: const Icon(Icons.add),
              label: const Text('Create Agent'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGrid() {
    return RefreshIndicator(
      onRefresh: _loadAgents,
      color: AppTheme.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _agents.length,
        itemBuilder: (context, index) {
          final agent = _agents[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: AgentCardWidget(
              agent: agent,
              status: _statuses[agent.id] ??
                  (agent.runpodEndpointId != null ? null : 'no_endpoint'),
              onChat: () => _openChat(agent),
              onEdit: () => _openEdit(agent),
              onDelete: () => showDeleteAgentDialog(
                context: context,
                agent: agent,
                onConfirm: _deleteAgent,
              ),
              onTogglePause: () => _togglePause(agent),
            ),
          );
        },
      ),
    );
  }
}
