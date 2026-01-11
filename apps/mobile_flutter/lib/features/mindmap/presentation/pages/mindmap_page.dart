import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../providers/mindmap_provider.dart';

class MindmapPage extends ConsumerStatefulWidget {
  const MindmapPage({
    required this.bookId,
    required this.chapterId,
    super.key,
  });

  final int bookId;
  final int chapterId;

  @override
  ConsumerState<MindmapPage> createState() => _MindmapPageState();
}

class _MindmapPageState extends ConsumerState<MindmapPage> {
  late final WebViewController _webViewController;
  bool _hasLoadedHtml = false;

  @override
  void initState() {
    super.initState();
    _initializeWebView();
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(mindmapProvider.notifier).loadMindmap(
            bookId: widget.bookId,
            chapterId: widget.chapterId,
          );
    });
  }

  void _initializeWebView() {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.transparent)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) {
            debugPrint('🗺️ [Mindmap] WebView page finished loading');
          },
        ),
      )
      ..setOnConsoleMessage((JavaScriptConsoleMessage message) {
        // Disabled to prevent OutOfMemoryError
        // debugPrint('🗺️ [Mindmap Console] ${message.level.name}: ${message.message}');
      });
  }

  String _generateMarkmapHTML(String markdown) {
    final sanitizedMarkdown = markdown.replaceAll('\r', '');
    final markdownInJs = sanitizedMarkdown
        .replaceAll('`', '\\`')
        .replaceAll('\$', '\\\$')
        .replaceAll('\n', '\\n');

    return '''
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #f0f0f0;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }
    #mindmap {
      width: 100vw;
      height: 100vh;
    }
    svg {
      width: 100%;
      height: 100%;
      background: #f0f0f0;
    }
    .markmap-node circle {
      fill: #fff;
      stroke-width: 2.5;
      transition: all 0.3s ease;
    }
    .markmap-node:hover circle {
      stroke-width: 3;
      filter: brightness(1.1);
    }
    .markmap-node text {
      fill: #333;
      font-size: 14px;
      font-weight: 500;
    }
    .markmap-link {
      stroke: #999;
      stroke-width: 1.5;
      fill: none;
    }
    /* Style for expand/collapse buttons */
    .markmap-fold circle {
      fill: rgb(186, 211, 238);
      stroke: rgb(150, 180, 210);
      stroke-width: 2;
    }
    .markmap-fold:hover circle {
      fill: rgb(150, 180, 210);
      stroke: rgb(120, 150, 180);
    }
    .markmap-fold text {
      fill: #333;
      font-size: 14px;
      font-weight: bold;
      text-anchor: middle;
      dominant-baseline: central;
      font-family: Arial, sans-serif;
    }

    
  </style>
  <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-view@0.18"></script>
  <script src="https://cdn.jsdelivr.net/npm/markmap-lib@0.18"></script>
</head>
<body>
  <svg id="mindmap"></svg>
  <script>
    try {
      let waitCount = 0;
      function startMarkmap() {
        const markmap = window.markmap;
        const markmapView = window.markmapView;
        
        const isMarkmapReady = !!markmap && !!(markmapView || (markmap && markmap.Markmap));

        if (!isMarkmapReady && waitCount < 25) {
          waitCount++;
          setTimeout(startMarkmap, 200);
          return;
        }

        const { Transformer } = markmap;
        const Markmap = (markmapView && markmapView.Markmap) || markmap.Markmap;
        
        if (!Markmap || !Transformer) {
          throw new Error('Markmap or Transformer not found');
        }

        const markdown = `$markdownInJs`;
        const transformer = new Transformer();
        const { root } = transformer.transform(markdown);

        const svg = document.getElementById('mindmap');
        const mm = Markmap.create(svg, {
          color: (node) => {
            const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
            return colors[node.depth % colors.length];
          },
          duration: 500,
          maxWidth: 300,
          paddingX: 20,
          autoFit: true,
          zoom: true,
          pan: true,
        }, root);

        window.markmapInstance = mm;

        // Function to recursively fold nodes deeper than root (depth > 0)
        function foldDeepNodes(node, currentDepth) {
          if (currentDepth > 0 && node.children && node.children.length > 0) {
            // Fold this node (hide its children)
            node.payload = node.payload || {};
            node.payload.fold = 1;
          }
          
          // Recursively process children
          if (node.children) {
            node.children.forEach(child => {
              foldDeepNodes(child, currentDepth + 1);
            });
          }
        }

        // Fold all nodes except root (depth 0)
        foldDeepNodes(root, 0);
        
        // Render with folded state
        mm.setData(root);

        setTimeout(() => {
          mm.fit();
        }, 200);

        window.addEventListener('resize', () => {
          mm.fit();
        });
      }

      if (document.readyState === 'complete') {
        startMarkmap();
      } else {
        window.addEventListener('load', startMarkmap);
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
  </script>
</body>
</html>
    ''';
  }

  void _zoomIn() {
    _webViewController.runJavaScript('''
      if (window.markmapInstance) {
        window.markmapInstance.rescale(1.2);
      }
    ''');
  }

  void _zoomOut() {
    _webViewController.runJavaScript('''
      if (window.markmapInstance) {
        window.markmapInstance.rescale(0.8);
      }
    ''');
  }

  void _fitToScreen() {
    _webViewController.runJavaScript('''
      if (window.markmapInstance) {
        window.markmapInstance.fit();
      }
    ''');
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(mindmapProvider);

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          color: Color(0xFFf0f0f0),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Color(0xFF333333)),
                      onPressed: () => context.go('/books/${widget.bookId}/chapters/${widget.chapterId}'),
                    ),
                    Expanded(
                      child: Text(
                        state.mindmap?.title ?? 'Mindmap',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF333333),
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, color: Color(0xFF333333)),
                      onPressed: () {
                        ref.read(mindmapProvider.notifier).loadMindmap(
                              bookId: widget.bookId,
                              chapterId: widget.chapterId,
                            );
                      },
                    ),
                  ],
                ),
              ),
              
              // Content
              Expanded(
                child: _buildBody(state),
              ),
              
              // Info Footer
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Color(0xFF6366f1), size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Chạm và kéo để xem toàn bộ mindmap • Nhấn vào nút tròn để mở rộng',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: state.mindmap != null
          ? Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FloatingActionButton(
                  heroTag: 'zoom_in',
                  mini: true,
                  backgroundColor: const Color(0xFF667eea),
                  onPressed: _zoomIn,
                  child: const Icon(Icons.add, color: Colors.white),
                ),
                const SizedBox(height: 8),
                FloatingActionButton(
                  heroTag: 'zoom_out',
                  mini: true,
                  backgroundColor: const Color(0xFF667eea),
                  onPressed: _zoomOut,
                  child: const Icon(Icons.remove, color: Colors.white),
                ),
                const SizedBox(height: 8),
                FloatingActionButton(
                  heroTag: 'fit',
                  mini: true,
                  backgroundColor: const Color(0xFF667eea),
                  onPressed: _fitToScreen,
                  child: const Icon(Icons.fit_screen, color: Colors.white),
                ),
              ],
            )
          : null,
    );
  }

  Widget _buildBody(MindmapState state) {
    if (state.isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    if (state.error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.white),
              const SizedBox(height: 16),
              Text(
                state.error!,
                style: const TextStyle(fontSize: 16, color: Colors.white),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    _hasLoadedHtml = false;
                  });
                  ref.read(mindmapProvider.notifier).loadMindmap(
                        bookId: widget.bookId,
                        chapterId: widget.chapterId,
                      );
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Thử lại'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF667eea),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (state.mindmap == null || state.mindmap!.markdownContent.isEmpty) {
      return const Center(
        child: Text(
          'Chương này chưa có mindmap',
          style: TextStyle(fontSize: 16, color: Colors.white),
        ),
      );
    }

    // Load HTML into WebView only once when mindmap data is available
    if (!_hasLoadedHtml) {
      debugPrint('🗺️ [Mindmap] Loading HTML with markdown content length: ${state.mindmap!.markdownContent.length}');
      final html = _generateMarkmapHTML(state.mindmap!.markdownContent);
      _webViewController.loadRequest(
        Uri.dataFromString(
          html,
          mimeType: 'text/html',
          encoding: Encoding.getByName('utf-8'),
        ),
      );
      _hasLoadedHtml = true;
    }

    return WebViewWidget(controller: _webViewController);
  }
}
