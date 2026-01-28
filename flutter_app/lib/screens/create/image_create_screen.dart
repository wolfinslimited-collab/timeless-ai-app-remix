import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../core/image_models.dart';
import '../../providers/generation_provider.dart';
import '../../providers/credits_provider.dart';
import '../../widgets/common/smart_media_image.dart';
import '../../widgets/common/shimmer_loading.dart';
import '../../widgets/common/full_screen_image_viewer.dart';
import 'image_model_selector.dart';

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
  String _selectedQuality = '1024';
  String? _selectedStyle;
  String? _generatedImageUrl;
  String? _generatedGenerationId;
  bool _isLoadingImage = false;

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
    return ImageModels.getCredits(_selectedModel);
  }

  Map<String, dynamic>? get _selectedModelData {
    try {
      return ImageModels.allModels.firstWhere(
        (m) => m['id'] == _selectedModel,
      );
    } catch (e) {
      return null;
    }
  }

  String get _selectedModelName {
    return _selectedModelData?['name'] ?? 'Select Model';
  }

  List<String> get _availableQualityOptions {
    return ImageModels.getQualityOptionsForModel(_selectedModel);
  }

  String get _finalPrompt {
    if (_selectedStyle == null) return _promptController.text.trim();
    
    final stylePreset = ImageModels.stylePresets.firstWhere(
      (s) => s['id'] == _selectedStyle,
      orElse: () => {},
    );
    
    final stylePrompt = stylePreset['prompt'] as String?;
    if (stylePrompt == null) return _promptController.text.trim();
    
    return '${_promptController.text.trim()}, $stylePrompt';
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

    // Clear previous result
    setState(() {
      _generatedImageUrl = null;
      _generatedGenerationId = null;
    });

    final generationProvider = context.read<GenerationProvider>();
    final result = await generationProvider.generate(
      prompt: _finalPrompt,
      model: _selectedModel,
      type: 'image',
      aspectRatio: _selectedAspectRatio,
      quality: _selectedQuality,
    );

    if (result != null && result.outputUrl != null) {
      // Show shimmer while image loads
      setState(() {
        _isLoadingImage = true;
        _generatedImageUrl = result.outputUrl;
        _generatedGenerationId = result.id;
      });

      // Short delay to show shimmer effect, image loads in background
      await Future.delayed(const Duration(milliseconds: 300));
      
      if (mounted) {
        setState(() {
          _isLoadingImage = false;
        });
      }
      
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

  void _showModelSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => ImageModelSelector(
        selectedModel: _selectedModel,
        models: ImageModels.allModels,
        onSelect: (modelId) {
          setState(() {
            _selectedModel = modelId;
            // Reset quality if not available for new model
            if (!_availableQualityOptions.contains(_selectedQuality)) {
              _selectedQuality = _availableQualityOptions.first;
            }
          });
          Navigator.pop(context);
        },
      ),
    );
  }

  void _showFullScreenImage() {
    if (_generatedImageUrl == null) return;
    
    FullScreenImageViewer.show(
      context,
      imageUrl: _generatedImageUrl!,
      prompt: _promptController.text,
      model: _selectedModel,
      generationId: _generatedGenerationId,
      onRecreate: () {
        // Set up for regeneration with same prompt
        _handleGenerate();
      },
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
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: TabBarView(
          controller: _tabController,
          children: [
            _buildGenerateTab(),
            _buildToolsTab(),
          ],
        ),
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
                // Show shimmer while generating or loading image
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

                // Show shimmer while image is loading
                if (_isLoadingImage && _generatedImageUrl != null) {
                  return const ImageShimmer(
                    message: 'Loading image...',
                  );
                }

                // Show the generated image with tap to view full screen
                if (_generatedImageUrl != null) {
                  return GestureDetector(
                    onTap: () => _showFullScreenImage(),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: SmartMediaImage(
                            imageUrl: _generatedImageUrl!,
                            fit: BoxFit.contain,
                          ),
                        ),
                        // Tap to view indicator
                        Positioned(
                          bottom: 12,
                          right: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.zoom_out_map,
                                  color: Colors.white,
                                  size: 14,
                                ),
                                SizedBox(width: 4),
                                Text(
                                  'Tap to view',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
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
              // Model Selector Button
              GestureDetector(
                onTap: _showModelSelector,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.auto_awesome, color: AppTheme.primary, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _selectedModelName,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            Text(
                              '$_selectedModelCredits credits',
                              style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.expand_more, color: AppTheme.muted),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Quality and Aspect Ratio Row
              Row(
                children: [
                  // Quality selector
                  Expanded(
                    child: Container(
                      height: 40,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _availableQualityOptions.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final quality = _availableQualityOptions[index];
                          final qualityData = ImageModels.qualityOptions[quality];
                          final isSelected = quality == _selectedQuality;
                          return GestureDetector(
                            onTap: () => setState(() => _selectedQuality = quality),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppTheme.primary.withOpacity(0.2)
                                    : AppTheme.secondary,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSelected ? AppTheme.primary : AppTheme.border,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                qualityData?['name'] ?? quality,
                                style: TextStyle(
                                  color: isSelected ? AppTheme.primary : AppTheme.mutedForeground,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Aspect Ratio Dropdown
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: AppTheme.secondary,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedAspectRatio,
                        dropdownColor: AppTheme.card,
                        items: ImageModels.aspectRatios.map((ratio) {
                          return DropdownMenuItem(
                            value: ratio,
                            child: Text(ratio, style: const TextStyle(fontSize: 12)),
                          );
                        }).toList(),
                        onChanged: (value) {
                          if (value != null) {
                            setState(() => _selectedAspectRatio = value);
                          }
                        },
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Style Presets
              SizedBox(
                height: 36,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: ImageModels.stylePresets.length + 1,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    if (index == 0) {
                      // No style option
                      final isSelected = _selectedStyle == null;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedStyle = null),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.primary : AppTheme.secondary,
                            borderRadius: BorderRadius.circular(18),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'None',
                            style: TextStyle(
                              color: isSelected ? Colors.white : AppTheme.mutedForeground,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      );
                    }
                    
                    final style = ImageModels.stylePresets[index - 1];
                    final isSelected = _selectedStyle == style['id'];
                    return GestureDetector(
                      onTap: () => setState(() => _selectedStyle = style['id'] as String),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primary : AppTheme.secondary,
                          borderRadius: BorderRadius.circular(18),
                        ),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _getStyleIcon(style['icon'] as String),
                              size: 14,
                              color: isSelected ? Colors.white : AppTheme.mutedForeground,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              style['name'] as String,
                              style: TextStyle(
                                color: isSelected ? Colors.white : AppTheme.mutedForeground,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
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

  IconData _getStyleIcon(String iconName) {
    switch (iconName) {
      case 'movie_creation':
        return Icons.movie_creation;
      case 'person':
        return Icons.person;
      case 'auto_fix_high':
        return Icons.auto_fix_high;
      case 'tv':
        return Icons.tv;
      case 'camera_alt':
        return Icons.camera_alt;
      case 'palette':
        return Icons.palette;
      default:
        return Icons.style;
    }
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
