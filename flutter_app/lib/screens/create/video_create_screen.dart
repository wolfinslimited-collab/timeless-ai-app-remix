import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';
import '../../core/video_models.dart';
import '../../providers/generation_provider.dart';
import '../../providers/credits_provider.dart';
import '../../providers/download_provider.dart';
import '../../models/download_model.dart';
import '../../widgets/report_content_dialog.dart';
import '../../models/generation_model.dart';
import '../../widgets/common/smart_media_image.dart';
import '../../widgets/add_credits_dialog.dart';
import '../../widgets/tool_selector.dart';
import 'video_model_selector.dart';
import 'tools/video_upscale_tool_screen.dart';
import 'tools/lip_sync_tool_screen.dart';
import 'tools/interpolate_tool_screen.dart';
import 'tools/extend_video_tool_screen.dart';
import 'tools/sketch_to_video_tool_screen.dart';
import 'tools/draw_to_video_tool_screen.dart';
import 'tools/mixed_media_tool_screen.dart';
import 'tools/click_to_ad_tool_screen.dart';
import 'tools/ugc_factory_tool_screen.dart';
import 'tools/sora_trends_tool_screen.dart';
import 'tools/ai_editor_tool_screen.dart';

// Video tools with ToolItem format
const List<ToolItem> videoToolItems = [
  ToolItem(
    id: 'generate',
    name: 'Generate',
    description: 'Create videos from text prompts',
    icon: Icons.play_circle_outline,
    credits: 15,
    isGenerate: true,
  ),
  ToolItem(
    id: 'mixed-media',
    name: 'Mixed',
    description: 'Create mixed media projects',
    icon: Icons.auto_awesome_mosaic,
    credits: 15,
    route: '/create/video/mixed-media',
    badge: 'NEW',
  ),
  ToolItem(
    id: 'click-to-ad',
    name: 'Ad',
    description: 'Product URLs to video ads',
    icon: Icons.ads_click,
    credits: 20,
    route: '/create/video/click-to-ad',
  ),
  ToolItem(
    id: 'sora-trends',
    name: 'Trends',
    description: 'Turn ideas into viral videos',
    icon: Icons.trending_up,
    credits: 25,
    route: '/create/video/sora-trends',
  ),
  ToolItem(
    id: 'lip-sync',
    name: 'Lipsync',
    description: 'Create talking clips',
    icon: Icons.record_voice_over,
    credits: 15,
    route: '/create/video/lip-sync',
  ),
  ToolItem(
    id: 'draw-to-video',
    name: 'Draw',
    description: 'Sketch to cinematic video',
    icon: Icons.brush,
    credits: 18,
    route: '/create/video/draw-to-video',
  ),
  ToolItem(
    id: 'video-upscale',
    name: 'Upscale',
    description: 'Enhance video quality',
    icon: Icons.hd,
    credits: 8,
    route: '/create/video/video-upscale',
  ),
  ToolItem(
    id: 'extend',
    name: 'Extend',
    description: 'Extend video length',
    icon: Icons.add_circle_outline,
    credits: 12,
    route: '/create/video/extend',
  ),
  ToolItem(
    id: 'interpolate',
    name: 'Smooth',
    description: 'Smooth frame rate',
    icon: Icons.animation,
    credits: 6,
    route: '/create/video/interpolate',
  ),
  ToolItem(
    id: 'ai-editor',
    name: 'AI Editor',
    description: 'AI-powered video editing',
    icon: Icons.auto_awesome,
    credits: 12,
    route: '/create/video/ai-editor',
    badge: 'NEW',
  ),
];

// Video Templates
const List<Map<String, String>> videoTemplates = [
  {
    'label': 'Cinematic',
    'prompt':
        'A cinematic wide shot of a beautiful sunset over mountains, golden hour, 4K quality'
  },
  {
    'label': 'Action',
    'prompt':
        'Dynamic action shot with dramatic lighting, fast-paced, professional cinematography'
  },
  {
    'label': 'Nature',
    'prompt':
        'Peaceful nature scene with flowing water and lush greenery, National Geographic style'
  },
  {
    'label': 'Urban',
    'prompt':
        'Modern city skyline at night with neon lights reflecting, cyberpunk aesthetic'
  },
  {
    'label': 'Abstract',
    'prompt':
        'Mesmerizing abstract patterns morphing and flowing, vibrant colors, artistic'
  },
  {
    'label': 'Portrait',
    'prompt':
        'Elegant portrait with cinematic bokeh background, professional lighting'
  },
];

class VideoCreateScreen extends StatefulWidget {
  final String? initialTool;
  
  const VideoCreateScreen({super.key, this.initialTool});

  @override
  State<VideoCreateScreen> createState() => _VideoCreateScreenState();
}

// Helper class for option items with descriptions
class _VideoOptionItem {
  final String id;
  final String name;
  final String description;
  final String? badge;
  
  const _VideoOptionItem({
    required this.id,
    required this.name,
    this.description = '',
    this.badge,
  });
}

class _VideoCreateScreenState extends State<VideoCreateScreen> {
  late String _selectedToolId;
  
  final _promptController = TextEditingController();
  String _selectedModel = 'wan-2.6';
  String _selectedAspectRatio = '16:9';
  String _selectedQuality = '1080p';
  int _selectedDuration = 5;
  bool _soundEnabled = true;
  String? _startingImageUrl;
  String? _endingImageUrl;
  bool _isUploadingStart = false;
  bool _isUploadingEnd = false;
  String? _generatedVideoUrl;
  String? _generationError;
  bool _isWaitingForResult = false;
  VideoPlayerController? _videoController;

  @override
  void initState() {
    super.initState();
    _selectedToolId = widget.initialTool ?? 'generate';
  }

  @override
  void dispose() {
    _promptController.dispose();
    _videoController?.dispose();
    super.dispose();
  }

  int get _selectedModelCredits {
    return VideoModels.getCredits(_selectedModel);
  }

  String get _selectedModelName {
    final model = VideoModels.allModels.firstWhere(
      (m) => m['id'] == _selectedModel,
      orElse: () => {'name': 'Wan 2.6'},
    );
    return model['name'] as String;
  }

  Future<void> _pickStartImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image == null) return;

    setState(() => _isUploadingStart = true);
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('Not authenticated');

      final file = File(image.path);
      final bytes = await file.readAsBytes();
      final fileName =
          '${session.user.id}/${DateTime.now().millisecondsSinceEpoch}-start-${image.name}';

      await Supabase.instance.client.storage
          .from('generation-inputs')
          .uploadBinary(fileName, bytes);

      final publicUrl = Supabase.instance.client.storage
          .from('generation-inputs')
          .getPublicUrl(fileName);

      setState(() => _startingImageUrl = publicUrl);
      _showSnackBar('Start frame uploaded');
    } catch (e) {
      _showSnackBar('Failed to upload image');
    } finally {
      setState(() => _isUploadingStart = false);
    }
  }

  Future<void> _pickEndImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image == null) return;

    setState(() => _isUploadingEnd = true);
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('Not authenticated');

      final file = File(image.path);
      final bytes = await file.readAsBytes();
      final fileName =
          '${session.user.id}/${DateTime.now().millisecondsSinceEpoch}-end-${image.name}';

      await Supabase.instance.client.storage
          .from('generation-inputs')
          .uploadBinary(fileName, bytes);

      final publicUrl = Supabase.instance.client.storage
          .from('generation-inputs')
          .getPublicUrl(fileName);

      setState(() => _endingImageUrl = publicUrl);
      _showSnackBar('End frame uploaded');
    } catch (e) {
      _showSnackBar('Failed to upload image');
    } finally {
      setState(() => _isUploadingEnd = false);
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  Future<void> _handleGenerate() async {
    if (_promptController.text.trim().isEmpty) {
      _showSnackBar('Please enter a prompt');
      return;
    }

    final creditsProvider = context.read<CreditsProvider>();
    if (!creditsProvider.hasActiveSubscription &&
        creditsProvider.credits < _selectedModelCredits) {
      _showAddCreditsDialog();
      return;
    }

    // Start waiting state immediately
    setState(() {
      _isWaitingForResult = true;
      _generationError = null;
      _generatedVideoUrl = null;
      _videoController?.dispose();
      _videoController = null;
    });

    final generationProvider = context.read<GenerationProvider>();

    try {
      final result = await generationProvider.generate(
        prompt: _promptController.text.trim(),
        model: _selectedModel,
        type: 'video',
        aspectRatio: _selectedAspectRatio,
        quality: _selectedQuality,
        background: true,
      );

      if (result != null) {
        creditsProvider.refresh();
        _pollForCompletion(result.id);
      } else {
        setState(() {
          _isWaitingForResult = false;
          _generationError = generationProvider.error ?? 'Failed to start video generation';
        });
      }
    } catch (e) {
      setState(() {
        _isWaitingForResult = false;
        _generationError = e.toString();
      });
    }
  }

  Future<void> _pollForCompletion(String generationId) async {
    const maxAttempts = 60; // 5 minutes max (60 attempts * 5 seconds)
    var attempts = 0;

    debugPrint('🎬 Starting poll for generation: $generationId');

    Future<void> poll() async {
      if (!mounted) return;

      try {
        final provider = context.read<GenerationProvider>();
        await provider.loadGenerations();

        // First try to find by ID
        var generation = provider.generations.where((g) => g.id == generationId).firstOrNull;
        
        // If not found by ID, try to find by taskId (fallback)
        generation ??= provider.generations.where((g) => g.taskId == generationId).firstOrNull;
        
        // Also check for the most recent pending video if nothing found
        generation ??= provider.generations
            .where((g) => g.type == GenerationType.video && g.isPending)
            .firstOrNull;

        debugPrint('🎬 Poll attempt ${attempts + 1}: found=${generation != null}, status=${generation?.status}, id=${generation?.id}');

        if (generation?.isCompleted == true && generation?.outputUrl != null) {
          debugPrint('🎬 Generation completed! URL: ${generation!.outputUrl}');
          setState(() {
            _generatedVideoUrl = generation!.outputUrl;
            _isWaitingForResult = false;
            _generationError = null;
          });
          _initializeVideoPlayer(generation.outputUrl!);

          if (mounted) {
            _showSnackBar('🎉 Video ready!');
          }
          return;
        }

        if (generation?.isFailed == true) {
          debugPrint('🎬 Generation failed');
          setState(() {
            _isWaitingForResult = false;
            _generationError = 'Video generation failed. Please try again.';
          });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          await Future.delayed(const Duration(seconds: 5));
          await poll();
        } else {
          // Timeout
          debugPrint('🎬 Generation timed out after $attempts attempts');
          setState(() {
            _isWaitingForResult = false;
            _generationError = 'Generation timed out. Check your library for the result.';
          });
        }
      } catch (e) {
        debugPrint('🎬 Poll error: $e');
        attempts++;
        if (attempts < maxAttempts) {
          await Future.delayed(const Duration(seconds: 5));
          await poll();
        } else {
          setState(() {
            _isWaitingForResult = false;
            _generationError = 'Error checking generation status: $e';
          });
        }
      }
    }

    // Initial delay before first poll
    await Future.delayed(const Duration(seconds: 5));
    await poll();
  }

  Future<void> _initializeVideoPlayer(String url) async {
    _videoController?.dispose();
    _videoController = VideoPlayerController.networkUrl(Uri.parse(url));
    await _videoController!.initialize();
    _videoController!.setLooping(true);
    _videoController!.play();
    setState(() {});
  }

  Future<void> _saveGeneratedVideo() async {
    if (_generatedVideoUrl == null) return;

    try {
      final downloadProvider = context.read<DownloadProvider>();

      await downloadProvider.downloadFile(
        url: _generatedVideoUrl!,
        title: _promptController.text.isNotEmpty
            ? _promptController.text
            : 'Generated Video',
        type: DownloadType.video,
        metadata: {
          'model': _selectedModel,
          'prompt': _promptController.text,
        },
      );

      if (mounted) {
        _showSnackBar('Saved to Downloads & Gallery');
      }
    } catch (e) {
      if (mounted) {
        _showSnackBar('Save failed: $e');
      }
    }
  }

  Future<void> _shareGeneratedVideo() async {
    if (_generatedVideoUrl == null) return;

    try {
      final response = await http.get(Uri.parse(_generatedVideoUrl!));
      final tempDir = await getTemporaryDirectory();
      final fileName = 'video-${DateTime.now().millisecondsSinceEpoch}.mp4';
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(response.bodyBytes);

      await Share.shareXFiles([XFile(file.path)],
          text: 'Created with Timeless AI');
    } catch (e) {
      if (mounted) {
        _showSnackBar('Share failed: $e');
      }
    }
  }

  Widget _buildVideoActionButton(
      IconData icon, String label, VoidCallback onTap,
      {bool isPrimary = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isPrimary ? AppTheme.primary : AppTheme.card,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: Colors.white),
            const SizedBox(width: 6),
            Text(label,
                style: const TextStyle(fontSize: 12, color: Colors.white)),
          ],
        ),
      ),
    );
  }

  void _showAddCreditsDialog() {
    final creditsProvider = context.read<CreditsProvider>();
    showAddCreditsDialog(
      context: context,
      currentCredits: creditsProvider.credits,
      requiredCredits: _selectedModelCredits,
    );
  }

  void _showModelSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.background,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => VideoModelSelector(
        selectedModel: _selectedModel,
        models: VideoModels.allModels,
        onSelect: (modelId) {
          setState(() => _selectedModel = modelId);
          Navigator.pop(context);
        },
      ),
    );
  }

  void _showDurationSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Duration',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              children: VideoModels.durations.map((d) {
                final isSelected = _selectedDuration == d;
                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _selectedDuration = d);
                      Navigator.pop(context);
                    },
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color:
                            isSelected ? AppTheme.primary : AppTheme.secondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color:
                              isSelected ? AppTheme.primary : AppTheme.border,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          '${d}s',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: isSelected
                                ? Colors.white
                                : AppTheme.mutedForeground,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showAspectRatioSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Aspect Ratio',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: VideoModels.aspectRatios.map((ratio) {
                final isSelected = _selectedAspectRatio == ratio;
                return GestureDetector(
                  onTap: () {
                    setState(() => _selectedAspectRatio = ratio);
                    Navigator.pop(context);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primary : AppTheme.secondary,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? AppTheme.primary : AppTheme.border,
                      ),
                    ),
                    child: Text(
                      ratio,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: isSelected
                            ? Colors.white
                            : AppTheme.mutedForeground,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showQualitySelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Quality',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              children: VideoModels.qualities.map((q) {
                final isSelected = _selectedQuality == q;
                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() => _selectedQuality = q);
                      Navigator.pop(context);
                    },
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 4),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color:
                            isSelected ? AppTheme.primary : AppTheme.secondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color:
                              isSelected ? AppTheme.primary : AppTheme.border,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          q,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: isSelected
                                ? Colors.white
                                : AppTheme.mutedForeground,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  void _showTemplatesSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Templates',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ...videoTemplates.map((template) => GestureDetector(
                  onTap: () {
                    _promptController.text = template['prompt']!;
                    Navigator.pop(context);
                  },
                  child: Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.secondary,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          template['label']!,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          template['prompt']!,
                          style: const TextStyle(
                              fontSize: 12, color: AppTheme.muted),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                )),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  ToolItem get _selectedTool => videoToolItems.firstWhere(
        (t) => t.id == _selectedToolId,
        orElse: () => videoToolItems.first,
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
                  '${_selectedModelCredits}',
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
                tools: videoToolItems,
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
        return _buildCreateContent();
      case 'mixed-media':
        return const MixedMediaToolScreen();
      case 'click-to-ad':
        return const ClickToAdToolScreen();
      case 'sora-trends':
        return const SoraTrendsToolScreen();
      case 'lip-sync':
        return const LipSyncToolScreen();
      case 'draw-to-video':
        return const DrawToVideoToolScreen();
      case 'video-upscale':
        return const VideoUpscaleToolScreen();
      case 'extend':
        return const ExtendVideoToolScreen();
      case 'interpolate':
        return const InterpolateToolScreen();
      case 'sketch-to-video':
        return const SketchToVideoToolScreen();
      case 'ugc-factory':
        return const UGCFactoryToolScreen();
      case 'ai-editor':
        return const AIEditorToolScreen();
      default:
        return _buildCreateContent();
    }
  }

  Widget _buildCreateContent() {
    final provider = context.watch<GenerationProvider>();
    final isGenerating = provider.isGenerating || _isWaitingForResult;
    
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
            child: _buildPreviewContent(isGenerating),
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
              // Start/End Frame Pickers
              Row(
                children: [
                  // Start Frame
                  Expanded(
                    child: _buildFramePicker(
                      label: 'Start Frame',
                      imageUrl: _startingImageUrl,
                      isUploading: _isUploadingStart,
                      onPick: _pickStartImage,
                      onClear: () => setState(() => _startingImageUrl = null),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // End Frame
                  Expanded(
                    child: _buildFramePicker(
                      label: 'End Frame',
                      imageUrl: _endingImageUrl,
                      isUploading: _isUploadingEnd,
                      onPick: _pickEndImage,
                      onClear: () => setState(() => _endingImageUrl = null),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Compact Options Row with Popups
              Row(
                children: [
                  _buildOptionPopup(
                    label: 'Templates',
                    value: 'Templates',
                    icon: Icons.dashboard_outlined,
                    items: videoTemplates.map((t) => _VideoOptionItem(
                      id: t['prompt']!,
                      name: t['label']!,
                      description: t['prompt']!,
                    )).toList(),
                    onSelected: (prompt) {
                      _promptController.text = prompt;
                    },
                    showValue: false,
                  ),
                  const SizedBox(width: 6),
                  _buildOptionPopup(
                    label: 'Duration',
                    value: '${_selectedDuration}s',
                    icon: Icons.timer_outlined,
                    items: _getDurationOptions(),
                    onSelected: (val) {
                      setState(() => _selectedDuration = int.parse(val.replaceAll('s', '')));
                    },
                  ),
                  const SizedBox(width: 6),
                  _buildOptionPopup(
                    label: 'Ratio',
                    value: _selectedAspectRatio,
                    icon: Icons.aspect_ratio,
                    items: _getAspectRatioOptions(),
                    onSelected: (val) {
                      setState(() => _selectedAspectRatio = val);
                    },
                  ),
                  const SizedBox(width: 6),
                  _buildOptionPopup(
                    label: 'Quality',
                    value: _selectedQuality,
                    icon: Icons.high_quality,
                    items: _getQualityOptions(),
                    onSelected: (val) {
                      setState(() => _selectedQuality = val);
                    },
                  ),
                  const SizedBox(width: 6),
                  _buildSoundToggle(),
                ],
              ),
              const SizedBox(height: 12),

              // Full-width Prompt Input
              Container(
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border),
                ),
                child: TextField(
                  controller: _promptController,
                  maxLines: 3,
                  minLines: 2,
                  decoration: const InputDecoration(
                    hintText: 'Describe your video in detail...',
                    hintStyle: TextStyle(color: AppTheme.muted),
                    contentPadding: EdgeInsets.all(16),
                    border: InputBorder.none,
                  ),
                  style: const TextStyle(fontSize: 15),
                ),
              ),
              const SizedBox(height: 12),

              // Bottom row with Model + Generate
              Row(
                children: [
                  // Model selector button
                  GestureDetector(
                    onTap: _showModelSelector,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.bolt,
                              size: 18, color: AppTheme.primary),
                          const SizedBox(width: 6),
                          Text(
                            _selectedModelName.length > 12
                                ? '${_selectedModelName.substring(0, 12)}...'
                                : _selectedModelName,
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.keyboard_arrow_down,
                              size: 18, color: AppTheme.muted),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Generate button - uses local isWaitingForResult state
                  Expanded(
                    child: Builder(
                      builder: (context) {
                        final provider = context.watch<GenerationProvider>();
                        final isGenerating = provider.isGenerating || _isWaitingForResult;
                        
                        return GestureDetector(
                          onTap: isGenerating ? null : _handleGenerate,
                          child: Opacity(
                            opacity: isGenerating ? 0.7 : 1.0,
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: isGenerating
                                      ? [AppTheme.muted, AppTheme.muted]
                                      : [AppTheme.primary, AppTheme.accent],
                                ),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  if (isGenerating)
                                    const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  else
                                    const Icon(Icons.auto_awesome,
                                        size: 18, color: Colors.white),
                                  const SizedBox(width: 8),
                                  Text(
                                    isGenerating
                                        ? 'Generating...'
                                        : 'Generate',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (!isGenerating) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withOpacity(0.2),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        '$_selectedModelCredits',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPreviewContent(bool isGenerating) {
    // Show loading state
    if (isGenerating) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 80,
                  height: 80,
                  child: CircularProgressIndicator(
                    strokeWidth: 4,
                    color: AppTheme.primary.withOpacity(0.3),
                  ),
                ),
                SizedBox(
                  width: 80,
                  height: 80,
                  child: CircularProgressIndicator(
                    strokeWidth: 4,
                    color: AppTheme.primary,
                    value: null,
                  ),
                ),
                const Icon(Icons.auto_awesome, size: 32, color: AppTheme.primary),
              ],
            ),
            const SizedBox(height: 20),
            const Text(
              'Generating your video...',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'This may take a few minutes',
              style: TextStyle(color: AppTheme.muted, fontSize: 13),
            ),
          ],
        ),
      );
    }

    // Show error state
    if (_generationError != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(50),
              ),
              child: const Icon(Icons.error_outline, size: 40, color: Colors.redAccent),
            ),
            const SizedBox(height: 16),
            const Text(
              'Generation failed',
              style: TextStyle(
                color: Colors.redAccent,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Text(
                _generationError!,
                style: const TextStyle(color: AppTheme.muted, fontSize: 13),
                textAlign: TextAlign.center,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(height: 20),
            GestureDetector(
              onTap: () {
                setState(() {
                  _generationError = null;
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.border),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.refresh, size: 16, color: Colors.white),
                    SizedBox(width: 8),
                    Text(
                      'Try Again',
                      style: TextStyle(color: Colors.white, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Show video player if we have a video
    if (_videoController != null && _videoController!.value.isInitialized) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          alignment: Alignment.center,
          children: [
            AspectRatio(
              aspectRatio: _videoController!.value.aspectRatio,
              child: VideoPlayer(_videoController!),
            ),
            GestureDetector(
              onTap: () {
                setState(() {
                  _videoController!.value.isPlaying
                      ? _videoController!.pause()
                      : _videoController!.play();
                });
              },
              child: _videoController!.value.isPlaying
                  ? null
                  : const Icon(Icons.play_circle_fill,
                      size: 64, color: Colors.white70),
            ),
            // Save/Share buttons
            if (_generatedVideoUrl != null)
              Positioned(
                bottom: 12,
                right: 12,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildVideoActionButton(
                      Icons.download,
                      'Save',
                      _saveGeneratedVideo,
                      isPrimary: true,
                    ),
                    const SizedBox(width: 8),
                    _buildVideoActionButton(
                      Icons.share,
                      'Share',
                      _shareGeneratedVideo,
                    ),
                    const SizedBox(width: 8),
                    _buildVideoActionButton(
                      Icons.flag_outlined,
                      'Report',
                      () => ReportContentDialog.show(context, contentType: 'video'),
                    ),
                  ],
                ),
              ),
          ],
        ),
      );
    }

    // Empty state
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.videocam_off_outlined,
              size: 48, color: AppTheme.muted),
          const SizedBox(height: 16),
          const Text(
            'No videos yet',
            style: TextStyle(color: Colors.white, fontSize: 16),
          ),
          const SizedBox(height: 4),
          const Text(
            'Generate your first video below',
            style: TextStyle(color: AppTheme.muted, fontSize: 14),
          ),
        ],
      ),
    );
  }

  List<_VideoOptionItem> _getDurationOptions() {
    return VideoModels.durations.map((d) => _VideoOptionItem(
      id: '${d}s',
      name: '${d} seconds',
      description: d <= 3 ? 'Quick clip' : d <= 5 ? 'Short video' : d <= 7 ? 'Standard length' : 'Extended video',
    )).toList();
  }

  List<_VideoOptionItem> _getAspectRatioOptions() {
    return VideoModels.aspectRatios.map((r) => _VideoOptionItem(
      id: r,
      name: r,
      description: _getAspectDescription(r),
    )).toList();
  }

  String _getAspectDescription(String ratio) {
    switch (ratio) {
      case '16:9': return 'Landscape, YouTube';
      case '9:16': return 'Portrait, TikTok/Reels';
      case '1:1': return 'Square, Instagram';
      case '4:3': return 'Classic TV format';
      case '3:4': return 'Portrait photos';
      case '21:9': return 'Ultra-wide cinematic';
      default: return '';
    }
  }

  List<_VideoOptionItem> _getQualityOptions() {
    return VideoModels.qualities.map((q) => _VideoOptionItem(
      id: q,
      name: q,
      description: q == '480p' ? 'Fast, lower quality' : q == '720p' ? 'Balanced HD' : 'Best quality, slower',
      badge: q == '1080p' ? 'HD' : null,
    )).toList();
  }

  Widget _buildOptionPopup({
    required String label,
    required String value,
    required IconData icon,
    required List<_VideoOptionItem> items,
    required Function(String) onSelected,
    bool showValue = true,
  }) {
    return PopupMenuButton<String>(
      onSelected: onSelected,
      offset: const Offset(0, -200),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: AppTheme.card,
      itemBuilder: (context) => items.map((item) => PopupMenuItem<String>(
        value: item.id,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Text(
                  item.name,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: item.id == value ? FontWeight.w600 : FontWeight.normal,
                    color: item.id == value ? AppTheme.primary : Colors.white,
                  ),
                ),
                if (item.badge != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      item.badge!,
                      style: const TextStyle(
                        fontSize: 9,
                        color: AppTheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            if (item.description.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Text(
                  item.description,
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppTheme.muted,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
          ],
        ),
      )).toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: AppTheme.muted),
            const SizedBox(width: 4),
            Text(
              showValue ? value : label,
              style: const TextStyle(fontSize: 12, color: Colors.white),
            ),
            const SizedBox(width: 2),
            const Icon(Icons.keyboard_arrow_down, size: 14, color: AppTheme.muted),
          ],
        ),
      ),
    );
  }

  Widget _buildFramePicker({
    required String label,
    required String? imageUrl,
    required bool isUploading,
    required VoidCallback onPick,
    required VoidCallback onClear,
  }) {
    return GestureDetector(
      onTap: imageUrl == null && !isUploading ? onPick : null,
      child: Container(
        height: 80,
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: imageUrl != null ? AppTheme.primary : AppTheme.border,
            width: imageUrl != null ? 2 : 1,
          ),
        ),
        child: imageUrl != null
            ? Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: SmartNetworkImage(
                      imageUrl,
                      width: double.infinity,
                      height: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    top: 4,
                    right: 4,
                    child: GestureDetector(
                      onTap: onClear,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.close,
                            color: Colors.white, size: 14),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 4,
                    left: 4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        label,
                        style:
                            const TextStyle(fontSize: 10, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (isUploading)
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  else
                    const Icon(Icons.add_photo_alternate_outlined,
                        size: 24, color: AppTheme.muted),
                  const SizedBox(height: 4),
                  Text(
                    label,
                    style: const TextStyle(fontSize: 11, color: AppTheme.muted),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildOptionChip(IconData icon, String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: AppTheme.muted),
            const SizedBox(width: 6),
            Text(label,
                style: const TextStyle(
                    fontSize: 12, color: AppTheme.mutedForeground)),
          ],
        ),
      ),
    );
  }

  Widget _buildSoundToggle() {
    return GestureDetector(
      onTap: () => setState(() => _soundEnabled = !_soundEnabled),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: _soundEnabled
              ? AppTheme.primary.withOpacity(0.2)
              : AppTheme.secondary,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: _soundEnabled ? AppTheme.primary : AppTheme.border,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _soundEnabled ? Icons.volume_up : Icons.volume_off,
              size: 16,
              color: _soundEnabled ? AppTheme.primary : AppTheme.muted,
            ),
            const SizedBox(width: 6),
            Text(
              _soundEnabled ? 'Sound On' : 'Sound Off',
              style: TextStyle(
                fontSize: 12,
                color:
                    _soundEnabled ? AppTheme.primary : AppTheme.mutedForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }

}

/// Inline Video Tool Content Widget
class _InlineVideoToolContent extends StatefulWidget {
  final String toolId;
  final String toolName;
  final String toolDescription;
  final int creditCost;
  final bool showPrompt;
  final bool showScale;
  final bool showDuration;
  final bool showSecondaryUpload;
  final String? secondaryUploadLabel;

  const _InlineVideoToolContent({
    super.key,
    required this.toolId,
    required this.toolName,
    required this.toolDescription,
    required this.creditCost,
    this.showPrompt = false,
    this.showScale = false,
    this.showDuration = false,
    this.showSecondaryUpload = false,
    this.secondaryUploadLabel,
  });

  @override
  State<_InlineVideoToolContent> createState() => _InlineVideoToolContentState();
}

class _InlineVideoToolContentState extends State<_InlineVideoToolContent> {
  final SupabaseClient _supabase = Supabase.instance.client;
  final ImagePicker _picker = ImagePicker();
  final TextEditingController _promptController = TextEditingController();

  String? _inputUrl;
  String? _secondaryInputUrl;
  String? _outputUrl;
  bool _isUploading = false;
  bool _isUploadingSecondary = false;
  bool _isProcessing = false;
  int _scale = 2;
  int _duration = 5;

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _pickFile({bool secondary = false}) async {
    try {
      final XFile? file = await _picker.pickVideo(source: ImageSource.gallery);
      if (file == null) return;

      setState(() {
        if (secondary) {
          _isUploadingSecondary = true;
        } else {
          _isUploading = true;
          _outputUrl = null;
        }
      });

      final user = _supabase.auth.currentUser;
      if (user == null) throw Exception('Not authenticated');

      final localFile = File(file.path);
      final fileExt = file.path.split('.').last;
      final fileName = '${user.id}/${DateTime.now().millisecondsSinceEpoch}${secondary ? '-audio' : ''}.$fileExt';
      await _supabase.storage.from('generation-inputs').upload(fileName, localFile);
      final publicUrl = _supabase.storage.from('generation-inputs').getPublicUrl(fileName);

      setState(() {
        if (secondary) {
          _secondaryInputUrl = publicUrl;
        } else {
          _inputUrl = publicUrl;
        }
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          if (secondary) _isUploadingSecondary = false;
          else _isUploading = false;
        });
      }
    }
  }

  Future<void> _process() async {
    if (_inputUrl == null) return;

    final creditsProvider = context.read<CreditsProvider>();
    if (!creditsProvider.hasActiveSubscription && creditsProvider.credits < widget.creditCost) {
      showAddCreditsDialog(context: context, currentCredits: creditsProvider.credits, requiredCredits: widget.creditCost);
      return;
    }

    setState(() {
      _isProcessing = true;
      _outputUrl = null;
    });

    try {
      final options = <String, dynamic>{};
      if (widget.showPrompt && _promptController.text.isNotEmpty) options['prompt'] = _promptController.text;
      if (widget.showScale) options['scale'] = _scale;
      if (widget.showDuration) options['duration'] = _duration;
      if (widget.showSecondaryUpload && _secondaryInputUrl != null) options['audioUrl'] = _secondaryInputUrl;

      final response = await _supabase.functions.invoke('video-tools', body: {
        'tool': widget.toolId,
        'videoUrl': _inputUrl,
        ...options,
      });

      final result = response.data as Map<String, dynamic>;
      if (result['outputUrl'] != null) {
        setState(() => _outputUrl = result['outputUrl'] as String);
        creditsProvider.refresh();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${widget.toolName} completed!'), backgroundColor: AppTheme.primary),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Processing failed: $e'), backgroundColor: Colors.red),
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
                  width: 48, height: 48,
                  decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                  child: Icon(_getToolIcon(), color: AppTheme.primary, size: 24),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.toolName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(widget.toolDescription, style: const TextStyle(color: AppTheme.muted, fontSize: 13)),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: AppTheme.primary.withOpacity(0.1), borderRadius: BorderRadius.circular(16)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [const Icon(Icons.bolt, color: AppTheme.primary, size: 14), const SizedBox(width: 4), Text('${widget.creditCost}', style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 13))],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Upload Section
          Row(
            children: [
              Expanded(child: _buildUploadBox(isPrimary: true)),
              if (widget.showSecondaryUpload) ...[const SizedBox(width: 12), Expanded(child: _buildUploadBox(isPrimary: false))],
            ],
          ),
          const SizedBox(height: 20),

          // Controls
          if (_inputUrl != null && _outputUrl == null) ...[
            if (widget.showPrompt) ...[
              const Text('Prompt', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(color: AppTheme.secondary, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppTheme.border)),
                child: TextField(controller: _promptController, maxLines: 2, decoration: const InputDecoration(hintText: 'Describe what you want...', hintStyle: TextStyle(color: AppTheme.muted), contentPadding: EdgeInsets.all(12), border: InputBorder.none)),
              ),
              const SizedBox(height: 16),
            ],
            if (widget.showScale) ...[
              const Text('Scale', style: TextStyle(fontWeight: FontWeight.w600)),
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
                        decoration: BoxDecoration(color: isSelected ? AppTheme.primary : AppTheme.secondary, borderRadius: BorderRadius.circular(12), border: Border.all(color: isSelected ? AppTheme.primary : AppTheme.border)),
                        child: Center(child: Text('${s}x', style: TextStyle(fontWeight: FontWeight.w600, color: isSelected ? Colors.white : AppTheme.mutedForeground))),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
            ],
            if (widget.showDuration) ...[
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [const Text('Duration', style: TextStyle(fontWeight: FontWeight.w600)), Text('${_duration}s', style: const TextStyle(color: AppTheme.primary))]),
              Slider(value: _duration.toDouble(), min: 3, max: 10, divisions: 7, activeColor: AppTheme.primary, onChanged: (v) => setState(() => _duration = v.round())),
              const SizedBox(height: 12),
            ],
          ],

          // Output
          if (_outputUrl != null) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Result', style: TextStyle(fontWeight: FontWeight.w600)),
                GestureDetector(onTap: () => setState(() { _inputUrl = null; _outputUrl = null; }), child: const Text('Reset', style: TextStyle(color: AppTheme.primary, fontSize: 13))),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              height: 200, width: double.infinity,
              decoration: BoxDecoration(color: AppTheme.secondary, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppTheme.primary)),
              child: const Center(child: Icon(Icons.play_circle_filled, size: 64, color: AppTheme.primary)),
            ),
            const SizedBox(height: 16),
          ],

          // Action Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isProcessing || _inputUrl == null ? null : _process,
              child: _isProcessing
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Row(mainAxisAlignment: MainAxisAlignment.center, children: [const Icon(Icons.auto_awesome, size: 18), const SizedBox(width: 8), Text('Process (${widget.creditCost} credits)')]),
            ),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildUploadBox({required bool isPrimary}) {
    final url = isPrimary ? _inputUrl : _secondaryInputUrl;
    final isUploading = isPrimary ? _isUploading : _isUploadingSecondary;
    final label = isPrimary ? 'Video' : (widget.secondaryUploadLabel ?? 'Audio');

    return GestureDetector(
      onTap: () => _pickFile(secondary: !isPrimary),
      child: Container(
        height: 150,
        decoration: BoxDecoration(color: AppTheme.secondary, borderRadius: BorderRadius.circular(16), border: Border.all(color: url != null ? AppTheme.primary : AppTheme.border)),
        child: isUploading
            ? const Center(child: CircularProgressIndicator())
            : url != null
                ? Stack(
                    children: [
                      Center(child: Icon(isPrimary ? Icons.videocam : Icons.audiotrack, size: 40, color: AppTheme.primary)),
                      Positioned(
                        top: 8, right: 8,
                        child: GestureDetector(
                          onTap: () => setState(() { if (isPrimary) { _inputUrl = null; _outputUrl = null; } else { _secondaryInputUrl = null; } }),
                          child: Container(padding: const EdgeInsets.all(4), decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(12)), child: const Icon(Icons.close, size: 16, color: Colors.white)),
                        ),
                      ),
                      Positioned(bottom: 8, left: 8, right: 8, child: Text('Uploaded', textAlign: TextAlign.center, style: const TextStyle(color: AppTheme.muted, fontSize: 12))),
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [Icon(isPrimary ? Icons.videocam : Icons.audiotrack, size: 32, color: AppTheme.muted), const SizedBox(height: 8), Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 13)), const SizedBox(height: 4), const Text('Tap to upload', style: TextStyle(color: AppTheme.muted, fontSize: 11))],
                  ),
      ),
    );
  }

  IconData _getToolIcon() {
    switch (widget.toolId) {
      case 'lip-sync': return Icons.record_voice_over;
      case 'draw-to-video': return Icons.brush;
      case 'mixed-media': return Icons.auto_awesome_mosaic;
      case 'click-to-ad': return Icons.ads_click;
      case 'sora-trends': return Icons.trending_up;
      case 'video-upscale': return Icons.hd;
      case 'extend': return Icons.add_circle_outline;
      case 'interpolate': return Icons.animation;
      default: return Icons.videocam;
    }
  }
}
