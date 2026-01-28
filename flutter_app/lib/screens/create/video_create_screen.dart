import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../providers/generation_provider.dart';
import '../../providers/credits_provider.dart';
import '../../providers/download_provider.dart';
import '../../models/download_model.dart';
import 'video_model_selector.dart';

// Extended video models list matching web
const List<Map<String, dynamic>> allVideoModels = [
  // Economy tier
  {'id': 'kie-sora2', 'name': 'Sora 2', 'description': 'OpenAI video gen', 'credits': 12, 'tier': 'economy', 'badge': 'HOT'},
  {'id': 'kie-kling', 'name': 'Kling 2.1', 'description': 'Kuaishou video AI', 'credits': 12, 'tier': 'economy', 'badge': 'HOT'},
  {'id': 'kie-runway', 'name': 'Runway Gen', 'description': 'Kie.ai video gen', 'credits': 8, 'tier': 'economy', 'badge': null},
  {'id': 'kie-runway-i2v', 'name': 'Runway I2V', 'description': 'Image to video', 'credits': 10, 'tier': 'economy', 'badge': null},
  {'id': 'kie-sora2-pro', 'name': 'Sora 2 Pro', 'description': 'OpenAI best quality', 'credits': 18, 'tier': 'economy', 'badge': null},
  {'id': 'kie-veo31', 'name': 'Veo 3.1', 'description': 'Google latest video', 'credits': 15, 'tier': 'economy', 'badge': null},
  {'id': 'kie-veo31-fast', 'name': 'Veo 3.1 Fast', 'description': 'Google fast video', 'credits': 10, 'tier': 'economy', 'badge': null},
  {'id': 'kie-hailuo', 'name': 'Hailuo', 'description': 'MiniMax video', 'credits': 10, 'tier': 'economy', 'badge': null},
  {'id': 'kie-wan', 'name': 'Wan 2.2', 'description': 'Alibaba video AI', 'credits': 8, 'tier': 'economy', 'badge': null},
  // High quality tier
  {'id': 'wan-2.6', 'name': 'Wan 2.6', 'description': 'Latest Alibaba model', 'credits': 15, 'tier': 'hq', 'badge': 'NEW'},
  {'id': 'veo-3', 'name': 'Veo 3', 'description': "Google's best with audio", 'credits': 30, 'tier': 'hq', 'badge': 'HOT'},
  {'id': 'luma', 'name': 'Luma Dream Machine', 'description': 'Creative video', 'credits': 22, 'tier': 'hq', 'badge': 'HOT'},
  {'id': 'kling-2.6', 'name': 'Kling 2.6 Pro', 'description': 'Cinematic with audio', 'credits': 25, 'tier': 'hq', 'badge': 'TOP'},
  {'id': 'veo-3-fast', 'name': 'Veo 3 Fast', 'description': 'Faster Veo 3', 'credits': 20, 'tier': 'hq', 'badge': null},
  {'id': 'hailuo-02', 'name': 'Hailuo-02', 'description': 'MiniMax video model', 'credits': 18, 'tier': 'hq', 'badge': 'NEW'},
  {'id': 'seedance-1.5', 'name': 'Seedance 1.5', 'description': 'With audio support', 'credits': 20, 'tier': 'hq', 'badge': 'NEW'},
  {'id': 'hunyuan-1.5', 'name': 'Hunyuan 1.5', 'description': 'Tencent video model', 'credits': 18, 'tier': 'hq', 'badge': 'NEW'},
];

// Video tools matching web sidebar
const List<Map<String, dynamic>> videoTools = [
  {'id': 'mixed-media', 'name': 'Mixed Media', 'description': 'Create mixed media projects', 'icon': Icons.auto_awesome_mosaic, 'badge': 'NEW', 'route': 'mixed-media'},
  {'id': 'click-to-ad', 'name': 'Click to Ad', 'description': 'Product URLs to video ads', 'icon': Icons.ads_click, 'badge': null, 'route': 'click-to-ad'},
  {'id': 'sora-trends', 'name': 'Sora 2 Trends', 'description': 'Turn ideas into viral videos', 'icon': Icons.trending_up, 'badge': null, 'route': 'sora-trends'},
  {'id': 'lip-sync', 'name': 'Lipsync Studio', 'description': 'Create talking clips', 'icon': Icons.record_voice_over, 'badge': null, 'route': 'lip-sync'},
  {'id': 'draw-to-video', 'name': 'Draw to Video', 'description': 'Sketch to cinematic video', 'icon': Icons.brush, 'badge': null, 'route': 'draw-to-video'},
  {'id': 'sketch-to-video', 'name': 'Sketch to Video', 'description': 'From sketch to video with Sora', 'icon': Icons.edit, 'badge': null, 'route': 'sketch-to-video'},
  {'id': 'ugc-factory', 'name': 'UGC Factory', 'description': 'Build UGC with AI avatars', 'icon': Icons.person_pin, 'badge': null, 'route': 'ugc-factory'},
  {'id': 'video-upscale', 'name': 'Video Upscale', 'description': 'Enhance video quality', 'icon': Icons.hd, 'badge': null, 'route': 'video-upscale'},
  {'id': 'extend', 'name': 'Extend', 'description': 'Extend video length', 'icon': Icons.add_circle_outline, 'badge': null, 'route': 'extend'},
  {'id': 'interpolate', 'name': 'Interpolate', 'description': 'Smooth frame rate', 'icon': Icons.animation, 'badge': null, 'route': 'interpolate'},
];

// Video Templates
const List<Map<String, String>> videoTemplates = [
  {'label': 'Cinematic', 'prompt': 'A cinematic wide shot of a beautiful sunset over mountains, golden hour, 4K quality'},
  {'label': 'Action', 'prompt': 'Dynamic action shot with dramatic lighting, fast-paced, professional cinematography'},
  {'label': 'Nature', 'prompt': 'Peaceful nature scene with flowing water and lush greenery, National Geographic style'},
  {'label': 'Urban', 'prompt': 'Modern city skyline at night with neon lights reflecting, cyberpunk aesthetic'},
  {'label': 'Abstract', 'prompt': 'Mesmerizing abstract patterns morphing and flowing, vibrant colors, artistic'},
  {'label': 'Portrait', 'prompt': 'Elegant portrait with cinematic bokeh background, professional lighting'},
];

const List<String> aspectRatios = ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'];
const List<String> qualities = ['480p', '720p', '1080p'];
const List<int> durations = [3, 5, 7, 10];

class VideoCreateScreen extends StatefulWidget {
  const VideoCreateScreen({super.key});

  @override
  State<VideoCreateScreen> createState() => _VideoCreateScreenState();
}

class _VideoCreateScreenState extends State<VideoCreateScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
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
  VideoPlayerController? _videoController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _promptController.dispose();
    _videoController?.dispose();
    super.dispose();
  }

  int get _selectedModelCredits {
    final model = allVideoModels.firstWhere(
      (m) => m['id'] == _selectedModel,
      orElse: () => {'credits': 15},
    );
    return model['credits'] as int;
  }

  String get _selectedModelName {
    final model = allVideoModels.firstWhere(
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
      final fileName = '${session.user.id}/${DateTime.now().millisecondsSinceEpoch}-start-${image.name}';

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
      final fileName = '${session.user.id}/${DateTime.now().millisecondsSinceEpoch}-end-${image.name}';

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

    final generationProvider = context.read<GenerationProvider>();
    
    final result = await generationProvider.generate(
      prompt: _promptController.text.trim(),
      model: _selectedModel,
      type: 'video',
      aspectRatio: _selectedAspectRatio,
      quality: _selectedQuality,
      background: true,
    );

    if (result != null) {
      _showSnackBar('Video generation started. Check your library for the result.');
      creditsProvider.refresh();
      _pollForCompletion(result.id);
    }
  }

  Future<void> _pollForCompletion(String generationId) async {
    const maxAttempts = 60;
    var attempts = 0;

    Future<void> poll() async {
      if (!mounted) return;
      
      final provider = context.read<GenerationProvider>();
      await provider.loadGenerations();
      
      final generation = provider.generations.where((g) => g.id == generationId).firstOrNull;
      
      if (generation?.isCompleted == true && generation?.outputUrl != null) {
        setState(() {
          _generatedVideoUrl = generation!.outputUrl;
        });
        _initializeVideoPlayer(generation!.outputUrl!);
        
        if (mounted) {
          _showSnackBar('Video ready!');
        }
        return;
      }

      if (generation?.isFailed == true) {
        if (mounted) {
          _showSnackBar('Video generation failed');
        }
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        await Future.delayed(const Duration(seconds: 5));
        await poll();
      }
    }

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

      await Share.shareXFiles([XFile(file.path)], text: 'Created with Timeless AI');
    } catch (e) {
      if (mounted) {
        _showSnackBar('Share failed: $e');
      }
    }
  }

  Widget _buildVideoActionButton(IconData icon, String label, VoidCallback onTap, {bool isPrimary = false}) {
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
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.white)),
          ],
        ),
      ),
    );
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
            Text(
              'You need $_selectedModelCredits credits for this video.',
              style: const TextStyle(color: AppTheme.muted),
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
      backgroundColor: AppTheme.background,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => VideoModelSelector(
        selectedModel: _selectedModel,
        models: allVideoModels,
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
              children: durations.map((d) {
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
                        color: isSelected ? AppTheme.primary : AppTheme.secondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? AppTheme.primary : AppTheme.border,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          '${d}s',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: isSelected ? Colors.white : AppTheme.mutedForeground,
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
              children: aspectRatios.map((ratio) {
                final isSelected = _selectedAspectRatio == ratio;
                return GestureDetector(
                  onTap: () {
                    setState(() => _selectedAspectRatio = ratio);
                    Navigator.pop(context);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
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
                        color: isSelected ? Colors.white : AppTheme.mutedForeground,
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
              children: qualities.map((q) {
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
                        color: isSelected ? AppTheme.primary : AppTheme.secondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? AppTheme.primary : AppTheme.border,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          q,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: isSelected ? Colors.white : AppTheme.mutedForeground,
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
                      style: const TextStyle(fontSize: 12, color: AppTheme.muted),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Video'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primary,
          labelColor: Colors.white,
          unselectedLabelColor: AppTheme.muted,
          tabs: const [
            Tab(text: 'Create'),
            Tab(text: 'Tools'),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Center(
              child: Text(
                '$_selectedModelCredits cr',
                style: const TextStyle(color: AppTheme.muted, fontSize: 12),
              ),
            ),
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCreateTab(),
          _buildToolsTab(),
        ],
      ),
    );
  }

  Widget _buildCreateTab() {
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
                        Text('Generating video...', style: TextStyle(color: AppTheme.muted)),
                        SizedBox(height: 8),
                        Text(
                          'This may take a few minutes',
                          style: TextStyle(color: AppTheme.muted, fontSize: 12),
                        ),
                      ],
                    ),
                  );
                }
                
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
                              : const Icon(Icons.play_circle_fill, size: 64, color: Colors.white70),
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
                              ],
                            ),
                          ),
                      ],
                    ),
                  );
                }
                
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.videocam_off_outlined, size: 48, color: AppTheme.muted),
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

              // Options row
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _buildOptionChip(Icons.dashboard_outlined, 'Templates', _showTemplatesSelector),
                    const SizedBox(width: 8),
                    _buildOptionChip(Icons.timer_outlined, '${_selectedDuration}s', _showDurationSelector),
                    const SizedBox(width: 8),
                    _buildOptionChip(Icons.aspect_ratio, _selectedAspectRatio, _showAspectRatioSelector),
                    const SizedBox(width: 8),
                    _buildOptionChip(Icons.high_quality, _selectedQuality, _showQualitySelector),
                    const SizedBox(width: 8),
                    _buildSoundToggle(),
                  ],
                ),
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
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.bolt, size: 18, color: AppTheme.primary),
                          const SizedBox(width: 6),
                          Text(
                            _selectedModelName.length > 12 
                                ? '${_selectedModelName.substring(0, 12)}...' 
                                : _selectedModelName,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.keyboard_arrow_down, size: 18, color: AppTheme.muted),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Generate button
                  Expanded(
                    child: Consumer<GenerationProvider>(
                      builder: (context, provider, child) {
                        return GestureDetector(
                          onTap: provider.isGenerating ? null : _handleGenerate,
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: provider.isGenerating 
                                    ? [AppTheme.muted, AppTheme.muted]
                                    : [AppTheme.primary, AppTheme.accent],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                if (provider.isGenerating)
                                  const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                else
                                  const Icon(Icons.auto_awesome, size: 18, color: Colors.white),
                                const SizedBox(width: 8),
                                Text(
                                  provider.isGenerating ? 'Generating...' : 'Generate',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                if (!provider.isGenerating) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
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
                    child: Image.network(
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
                        child: const Icon(Icons.close, color: Colors.white, size: 14),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 4,
                    left: 4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        label,
                        style: const TextStyle(fontSize: 10, color: Colors.white),
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
                    const Icon(Icons.add_photo_alternate_outlined, size: 24, color: AppTheme.muted),
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
            Text(label, style: const TextStyle(fontSize: 12, color: AppTheme.mutedForeground)),
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
          color: _soundEnabled ? AppTheme.primary.withOpacity(0.2) : AppTheme.secondary,
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
                color: _soundEnabled ? AppTheme.primary : AppTheme.mutedForeground,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildToolsTab() {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: videoTools.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final tool = videoTools[index];
        return _buildToolTile(tool);
      },
    );
  }

  Widget _buildToolTile(Map<String, dynamic> tool) {
    return GestureDetector(
      onTap: () => context.push('/create/video/${tool['route']}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(tool['icon'] as IconData, color: AppTheme.primary, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        tool['name'] as String,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                      ),
                      if (tool['badge'] != null) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: tool['badge'] == 'NEW' 
                                ? Colors.green.withOpacity(0.2)
                                : AppTheme.primary.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            tool['badge'] as String,
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: tool['badge'] == 'NEW' ? Colors.green : AppTheme.primary,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    tool['description'] as String,
                    style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppTheme.muted, size: 20),
          ],
        ),
      ),
    );
  }
}
