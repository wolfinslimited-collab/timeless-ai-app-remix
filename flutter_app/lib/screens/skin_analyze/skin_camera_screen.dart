import 'dart:async';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../../core/theme.dart';
import 'skin_analyzing_screen.dart';

enum CaptureStep { front, right, left }

class SkinCameraScreen extends StatefulWidget {
  const SkinCameraScreen({super.key});

  @override
  State<SkinCameraScreen> createState() => _SkinCameraScreenState();
}

class _SkinCameraScreenState extends State<SkinCameraScreen> with TickerProviderStateMixin {
  CameraController? _cameraController;
  bool _isCameraInitialized = false;
  CaptureStep _currentStep = CaptureStep.front;
  final List<XFile> _capturedImages = [];
  bool _isCapturing = false;
  int _countdown = 0;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  final Map<CaptureStep, _StepInstruction> _instructions = {
    CaptureStep.front: _StepInstruction(
      title: 'Look Straight',
      description: 'Position your face in the center and look directly at the camera',
      icon: Icons.face,
    ),
    CaptureStep.right: _StepInstruction(
      title: 'Turn Right',
      description: 'Slowly turn your head to show the right side of your face',
      icon: Icons.rotate_right,
    ),
    CaptureStep.left: _StepInstruction(
      title: 'Turn Left',
      description: 'Slowly turn your head to show the left side of your face',
      icon: Icons.rotate_left,
    ),
  };

  @override
  void initState() {
    super.initState();
    _initializeCamera();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  Future<void> _initializeCamera() async {
    try {
      final cameras = await availableCameras();
      final frontCamera = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      _cameraController = CameraController(
        frontCamera,
        ResolutionPreset.high,
        enableAudio: false,
      );

      await _cameraController!.initialize();
      
      if (mounted) {
        setState(() {
          _isCameraInitialized = true;
        });
      }
    } catch (e) {
      debugPrint('Error initializing camera: $e');
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _captureImage() async {
    if (_cameraController == null || _isCapturing) return;

    setState(() {
      _isCapturing = true;
      _countdown = 3;
    });

    // Countdown
    for (int i = 3; i > 0; i--) {
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) {
        setState(() => _countdown = i - 1);
      }
    }

    try {
      final image = await _cameraController!.takePicture();
      _capturedImages.add(image);

      if (mounted) {
        setState(() {
          _isCapturing = false;
        });

        // Move to next step or finish
        if (_currentStep == CaptureStep.front) {
          setState(() => _currentStep = CaptureStep.right);
        } else if (_currentStep == CaptureStep.right) {
          setState(() => _currentStep = CaptureStep.left);
        } else {
          // All captures complete, navigate to analyzing screen
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(
              builder: (_) => SkinAnalyzingScreen(images: _capturedImages),
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Error capturing image: $e');
      if (mounted) {
        setState(() => _isCapturing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final instruction = _instructions[_currentStep]!;
    final stepIndex = CaptureStep.values.indexOf(_currentStep);

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Camera preview
            if (_isCameraInitialized && _cameraController != null)
              Positioned.fill(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: CameraPreview(_cameraController!),
                ),
              )
            else
              const Center(
                child: CircularProgressIndicator(color: AppTheme.primary),
              ),

            // Face guide overlay
            Center(
              child: AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _pulseAnimation.value,
                    child: Container(
                      width: 280,
                      height: 360,
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: AppTheme.primary.withOpacity(0.6),
                          width: 3,
                        ),
                        borderRadius: BorderRadius.circular(140),
                      ),
                    ),
                  );
                },
              ),
            ),

            // Countdown overlay
            if (_isCapturing && _countdown > 0)
              Center(
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.7),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '$_countdown',
                      style: const TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),

            // Top bar
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.7),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                    const Spacer(),
                    // Progress indicators
                    Row(
                      children: List.generate(3, (index) {
                        final isCompleted = index < stepIndex;
                        final isCurrent = index == stepIndex;
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: isCompleted
                                ? AppTheme.success
                                : isCurrent
                                    ? AppTheme.primary
                                    : Colors.white.withOpacity(0.3),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        );
                      }),
                    ),
                    const Spacer(),
                    const SizedBox(width: 48), // Balance the close button
                  ],
                ),
              ),
            ),

            // Bottom instruction panel
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      Colors.black.withOpacity(0.9),
                      Colors.black.withOpacity(0.7),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Column(
                  children: [
                    // Instruction
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              instruction.icon,
                              color: AppTheme.primary,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  instruction.title,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  instruction.description,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.white.withOpacity(0.7),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Capture button
                    GestureDetector(
                      onTap: _isCapturing ? null : _captureImage,
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white,
                            width: 4,
                          ),
                        ),
                        child: Center(
                          child: Container(
                            width: 64,
                            height: 64,
                            decoration: BoxDecoration(
                              color: _isCapturing 
                                  ? Colors.grey 
                                  : AppTheme.primary,
                              shape: BoxShape.circle,
                            ),
                            child: _isCapturing
                                ? const SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(
                                    Icons.camera_alt,
                                    color: Colors.white,
                                    size: 28,
                                  ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Step ${stepIndex + 1} of 3',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepInstruction {
  final String title;
  final String description;
  final IconData icon;

  _StepInstruction({
    required this.title,
    required this.description,
    required this.icon,
  });
}
