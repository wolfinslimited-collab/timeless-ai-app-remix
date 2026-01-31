import 'dart:io';
import 'package:flutter/material.dart';
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
import 'tools/relight_tool_screen.dart';
import 'tools/upscale_tool_screen.dart';
import 'tools/shots_tool_screen.dart' as tools_shots;
import 'tools/inpainting_tool_screen.dart';
import 'tools/object_erase_tool_screen.dart';
import 'tools/angle_tool_screen.dart';
import 'tools/skin_enhancer_tool_screen.dart';
import 'tools/style_transfer_tool_screen.dart';
import 'tools/background_remove_tool_screen.dart';

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
  List<String> _selectedStyles = []; // Multiple style selection
  String? _generatedImageUrl;
  bool _isWaitingForResult = false; // Track when waiting for API response
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
    final basePrompt = _promptController.text.trim();
    if (_selectedStyles.isEmpty) return basePrompt;

    // Collect all style prompts
    final stylePrompts = <String>[];
    for (final styleId in _selectedStyles) {
      final stylePreset = ImageModels.stylePresets.firstWhere(
        (s) => s['id'] == styleId,
        orElse: () => {},
      );
      final stylePrompt = stylePreset['prompt'] as String?;
      if (stylePrompt != null) {
        stylePrompts.add(stylePrompt);
      }
    }

    if (stylePrompts.isEmpty) return basePrompt;
    return basePrompt.isEmpty
        ? stylePrompts.join(', ')
        : '$basePrompt, ${stylePrompts.join(', ')}';
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
    if (_promptController.text.trim().isEmpty && _selectedStyles.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
            content: Text('Please enter a prompt or select a style')),
      );
      return;
    }

    final creditsProvider = context.read<CreditsProvider>();
    if (!creditsProvider.hasEnoughCreditsForModel(_selectedModel)) {
      _showAddCreditsDialog();
      return;
    }

    // Clear previous result and set waiting state
    setState(() {
      _generatedImageUrl = null;
      _generatedGenerationId = null;
      _isWaitingForResult = true;
    });

    final generationProvider = context.read<GenerationProvider>();

    try {
      // Use referenceImageUrls for image generation (correct API parameter name)
      final result = await generationProvider.generate(
        prompt: _finalPrompt,
        model: _selectedModel,
        type: 'image',
        aspectRatio: _selectedAspectRatio,
        quality: _selectedQuality,
        referenceImageUrls:
            _referenceImageUrls.isNotEmpty ? _referenceImageUrls : null,
        referenceImageUrl:
            _referenceImageUrls.isNotEmpty ? _referenceImageUrls.first : null,
      );

      // Check for errors from the provider
      if (generationProvider.error != null) {
        if (mounted) {
          setState(() => _isWaitingForResult = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(generationProvider.error!
                  .replaceAll('Exception:', '')
                  .trim()),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 4),
            ),
          );
          generationProvider.clearError();
        }
        return;
      }

      if (result != null && result.outputUrl != null) {
        // Show shimmer while image loads
        setState(() {
          _isLoadingImage = true;
          _isWaitingForResult = false;
          _generatedImageUrl = result.outputUrl;
          _generatedGenerationId = result.id;
        });

        // Short delay to show shimmer effect, image loads in background
        await Future.delayed(const Duration(milliseconds: 300));

        if (mounted) {
          setState(() {
            _isLoadingImage = false;
          });

          // Success feedback
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Image generated successfully!'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }

        creditsProvider.refresh();
      } else if (result == null) {
        // Generation returned null without setting an error - show generic message
        if (mounted) {
          setState(() => _isWaitingForResult = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Generation failed. Please try again.'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isWaitingForResult = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Error: ${e.toString().replaceAll('Exception:', '').trim()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 4),
          ),
        );
      }
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

  String _getAspectDescription(String ratio) {
    switch (ratio) {
      case '1:1':
        return 'Square, social posts';
      case '16:9':
        return 'Landscape, videos';
      case '9:16':
        return 'Portrait, stories';
      case '4:3':
        return 'Classic photo';
      case '3:4':
        return 'Portrait photo';
      case '21:9':
        return 'Ultra wide, cinematic';
      default:
        return '';
    }
  }

  void _showStylesSheet() {
    final maxHeight = MediaQuery.of(context).size.height * 0.75;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxHeight),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Fixed header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Style Presets',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        if (_selectedStyles.isNotEmpty)
                          TextButton(
                            onPressed: () {
                              setState(() => _selectedStyles.clear());
                              setSheetState(() {});
                            },
                            child: const Text('Clear All'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Combine multiple styles for unique results',
                      style: TextStyle(color: AppTheme.muted, fontSize: 13),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Scrollable style list
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Wrap(
                    spacing: 10,
                    runSpacing: 10,
                    children: ImageModels.stylePresets.map((style) {
                      final styleId = style['id'] as String;
                      final isSelected = _selectedStyles.contains(styleId);
                      return SizedBox(
                        width: (MediaQuery.of(ctx).size.width - 52) / 2,
                        height: 110,
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                if (isSelected) {
                                  _selectedStyles.remove(styleId);
                                } else {
                                  _selectedStyles.add(styleId);
                                }
                              });
                              setSheetState(() {});
                            },
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 14),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppTheme.primary.withOpacity(0.15)
                                    : AppTheme.secondary,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: isSelected
                                      ? AppTheme.primary
                                      : AppTheme.border,
                                  width: isSelected ? 1.5 : 1,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: isSelected
                                              ? AppTheme.primary
                                                  .withOpacity(0.2)
                                              : AppTheme.foreground
                                                  .withOpacity(0.06),
                                          borderRadius:
                                              BorderRadius.circular(10),
                                        ),
                                        child: Icon(
                                          _getStyleIcon(
                                              style['icon'] as String),
                                          size: 20,
                                          color: isSelected
                                              ? AppTheme.primary
                                              : AppTheme.muted,
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          style['name'] as String,
                                          style: TextStyle(
                                            color: isSelected
                                                ? AppTheme.primary
                                                : AppTheme.foreground,
                                            fontWeight: FontWeight.w600,
                                            fontSize: 14,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (isSelected)
                                        Icon(Icons.check_circle,
                                            size: 18, color: AppTheme.primary),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    style['description'] as String,
                                    style: const TextStyle(
                                      color: AppTheme.muted,
                                      fontSize: 11,
                                      height: 1.3,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              // Fixed bottom button
              Padding(
                padding: EdgeInsets.fromLTRB(
                    20, 16, 20, 16 + MediaQuery.of(ctx).padding.bottom),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: Text(_selectedStyles.isEmpty
                        ? 'Done'
                        : 'Apply ${_selectedStyles.length} Style${_selectedStyles.length > 1 ? 's' : ''}'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOptionPopup({
    required String label,
    required String value,
    required IconData icon,
    required List<_OptionItem> items,
    required Function(String) onSelected,
  }) {
    return PopupMenuButton<String>(
      onSelected: onSelected,
      offset: const Offset(0, -10),
      position: PopupMenuPosition.over,
      color: AppTheme.card,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      itemBuilder: (context) => items.map((item) {
        final isSelected = item.id == value;
        return PopupMenuItem<String>(
          value: item.id,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.name,
                        style: TextStyle(
                          fontWeight:
                              isSelected ? FontWeight.w600 : FontWeight.w500,
                          color: isSelected
                              ? AppTheme.primary
                              : AppTheme.foreground,
                        ),
                      ),
                      if (item.description.isNotEmpty)
                        Text(
                          item.description,
                          style: const TextStyle(
                            color: AppTheme.muted,
                            fontSize: 11,
                          ),
                        ),
                    ],
                  ),
                ),
                if (item.badge != null)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppTheme.primary.withOpacity(0.2)
                          : AppTheme.secondary,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      item.badge!,
                      style: TextStyle(
                        fontSize: 11,
                        color: isSelected ? AppTheme.primary : AppTheme.muted,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                // if (isSelected)
                //   Padding(
                //     padding: const EdgeInsets.only(left: 8),
                //     child: Icon(Icons.check, size: 16, color: AppTheme.primary),
                //   ),
              ],
            ),
          ),
        );
      }).toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: AppTheme.muted),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.expand_more, size: 14, color: AppTheme.muted),
          ],
        ),
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
    // Update selected tool and show corresponding content inline
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
            Expanded(child: _buildToolContent()),
          ],
        ),
      ),
    );
  }

  /// Build content based on selected tool.
  /// Tools with routes show the same widget as defined in routes.dart.
  Widget _buildToolContent() {
    switch (_selectedToolId) {
      case 'generate':
        return _buildGenerateContent();
      case 'relight':
        return const RelightToolScreen();
      case 'upscale':
        return const UpscaleToolScreen();
      case 'shots':
        return const tools_shots.ShotsToolScreen();
      case 'inpainting':
        return const InpaintingToolScreen();
      case 'object-erase':
        return const ObjectEraseToolScreen();
      case 'background-remove':
        return const BackgroundRemoveToolScreen();
      case 'style-transfer':
        return const StyleTransferToolScreen();
      case 'skin-enhancer':
        return const SkinEnhancerToolScreen();
      case 'angle':
        return const AngleToolScreen();
      default:
        return _buildGenerateContent();
    }
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
                // Show error state if generation failed
                if (provider.error != null &&
                    !provider.isGenerating &&
                    !_isWaitingForResult) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(50),
                            ),
                            child: const Icon(Icons.error_outline,
                                size: 48, color: Colors.red),
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'Generation Failed',
                            style: TextStyle(
                              color: Colors.red,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            provider.error!.replaceAll('Exception:', '').trim(),
                            style: const TextStyle(
                                color: AppTheme.muted, fontSize: 13),
                            textAlign: TextAlign.center,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 16),
                          TextButton.icon(
                            onPressed: () => provider.clearError(),
                            icon: const Icon(Icons.refresh, size: 18),
                            label: const Text('Try Again'),
                            style: TextButton.styleFrom(
                              foregroundColor: AppTheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                // Show shimmer while generating OR waiting for result
                if (provider.isGenerating || _isWaitingForResult) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Animated gradient ring
                        Stack(
                          alignment: Alignment.center,
                          children: [
                            SizedBox(
                              width: 60,
                              height: 60,
                              child: CircularProgressIndicator(
                                strokeWidth: 3,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  AppTheme.primary.withOpacity(0.3),
                                ),
                              ),
                            ),
                            const Icon(
                              Icons.auto_awesome,
                              color: AppTheme.primary,
                              size: 28,
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'Generating your image...',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'This may take 10-30 seconds',
                          style: TextStyle(
                            color: AppTheme.muted,
                            fontSize: 13,
                          ),
                        ),
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

              // Compact Options Row (Quality, Aspect Ratio, Styles toggle)
              Row(
                children: [
                  // Quality Popup
                  _buildOptionPopup(
                    label: ImageModels.qualityOptions[_selectedQuality]
                            ?['name'] ??
                        _selectedQuality,
                    value: _selectedQuality,
                    icon: Icons.high_quality_outlined,
                    items: _availableQualityOptions.map((q) {
                      final data = ImageModels.qualityOptions[q];
                      return _OptionItem(
                        id: q,
                        name: data?['name'] ?? q,
                        description: data?['description'] ?? '',
                        badge: q,
                      );
                    }).toList(),
                    onSelected: (id) => setState(() => _selectedQuality = id),
                  ),
                  const SizedBox(width: 8),
                  // Aspect Ratio Popup
                  _buildOptionPopup(
                    label: _selectedAspectRatio,
                    value: _selectedAspectRatio,
                    icon: Icons.aspect_ratio,
                    items: ImageModels.aspectRatios
                        .map((r) => _OptionItem(
                              id: r,
                              name: r,
                              description: _getAspectDescription(r),
                            ))
                        .toList(),
                    onSelected: (id) =>
                        setState(() => _selectedAspectRatio = id),
                  ),
                  const Spacer(),
                  // Styles toggle button
                  GestureDetector(
                    onTap: _showStylesSheet,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: _selectedStyles.isNotEmpty
                            ? AppTheme.primary.withOpacity(0.2)
                            : AppTheme.secondary,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _selectedStyles.isNotEmpty
                              ? AppTheme.primary
                              : AppTheme.border,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.style_outlined,
                            size: 16,
                            color: _selectedStyles.isNotEmpty
                                ? AppTheme.primary
                                : AppTheme.muted,
                          ),
                          if (_selectedStyles.isNotEmpty) ...[
                            const SizedBox(width: 4),
                            Text(
                              '${_selectedStyles.length}',
                              style: const TextStyle(
                                color: AppTheme.primary,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              // Selected styles chips (if any) - horizontal scroll, start from left
              // if (_selectedStyles.isNotEmpty)
              //   Padding(
              //     padding: const EdgeInsets.only(top: 12),
              //     child: SingleChildScrollView(
              //       scrollDirection: Axis.horizontal,
              //       clipBehavior: Clip.none,
              //       child: Row(
              //         mainAxisSize: MainAxisSize.min,
              //         mainAxisAlignment: MainAxisAlignment.start,
              //         children: _selectedStyles.map((styleId) {
              //           final style = ImageModels.stylePresets.firstWhere(
              //             (s) => s['id'] == styleId,
              //             orElse: () => {'name': styleId, 'icon': 'style'},
              //           );
              //           return Padding(
              //             padding: const EdgeInsets.only(right: 8),
              //             child: Container(
              //               padding: const EdgeInsets.symmetric(
              //                   horizontal: 8, vertical: 4),
              //               decoration: BoxDecoration(
              //                 color: AppTheme.primary.withOpacity(0.2),
              //                 borderRadius: BorderRadius.circular(12),
              //                 border: Border.all(
              //                     color: AppTheme.primary.withOpacity(0.3)),
              //               ),
              //               child: Row(
              //                 mainAxisSize: MainAxisSize.min,
              //                 children: [
              //                   Icon(
              //                     _getStyleIcon(style['icon'] as String),
              //                     size: 12,
              //                     color: AppTheme.primary,
              //                   ),
              //                   const SizedBox(width: 4),
              //                   Text(
              //                     style['name'] as String,
              //                     style: const TextStyle(
              //                       color: AppTheme.primary,
              //                       fontSize: 11,
              //                       fontWeight: FontWeight.w500,
              //                     ),
              //                   ),
              //                   const SizedBox(width: 4),
              //                   GestureDetector(
              //                     onTap: () => setState(
              //                         () => _selectedStyles.remove(styleId)),
              //                     child: const Icon(Icons.close,
              //                         size: 12, color: AppTheme.primary),
              //                   ),
              //                 ],
              //               ),
              //             ),
              //           );
              //         }).toList(),
              //       ),
              //     ),
              //   ),
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
                      final isGenerating =
                          provider.isGenerating || _isWaitingForResult;
                      return GestureDetector(
                        onTap: isGenerating ? null : _handleGenerate,
                        child: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: isGenerating
                                ? AppTheme.muted
                                : AppTheme.primary,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          child: isGenerating
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

/// Inline Image Tool Content Widget
class _InlineImageToolContent extends StatefulWidget {
  final String toolId;
  final String toolName;
  final String toolDescription;
  final int creditCost;
  final bool showPrompt;
  final bool showScale;
  final bool showIntensity;

  const _InlineImageToolContent({
    super.key,
    required this.toolId,
    required this.toolName,
    required this.toolDescription,
    required this.creditCost,
    this.showPrompt = false,
    this.showScale = false,
    this.showIntensity = false,
  });

  @override
  State<_InlineImageToolContent> createState() =>
      _InlineImageToolContentState();
}

class _InlineImageToolContentState extends State<_InlineImageToolContent> {
  final SupabaseClient _supabase = Supabase.instance.client;
  final ImagePicker _picker = ImagePicker();
  final TextEditingController _promptController = TextEditingController();

  String? _inputUrl;
  String? _outputUrl;
  bool _isUploading = false;
  bool _isProcessing = false;
  double _intensity = 50;
  int _scale = 2;

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 4096,
        maxHeight: 4096,
      );
      if (image == null) return;

      final file = File(image.path);
      final fileSize = await file.length();
      if (fileSize > 10 * 1024 * 1024) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('File too large. Max 10MB.'),
                backgroundColor: Colors.red),
          );
        }
        return;
      }

      setState(() {
        _isUploading = true;
        _outputUrl = null;
      });

      final user = _supabase.auth.currentUser;
      if (user == null) throw Exception('Not authenticated');

      final fileExt = path.extension(file.path).replaceFirst('.', '');
      final fileName =
          '${user.id}/${DateTime.now().millisecondsSinceEpoch}.$fileExt';
      await _supabase.storage.from('generation-inputs').upload(fileName, file);
      final publicUrl =
          _supabase.storage.from('generation-inputs').getPublicUrl(fileName);

      setState(() => _inputUrl = publicUrl);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  Future<void> _process() async {
    if (_inputUrl == null) return;

    final creditsProvider = context.read<CreditsProvider>();
    if (!creditsProvider.hasActiveSubscription &&
        creditsProvider.credits < widget.creditCost) {
      showAddCreditsDialog(
          context: context,
          currentCredits: creditsProvider.credits,
          requiredCredits: widget.creditCost);
      return;
    }

    setState(() {
      _isProcessing = true;
      _outputUrl = null;
    });

    try {
      final options = <String, dynamic>{};
      if (widget.showPrompt && _promptController.text.isNotEmpty)
        options['prompt'] = _promptController.text;
      if (widget.showIntensity) options['intensity'] = _intensity.round();
      if (widget.showScale) options['scale'] = _scale;

      final response = await _supabase.functions.invoke('image-tools', body: {
        'tool': widget.toolId,
        'imageUrl': _inputUrl,
        ...options,
      });

      final result = response.data as Map<String, dynamic>;
      if (result['outputUrl'] != null) {
        setState(() => _outputUrl = result['outputUrl'] as String);
        creditsProvider.refresh();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
                content: Text('${widget.toolName} completed!'),
                backgroundColor: AppTheme.primary),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Processing failed: $e'),
              backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tool Info
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child:
                      Icon(_getToolIcon(), color: AppTheme.primary, size: 24),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.toolName,
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(widget.toolDescription,
                          style: const TextStyle(
                              color: AppTheme.muted, fontSize: 13)),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(16)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.bolt, color: AppTheme.primary, size: 14),
                      const SizedBox(width: 4),
                      Text('${widget.creditCost}',
                          style: const TextStyle(
                              color: AppTheme.primary,
                              fontWeight: FontWeight.bold,
                              fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Upload Section
          GestureDetector(
            onTap: _pickImage,
            child: Container(
              height: 200,
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color:
                        _inputUrl != null ? AppTheme.primary : AppTheme.border),
              ),
              child: _isUploading
                  ? const Center(child: CircularProgressIndicator())
                  : _inputUrl != null
                      ? Stack(
                          fit: StackFit.expand,
                          children: [
                            ClipRRect(
                                borderRadius: BorderRadius.circular(15),
                                child: SmartMediaImage(
                                    imageUrl: _inputUrl!, fit: BoxFit.cover)),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: GestureDetector(
                                onTap: () => setState(() {
                                  _inputUrl = null;
                                  _outputUrl = null;
                                }),
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                      color: Colors.black54,
                                      borderRadius: BorderRadius.circular(12)),
                                  child: const Icon(Icons.close,
                                      size: 16, color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.add_photo_alternate_outlined,
                                size: 48, color: AppTheme.muted),
                            SizedBox(height: 12),
                            Text('Tap to upload image',
                                style: TextStyle(color: AppTheme.muted)),
                          ],
                        ),
            ),
          ),
          const SizedBox(height: 20),

          // Controls
          if (_inputUrl != null && _outputUrl == null) ...[
            if (widget.showPrompt) ...[
              const Text('Prompt',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                    color: AppTheme.secondary,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border)),
                child: TextField(
                  controller: _promptController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                      hintText: 'Describe what you want...',
                      hintStyle: TextStyle(color: AppTheme.muted),
                      contentPadding: EdgeInsets.all(12),
                      border: InputBorder.none),
                ),
              ),
              const SizedBox(height: 16),
            ],
            if (widget.showIntensity) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Intensity',
                      style: TextStyle(fontWeight: FontWeight.w600)),
                  Text('${_intensity.round()}%',
                      style: const TextStyle(color: AppTheme.primary))
                ],
              ),
              Slider(
                  value: _intensity,
                  min: 0,
                  max: 100,
                  activeColor: AppTheme.primary,
                  onChanged: (v) => setState(() => _intensity = v)),
              const SizedBox(height: 12),
            ],
            if (widget.showScale) ...[
              const Text('Scale',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Row(
                children: [2, 3, 4].map((s) {
                  final isSelected = _scale == s;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _scale = s),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppTheme.primary
                              : AppTheme.secondary,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: isSelected
                                  ? AppTheme.primary
                                  : AppTheme.border),
                        ),
                        child: Center(
                            child: Text('${s}x',
                                style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: isSelected
                                        ? Colors.white
                                        : AppTheme.mutedForeground))),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
            ],
          ],

          // Output
          if (_outputUrl != null) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Result',
                    style: TextStyle(fontWeight: FontWeight.w600)),
                GestureDetector(
                  onTap: () => setState(() {
                    _inputUrl = null;
                    _outputUrl = null;
                  }),
                  child: const Text('Reset',
                      style: TextStyle(color: AppTheme.primary, fontSize: 13)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              height: 250,
              width: double.infinity,
              decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.primary)),
              child: ClipRRect(
                  borderRadius: BorderRadius.circular(15),
                  child: SmartMediaImage(
                      imageUrl: _outputUrl!, fit: BoxFit.contain)),
            ),
            const SizedBox(height: 16),
          ],

          // Action Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isProcessing || _inputUrl == null ? null : _process,
              child: _isProcessing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const Icon(Icons.auto_awesome, size: 18),
                      const SizedBox(width: 8),
                      Text('Process (${widget.creditCost} credits)')
                    ]),
            ),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  IconData _getToolIcon() {
    switch (widget.toolId) {
      case 'relight':
        return Icons.wb_sunny;
      case 'upscale':
        return Icons.hd;
      case 'shots':
        return Icons.grid_view;
      case 'inpainting':
        return Icons.brush;
      case 'object-erase':
        return Icons.auto_fix_high;
      case 'background-remove':
        return Icons.content_cut;
      case 'style-transfer':
        return Icons.palette;
      case 'skin-enhancer':
        return Icons.face;
      case 'angle':
        return Icons.rotate_90_degrees_ccw;
      default:
        return Icons.auto_awesome;
    }
  }
}

/// Helper class for popup menu items
class _OptionItem {
  final String id;
  final String name;
  final String description;
  final String? badge;

  const _OptionItem({
    required this.id,
    required this.name,
    this.description = '',
    this.badge,
  });
}
