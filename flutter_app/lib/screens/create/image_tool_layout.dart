import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path/path.dart' as path;
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/theme.dart';
import '../../services/tools_service.dart';
import '../../models/download_model.dart';
import '../../providers/download_provider.dart';

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
  final SupabaseClient _supabase = Supabase.instance.client;
  final ToolsService _toolsService = ToolsService();
  final ImagePicker _picker = ImagePicker();

  VideoPlayerController? _videoController;
  bool _isVideoInitialized = false;

  // State
  String? _inputImageUrl;
  File? _inputImageFile;
  String? _outputImageUrl;
  bool _isUploading = false;
  bool _isProcessing = false;

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

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 4096,
        maxHeight: 4096,
        imageQuality: 95,
      );

      if (image == null) return;

      final file = File(image.path);
      final fileSize = await file.length();

      // Check file size (max 10MB)
      if (fileSize > 10 * 1024 * 1024) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('File too large. Maximum size is 10MB.'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      setState(() {
        _inputImageFile = file;
        _outputImageUrl = null;
      });

      // Upload to Supabase storage
      await _uploadImage(file);
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

  Future<void> _uploadImage(File file) async {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in to use this tool'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isUploading = true);

    try {
      final fileExt = path.extension(file.path).replaceFirst('.', '');
      final fileName =
          '${user.id}/${DateTime.now().millisecondsSinceEpoch}.$fileExt';

      await _supabase.storage.from('generation-inputs').upload(fileName, file);

      final publicUrl =
          _supabase.storage.from('generation-inputs').getPublicUrl(fileName);

      setState(() {
        _inputImageUrl = publicUrl;
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
        setState(() => _isUploading = false);
      }
    }
  }

  Future<void> _processImage() async {
    if (_inputImageUrl == null) return;

    // Check credits - open dialog if not enough
    // For now, proceed with processing
    setState(() {
      _isProcessing = true;
      _outputImageUrl = null;
    });

    try {
      final options = <String, dynamic>{};

      if (widget.showPrompt && _prompt.isNotEmpty) {
        options['prompt'] = _prompt;
      }
      if (widget.showIntensity) {
        options['intensity'] = _intensity.round();
      }
      if (widget.showScale) {
        options['scale'] = _scale;
      }
      if (widget.showStyleSelector && _selectedStyle != null) {
        options['style'] = _selectedStyle;
      }

      final result = await _toolsService.runImageTool(
        tool: widget.toolId,
        imageUrl: _inputImageUrl!,
        options: options.isEmpty ? null : options,
      );

      if (result['outputUrl'] != null) {
        setState(() {
          _outputImageUrl = result['outputUrl'] as String;
        });

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${widget.toolName} completed!'),
              backgroundColor: AppTheme.primary,
            ),
          );
        }
      } else {
        throw Exception('No output received');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Processing failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  Future<void> _downloadImage() async {
    if (_outputImageUrl == null) return;

    try {
      // Use download provider to save and track
      final downloadProvider = context.read<DownloadProvider>();
      
      await downloadProvider.downloadFile(
        url: _outputImageUrl!,
        title: _prompt.isNotEmpty ? _prompt : '${widget.toolName} Output',
        type: DownloadType.image,
        metadata: {
          'tool': widget.toolId,
          'prompt': _prompt,
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
            content: Text('Download failed: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _shareImage() async {
    if (_outputImageUrl == null) return;

    try {
      final response = await http.get(Uri.parse(_outputImageUrl!));
      final tempDir = await getTemporaryDirectory();
      final fileName =
          '${widget.toolId}-${DateTime.now().millisecondsSinceEpoch}.png';
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(response.bodyBytes);

      await Share.shareXFiles([XFile(file.path)],
          text: 'Created with ${widget.toolName}');
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

  void _useAsInput() {
    if (_outputImageUrl != null) {
      setState(() {
        _inputImageUrl = _outputImageUrl;
        _inputImageFile = null;
        _outputImageUrl = null;
      });
    }
  }

  void _reset() {
    setState(() {
      _inputImageUrl = null;
      _inputImageFile = null;
      _outputImageUrl = null;
      _prompt = '';
      _intensity = 50;
      _scale = 2;
      _selectedStyle = widget.styleOptions?.firstOrNull?.id;
    });
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
        actions: [
          if (_inputImageUrl != null || _outputImageUrl != null)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _reset,
              tooltip: 'Reset',
            ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Tool Info Header
              _buildToolInfo(),

              const SizedBox(height: 24),

              // Input Section
              _buildInputSection(),

              const SizedBox(height: 24),

              // Controls (if image is uploaded)
              if (_inputImageUrl != null && _outputImageUrl == null) ...[
                _buildControls(),
                const SizedBox(height: 24),
              ],

              // Output Section
              if (_outputImageUrl != null) ...[
                _buildOutputSection(),
                const SizedBox(height: 24),
              ],

              // Action Button
              _buildActionButton(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildToolInfo() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border.withOpacity(0.5)),
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
            child: Icon(
              _getToolIcon(),
              color: AppTheme.primary,
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.toolName,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  widget.toolDescription,
                  style: const TextStyle(
                    color: AppTheme.muted,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.bolt, color: AppTheme.primary, size: 14),
                const SizedBox(width: 4),
                Text(
                  '${widget.creditCost}',
                  style: const TextStyle(
                    color: AppTheme.primary,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputSection() {
    final hasInput = _inputImageUrl != null || _inputImageFile != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Input Image',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: hasInput ? null : _pickImage,
          child: Container(
            width: double.infinity,
            height: 280,
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: hasInput
                    ? AppTheme.primary.withOpacity(0.5)
                    : AppTheme.border.withOpacity(0.5),
                width: hasInput ? 2 : 1,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(15),
              child:
                  hasInput ? _buildInputPreview() : _buildUploadPlaceholder(),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInputPreview() {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Image preview
        if (_inputImageFile != null)
          Image.file(
            _inputImageFile!,
            fit: BoxFit.contain,
          )
        else if (_inputImageUrl != null)
          Image.network(
            _inputImageUrl!,
            fit: BoxFit.contain,
            loadingBuilder: (context, child, loadingProgress) {
              if (loadingProgress == null) return child;
              return Center(
                child: CircularProgressIndicator(
                  value: loadingProgress.expectedTotalBytes != null
                      ? loadingProgress.cumulativeBytesLoaded /
                          loadingProgress.expectedTotalBytes!
                      : null,
                  color: AppTheme.primary,
                ),
              );
            },
            errorBuilder: (context, error, stackTrace) {
              return const Center(
                child: Icon(Icons.error_outline, color: Colors.red, size: 48),
              );
            },
          ),

        // Upload indicator
        if (_isUploading)
          Container(
            color: Colors.black.withOpacity(0.5),
            child: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: Colors.white),
                  SizedBox(height: 12),
                  Text(
                    'Uploading...',
                    style: TextStyle(color: Colors.white),
                  ),
                ],
              ),
            ),
          ),

        // Clear button
        if (!_isUploading)
          Positioned(
            top: 8,
            right: 8,
            child: GestureDetector(
              onTap: _reset,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.close,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildUploadPlaceholder() {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Video preview background
        if (_isVideoInitialized && _videoController != null)
          Opacity(
            opacity: 0.6,
            child: FittedBox(
              fit: BoxFit.cover,
              child: SizedBox(
                width: _videoController!.value.size.width,
                height: _videoController!.value.size.height,
                child: VideoPlayer(_videoController!),
              ),
            ),
          )
        else
          Container(
            color: AppTheme.primary.withOpacity(0.05),
          ),

        // Upload overlay
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

        // Upload icon and text
        Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.9),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.border.withOpacity(0.5)),
                ),
                child: Icon(
                  Icons.add_photo_alternate,
                  size: 48,
                  color: AppTheme.primary.withOpacity(0.8),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Tap to upload image',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  shadows: [
                    Shadow(color: Colors.black54, blurRadius: 4),
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'JPG, PNG, WEBP up to 10MB',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 13,
                  shadows: const [
                    Shadow(color: Colors.black54, blurRadius: 4),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildControls() {
    if (!widget.showPrompt &&
        !widget.showIntensity &&
        !widget.showScale &&
        !widget.showStyleSelector) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Settings',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 16),

          // Prompt input
          if (widget.showPrompt) ...[
            Text(
              widget.promptLabel ?? 'Prompt',
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              maxLines: 3,
              decoration: InputDecoration(
                hintText: widget.promptPlaceholder ??
                    'Describe the desired result...',
                hintStyle: TextStyle(color: AppTheme.muted.withOpacity(0.7)),
                filled: true,
                fillColor: AppTheme.background,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide:
                      BorderSide(color: AppTheme.border.withOpacity(0.5)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide:
                      BorderSide(color: AppTheme.border.withOpacity(0.5)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppTheme.primary),
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
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${_intensity.round()}%',
                    style: const TextStyle(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SliderTheme(
              data: SliderTheme.of(context).copyWith(
                activeTrackColor: AppTheme.primary,
                inactiveTrackColor: AppTheme.border,
                thumbColor: AppTheme.primary,
                overlayColor: AppTheme.primary.withOpacity(0.2),
              ),
              child: Slider(
                value: _intensity,
                min: 10,
                max: 100,
                divisions: 9,
                onChanged: (value) => setState(() => _intensity = value),
              ),
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
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '${_scale}x',
                    style: const TextStyle(
                      color: AppTheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SliderTheme(
              data: SliderTheme.of(context).copyWith(
                activeTrackColor: AppTheme.primary,
                inactiveTrackColor: AppTheme.border,
                thumbColor: AppTheme.primary,
                overlayColor: AppTheme.primary.withOpacity(0.2),
              ),
              child: Slider(
                value: _scale.toDouble(),
                min: 2,
                max: 4,
                divisions: 2,
                onChanged: (value) => setState(() => _scale = value.round()),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Style selector
          if (widget.showStyleSelector && widget.styleOptions != null) ...[
            const Text(
              'Style',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                fontSize: 14,
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: widget.styleOptions!.map((style) {
                final isSelected = _selectedStyle == style.id;
                return GestureDetector(
                  onTap: () => setState(() => _selectedStyle = style.id),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color:
                          isSelected ? AppTheme.primary : AppTheme.background,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected
                            ? AppTheme.primary
                            : AppTheme.border.withOpacity(0.5),
                      ),
                    ),
                    child: Text(
                      style.label,
                      style: TextStyle(
                        color: isSelected ? Colors.white : AppTheme.foreground,
                        fontWeight:
                            isSelected ? FontWeight.w600 : FontWeight.normal,
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

  Widget _buildOutputSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Result',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 16,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.black,
            borderRadius: BorderRadius.circular(16),
            border:
                Border.all(color: AppTheme.primary.withOpacity(0.5), width: 2),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(15),
            child: Column(
              children: [
                // Output image
                Image.network(
                  _outputImageUrl!,
                  fit: BoxFit.contain,
                  loadingBuilder: (context, child, loadingProgress) {
                    if (loadingProgress == null) return child;
                    return Container(
                      height: 280,
                      color: Colors.black,
                      child: Center(
                        child: CircularProgressIndicator(
                          value: loadingProgress.expectedTotalBytes != null
                              ? loadingProgress.cumulativeBytesLoaded /
                                  loadingProgress.expectedTotalBytes!
                              : null,
                          color: AppTheme.primary,
                        ),
                      ),
                    );
                  },
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      height: 280,
                      color: Colors.black,
                      child: const Center(
                        child: Icon(Icons.error_outline,
                            color: Colors.red, size: 48),
                      ),
                    );
                  },
                ),

                // Action buttons
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.background,
                    border: Border(
                      top: BorderSide(color: AppTheme.border.withOpacity(0.5)),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _downloadImage,
                          icon: const Icon(Icons.download, size: 18),
                          label: const Text('Save'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.foreground,
                            side: BorderSide(
                                color: AppTheme.border.withOpacity(0.5)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _shareImage,
                          icon: const Icon(Icons.share, size: 18),
                          label: const Text('Share'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.foreground,
                            side: BorderSide(
                                color: AppTheme.border.withOpacity(0.5)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _useAsInput,
                          icon: const Icon(Icons.replay, size: 18),
                          label: const Text('Use'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.foreground,
                            side: BorderSide(
                                color: AppTheme.border.withOpacity(0.5)),
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton() {
    // If no image uploaded, show upload button
    if (_inputImageUrl == null) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: _pickImage,
          icon: const Icon(Icons.add_photo_alternate),
          label: const Text('Select Image'),
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

    // If output exists, show new image button
    if (_outputImageUrl != null) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: _reset,
          icon: const Icon(Icons.add_photo_alternate),
          label: const Text('Process New Image'),
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

    // Show process button
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _isProcessing || _isUploading ? null : _processImage,
        icon: _isProcessing
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Icon(Icons.auto_awesome),
        label:
            Text(_isProcessing ? 'Processing...' : 'Apply ${widget.toolName}'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppTheme.primary.withOpacity(0.6),
          disabledForegroundColor: Colors.white70,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      ),
    );
  }
}
