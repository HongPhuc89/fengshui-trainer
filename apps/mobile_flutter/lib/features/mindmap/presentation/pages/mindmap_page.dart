import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/mindmap_provider.dart';
import '../widgets/mindmap_painter.dart';

class MindmapPage extends ConsumerStatefulWidget {

  const MindmapPage({
    required this.bookId, required this.chapterId, super.key,
  });
  final int bookId;
  final int chapterId;

  @override
  ConsumerState<MindmapPage> createState() => _MindmapPageState();
}

class _MindmapPageState extends ConsumerState<MindmapPage> {
  final TransformationController _transformationController =
      TransformationController();

  @override
  void initState() {
    super.initState();
    // Load mindmap when page opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(mindmapProvider.notifier).loadMindmap(
            bookId: widget.bookId,
            chapterId: widget.chapterId,
          );
    });
  }

  @override
  void dispose() {
    _transformationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(mindmapProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(state.mindmap?.title ?? 'Mindmap'),
        actions: [
          if (state.mindmap != null) ...[
            IconButton(
              icon: const Icon(Icons.zoom_in),
              onPressed: _zoomIn,
              tooltip: 'Phóng to',
            ),
            IconButton(
              icon: const Icon(Icons.zoom_out),
              onPressed: _zoomOut,
              tooltip: 'Thu nhỏ',
            ),
            IconButton(
              icon: const Icon(Icons.center_focus_strong),
              onPressed: _resetZoom,
              tooltip: 'Đặt lại',
            ),
          ],
        ],
      ),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(MindmapState state) {
    if (state.isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (state.error != null) {
      return _buildError(state.error!);
    }

    if (state.mindmap == null) {
      return const Center(
        child: Text(
          'Chương này chưa có mindmap',
          style: TextStyle(fontSize: 16, color: Colors.grey),
        ),
      );
    }

    return _buildMindmapView(state.mindmap);
  }

  Widget _buildError(String error) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 64,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            Text(
              error,
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                ref.read(mindmapProvider.notifier).loadMindmap(
                      bookId: widget.bookId,
                      chapterId: widget.chapterId,
                    );
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMindmapView(mindmap) {
    return Column(
      children: [
        // Info banner
        Container(
          padding: const EdgeInsets.all(12),
          color: Colors.blue.shade50,
          child: Row(
            children: [
              const Icon(Icons.info_outline, color: Colors.blue, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Sử dụng 2 ngón tay để phóng to/thu nhỏ, kéo để di chuyển',
                  style: TextStyle(fontSize: 12, color: Colors.blue.shade700),
                ),
              ),
            ],
          ),
        ),

        // Mindmap viewer
        Expanded(
          child: InteractiveViewer(
            transformationController: _transformationController,
            minScale: 0.1,
            maxScale: 4,
            boundaryMargin: const EdgeInsets.all(double.infinity),
            child: CustomPaint(
              painter: MindmapPainter(mindmap: mindmap),
              size: Size(
                _calculateCanvasWidth(mindmap),
                _calculateCanvasHeight(mindmap),
              ),
            ),
          ),
        ),

        // Stats footer
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.grey.shade100,
            border: Border(
              top: BorderSide(color: Colors.grey.shade300),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStat(Icons.account_tree, 'Nodes', '${mindmap.totalNodes}'),
              _buildStat(Icons.layers, 'Levels', '${mindmap.maxDepth}'),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStat(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey.shade600),
        const SizedBox(width: 4),
        Text(
          '$label: ',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  double _calculateCanvasWidth(mindmap) {
    // Estimate width based on max depth
    final depth = mindmap.maxDepth;
    return 50 +
        (depth * (150 + 100)) +
        50; // padding + (depth * (nodeWidth + spacing)) + padding
  }

  double _calculateCanvasHeight(mindmap) {
    // Estimate height based on total nodes
    final nodes = mindmap.totalNodes;
    return (50 + (nodes * (60 + 80)))
        .toDouble(); // padding + (nodes * (nodeHeight + spacing))
  }

  void _zoomIn() {
    final currentScale = _transformationController.value.getMaxScaleOnAxis();
    final newScale = (currentScale * 1.2).clamp(0.1, 4.0);
    _transformationController.value = Matrix4.identity()..scale(newScale);
  }

  void _zoomOut() {
    final currentScale = _transformationController.value.getMaxScaleOnAxis();
    final newScale = (currentScale / 1.2).clamp(0.1, 4.0);
    _transformationController.value = Matrix4.identity()..scale(newScale);
  }

  void _resetZoom() {
    _transformationController.value = Matrix4.identity();
  }
}
