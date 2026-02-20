import 'dart:math';
import 'package:flutter/material.dart';

enum VoiceState { idle, listening, processing, speaking }

class VoiceChatVisualizer extends StatefulWidget {
  final VoiceState state;
  final double size;

  const VoiceChatVisualizer({
    super.key,
    required this.state,
    this.size = 200,
  });

  @override
  State<VoiceChatVisualizer> createState() => _VoiceChatVisualizerState();
}

class _VoiceChatVisualizerState extends State<VoiceChatVisualizer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  double _phase = 0;
  final List<_Particle> _particles = [];
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();

    _controller.addListener(() {
      setState(() {
        _phase += 0.015;
      });
    });
  }

  void _initParticles(double size) {
    if (_initialized) return;
    _initialized = true;
    final rng = Random();
    final cx = size / 2;
    final cy = size / 2;
    final baseRadius = size * 0.28;
    
    for (int i = 0; i < 300; i++) {
      final angle = rng.nextDouble() * pi * 2;
      final r = rng.nextDouble() * baseRadius;
      _particles.add(_Particle(
        x: cx + cos(angle) * r,
        y: cy + sin(angle) * r,
        vx: (rng.nextDouble() - 0.5) * 0.5,
        vy: (rng.nextDouble() - 0.5) * 0.5,
        size: rng.nextDouble() * 2.5 + 0.5,
        alpha: rng.nextDouble() * 0.8 + 0.2,
        hue: 25 + rng.nextDouble() * 30,
      ));
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _initParticles(widget.size);
    return CustomPaint(
      size: Size(widget.size, widget.size),
      painter: _VoiceSphereGoldenPainter(
        state: widget.state,
        phase: _phase,
        particles: _particles,
      ),
    );
  }
}

class _Particle {
  double x, y, vx, vy, size, alpha, hue;
  _Particle({
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.size,
    required this.alpha,
    required this.hue,
  });
}

class _VoiceSphereGoldenPainter extends CustomPainter {
  final VoiceState state;
  final double phase;
  final List<_Particle> particles;

  _VoiceSphereGoldenPainter({
    required this.state,
    required this.phase,
    required this.particles,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2;
    final baseRadius = size.width * 0.28;

    // Background radial glow
    final bgGlow = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF4D3319).withOpacity(0.4),
          const Color(0xFF1A0D00).withOpacity(0.2),
          Colors.transparent,
        ],
        stops: const [0, 0.5, 1],
      ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: size.width * 0.5));
    canvas.drawCircle(Offset(cx, cy), size.width * 0.5, bgGlow);

    // Pulsing ring ripples
    final pulseIntensity = state == VoiceState.listening ? 1.0
        : state == VoiceState.speaking ? 0.7 : 0.3;
    for (int ring = 0; ring < 3; ring++) {
      final ringPhase = phase * 1.5 + ring * 1.2;
      final ringExpand = (sin(ringPhase) * 0.5 + 0.5);
      final ringRadius = baseRadius + 20 + ringExpand * 30 + ring * 15;
      final ringAlpha = (0.15 - ring * 0.04) * pulseIntensity * (1 - ringExpand * 0.5);

      final ringPaint = Paint()
        ..color = Color.fromRGBO(200, 150, 50, ringAlpha.clamp(0.0, 1.0))
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5;
      canvas.drawCircle(Offset(cx, cy), ringRadius, ringPaint);
    }

    // Main sphere glow
    final sphereGlow = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFFD4A030).withOpacity(0.25),
          const Color(0xFF8B6914).withOpacity(0.1),
          Colors.transparent,
        ],
        stops: const [0.0, 0.6, 1.0],
      ).createShader(Rect.fromCircle(center: Offset(cx, cy), radius: baseRadius * 1.3));
    canvas.drawCircle(Offset(cx, cy), baseRadius * 1.3, sphereGlow);

    // Animate particles
    final speedMultiplier = state == VoiceState.listening ? 2.5
        : state == VoiceState.speaking ? 2.0
        : state == VoiceState.processing ? 3.0 : 0.5;
    final breathe = sin(phase * 0.8) * 5 * (state == VoiceState.idle ? 1.0 : 0.3);
    final rng = Random(42);

    for (final p in particles) {
      p.x += p.vx * speedMultiplier;
      p.y += p.vy * speedMultiplier;

      final dx = p.x - cx;
      final dy = p.y - cy;
      final dist = sqrt(dx * dx + dy * dy);
      final maxR = baseRadius + breathe;

      if (dist > maxR) {
        final angle = atan2(dy, dx);
        p.x = cx + cos(angle) * (maxR - 2);
        p.y = cy + sin(angle) * (maxR - 2);
        p.vx = -p.vx * 0.8 + (rng.nextDouble() - 0.5) * 0.3;
        p.vy = -p.vy * 0.8 + (rng.nextDouble() - 0.5) * 0.3;
      }

      p.vx += (rng.nextDouble() - 0.5) * 0.1;
      p.vy += (rng.nextDouble() - 0.5) * 0.1;
      p.vx *= 0.98;
      p.vy *= 0.98;

      final alphaOsc = sin(phase * 2 + p.hue) * 0.3;
      final finalAlpha = (p.alpha + alphaOsc).clamp(0.1, 1.0);

      // Particle glow
      final glowPaint = Paint()
        ..shader = RadialGradient(
          colors: [
            HSLColor.fromAHSL(finalAlpha, p.hue, 0.9, 0.7).toColor(),
            HSLColor.fromAHSL(finalAlpha * 0.4, p.hue, 0.8, 0.55).toColor(),
            Colors.transparent,
          ],
          stops: const [0, 0.5, 1],
        ).createShader(Rect.fromCircle(center: Offset(p.x, p.y), radius: p.size * 2.5));
      canvas.drawCircle(Offset(p.x, p.y), p.size * 2.5, glowPaint);

      // Core bright dot
      final corePaint = Paint()
        ..color = HSLColor.fromAHSL(finalAlpha * 0.9, p.hue, 0.95, 0.85).toColor();
      canvas.drawCircle(Offset(p.x, p.y), p.size * 0.6, corePaint);
    }

    // Sphere border glow
    final borderGrad = Paint()
      ..shader = RadialGradient(
        colors: [
          Colors.transparent,
          Color.fromRGBO(200, 150, 50, 0.15 + sin(phase) * 0.05),
          Colors.transparent,
        ],
        stops: const [0, 0.5, 1],
      ).createShader(Rect.fromCircle(
        center: Offset(cx, cy),
        radius: baseRadius + 6 + breathe,
      ));
    canvas.drawCircle(Offset(cx, cy), baseRadius + 6 + breathe, borderGrad);
  }

  @override
  bool shouldRepaint(covariant _VoiceSphereGoldenPainter oldDelegate) {
    return oldDelegate.phase != phase || oldDelegate.state != state;
  }
}
