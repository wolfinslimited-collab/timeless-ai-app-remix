import 'dart:io';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';
import '../../providers/credits_provider.dart';

class ShotsToolScreen extends StatefulWidget {
  const ShotsToolScreen({super.key});

  @override
  State<ShotsToolScreen> createState() => _ShotsToolScreenState();
}

class _ShotsToolScreenState extends State<ShotsToolScreen> {
  final ImagePicker _picker = ImagePicker();
  
  // Steps: upload, grid, upscale
  String _currentStep = 'upload';
  
  String? _inputImageUrl;
  bool _isUploading = false;
  bool _isGenerating = false;
  bool _isUpscaling = false;
  
  List<String> _generatedImages = [];
  Set<int> _selectedImages = {};
  List<String> _upscaledImages = [];
  
  String _selectedAspectRatio = '1:1';
  
  static const int _creditCost = 10;

  final List<Map<String, String>> _cinematicAngles = const [
    {'prompt': 'SHOT 1 - MEDIUM PORTRAIT: Front-facing, head and shoulders visible, warm smile, standard headshot with space around the head', 'label': 'Portrait'},
    {'prompt': 'SHOT 2 - CONFIDENT POSE: Three-quarter body angle, ARMS FOLDED ACROSS CHEST, confident smirk, showing torso to waist level', 'label': 'Confident'},
    {'prompt': 'SHOT 3 - MACRO FACE CROP: EXTREME CLOSE-UP - crop so the face FILLS the entire frame edge to edge, forehead cropped off, chin cropped off, only showing from eyebrows to mouth, face must touch all edges', 'label': 'Macro Face'},
    {'prompt': 'SHOT 4 - LEFT SIDE PROFILE: Pure 90-degree left profile silhouette, neutral expression, artistic side view showing ear', 'label': 'Profile'},
    {'prompt': 'SHOT 5 - LOOKING UP AT SKY: Subject tilting head far UP looking at ceiling, shot from below showing underside of chin, contemplative mood', 'label': 'Looking Up'},
    {'prompt': 'SHOT 6 - TOP DOWN AERIAL: Camera directly ABOVE looking DOWN at top of head, subject looking up at camera, bird\'s eye foreshortened view', 'label': 'Top Down'},
    {'prompt': 'SHOT 7 - GLANCE BACK: View from BEHIND, subject looking back over shoulder at camera, showing back of head and partial face', 'label': 'Over Shoulder'},
    {'prompt': 'SHOT 8 - COMPLETE BACK: Full back of head and shoulders, subject facing completely AWAY, no face visible at all', 'label': 'Back View'},
    {'prompt': 'SHOT 9 - EYES ONLY CROP: Ultra tight crop showing ONLY eyes and glasses, no nose, no mouth, just eyes filling the frame horizontally', 'label': 'Eyes Detail'},
  ];

  final List<Map<String, String>> _aspectRatios = const [
    {'id': '1:1', 'label': '1:1'},
    {'id': '16:9', 'label': '16:9'},
    {'id': '9:16', 'label': '9:16'},
    {'id': '4:3', 'label': '4:3'},
    {'id': '3:4', 'label': '3:4'},
  ];

  Future<void> _pickAndUploadImage() async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 2048,
      maxHeight: 2048,
      imageQuality: 90,
    );
    
    if (image == null) return;
    
    setState(() => _isUploading = true);
    
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) throw Exception('Not authenticated');
      
      final bytes = await image.readAsBytes();
      final ext = image.path.split('.').last.toLowerCase();
      final fileName = '${user.id}/${DateTime.now().millisecondsSinceEpoch}.$ext';
      
      await Supabase.instance.client.storage
          .from('generation-inputs')
          .uploadBinary(fileName, bytes);
      
      final publicUrl = Supabase.instance.client.storage
          .from('generation-inputs')
          .getPublicUrl(fileName);
      
      setState(() {
        _inputImageUrl = publicUrl;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Image uploaded! Tap Generate to create 9 angles.')),
        );
      }
    } catch (e) {
      debugPrint('Upload error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e')),
        );
      }
    } finally {
      setState(() => _isUploading = false);
    }
  }

  Future<void> _generateShots() async {
    if (_inputImageUrl == null) return;
    
    final creditsProvider = context.read<CreditsProvider>();
    
    if (!creditsProvider.hasActiveSubscription && creditsProvider.credits < _creditCost) {
      context.push('/subscription');
      return;
    }
    
    setState(() => _isGenerating = true);
    
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('Not authenticated');
      
      final supabaseUrl = const String.fromEnvironment('SUPABASE_URL', 
          defaultValue: 'https://hpuqeabtgwbwcnklxolt.supabase.co');
      
      List<String> results = [];
      
      // Generate in batches of 3
      for (int i = 0; i < _cinematicAngles.length; i += 3) {
        final batch = _cinematicAngles.skip(i).take(3).toList();
        
        final batchResults = await Future.wait(
          batch.map((angle) => _generateSingleAngle(
            session.accessToken,
            supabaseUrl,
            angle['prompt']!,
          )),
        );
        
        results.addAll(batchResults.whereType<String>());
        
        if (i + 3 < _cinematicAngles.length) {
          await Future.delayed(const Duration(milliseconds: 500));
        }
      }
      
      if (results.isEmpty) {
        throw Exception('All generations failed');
      }
      
      setState(() {
        _generatedImages = results;
        _currentStep = 'grid';
      });
      
      creditsProvider.refresh();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${results.length} of 9 angles generated! Select favorites to upscale.')),
        );
      }
    } catch (e) {
      debugPrint('Generation error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Generation failed: $e')),
        );
      }
    } finally {
      setState(() => _isGenerating = false);
    }
  }

  Future<String?> _generateSingleAngle(String accessToken, String supabaseUrl, String prompt) async {
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'image-tools',
        body: {
          'tool': 'shots',
          'imageUrl': _inputImageUrl,
          'prompt': prompt,
          'aspectRatio': _selectedAspectRatio,
        },
      );
      
      if (response.data != null && response.data['outputUrl'] != null) {
        return response.data['outputUrl'] as String;
      }
      return null;
    } catch (e) {
      debugPrint('Single angle generation failed: $e');
      return null;
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

  Future<void> _upscaleSelected() async {
    if (_selectedImages.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one image to upscale.')),
      );
      return;
    }
    
    final creditsProvider = context.read<CreditsProvider>();
    final upscaleCost = _selectedImages.length * 3;
    
    if (!creditsProvider.hasActiveSubscription && creditsProvider.credits < upscaleCost) {
      context.push('/subscription');
      return;
    }
    
    setState(() {
      _isUpscaling = true;
      _currentStep = 'upscale';
    });
    
    try {
      final selectedUrls = _selectedImages.map((i) => _generatedImages[i]).toList();
      
      final results = await Future.wait(
        selectedUrls.map((url) => _upscaleSingleImage(url)),
      );
      
      final successfulResults = results.whereType<String>().toList();
      
      setState(() {
        _upscaledImages = successfulResults;
      });
      
      creditsProvider.refresh();
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${successfulResults.length} images upscaled to 4K!')),
        );
      }
    } catch (e) {
      debugPrint('Upscale error: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upscale failed: $e')),
        );
      }
    } finally {
      setState(() => _isUpscaling = false);
    }
  }

  Future<String?> _upscaleSingleImage(String imageUrl) async {
    try {
      final response = await Supabase.instance.client.functions.invoke(
        'image-tools',
        body: {
          'tool': 'upscale',
          'imageUrl': imageUrl,
          'scale': 4,
        },
      );
      
      if (response.data != null && response.data['outputUrl'] != null) {
        return response.data['outputUrl'] as String;
      }
      return null;
    } catch (e) {
      debugPrint('Single upscale failed: $e');
      return null;
    }
  }

  void _reset() {
    setState(() {
      _currentStep = 'upload';
      _inputImageUrl = null;
      _generatedImages = [];
      _selectedImages = {};
      _upscaledImages = [];
      _selectedAspectRatio = '1:1';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Shots', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text('Upload one image, get 9 cinematic angles', 
                style: TextStyle(fontSize: 12, color: AppTheme.muted)),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              children: [
                const Icon(Icons.auto_awesome, size: 16, color: AppTheme.primary),
                const SizedBox(width: 4),
                Text('$_creditCost', style: const TextStyle(fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Progress Steps
          _buildProgressSteps(),
          
          // Main Content
          Expanded(
            child: _buildStepContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressSteps() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildStepIndicator('1', 'Upload', _currentStep == 'upload'),
          Container(width: 32, height: 1, color: AppTheme.border),
          _buildStepIndicator('2', 'Grid', _currentStep == 'grid'),
          Container(width: 32, height: 1, color: AppTheme.border),
          _buildStepIndicator('3', 'Upscale', _currentStep == 'upscale'),
        ],
      ),
    );
  }

  Widget _buildStepIndicator(String number, String label, bool isActive) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isActive ? AppTheme.primary : AppTheme.secondary,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              number,
              style: TextStyle(
                color: isActive ? Colors.white : AppTheme.muted,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(width: 8),
        Text(
          label,
          style: TextStyle(
            color: isActive ? Colors.white : AppTheme.muted,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 'upload':
        return _buildUploadStep();
      case 'grid':
        return _buildGridStep();
      case 'upscale':
        return _buildUpscaleStep();
      default:
        return _buildUploadStep();
    }
  }

  Widget _buildUploadStep() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Preview Card
          Container(
            width: double.infinity,
            height: 280,
            decoration: BoxDecoration(
              color: AppTheme.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.border),
            ),
            child: _inputImageUrl != null
                ? Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.network(
                          _inputImageUrl!,
                          width: double.infinity,
                          height: double.infinity,
                          fit: BoxFit.contain,
                        ),
                      ),
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: 16,
                        child: ElevatedButton(
                          onPressed: _isGenerating ? null : _generateShots,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primary,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: _isGenerating
                              ? const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    ),
                                    SizedBox(width: 12),
                                    Text('Generating 9 angles...'),
                                  ],
                                )
                              : const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text('GENERATE', style: TextStyle(fontWeight: FontWeight.bold)),
                                    SizedBox(width: 8),
                                    Icon(Icons.auto_awesome, size: 18),
                                  ],
                                ),
                        ),
                      ),
                    ],
                  )
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.upload_rounded, size: 48, color: AppTheme.muted.withOpacity(0.5)),
                        const SizedBox(height: 12),
                        Text('No image uploaded yet', style: TextStyle(color: AppTheme.muted)),
                      ],
                    ),
                  ),
          ),
          const SizedBox(height: 24),
          
          // Title
          const Text(
            'SHOTS',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Upload one image, get 9 cinematic angles.\nSelect your favorites and upscale to 4K.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppTheme.muted),
          ),
          const SizedBox(height: 24),
          
          // Aspect Ratio Selector
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Output Aspect Ratio',
                style: TextStyle(color: AppTheme.muted, fontSize: 14),
              ),
              const SizedBox(height: 8),
              Row(
                children: _aspectRatios.map((ratio) {
                  final isSelected = _selectedAspectRatio == ratio['id'];
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedAspectRatio = ratio['id']!),
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primary : AppTheme.card,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSelected ? AppTheme.primary : AppTheme.border,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            ratio['label']!,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.white70,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // Upload Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _isUploading ? null : _pickAndUploadImage,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.secondary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              icon: _isUploading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.upload_rounded),
              label: Text(_isUploading ? 'Uploading...' : 'Upload image'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGridStep() {
    return Column(
      children: [
        // Header
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              const Text(
                'Select your favorites',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                '${_selectedImages.length} selected • Click to select, then upscale to 4K',
                style: TextStyle(color: AppTheme.muted, fontSize: 14),
              ),
            ],
          ),
        ),
        
        // 3x3 Grid
        Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
              ),
              itemCount: _generatedImages.length,
              itemBuilder: (context, index) {
                final isSelected = _selectedImages.contains(index);
                final label = index < _cinematicAngles.length 
                    ? _cinematicAngles[index]['label']! 
                    : 'Angle ${index + 1}';
                
                return GestureDetector(
                  onTap: () => _toggleImageSelection(index),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected ? AppTheme.primary : AppTheme.border,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(11),
                          child: Image.network(
                            _generatedImages[index],
                            fit: BoxFit.cover,
                          ),
                        ),
                        if (isSelected)
                          Positioned(
                            top: 8,
                            right: 8,
                            child: Container(
                              width: 24,
                              height: 24,
                              decoration: const BoxDecoration(
                                color: AppTheme.primary,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.check, size: 16, color: Colors.white),
                            ),
                          ),
                        Positioned(
                          bottom: 8,
                          left: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              label,
                              style: const TextStyle(fontSize: 10, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        
        // Action Buttons
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _reset,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    side: const BorderSide(color: AppTheme.border),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Start Over'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: _selectedImages.isEmpty ? null : _upscaleSelected,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.zoom_out_map, size: 18),
                      const SizedBox(width: 8),
                      Text('Upscale (${_selectedImages.length})'),
                      const SizedBox(width: 4),
                      const Icon(Icons.chevron_right, size: 18),
                    ],
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
        // Header
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text(
                _isUpscaling ? 'Upscaling to 4K...' : '4K Images Ready',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                _isUpscaling 
                    ? 'This may take a moment' 
                    : '${_upscaledImages.length} images upscaled successfully',
                style: TextStyle(color: AppTheme.muted, fontSize: 14),
              ),
            ],
          ),
        ),
        
        // Content
        Expanded(
          child: _isUpscaling
              ? const Center(
                  child: CircularProgressIndicator(color: AppTheme.primary),
                )
              : Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: _upscaledImages.length,
                    itemBuilder: (context, index) {
                      return Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppTheme.border),
                        ),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(11),
                              child: Image.network(
                                _upscaledImages[index],
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: 8,
                              right: 8,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppTheme.primary,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text(
                                  '4K',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
        ),
        
        // Reset Button
        if (!_isUpscaling)
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _reset,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  side: const BorderSide(color: AppTheme.border),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Create New Shots'),
              ),
            ),
          ),
      ],
    );
  }
}
