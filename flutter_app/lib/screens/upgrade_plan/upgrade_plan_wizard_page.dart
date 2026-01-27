import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme.dart';
import 'upgrade_plan_wizard_content.dart';

class UpgradePlanWizardPage extends StatefulWidget {
  /// If true, the wizard was opened from welcome/login flow
  /// If false, it was opened from upgrade plan page
  final bool isFromWelcome;

  const UpgradePlanWizardPage({
    super.key,
    this.isFromWelcome = false,
  });

  @override
  State<UpgradePlanWizardPage> createState() => _UpgradePlanWizardPageState();
}

class _UpgradePlanWizardPageState extends State<UpgradePlanWizardPage> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;
  Timer? _autoAdvanceTimer;
  bool _didPrefetch = false;

  @override
  void dispose() {
    _autoAdvanceTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _startAutoAdvance();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_didPrefetch) {
      _didPrefetch = true;
      _precacheWizardImages();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF05070F),
      body: Stack(
        fit: StackFit.expand,
        children: [
          PageView.builder(
            controller: _pageController,
            allowImplicitScrolling: true,
            itemCount: wizardSteps.length,
            onPageChanged: (index) {
              setState(() => _currentIndex = index);
              _restartAutoAdvance();
            },
            itemBuilder: (_, index) => _AnimatedBenefitCard(
              controller: _pageController,
              index: index,
              child: _WizardSlide(
                step: wizardSteps[index],
                alignBottom: index < 2,
              ),
            ),
          ),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      _circleButton(
                        icon: Icons.arrow_back_ios_new,
                        onTap: () => _goToPlans(),
                      ),
                      const Spacer(),
                      TextButton(
                        onPressed: _goToPlans,
                        child: Text(
                          'Skip',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.8),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _NextButton(onTap: _handleNext),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(40, 10, 40, 18),
                  child: _StoryProgressIndicator(
                    currentIndex: _currentIndex,
                    total: wizardSteps.length,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _circleButton({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.06),
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Icon(icon, color: Colors.white, size: 18),
      ),
    );
  }

  void _goToPlans() {
    if (widget.isFromWelcome) {
      // Navigate to pricing/subscription after wizard
      context.go('/pricing');
    } else {
      // Just go back if opened from subscription page
      context.pop();
    }
  }

  void _handleNext() {
    if (_currentIndex < wizardSteps.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 450),
        curve: Curves.easeInOut,
      );
    } else {
      _goToPlans();
    }
  }

  void _startAutoAdvance() {
    _autoAdvanceTimer?.cancel();
    _autoAdvanceTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      if (_currentIndex < wizardSteps.length - 1) {
        _pageController.nextPage(
          duration: const Duration(milliseconds: 450),
          curve: Curves.easeInOut,
        );
      } else {
        // On last slide, only auto-advance if from welcome page
        if (widget.isFromWelcome) {
          _goToPlans();
        } else {
          _autoAdvanceTimer?.cancel();
        }
      }
    });
  }

  void _precacheWizardImages() {
    for (final step in wizardSteps) {
      precacheImage(AssetImage(step.imagePath), context);
    }
  }

  void _restartAutoAdvance() {
    _startAutoAdvance();
  }
}

class _AnimatedBenefitCard extends StatelessWidget {
  const _AnimatedBenefitCard({
    required this.controller,
    required this.index,
    required this.child,
  });

  final PageController controller;
  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        double page = index.toDouble();
        if (controller.hasClients && controller.position.haveDimensions) {
          page = controller.page ?? controller.initialPage.toDouble();
        }
        final delta = (page - index).clamp(-1.0, 1.0);
        final opacity = (1 - (delta.abs() * 0.2)).clamp(0.0, 1.0);
        final scale = (1 - (delta.abs() * 0.04)).clamp(0.96, 1.0);
        final translate = 16 * delta;

        return Opacity(
          opacity: opacity,
          child: Transform.translate(
            offset: Offset(translate, 0),
            child: Transform.scale(scale: scale, child: child),
          ),
        );
      },
    );
  }
}

class _WizardSlide extends StatelessWidget {
  const _WizardSlide({required this.step, required this.alignBottom});

  final WizardStepData step;
  final bool alignBottom;

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    
    final LinearGradient overlayGradient = LinearGradient(
      begin: alignBottom ? Alignment.bottomCenter : Alignment.topCenter,
      end: alignBottom ? Alignment.topCenter : Alignment.bottomCenter,
      colors: alignBottom
          ? [
              const Color(0xFF05070F).withOpacity(0.78),
              const Color(0xFF05070F).withOpacity(0.35),
              Colors.transparent,
            ]
          : [
              const Color(0xFF05070F).withOpacity(0.72),
              const Color(0xFF05070F).withOpacity(0.32),
              Colors.transparent,
            ],
      stops: const [0.0, 0.28, 0.95],
    );

    return Stack(
      fit: StackFit.expand,
      children: [
        Image.asset(
          step.imagePath,
          fit: BoxFit.cover,
          filterQuality: FilterQuality.high,
          errorBuilder: (context, error, stackTrace) {
            // Fallback gradient when image is missing
            return Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    AppTheme.primary.withOpacity(0.3),
                    const Color(0xFFEC4899).withOpacity(0.3),
                  ],
                ),
              ),
              child: const Center(
                child: Icon(
                  Icons.image_outlined,
                  size: 64,
                  color: Colors.white24,
                ),
              ),
            );
          },
        ),
        DecoratedBox(
          decoration: BoxDecoration(
            gradient: overlayGradient,
          ),
        ),
        Align(
          alignment: alignBottom ? const Alignment(0, 0.5) : const Alignment(0, -0.7),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    step.title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: 'BebasNeue',
                      fontSize: 36,
                      height: 1.05,
                      color: Colors.white,
                      letterSpacing: 0.3,
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: screenWidth * 0.6,
                    child: Text(
                      step.description,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: 'SpaceGrotesk',
                        fontSize: 14.5,
                        height: 1.55,
                        color: Colors.white.withOpacity(0.82),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _ProgressIndicator extends StatefulWidget {
  final Duration duration;
  final Color color;

  const _ProgressIndicator({
    super.key,
    required this.duration,
    required this.color,
  });

  @override
  State<_ProgressIndicator> createState() => _ProgressIndicatorState();
}

class _ProgressIndicatorState extends State<_ProgressIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: widget.duration,
      vsync: this,
    );
    _animation = Tween<double>(begin: 0.0, end: 1.0).animate(_controller);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return FractionallySizedBox(
          alignment: Alignment.centerLeft,
          widthFactor: _animation.value,
          child: Container(
            decoration: BoxDecoration(
              color: widget.color,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        );
      },
    );
  }
}

class _StoryProgressIndicator extends StatelessWidget {
  const _StoryProgressIndicator({
    required this.currentIndex,
    required this.total,
  });

  final int currentIndex;
  final int total;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        const gap = 10.0;
        const inactiveWidth = 24.0;
        const activeWidth = 64.0;
        final totalGaps = gap * (total - 1);
        final totalFixed = inactiveWidth * (total - 1) + activeWidth;
        final scale =
            totalFixed + totalGaps > constraints.maxWidth && total > 0
                ? (constraints.maxWidth - totalGaps) / totalFixed
                : 1.0;
        final activeW = activeWidth * scale;
        final inactiveW = inactiveWidth * scale;

        return Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(
            total,
            (index) {
              final isActive = index == currentIndex;
              final width = isActive ? activeW : inactiveW;
              final baseColor = Colors.white.withOpacity(0.16);
              const activeColor = AppTheme.primary;

              return Container(
                width: width,
                height: 4,
                margin: EdgeInsets.only(right: index < total - 1 ? gap : 0),
                decoration: BoxDecoration(
                  color: baseColor,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Stack(
                  children: [
                    if (isActive)
                      _ProgressIndicator(
                        key: ValueKey('progress_$currentIndex'),
                        duration: const Duration(seconds: 4),
                        color: activeColor,
                      ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _NextButton extends StatefulWidget {
  const _NextButton({required this.onTap});

  final VoidCallback onTap;

  @override
  State<_NextButton> createState() => _NextButtonState();
}

class _NextButtonState extends State<_NextButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _shadowAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);

    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.08).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );

    _shadowAnimation = Tween<double>(begin: 0.4, end: 0.7).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        width: 78,
        height: 78,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withOpacity(0.18)),
        ),
        child: Center(
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return Transform.scale(
                scale: _scaleAnimation.value,
                child: Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF0A0E1C),
                    border: Border.all(
                      color: Colors.white.withOpacity(0.12),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primary.withOpacity(_shadowAnimation.value),
                        blurRadius: 18 + (8 * _shadowAnimation.value),
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Transform.translate(
                      offset: const Offset(2, 0),
                      child: Transform.rotate(
                        angle: pi,
                        child: const _PlayDotsIcon(),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _PlayDotsIcon extends StatelessWidget {
  const _PlayDotsIcon();

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: const Size(22, 22),
      painter: _PlayDotsPainter(
        color: Colors.white.withOpacity(0.95),
      ),
    );
  }
}

class _PlayDotsPainter extends CustomPainter {
  _PlayDotsPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final Paint paint = Paint()..color = color;
    final double radius = size.width * 0.11;

    final Offset left = Offset(size.width * 0.28, size.height * 0.5);
    final Offset topRight = Offset(size.width * 0.67, size.height * 0.3);
    final Offset bottomRight = Offset(size.width * 0.67, size.height * 0.7);

    canvas.drawCircle(left, radius, paint);
    canvas.drawCircle(topRight, radius, paint);
    canvas.drawCircle(bottomRight, radius, paint);
  }

  @override
  bool shouldRepaint(covariant _PlayDotsPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}
