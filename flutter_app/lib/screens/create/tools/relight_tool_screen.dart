import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path/path.dart' as path;
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../../core/theme.dart';
import '../../../models/download_model.dart';
import '../../../services/download_service.dart';
import '../../../widgets/common/smart_media_image.dart';

const List<Map<String, dynamic>> LIGHT_DIRECTIONS = [
  {'id': 'top', 'label': 'Top'},
  {'id': 'front', 'label': 'Front'},
  {'id': 'right', 'label': 'Right'},
  {'id': 'left', 'label': 'Left'},
  {'id': 'back', 'label': 'Back'},
  {'id': 'bottom', 'label': 'Bottom'},
];

const List<Map<String, String>> LIGHT_MODES = [
  {'id': 'soft', 'label': 'Soft'},
  {'id': 'hard', 'label': 'Hard'},
];

const int CREDIT_COST = 2;

class RelightToolScreen extends StatefulWidget {
  const RelightToolScreen({super.key});

  @override
  State<RelightToolScreen> createState() => _RelightToolScreenState();
}

class _RelightToolScreenState extends State<RelightToolScreen> {
  final SupabaseClient _supabase = Supabase.instance.client;
  final ImagePicker _picker = ImagePicker();

  String? _inputImageUrl;
  String? _outputImageUrl;
  List<String> _generationHistory = [];
  int? _selectedPreviewIndex; // null = original
  bool _isUploading = false;
  bool _isProcessing = false;

  // Light controls
  String _selectedDirection = 'front';
  String _lightMode = 'soft';
  double _brightness = 50;
  Color _lightColor = Colors.white;
  Offset _lightPosition = Offset.zero;
  bool _isDragging = false;

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 4096,
        maxHeight: 4096,
      );

      if (image == null) return;

      final file = File(image.path);
      final fileSize = await file.length();

      if (fileSize > 10 * 1024 * 1024) {
        _showError('File too large. Maximum size is 10MB.');
        return;
      }

      setState(() {
        _isUploading = true;
        _outputImageUrl = null;
        _generationHistory = [];
        _selectedPreviewIndex = null;
      });

      final user = _supabase.auth.currentUser;
      if (user == null) {
        _showError('Please sign in to use this tool');
        setState(() => _isUploading = false);
        return;
      }

      final bytes = await file.readAsBytes();
      final ext = path.extension(image.path).replaceFirst('.', '');
      final fileName =
          '${user.id}/${DateTime.now().millisecondsSinceEpoch}.$ext';

      await _supabase.storage
          .from('generation-inputs')
          .uploadBinary(fileName, bytes);
      final publicUrl =
          _supabase.storage.from('generation-inputs').getPublicUrl(fileName);

      setState(() {
        _inputImageUrl = publicUrl;
        _isUploading = false;
      });
    } catch (e) {
      _showError('Failed to upload image: $e');
      setState(() => _isUploading = false);
    }
  }

  void _updateLightPositionFromDirection(String direction) {
    final positions = {
      'top': const Offset(0, -0.8),
      'bottom': const Offset(0, 0.8),
      'left': const Offset(-0.8, 0),
      'right': const Offset(0.8, 0),
      'front': const Offset(0, 0),
      'back': const Offset(0, 0.5),
    };
    setState(() {
      _lightPosition = positions[direction] ?? Offset.zero;
      _selectedDirection = direction;
    });
  }

  Future<void> _processImage() async {
    if (_inputImageUrl == null) return;

    setState(() {
      _isProcessing = true;
      _outputImageUrl = null;
    });

    try {
      final session = _supabase.auth.currentSession;
      if (session == null) {
        throw Exception('Please sign in');
      }

      final lightingPrompt =
          '$_lightMode $_selectedDirection lighting, brightness ${_brightness.toInt()}%';
      final supabaseUrl = _supabase.rest.url.replaceAll('/rest/v1', '');

      final response = await http.post(
        Uri.parse('$supabaseUrl/functions/v1/image-tools'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${session.accessToken}',
          'apikey': _supabase.rest.headers['apikey'] ?? '',
        },
        body: jsonEncode({
          'tool': 'relight',
          'imageUrl': _inputImageUrl,
          'prompt': lightingPrompt,
          'intensity': _brightness.toInt(),
          'lightDirection': _selectedDirection.isNotEmpty
              ? _selectedDirection
              : 'x:${_lightPosition.dx.toStringAsFixed(2)},y:${_lightPosition.dy.toStringAsFixed(2)}',
          'lightMode': _lightMode,
          'lightColor':
              '#${_lightColor.value.toRadixString(16).padLeft(8, '0').substring(2)}',
        }),
      );

      final result = jsonDecode(response.body);

      if (response.statusCode != 200) {
        throw Exception(result['error'] ?? 'Processing failed');
      }

      setState(() {
        _outputImageUrl = result['outputUrl'];
        _generationHistory.add(result['outputUrl']);
        _selectedPreviewIndex = _generationHistory.length - 1;
        _isProcessing = false;
      });

      _showSuccess('Relight completed!');
    } catch (e) {
      _showError('Processing failed: $e');
      setState(() => _isProcessing = false);
    }
  }

  /// Normalize API response: may be http URL, data:image/...;base64,..., or raw base64.
  String _normalizeImageUrl(String urlOrBase64) {
    if (urlOrBase64.startsWith('http://') || urlOrBase64.startsWith('https://')) {
      return urlOrBase64;
    }
    if (urlOrBase64.startsWith('data:image/')) {
      return urlOrBase64;
    }
    return 'data:image/png;base64,$urlOrBase64';
  }

  Future<void> _downloadImage() async {
    final imageUrl = _selectedPreviewIndex == null
        ? _inputImageUrl
        : _generationHistory[_selectedPreviewIndex!];
    if (imageUrl == null) return;

    try {
      final downloadService = DownloadService();
      final normalized = _normalizeImageUrl(imageUrl);
      await downloadService.downloadFile(
        url: normalized,
        title: 'relight-${DateTime.now().millisecondsSinceEpoch}',
        type: DownloadType.image,
        saveToGallery: true,
      );
      if (mounted) _showSuccess('Saved to gallery.');
    } on Exception catch (e) {
      final msg = e.toString();
      if (msg.contains('PERMISSION_DENIED') || msg.contains('Photo library')) {
        if (mounted) _showError('Photo library access denied. Enable it in Settings to save to gallery.');
      } else {
        if (mounted) _showError('Save failed: ${e.toString().replaceFirst(RegExp(r'^Exception:?\s*'), '')}');
      }
    }
  }

  void _reset() {
    setState(() {
      _inputImageUrl = null;
      _outputImageUrl = null;
      _generationHistory = [];
      _selectedPreviewIndex = null;
      _selectedDirection = 'front';
      _lightMode = 'soft';
      _brightness = 50;
      _lightColor = Colors.white;
      _lightPosition = Offset.zero;
    });
  }

  String get _displayedImage {
    if (_selectedPreviewIndex == null) {
      return _inputImageUrl ?? '';
    }
    return _generationHistory[_selectedPreviewIndex!];
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.green),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      // appBar: AppBar(
      //   backgroundColor: Colors.transparent,
      //   elevation: 0,
      //   leading: IconButton(
      //     icon: const Icon(Icons.arrow_back),
      //     onPressed: () => context.go('/create/image'),
      //   ),
      //   title: const Text('Relight'),
      //   actions: [
      //     Container(
      //       margin: const EdgeInsets.only(right: 16),
      //       padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      //       decoration: BoxDecoration(
      //         color: AppTheme.primary.withOpacity(0.1),
      //         borderRadius: BorderRadius.circular(20),
      //       ),
      //       child: Row(
      //         children: [
      //           Icon(Icons.bolt, size: 16, color: AppTheme.primary),
      //           const SizedBox(width: 4),
      //           Text(
      //             '$CREDIT_COST credits',
      //             style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600),
      //           ),
      //         ],
      //       ),
      //     ),
      //   ],
      // ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Image Preview
              _buildImagePreview(),

              const SizedBox(height: 24),

              // Light Controls
              if (_inputImageUrl != null) ...[
                _buildLightControls(),
                const SizedBox(height: 24),
              ],

              // Action Button
              _buildActionButton(),

              const SizedBox(height: 16),

              // Generation History
              if (_generationHistory.isNotEmpty) _buildHistory(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImagePreview() {
    return GestureDetector(
      onTap: _inputImageUrl == null ? _pickImage : null,
      child: Container(
        width: double.infinity,
        height: 280,
        decoration: BoxDecoration(
          color: Colors.grey[900],
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.border.withOpacity(0.5)),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(15),
          child: _inputImageUrl == null
              ? _buildUploadPlaceholder()
              : Stack(
                  children: [
                    SmartNetworkImage(
                      _displayedImage,
                      width: double.infinity,
                      height: double.infinity,
                      fit: BoxFit.contain,
                      loadingBuilder: (context, child, progress) {
                        if (progress == null) return child;
                        return Center(
                          child: CircularProgressIndicator(
                            value: progress.expectedTotalBytes != null
                                ? progress.cumulativeBytesLoaded /
                                    progress.expectedTotalBytes!
                                : null,
                          ),
                        );
                      },
                    ),
                    if (_selectedPreviewIndex != null)
                      Positioned(
                        top: 8,
                        right: 8,
                        child: IconButton(
                          onPressed: _downloadImage,
                          icon: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.download,
                                color: Colors.white, size: 20),
                          ),
                        ),
                      ),
                    Positioned(
                      left: 8,
                      top: 8,
                      child: GestureDetector(
                        onTap: _pickImage,
                        child: Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.add,
                              color: Colors.white, size: 20),
                        ),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildUploadPlaceholder() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (_isUploading)
            const CircularProgressIndicator()
          else
            const Icon(Icons.cloud_upload_outlined,
                size: 48, color: AppTheme.muted),
          const SizedBox(height: 12),
          Text(
            _isUploading ? 'Uploading...' : 'Upload an image to start',
            style: const TextStyle(color: AppTheme.muted),
          ),
        ],
      ),
    );
  }

  Widget _buildLightControls() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[900],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quick Select Directions
          const Text('Light Direction',
              style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: LIGHT_DIRECTIONS.map((dir) {
              final isSelected = _selectedDirection == dir['id'];
              return ChoiceChip(
                label: Text(dir['label']),
                selected: isSelected,
                onSelected: (_) => _updateLightPositionFromDirection(dir['id']),
                selectedColor: AppTheme.primary,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.black : Colors.white,
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 20),

          // Light Mode
          const Text('Light Mode',
              style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Row(
            children: LIGHT_MODES.map((mode) {
              final isSelected = _lightMode == mode['id'];
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: ChoiceChip(
                    label: Text(mode['label']!),
                    selected: isSelected,
                    onSelected: (_) => setState(() => _lightMode = mode['id']!),
                    selectedColor: AppTheme.primary,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.black : Colors.white,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 20),

          // Brightness Slider
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Brightness',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              Text('${_brightness.toInt()}%',
                  style: const TextStyle(color: AppTheme.muted)),
            ],
          ),
          const SizedBox(height: 8),
          Slider(
            value: _brightness,
            min: 10,
            max: 100,
            divisions: 9,
            activeColor: AppTheme.primary,
            onChanged: (value) => setState(() => _brightness = value),
          ),

          const SizedBox(height: 16),

          // Light Color
          const Text('Light Color',
              style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildColorOption(Colors.white, 'White'),
              _buildColorOption(Colors.amber, 'Warm'),
              _buildColorOption(Colors.lightBlue, 'Cool'),
              _buildColorOption(Colors.orange, 'Orange'),
              _buildColorOption(Colors.purple, 'Purple'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildColorOption(Color color, String label) {
    final isSelected = _lightColor == color;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _lightColor = color),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.3),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSelected ? AppTheme.primary : Colors.transparent,
              width: 2,
            ),
          ),
          child: Column(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white24),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  color: isSelected ? AppTheme.primary : Colors.white70,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton() {
    if (_inputImageUrl == null) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: _pickImage,
          icon: const Icon(Icons.upload),
          label: const Text('Upload Image'),
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primary,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      );
    }

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _isProcessing ? null : _processImage,
        icon: _isProcessing
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.black),
              )
            : const Icon(Icons.auto_awesome),
        label: Text(_isProcessing ? 'Processing...' : 'Apply Relight'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primary,
          foregroundColor: Colors.black,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }

  Widget _buildHistory() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Generation History',
            style: TextStyle(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        SizedBox(
          height: 80,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: _generationHistory.length + 1, // +1 for original
            itemBuilder: (context, index) {
              final isOriginal = index == 0;
              final isSelected = isOriginal
                  ? _selectedPreviewIndex == null
                  : _selectedPreviewIndex == index - 1;

              return GestureDetector(
                onTap: () {
                  setState(() {
                    _selectedPreviewIndex = isOriginal ? null : index - 1;
                  });
                },
                child: Container(
                  width: 80,
                  height: 80,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isSelected ? AppTheme.primary : Colors.transparent,
                      width: 2,
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        SmartNetworkImage(
                          isOriginal
                              ? _inputImageUrl!
                              : _generationHistory[index - 1],
                          fit: BoxFit.cover,
                        ),
                        if (isOriginal)
                          Container(
                            color: Colors.black38,
                            child: const Center(
                              child: Text('Original',
                                  style: TextStyle(fontSize: 10)),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
