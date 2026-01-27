import 'package:flutter/material.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import 'model_logo.dart';

class ModelSelectorModal extends StatelessWidget {
  final String selectedModel;
  final Function(String) onSelect;

  const ModelSelectorModal({
    super.key,
    required this.selectedModel,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppTheme.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Title
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.psychology, color: AppTheme.primary),
                const SizedBox(width: 12),
                const Text(
                  'Select AI Model',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppTheme.border),
          // Models List
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              padding: const EdgeInsets.all(12),
              itemCount: AppConfig.chatModels.length,
              itemBuilder: (context, index) {
                final model = AppConfig.chatModels[index];
                final isSelected = model['id'] == selectedModel;
                
                return _ModelCard(
                  model: model,
                  isSelected: isSelected,
                  onTap: () {
                    onSelect(model['id'] as String);
                    Navigator.pop(context);
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _ModelCard extends StatelessWidget {
  final Map<String, dynamic> model;
  final bool isSelected;
  final VoidCallback onTap;

  const _ModelCard({
    required this.model,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final modelId = model['id'] as String;
    final modelName = model['name'] as String;
    final credits = model['credits'] as int;
    final icon = model['icon'] as String? ?? 'ai';
    
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withOpacity(0.1) : AppTheme.secondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.primary : AppTheme.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            ModelLogo(modelId: modelId, size: 40),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        modelName,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: isSelected ? AppTheme.primary : AppTheme.foreground,
                        ),
                      ),
                      if (modelId == 'chatgpt-5.2') ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppTheme.primary,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'NEW',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _getModelDescription(modelId),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.muted,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.card,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.toll, size: 14, color: AppTheme.accent),
                  const SizedBox(width: 4),
                  Text(
                    '$credits',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.accent,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected) ...[
              const SizedBox(width: 8),
              const Icon(Icons.check_circle, color: AppTheme.primary, size: 20),
            ],
          ],
        ),
      ),
    );
  }

  String _getModelDescription(String modelId) {
    switch (modelId) {
      case 'chatgpt-5.2':
        return 'Most advanced reasoning & analysis';
      case 'chatgpt-5':
        return 'Powerful all-rounder with vision';
      case 'gemini-3-flash':
        return 'Fast & efficient responses';
      case 'gemini-3-pro':
        return 'Advanced reasoning capabilities';
      case 'grok-3':
        return 'Direct, witty & helpful';
      case 'deepseek-r1':
        return 'Deep reasoning specialist';
      case 'llama-3.3':
        return 'Fast open-source model';
      default:
        return 'AI assistant';
    }
  }
}
