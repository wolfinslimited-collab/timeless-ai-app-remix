import 'package:flutter/material.dart';

/// Google logo with colored SVG-style design
class GoogleIcon extends StatelessWidget {
  final double size;
  
  const GoogleIcon({super.key, this.size = 20});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        size: Size(size, size),
        painter: _GoogleLogoPainter(),
      ),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double scale = size.width / 24;
    
    // Blue path
    final bluePaint = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.fill;
    
    final bluePath = Path()
      ..moveTo(22.56 * scale, 12.25 * scale)
      ..cubicTo(22.56 * scale, 11.47 * scale, 22.49 * scale, 10.72 * scale, 22.36 * scale, 10 * scale)
      ..lineTo(12 * scale, 10 * scale)
      ..lineTo(12 * scale, 14.26 * scale)
      ..lineTo(17.92 * scale, 14.26 * scale)
      ..cubicTo(17.66 * scale, 15.63 * scale, 16.88 * scale, 16.79 * scale, 15.71 * scale, 17.57 * scale)
      ..lineTo(15.71 * scale, 20.34 * scale)
      ..lineTo(19.28 * scale, 20.34 * scale)
      ..cubicTo(21.36 * scale, 18.42 * scale, 22.56 * scale, 15.6 * scale, 22.56 * scale, 12.25 * scale)
      ..close();
    
    canvas.drawPath(bluePath, bluePaint);
    
    // Green path
    final greenPaint = Paint()
      ..color = const Color(0xFF34A853)
      ..style = PaintingStyle.fill;
    
    final greenPath = Path()
      ..moveTo(12 * scale, 23 * scale)
      ..cubicTo(14.97 * scale, 23 * scale, 17.46 * scale, 22.02 * scale, 19.28 * scale, 20.34 * scale)
      ..lineTo(15.71 * scale, 17.57 * scale)
      ..cubicTo(14.73 * scale, 18.23 * scale, 13.48 * scale, 18.63 * scale, 12 * scale, 18.63 * scale)
      ..cubicTo(9.14 * scale, 18.63 * scale, 6.71 * scale, 16.7 * scale, 5.84 * scale, 14.1 * scale)
      ..lineTo(2.18 * scale, 14.1 * scale)
      ..lineTo(2.18 * scale, 16.94 * scale)
      ..cubicTo(3.99 * scale, 20.53 * scale, 7.7 * scale, 23 * scale, 12 * scale, 23 * scale)
      ..close();
    
    canvas.drawPath(greenPath, greenPaint);
    
    // Yellow path
    final yellowPaint = Paint()
      ..color = const Color(0xFFFBBC05)
      ..style = PaintingStyle.fill;
    
    final yellowPath = Path()
      ..moveTo(5.84 * scale, 14.09 * scale)
      ..cubicTo(5.62 * scale, 13.43 * scale, 5.49 * scale, 12.73 * scale, 5.49 * scale, 12 * scale)
      ..cubicTo(5.49 * scale, 11.27 * scale, 5.62 * scale, 10.57 * scale, 5.84 * scale, 9.91 * scale)
      ..lineTo(5.84 * scale, 7.07 * scale)
      ..lineTo(2.18 * scale, 7.07 * scale)
      ..cubicTo(1.43 * scale, 8.55 * scale, 1 * scale, 10.22 * scale, 1 * scale, 12 * scale)
      ..cubicTo(1 * scale, 13.78 * scale, 1.43 * scale, 15.45 * scale, 2.18 * scale, 16.93 * scale)
      ..lineTo(5.84 * scale, 14.09 * scale)
      ..close();
    
    canvas.drawPath(yellowPath, yellowPaint);
    
    // Red path
    final redPaint = Paint()
      ..color = const Color(0xFFEA4335)
      ..style = PaintingStyle.fill;
    
    final redPath = Path()
      ..moveTo(12 * scale, 5.38 * scale)
      ..cubicTo(13.62 * scale, 5.38 * scale, 15.06 * scale, 5.94 * scale, 16.21 * scale, 7.02 * scale)
      ..lineTo(19.36 * scale, 3.87 * scale)
      ..cubicTo(17.45 * scale, 2.09 * scale, 14.97 * scale, 1 * scale, 12 * scale, 1 * scale)
      ..cubicTo(7.7 * scale, 1 * scale, 3.99 * scale, 3.47 * scale, 2.18 * scale, 7.07 * scale)
      ..lineTo(5.84 * scale, 9.91 * scale)
      ..cubicTo(6.71 * scale, 7.31 * scale, 9.14 * scale, 5.38 * scale, 12 * scale, 5.38 * scale)
      ..close();
    
    canvas.drawPath(redPath, redPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Apple logo icon
class AppleIcon extends StatelessWidget {
  final double size;
  final Color? color;
  
  const AppleIcon({super.key, this.size = 20, this.color});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        size: Size(size, size),
        painter: _AppleLogoPainter(color: color ?? Colors.white),
      ),
    );
  }
}

class _AppleLogoPainter extends CustomPainter {
  final Color color;
  
  _AppleLogoPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final double scale = size.width / 24;
    
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    
    final path = Path()
      ..moveTo(17.05 * scale, 20.28 * scale)
      ..cubicTo(16.07 * scale, 21.23 * scale, 15 * scale, 21.08 * scale, 13.97 * scale, 20.63 * scale)
      ..cubicTo(12.88 * scale, 20.17 * scale, 11.88 * scale, 20.15 * scale, 10.73 * scale, 20.63 * scale)
      ..cubicTo(9.29 * scale, 21.25 * scale, 8.53 * scale, 21.07 * scale, 7.67 * scale, 20.28 * scale)
      ..cubicTo(2.79 * scale, 15.25 * scale, 3.51 * scale, 7.59 * scale, 9.05 * scale, 7.31 * scale)
      ..cubicTo(10.4 * scale, 7.38 * scale, 11.34 * scale, 8.05 * scale, 12.13 * scale, 8.11 * scale)
      ..cubicTo(13.31 * scale, 7.87 * scale, 14.44 * scale, 7.18 * scale, 15.7 * scale, 7.27 * scale)
      ..cubicTo(17.21 * scale, 7.39 * scale, 18.35 * scale, 7.99 * scale, 19.1 * scale, 9.07 * scale)
      ..cubicTo(15.98 * scale, 10.94 * scale, 16.72 * scale, 15.05 * scale, 19.58 * scale, 16.2 * scale)
      ..cubicTo(19.01 * scale, 17.7 * scale, 18.27 * scale, 19.19 * scale, 17.04 * scale, 20.29 * scale)
      ..lineTo(17.05 * scale, 20.28 * scale)
      ..close()
      ..moveTo(12.03 * scale, 7.25 * scale)
      ..cubicTo(11.88 * scale, 5.02 * scale, 13.69 * scale, 3.18 * scale, 15.77 * scale, 3 * scale)
      ..cubicTo(16.06 * scale, 5.58 * scale, 13.43 * scale, 7.5 * scale, 12.03 * scale, 7.25 * scale)
      ..close();
    
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
