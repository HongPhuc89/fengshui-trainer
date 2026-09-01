import 'package:flutter/material.dart';

/// Floating email watermark over the video area.
///
/// Visible continuously and drifts through 5 waypoints on a 120s linear loop,
/// mirroring the web player's `wm-drift` CSS keyframes (VideoPlayerArea.vue)
/// so the deterrent is equally hard to frame out of a screen recording on
/// both platforms.
class VideoWatermarkOverlay extends StatefulWidget {
  final String text; // user.email

  const VideoWatermarkOverlay({super.key, required this.text});

  @override
  State<VideoWatermarkOverlay> createState() => _VideoWatermarkOverlayState();
}

// (top%, left%) waypoints, matching wm-drift's 0/20/40/60/80/100% keyframes.
const _waypoints = [
  Offset(0.12, 0.08),
  Offset(0.72, 0.55),
  Offset(0.18, 0.68),
  Offset(0.68, 0.10),
  Offset(0.40, 0.40),
  Offset(0.12, 0.08),
];

class _VideoWatermarkOverlayState extends State<VideoWatermarkOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 120),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Offset _positionAt(double t) {
    final segment = t * (_waypoints.length - 1);
    final index = segment.floor().clamp(0, _waypoints.length - 2);
    final localT = segment - index;
    return Offset.lerp(_waypoints[index], _waypoints[index + 1], localT)!;
  }

  @override
  Widget build(BuildContext context) {
    // Positioned.fill first: Stack sizes non-positioned children to fit, so a
    // bare LayoutBuilder here would receive loose constraints instead of the
    // video box's real size. Filling the Stack first gives the LayoutBuilder
    // below the true dimensions to compute waypoint pixels from.
    return Positioned.fill(
      child: LayoutBuilder(
        builder: (context, constraints) {
          return AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              final pos = _positionAt(_controller.value);
              return Stack(
                children: [
                  Positioned(
                    top: pos.dx * constraints.maxHeight,
                    left: pos.dy * constraints.maxWidth,
                    child: child!,
                  ),
                ],
              );
            },
            child: IgnorePointer(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.45),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  widget.text,
                  style: const TextStyle(color: Colors.white70, fontSize: 11),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
