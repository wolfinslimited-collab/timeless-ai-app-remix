import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';

/// Generic image tool screen for various image processing tools
class ImageToolScreen extends StatelessWidget {
  final String toolId;
  final String toolName;
  final String toolDescription;
  final int creditCost;

  const ImageToolScreen({
    super.key,
    required this.toolId,
    required this.toolName,
    required this.toolDescription,
    required this.creditCost,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/create/image'),
        ),
        title: Text(toolName),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Icon(
                  _getToolIcon(toolId),
                  size: 40,
                  color: AppTheme.primary,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                toolName,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                toolDescription,
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
                      '$creditCost credits',
                      style: const TextStyle(
                        color: AppTheme.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              const Text(
                'Coming Soon',
                style: TextStyle(
                  color: AppTheme.muted,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getToolIcon(String toolId) {
    switch (toolId) {
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
}

// Pre-configured tool screens
class RelightToolScreen extends StatelessWidget {
  const RelightToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolScreen(
      toolId: 'relight',
      toolName: 'Relight',
      toolDescription: 'AI-powered relighting for professional photo results',
      creditCost: 4,
    );
  }
}

class UpscaleToolScreen extends StatelessWidget {
  const UpscaleToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolScreen(
      toolId: 'upscale',
      toolName: 'Upscale',
      toolDescription: 'Enhance image resolution up to 4x with AI',
      creditCost: 4,
    );
  }
}

class ShotsToolScreen extends StatelessWidget {
  const ShotsToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolScreen(
      toolId: 'shots',
      toolName: 'Shots',
      toolDescription: 'Generate multiple angles and variations',
      creditCost: 6,
    );
  }
}

class InpaintingToolScreen extends StatelessWidget {
  const InpaintingToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolScreen(
      toolId: 'inpainting',
      toolName: 'Inpainting',
      toolDescription: 'Edit and replace parts of your images seamlessly',
      creditCost: 4,
    );
  }
}

class AngleToolScreen extends StatelessWidget {
  const AngleToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolScreen(
      toolId: 'angle',
      toolName: 'Change Angle',
      toolDescription: 'View your image from different perspectives',
      creditCost: 4,
    );
  }
}

class SkinEnhancerToolScreen extends StatelessWidget {
  const SkinEnhancerToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolScreen(
      toolId: 'skin-enhancer',
      toolName: 'Skin Enhancer',
      toolDescription: 'Professional portrait retouching and skin smoothing',
      creditCost: 4,
    );
  }
}

class StyleTransferToolScreen extends StatelessWidget {
  const StyleTransferToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolScreen(
      toolId: 'style-transfer',
      toolName: 'Style Transfer',
      toolDescription: 'Apply artistic styles to your photos',
      creditCost: 5,
    );
  }
}

class BackgroundRemoveToolScreen extends StatelessWidget {
  const BackgroundRemoveToolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ImageToolScreen(
      toolId: 'background-remove',
      toolName: 'Remove Background',
      toolDescription: 'Instantly remove backgrounds from any image',
      creditCost: 2,
    );
  }
}
