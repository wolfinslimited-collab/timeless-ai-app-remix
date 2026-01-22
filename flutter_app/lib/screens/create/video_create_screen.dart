import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../providers/generation_provider.dart';
import '../../providers/credits_provider.dart';

class VideoCreateScreen extends StatefulWidget {
  const VideoCreateScreen({super.key});

  @override
  State<VideoCreateScreen> createState() => _VideoCreateScreenState();
}

class _VideoCreateScreenState extends State<VideoCreateScreen> {
  final _promptController = TextEditingController();
  String _selectedModel = 'kling-2.6';
  String _selectedAspectRatio = '16:9';
  String _selectedQuality = '1080p';
  String? _generatedVideoUrl;
  VideoPlayerController? _videoController;

  @override
  void dispose() {
    _promptController.dispose();
    _videoController?.dispose();
    super.dispose();
  }

  int get _selectedModelCredits {
    final model = AppConfig.videoModels.firstWhere(
      (m) => m['id'] == _selectedModel,
      orElse: () => {'credits': 25},
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
    
    // Start background generation
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
      
      // Start polling for completion
      _pollForCompletion(result.id);
    }
  }

  Future<void> _pollForCompletion(String generationId) async {
    const maxAttempts = 60; // 5 minutes
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Video'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Center(
              child: Text(
                '$_selectedModelCredits credits',
                style: const TextStyle(color: AppTheme.muted, fontSize: 12),
              ),
            ),
          ),
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
              child: Consumer<GenerationProvider>(
                builder: (context, provider, child) {
                  if (provider.isGenerating) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const CircularProgressIndicator(),
                          const SizedBox(height: 16),
                          const Text('Generating video...', style: TextStyle(color: AppTheme.muted)),
                          const SizedBox(height: 8),
                          const Text(
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
                        ],
                      ),
                    );
                  }
                  
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.videocam, size: 48, color: AppTheme.muted),
                        const SizedBox(height: 16),
                        const Text(
                          'Your video will appear here',
                          style: TextStyle(color: AppTheme.muted, fontSize: 14),
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppTheme.card,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.add_a_photo, size: 16, color: AppTheme.muted),
                              SizedBox(width: 8),
                              Text('Add reference', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                            ],
                          ),
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
                    itemCount: AppConfig.videoModels.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final model = AppConfig.videoModels[index];
                      final isSelected = model['id'] == _selectedModel;
                      return GestureDetector(
                        onTap: () => setState(() => _selectedModel = model['id'] as String),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.primary : AppTheme.secondary,
                            borderRadius: BorderRadius.circular(18),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            model['name'] as String,
                            style: TextStyle(
                              color: isSelected ? Colors.white : AppTheme.mutedForeground,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),

                // Aspect Ratio & Quality
                Row(
                  children: [
                    const Text('Ratio:', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                    const SizedBox(width: 8),
                    ...['16:9', '9:16', '1:1'].map((ratio) {
                      final isSelected = ratio == _selectedAspectRatio;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedAspectRatio = ratio),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isSelected ? AppTheme.primary.withOpacity(0.2) : AppTheme.secondary,
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
                    }).toList(),
                    const Spacer(),
                    const Text('Quality:', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                    const SizedBox(width: 8),
                    ...['720p', '1080p'].map((q) {
                      final isSelected = q == _selectedQuality;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedQuality = q),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isSelected ? AppTheme.primary.withOpacity(0.2) : AppTheme.secondary,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              q,
                              style: TextStyle(
                                color: isSelected ? AppTheme.primary : AppTheme.muted,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
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
                            hintText: 'Describe your video...',
                            hintStyle: TextStyle(color: AppTheme.muted),
                            contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
                              color: provider.isGenerating ? AppTheme.muted : AppTheme.primary,
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
                                : const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
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
      ),
    );
  }
}
