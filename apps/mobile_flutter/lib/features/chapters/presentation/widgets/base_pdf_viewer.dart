import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';
import '../../../../core/storage/secure_storage.dart';
import '../widgets/rotation_hint_overlay.dart';

class BasePdfViewer extends StatefulWidget {
  const BasePdfViewer({
    required this.pdfUrl,
    required this.title,
    required this.onPageChanged,
    this.initialPage = 1,
    this.themeColor = const Color(0xFF2D7061),
    this.showRotationHint = true,
    super.key,
  });

  final String pdfUrl;
  final String title;
  final Function(int currentPage, int totalPages) onPageChanged;
  final int initialPage;
  final Color themeColor;
  final bool showRotationHint;

  @override
  State<BasePdfViewer> createState() => _BasePdfViewerState();
}

class _BasePdfViewerState extends State<BasePdfViewer> {
  final PdfViewerController _pdfController = PdfViewerController();
  final _storage = SecureStorage();
  
  int _currentPage = 1;
  int _totalPages = 0;
  bool _hasJumpedToInitialPage = false;
  bool _showRotationHint = false;

  @override
  void initState() {
    super.initState();
    _checkRotationHint();
  }

  Future<void> _checkRotationHint() async {
    if (!widget.showRotationHint) return;

    final hideHint = await _storage.read('hide_rotation_hint');
    final orientation = MediaQuery.of(context).orientation;

    // Show hint if:
    // 1. User hasn't disabled it
    // 2. Device is in portrait mode
    if (hideHint != 'true' && orientation == Orientation.portrait) {
      setState(() {
        _showRotationHint = true;
      });
    }
  }

  void _onDocumentLoaded(PdfDocumentLoadedDetails details) {
    setState(() {
      _totalPages = details.document.pages.count;
    });

    // Jump to initial page if specified
    if (widget.initialPage > 1 && !_hasJumpedToInitialPage) {
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) {
          _pdfController.jumpToPage(widget.initialPage);
          setState(() {
            _hasJumpedToInitialPage = true;
            _currentPage = widget.initialPage;
          });
        }
      });
    }
  }

  void _onPageChanged(int page) {
    setState(() {
      _currentPage = page;
    });
    widget.onPageChanged(page, _totalPages);
  }

  @override
  void dispose() {
    _pdfController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.title,
          style: const TextStyle(fontSize: 16),
        ),
        backgroundColor: widget.themeColor,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          // Page indicator
          if (_totalPages > 0)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  '$_currentPage / $_totalPages',
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ),
        ],
      ),
      body: Stack(
        children: [
          // PDF Viewer
          SfPdfViewer.network(
            widget.pdfUrl,
            controller: _pdfController,
            onDocumentLoaded: _onDocumentLoaded,
            onPageChanged: (details) => _onPageChanged(details.newPageNumber),
            enableDoubleTapZooming: true,
            canShowScrollHead: true,
            canShowScrollStatus: true,
            pageLayoutMode: PdfPageLayoutMode.continuous,
          ),
          
          // Rotation Hint Overlay
          if (_showRotationHint)
            RotationHintOverlay(
              onDismiss: () {
                setState(() {
                  _showRotationHint = false;
                });
              },
            ),
        ],
      ),
    );
  }
}
