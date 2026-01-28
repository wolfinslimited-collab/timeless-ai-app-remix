import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
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
  String _selectedDuration = '5s';
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

  Future<void> _handleGenerate() async {
    if (_promptController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a prompt')),
      );
      return;
    }

    final creditsProvider = context.read<CreditsProvider>();
    if (!creditsProvider.hasEnoughCredits(_selectedModelCredits)) {
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Video generation started. Check your library for the result.'),
          duration: Duration(seconds: 3),
        ),
      );
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
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Video ready!')),
          );
        }
        return;
      }

      if (generation?.isFailed == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Video generation failed')),
          );
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Saved to Downloads & Gallery'),
            backgroundColor: AppTheme.primary,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Save failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Share failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
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
              // Quick options row
              Row(
                children: [
                  _buildOptionChip(Icons.dashboard_outlined, 'Templates'),
                  const SizedBox(width: 8),
                  _buildOptionChip(Icons.person_add_outlined, '+ Character'),
                  const SizedBox(width: 8),
                  _buildOptionChip(Icons.timer_outlined, _selectedDuration),
                  const SizedBox(width: 8),
                  _buildOptionChip(Icons.aspect_ratio, _selectedAspectRatio),
                  const SizedBox(width: 8),
                  _buildOptionChip(Icons.high_quality, _selectedQuality),
                ],
              ),
              const SizedBox(height: 12),

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
                          hintText: 'Describe your video...',
                          hintStyle: TextStyle(color: AppTheme.muted),
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          border: InputBorder.none,
                        ),
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Model selector button
                  GestureDetector(
                    onTap: _showModelSelector,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.bolt, size: 16, color: AppTheme.primary),
                          const SizedBox(width: 4),
                          Text(
                            _selectedModelName.length > 8 
                                ? '${_selectedModelName.substring(0, 8)}...' 
                                : _selectedModelName,
                            style: const TextStyle(fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Consumer<GenerationProvider>(
                    builder: (context, provider, child) {
                      return GestureDetector(
                        onTap: provider.isGenerating ? null : _handleGenerate,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: provider.isGenerating 
                                  ? [AppTheme.muted, AppTheme.muted]
                                  : [AppTheme.primary, AppTheme.accent],
                            ),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (provider.isGenerating)
                                const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              else
                                const Icon(Icons.auto_awesome, size: 16, color: Colors.white),
                              const SizedBox(width: 6),
                              Text(
                                'Generate',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(width: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  '$_selectedModelCredits',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
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

  Widget _buildOptionChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppTheme.muted),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontSize: 11, color: AppTheme.mutedForeground)),
        ],
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
