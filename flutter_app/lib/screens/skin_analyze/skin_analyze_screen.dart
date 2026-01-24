import 'package:flutter/material.dart';
import '../../core/theme.dart';
import 'skin_camera_screen.dart';

class SkinAnalyzeScreen extends StatefulWidget {
  const SkinAnalyzeScreen({super.key});

  @override
  State<SkinAnalyzeScreen> createState() => _SkinAnalyzeScreenState();
}

class _SkinAnalyzeScreenState extends State<SkinAnalyzeScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<_OnboardingStep> _steps = [
    _OnboardingStep(
      icon: Icons.face_retouching_natural,
      title: 'AI Skin Analysis',
      description: 'Get a comprehensive analysis of your skin health using advanced AI technology. Detect concerns like acne, wrinkles, dark spots, and more.',
      color: const Color(0xFFEC4899),
    ),
    _OnboardingStep(
      icon: Icons.camera_alt,
      title: 'Face Scanning',
      description: 'We\'ll guide you through capturing your face from multiple angles - front, left, and right - for the most accurate analysis.',
      color: const Color(0xFF8B5CF6),
    ),
    _OnboardingStep(
      icon: Icons.analytics,
      title: 'Detailed Report',
      description: 'Receive a personalized skin report with scores, detected issues, and recommendations tailored to your unique skin type.',
      color: const Color(0xFF3B82F6),
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _steps.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      // Navigate to camera screen
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const SkinCameraScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() => _currentPage = index);
                },
                itemCount: _steps.length,
                itemBuilder: (context, index) {
                  final step = _steps[index];
                  return _OnboardingPage(step: step);
                },
              ),
            ),
            
            // Page indicators
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_steps.length, (index) {
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: _currentPage == index ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _currentPage == index 
                          ? _steps[_currentPage].color 
                          : AppTheme.border,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  );
                }),
              ),
            ),
            
            // Action buttons
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _nextPage,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _steps[_currentPage].color,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: Text(
                        _currentPage < _steps.length - 1 ? 'Continue' : 'Start Analysis',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  if (_currentPage < _steps.length - 1) ...[
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const SkinCameraScreen()),
                        );
                      },
                      child: const Text(
                        'Skip',
                        style: TextStyle(color: AppTheme.muted),
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
}

class _OnboardingStep {
  final IconData icon;
  final String title;
  final String description;
  final Color color;

  _OnboardingStep({
    required this.icon,
    required this.title,
    required this.description,
    required this.color,
  });
}

class _OnboardingPage extends StatelessWidget {
  final _OnboardingStep step;

  const _OnboardingPage({required this.step});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: step.color.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              step.icon,
              size: 60,
              color: step.color,
            ),
          ),
          const SizedBox(height: 40),
          Text(
            step.title,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          Text(
            step.description,
            style: const TextStyle(
              fontSize: 16,
              color: AppTheme.muted,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
