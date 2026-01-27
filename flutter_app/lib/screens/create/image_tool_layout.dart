import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:video_player/video_player.dart';
import '../../core/theme.dart';

/// Reusable layout for image processing tools
class ImageToolLayout extends StatefulWidget {
  final String toolId;
  final String toolName;
  final String toolDescription;
  final int creditCost;
  final String? previewVideoUrl;
  
  // Optional configuration
  final bool showPrompt;
  final String? promptLabel;
  final String? promptPlaceholder;
  final bool showIntensity;
  final String? intensityLabel;
  final bool showScale;
  final bool showStyleSelector;
  final List<StyleOption>? styleOptions;

  const ImageToolLayout({
    super.key,
    required this.toolId,
    required this.toolName,
    required this.toolDescription,
    required this.creditCost,
    this.previewVideoUrl,
    this.showPrompt = false,
    this.promptLabel,
    this.promptPlaceholder,
    this.showIntensity = false,
    this.intensityLabel,
    this.showScale = false,
    this.showStyleSelector = false,
    this.styleOptions,
  });

  @override
  State<ImageToolLayout> createState() => _ImageToolLayoutState();
}

class StyleOption {
  final String id;
  final String label;
  
  const StyleOption({required this.id, required this.label});
}

class _ImageToolLayoutState extends State<ImageToolLayout> {
  VideoPlayerController? _videoController;
  bool _isVideoInitialized = false;

  // Form state
  String _prompt = '';
  double _intensity = 50;
  int _scale = 2;
  String? _selectedStyle;

  @override
  void initState() {
    super.initState();
    _selectedStyle = widget.styleOptions?.firstOrNull?.id;
    _initializeVideo();
  }

  void _initializeVideo() {
    if (widget.previewVideoUrl != null) {
      _videoController = VideoPlayerController.networkUrl(
        Uri.parse(widget.previewVideoUrl!),
      )..initialize().then((_) {
          if (mounted) {
            setState(() {
              _isVideoInitialized = true;
            });
            _videoController?.setLooping(true);
            _videoController?.setVolume(0);
            _videoController?.play();
          }
        });
    }
  }

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
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
      case 'angle':
        return Icons.rotate_90_degrees_ccw;
      case 'skin-enhancer':
        return Icons.face;
      case 'style-transfer':
        return Icons.palette;
      case 'background-remove':
        return Icons.content_cut;
      default:
        return Icons.image;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/create/image'),
        ),
        title: Text(widget.toolName),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Preview Card with Video
              _buildPreviewCard(),
              
              const SizedBox(height: 24),
              
              // Tool Info
              _buildToolInfo(),
              
              const SizedBox(height: 24),
              
              // Controls (if applicable)
              if (widget.showPrompt || widget.showIntensity || widget.showScale || widget.showStyleSelector)
                _buildControls(),
              
              const SizedBox(height: 24),
              
              // Upload Button
              _buildUploadButton(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPreviewCard() {
    return Container(
      width: double.infinity,
      height: 280,
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border.withOpacity(0.5)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Video or Placeholder
            if (_isVideoInitialized && _videoController != null)
              FittedBox(
                fit: BoxFit.cover,
                child: SizedBox(
                  width: _videoController!.value.size.width,
                  height: _videoController!.value.size.height,
                  child: VideoPlayer(_videoController!),
                ),
              )
            else
              Container(
                color: AppTheme.primary.withOpacity(0.1),
                child: Center(
                  child: Icon(
                    _getToolIcon(),
                    size: 64,
                    color: AppTheme.primary.withOpacity(0.5),
                  ),
                ),
              ),
            
            // Overlay gradient
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withOpacity(0.3),
                  ],
                ),
              ),
            ),
            
            // Upload hint
            Positioned(
              left: 16,
              top: 0,
              bottom: 0,
              child: Center(
                child: Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppTheme.surface.withOpacity(0.9),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppTheme.border.withOpacity(0.5)),
                  ),
                  child: const Icon(
                    Icons.add,
                    color: AppTheme.muted,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildToolInfo() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          widget.toolName.toUpperCase(),
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          widget.toolDescription,
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: AppTheme.muted,
            fontSize: 14,
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: AppTheme.primary.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.bolt, color: AppTheme.primary, size: 16),
              const SizedBox(width: 4),
              Text(
                '${widget.creditCost} credits',
                style: const TextStyle(
                  color: AppTheme.primary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildControls() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Prompt input
          if (widget.showPrompt) ...[
            Text(
              widget.promptLabel ?? 'Prompt',
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              maxLines: 3,
              decoration: InputDecoration(
                hintText: widget.promptPlaceholder ?? 'Describe the desired result...',
                hintStyle: TextStyle(color: AppTheme.muted.withOpacity(0.7)),
                filled: true,
                fillColor: AppTheme.background,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.border.withOpacity(0.5)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: AppTheme.border.withOpacity(0.5)),
                ),
              ),
              onChanged: (value) => setState(() => _prompt = value),
            ),
            const SizedBox(height: 16),
          ],
          
          // Intensity slider
          if (widget.showIntensity) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.intensityLabel ?? 'Intensity',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                Text(
                  '${_intensity.round()}%',
                  style: const TextStyle(
                    color: AppTheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Slider(
              value: _intensity,
              min: 10,
              max: 100,
              divisions: 9,
              activeColor: AppTheme.primary,
              onChanged: (value) => setState(() => _intensity = value),
            ),
            const SizedBox(height: 16),
          ],
          
          // Scale slider
          if (widget.showScale) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Scale',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
                Text(
                  '${_scale}x',
                  style: const TextStyle(
                    color: AppTheme.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Slider(
              value: _scale.toDouble(),
              min: 2,
              max: 4,
              divisions: 2,
              activeColor: AppTheme.primary,
              onChanged: (value) => setState(() => _scale = value.round()),
            ),
            const SizedBox(height: 16),
          ],
          
          // Style selector
          if (widget.showStyleSelector && widget.styleOptions != null) ...[
            const Text(
              'Style',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: widget.styleOptions!.map((style) {
                final isSelected = _selectedStyle == style.id;
                return GestureDetector(
                  onTap: () => setState(() => _selectedStyle = style.id),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primary : AppTheme.background,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? AppTheme.primary : AppTheme.border.withOpacity(0.5),
                      ),
                    ),
                    child: Text(
                      style.label,
                      style: TextStyle(
                        color: isSelected ? Colors.white : AppTheme.foreground,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        fontSize: 13,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildUploadButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: () {
          // TODO: Implement image picker and processing
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Image upload coming soon')),
          );
        },
        icon: const Icon(Icons.upload),
        label: const Text('Upload Image'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
