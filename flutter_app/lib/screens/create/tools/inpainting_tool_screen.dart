import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:path/path.dart' as path;
import 'package:share_plus/share_plus.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../../widgets/common/smart_media_image.dart';

class InpaintingToolScreen extends StatefulWidget {
  final String mode;

  const InpaintingToolScreen({
    super.key,
    this.mode = 'inpainting',
  });

  @override
  State<InpaintingToolScreen> createState() => _InpaintingToolScreenState();
}

class _InpaintingToolScreenState extends State<InpaintingToolScreen> {
  final ImagePicker _picker = ImagePicker();
  final GlobalKey _canvasKey = GlobalKey();
  final TextEditingController _promptController = TextEditingController();

  String? _inputImageUrl;
  Uint8List? _inputImageBytes;
  String? _outputImageUrl;
  bool _isUploading = false;
  bool _isProcessing = false;
  double _brushSize = 30;
  bool _isPaintMode = true; // true = paint, false = erase
  bool _isEditorMode = false; // Full screen editor mode

  // Drawing state
  List<DrawingStroke> _strokes = [];
  DrawingStroke? _currentStroke;
  ui.Image? _loadedImage;
  Size? _imageSize;

  // Canvas display info for coordinate transformation
  Size? _canvasDisplaySize;
  Offset? _canvasOffset;
  double? _displayScale;

  String get toolName =>
      widget.mode == 'inpainting' ? 'Inpainting' : 'Object Erase';
  String get toolDescription => widget.mode == 'inpainting'
      ? 'Paint over areas to replace with AI-generated content'
      : 'Paint over objects to remove them from the image';
  int get creditCost => widget.mode == 'inpainting' ? 5 : 4;
  String get toolId =>
      widget.mode == 'inpainting' ? 'inpainting' : 'object-erase';

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2048,
        maxHeight: 2048,
      );

      if (image == null) return;

      setState(() {
        _isUploading = true;
        _outputImageUrl = null;
        _strokes = [];
        _currentStroke = null;
      });

      final bytes = await image.readAsBytes();
      final user = Supabase.instance.client.auth.currentUser;

      if (user == null) {
        _showError('Please sign in to use this tool');
        setState(() => _isUploading = false);
        return;
      }

      final ext = path.extension(image.path).replaceAll('.', '');
      final fileName =
          '${user.id}/${DateTime.now().millisecondsSinceEpoch}.$ext';

      await Supabase.instance.client.storage
          .from('generation-inputs')
          .uploadBinary(fileName, bytes);

      final publicUrl = Supabase.instance.client.storage
          .from('generation-inputs')
          .getPublicUrl(fileName);

      // Load the image for canvas display
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();

      setState(() {
        _inputImageUrl = publicUrl;
        _inputImageBytes = bytes;
        _loadedImage = frame.image;
        _imageSize =
            Size(frame.image.width.toDouble(), frame.image.height.toDouble());
        _isUploading = false;
        _isEditorMode = true; // Enter full screen editor mode
      });
    } catch (e) {
      _showError('Failed to upload image: $e');
      setState(() => _isUploading = false);
    }
  }

  void _clearMask() {
    setState(() {
      _strokes = [];
      _currentStroke = null;
    });
  }

  void _exitEditorMode() {
    setState(() {
      _isEditorMode = false;
    });
  }

  void _removeImage() {
    setState(() {
      _inputImageUrl = null;
      _inputImageBytes = null;
      _outputImageUrl = null;
      _loadedImage = null;
      _imageSize = null;
      _strokes = [];
      _currentStroke = null;
      _isEditorMode = false;
    });
  }

  Future<Uint8List?> _generateMaskImage() async {
    if (_loadedImage == null || _imageSize == null) return null;

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final width = _imageSize!.width;
    final height = _imageSize!.height;

    // Fill with black (unmasked area) - matches web implementation
    canvas.drawRect(
      Rect.fromLTWH(0, 0, width, height),
      Paint()..color = Colors.black,
    );

    // Draw all strokes as filled circles along the path - matches web implementation
    for (final stroke in _strokes) {
      final paint = Paint()
        ..color = stroke.isErase ? Colors.black : Colors.white
        ..style = PaintingStyle.fill;

      // Draw filled circles at each point (like web's arc-based drawing)
      for (final point in stroke.points) {
        canvas.drawCircle(point, stroke.brushSize / 2, paint);
      }
    }

    final picture = recorder.endRecording();
    final img = await picture.toImage(width.toInt(), height.toInt());
    final byteData = await img.toByteData(format: ui.ImageByteFormat.png);

    return byteData?.buffer.asUint8List();
  }

  Future<void> _processImage() async {
    if (_inputImageUrl == null || _strokes.isEmpty) {
      _showError('Please upload an image and paint a mask');
      return;
    }

    setState(() => _isProcessing = true);

    try {
      final maskBytes = await _generateMaskImage();
      if (maskBytes == null) {
        throw Exception('Failed to generate mask');
      }

      // Convert mask to base64 data URL - matches web implementation
      final maskBase64 = base64Encode(maskBytes);
      final maskDataUrl = 'data:image/png;base64,$maskBase64';

      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) {
        throw Exception('Please sign in to continue');
      }

      // Get Supabase URL from the client
      final supabaseUrl =
          Supabase.instance.client.rest.url.replaceAll('/rest/v1', '');

      // Get prompt value - for object-erase, always use "remove object"
      final promptValue = widget.mode == 'inpainting'
          ? (_promptController.text.isNotEmpty
              ? _promptController.text
              : 'seamless blend')
          : 'remove object';

      debugPrint('Inpainting request - tool: $toolId, prompt: $promptValue');

      final response = await http.post(
        Uri.parse('$supabaseUrl/functions/v1/image-tools'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${session.accessToken}',
          'apikey': Supabase.instance.client.rest.headers['apikey'] ?? '',
        },
        body: jsonEncode({
          'tool': toolId,
          'imageUrl': _inputImageUrl,
          'maskUrl': maskDataUrl,
          'prompt': promptValue,
        }),
      );

      debugPrint('Response status: ${response.statusCode}');
      debugPrint('Response body: ${response.body}');

      final result = jsonDecode(response.body);

      if (response.statusCode != 200) {
        throw Exception(result['error'] ?? 'Processing failed');
      }

      setState(() {
        _outputImageUrl = result['outputUrl'];
        _isProcessing = false;
        _isEditorMode = false; // Exit editor mode to show result
      });

      _showSuccess('$toolName completed successfully!');
    } catch (e) {
      _showError('Processing failed: $e');
      setState(() => _isProcessing = false);
    }
  }

  Future<void> _downloadOutput() async {
    if (_outputImageUrl == null) return;

    try {
      final response = await http.get(Uri.parse(_outputImageUrl!));
      await Share.shareXFiles([
        XFile.fromData(
          response.bodyBytes,
          name: '$toolId-${DateTime.now().millisecondsSinceEpoch}.png',
          mimeType: 'image/png',
        ),
      ]);
    } catch (e) {
      _showError('Download failed: $e');
    }
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

  // Calculate image display parameters for coordinate transformation
  void _updateCanvasLayout(Size canvasSize) {
    if (_imageSize == null) return;

    final scaleX = canvasSize.width / _imageSize!.width;
    final scaleY = canvasSize.height / _imageSize!.height;
    final scale = scaleX < scaleY ? scaleX : scaleY;

    final scaledWidth = _imageSize!.width * scale;
    final scaledHeight = _imageSize!.height * scale;
    final offsetX = (canvasSize.width - scaledWidth) / 2;
    final offsetY = (canvasSize.height - scaledHeight) / 2;

    _canvasDisplaySize = canvasSize;
    _canvasOffset = Offset(offsetX, offsetY);
    _displayScale = scale;
  }

  // Convert screen coordinates to image coordinates
  Offset? _screenToImageCoords(Offset screenPos, Size canvasSize) {
    if (_imageSize == null) return null;

    // Calculate scale to fit image in canvas
    final scaleX = canvasSize.width / _imageSize!.width;
    final scaleY = canvasSize.height / _imageSize!.height;
    final scale = scaleX < scaleY ? scaleX : scaleY;

    final scaledWidth = _imageSize!.width * scale;
    final scaledHeight = _imageSize!.height * scale;
    final offsetX = (canvasSize.width - scaledWidth) / 2;
    final offsetY = (canvasSize.height - scaledHeight) / 2;

    // Convert to image coordinates
    final imageX = (screenPos.dx - offsetX) / scale;
    final imageY = (screenPos.dy - offsetY) / scale;

    // Clamp to image bounds
    if (imageX < 0 ||
        imageX > _imageSize!.width ||
        imageY < 0 ||
        imageY > _imageSize!.height) {
      return null;
    }

    return Offset(imageX, imageY);
  }

  @override
  Widget build(BuildContext context) {
    // Show full-screen editor when in editor mode
    if (_isEditorMode) {
      return _buildFullScreenEditor();
    }

    return _buildMainScreen();
  }

  Widget _buildMainScreen() {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Upload Section
            _buildSectionCard(
              theme: theme,
              title: 'Select Image',
              child: _inputImageUrl == null
                  ? _buildUploadArea(theme)
                  : _buildImagePreview(theme),
            ),

            const SizedBox(height: 16),

            // Result Section
            _buildSectionCard(
              theme: theme,
              title: 'Result',
              child: _buildResultArea(theme),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFullScreenEditor() {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            // Top toolbar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              color: Colors.black,
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: _exitEditorMode,
                  ),
                  const Spacer(),
                  Text(
                    toolName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: _strokes.isEmpty || _isProcessing
                        ? null
                        : _processImage,
                    child: _isProcessing
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Done',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ],
              ),
            ),

            // Canvas area - full screen with proper coordinate handling
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final canvasSize =
                      Size(constraints.maxWidth, constraints.maxHeight);

                  return GestureDetector(
                    onPanStart: (details) =>
                        _onPanStart(details, canvasSize),
                    onPanUpdate: (details) =>
                        _onPanUpdate(details, canvasSize),
                    onPanEnd: _onPanEnd,
                    behavior: HitTestBehavior.opaque,
                    child: Container(
                      color: Colors.black,
                      child: Center(
                        child: CustomPaint(
                          key: _canvasKey,
                          size: canvasSize,
                          painter: InpaintingCanvasPainter(
                            image: _loadedImage,
                            strokes: _strokes,
                            currentStroke: _currentStroke,
                            imageSize: _imageSize,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Bottom toolbar
            Container(
              padding: const EdgeInsets.all(16),
              color: Colors.black,
              child: Column(
                children: [
                  // Brush mode buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildToolButton(
                        icon: Icons.brush,
                        label: 'Paint',
                        isActive: _isPaintMode,
                        onTap: () => setState(() => _isPaintMode = true),
                      ),
                      const SizedBox(width: 16),
                      _buildToolButton(
                        icon: Icons.auto_fix_high,
                        label: 'Erase',
                        isActive: !_isPaintMode,
                        onTap: () => setState(() => _isPaintMode = false),
                      ),
                      const SizedBox(width: 16),
                      _buildToolButton(
                        icon: Icons.refresh,
                        label: 'Clear',
                        isActive: false,
                        onTap: _clearMask,
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Brush size slider
                  Row(
                    children: [
                      const Icon(Icons.circle, color: Colors.white54, size: 12),
                      Expanded(
                        child: Slider(
                          value: _brushSize,
                          min: 5,
                          max: 100,
                          divisions: 19,
                          activeColor: theme.colorScheme.primary,
                          inactiveColor: Colors.white24,
                          onChanged: (value) =>
                              setState(() => _brushSize = value),
                        ),
                      ),
                      const Icon(Icons.circle, color: Colors.white54, size: 24),
                    ],
                  ),

                  Text(
                    'Brush Size: ${_brushSize.toInt()}px',
                    style: const TextStyle(color: Colors.white54, fontSize: 12),
                  ),

                  // Prompt input (only for inpainting mode)
                  if (widget.mode == 'inpainting') ...[
                    const SizedBox(height: 16),
                    TextField(
                      controller: _promptController,
                      style: const TextStyle(color: Colors.white),
                      maxLines: 2,
                      decoration: InputDecoration(
                        hintText: 'What to generate in masked area...',
                        hintStyle:
                            TextStyle(color: Colors.white.withOpacity(0.4)),
                        filled: true,
                        fillColor: Colors.white.withOpacity(0.1),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.all(12),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildToolButton({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isActive ? Colors.white : Colors.white.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: isActive ? Colors.black : Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: isActive ? Colors.white : Colors.white54,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required ThemeData theme,
    required String title,
    required Widget child,
  }) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              title,
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }

  Widget _buildUploadArea(ThemeData theme) {
    return GestureDetector(
      onTap: _isUploading ? null : _pickImage,
      child: Container(
        height: 200,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        decoration: BoxDecoration(
          border: Border.all(
            color: theme.dividerColor.withOpacity(0.5),
            width: 2,
          ),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_isUploading)
                CircularProgressIndicator(color: theme.colorScheme.primary)
              else
                Icon(
                  Icons.cloud_upload_outlined,
                  size: 48,
                  color: theme.colorScheme.onSurface.withOpacity(0.5),
                ),
              const SizedBox(height: 12),
              Text(
                _isUploading ? 'Uploading...' : 'Upload an image to start',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withOpacity(0.7),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImagePreview(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: Column(
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SmartNetworkImage(
                  _inputImageUrl!,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              // Mask overlay indicator
              if (_strokes.isNotEmpty)
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.8),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text(
                      'Mask applied',
                      style: TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                ),
              Positioned(
                top: 8,
                right: 8,
                child: GestureDetector(
                  onTap: _removeImage,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.6),
                      shape: BoxShape.circle,
                    ),
                    child:
                        const Icon(Icons.close, color: Colors.white, size: 18),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => setState(() => _isEditorMode = true),
                  icon: const Icon(Icons.brush),
                  label: Text(_strokes.isEmpty ? 'Paint Mask' : 'Edit Mask'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed:
                      _strokes.isEmpty || _isProcessing ? null : _processImage,
                  icon: _isProcessing
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.auto_awesome),
                  label: Text(_isProcessing ? 'Processing...' : 'Apply'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: theme.colorScheme.primary,
                    foregroundColor: theme.colorScheme.onPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildResultArea(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      child: _outputImageUrl != null
          ? Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: SmartNetworkImage(
                    _outputImageUrl!,
                    fit: BoxFit.contain,
                    height: 300,
                    width: double.infinity,
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _downloadOutput,
                    icon: const Icon(Icons.download),
                    label: const Text('Download'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            )
          : Container(
              height: 200,
              decoration: BoxDecoration(
                border: Border.all(
                  color: theme.dividerColor.withOpacity(0.5),
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (_isProcessing)
                      CircularProgressIndicator(
                          color: theme.colorScheme.primary)
                    else
                      Icon(
                        Icons.auto_awesome,
                        size: 40,
                        color: theme.colorScheme.onSurface.withOpacity(0.3),
                      ),
                    const SizedBox(height: 12),
                    Text(
                      _isProcessing
                          ? 'Processing...'
                          : 'Result will appear here',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface.withOpacity(0.5),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  void _onPanStart(DragStartDetails details, Size canvasSize) {
    if (_loadedImage == null || _imageSize == null) return;

    final renderBox =
        _canvasKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final localPosition = renderBox.globalToLocal(details.globalPosition);
    final imageCoords = _screenToImageCoords(localPosition, canvasSize);

    if (imageCoords == null) return;

    setState(() {
      _currentStroke = DrawingStroke(
        points: [imageCoords],
        brushSize: _brushSize,
        isErase: !_isPaintMode,
      );
    });
  }

  void _onPanUpdate(DragUpdateDetails details, Size canvasSize) {
    if (_currentStroke == null || _imageSize == null) return;

    final renderBox =
        _canvasKey.currentContext?.findRenderObject() as RenderBox?;
    if (renderBox == null) return;

    final localPosition = renderBox.globalToLocal(details.globalPosition);
    final imageCoords = _screenToImageCoords(localPosition, canvasSize);

    if (imageCoords == null) return;

    setState(() {
      _currentStroke = DrawingStroke(
        points: [..._currentStroke!.points, imageCoords],
        brushSize: _currentStroke!.brushSize,
        isErase: _currentStroke!.isErase,
      );
    });
  }

  void _onPanEnd(DragEndDetails details) {
    if (_currentStroke != null) {
      setState(() {
        _strokes = [..._strokes, _currentStroke!];
        _currentStroke = null;
      });
    }
  }
}

class DrawingStroke {
  final List<Offset> points;
  final double brushSize;
  final bool isErase;

  DrawingStroke({
    required this.points,
    required this.brushSize,
    required this.isErase,
  });
}

class InpaintingCanvasPainter extends CustomPainter {
  final ui.Image? image;
  final List<DrawingStroke> strokes;
  final DrawingStroke? currentStroke;
  final Size? imageSize;

  InpaintingCanvasPainter({
    this.image,
    required this.strokes,
    this.currentStroke,
    this.imageSize,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (image == null || imageSize == null) return;

    // Calculate scale to fit image in canvas while maintaining aspect ratio
    final scaleX = size.width / imageSize!.width;
    final scaleY = size.height / imageSize!.height;
    final scale = scaleX < scaleY ? scaleX : scaleY;

    final scaledWidth = imageSize!.width * scale;
    final scaledHeight = imageSize!.height * scale;
    final offsetX = (size.width - scaledWidth) / 2;
    final offsetY = (size.height - scaledHeight) / 2;

    // Draw the image
    canvas.save();
    canvas.translate(offsetX, offsetY);
    canvas.scale(scale);
    canvas.drawImage(image!, Offset.zero, Paint());
    canvas.restore();

    // Draw mask overlay using saveLayer so eraser only removes red paint, not the image
    canvas.save();
    canvas.translate(offsetX, offsetY);
    canvas.scale(scale);
    canvas.saveLayer(null, Paint());

    // Draw all strokes: paint adds red, erase removes red
    final allStrokes = [...strokes, if (currentStroke != null) currentStroke!];
    for (final stroke in allStrokes) {
      final paint = Paint()..style = PaintingStyle.fill;
      if (stroke.isErase) {
        paint.blendMode = BlendMode.clear;
      } else {
        paint.color = Colors.red.withOpacity(0.5);
      }
      for (final point in stroke.points) {
        canvas.drawCircle(point, stroke.brushSize / 2, paint);
      }
    }

    canvas.restore(); // restores saveLayer, compositing the mask overlay
    canvas.restore(); // restores translate/scale
  }

  @override
  bool shouldRepaint(covariant InpaintingCanvasPainter oldDelegate) {
    return oldDelegate.image != image ||
        oldDelegate.strokes != strokes ||
        oldDelegate.currentStroke != currentStroke;
  }
}
