import 'dart:io';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';

import '../../../../core/services/pdf_cache_service.dart';
import '../../../books/data/models/book_models.dart';
import '../../../books/presentation/providers/books_provider.dart';
import '../providers/reading_progress_provider.dart';

class ChapterDetailPage extends ConsumerStatefulWidget {

  const ChapterDetailPage({
    required this.bookId, required this.chapterId, super.key,
  });
  final int bookId;
  final int chapterId;

  @override
  ConsumerState<ChapterDetailPage> createState() => _ChapterDetailPageState();
}

class _ChapterDetailPageState extends ConsumerState<ChapterDetailPage> {
  final PdfViewerController _pdfController = PdfViewerController();
  final PdfCacheService _cacheService = PdfCacheService();

  int _currentPage = 1;
  int _totalPages = 0;
  bool _hasJumpedToSavedPage = false;
  Chapter? _chapter;
  bool _isLoadingChapter = true;
  String? _error;

  String? _pdfPath;
  bool _isDownloading = false;
  double _downloadProgress = 0;

  @override
  void initState() {
    super.initState();
    _loadChapter();
  }

  Future<void> _loadChapter() async {
    try {
      final repository = ref.read(booksRepositoryProvider);
      final chapter =
          await repository.getChapterDetail(widget.bookId, widget.chapterId);
      setState(() {
        _chapter = chapter;
        _isLoadingChapter = false;
      });

      // Load PDF (with caching)
      await _loadPdf();
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoadingChapter = false;
      });
    }
  }

  Future<void> _loadPdf() async {
    final pdfUrl = _getPdfUrl();
    if (pdfUrl == null) return;

    // On web, just use network URL
    if (kIsWeb) {
      setState(() {
        _pdfPath = pdfUrl;
      });
      return;
    }

    // On mobile, check cache first
    try {
      final String? cachedPath = await _cacheService.getCachedFilePath(pdfUrl);

      if (cachedPath != null) {
        // Use cached file
        setState(() {
          _pdfPath = cachedPath;
        });
      } else {
        // Download and cache
        setState(() {
          _isDownloading = true;
          _downloadProgress = 0.0;
        });

        final downloadedPath = await _cacheService.downloadAndCache(
          pdfUrl,
          onProgress: (progress) {
            setState(() {
              _downloadProgress = progress;
            });
          },
        );

        setState(() {
          _isDownloading = false;
          _pdfPath = downloadedPath ?? pdfUrl;
        });
      }
    } catch (e) {
      // Fallback to network URL
      setState(() {
        _isDownloading = false;
        _pdfPath = pdfUrl;
      });
    }
  }

  @override
  void dispose() {
    _pdfController.dispose();
    super.dispose();
  }

  void _onPageChanged(PdfPageChangedDetails details) {
    setState(() {
      _currentPage = details.newPageNumber;
    });

    if (_totalPages > 0) {
      ref
          .read(readingProgressProvider(widget.chapterId).notifier)
          .updateProgress(_currentPage, _totalPages);
    }
  }

  void _onDocumentLoaded(PdfDocumentLoadedDetails details) {
    setState(() {
      _totalPages = details.document.pages.count;
    });

    if (!_hasJumpedToSavedPage) {
      final progressState = ref.read(readingProgressProvider(widget.chapterId));
      if (progressState.progress != null &&
          progressState.progress!.currentPage > 1) {
        _pdfController.jumpToPage(progressState.progress!.currentPage);
      }
      _hasJumpedToSavedPage = true;
    }
  }

  String? _getPdfUrl() {
    if (_chapter == null) {
      return null;
    }

    // TEMPORARY: Hardcoded PDF URL for chapter 6 testing
    // TODO: Update Chapter model to include file.path field
    if (widget.chapterId == 6) {
      return 'https://ppjcqetlikzvvoblnybe.supabase.co/storage/v1/object/sign/books/chapters/523eb379-8777-499c-a363-5cb2bd1f657d.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9kNjYwNzUzZC01MzM1LTRjMTMtOTNkNi0wODU1NGM2ZWJhYzMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJib29rcy9jaGFwdGVycy81MjNlYjM3OS04Nzc3LTQ5OWMtYTM2My01Y2IyYmQxZjY1N2QucGRmIiwiaWF0IjoxNzY3NTk4Mjg2LCJleHAiOjE3Njc2MDE4ODZ9.B5X8Ahmdz40xMCOAabDRJZ4Gyn8zmla2ggsegn99kzo';
    }

    return null;
  }

  Widget _buildPdfViewer() {
    if (_pdfPath == null) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.picture_as_pdf, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('Chương này chưa có file PDF'),
          ],
        ),
      );
    }

    // Use appropriate viewer based on platform and path
    if (kIsWeb || _pdfPath!.startsWith('http')) {
      return SfPdfViewer.network(
        _pdfPath!,
        controller: _pdfController,
        onPageChanged: _onPageChanged,
        onDocumentLoaded: _onDocumentLoaded,
      );
    } else {
      return SfPdfViewer.file(
        File(_pdfPath!),
        controller: _pdfController,
        onPageChanged: _onPageChanged,
        onDocumentLoaded: _onDocumentLoaded,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final progressState = ref.watch(readingProgressProvider(widget.chapterId));

    return Scaffold(
      appBar: AppBar(
        title: Text(_chapter?.title ?? 'Đọc chương'),
        actions: [
          if (progressState.isSaving)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
            ),
        ],
      ),
      body: _isLoadingChapter
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error, size: 64, color: Colors.red),
                      const SizedBox(height: 16),
                      Text('Lỗi: $_error'),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadChapter,
                        child: const Text('Thử lại'),
                      ),
                    ],
                  ),
                )
              : _isDownloading
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const CircularProgressIndicator(),
                          const SizedBox(height: 24),
                          Text(
                            'Đang tải PDF... ${(_downloadProgress * 100).toStringAsFixed(0)}%',
                            style: const TextStyle(fontSize: 16),
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: 200,
                            child: LinearProgressIndicator(
                              value: _downloadProgress,
                              backgroundColor: Colors.grey[300],
                              valueColor: const AlwaysStoppedAnimation<Color>(
                                  Color(0xFF2D7061),),
                            ),
                          ),
                        ],
                      ),
                    )
                  : Column(
                      children: [
                        if (_totalPages > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                vertical: 8, horizontal: 16,),
                            color: Colors.grey[200],
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      'Trang $_currentPage / $_totalPages',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w500,),
                                    ),
                                    if (!kIsWeb &&
                                        _pdfPath != null &&
                                        !_pdfPath!.startsWith('http'))
                                      const Padding(
                                        padding: EdgeInsets.only(left: 8),
                                        child: Icon(Icons.offline_pin,
                                            size: 16, color: Colors.green,),
                                      ),
                                  ],
                                ),
                                if (progressState.progress != null &&
                                    _totalPages > 0)
                                  Text(
                                    'Đã đọc: ${((progressState.progress!.currentPage / _totalPages) * 100).toStringAsFixed(0)}%',
                                    style: TextStyle(color: Colors.grey[600]),
                                  ),
                              ],
                            ),
                          ),
                        Expanded(child: _buildPdfViewer()),
                      ],
                    ),
    );
  }
}
