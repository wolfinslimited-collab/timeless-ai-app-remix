import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../providers/generation_provider.dart';
import '../../providers/credits_provider.dart';
import '../../widgets/common/credit_badge.dart';

class VideoCreateScreen extends StatefulWidget {
  const VideoCreateScreen({super.key});

  @override
  State<VideoCreateScreen> createState() => _VideoCreateScreenState();
}

class _VideoCreateScreenState extends State<VideoCreateScreen> {
  final _promptController = TextEditingController();
  String _selectedModel = 'wan-2.6';
  String _selectedAspectRatio = '16:9';
  String _selectedQuality = '720p';
  String? _generatedVideoUrl;
  VideoPlayerController? _videoController;

  @override
  void dispose() {
    _promptController.dispose();
    _videoController?.dispose();
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
    );

    if (result != null && result.outputUrl != null) {
      setState(() {
        _generatedVideoUrl = result.outputUrl;
      });
      _initializeVideoPlayer(result.outputUrl!);
      creditsProvider.refresh();
    }
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
              'You need ${context.read<CreditsProvider>().getModelCost(_selectedModel)} credits for this video.',
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
        title: const Text('Video Generation'),
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
              child: _videoController != null && _videoController!.value.isInitialized
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          AspectRatio(
                            aspectRatio: _videoController!.value.aspectRatio,
                            child: VideoPlayer(_videoController!),
                          ),
                          // Play/Pause overlay
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                _videoController!.value.isPlaying
                                    ? _videoController!.pause()
                                    : _videoController!.play();
                              });
                            },
                            child: Container(
                              color: Colors.transparent,
                              child: _videoController!.value.isPlaying
                                  ? null
                                  : const Icon(Icons.play_circle_fill, size: 64, color: Colors.white70),
                            ),
                          ),
                        ],
                      ),
                    )
                  : Consumer<GenerationProvider>(
                      builder: (context, provider, child) {
                        if (provider.isGenerating) {
                          return Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const CircularProgressIndicator(),
                                const SizedBox(height: 16),
                                Text(
                                  'Generating... ${(provider.progress * 100).toInt()}%',
                                  style: const TextStyle(color: AppTheme.muted),
                                ),
                              ],
                            ),
                          );
                        }
                        return const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.videocam, size: 64, color: AppTheme.muted),
                              SizedBox(height: 16),
                              Text(
                                'Your video will appear here',
                                style: TextStyle(color: AppTheme.muted),
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
                  height: 40,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: AppConfig.videoModels.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final model = AppConfig.videoModels[index];
                      final isSelected = model['id'] == _selectedModel;
                      return ChoiceChip(
                        label: Text('${model['name']} (${model['credits']}c)'),
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

                // Aspect Ratio & Quality
                Row(
                  children: [
                    // Aspect Ratio
                    Expanded(
                      child: SizedBox(
                        height: 36,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: AppConfig.aspectRatios.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 6),
                          itemBuilder: (context, index) {
                            final ratio = AppConfig.aspectRatios[index];
                            final isSelected = ratio == _selectedAspectRatio;
                            return ChoiceChip(
                              label: Text(ratio),
                              selected: isSelected,
                              visualDensity: VisualDensity.compact,
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
                    ),
                    const SizedBox(width: 12),
                    // Quality dropdown
                    DropdownButton<String>(
                      value: _selectedQuality,
                      items: AppConfig.videoQualities.map((q) {
                        return DropdownMenuItem(value: q, child: Text(q));
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _selectedQuality = value;
                          });
                        }
                      },
                      underline: const SizedBox(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Prompt Input
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _promptController,
                        decoration: const InputDecoration(
                          hintText: 'Describe your video...',
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
                              : const Icon(Icons.movie_creation),
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
