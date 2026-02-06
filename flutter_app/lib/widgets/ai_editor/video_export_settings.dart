import 'package:flutter/material.dart';
import '../../core/theme.dart';

/// Video export settings screen with interactive sliders and toggles
class VideoExportSettings extends StatefulWidget {
  final VoidCallback onExport;
  final VoidCallback onClose;
  final Duration videoDuration;

  const VideoExportSettings({
    super.key,
    required this.onExport,
    required this.onClose,
    this.videoDuration = const Duration(seconds: 30),
  });

  @override
  State<VideoExportSettings> createState() => _VideoExportSettingsState();
}

class _VideoExportSettingsState extends State<VideoExportSettings> {
  // Resolution: 0=480p, 1=720p, 2=1080p, 3=2K/4K
  double _resolutionValue = 2; // Default 1080p
  
  // Frame rate: 0=24, 1=25, 2=30, 3=50, 4=60
  double _frameRateValue = 2; // Default 30fps
  
  // Bitrate in Mbps (range 5-100)
  double _bitrateValue = 20;
  
  // Optical Flow toggle
  bool _opticalFlowEnabled = false;

  // Resolution labels and values
  final List<String> _resolutionLabels = ['480p', '720p', '1080p', '2K/4K'];
  final List<int> _resolutionHeights = [480, 720, 1080, 2160];
  
  // Frame rate labels and values
  final List<String> _frameRateLabels = ['24', '25', '30', '50', '60'];
  final List<int> _frameRateValues = [24, 25, 30, 50, 60];

  String get _currentResolution => _resolutionLabels[_resolutionValue.round()];
  int get _currentResolutionHeight => _resolutionHeights[_resolutionValue.round()];
  int get _currentFrameRate => _frameRateValues[_frameRateValue.round()];

  /// Calculate estimated file size based on settings
  String get _estimatedFileSize {
    // Base calculation: resolution * framerate * bitrate * duration
    final durationSeconds = widget.videoDuration.inSeconds.toDouble();
    
    // Bitrate in Mbps * duration in seconds / 8 = size in MB
    final baseSizeMB = _bitrateValue * durationSeconds / 8;
    
    // Adjust for resolution
    double resolutionMultiplier;
    switch (_resolutionValue.round()) {
      case 0: resolutionMultiplier = 0.25; break; // 480p
      case 1: resolutionMultiplier = 0.5; break;  // 720p
      case 2: resolutionMultiplier = 1.0; break;  // 1080p
      case 3: resolutionMultiplier = 2.5; break;  // 4K
      default: resolutionMultiplier = 1.0;
    }
    
    // Optical flow adds ~20% to file size
    final opticalFlowMultiplier = _opticalFlowEnabled ? 1.2 : 1.0;
    
    final totalSizeMB = baseSizeMB * resolutionMultiplier * opticalFlowMultiplier;
    
    if (totalSizeMB >= 1024) {
      return '${(totalSizeMB / 1024).toStringAsFixed(1)} GB';
    }
    return '${totalSizeMB.toStringAsFixed(0)} MB';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 12),
              decoration: BoxDecoration(
                color: AppTheme.muted.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            
            // Header with title and export button
            _buildHeader(),
            
            // Scrollable content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Resolution section
                    _buildResolutionSection(),
                    const SizedBox(height: 28),
                    
                    // Frame rate section
                    _buildFrameRateSection(),
                    const SizedBox(height: 28),
                    
                    // Bitrate section
                    _buildBitrateSection(),
                    const SizedBox(height: 28),
                    
                    // Optical Flow toggle
                    _buildOpticalFlowSection(),
                    const SizedBox(height: 32),
                    
                    // Estimated file size
                    _buildFileSizeIndicator(),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      child: Row(
        children: [
          // Close button
          GestureDetector(
            onTap: widget.onClose,
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppTheme.border),
              ),
              child: const Icon(Icons.close, color: AppTheme.foreground, size: 20),
            ),
          ),
          
          const SizedBox(width: 16),
          
          // Title
          const Expanded(
            child: Text(
              'Export Settings',
              style: TextStyle(
                color: AppTheme.foreground,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          
          // Export button
          GestureDetector(
            onTap: widget.onExport,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppTheme.primary, AppTheme.primary.withOpacity(0.8)],
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primary.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.file_download_outlined, color: Colors.white, size: 18),
                  SizedBox(width: 8),
                  Text(
                    'Export',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResolutionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section title with current value
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Resolution',
              style: TextStyle(
                color: AppTheme.foreground,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
              ),
              child: Text(
                _currentResolution,
                style: const TextStyle(
                  color: AppTheme.primary,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Higher resolution for better quality output',
          style: TextStyle(
            color: AppTheme.muted,
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 16),
        
        // Slider with marks
        _buildMarkedSlider(
          value: _resolutionValue,
          min: 0,
          max: 3,
          divisions: 3,
          labels: _resolutionLabels,
          onChanged: (value) => setState(() => _resolutionValue = value),
        ),
      ],
    );
  }

  Widget _buildFrameRateSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section title with current value
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Frame Rate',
              style: TextStyle(
                color: AppTheme.foreground,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
              ),
              child: Text(
                '${_currentFrameRate} fps',
                style: const TextStyle(
                  color: AppTheme.primary,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Smoother playback at higher frame rates',
          style: TextStyle(
            color: AppTheme.muted,
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 16),
        
        // Slider with marks
        _buildMarkedSlider(
          value: _frameRateValue,
          min: 0,
          max: 4,
          divisions: 4,
          labels: _frameRateLabels,
          onChanged: (value) => setState(() => _frameRateValue = value),
        ),
      ],
    );
  }

  Widget _buildBitrateSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section title with current value
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Bitrate',
              style: TextStyle(
                color: AppTheme.foreground,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.primary.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
              ),
              child: Text(
                '${_bitrateValue.round()} Mbps',
                style: const TextStyle(
                  color: AppTheme.primary,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Higher bitrate preserves more detail',
          style: TextStyle(
            color: AppTheme.muted,
            fontSize: 12,
          ),
        ),
        const SizedBox(height: 16),
        
        // Continuous slider with min/max labels
        Row(
          children: [
            Text(
              '5',
              style: TextStyle(
                color: AppTheme.muted,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
            Expanded(
              child: SliderTheme(
                data: _getSliderTheme(),
                child: Slider(
                  value: _bitrateValue,
                  min: 5,
                  max: 100,
                  onChanged: (value) => setState(() => _bitrateValue = value),
                ),
              ),
            ),
            Text(
              '100',
              style: TextStyle(
                color: AppTheme.muted,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildOpticalFlowSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          // Icon
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _opticalFlowEnabled 
                  ? AppTheme.primary.withOpacity(0.2) 
                  : AppTheme.muted.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.animation,
              size: 20,
              color: _opticalFlowEnabled ? AppTheme.primary : AppTheme.muted,
            ),
          ),
          const SizedBox(width: 14),
          
          // Text content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Optical Flow',
                  style: TextStyle(
                    color: AppTheme.foreground,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Enhance motion smoothness between frames',
                  style: TextStyle(
                    color: AppTheme.muted,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          
          // Toggle switch
          Switch(
            value: _opticalFlowEnabled,
            onChanged: (value) => setState(() => _opticalFlowEnabled = value),
            activeColor: AppTheme.primary,
            activeTrackColor: AppTheme.primary.withOpacity(0.4),
            inactiveThumbColor: AppTheme.muted,
            inactiveTrackColor: AppTheme.muted.withOpacity(0.3),
          ),
        ],
      ),
    );
  }

  Widget _buildFileSizeIndicator() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primary.withOpacity(0.08),
            AppTheme.accent.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.primary.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          // File icon
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.folder_outlined,
              size: 22,
              color: AppTheme.primary,
            ),
          ),
          const SizedBox(width: 14),
          
          // Size info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Estimated File Size',
                  style: TextStyle(
                    color: AppTheme.muted,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _estimatedFileSize,
                  style: const TextStyle(
                    color: AppTheme.foreground,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          
          // Quality indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: _getQualityColor().withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _getQualityColor().withOpacity(0.3)),
            ),
            child: Text(
              _getQualityLabel(),
              style: TextStyle(
                color: _getQualityColor(),
                fontSize: 11,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getQualityColor() {
    if (_resolutionValue >= 3) return AppTheme.accent;
    if (_resolutionValue >= 2) return AppTheme.success;
    if (_resolutionValue >= 1) return AppTheme.primary;
    return AppTheme.muted;
  }

  String _getQualityLabel() {
    if (_resolutionValue >= 3) return 'Ultra HD';
    if (_resolutionValue >= 2) return 'Full HD';
    if (_resolutionValue >= 1) return 'HD';
    return 'SD';
  }

  Widget _buildMarkedSlider({
    required double value,
    required double min,
    required double max,
    required int divisions,
    required List<String> labels,
    required ValueChanged<double> onChanged,
  }) {
    return Column(
      children: [
        // Slider
        SliderTheme(
          data: _getSliderTheme(),
          child: Slider(
            value: value,
            min: min,
            max: max,
            divisions: divisions,
            onChanged: onChanged,
          ),
        ),
        
        // Labels below slider
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: labels.asMap().entries.map((entry) {
              final isSelected = entry.key == value.round();
              return Text(
                entry.value,
                style: TextStyle(
                  color: isSelected ? AppTheme.primary : AppTheme.muted,
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  SliderThemeData _getSliderTheme() {
    return SliderThemeData(
      activeTrackColor: AppTheme.primary,
      inactiveTrackColor: AppTheme.secondary,
      thumbColor: AppTheme.primary,
      overlayColor: AppTheme.primary.withOpacity(0.15),
      trackHeight: 6,
      thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10),
      overlayShape: const RoundSliderOverlayShape(overlayRadius: 20),
      tickMarkShape: const RoundSliderTickMarkShape(tickMarkRadius: 3),
      activeTickMarkColor: AppTheme.primary.withOpacity(0.6),
      inactiveTickMarkColor: AppTheme.muted.withOpacity(0.3),
    );
  }
}
