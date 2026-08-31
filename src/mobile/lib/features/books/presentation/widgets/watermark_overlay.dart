import 'dart:math';

import 'package:flutter/material.dart';

class WatermarkOverlay extends StatelessWidget {
  final String text;
  const WatermarkOverlay({super.key, required this.text});

  @override
  Widget build(BuildContext context) {
    // Mirrors the web reader's own v-if="watermarkText" (useWatermark.js) —
    // an empty identity string would just paint a grid of nothing.
    if (text.trim().isEmpty) return const SizedBox.shrink();
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
          // 0.12 (the value this used to be) reads as "not there" against
          // anything but a plain light page — the web reader's own
          // watermark (useWatermark.js) is 0.6, dark, and bold; matched here
          // for the same reason web's is: it has to survive a screenshot.
          color: Colors.black.withOpacity(0.6),
          fontSize: 13,
          fontWeight: FontWeight.w600,
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
