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
        // Web's .reader__watermark applies opacity: 0.18 on top of the SVG
        // text's own fill: rgba(0,0,0,0.6) — the actual visible strength is
        // the product of the two, ~0.11, not the 0.6 alone.
        child: Opacity(
          opacity: 0.18,
          child: CustomPaint(painter: _WatermarkPainter(text: text)),
        ),
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
        style: const TextStyle(
          // Text fill alpha matches the SVG's own fill: rgba(0,0,0,0.6) in
          // useWatermark.js — the outer Opacity(0.18) above is what actually
          // makes it faint, same as web's .reader__watermark CSS.
          color: Color.fromRGBO(0, 0, 0, 0.6),
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
