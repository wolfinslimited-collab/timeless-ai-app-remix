import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme.dart';

/// A smart image widget that handles both URL-based images and base64 data URIs.
/// 
/// For regular URLs (http:// or https://): Uses CachedNetworkImage with caching
/// For base64 data URIs (data:image/...): Decodes and displays as Image.memory
/// For videos without thumbnails: Shows a video placeholder with play icon
class SmartMediaImage extends StatelessWidget {
  final String? imageUrl;
  final BoxFit fit;
  final Widget? placeholder;
  final Widget? errorWidget;
  final bool isVideo;
  final double? width;
  final double? height;

  const SmartMediaImage({
    super.key,
    required this.imageUrl,
    this.fit = BoxFit.cover,
    this.placeholder,
    this.errorWidget,
    this.isVideo = false,
    this.width,
    this.height,
  });

  /// Check if the URL is a base64 data URI
  static bool isBase64DataUri(String? url) {
    if (url == null) return false;
    return url.startsWith('data:image/');
  }

  /// Check if the URL is a valid network URL
  static bool isNetworkUrl(String? url) {
    if (url == null) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  /// Extract base64 data from a data URI
  static Uint8List? decodeBase64DataUri(String dataUri) {
    try {
      // Format: data:image/png;base64,iVBORw0KGg...
      final parts = dataUri.split(',');
      if (parts.length != 2) return null;
      return base64Decode(parts[1]);
    } catch (e) {
      debugPrint('Error decoding base64: $e');
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (imageUrl == null || imageUrl!.isEmpty) {
      return _buildPlaceholder();
    }

    // Handle base64 data URIs
    if (isBase64DataUri(imageUrl)) {
      final bytes = decodeBase64DataUri(imageUrl!);
      if (bytes != null) {
        return Image.memory(
          bytes,
          fit: fit,
          width: width,
          height: height,
          errorBuilder: (context, error, stackTrace) {
            debugPrint('Error displaying base64 image: $error');
            return _buildErrorWidget();
          },
        );
      }
      return _buildErrorWidget();
    }

    // Handle network URLs
    if (isNetworkUrl(imageUrl)) {
      // Safely convert width/height to int, avoiding infinity/NaN
      final int? cacheWidth = (width != null && width!.isFinite) ? width!.toInt() : null;
      final int? cacheHeight = (height != null && height!.isFinite) ? height!.toInt() : null;
      
      return CachedNetworkImage(
        imageUrl: imageUrl!,
        fit: fit,
        width: width,
        height: height,
        placeholder: (context, url) => placeholder ?? _buildLoadingWidget(),
        errorWidget: (context, url, error) {
          debugPrint('Error loading network image: $error');
          return errorWidget ?? _buildErrorWidget();
        },
        // Cache settings for better performance
        memCacheWidth: cacheWidth,
        memCacheHeight: cacheHeight,
        fadeInDuration: const Duration(milliseconds: 200),
        fadeOutDuration: const Duration(milliseconds: 200),
      );
    }

    // Unknown format
    debugPrint('Unknown image URL format: ${imageUrl?.substring(0, imageUrl!.length > 50 ? 50 : imageUrl!.length)}...');
    return _buildErrorWidget();
  }

  Widget _buildPlaceholder() {
    return Container(
      width: width,
      height: height,
      color: AppTheme.secondary,
      child: Center(
        child: Icon(
          isVideo ? Icons.videocam_outlined : Icons.image_outlined,
          color: AppTheme.muted,
          size: 32,
        ),
      ),
    );
  }

  Widget _buildLoadingWidget() {
    return Container(
      width: width,
      height: height,
      color: AppTheme.secondary,
      child: const Center(
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    );
  }

  Widget _buildErrorWidget() {
    return Container(
      width: width,
      height: height,
      color: AppTheme.secondary,
      child: const Center(
        child: Icon(Icons.error_outline, color: AppTheme.muted, size: 32),
      ),
    );
  }
}

/// Widget specifically for video thumbnails that handles:
/// - Base64 thumbnails
/// - URL thumbnails  
/// - Video URL first frame extraction (shows placeholder with play icon)
class VideoThumbnailImage extends StatelessWidget {
  final String? thumbnailUrl;
  final String? videoUrl;
  final BoxFit fit;
  final double? width;
  final double? height;

  const VideoThumbnailImage({
    super.key,
    this.thumbnailUrl,
    this.videoUrl,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    // Priority: thumbnailUrl > show video placeholder
    final imageUrl = thumbnailUrl;
    
    if (imageUrl != null && imageUrl.isNotEmpty) {
      return SmartMediaImage(
        imageUrl: imageUrl,
        fit: fit,
        width: width,
        height: height,
        isVideo: true,
      );
    }

    // No thumbnail available, show video placeholder
    return Container(
      width: width,
      height: height,
      color: AppTheme.secondary,
      child: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.videocam_outlined, color: AppTheme.muted, size: 40),
            SizedBox(height: 8),
            Text(
              'Video',
              style: TextStyle(color: AppTheme.muted, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

/// A smart network image that handles both regular URLs and base64 data URIs.
/// This is a drop-in replacement for Image.network that also supports base64.
class SmartNetworkImage extends StatelessWidget {
  final String imageUrl;
  final BoxFit? fit;
  final double? width;
  final double? height;
  final Widget Function(BuildContext, Widget, ImageChunkEvent?)? loadingBuilder;
  final Widget Function(BuildContext, Object, StackTrace?)? errorBuilder;

  const SmartNetworkImage(
    this.imageUrl, {
    super.key,
    this.fit,
    this.width,
    this.height,
    this.loadingBuilder,
    this.errorBuilder,
  });

  @override
  Widget build(BuildContext context) {
    // Handle base64 data URIs
    if (SmartMediaImage.isBase64DataUri(imageUrl)) {
      final bytes = SmartMediaImage.decodeBase64DataUri(imageUrl);
      if (bytes != null) {
        return Image.memory(
          bytes,
          fit: fit,
          width: width,
          height: height,
          errorBuilder: errorBuilder ?? (context, error, stackTrace) {
            return Container(
              width: width,
              height: height,
              color: AppTheme.secondary,
              child: const Center(
                child: Icon(Icons.error_outline, color: AppTheme.muted, size: 32),
              ),
            );
          },
        );
      }
      return Container(
        width: width,
        height: height,
        color: AppTheme.secondary,
        child: const Center(
          child: Icon(Icons.error_outline, color: AppTheme.muted, size: 32),
        ),
      );
    }

    // Use regular Image.network for URLs
    return Image.network(
      imageUrl,
      fit: fit,
      width: width,
      height: height,
      loadingBuilder: loadingBuilder,
      errorBuilder: errorBuilder,
    );
  }
}
