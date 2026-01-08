import 'package:flutter/material.dart';
import '../../data/models/mindmap_models.dart';

/// Position information for a node
class NodePosition {

  NodePosition(this.node, this.position, this.depth);
  final MindMapNode node;
  final Offset position;
  final int depth;
}

/// Custom painter for rendering mindmap
class MindmapPainter extends CustomPainter {

  MindmapPainter({
    required this.mindmap,
    this.nodeWidth = 150,
    this.nodeHeight = 60,
    this.horizontalSpacing = 100,
    this.verticalSpacing = 80,
  });
  final MindMap mindmap;
  final double nodeWidth;
  final double nodeHeight;
  final double horizontalSpacing;
  final double verticalSpacing;

  @override
  void paint(Canvas canvas, Size size) {
    // Calculate node positions using tree layout
    final positions = _calculatePositions();

    // Draw connections first (so they appear behind nodes)
    _drawConnections(canvas, positions);

    // Draw nodes
    _drawNodes(canvas, positions);
  }

  List<NodePosition> _calculatePositions() {
    final positions = <NodePosition>[];
    _layoutNode(mindmap.structure, 50, 50, 0, positions);
    return positions;
  }

  double _layoutNode(
    MindMapNode node,
    double x,
    double y,
    int depth,
    List<NodePosition> positions,
  ) {
    // Add this node's position
    positions.add(NodePosition(node, Offset(x, y), depth));

    if (node.children == null || node.children!.isEmpty) {
      return y;
    }

    // Layout children vertically
    double childY = y;
    final childX = x + nodeWidth + horizontalSpacing;

    for (final child in node.children!) {
      childY = _layoutNode(child, childX, childY, depth + 1, positions);
      childY += verticalSpacing;
    }

    // Return the bottom Y position
    return childY - verticalSpacing;
  }

  void _drawConnections(Canvas canvas, List<NodePosition> positions) {
    final paint = Paint()
      ..color = Colors.grey.shade400
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    for (final pos in positions) {
      if (pos.node.children != null) {
        for (final child in pos.node.children!) {
          // Find child position
          final childPos = positions.firstWhere((p) => p.node.id == child.id);

          // Draw line from right of parent to left of child
          final startX = pos.position.dx + nodeWidth;
          final startY = pos.position.dy + nodeHeight / 2;
          final endX = childPos.position.dx;
          final endY = childPos.position.dy + nodeHeight / 2;

          // Draw curved line
          final path = Path();
          path.moveTo(startX, startY);
          path.cubicTo(
            startX + horizontalSpacing / 2,
            startY,
            endX - horizontalSpacing / 2,
            endY,
            endX,
            endY,
          );

          canvas.drawPath(path, paint);
        }
      }
    }
  }

  void _drawNodes(Canvas canvas, List<NodePosition> positions) {
    for (final pos in positions) {
      _drawNode(canvas, pos);
    }
  }

  void _drawNode(Canvas canvas, NodePosition pos) {
    final rect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        pos.position.dx,
        pos.position.dy,
        nodeWidth,
        nodeHeight,
      ),
      const Radius.circular(8),
    );

    // Get color based on depth
    final color = _getColorForDepth(pos.depth);

    // Draw node background
    final bgPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    canvas.drawRRect(rect, bgPaint);

    // Draw node border
    final borderPaint = Paint()
      ..color = color.withOpacity(0.8)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(rect, borderPaint);

    // Draw text
    final textPainter = TextPainter(
      text: TextSpan(
        text: pos.node.label,
        style: TextStyle(
          color: _getTextColor(color),
          fontSize: 14,
          fontWeight: pos.depth == 0 ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
      maxLines: 2,
      ellipsis: '...',
    );

    textPainter.layout(maxWidth: nodeWidth - 16);

    final textX = pos.position.dx + (nodeWidth - textPainter.width) / 2;
    final textY = pos.position.dy + (nodeHeight - textPainter.height) / 2;

    textPainter.paint(canvas, Offset(textX, textY));
  }

  Color _getColorForDepth(int depth) {
    final colors = [
      Colors.blue.shade100,
      Colors.green.shade100,
      Colors.orange.shade100,
      Colors.purple.shade100,
      Colors.pink.shade100,
    ];
    return colors[depth % colors.length];
  }

  Color _getTextColor(Color backgroundColor) {
    // Calculate luminance to determine if text should be dark or light
    final luminance = backgroundColor.computeLuminance();
    return luminance > 0.5 ? Colors.black87 : Colors.white;
  }

  @override
  bool shouldRepaint(MindmapPainter oldDelegate) {
    return mindmap != oldDelegate.mindmap;
  }
}
