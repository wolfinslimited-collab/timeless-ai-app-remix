import 'dart:math';
import 'package:flutter/material.dart';
import '../../core/theme.dart';

/// Animated audio waveform visualization widget
class AudioWaveformWidget extends StatefulWidget {
  final bool isPlaying;
  final int barCount;
  final double height;
  final Color? color;
  final Color? glowColor;

  const AudioWaveformWidget({
    super.key,
    required this.isPlaying,
    this.barCount = 20,
    this.height = 40,
    this.color,
    this.glowColor,
  });

  @override
  State<AudioWaveformWidget> createState() => _AudioWaveformWidgetState();
}

class _AudioWaveformWidgetState extends State<AudioWaveformWidget>
    with TickerProviderStateMixin {
  late AnimationController _controller;
  late List<double> _barHeights;
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    _barHeights = List.generate(widget.barCount, (i) => 0.2 + _random.nextDouble() * 0.3);
    
    _controller = AnimationController(
      duration: const Duration(milliseconds: 150),
      vsync: this,
    );

    _controller.addListener(() {
      if (widget.isPlaying) {
        setState(() {
          for (int i = 0; i < _barHeights.length; i++) {
            // Animate heights with smooth transitions
            final target = 0.1 + _random.nextDouble() * 0.9;
            _barHeights[i] = _barHeights[i] + (target - _barHeights[i]) * 0.3;
          }
        });
      }
    });
  }

  @override
  void didUpdateWidget(AudioWaveformWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isPlaying && !_controller.isAnimating) {
      _controller.repeat();
    } else if (!widget.isPlaying && _controller.isAnimating) {
      _controller.stop();
      // Reset to idle state
      setState(() {
        for (int i = 0; i < _barHeights.length; i++) {
          _barHeights[i] = 0.15 + sin(i * 0.4) * 0.1;
        }
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final barColor = widget.color ?? AppTheme.primary;
    final glow = widget.glowColor ?? barColor.withOpacity(0.4);

    return SizedBox(
      height: widget.height,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: List.generate(widget.barCount, (index) {
          final height = _barHeights[index] * widget.height;
          
          return AnimatedContainer(
            duration: const Duration(milliseconds: 100),
            width: 3,
            height: height.clamp(4.0, widget.height),
            decoration: BoxDecoration(
              color: barColor,
              borderRadius: BorderRadius.circular(2),
              boxShadow: widget.isPlaying
                  ? [
                      BoxShadow(
                        color: glow,
                        blurRadius: 8,
                        spreadRadius: 0,
                      ),
                    ]
                  : null,
            ),
          );
        }),
      ),
    );
  }
}

/// Static waveform for display purposes (like a spectrogram pattern)
class StaticWaveformWidget extends StatelessWidget {
  final int barCount;
  final double height;
  final Color? color;

  const StaticWaveformWidget({
    super.key,
    this.barCount = 32,
    this.height = 40,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final barColor = color ?? AppTheme.foreground.withOpacity(0.4);
    final random = Random(42); // Fixed seed for consistent pattern

    return SizedBox(
      height: height,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: List.generate(barCount, (index) {
          // Create a pleasing wave pattern
          final baseHeight = sin(index * 0.4) * 0.3 + 0.4;
          final variation = random.nextDouble() * 0.2;
          final barHeight = (baseHeight + variation) * height;

          return Container(
            width: 3,
            height: barHeight.clamp(4.0, height),
            decoration: BoxDecoration(
              color: barColor,
              borderRadius: BorderRadius.circular(2),
            ),
          );
        }),
      ),
    );
  }
}

/// Real-time waveform that responds to audio data
class LiveWaveformWidget extends StatefulWidget {
  final Stream<List<double>>? audioDataStream;
  final int barCount;
  final double height;
  final Color? color;

  const LiveWaveformWidget({
    super.key,
    this.audioDataStream,
    this.barCount = 48,
    this.height = 60,
    this.color,
  });

  @override
  State<LiveWaveformWidget> createState() => _LiveWaveformWidgetState();
}

class _LiveWaveformWidgetState extends State<LiveWaveformWidget> {
  List<double> _audioData = [];

  @override
  void initState() {
    super.initState();
    _audioData = List.filled(widget.barCount, 0.1);
    
    widget.audioDataStream?.listen((data) {
      if (mounted) {
        setState(() {
          _audioData = data;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final barColor = widget.color ?? AppTheme.foreground;

    return SizedBox(
      height: widget.height,
      child: CustomPaint(
        size: Size.infinite,
        painter: _WaveformPainter(
          data: _audioData,
          color: barColor,
          barCount: widget.barCount,
        ),
      ),
    );
  }
}

class _WaveformPainter extends CustomPainter {
  final List<double> data;
  final Color color;
  final int barCount;

  _WaveformPainter({
    required this.data,
    required this.color,
    required this.barCount,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final centerY = size.height / 2;
    final barWidth = 3.0;
    final totalWidth = size.width * 0.8;
    final startX = (size.width - totalWidth) / 2;
    final spacing = (totalWidth - barCount * barWidth) / (barCount - 1);

    final paint = Paint()
      ..color = color
      ..strokeCap = StrokeCap.round;

    final glowPaint = Paint()
      ..color = color.withOpacity(0.3)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);

    for (int i = 0; i < barCount && i < data.length; i++) {
      final value = data[i].clamp(0.05, 1.0);
      final barHeight = value * size.height * 0.85;
      final x = startX + i * (barWidth + spacing);
      final halfHeight = barHeight / 2;

      // Draw glow
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: Offset(x + barWidth / 2, centerY),
            width: barWidth + 2,
            height: barHeight,
          ),
          const Radius.circular(2),
        ),
        glowPaint,
      );

      // Draw bar
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromCenter(
            center: Offset(x + barWidth / 2, centerY),
            width: barWidth,
            height: barHeight,
          ),
          const Radius.circular(2),
        ),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(_WaveformPainter oldDelegate) {
    return oldDelegate.data != data;
  }
}
