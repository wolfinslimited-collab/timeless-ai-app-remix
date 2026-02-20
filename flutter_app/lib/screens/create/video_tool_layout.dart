import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:video_player/video_player.dart';
import 'package:http/http.dart' as http;
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:convert';
import '../../core/theme.dart';
import '../../widgets/report_content_dialog.dart';
import '../../providers/credits_provider.dart';
import '../../models/download_model.dart';
import '../../providers/download_provider.dart';
import '../../widgets/common/smart_media_image.dart';
import '../../widgets/add_credits_dialog.dart';

class VideoToolLayout extends StatefulWidget {
  final String title;
  final String description;
  final String toolId;
  final int creditCost;
  final bool showVideoUpload;
  final bool showImageUpload;
  final bool showAudioUpload;
  final bool showPrompt;
  final String promptPlaceholder;
  final bool showDuration;
  final bool showUpscaleFactor;
  final bool showTargetFps;

  const VideoToolLayout({
    super.key,
    required this.title,
    required this.description,
    required this.toolId,
    required this.creditCost,
    this.showVideoUpload = true,
    this.showImageUpload = false,
    this.showAudioUpload = false,
    this.showPrompt = false,
    this.promptPlaceholder = 'Describe what you want...',
    this.showDuration = false,
    this.showUpscaleFactor = false,
    this.showTargetFps = false,
  });

  @override
  State<VideoToolLayout> createState() => _VideoToolLayoutState();
}

class _VideoToolLayoutState extends State<VideoToolLayout> {
  final _promptController = TextEditingController();
  String? _inputVideoUrl;
  String? _inputImageUrl;
  String? _inputAudioUrl;
  String? _outputUrl;
  bool _isProcessing = false;
  bool _isUploading = false;
  bool _isPolling = false;
  int _duration = 5;
  int _upscaleFactor = 2;
  int _targetFps = 60;
  String? _processingStatus;
  VideoPlayerController? _videoController;

  @override
  void dispose() {
    _promptController.dispose();
    _videoController?.dispose();
    super.dispose();
  }

  Future<void> _pickVideo() async {
    final picker = ImagePicker();
    final video = await picker.pickVideo(source: ImageSource.gallery);
    if (video == null) return;

    setState(() => _isUploading = true);
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('Not authenticated');

      final file = File(video.path);
      final bytes = await file.readAsBytes();
      final fileName =
          '${session.user.id}/${DateTime.now().millisecondsSinceEpoch}-${video.name}';

      await Supabase.instance.client.storage
          .from('generation-inputs')
          .uploadBinary(fileName, bytes);

      final publicUrl = Supabase.instance.client.storage
          .from('generation-inputs')
          .getPublicUrl(fileName);

      setState(() => _inputVideoUrl = publicUrl);
      _showSnackBar('Video uploaded');
    } catch (e) {
      _showSnackBar('Failed to upload video');
    } finally {
      setState(() => _isUploading = false);
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery);
    if (image == null) return;

    setState(() => _isUploading = true);
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('Not authenticated');

      final file = File(image.path);
      final bytes = await file.readAsBytes();
      final fileName =
          '${session.user.id}/${DateTime.now().millisecondsSinceEpoch}-${image.name}';

      await Supabase.instance.client.storage
          .from('generation-inputs')
          .uploadBinary(fileName, bytes);

      final publicUrl = Supabase.instance.client.storage
          .from('generation-inputs')
          .getPublicUrl(fileName);

      setState(() => _inputImageUrl = publicUrl);
      _showSnackBar('Image uploaded');
    } catch (e) {
      _showSnackBar('Failed to upload image');
    } finally {
      setState(() => _isUploading = false);
    }
  }

  Future<void> _pickAudio() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.audio,
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;

        // Check file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          _showSnackBar('Audio must be under 50MB');
          return;
        }

        final user = Supabase.instance.client.auth.currentUser;
        if (user == null) {
          _showSnackBar('Please sign in to upload');
          return;
        }

        setState(() => _isUploading = true);

        final fileName =
            '${user.id}/${DateTime.now().millisecondsSinceEpoch}_${file.name}';
        final bytes = file.bytes;

        if (bytes != null) {
          await Supabase.instance.client.storage
              .from('generation-inputs')
              .uploadBinary(
                fileName,
                bytes,
                fileOptions: FileOptions(
                  contentType: file.extension != null
                      ? 'audio/${file.extension}'
                      : 'audio/mpeg',
                ),
              );

          final publicUrl = Supabase.instance.client.storage
              .from('generation-inputs')
              .getPublicUrl(fileName);

          setState(() {
            _inputAudioUrl = publicUrl;
          });

          _showSnackBar('Audio uploaded successfully');
        } else if (file.path != null) {
          final fileBytes = await File(file.path!).readAsBytes();
          await Supabase.instance.client.storage
              .from('generation-inputs')
              .uploadBinary(
                fileName,
                fileBytes,
                fileOptions: FileOptions(
                  contentType: file.extension != null
                      ? 'audio/${file.extension}'
                      : 'audio/mpeg',
                ),
              );

          final publicUrl = Supabase.instance.client.storage
              .from('generation-inputs')
              .getPublicUrl(fileName);

          setState(() {
            _inputAudioUrl = publicUrl;
          });

          _showSnackBar('Audio uploaded successfully');
        }
      }
    } catch (e) {
      debugPrint('Audio pick error: $e');
      _showSnackBar('Failed to upload audio');
    } finally {
      setState(() => _isUploading = false);
    }
  }

  Future<void> _process() async {
    final session = Supabase.instance.client.auth.currentSession;
    if (session == null) {
      _showSnackBar('Please sign in');
      return;
    }

    final creditsProvider = context.read<CreditsProvider>();
    if (!creditsProvider.hasActiveSubscription &&
        creditsProvider.credits < widget.creditCost) {
      showAddCreditsDialog(
        context: context,
        currentCredits: creditsProvider.credits,
        requiredCredits: widget.creditCost,
      );
      return;
    }

    setState(() {
      _isProcessing = true;
      _outputUrl = null;
      _processingStatus = 'Starting...';
    });

    try {
      final supabaseUrl =
          Supabase.instance.client.rest.url.replaceAll('/rest/v1', '');
      final response = await http.post(
        Uri.parse('$supabaseUrl/functions/v1/video-tools'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${session.accessToken}',
          'apikey': Supabase.instance.client.rest.headers['apikey'] ?? '',
        },
        body: jsonEncode({
          'tool': widget.toolId,
          'videoUrl': _inputVideoUrl,
          'imageUrl': _inputImageUrl,
          'audioUrl': _inputAudioUrl,
          'prompt':
              _promptController.text.isNotEmpty ? _promptController.text : null,
          'duration': _duration,
          'upscaleFactor': _upscaleFactor,
          'targetFps': _targetFps,
        }),
      );

      final result = jsonDecode(response.body);

      if (response.statusCode != 200) {
        throw Exception(result['error'] ?? 'Processing failed');
      }

      // Handle background processing with polling
      if (result['status'] == 'processing' && result['taskId'] != null) {
        setState(() => _processingStatus = 'Processing video...');
        await _pollForCompletion(
          taskId: result['taskId'] as String,
          endpoint: result['endpoint'] as String?,
          generationId: result['generationId'] as String?,
        );
        creditsProvider.refresh();
      } else if (result['outputUrl'] != null) {
        // Immediate result
        setState(() => _outputUrl = result['outputUrl']);
        _initializeVideoPlayer(result['outputUrl']);
        _showSnackBar('Processing complete!');
        creditsProvider.refresh();
      }
    } catch (e) {
      _showSnackBar(e.toString());
      setState(() => _isProcessing = false);
    }
  }

  Future<void> _pollForCompletion({
    required String taskId,
    String? endpoint,
    String? generationId,
  }) async {
    if (_isPolling) return;
    _isPolling = true;

    const maxAttempts = 120;
    const pollInterval = Duration(seconds: 3);

    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) throw Exception('Not authenticated');

      final supabaseUrl =
          Supabase.instance.client.rest.url.replaceAll('/rest/v1', '');

      for (int attempt = 0; attempt < maxAttempts; attempt++) {
        await Future.delayed(pollInterval);
        if (!mounted) return;

        try {
          final response = await http.post(
            Uri.parse('$supabaseUrl/functions/v1/check-generation'),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ${session.accessToken}',
              'apikey': Supabase.instance.client.rest.headers['apikey'] ?? '',
            },
            body: jsonEncode({
              'taskId': taskId,
              'endpoint': endpoint,
              'generationId': generationId,
            }),
          );

          final result = jsonDecode(response.body);
          final status = result['status'] as String?;

          if (status == 'completed') {
            final outputUrl = result['output_url'] as String?;
            if (outputUrl != null && mounted) {
              setState(() {
                _outputUrl = outputUrl;
                _isProcessing = false;
                _processingStatus = null;
              });
              _initializeVideoPlayer(outputUrl);
              _showSnackBar('Processing complete!');
            }
            return;
          } else if (status == 'failed') {
            throw Exception(result['error'] ?? 'Processing failed');
          }

          // Update progress indicator
          final progress = result['progress'];
          if (progress != null && mounted) {
            setState(() {
              _processingStatus = 'Processing... ${(progress * 100).toInt()}%';
            });
          }
        } catch (e) {
          debugPrint('Polling error: $e');
          // Continue polling on error
        }
      }

      // Max attempts reached
      if (mounted) {
        _showSnackBar('Processing is taking longer than expected. Check Library for results.');
        setState(() => _isProcessing = false);
      }
    } finally {
      _isPolling = false;
      if (mounted && _isProcessing) {
        setState(() => _isProcessing = false);
      }
    }
  }

  Future<void> _initializeVideoPlayer(String url) async {
    _videoController?.dispose();
    _videoController = VideoPlayerController.networkUrl(Uri.parse(url));
    await _videoController!.initialize();
    _videoController!.setLooping(true);
    _videoController!.play();
    setState(() {});
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  bool get _canProcess {
    if (widget.showVideoUpload && _inputVideoUrl == null) return false;
    if (widget.showImageUpload && _inputImageUrl == null) return false;
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // appBar: AppBar(
      //   title: Text(widget.title),
      //   actions: [
      //     Padding(
      //       padding: const EdgeInsets.only(right: 16),
      //       child: Center(
      //         child: Container(
      //           padding:
      //               const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      //           decoration: BoxDecoration(
      //             color: AppTheme.primary.withOpacity(0.2),
      //             borderRadius: BorderRadius.circular(16),
      //           ),
      //           child: Text(
      //             '${widget.creditCost} credits',
      //             style: const TextStyle(
      //               color: AppTheme.primary,
      //               fontSize: 12,
      //               fontWeight: FontWeight.w500,
      //             ),
      //           ),
      //         ),
      //       ),
      //     ),
      //   ],
      // ),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Description
              Text(
                widget.description,
                style: const TextStyle(color: AppTheme.muted, fontSize: 14),
              ),
              const SizedBox(height: 24),

              // Video Upload
              if (widget.showVideoUpload) _buildVideoUpload(),

              // Image Upload
              if (widget.showImageUpload) _buildImageUpload(),

              // Audio Upload
              if (widget.showAudioUpload) _buildAudioUpload(),

              // Prompt
              if (widget.showPrompt) ...[
                const SizedBox(height: 16),
                const Text('Prompt',
                    style: TextStyle(fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                TextField(
                  controller: _promptController,
                  decoration: InputDecoration(
                    hintText: widget.promptPlaceholder,
                    hintStyle: const TextStyle(color: AppTheme.muted),
                    filled: true,
                    fillColor: AppTheme.secondary,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  maxLines: 2,
                ),
              ],

              // Duration Slider
              if (widget.showDuration) ...[
                const SizedBox(height: 16),
                _buildSlider(
                    'Duration', '${_duration}s', _duration.toDouble(), 3, 10,
                    (v) {
                  setState(() => _duration = v.round());
                }),
              ],

              // Upscale Factor
              if (widget.showUpscaleFactor) ...[
                const SizedBox(height: 16),
                _buildSlider('Upscale Factor', '${_upscaleFactor}x',
                    _upscaleFactor.toDouble(), 2, 4, (v) {
                  setState(() => _upscaleFactor = v.round());
                }),
              ],

              // Target FPS
              if (widget.showTargetFps) ...[
                const SizedBox(height: 16),
                _buildSlider('Target FPS', '$_targetFps fps',
                    _targetFps.toDouble(), 30, 120, (v) {
                  setState(() => _targetFps = (v / 15).round() * 15);
                }),
              ],

              const SizedBox(height: 24),

              // Process Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isProcessing || !_canProcess ? null : _process,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isProcessing
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
                            Text('Processing...'),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.auto_awesome, size: 20),
                            const SizedBox(width: 8),
                            Text('Process (${widget.creditCost} credits)'),
                          ],
                        ),
                ),
              ),

              const SizedBox(height: 24),

              // Output Section
              const Text('Output',
                  style: TextStyle(fontWeight: FontWeight.w500)),
              const SizedBox(height: 8),
              _buildOutputSection(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVideoUpload() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Input Video',
            style: TextStyle(fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        if (_inputVideoUrl != null)
          Stack(
            children: [
              Container(
                width: double.infinity,
                height: 200,
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SmartNetworkImage(
                    _inputVideoUrl!,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const Center(
                      child:
                          Icon(Icons.videocam, size: 48, color: AppTheme.muted),
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: () => setState(() => _inputVideoUrl = null),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child:
                        const Icon(Icons.close, color: Colors.white, size: 16),
                  ),
                ),
              ),
            ],
          )
        else
          GestureDetector(
            onTap: _isUploading ? null : _pickVideo,
            child: Container(
              width: double.infinity,
              height: 200,
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.border,
                  style: BorderStyle.solid,
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_isUploading)
                    const CircularProgressIndicator()
                  else ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(32),
                      ),
                      child: const Icon(Icons.videocam,
                          size: 32, color: AppTheme.primary),
                    ),
                    const SizedBox(height: 12),
                    const Text('Upload Video',
                        style: TextStyle(fontWeight: FontWeight.w500)),
                    const SizedBox(height: 4),
                    const Text('Max 100MB',
                        style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildImageUpload() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Input Image / Sketch',
            style: TextStyle(fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        if (_inputImageUrl != null)
          Stack(
            children: [
              Container(
                width: double.infinity,
                height: 200,
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child:
                      SmartNetworkImage(_inputImageUrl!, fit: BoxFit.contain),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: () => setState(() => _inputImageUrl = null),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child:
                        const Icon(Icons.close, color: Colors.white, size: 16),
                  ),
                ),
              ),
            ],
          )
        else
          GestureDetector(
            onTap: _isUploading ? null : _pickImage,
            child: Container(
              width: double.infinity,
              height: 200,
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_isUploading)
                    const CircularProgressIndicator()
                  else ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(32),
                      ),
                      child: const Icon(Icons.image,
                          size: 32, color: AppTheme.primary),
                    ),
                    const SizedBox(height: 12),
                    const Text('Upload Image',
                        style: TextStyle(fontWeight: FontWeight.w500)),
                    const SizedBox(height: 4),
                    const Text('Max 10MB',
                        style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildAudioUpload() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        const Text('Audio File', style: TextStyle(fontWeight: FontWeight.w500)),
        const SizedBox(height: 8),
        if (_inputAudioUrl != null)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.secondary,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.music_note, color: AppTheme.primary),
                const SizedBox(width: 12),
                const Expanded(
                    child: Text('Audio uploaded',
                        style: TextStyle(color: AppTheme.muted))),
                GestureDetector(
                  onTap: () => setState(() => _inputAudioUrl = null),
                  child: const Icon(Icons.close, color: Colors.red, size: 20),
                ),
              ],
            ),
          )
        else
          GestureDetector(
            onTap: _pickAudio,
            child: Container(
              width: double.infinity,
              height: 80,
              decoration: BoxDecoration(
                color: AppTheme.secondary,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.border),
              ),
              child: const Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.music_note, color: AppTheme.primary),
                  SizedBox(height: 8),
                  Text('Upload Audio (Max 50MB)',
                      style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildSlider(String label, String value, double current, double min,
      double max, ValueChanged<double> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
            Text(value,
                style: const TextStyle(color: AppTheme.muted, fontSize: 14)),
          ],
        ),
        const SizedBox(height: 8),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(
            activeTrackColor: AppTheme.primary,
            inactiveTrackColor: AppTheme.border,
            thumbColor: AppTheme.primary,
          ),
          child: Slider(
            value: current,
            min: min,
            max: max,
            onChanged: onChanged,
          ),
        ),
      ],
    );
  }

  Widget _buildOutputSection() {
    return Container(
      width: double.infinity,
      height: 200,
      decoration: BoxDecoration(
        color: AppTheme.secondary,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: _isProcessing
          ? Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 64,
                      height: 64,
                      child: CircularProgressIndicator(
                        strokeWidth: 4,
                        color: AppTheme.primary.withOpacity(0.3),
                      ),
                    ),
                    const Icon(Icons.auto_awesome,
                        color: AppTheme.primary, size: 24),
                  ],
                ),
                const SizedBox(height: 16),
                Text(_processingStatus ?? 'Processing video...',
                    style: const TextStyle(color: AppTheme.muted)),
                if (_isPolling) ...[
                  const SizedBox(height: 8),
                  const Text('This may take a few minutes...',
                      style: TextStyle(color: AppTheme.muted, fontSize: 12)),
                ],
              ],
            )
          : _outputUrl != null
              ? Stack(
                  children: [
                    if (_videoController != null &&
                        _videoController!.value.isInitialized)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: AspectRatio(
                          aspectRatio: _videoController!.value.aspectRatio,
                          child: VideoPlayer(_videoController!),
                        ),
                      )
                    else
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child:
                            SmartNetworkImage(_outputUrl!, fit: BoxFit.contain),
                      ),
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ElevatedButton.icon(
                            onPressed: _downloadOutput,
                            icon: const Icon(Icons.download, size: 16),
                            label: const Text('Save'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 8),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton.icon(
                            onPressed: _shareOutput,
                            icon: const Icon(Icons.share, size: 16),
                            label: const Text('Share'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.card,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 8),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            onPressed: () => ReportContentDialog.show(context, contentType: 'Video'),
                            icon: const Icon(Icons.flag_outlined, size: 16, color: Colors.white70),
                            tooltip: 'Report',
                            style: IconButton.styleFrom(
                              backgroundColor: AppTheme.card,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                )
              : const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.videocam, size: 48, color: AppTheme.muted),
                    SizedBox(height: 12),
                    Text('Result will appear here',
                        style: TextStyle(color: AppTheme.muted)),
                  ],
                ),
    );
  }

  Future<void> _downloadOutput() async {
    if (_outputUrl == null) return;

    try {
      final downloadProvider = context.read<DownloadProvider>();

      await downloadProvider.downloadFile(
        url: _outputUrl!,
        title: _promptController.text.isNotEmpty
            ? _promptController.text
            : '${widget.title} Output',
        type: DownloadType.video,
        metadata: {
          'tool': widget.toolId,
          'prompt': _promptController.text,
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
    }
  }

  Future<void> _shareOutput() async {
    if (_outputUrl == null) return;

    try {
      final response = await http.get(Uri.parse(_outputUrl!));
      final tempDir = await getTemporaryDirectory();
      final fileName =
          '${widget.toolId}-${DateTime.now().millisecondsSinceEpoch}.mp4';
      final file = File('${tempDir.path}/$fileName');
      await file.writeAsBytes(response.bodyBytes);

      await Share.shareXFiles([XFile(file.path)],
          text: 'Created with ${widget.title}');
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
}
