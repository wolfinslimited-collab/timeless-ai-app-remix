import 'dart:math';
import 'package:flutter/material.dart';

enum VoiceState { idle, listening, processing, speaking }

class VoiceChatVisualizer extends StatefulWidget {
  final VoiceState state;
  final double size;

  const VoiceChatVisualizer({
    super.key,
    required this.state,
    this.size = 160,
  });

  @override
  State<VoiceChatVisualizer> createState() => _VoiceChatVisualizerState();
}

class _VoiceChatVisualizerState extends State<VoiceChatVisualizer>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  double _phase = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 10),
    )..repeat();

    _controller.addListener(() {
      setState(() {
        _phase += 0.02;
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: widget.state == VoiceState.idle ? 0.6 : 1.0,
      duration: const Duration(milliseconds: 500),
      child: CustomPaint(
        size: Size(widget.size, widget.size),
        painter: _VoiceChatPainter(
          state: widget.state,
          phase: _phase,
        ),
      ),
    );
  }
}

class _VoiceChatPainter extends CustomPainter {
  final VoiceState state;
  final double phase;

  _VoiceChatPainter({
    required this.state,
    required this.phase,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final centerX = size.width / 2;
    final centerY = size.height / 2;
    final baseRadius = size.width * 0.3;

    switch (state) {
      case VoiceState.idle:
        _paintIdle(canvas, centerX, centerY, baseRadius);
        break;
      case VoiceState.listening:
        _paintListening(canvas, centerX, centerY, baseRadius);
        break;
      case VoiceState.processing:
        _paintProcessing(canvas, centerX, centerY, baseRadius);
        break;
      case VoiceState.speaking:
        _paintSpeaking(canvas, centerX, centerY, baseRadius);
        break;
    }
  }

  void _paintIdle(Canvas canvas, double cx, double cy, double baseRadius) {
    // Subtle breathing effect
    final breathe = sin(phase * 0.5) * 3;

    // Outer glow
    final glowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF8B5CF6).withOpacity(0.3),
          const Color(0xFF8B5CF6).withOpacity(0.0),
        ],
      ).createShader(Rect.fromCircle(
        center: Offset(cx, cy),
        radius: baseRadius + 20 + breathe,
      ));
    canvas.drawCircle(
      Offset(cx, cy),
      baseRadius + 20 + breathe,
      glowPaint,
    );

    // Main circle
    final mainPaint = Paint()
      ..color = const Color(0xFF1E1E2E)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy), baseRadius + breathe, mainPaint);
  }

  void _paintListening(Canvas canvas, double cx, double cy, double baseRadius) {
    // Dynamic pulsing rings
    for (int ring = 0; ring < 3; ring++) {
      final ringPhase = phase * 2 + ring * 0.5;
      final ringRadius = baseRadius + sin(ringPhase) * 8 + ring * 12;
      final alpha = (0.3 - ring * 0.1).clamp(0.0, 1.0);

      final ringPaint = Paint()
        ..color = const Color(0xFF22C55E).withOpacity(alpha)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;
      canvas.drawCircle(Offset(cx, cy), ringRadius, ringPaint);
    }

    // Animated waveform around circle
    final wavePath = Path();
    final wavePaint = Paint()
      ..color = const Color(0xFF22C55E)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    for (double angle = 0; angle < pi * 2; angle += 0.05) {
      final wave = sin(angle * 8 + phase * 4) * 6;
      final r = baseRadius + wave;
      final x = cx + cos(angle) * r;
      final y = cy + sin(angle) * r;

      if (angle == 0) {
        wavePath.moveTo(x, y);
      } else {
        wavePath.lineTo(x, y);
      }
    }
    wavePath.close();
    canvas.drawPath(wavePath, wavePaint);

    // Inner glow
    final innerPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF22C55E).withOpacity(0.2),
          const Color(0xFF22C55E).withOpacity(0.05),
        ],
      ).createShader(Rect.fromCircle(
        center: Offset(cx, cy),
        radius: baseRadius,
      ));
    canvas.drawCircle(Offset(cx, cy), baseRadius, innerPaint);
  }

  void _paintProcessing(Canvas canvas, double cx, double cy, double baseRadius) {
    // Spinning loader effect
    const segments = 12;
    for (int i = 0; i < segments; i++) {
      final angle = (i / segments) * pi * 2 + phase * 3;
      final alpha = ((i / segments) + sin(phase * 2)) % 1;

      final arcPaint = Paint()
        ..color = const Color(0xFFFACC15).withOpacity(alpha * 0.8)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 4
        ..strokeCap = StrokeCap.round;

      canvas.drawArc(
        Rect.fromCircle(center: Offset(cx, cy), radius: baseRadius),
        angle,
        0.3,
        false,
        arcPaint,
      );
    }

    // Center dot
    final centerPaint = Paint()
      ..color = const Color(0xFFFACC15).withOpacity(0.5)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy), 8, centerPaint);
  }

  void _paintSpeaking(Canvas canvas, double cx, double cy, double baseRadius) {
    // Outer glow
    final outerGlow = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFF8B5CF6).withOpacity(0.4),
          const Color(0xFF8B5CF6).withOpacity(0.0),
        ],
      ).createShader(Rect.fromCircle(
        center: Offset(cx, cy),
        radius: baseRadius + 30,
      ));
    canvas.drawCircle(Offset(cx, cy), baseRadius + 30, outerGlow);

    // Morphing blob shape
    final blobPath = Path();
    const points = 64;

    for (int i = 0; i <= points; i++) {
      final angle = (i / points) * pi * 2;
      // Multiple sine waves for organic movement
      final wave1 = sin(angle * 3 + phase * 2) * 8;
      final wave2 = sin(angle * 5 - phase * 3) * 4;
      final wave3 = sin(angle * 2 + phase) * 6;
      final r = baseRadius + wave1 + wave2 + wave3;
      final x = cx + cos(angle) * r;
      final y = cy + sin(angle) * r;

      if (i == 0) {
        blobPath.moveTo(x, y);
      } else {
        blobPath.lineTo(x, y);
      }
    }
    blobPath.close();

    // Fill
    final fillPaint = Paint()
      ..color = const Color(0xFF8B5CF6).withOpacity(0.15)
      ..style = PaintingStyle.fill;
    canvas.drawPath(blobPath, fillPaint);

    // Stroke
    final strokePaint = Paint()
      ..color = const Color(0xFF8B5CF6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    canvas.drawPath(blobPath, strokePaint);

    // Inner pulse
    final pulseSize = 20 + sin(phase * 4) * 5;
    final innerPulse = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFFA78BFA).withOpacity(0.6),
          const Color(0xFF8B5CF6).withOpacity(0.0),
        ],
      ).createShader(Rect.fromCircle(
        center: Offset(cx, cy),
        radius: pulseSize,
      ));
    canvas.drawCircle(Offset(cx, cy), pulseSize, innerPulse);
  }

  @override
  bool shouldRepaint(covariant _VoiceChatPainter oldDelegate) {
    return oldDelegate.state != state || oldDelegate.phase != phase;
  }
}
