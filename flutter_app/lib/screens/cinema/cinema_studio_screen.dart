import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../../core/config.dart';
import '../../core/theme.dart';
import '../../core/http_client.dart';
import '../../providers/credits_provider.dart';
import '../../widgets/add_credits_dialog.dart';
import '../../widgets/report_content_dialog.dart';

class CinemaStudioScreen extends StatefulWidget {
  const CinemaStudioScreen({super.key});

  @override
  State<CinemaStudioScreen> createState() => _CinemaStudioScreenState();
}

class _CinemaStudioScreenState extends State<CinemaStudioScreen> {
  final _promptController = TextEditingController();
  final _imagePicker = ImagePicker();
  
  String _mode = 'video';
  String _selectedModel = 'wan-2.6-cinema';
  String _aspectRatio = '16:9';
  int _duration = 5;
  List<String> _selectedMovements = ['static'];
  
  String? _startFrame;
  String? _endFrame;
  String? _resultUrl;
  
  bool _isGenerating = false;
  bool _showSettings = false;
  bool _showMovements = false;
  
  VideoPlayerController? _videoController;

  static const List<Map<String, dynamic>> _models = [
    {'id': 'wan-2.6-cinema', 'name': 'Wan Cinema', 'credits': 20},
    {'id': 'kling-3.0-cinema', 'name': 'Kling v3.0 Cinema', 'credits': 30},
    {'id': 'veo-3-cinema', 'name': 'Veo 3 Cinema', 'credits': 35},
    {'id': 'luma-cinema', 'name': 'Luma Cinema', 'credits': 28},
  ];

  static const List<Map<String, String>> _movements = [
    {'id': 'static', 'label': 'Static', 'icon': '📷'},
    {'id': 'dolly-in', 'label': 'Dolly In', 'icon': '➡️'},
    {'id': 'dolly-out', 'label': 'Dolly Out', 'icon': '⬅️'},
    {'id': 'pan-left', 'label': 'Pan Left', 'icon': '↩️'},
    {'id': 'pan-right', 'label': 'Pan Right', 'icon': '↪️'},
    {'id': 'tilt-up', 'label': 'Tilt Up', 'icon': '⬆️'},
    {'id': 'tilt-down', 'label': 'Tilt Down', 'icon': '⬇️'},
    {'id': 'zoom-in', 'label': 'Zoom In', 'icon': '🔍'},
    {'id': 'zoom-out', 'label': 'Zoom Out', 'icon': '🔎'},
    {'id': 'orbit', 'label': 'Orbit', 'icon': '🔄'},
  ];

  static const List<String> _aspectRatios = ['16:9', '9:16', '1:1', '21:9', '4:3'];
  static const List<int> _durations = [3, 5, 7, 10];

  Map<String, dynamic> get _currentModel => 
      _models.firstWhere((m) => m['id'] == _selectedModel, orElse: () => _models.first);

  int get _currentCost => _currentModel['credits'] as int;

  @override
  void dispose() {
    _promptController.dispose();
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _pickImage(String type) async {
    final XFile? image = await _imagePicker.pickImage(source: ImageSource.gallery);
    if (image == null) return;

    final bytes = await image.readAsBytes();
    final base64 = base64Encode(bytes);
    final dataUrl = 'data:image/jpeg;base64,$base64';

    setState(() {
      if (type == 'start') {
        _startFrame = dataUrl;
      } else {
        _endFrame = dataUrl;
      }
    });
  }

  void _toggleMovement(String id) {
    setState(() {
      if (_selectedMovements.contains(id)) {
        if (_selectedMovements.length > 1) {
          _selectedMovements.remove(id);
        }
      } else if (_selectedMovements.length < 3) {
        _selectedMovements.add(id);
      }
    });
  }

  Future<void> _generate() async {
    final creditsProvider = context.read<CreditsProvider>();
    
    if (creditsProvider.credits < _currentCost) {
      _showAddCreditsDialog();
      return;
    }

    if (_promptController.text.trim().isEmpty && _startFrame == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add a prompt or reference image')),
      );
      return;
    }

    setState(() {
      _isGenerating = true;
      _resultUrl = null;
    });

    try {
      final response = await httpClient.post(
        Uri.parse('${AppConfig.supabaseUrl}/functions/v1/cinema-tools'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${AppConfig.supabaseAnonKey}',
        },
        body: jsonEncode({
          'action': 'generate',
          'prompt': _promptController.text,
          'model': _selectedModel,
          'aspectRatio': _aspectRatio,
          'duration': _duration,
          'movements': _selectedMovements,
          'startFrame': _startFrame,
          'endFrame': _endFrame,
        }),
      );

      if (response.statusCode != 200) {
        throw Exception('Generation failed');
      }

      final data = jsonDecode(response.body);
      
      if (data['output_url'] != null) {
        _initializeVideo(data['output_url']);
        creditsProvider.refresh();
      } else if (data['task_id'] != null) {
        _pollForResult(data['task_id']);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
      setState(() => _isGenerating = false);
    }
  }

  Future<void> _pollForResult(String taskId) async {
    try {
      final response = await httpClient.post(
        Uri.parse('${AppConfig.supabaseUrl}/functions/v1/check-generation'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${AppConfig.supabaseAnonKey}',
        },
        body: jsonEncode({'task_id': taskId}),
      );

      final data = jsonDecode(response.body);
      
      if (data['status'] == 'completed' && data['output_url'] != null) {
        _initializeVideo(data['output_url']);
        context.read<CreditsProvider>().refresh();
        setState(() => _isGenerating = false);
      } else if (data['status'] == 'failed') {
        throw Exception('Generation failed');
      } else {
        await Future.delayed(const Duration(seconds: 3));
        _pollForResult(taskId);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
      setState(() => _isGenerating = false);
    }
  }

  void _initializeVideo(String url) {
    _videoController?.dispose();
    _videoController = VideoPlayerController.networkUrl(Uri.parse(url))
      ..initialize().then((_) {
        setState(() {
          _resultUrl = url;
          _isGenerating = false;
        });
        _videoController!.setLooping(true);
        _videoController!.play();
      });
  }

  void _showAddCreditsDialog() {
    final creditsProvider = context.read<CreditsProvider>();
    showAddCreditsDialog(
      context: context,
      currentCredits: creditsProvider.credits,
      requiredCredits: _currentCost,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Cinema Studio', style: TextStyle(fontSize: 16)),
            Text(
              '${_currentModel['name']} • $_currentCost credits',
              style: const TextStyle(color: AppTheme.muted, fontSize: 12),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(_showSettings ? Icons.close : Icons.settings),
            onPressed: () => setState(() => _showSettings = !_showSettings),
          ),
        ],
      ),
      body: Column(
        children: [
          // Mode Toggle
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: _ModeButton(
                    icon: Icons.videocam,
                    label: 'Video',
                    isSelected: _mode == 'video',
                    onTap: () => setState(() => _mode = 'video'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _ModeButton(
                    icon: Icons.image,
                    label: 'Image',
                    isSelected: _mode == 'image',
                    onTap: () => setState(() => _mode = 'image'),
                  ),
                ),
              ],
            ),
          ),

          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Preview Area
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Stack(
                          children: [
                            if (_resultUrl != null && _videoController != null && _videoController!.value.isInitialized)
                              VideoPlayer(_videoController!)
                            else if (_startFrame != null)
                              Image.memory(
                                base64Decode(_startFrame!.split(',').last),
                                fit: BoxFit.contain,
                                width: double.infinity,
                                height: double.infinity,
                              )
                            else
                              Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.videocam, size: 48, color: AppTheme.muted.withOpacity(0.5)),
                                    const SizedBox(height: 8),
                                    const Text('Your video will appear here', style: TextStyle(color: AppTheme.muted)),
                                  ],
                                ),
                              ),
                            
                            if (_isGenerating)
                              Container(
                                color: Colors.black54,
                                child: const Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      CircularProgressIndicator(color: AppTheme.primary),
                                      SizedBox(height: 16),
                                      Text('Generating...', style: TextStyle(color: Colors.white)),
                                    ],
                                  ),
                                ),
                              ),
                            if (_resultUrl != null && !_isGenerating)
                              Positioned(
                                top: 8,
                                right: 8,
                                child: IconButton(
                                  onPressed: () => ReportContentDialog.show(context, contentType: 'video'),
                                  icon: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Colors.black54,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(Icons.flag_outlined, color: Colors.white, size: 20),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Frame Uploads
                  Row(
                    children: [
                      Expanded(
                        child: _FrameUpload(
                          label: 'Start Frame',
                          imageData: _startFrame,
                          onTap: () => _pickImage('start'),
                          onClear: () => setState(() => _startFrame = null),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _FrameUpload(
                          label: 'End Frame (Optional)',
                          imageData: _endFrame,
                          onTap: () => _pickImage('end'),
                          onClear: () => setState(() => _endFrame = null),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Camera Movements
                  GestureDetector(
                    onTap: () => setState(() => _showMovements = !_showMovements),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.videocam, color: AppTheme.primary, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Camera: ${_selectedMovements.map((id) => _movements.firstWhere((m) => m['id'] == id)['label']).join(', ')}',
                              style: const TextStyle(fontSize: 14),
                            ),
                          ),
                          Icon(
                            _showMovements ? Icons.expand_less : Icons.expand_more,
                            color: AppTheme.muted,
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  if (_showMovements) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          childAspectRatio: 1.5,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                        ),
                        itemCount: _movements.length,
                        itemBuilder: (context, index) {
                          final movement = _movements[index];
                          final isSelected = _selectedMovements.contains(movement['id']);
                          return GestureDetector(
                            onTap: () => _toggleMovement(movement['id']!),
                            child: Container(
                              decoration: BoxDecoration(
                                color: isSelected ? AppTheme.primary.withOpacity(0.2) : AppTheme.card,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isSelected ? AppTheme.primary : AppTheme.border,
                                ),
                              ),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(movement['icon']!, style: const TextStyle(fontSize: 18)),
                                  const SizedBox(height: 2),
                                  Text(
                                    movement['label']!,
                                    style: const TextStyle(fontSize: 10),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),

                  // Settings Panel
                  if (_showSettings) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.secondary,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Model Selection
                          const Text('Model', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                          const SizedBox(height: 8),
                          GridView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              childAspectRatio: 2.5,
                              crossAxisSpacing: 8,
                              mainAxisSpacing: 8,
                            ),
                            itemCount: _models.length,
                            itemBuilder: (context, index) {
                              final model = _models[index];
                              final isSelected = _selectedModel == model['id'];
                              return GestureDetector(
                                onTap: () => setState(() => _selectedModel = model['id']),
                                child: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: isSelected ? AppTheme.primary.withOpacity(0.2) : AppTheme.card,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isSelected ? AppTheme.primary : AppTheme.border,
                                    ),
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        model['name'],
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: isSelected ? Colors.white : AppTheme.muted,
                                        ),
                                      ),
                                      Text(
                                        '${model['credits']} credits',
                                        style: TextStyle(
                                          fontSize: 9,
                                          color: isSelected ? Colors.white70 : AppTheme.muted,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 16),

                          // Aspect Ratio
                          const Text('Aspect Ratio', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                          const SizedBox(height: 8),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: _aspectRatios.map((ar) {
                                final isSelected = _aspectRatio == ar;
                                return Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: GestureDetector(
                                    onTap: () => setState(() => _aspectRatio = ar),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: isSelected ? AppTheme.primary : AppTheme.card,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        ar,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isSelected ? Colors.white : AppTheme.muted,
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Duration
                          const Text('Duration', style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                          const SizedBox(height: 8),
                          Row(
                            children: _durations.map((d) {
                              final isSelected = _duration == d;
                              return Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                  child: GestureDetector(
                                    onTap: () => setState(() => _duration = d),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      decoration: BoxDecoration(
                                        color: isSelected ? AppTheme.primary : AppTheme.card,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        '${d}s',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: isSelected ? Colors.white : AppTheme.muted,
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
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Prompt Input
                  TextField(
                    controller: _promptController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Describe your cinematic scene...',
                      hintStyle: const TextStyle(color: AppTheme.muted),
                      filled: true,
                      fillColor: AppTheme.secondary,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppTheme.primary),
                      ),
                    ),
                  ),
                  const SizedBox(height: 100), // Space for button
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Consumer<CreditsProvider>(
            builder: (context, creditsProvider, child) {
              final hasCredits = creditsProvider.credits >= _currentCost;
              return ElevatedButton(
                onPressed: _isGenerating || !hasCredits ? null : _generate,
                style: ElevatedButton.styleFrom(
                  backgroundColor: hasCredits ? AppTheme.primary : AppTheme.muted,
                  padding: const EdgeInsets.symmetric(vertical: 16),
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
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          ),
                          SizedBox(width: 12),
                          Text('Generating...'),
                        ],
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.auto_awesome, size: 20),
                          const SizedBox(width: 8),
                          Text('Generate ($_currentCost credits)'),
                        ],
                      ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _ModeButton({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : AppTheme.secondary,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: isSelected ? Colors.white : AppTheme.muted),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: isSelected ? Colors.white : AppTheme.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FrameUpload extends StatelessWidget {
  final String label;
  final String? imageData;
  final VoidCallback onTap;
  final VoidCallback onClear;

  const _FrameUpload({
    required this.label,
    required this.imageData,
    required this.onTap,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: AppTheme.muted, fontSize: 11)),
        const SizedBox(height: 6),
        GestureDetector(
          onTap: onTap,
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: Container(
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.border,
                  style: imageData == null ? BorderStyle.solid : BorderStyle.none,
                ),
              ),
              child: imageData != null
                  ? Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.memory(
                            base64Decode(imageData!.split(',').last),
                            fit: BoxFit.cover,
                            width: double.infinity,
                            height: double.infinity,
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
                  : const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.upload, size: 20, color: AppTheme.muted),
                        SizedBox(height: 4),
                        Text('Upload', style: TextStyle(color: AppTheme.muted, fontSize: 11)),
                      ],
                    ),
            ),
          ),
        ),
      ],
    );
  }
}
