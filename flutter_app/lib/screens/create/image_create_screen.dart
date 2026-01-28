import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../providers/generation_provider.dart';
import '../../providers/credits_provider.dart';
import '../../widgets/common/smart_media_image.dart';

class ImageCreateScreen extends StatefulWidget {
  const ImageCreateScreen({super.key});

  @override
  State<ImageCreateScreen> createState() => _ImageCreateScreenState();
}

class _ImageCreateScreenState extends State<ImageCreateScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _promptController = TextEditingController();
  String _selectedModel = 'nano-banana';
  String _selectedAspectRatio = '1:1';
  String? _generatedImageUrl;

  static const List<Map<String, dynamic>> _imageTools = [
    {
      'id': 'relight',
      'name': 'Relight',
      'description': 'AI-powered relighting',
      'icon': Icons.wb_sunny,
      'credits': 2,
      'route': '/create/image/relight',
    },
    {
      'id': 'upscale',
      'name': 'Upscale',
      'description': 'Enhance resolution up to 4x',
      'icon': Icons.hd,
      'credits': 3,
      'route': '/create/image/upscale',
    },
    {
      'id': 'shots',
      'name': 'Shots',
      'description': '9 cinematic angles',
      'icon': Icons.grid_view,
      'credits': 10,
      'route': '/create/image/shots',
    },
    {
      'id': 'inpainting',
      'name': 'Inpainting',
      'description': 'Paint to replace areas',
      'icon': Icons.brush,
      'credits': 5,
      'route': '/create/image/inpainting',
    },
    {
      'id': 'object-erase',
      'name': 'Object Erase',
      'description': 'Remove unwanted objects',
      'icon': Icons.auto_fix_high,
      'credits': 4,
      'route': '/create/image/object-erase',
    },
    {
      'id': 'background-remove',
      'name': 'Remove BG',
      'description': 'Remove backgrounds',
      'icon': Icons.content_cut,
      'credits': 2,
      'route': '/create/image/background-remove',
    },
    {
      'id': 'style-transfer',
      'name': 'Style Transfer',
      'description': 'Apply artistic styles',
      'icon': Icons.palette,
      'credits': 4,
      'route': '/create/image/style-transfer',
    },
    {
      'id': 'skin-enhancer',
      'name': 'Skin Enhancer',
      'description': 'Portrait retouching',
      'icon': Icons.face,
      'credits': 3,
      'route': '/create/image/skin-enhancer',
    },
    {
      'id': 'angle',
      'name': 'Change Angle',
      'description': 'View from new perspectives',
      'icon': Icons.rotate_90_degrees_ccw,
      'credits': 4,
      'route': '/create/image/angle',
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _promptController.dispose();
    super.dispose();
  }

  int get _selectedModelCredits {
    final model = AppConfig.imageModels.firstWhere(
      (m) => m['id'] == _selectedModel,
      orElse: () => {'credits': 4},
    );
    return model['credits'] as int;
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
              onPressed: () => Navigator.pop(context),
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
        title: const Text('Image'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primary,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.muted,
          tabs: const [
            Tab(text: 'Generate'),
            Tab(text: 'Tools'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildGenerateTab(),
          _buildToolsTab(),
        ],
      ),
    );
  }

  Widget _buildGenerateTab() {
    return Column(
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
            child: Consumer<GenerationProvider>(
              builder: (context, provider, child) {
                if (provider.isGenerating) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(),
                        SizedBox(height: 16),
                        Text('Generating...',
                            style: TextStyle(color: AppTheme.muted)),
                      ],
                    ),
                  );
                }

                if (_generatedImageUrl != null) {
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: SmartMediaImage(
                      imageUrl: _generatedImageUrl!,
                      fit: BoxFit.contain,
                    ),
                  );
                }

                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.image, size: 48, color: AppTheme.muted),
                      SizedBox(height: 16),
                      Text(
                        'Your image will appear here',
                        style: TextStyle(color: AppTheme.muted, fontSize: 14),
                      ),
                    ],
                  ),
                );
              },
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
                height: 36,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: AppConfig.imageModels.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final model = AppConfig.imageModels[index];
                    final isSelected = model['id'] == _selectedModel;
                    return GestureDetector(
                      onTap: () =>
                          setState(() => _selectedModel = model['id'] as String),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color:
                              isSelected ? AppTheme.primary : AppTheme.secondary,
                          borderRadius: BorderRadius.circular(18),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          model['name'] as String,
                          style: TextStyle(
                            color: isSelected
                                ? Colors.white
                                : AppTheme.mutedForeground,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 12),

              // Aspect Ratio
              Row(
                children: [
                  const Text('Ratio:',
                      style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                  const SizedBox(width: 8),
                  ...['1:1', '16:9', '9:16'].map((ratio) {
                    final isSelected = ratio == _selectedAspectRatio;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () =>
                            setState(() => _selectedAspectRatio = ratio),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? AppTheme.primary.withOpacity(0.2)
                                : AppTheme.secondary,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            ratio,
                            style: TextStyle(
                              color: isSelected ? AppTheme.primary : AppTheme.muted,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
              const SizedBox(height: 16),

              // Prompt Input
              Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(25),
                      ),
                      child: TextField(
                        controller: _promptController,
                        decoration: const InputDecoration(
                          hintText: 'Describe your image...',
                          hintStyle: TextStyle(color: AppTheme.muted),
                          contentPadding: EdgeInsets.symmetric(
                              horizontal: 16, vertical: 12),
                          border: InputBorder.none,
                        ),
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Consumer<GenerationProvider>(
                    builder: (context, provider, child) {
                      return GestureDetector(
                        onTap: provider.isGenerating ? null : _handleGenerate,
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: provider.isGenerating
                                ? AppTheme.muted
                                : AppTheme.primary,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: provider.isGenerating
                              ? const Padding(
                                  padding: EdgeInsets.all(12),
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.auto_awesome,
                                  color: Colors.white, size: 20),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildToolsTab() {
    return GridView.builder(
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.1,
      ),
      itemCount: _imageTools.length,
      itemBuilder: (context, index) {
        final tool = _imageTools[index];
        return _buildToolCard(tool);
      },
    );
  }

  Widget _buildToolCard(Map<String, dynamic> tool) {
    return GestureDetector(
      onTap: () => context.go(tool['route'] as String),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border.withOpacity(0.5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    tool['icon'] as IconData,
                    color: AppTheme.primary,
                    size: 22,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.bolt, color: AppTheme.primary, size: 12),
                      const SizedBox(width: 2),
                      Text(
                        '${tool['credits']}',
                        style: const TextStyle(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.w600,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Spacer(),
            Text(
              tool['name'] as String,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              tool['description'] as String,
              style: const TextStyle(
                color: AppTheme.muted,
                fontSize: 12,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
