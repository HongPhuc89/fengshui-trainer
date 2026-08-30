import 'dart:math';

import 'package:flutter/material.dart';

class WatermarkOverlay extends StatelessWidget {
  final String text;
  const WatermarkOverlay({super.key, required this.text});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: SizedBox.expand(
        child: CustomPaint(painter: _WatermarkPainter(text: text)),
      ),
    );
  }
}

class _WatermarkPainter extends CustomPainter {
  final String text;
  _WatermarkPainter({required this.text});

  @override
  void paint(Canvas canvas, Size size) {
    final tp = TextPainter(
      text: TextSpan(
        text: text,
        style: TextStyle(
          color: Colors.grey.withOpacity(0.12),
          fontSize: 13,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    canvas.save();
    canvas.rotate(-pi / 6);
    for (double y = -size.height; y < size.height * 2; y += 120) {
      for (double x = -size.width; x < size.width * 2; x += 200) {
        tp.paint(canvas, Offset(x, y));
      }
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter old) => false;
}

class BlurOverlay extends StatelessWidget {
  const BlurOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(color: Colors.black);
  }
}
