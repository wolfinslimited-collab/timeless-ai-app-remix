import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../providers/generation_provider.dart';
import '../../providers/credits_provider.dart';
import '../../widgets/common/credit_badge.dart';

class ImageCreateScreen extends StatefulWidget {
  const ImageCreateScreen({super.key});

  @override
  State<ImageCreateScreen> createState() => _ImageCreateScreenState();
}

class _ImageCreateScreenState extends State<ImageCreateScreen> {
  final _promptController = TextEditingController();
  String _selectedModel = 'flux-1.1-pro';
  String _selectedAspectRatio = '1:1';
  String? _generatedImageUrl;

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _handleGenerate() async {
    if (_promptController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a prompt')),
      );
      return;
    }

    final creditsProvider = context.read<CreditsProvider>();
    if (!creditsProvider.hasEnoughCreditsForModel(_selectedModel)) {
      // Show add credits dialog
      _showAddCreditsDialog();
      return;
    }

    final generationProvider = context.read<GenerationProvider>();
    final result = await generationProvider.generate(
      prompt: _promptController.text.trim(),
      model: _selectedModel,
      type: 'image',
      aspectRatio: _selectedAspectRatio,
    );

    if (result != null && result.outputUrl != null) {
      setState(() {
        _generatedImageUrl = result.outputUrl;
      });
      creditsProvider.refresh();
    }
  }

  void _showAddCreditsDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.toll, size: 48, color: AppTheme.accent),
            const SizedBox(height: 16),
            const Text(
              'Insufficient Credits',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'You need more credits to generate this image.',
              style: TextStyle(color: AppTheme.muted),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                // Navigate to pricing
              },
              child: const Text('Get Credits'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Image Generation'),
        actions: const [
          CreditBadge(),
          SizedBox(width: 16),
        ],
      ),
      body: Column(
        children: [
          // Preview Area
          Expanded(
            child: Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppTheme.border),
              ),
              child: _generatedImageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: CachedNetworkImage(
                        imageUrl: _generatedImageUrl!,
                        fit: BoxFit.contain,
                        placeholder: (context, url) => const Center(
                          child: CircularProgressIndicator(),
                        ),
                      ),
                    )
                  : const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.image, size: 64, color: AppTheme.muted),
                          SizedBox(height: 16),
                          Text(
                            'Your image will appear here',
                            style: TextStyle(color: AppTheme.muted),
                          ),
                        ],
                      ),
                    ),
            ),
          ),

          // Controls
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: AppTheme.card,
              border: Border(top: BorderSide(color: AppTheme.border)),
            ),
            child: Column(
              children: [
                // Model Selection
                SizedBox(
                  height: 40,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: AppConfig.imageModels.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final model = AppConfig.imageModels[index];
                      final isSelected = model['id'] == _selectedModel;
                      return ChoiceChip(
                        label: Text(model['name'] as String),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) {
                            setState(() {
                              _selectedModel = model['id'] as String;
                            });
                          }
                        },
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),

                // Aspect Ratio
                SizedBox(
                  height: 36,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: AppConfig.aspectRatios.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final ratio = AppConfig.aspectRatios[index];
                      final isSelected = ratio == _selectedAspectRatio;
                      return ChoiceChip(
                        label: Text(ratio),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) {
                            setState(() {
                              _selectedAspectRatio = ratio;
                            });
                          }
                        },
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),

                // Prompt Input
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _promptController,
                        decoration: const InputDecoration(
                          hintText: 'Describe your image...',
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                        maxLines: 2,
                        minLines: 1,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Consumer<GenerationProvider>(
                      builder: (context, provider, child) {
                        return ElevatedButton(
                          onPressed: provider.isGenerating ? null : _handleGenerate,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.all(16),
                            minimumSize: const Size(56, 56),
                          ),
                          child: provider.isGenerating
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.auto_awesome),
                        );
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
