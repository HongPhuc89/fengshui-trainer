import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';

class BasePdfViewer extends StatefulWidget {
  const BasePdfViewer({
    required this.pdfUrl,
    required this.title,
    required this.onPageChanged,
    this.initialPage = 1,
    this.themeColor = const Color(0xFF2D7061),
    super.key,
  });

  final String pdfUrl;
  final String title;
  final Function(int currentPage, int totalPages) onPageChanged;
  final int initialPage;
  final Color themeColor;

  @override
  State<BasePdfViewer> createState() => _BasePdfViewerState();
}

class _BasePdfViewerState extends State<BasePdfViewer> {
  final PdfViewerController _pdfController = PdfViewerController();
  
  int _currentPage = 1;
  int _totalPages = 0;
  bool _hasJumpedToInitialPage = false;

  @override
  void initState() {
    super.initState();
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
  
  void _toggleOrientation() {
    final currentOrientation = MediaQuery.of(context).orientation;
    if (currentOrientation == Orientation.portrait) {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
    } else {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
      ]);
    }
  }

  @override
  void dispose() {
    // Reset orientation when leaving
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
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
          // Rotation toggle button
          IconButton(
            icon: const Icon(Icons.screen_rotation),
            tooltip: 'Xoay màn hình',
            onPressed: _toggleOrientation,
          ),
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
      body: widget.pdfUrl.startsWith('http')
          ? SfPdfViewer.network(
              widget.pdfUrl,
              controller: _pdfController,
              onDocumentLoaded: _onDocumentLoaded,
              onPageChanged: (details) => _onPageChanged(details.newPageNumber),
              enableDoubleTapZooming: true,
              canShowScrollHead: true,
              canShowScrollStatus: true,
              pageLayoutMode: PdfPageLayoutMode.continuous,
            )
          : SfPdfViewer.file(
              File(widget.pdfUrl),
              controller: _pdfController,
              onDocumentLoaded: _onDocumentLoaded,
              onPageChanged: (details) => _onPageChanged(details.newPageNumber),
              enableDoubleTapZooming: true,
              canShowScrollHead: true,
              canShowScrollStatus: true,
              pageLayoutMode: PdfPageLayoutMode.continuous,
            ),
    );
  }
}
