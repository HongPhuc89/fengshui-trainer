import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';

/// Floating email watermark over the video area.
/// Appears every 30s for 5s at a random position — per §4.5 design spec.
class VideoWatermarkOverlay extends StatefulWidget {
  final String text; // user.email

  const VideoWatermarkOverlay({super.key, required this.text});

  @override
  State<VideoWatermarkOverlay> createState() =>
      _VideoWatermarkOverlayState();
}

class _VideoWatermarkOverlayState
    extends State<VideoWatermarkOverlay> {
  Timer? _timer;
  bool _visible = false;
  double _top = 48;
  double _left = 12;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!mounted) return;
      final size = MediaQuery.of(context).size;
      final videoHeight = size.width * 9 / 16;
      setState(() {
        _visible = true;
        _top = 8 + Random().nextDouble() * (videoHeight - 40).clamp(8, videoHeight - 40);
        _left = 8 + Random().nextDouble() * (size.width - 160).clamp(8, size.width - 160);
      });
      Future.delayed(const Duration(seconds: 5), () {
        if (mounted) setState(() => _visible = false);
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_visible) return const SizedBox.shrink();
    return Positioned(
      top: _top,
      left: _left,
      child: IgnorePointer(
        child: Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.45),
            borderRadius: BorderRadius.circular(4),
          ),
          child: Text(
            widget.text,
            style: const TextStyle(
                color: Colors.white70, fontSize: 11),
          ),
        ),
      ),
    );
  }
}
