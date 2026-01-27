import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  int _loadingStep = 0;
  bool _fadeOut = false;
  bool _hasUser = false;
  bool _isCheckingAuth = true;

  late AnimationController _rotationController;
  late AnimationController _pulseController;
  late AnimationController _fadeController;

  final List<String> _loadingStepsLoggedOut = [
    "Initializing...",
    "Checking authentication...",
    "Preparing experience...",
    "Almost ready...",
    "Ready!",
  ];

  final List<String> _loadingStepsLoggedIn = [
    "Initializing...",
    "Checking authentication...",
    "Loading your data...",
    "Setting up workspace...",
    "Ready!",
  ];

  List<String> get _loadingSteps =>
      _hasUser ? _loadingStepsLoggedIn : _loadingStepsLoggedOut;

  @override
  void initState() {
    super.initState();

    // Rotation animation for background gradient
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();

    // Pulse animation for logo
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    // Fade out animation
    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );

    _checkAuth();
    _startLoadingSequence();
  }

  void _checkAuth() async {
    final session = Supabase.instance.client.auth.currentSession;
    setState(() {
      _hasUser = session != null;
      _isCheckingAuth = false;
    });
  }

  void _startLoadingSequence() {
    Future.delayed(const Duration(milliseconds: 600), () {
      if (!mounted) return;
      setState(() => _loadingStep = 1);

      Future.delayed(const Duration(milliseconds: 600), () {
        if (!mounted) return;
        setState(() => _loadingStep = 2);

        Future.delayed(const Duration(milliseconds: 600), () {
          if (!mounted) return;
          setState(() => _loadingStep = 3);

          Future.delayed(const Duration(milliseconds: 600), () {
            if (!mounted) return;
            setState(() => _loadingStep = 4);

            // Wait for auth check + extra delay then navigate
            _waitAndNavigate();
          });
        });
      });
    });
  }

  void _waitAndNavigate() async {
    // Wait until auth check is complete
    while (_isCheckingAuth) {
      await Future.delayed(const Duration(milliseconds: 100));
    }

    await Future.delayed(const Duration(milliseconds: 800));

    if (!mounted) return;

    setState(() => _fadeOut = true);
    _fadeController.forward();

    await Future.delayed(const Duration(milliseconds: 400));

    if (!mounted) return;

    // Navigate based on auth state
    if (_hasUser) {
      context.go('/');
    } else {
      context.go('/login');
    }
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _pulseController.dispose();
    _fadeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: _fadeOut ? 0.0 : 1.0,
      duration: const Duration(milliseconds: 400),
      child: Scaffold(
        backgroundColor: AppTheme.background,
        body: Stack(
          children: [
            // Animated Background Gradient
            _buildAnimatedBackground(),

            // Main Content
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo with pulse animation
                  _buildLogo(),

                  const SizedBox(height: 32),

                  // App Name with gradient
                  _buildAppName(),

                  const SizedBox(height: 8),

                  // Tagline
                  Text(
                    "Create without limits",
                    style: TextStyle(
                      color: AppTheme.mutedForeground,
                      fontSize: 14,
                    ),
                  ),

                  const SizedBox(height: 32),

                  // Loading Status
                  _buildLoadingStatus(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAnimatedBackground() {
    return Positioned.fill(
      child: AnimatedBuilder(
        animation: _rotationController,
        builder: (context, child) {
          return Transform.rotate(
            angle: _rotationController.value * 2 * math.pi,
            child: Opacity(
              opacity: 0.3,
              child: Container(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: Alignment.topLeft,
                    radius: 1.5,
                    colors: [
                      AppTheme.primary.withOpacity(0.4),
                      Colors.transparent,
                    ],
                  ),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      top: MediaQuery.of(context).size.height * 0.25,
                      left: MediaQuery.of(context).size.width * 0.25,
                      child: Container(
                        width: 256,
                        height: 256,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              AppTheme.primary.withOpacity(0.4),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      top: MediaQuery.of(context).size.height * 0.5,
                      right: MediaQuery.of(context).size.width * 0.25,
                      child: Container(
                        width: 192,
                        height: 192,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              AppTheme.accent.withOpacity(0.4),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      bottom: MediaQuery.of(context).size.height * 0.25,
                      left: MediaQuery.of(context).size.width * 0.33,
                      child: Container(
                        width: 224,
                        height: 224,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              AppTheme.primary.withOpacity(0.3),
                              AppTheme.accent.withOpacity(0.3),
                              Colors.transparent,
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLogo() {
    return AnimatedBuilder(
      animation: _pulseController,
      builder: (context, child) {
        final scale = 1.0 + (_pulseController.value * 0.05);
        return Transform.scale(
          scale: scale,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Ping effect
              AnimatedOpacity(
                opacity: 0.2,
                duration: const Duration(milliseconds: 500),
                child: Container(
                  width: 96 + (_pulseController.value * 20),
                  height: 96 + (_pulseController.value * 20),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(24),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [AppTheme.primary, AppTheme.accent],
                    ),
                  ),
                ),
              ),
              // Main logo container
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      AppTheme.primary.withOpacity(0.2),
                      AppTheme.accent.withOpacity(0.2),
                    ],
                  ),
                  border: Border.all(
                    color: AppTheme.border.withOpacity(0.2),
                    width: 1,
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 64,
                    height: 64,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) {
                      // Fallback icon if image not found
                      return Container(
                        padding: const EdgeInsets.all(16),
                        child: ShaderMask(
                          shaderCallback: (bounds) => LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [AppTheme.primary, AppTheme.accent],
                          ).createShader(bounds),
                          child: const Icon(
                            Icons.auto_awesome,
                            size: 48,
                            color: Colors.white,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAppName() {
    return ShaderMask(
      shaderCallback: (bounds) => LinearGradient(
        colors: [
          AppTheme.foreground,
          AppTheme.primary,
          AppTheme.accent,
        ],
      ).createShader(bounds),
      child: const Text(
        "Timeless AI",
        style: TextStyle(
          fontSize: 30,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
    );
  }

  Widget _buildLoadingStatus() {
    return Column(
      children: [
        // Animated Dots
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(3, (index) {
            return TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: Duration(milliseconds: 600 + (index * 150)),
              curve: Curves.easeInOut,
              builder: (context, value, child) {
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  child: _BouncingDot(delay: index * 0.15),
                );
              },
            );
          }),
        ),

        const SizedBox(height: 16),

        // Loading Text
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          child: Text(
            _loadingSteps[_loadingStep],
            key: ValueKey(_loadingStep),
            style: TextStyle(
              color: AppTheme.mutedForeground,
              fontSize: 14,
            ),
          ),
        ),

        const SizedBox(height: 16),

        // Progress Bar
        Container(
          width: 192,
          height: 4,
          decoration: BoxDecoration(
            color: AppTheme.border.withOpacity(0.3),
            borderRadius: BorderRadius.circular(2),
          ),
          child: Stack(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 500),
                curve: Curves.easeOut,
                width: 192 * ((_loadingStep + 1) / _loadingSteps.length),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.primary, AppTheme.accent],
                  ),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _BouncingDot extends StatefulWidget {
  final double delay;

  const _BouncingDot({required this.delay});

  @override
  State<_BouncingDot> createState() => _BouncingDotState();
}

class _BouncingDotState extends State<_BouncingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );

    _animation = Tween<double>(begin: 0, end: -8).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    Future.delayed(Duration(milliseconds: (widget.delay * 1000).toInt()), () {
      if (mounted) {
        _controller.repeat(reverse: true);
      }
    });
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
        return Transform.translate(
          offset: Offset(0, _animation.value),
          child: Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppTheme.primary, AppTheme.accent],
              ),
            ),
          ),
        );
      },
    );
  }
}
