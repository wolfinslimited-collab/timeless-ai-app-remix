import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as path;
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';
import '../../providers/generation_provider.dart';
import '../../providers/credits_provider.dart';
import '../../widgets/add_credits_dialog.dart';
import '../../widgets/common/smart_media_image.dart';

class VisualStylesScreen extends StatefulWidget {
  const VisualStylesScreen({super.key});

  @override
  State<VisualStylesScreen> createState() => _VisualStylesScreenState();
}

class _VisualStylesScreenState extends State<VisualStylesScreen> {
  final _promptController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  final SupabaseClient _supabase = Supabase.instance.client;

  String _selectedAspectRatio = '1:1';
  String _selectedQuality = '1024';
  String _selectedCharacter = 'none';
  int _batchSize = 1;
  bool _unlimitedMode = false;
  List<String> _selectedStyles = [];
  String? _referenceImageUrl;
  File? _referenceImageFile;
  bool _isUploadingRef = false;
  List<String> _generatedImages = [];
  bool _isGenerating = false;

  static const List<Map<String, String>> _aspectRatios = [
    {'id': '1:1', 'label': '1:1', 'description': 'Square'},
    {'id': '16:9', 'label': '16:9', 'description': 'Landscape'},
    {'id': '9:16', 'label': '9:16', 'description': 'Portrait'},
    {'id': '4:3', 'label': '4:3', 'description': 'Classic'},
    {'id': '3:4', 'label': '3:4', 'description': 'Portrait'},
    {'id': '21:9', 'label': '21:9', 'description': 'Cinematic'},
  ];

  static const List<Map<String, dynamic>> _qualityOptions = [
    {'id': '1024', 'label': 'Standard', 'description': '1024px', 'credits': 4},
    {'id': '2K', 'label': 'High', 'description': '2048px', 'credits': 6},
    {'id': '4K', 'label': 'Ultra', 'description': '4096px', 'credits': 10},
  ];

  static const List<Map<String, String>> _stylePresets = [
    {'id': 'cinematic', 'name': 'Cinematic', 'prompt': 'cinematic lighting, film grain, dramatic shadows, movie still'},
    {'id': 'portrait', 'name': 'Portrait', 'prompt': 'professional portrait, soft lighting, shallow depth of field'},
    {'id': 'anime', 'name': 'Anime', 'prompt': 'anime style, cel shading, vibrant colors, Japanese animation'},
    {'id': 'cyberpunk', 'name': 'Cyberpunk', 'prompt': 'cyberpunk aesthetic, neon lights, futuristic, dystopian cityscape'},
    {'id': 'fantasy', 'name': 'Fantasy', 'prompt': 'fantasy art, magical atmosphere, ethereal lighting'},
    {'id': 'oil-painting', 'name': 'Oil Painting', 'prompt': 'oil painting style, visible brushstrokes, classical art technique'},
    {'id': 'watercolor', 'name': 'Watercolor', 'prompt': 'watercolor painting, soft edges, flowing colors'},
    {'id': 'minimalist', 'name': 'Minimalist', 'prompt': 'minimalist design, clean lines, simple composition'},
    {'id': 'vintage', 'name': 'Vintage', 'prompt': 'vintage photography, retro aesthetic, film grain, faded colors'},
    {'id': 'neon', 'name': 'Neon', 'prompt': 'neon glow, vibrant colors, dark background, synthwave'},
  ];

  static const List<int> _batchSizes = [1, 2, 4, 9];

  // Mock characters - in production, fetch from user's trained characters
  static const List<Map<String, String?>> _characters = [
    {'id': 'none', 'name': 'None', 'avatar': null},
    {'id': 'char-1', 'name': 'Character 1', 'avatar': 'https://api.dicebear.com/7.x/avataaars/svg?seed=1'},
    {'id': 'char-2', 'name': 'Character 2', 'avatar': 'https://api.dicebear.com/7.x/avataaars/svg?seed=2'},
  ];

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  int get _selectedQualityCredits {
    final quality = _qualityOptions.firstWhere(
      (q) => q['id'] == _selectedQuality,
      orElse: () => _qualityOptions.first,
    );
    return quality['credits'] as int;
  }

  int get _totalCredits => _selectedQualityCredits * _batchSize;

  String get _finalPrompt {
    final basePrompt = _promptController.text.trim();
    if (_selectedStyles.isEmpty) return basePrompt;

    final stylePrompts = _selectedStyles
        .map((id) => _stylePresets.firstWhere(
              (s) => s['id'] == id,
              orElse: () => {},
            )['prompt'])
        .where((p) => p != null)
        .join(', ');

    return basePrompt.isEmpty ? stylePrompts : '$basePrompt, $stylePrompts';
  }

  void _toggleStyle(String styleId) {
    setState(() {
      if (_selectedStyles.contains(styleId)) {
        _selectedStyles.remove(styleId);
      } else {
        _selectedStyles.add(styleId);
      }
    });
  }

  Future<void> _pickReferenceImage() async {
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

      setState(() => _referenceImageFile = file);
      await _uploadReferenceImage(file);
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

  Future<void> _uploadReferenceImage(File file) async {
    final user = _supabase.auth.currentUser;
    if (user == null) return;

    setState(() => _isUploadingRef = true);

    try {
      final fileExt = path.extension(file.path).replaceFirst('.', '');
      final fileName = '${user.id}/visual-styles-ref-${DateTime.now().millisecondsSinceEpoch}.$fileExt';

      await _supabase.storage.from('generation-inputs').upload(fileName, file);
      final publicUrl = _supabase.storage.from('generation-inputs').getPublicUrl(fileName);

      setState(() => _referenceImageUrl = publicUrl);
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
        setState(() => _isUploadingRef = false);
      }
    }
  }

  void _removeReferenceImage() {
    setState(() {
      _referenceImageFile = null;
      _referenceImageUrl = null;
    });
  }

  Future<void> _handleGenerate() async {
    FocusScope.of(context).unfocus();

    if (_finalPrompt.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a prompt or select a style')),
      );
      return;
    }

    final creditsProvider = context.read<CreditsProvider>();
    if ((creditsProvider.credits ?? 0) < _totalCredits) {
      _showAddCreditsDialog();
      return;
    }

    setState(() {
      _generatedImages = [];
      _isGenerating = true;
    });

    final generationProvider = context.read<GenerationProvider>();

    try {
      // Generate multiple images if batch size > 1
      final List<String> results = [];
      
      for (int i = 0; i < _batchSize; i++) {
        final result = await generationProvider.generate(
          prompt: _finalPrompt,
          model: 'nano-banana-pro',
          type: 'image',
          aspectRatio: _selectedAspectRatio,
          quality: _selectedQuality,
          referenceImageUrl: _referenceImageUrl,
          background: _unlimitedMode,
        );

        if (result?.outputUrl != null) {
          results.add(result!.outputUrl!);
        }
      }

      setState(() => _generatedImages = results);

      if (results.isNotEmpty && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${results.length} image${results.length > 1 ? 's' : ''} generated!'),
            backgroundColor: AppTheme.primary,
          ),
        );
        creditsProvider.refresh();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Generation failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGenerating = false);
      }
    }
  }

  void _showAddCreditsDialog() {
    final creditsProvider = context.read<CreditsProvider>();
    showAddCreditsDialog(
      context: context,
      currentCredits: creditsProvider.credits,
      requiredCredits: _totalCredits,
    );
  }

  void _showDropdownMenu({
    required String title,
    required List<Map<String, dynamic>> options,
    required String selectedId,
    required ValueChanged<String> onSelected,
    bool showCredits = false,
  }) {
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ...options.map((option) => ListTile(
              onTap: () {
                onSelected(option['id'] as String);
                Navigator.pop(context);
              },
              selected: selectedId == option['id'],
              selectedTileColor: AppTheme.primary.withOpacity(0.1),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              title: Text(
                option['label'] ?? option['name'] ?? option['id'],
                style: TextStyle(
                  fontWeight: selectedId == option['id'] ? FontWeight.bold : FontWeight.normal,
                ),
              ),
              subtitle: option['description'] != null
                  ? Text(option['description'], style: const TextStyle(color: AppTheme.muted))
                  : null,
              trailing: showCredits && option['credits'] != null
                  ? Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${option['credits']} credits',
                        style: const TextStyle(
                          color: AppTheme.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    )
                  : null,
            )),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => context.pop(),
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: const Icon(Icons.arrow_back, size: 18),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text(
                              'Visual Styles',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primary,
                                borderRadius: BorderRadius.circular(6),
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
                        ),
                        const Text(
                          'Ultra-realistic fashion visuals with AI styling',
                          style: TextStyle(color: AppTheme.muted, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.flash_on, size: 14, color: AppTheme.primary),
                        const SizedBox(width: 4),
                        Text(
                          '$_totalCredits',
                          style: const TextStyle(
                            color: AppTheme.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Preview Area
                    _buildPreviewArea(),
                    const SizedBox(height: 20),

                    // Configuration Grid
                    _buildConfigurationGrid(),
                    const SizedBox(height: 20),

                    // Reference Image
                    _buildReferenceImageSection(),
                    const SizedBox(height: 20),

                    // Style Presets
                    _buildStylePresetsSection(),
                    const SizedBox(height: 20),

                    // Unlimited Mode Toggle
                    _buildUnlimitedModeToggle(),
                    const SizedBox(height: 100), // Space for bottom input
                  ],
                ),
              ),
            ),

            // Bottom Controls
            _buildBottomControls(),
          ],
        ),
      ),
    );
  }

  Widget _buildPreviewArea() {
    double aspectRatioValue = 1.0;
    switch (_selectedAspectRatio) {
      case '16:9':
        aspectRatioValue = 16 / 9;
        break;
      case '9:16':
        aspectRatioValue = 9 / 16;
        break;
      case '4:3':
        aspectRatioValue = 4 / 3;
        break;
      case '3:4':
        aspectRatioValue = 3 / 4;
        break;
      case '21:9':
        aspectRatioValue = 21 / 9;
        break;
    }

    return AspectRatio(
      aspectRatio: aspectRatioValue.clamp(0.5, 2.5),
      child: Container(
        constraints: const BoxConstraints(maxHeight: 300),
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.border),
        ),
        child: _isGenerating
            ? Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 12),
                  Text(
                    'Generating $_batchSize image${_batchSize > 1 ? 's' : ''}...',
                    style: const TextStyle(color: AppTheme.muted),
                  ),
                ],
              )
            : _generatedImages.isNotEmpty
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(19),
                    child: GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: _generatedImages.length == 1 ? 1 : (_generatedImages.length <= 4 ? 2 : 3),
                        mainAxisSpacing: 2,
                        crossAxisSpacing: 2,
                      ),
                      itemCount: _generatedImages.length,
                      itemBuilder: (context, index) => SmartMediaImage(
                        imageUrl: _generatedImages[index],
                        fit: BoxFit.cover,
                      ),
                    ),
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.palette_outlined, size: 48, color: AppTheme.muted),
                      SizedBox(height: 12),
                      Text(
                        'Your styled images will appear here',
                        style: TextStyle(color: AppTheme.muted, fontSize: 14),
                      ),
                    ],
                  ),
      ),
    );
  }

  Widget _buildConfigurationGrid() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 2.2,
      children: [
        _buildDropdownButton(
          label: 'Aspect Ratio',
          value: _selectedAspectRatio,
          onTap: () => _showDropdownMenu(
            title: 'Aspect Ratio',
            options: _aspectRatios.map((r) => {...r, 'id': r['id']!, 'label': r['label']!, 'description': r['description']}).toList(),
            selectedId: _selectedAspectRatio,
            onSelected: (id) => setState(() => _selectedAspectRatio = id),
          ),
        ),
        _buildDropdownButton(
          label: 'Quality',
          value: _qualityOptions.firstWhere((q) => q['id'] == _selectedQuality)['label'] as String,
          onTap: () => _showDropdownMenu(
            title: 'Quality',
            options: _qualityOptions,
            selectedId: _selectedQuality,
            onSelected: (id) => setState(() => _selectedQuality = id),
            showCredits: true,
          ),
        ),
        _buildDropdownButton(
          label: 'Character',
          value: _characters.firstWhere((c) => c['id'] == _selectedCharacter)['name'] ?? 'None',
          onTap: () => _showDropdownMenu(
            title: 'Character',
            options: _characters.map((c) => {'id': c['id']!, 'name': c['name']!}).toList(),
            selectedId: _selectedCharacter,
            onSelected: (id) => setState(() => _selectedCharacter = id),
          ),
        ),
        _buildDropdownButton(
          label: 'Batch Size',
          value: '$_batchSize image${_batchSize > 1 ? 's' : ''}',
          onTap: () => _showDropdownMenu(
            title: 'Batch Size',
            options: _batchSizes.map((s) => {'id': '$s', 'label': '$s image${s > 1 ? 's' : ''}'}).toList(),
            selectedId: '$_batchSize',
            onSelected: (id) => setState(() => _batchSize = int.parse(id)),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdownButton({
    required String label,
    required String value,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label.toUpperCase(),
                    style: const TextStyle(
                      color: AppTheme.muted,
                      fontSize: 9,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const Icon(Icons.keyboard_arrow_down, size: 18, color: AppTheme.muted),
          ],
        ),
      ),
    );
  }

  Widget _buildReferenceImageSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'REFERENCE IMAGE',
          style: TextStyle(
            color: AppTheme.muted,
            fontSize: 10,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _referenceImageUrl != null
                ? Stack(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(15),
                          child: SmartMediaImage(
                            imageUrl: _referenceImageUrl!,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                      Positioned(
                        top: 4,
                        right: 4,
                        child: GestureDetector(
                          onTap: _removeReferenceImage,
                          child: Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.close, size: 12, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  )
                : GestureDetector(
                    onTap: _isUploadingRef ? null : _pickReferenceImage,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.border, style: BorderStyle.solid),
                      ),
                      child: _isUploadingRef
                          ? const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)))
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: const [
                                Icon(Icons.upload_outlined, size: 24, color: AppTheme.muted),
                                SizedBox(height: 4),
                                Text('Upload', style: TextStyle(color: AppTheme.muted, fontSize: 10)),
                              ],
                            ),
                    ),
                  ),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Optional: Add a reference image for style consistency',
                style: TextStyle(color: AppTheme.muted, fontSize: 12),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStylePresetsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'STYLE PRESETS',
          style: TextStyle(
            color: AppTheme.muted,
            fontSize: 10,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _stylePresets.map((style) {
            final isSelected = _selectedStyles.contains(style['id']);
            return GestureDetector(
              onTap: () => _toggleStyle(style['id']!),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? AppTheme.primary : AppTheme.secondary,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? AppTheme.primary : AppTheme.border,
                  ),
                ),
                child: Text(
                  style['name']!,
                  style: TextStyle(
                    color: isSelected ? Colors.white : AppTheme.foreground,
                    fontWeight: FontWeight.w500,
                    fontSize: 12,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildUnlimitedModeToggle() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.all_inclusive, color: AppTheme.primary, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Text(
                  'Unlimited Mode',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                ),
                Text(
                  'Relax queue for unlimited runs (slower)',
                  style: TextStyle(color: AppTheme.muted, fontSize: 10),
                ),
              ],
            ),
          ),
          Switch(
            value: _unlimitedMode,
            onChanged: (value) => setState(() => _unlimitedMode = value),
            activeColor: AppTheme.primary,
          ),
        ],
      ),
    );
  }

  Widget _buildBottomControls() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppTheme.border)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: AppTheme.border),
              ),
              child: TextField(
                controller: _promptController,
                enabled: !_isGenerating,
                style: const TextStyle(fontSize: 14),
                decoration: const InputDecoration(
                  hintText: 'Describe your visual style...',
                  hintStyle: TextStyle(color: AppTheme.muted),
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(vertical: 10),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: _isGenerating || (_promptController.text.trim().isEmpty && _selectedStyles.isEmpty)
                ? null
                : _handleGenerate,
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: _isGenerating || (_promptController.text.trim().isEmpty && _selectedStyles.isEmpty)
                    ? AppTheme.primary.withOpacity(0.5)
                    : AppTheme.primary,
                borderRadius: BorderRadius.circular(24),
              ),
              child: _isGenerating
                  ? const Center(
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      ),
                    )
                  : const Icon(Icons.auto_awesome, color: Colors.white, size: 24),
            ),
          ),
        ],
      ),
    );
  }
}
