import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../providers/generation_provider.dart';
import '../../providers/credits_provider.dart';
import '../../widgets/common/credit_badge.dart';

class CinemaStudioScreen extends StatefulWidget {
  const CinemaStudioScreen({super.key});

  @override
  State<CinemaStudioScreen> createState() => _CinemaStudioScreenState();
}

class _CinemaStudioScreenState extends State<CinemaStudioScreen> {
  final _promptController = TextEditingController();
  String _selectedModel = 'wan-2.6';
  String _selectedAspectRatio = '16:9';
  String? _startFrameUrl;
  String? _endFrameUrl;

  @override
  void initState() {
    super.initState();
    _loadGenerations();
  }

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _loadGenerations() async {
    await context.read<GenerationProvider>().loadGenerations(type: 'video');
  }

  Future<void> _handleGenerate() async {
    if (_promptController.text.trim().isEmpty && _startFrameUrl == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a prompt or upload a start frame')),
      );
      return;
    }

    final creditsProvider = context.read<CreditsProvider>();
    if (!creditsProvider.hasEnoughCreditsForModel(_selectedModel)) {
      _showAddCreditsDialog();
      return;
    }

    final generationProvider = context.read<GenerationProvider>();
    await generationProvider.generate(
      prompt: _promptController.text.trim(),
      model: _selectedModel,
      type: 'video',
      aspectRatio: _selectedAspectRatio,
      imageUrl: _startFrameUrl,
      endImageUrl: _endFrameUrl,
    );

    creditsProvider.refresh();
    await _loadGenerations();
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
        title: const Text('Cinema Studio'),
        actions: const [
          CreditBadge(),
          SizedBox(width: 16),
        ],
      ),
      body: Column(
        children: [
          // Video Grid (Higgsfield style)
          Expanded(
            child: Consumer<GenerationProvider>(
              builder: (context, provider, child) {
                final videos = provider.videos;
                
                if (videos.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.movie_creation, size: 64, color: AppTheme.muted),
                        SizedBox(height: 16),
                        Text(
                          'Your cinema creations will appear here',
                          style: TextStyle(color: AppTheme.muted),
                        ),
                      ],
                    ),
                  );
                }

                return GridView.builder(
                  padding: const EdgeInsets.all(4),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 4,
                    crossAxisSpacing: 4,
                    childAspectRatio: 16 / 9,
                  ),
                  itemCount: videos.length,
                  itemBuilder: (context, index) {
                    final video = videos[index];
                    final thumbnailUrl = video.thumbnailUrl ?? video.outputUrl;
                    
                    return GestureDetector(
                      onTap: () {
                        // Play video
                      },
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (thumbnailUrl != null)
                            CachedNetworkImage(
                              imageUrl: thumbnailUrl,
                              fit: BoxFit.cover,
                            )
                          else
                            Container(color: AppTheme.secondary),
                          
                          // Play icon overlay
                          const Center(
                            child: Icon(
                              Icons.play_circle_fill,
                              size: 40,
                              color: Colors.white70,
                            ),
                          ),
                          
                          // Pending overlay
                          if (video.isPending)
                            Container(
                              color: Colors.black54,
                              child: const Center(
                                child: CircularProgressIndicator(),
                              ),
                            ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),

          // Bottom Toolbar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: AppTheme.card,
              border: Border(top: BorderSide(color: AppTheme.border)),
            ),
            child: Column(
              children: [
                // Reference frames row
                Row(
                  children: [
                    // Start frame
                    Expanded(
                      child: _FrameUpload(
                        label: 'Start Frame',
                        imageUrl: _startFrameUrl,
                        onTap: () async {
                          // Pick image
                          setState(() {
                            _startFrameUrl = 'https://example.com/start.jpg';
                          });
                        },
                        onClear: () {
                          setState(() {
                            _startFrameUrl = null;
                          });
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    // End frame
                    Expanded(
                      child: _FrameUpload(
                        label: 'End Frame',
                        imageUrl: _endFrameUrl,
                        onTap: () async {
                          setState(() {
                            _endFrameUrl = 'https://example.com/end.jpg';
                          });
                        },
                        onClear: () {
                          setState(() {
                            _endFrameUrl = null;
                          });
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Model selection
                SizedBox(
                  height: 36,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: AppConfig.videoModels.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, index) {
                      final model = AppConfig.videoModels[index];
                      final isSelected = model['id'] == _selectedModel;
                      return ChoiceChip(
                        label: Text(model['name'] as String),
                        selected: isSelected,
                        visualDensity: VisualDensity.compact,
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

                // Prompt and generate
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _promptController,
                        decoration: const InputDecoration(
                          hintText: 'Describe your video...',
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
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

class _FrameUpload extends StatelessWidget {
  final String label;
  final String? imageUrl;
  final VoidCallback onTap;
  final VoidCallback onClear;

  const _FrameUpload({
    required this.label,
    this.imageUrl,
    required this.onTap,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: imageUrl == null ? onTap : null,
      child: Container(
        height: 80,
        decoration: BoxDecoration(
          color: AppTheme.secondary,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        child: imageUrl != null
            ? Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(11),
                    child: CachedNetworkImage(
                      imageUrl: imageUrl!,
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
                        decoration: const BoxDecoration(
                          color: Colors.black54,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.close, size: 14, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.add_photo_alternate, color: AppTheme.muted),
                  const SizedBox(height: 4),
                  Text(
                    label,
                    style: const TextStyle(color: AppTheme.muted, fontSize: 12),
                  ),
                ],
              ),
      ),
    );
  }
}
