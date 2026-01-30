import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path/path.dart' as path;
import 'package:share_plus/share_plus.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'dart:convert';
import '../../../core/theme.dart';
import '../../../widgets/common/smart_media_image.dart';

const List<Map<String, String>> CINEMATIC_ANGLES = [
  {
    'prompt':
        'SHOT 1 - MEDIUM PORTRAIT: Front-facing, head and shoulders visible, warm smile, standard headshot with space around the head',
    'label': 'Portrait'
  },
  {
    'prompt':
        'SHOT 2 - CONFIDENT POSE: Three-quarter body angle, ARMS FOLDED ACROSS CHEST, confident smirk, showing torso to waist level',
    'label': 'Confident'
  },
  {
    'prompt':
        'SHOT 3 - MACRO FACE CROP: EXTREME CLOSE-UP - crop so the face FILLS the entire frame edge to edge',
    'label': 'Macro Face'
  },
  {
    'prompt':
        'SHOT 4 - LEFT SIDE PROFILE: Pure 90-degree left profile silhouette, neutral expression, artistic side view showing ear',
    'label': 'Profile'
  },
  {
    'prompt':
        'SHOT 5 - LOOKING UP AT SKY: Subject tilting head far UP looking at ceiling, shot from below showing underside of chin',
    'label': 'Looking Up'
  },
  {
    'prompt':
        'SHOT 6 - TOP DOWN AERIAL: Camera directly ABOVE looking DOWN at top of head, bird\'s eye foreshortened view',
    'label': 'Top Down'
  },
  {
    'prompt':
        'SHOT 7 - GLANCE BACK: View from BEHIND, subject looking back over shoulder at camera, showing back of head and partial face',
    'label': 'Over Shoulder'
  },
  {
    'prompt':
        'SHOT 8 - COMPLETE BACK: Full back of head and shoulders, subject facing completely AWAY, no face visible at all',
    'label': 'Back View'
  },
  {
    'prompt':
        'SHOT 9 - EYES ONLY CROP: Ultra tight crop showing ONLY eyes, no nose, no mouth, just eyes filling the frame',
    'label': 'Eyes Detail'
  },
];

const List<Map<String, String>> ASPECT_RATIOS = [
  {'id': '1:1', 'label': '1:1', 'description': 'Square'},
  {'id': '16:9', 'label': '16:9', 'description': 'Landscape'},
  {'id': '9:16', 'label': '9:16', 'description': 'Portrait'},
  {'id': '4:3', 'label': '4:3', 'description': 'Classic'},
  {'id': '3:4', 'label': '3:4', 'description': 'Portrait Classic'},
];

const int CREDIT_COST = 10;

enum ShotsStep { upload, grid, upscale }

class ShotsToolScreen extends StatefulWidget {
  const ShotsToolScreen({super.key});

  @override
  State<ShotsToolScreen> createState() => _ShotsToolScreenState();
}

class _ShotsToolScreenState extends State<ShotsToolScreen> {
  final SupabaseClient _supabase = Supabase.instance.client;
  final ImagePicker _picker = ImagePicker();

  ShotsStep _step = ShotsStep.upload;
  String? _inputImageUrl;
  bool _isUploading = false;
  bool _isGenerating = false;
  bool _isUpscaling = false;
  List<String> _generatedImages = [];
  Set<int> _selectedImages = {};
  List<String> _upscaledImages = [];
  String _aspectRatio = '1:1';

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2048,
        maxHeight: 2048,
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
        _generatedImages = [];
        _selectedImages = {};
        _upscaledImages = [];
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

      _showSuccess(
          'Image uploaded. Click Generate to create 9 cinematic angles.');
    } catch (e) {
      _showError('Failed to upload image: $e');
      setState(() => _isUploading = false);
    }
  }

  Future<void> _generateAngles() async {
    if (_inputImageUrl == null) return;

    setState(() => _isGenerating = true);

    try {
      final session = _supabase.auth.currentSession;
      if (session == null) {
        throw Exception('Please sign in');
      }

      final supabaseUrl = _supabase.rest.url.replaceAll('/rest/v1', '');
      final List<String?> results = [];

      // Generate in batches of 3
      for (int i = 0; i < CINEMATIC_ANGLES.length; i += 3) {
        final batch = CINEMATIC_ANGLES.skip(i).take(3).toList();
        final batchResults = await Future.wait(
          batch.map((angle) => _generateSingleAngle(
                supabaseUrl,
                session.accessToken,
                angle['prompt']!,
              )),
        );
        results.addAll(batchResults);

        if (i + 3 < CINEMATIC_ANGLES.length) {
          await Future.delayed(const Duration(milliseconds: 500));
        }
      }

      final successfulResults = results.whereType<String>().toList();

      if (successfulResults.isEmpty) {
        throw Exception('All angle generations failed');
      }

      setState(() {
        _generatedImages = successfulResults;
        _step = ShotsStep.grid;
        _isGenerating = false;
      });

      _showSuccess('${successfulResults.length} of 9 angles generated!');
    } catch (e) {
      _showError('Generation failed: $e');
      setState(() => _isGenerating = false);
    }
  }

  Future<String?> _generateSingleAngle(
      String supabaseUrl, String accessToken, String prompt) async {
    try {
      final response = await http.post(
        Uri.parse('$supabaseUrl/functions/v1/image-tools'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $accessToken',
          'apikey': _supabase.rest.headers['apikey'] ?? '',
        },
        body: jsonEncode({
          'tool': 'shots',
          'imageUrl': _inputImageUrl,
          'prompt': prompt,
          'aspectRatio': _aspectRatio,
        }),
      );

      if (response.statusCode != 200) {
        return null;
      }

      final result = jsonDecode(response.body);
      return result['outputUrl'];
    } catch (e) {
      return null;
    }
  }

  Future<void> _upscaleSelected() async {
    if (_selectedImages.isEmpty) {
      _showError('Please select at least one image to upscale.');
      return;
    }

    setState(() {
      _isUpscaling = true;
      _step = ShotsStep.upscale;
    });

    try {
      final session = _supabase.auth.currentSession;
      if (session == null) {
        throw Exception('Please sign in');
      }

      final supabaseUrl = _supabase.rest.url.replaceAll('/rest/v1', '');
      final selectedUrls =
          _selectedImages.map((i) => _generatedImages[i]).toList();

      final results = await Future.wait(
        selectedUrls.map((imageUrl) async {
          final response = await http.post(
            Uri.parse('$supabaseUrl/functions/v1/image-tools'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${session.accessToken}',
              'apikey': _supabase.rest.headers['apikey'] ?? '',
            },
            body: jsonEncode({
              'tool': 'upscale',
              'imageUrl': imageUrl,
              'scale': 4,
            }),
          );

          if (response.statusCode != 200) {
            return null;
          }

          final result = jsonDecode(response.body);
          return result['outputUrl'] as String?;
        }),
      );

      final successfulResults = results.whereType<String>().toList();

      setState(() {
        _upscaledImages = successfulResults;
        _isUpscaling = false;
      });

      _showSuccess('${successfulResults.length} images upscaled to 4K!');
    } catch (e) {
      _showError('Upscale failed: $e');
      setState(() => _isUpscaling = false);
    }
  }

  void _toggleImageSelection(int index) {
    setState(() {
      if (_selectedImages.contains(index)) {
        _selectedImages.remove(index);
      } else {
        _selectedImages.add(index);
      }
    });
  }

  Future<void> _downloadImage(String imageUrl, int index) async {
    try {
      final response = await http.get(Uri.parse(imageUrl));
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/shot-${index + 1}-4k.png');
      await file.writeAsBytes(response.bodyBytes);
      await Share.shareXFiles([XFile(file.path)]);
    } catch (e) {
      _showError('Download failed: $e');
    }
  }

  Future<void> _downloadAll(List<String> urls, String prefix) async {
    for (int i = 0; i < urls.length; i++) {
      await _downloadImage(urls[i], i);
    }
    _showSuccess('${urls.length} images downloaded.');
  }

  void _reset() {
    setState(() {
      _step = ShotsStep.upload;
      _inputImageUrl = null;
      _generatedImages = [];
      _selectedImages = {};
      _upscaledImages = [];
      _aspectRatio = '1:1';
    });
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
      //   title: const Column(
      //     crossAxisAlignment: CrossAxisAlignment.start,
      //     children: [
      //       Text('Shots', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
      //       Text(
      //         'Upload one image, get 9 cinematic angles',
      //         style: TextStyle(fontSize: 12, color: AppTheme.muted),
      //       ),
      //     ],
      //   ),
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
      //             '$CREDIT_COST',
      //             style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w600),
      //           ),
      //         ],
      //       ),
      //     ),
      //   ],
      // ),
      body: Column(
        children: [
          // Progress Steps
          _buildProgressSteps(),

          // Content
          Expanded(
            child: _buildStepContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressSteps() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
      child: Row(
        children: [
          _buildStepIndicator(1, 'Upload', _step == ShotsStep.upload),
          _buildStepConnector(),
          _buildStepIndicator(2, 'Grid', _step == ShotsStep.grid),
          _buildStepConnector(),
          _buildStepIndicator(3, 'Upscale', _step == ShotsStep.upscale),
        ],
      ),
    );
  }

  Widget _buildStepIndicator(int number, String label, bool isActive) {
    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isActive ? AppTheme.primary : Colors.grey[800],
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              '$number',
              style: TextStyle(
                color: isActive ? Colors.black : Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isActive ? Colors.white : AppTheme.muted,
          ),
        ),
      ],
    );
  }

  Widget _buildStepConnector() {
    return Expanded(
      child: Container(
        height: 2,
        margin: const EdgeInsets.symmetric(horizontal: 8),
        color: Colors.grey[800],
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_step) {
      case ShotsStep.upload:
        return _buildUploadStep();
      case ShotsStep.grid:
        return _buildGridStep();
      case ShotsStep.upscale:
        return _buildUpscaleStep();
    }
  }

  Widget _buildUploadStep() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Preview Card
          Expanded(
            child: GestureDetector(
              onTap: _inputImageUrl == null ? _pickImage : null,
              child: Container(
                width: double.infinity,
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
                          fit: StackFit.expand,
                          children: [
                            SmartNetworkImage(
                              _inputImageUrl!,
                              fit: BoxFit.contain,
                            ),
                            Positioned(
                              bottom: 16,
                              left: 16,
                              right: 16,
                              child: ElevatedButton.icon(
                                onPressed:
                                    _isGenerating ? null : _generateAngles,
                                icon: _isGenerating
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.black),
                                      )
                                    : const Icon(Icons.auto_awesome),
                                label: Text(_isGenerating
                                    ? 'Generating...'
                                    : 'Generate 9 Angles'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppTheme.primary,
                                  foregroundColor: Colors.black,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Aspect Ratio Selector
          if (_inputImageUrl != null) ...[
            const Text('Aspect Ratio',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ASPECT_RATIOS.map((ratio) {
                  final isSelected = _aspectRatio == ratio['id'];
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(ratio['label']!),
                      selected: isSelected,
                      onSelected: (_) =>
                          setState(() => _aspectRatio = ratio['id']!),
                      selectedColor: AppTheme.primary,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.black : Colors.white,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ],
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
                size: 64, color: AppTheme.muted),
          const SizedBox(height: 16),
          Text(
            _isUploading ? 'Uploading...' : 'Upload an image to start',
            style: const TextStyle(color: AppTheme.muted, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildGridStep() {
    return Column(
      children: [
        // Grid of generated images
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(8),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: _generatedImages.length,
            itemBuilder: (context, index) {
              final isSelected = _selectedImages.contains(index);
              return GestureDetector(
                onTap: () => _toggleImageSelection(index),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: SmartNetworkImage(
                        _generatedImages[index],
                        fit: BoxFit.cover,
                      ),
                    ),
                    if (isSelected)
                      Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.primary, width: 3),
                        ),
                        child: Align(
                          alignment: Alignment.topRight,
                          child: Container(
                            margin: const EdgeInsets.all(4),
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: AppTheme.primary,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.check,
                                color: Colors.black, size: 16),
                          ),
                        ),
                      ),
                    Positioned(
                      bottom: 4,
                      left: 4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          CINEMATIC_ANGLES[index < CINEMATIC_ANGLES.length
                              ? index
                              : 0]['label']!,
                          style: const TextStyle(
                              fontSize: 10, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),

        // Actions
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _downloadAll(_generatedImages, 'shot'),
                  icon: const Icon(Icons.download),
                  label: const Text('Download All'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _selectedImages.isEmpty ? null : _upscaleSelected,
                  icon: const Icon(Icons.hd),
                  label: Text('Upscale (${_selectedImages.length})'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildUpscaleStep() {
    return Column(
      children: [
        Expanded(
          child: _isUpscaling
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(),
                      SizedBox(height: 16),
                      Text('Upscaling to 4K...',
                          style: TextStyle(color: AppTheme.muted)),
                    ],
                  ),
                )
              : GridView.builder(
                  padding: const EdgeInsets.all(8),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 8,
                    mainAxisSpacing: 8,
                  ),
                  itemCount: _upscaledImages.length,
                  itemBuilder: (context, index) {
                    return Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: SmartNetworkImage(
                            _upscaledImages[index],
                            fit: BoxFit.cover,
                          ),
                        ),
                        Positioned(
                          top: 8,
                          right: 8,
                          child: IconButton(
                            onPressed: () =>
                                _downloadImage(_upscaledImages[index], index),
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
                          top: 8,
                          left: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppTheme.primary,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              '4K',
                              style: TextStyle(
                                color: Colors.black,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
        ),

        // Done Button
        Padding(
          padding: const EdgeInsets.all(16),
          child: SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _reset,
              icon: const Icon(Icons.refresh),
              label: const Text('Start Over'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
