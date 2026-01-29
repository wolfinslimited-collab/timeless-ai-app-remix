import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path/path.dart' as path;
import '../../core/theme.dart';
import '../../core/image_models.dart';
import '../../providers/generation_provider.dart';
import '../../providers/credits_provider.dart';
import '../../widgets/common/smart_media_image.dart';
import '../../widgets/common/shimmer_loading.dart';
import '../../widgets/common/full_screen_image_viewer.dart';
import '../../widgets/add_credits_dialog.dart';
import '../../widgets/tool_selector.dart';
import 'image_model_selector.dart';

class ImageCreateScreen extends StatefulWidget {
  final String? initialTool;

  const ImageCreateScreen({super.key, this.initialTool});

  @override
  State<ImageCreateScreen> createState() => _ImageCreateScreenState();
}

class _ImageCreateScreenState extends State<ImageCreateScreen> {
  final _promptController = TextEditingController();
  late String _selectedToolId;
  final ImagePicker _picker = ImagePicker();
  final SupabaseClient _supabase = Supabase.instance.client;

  String _selectedModel = 'nano-banana';
  String _selectedAspectRatio = '1:1';
  String _selectedQuality = '1024';
  String? _selectedStyle;
  String? _generatedImageUrl;
  String? _generatedGenerationId;
  bool _isLoadingImage = false;

  // Reference images (up to 3)
  List<String> _referenceImageUrls = [];
  List<File?> _referenceImageFiles = [null, null, null];
  List<bool> _isUploadingRef = [false, false, false];

  static const List<ToolItem> _tools = [
    ToolItem(
      id: 'generate',
      name: 'Generate',
      description: 'Create images from text prompts',
      icon: Icons.auto_awesome,
      credits: 4,
      isGenerate: true,
    ),
    ToolItem(
      id: 'relight',
      name: 'Relight',
      description: 'AI-powered relighting',
      icon: Icons.wb_sunny,
      credits: 2,
      route: '/create/image/relight',
    ),
    ToolItem(
      id: 'upscale',
      name: 'Upscale',
      description: 'Enhance resolution up to 4x',
      icon: Icons.hd,
      credits: 3,
      route: '/create/image/upscale',
    ),
    ToolItem(
      id: 'shots',
      name: 'Shots',
      description: '9 cinematic angles',
      icon: Icons.grid_view,
      credits: 10,
      route: '/create/image/shots',
    ),
    ToolItem(
      id: 'inpainting',
      name: 'Inpainting',
      description: 'Paint to replace areas',
      icon: Icons.brush,
      credits: 5,
      route: '/create/image/inpainting',
    ),
    ToolItem(
      id: 'object-erase',
      name: 'Erase',
      description: 'Remove unwanted objects',
      icon: Icons.auto_fix_high,
      credits: 4,
      route: '/create/image/object-erase',
    ),
    ToolItem(
      id: 'background-remove',
      name: 'Remove BG',
      description: 'Remove backgrounds',
      icon: Icons.content_cut,
      credits: 2,
      route: '/create/image/background-remove',
    ),
    ToolItem(
      id: 'style-transfer',
      name: 'Style',
      description: 'Apply artistic styles',
      icon: Icons.palette,
      credits: 4,
      route: '/create/image/style-transfer',
    ),
    ToolItem(
      id: 'skin-enhancer',
      name: 'Skin',
      description: 'Portrait retouching',
      icon: Icons.face,
      credits: 3,
      route: '/create/image/skin-enhancer',
    ),
    ToolItem(
      id: 'angle',
      name: 'Angle',
      description: 'View from new perspectives',
      icon: Icons.rotate_90_degrees_ccw,
      credits: 4,
      route: '/create/image/angle',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _selectedToolId = widget.initialTool ?? 'generate';
  }

  @override
  void dispose() {
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

  Future<void> _pickReferenceImage(int index) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 90,
      );

      if (image == null) return;

      final file = File(image.path);
      final fileSize = await file.length();

      if (fileSize > 10 * 1024 * 1024) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Image too large. Maximum size is 10MB.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      setState(() {
        _referenceImageFiles[index] = file;
      });

      await _uploadReferenceImage(file, index);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to pick image: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _uploadReferenceImage(File file, int index) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    setState(() => _isUploadingRef[index] = true);

    try {
      final fileExt = path.extension(file.path).replaceFirst('.', '');
      final fileName =
          '${user.id}/ref-${DateTime.now().millisecondsSinceEpoch}-$index.$fileExt';

      await _supabase.storage.from('generation-inputs').upload(fileName, file);
      final publicUrl =
          _supabase.storage.from('generation-inputs').getPublicUrl(fileName);

      setState(() {
        if (index < _referenceImageUrls.length) {
          _referenceImageUrls[index] = publicUrl;
        } else {
          _referenceImageUrls.add(publicUrl);
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Upload failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isUploadingRef[index] = false);
      }
    }
  }

  void _removeReferenceImage(int index) {
    setState(() {
      _referenceImageFiles[index] = null;
      if (index < _referenceImageUrls.length) {
        _referenceImageUrls.removeAt(index);
      }
    });
  }

  void _showReferenceDialog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Reference Images',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Add up to 3 reference images for style transfer and consistency.',
                style: TextStyle(color: AppTheme.muted, fontSize: 14),
              ),
              const SizedBox(height: 20),
              Row(
                children: List.generate(3, (index) {
                  final hasImage = index < _referenceImageUrls.length &&
                      _referenceImageUrls[index].isNotEmpty;
                  final isUploading = _isUploadingRef[index];

                  return Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(right: index < 2 ? 8 : 0),
                      child: GestureDetector(
                        onTap: isUploading
                            ? null
                            : () async {
                                await _pickReferenceImage(index);
                                setDialogState(() {});
                                setState(() {});
                              },
                        child: Container(
                          height: 100,
                          decoration: BoxDecoration(
                            color: AppTheme.secondary,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: index == 0 && hasImage
                                  ? AppTheme.primary
                                  : AppTheme.border,
                            ),
                          ),
                          child: isUploading
                              ? const Center(
                                  child: SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2),
                                  ),
                                )
                              : hasImage
                                  ? Stack(
                                      fit: StackFit.expand,
                                      children: [
                                        ClipRRect(
                                          borderRadius:
                                              BorderRadius.circular(11),
                                          child: SmartMediaImage(
                                            imageUrl:
                                                _referenceImageUrls[index],
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                        Positioned(
                                          top: 4,
                                          right: 4,
                                          child: GestureDetector(
                                            onTap: () {
                                              _removeReferenceImage(index);
                                              setDialogState(() {});
                                              setState(() {});
                                            },
                                            child: Container(
                                              padding: const EdgeInsets.all(4),
                                              decoration: BoxDecoration(
                                                color: Colors.black54,
                                                borderRadius:
                                                    BorderRadius.circular(12),
                                              ),
                                              child: const Icon(Icons.close,
                                                  size: 14,
                                                  color: Colors.white),
                                            ),
                                          ),
                                        ),
                                        if (index == 0)
                                          Positioned(
                                            top: 4,
                                            left: 4,
                                            child: Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 6,
                                                      vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AppTheme.primary,
                                                borderRadius:
                                                    BorderRadius.circular(6),
                                              ),
                                              child: const Text(
                                                'PRIMARY',
                                                style: TextStyle(
                                                    fontSize: 8,
                                                    fontWeight:
                                                        FontWeight.bold),
                                              ),
                                            ),
                                          ),
                                      ],
                                    )
                                  : Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.add_photo_alternate_outlined,
                                          color: AppTheme.muted,
                                          size: 28,
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          index == 0 ? 'Primary' : 'Optional',
                                          style: const TextStyle(
                                            color: AppTheme.muted,
                                            fontSize: 10,
                                          ),
                                        ),
                                      ],
                                    ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Done'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
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
      imageUrl:
          _referenceImageUrls.isNotEmpty ? _referenceImageUrls.first : null,
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
    final creditsProvider = context.read<CreditsProvider>();
    showAddCreditsDialog(
      context: context,
      currentCredits: creditsProvider.credits,
      requiredCredits: ImageModels.getCredits(_selectedModel),
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

  ToolItem get _selectedTool => _tools.firstWhere(
        (t) => t.id == _selectedToolId,
        orElse: () => _tools.first,
      );

  void _handleToolSelected(ToolItem tool) {
    setState(() => _selectedToolId = tool.id);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 48,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _selectedTool.name,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            Text(
              _selectedTool.description,
              style: TextStyle(fontSize: 11, color: AppTheme.muted),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.bolt, color: AppTheme.primary, size: 14),
                const SizedBox(width: 2),
                Text(
                  '${_selectedTool.credits}',
                  style: const TextStyle(
                    color: AppTheme.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: Column(
          children: [
            // Horizontal Tool Selector
            Padding(
              padding: const EdgeInsets.only(top: 8, bottom: 8),
              child: ToolSelector(
                tools: _tools,
                selectedToolId: _selectedToolId,
                onToolSelected: _handleToolSelected,
              ),
            ),
            const Divider(height: 1, color: AppTheme.border),
            // Content based on selected tool
            Expanded(child: _buildGenerateContent()),
          ],
        ),
      ),
    );
  }

  Widget _buildGenerateContent() {
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
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                        child: const Icon(Icons.auto_awesome,
                            color: AppTheme.primary, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _selectedModelName,
                              style:
                                  const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            Text(
                              '$_selectedModelCredits credits',
                              style: const TextStyle(
                                  color: AppTheme.muted, fontSize: 12),
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
                          final qualityData =
                              ImageModels.qualityOptions[quality];
                          final isSelected = quality == _selectedQuality;
                          return GestureDetector(
                            onTap: () =>
                                setState(() => _selectedQuality = quality),
                            child: Container(
                              padding:
                                  const EdgeInsets.symmetric(horizontal: 12),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppTheme.primary.withOpacity(0.2)
                                    : AppTheme.secondary,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSelected
                                      ? AppTheme.primary
                                      : AppTheme.border,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                qualityData?['name'] ?? quality,
                                style: TextStyle(
                                  color: isSelected
                                      ? AppTheme.primary
                                      : AppTheme.mutedForeground,
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
                            child: Text(ratio,
                                style: const TextStyle(fontSize: 12)),
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
                            color: isSelected
                                ? AppTheme.primary
                                : AppTheme.secondary,
                            borderRadius: BorderRadius.circular(18),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'None',
                            style: TextStyle(
                              color: isSelected
                                  ? Colors.white
                                  : AppTheme.mutedForeground,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      );
                    }

                    final style = ImageModels.stylePresets[index - 1];
                    final isSelected = _selectedStyle == style['id'];
                    return GestureDetector(
                      onTap: () => setState(
                          () => _selectedStyle = style['id'] as String),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppTheme.primary
                              : AppTheme.secondary,
                          borderRadius: BorderRadius.circular(18),
                        ),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              _getStyleIcon(style['icon'] as String),
                              size: 14,
                              color: isSelected
                                  ? Colors.white
                                  : AppTheme.mutedForeground,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              style['name'] as String,
                              style: TextStyle(
                                color: isSelected
                                    ? Colors.white
                                    : AppTheme.mutedForeground,
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

              // Prompt Input with Reference Image Button
              Row(
                children: [
                  // Reference Image Button
                  GestureDetector(
                    onTap: _showReferenceDialog,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _referenceImageUrls.isNotEmpty
                            ? AppTheme.primary.withOpacity(0.2)
                            : AppTheme.secondary,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: _referenceImageUrls.isNotEmpty
                              ? AppTheme.primary
                              : AppTheme.border,
                        ),
                      ),
                      child: _referenceImageUrls.isNotEmpty
                          ? Center(
                              child: Text(
                                '+${_referenceImageUrls.length}',
                                style: const TextStyle(
                                  color: AppTheme.primary,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                            )
                          : const Icon(Icons.add_photo_alternate_outlined,
                              color: AppTheme.muted, size: 20),
                    ),
                  ),
                  const SizedBox(width: 8),
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
}
