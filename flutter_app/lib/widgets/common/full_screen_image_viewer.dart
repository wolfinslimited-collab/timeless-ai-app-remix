import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../models/download_model.dart';
import '../../providers/download_provider.dart';
import '../../providers/favorites_provider.dart';
import 'smart_media_image.dart';

/// A full-screen image viewer with zoom, pan, and action buttons
class FullScreenImageViewer extends StatefulWidget {
  final String imageUrl;
  final String? prompt;
  final String? model;
  final String? generationId;
  final VoidCallback? onRecreate;

  const FullScreenImageViewer({
    super.key,
    required this.imageUrl,
    this.prompt,
    this.model,
    this.generationId,
    this.onRecreate,
  });

  /// Show the full screen viewer as a modal route
  static Future<void> show(
    BuildContext context, {
    required String imageUrl,
    String? prompt,
    String? model,
    String? generationId,
    VoidCallback? onRecreate,
  }) {
    return Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierDismissible: true,
        barrierColor: Colors.black87,
        pageBuilder: (context, animation, secondaryAnimation) {
          return FullScreenImageViewer(
            imageUrl: imageUrl,
            prompt: prompt,
            model: model,
            generationId: generationId,
            onRecreate: onRecreate,
          );
        },
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
      ),
    );
  }

  @override
  State<FullScreenImageViewer> createState() => _FullScreenImageViewerState();
}

class _FullScreenImageViewerState extends State<FullScreenImageViewer> {
  final TransformationController _transformationController =
      TransformationController();
  bool _showActions = true;
  bool _isSaving = false;

  @override
  void dispose() {
    _transformationController.dispose();
    super.dispose();
  }

  void _handleDoubleTap() {
    if (_transformationController.value != Matrix4.identity()) {
      _transformationController.value = Matrix4.identity();
    } else {
      _transformationController.value = Matrix4.identity()..scale(2.0);
    }
  }

  Future<void> _handleSave() async {
    if (_isSaving) return;

    setState(() => _isSaving = true);

    try {
      final downloadProvider = context.read<DownloadProvider>();
      await downloadProvider.downloadFile(
        url: widget.imageUrl,
        title: widget.prompt ?? 'Generated Image',
        type: DownloadType.image,
        saveToGallery: true,
        metadata: {
          if (widget.model != null) 'model': widget.model,
          if (widget.prompt != null) 'prompt': widget.prompt,
          if (widget.generationId != null) 'generationId': widget.generationId,
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
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  void _handleFavorite() {
    if (widget.generationId == null) return;

    final favoritesProvider = context.read<FavoritesProvider>();
    favoritesProvider.toggleFavorite(
      id: widget.generationId!,
      type: 'image',
      url: widget.imageUrl,
      thumbnailUrl: widget.imageUrl,
      title: null,
      prompt: widget.prompt,
    );

    final isFavorite = favoritesProvider.isFavorite(widget.generationId!);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isFavorite ? 'Added to favorites' : 'Removed from favorites',
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _handleRecreate() {
    Navigator.of(context).pop();
    widget.onRecreate?.call();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: GestureDetector(
        onTap: () => setState(() => _showActions = !_showActions),
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Interactive image viewer with zoom
            GestureDetector(
              onDoubleTap: _handleDoubleTap,
              child: InteractiveViewer(
                transformationController: _transformationController,
                minScale: 0.5,
                maxScale: 4.0,
                child: Center(
                  child: Hero(
                    tag: 'image_${widget.imageUrl}',
                    child: SmartMediaImage(
                      imageUrl: widget.imageUrl,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
              ),
            ),

            // Top bar with close button
            AnimatedPositioned(
              duration: const Duration(milliseconds: 200),
              top: _showActions ? 0 : -100,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black54,
                        Colors.transparent,
                      ],
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                      if (widget.model != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            widget.model!,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      const SizedBox(width: 48), // Balance the close button
                    ],
                  ),
                ),
              ),
            ),

            // Bottom action bar
            AnimatedPositioned(
              duration: const Duration(milliseconds: 200),
              bottom: _showActions ? 0 : -150,
              left: 0,
              right: 0,
              child: SafeArea(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        Colors.black54,
                        Colors.transparent,
                      ],
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Prompt text
                      if (widget.prompt != null) ...[
                        Text(
                          widget.prompt!,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 14,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Action buttons
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _ActionButton(
                            icon: Icons.download,
                            label: 'Save',
                            isLoading: _isSaving,
                            onTap: _handleSave,
                          ),
                          if (widget.generationId != null)
                            Consumer<FavoritesProvider>(
                              builder: (context, favProvider, _) {
                                final isFavorite = favProvider.isFavorite(
                                  widget.generationId!,
                                );
                                return _ActionButton(
                                  icon: isFavorite
                                      ? Icons.favorite
                                      : Icons.favorite_border,
                                  label: 'Favorite',
                                  isActive: isFavorite,
                                  onTap: _handleFavorite,
                                );
                              },
                            ),
                          if (widget.onRecreate != null)
                            _ActionButton(
                              icon: Icons.refresh,
                              label: 'Recreate',
                              onTap: _handleRecreate,
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isLoading;
  final bool isActive;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.isLoading = false,
    this.isActive = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(25),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isLoading)
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation(Colors.white),
                ),
              )
            else
              Icon(
                icon,
                color: isActive ? Colors.redAccent : Colors.white,
                size: 20,
              ),
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
