import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../../core/theme.dart';
import '../../services/skin_service.dart';
import 'skin_results_screen.dart';

class SkinAnalyzingScreen extends StatefulWidget {
  final List<XFile> images;

  const SkinAnalyzingScreen({super.key, required this.images});

  @override
  State<SkinAnalyzingScreen> createState() => _SkinAnalyzingScreenState();
}

class _SkinAnalyzingScreenState extends State<SkinAnalyzingScreen>
    with TickerProviderStateMixin {
  double _progress = 0.0;
  String _currentPhase = 'Initializing...';
  int _currentPhaseIndex = 0;
  late AnimationController _rotationController;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  
  final SkinService _skinService = SkinService();
  SkinAnalysisResult? _analysisResult;
  String? _error;

  final List<_AnalysisPhase> _phases = [
    _AnalysisPhase('Preprocessing images...', 0.15),
    _AnalysisPhase('Detecting skin regions...', 0.30),
    _AnalysisPhase('Analyzing with AI...', 0.50),
    _AnalysisPhase('Detecting concerns...', 0.70),
    _AnalysisPhase('Generating report...', 0.90),
    _AnalysisPhase('Finalizing...', 1.0),
  ];

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat();

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _startAnalysis();
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _startAnalysis() async {
    try {
      // Start progress animation
      _animateProgress();
      
      // Get the first image and convert to base64
      if (widget.images.isEmpty) {
        throw Exception('No images to analyze');
      }
      
      final imageFile = File(widget.images.first.path);
      final bytes = await imageFile.readAsBytes();
      final base64Image = 'data:image/jpeg;base64,${base64Encode(bytes)}';
      
      // Call the skin AI service
      final result = await _skinService.analyzeSkin(
        imageBase64: base64Image,
      );
      
      if (!mounted) return;
      
      setState(() {
        _analysisResult = result;
        _progress = 1.0;
        _currentPhase = 'Complete!';
      });
      
      // Wait a moment then navigate
      await Future.delayed(const Duration(milliseconds: 500));
      
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => SkinResultsScreen(result: result),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
      });
    }
  }

  void _animateProgress() async {
    for (int i = 0; i < _phases.length - 1; i++) {
      if (!mounted || _analysisResult != null) return;

      setState(() {
        _currentPhaseIndex = i;
        _currentPhase = _phases[i].label;
      });

      final targetProgress = _phases[i].progress;
      while (_progress < targetProgress && mounted && _analysisResult == null) {
        await Future.delayed(const Duration(milliseconds: 80));
        if (!mounted) return;
        setState(() {
          _progress = min(_progress + 0.02, targetProgress);
        });
      }

      await Future.delayed(const Duration(milliseconds: 200));
    }
    
    // If analysis not complete yet, keep spinning at 90%
    while (mounted && _analysisResult == null && _error == null) {
      await Future.delayed(const Duration(milliseconds: 500));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        backgroundColor: AppTheme.background,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withOpacity(0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Color(0xFFEF4444),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Analysis Failed',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  _error!,
                  style: const TextStyle(
                    color: AppTheme.muted,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Try Again'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Spacer(),

              // Animated scanner
              AnimatedBuilder(
                animation: _pulseAnimation,
                builder: (context, child) {
                  return Transform.scale(
                    scale: _pulseAnimation.value,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Outer ring
                        AnimatedBuilder(
                          animation: _rotationController,
                          builder: (context, child) {
                            return Transform.rotate(
                              angle: _rotationController.value * 2 * pi,
                              child: Container(
                                width: 200,
                                height: 200,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.transparent,
                                    width: 4,
                                  ),
                                  gradient: SweepGradient(
                                    colors: [
                                      AppTheme.primary.withOpacity(0.0),
                                      AppTheme.primary,
                                      AppTheme.primary.withOpacity(0.0),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                        // Inner circle with icon
                        Container(
                          width: 160,
                          height: 160,
                          decoration: BoxDecoration(
                            color: AppTheme.card,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: AppTheme.border,
                              width: 2,
                            ),
                          ),
                          child: const Icon(
                            Icons.face_retouching_natural,
                            size: 64,
                            color: AppTheme.primary,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),

              const SizedBox(height: 48),

              // Title
              const Text(
                'Analyzing Your Skin',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),

              const SizedBox(height: 12),

              // Current phase
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: Text(
                  _currentPhase,
                  key: ValueKey(_currentPhase),
                  style: const TextStyle(
                    fontSize: 16,
                    color: AppTheme.muted,
                  ),
                ),
              ),

              const SizedBox(height: 40),

              // Progress bar
              Container(
                width: double.infinity,
                height: 8,
                decoration: BoxDecoration(
                  color: AppTheme.secondary,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 100),
                    width: MediaQuery.of(context).size.width * _progress * 0.85,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primary, Color(0xFFEC4899)],
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Progress percentage
              Text(
                '${(_progress * 100).toInt()}%',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primary,
                ),
              ),

              const SizedBox(height: 40),

              // Phase indicators
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_phases.length, (index) {
                  final isCompleted = index < _currentPhaseIndex;
                  final isCurrent = index == _currentPhaseIndex;
                  return Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isCompleted
                          ? AppTheme.success
                          : isCurrent
                              ? AppTheme.primary
                              : AppTheme.border,
                    ),
                  );
                }),
              ),

              const Spacer(),

              // Tip
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppTheme.card,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.border),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.lightbulb, color: Color(0xFFF59E0B), size: 24),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Tip: For best results, analyze your skin in natural lighting',
                        style: TextStyle(
                          color: AppTheme.muted,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AnalysisPhase {
  final String label;
  final double progress;

  _AnalysisPhase(this.label, this.progress);
}
