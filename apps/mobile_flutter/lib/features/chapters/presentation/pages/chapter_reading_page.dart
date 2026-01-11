import 'dart:io';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:syncfusion_flutter_pdfviewer/pdfviewer.dart';

import '../../../../core/services/pdf_cache_service.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../../../core/utils/media_url_helper.dart';
import '../../../books/data/models/book_models.dart';
import '../../../books/presentation/providers/books_provider.dart';
import '../providers/reading_progress_provider.dart';
import '../widgets/bottom_menu_bar.dart';
import 'package:firebase_analytics/firebase_analytics.dart';

class ChapterReadingPage extends ConsumerStatefulWidget {
  const ChapterReadingPage({
    required this.bookId,
    required this.chapterId,
    super.key,
  });

  final int bookId;
  final int chapterId;

  @override
  ConsumerState<ChapterReadingPage> createState() => _ChapterReadingPageState();
}

class _ChapterReadingPageState extends ConsumerState<ChapterReadingPage> {
  final PdfViewerController _pdfController = PdfViewerController();
  late final PdfCacheService _cacheService;

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
    _cacheService = PdfCacheService(SecureStorage());
    _loadChapter();
  }

  Future<void> _loadChapter() async {
    try {
      final repository = ref.read(booksRepositoryProvider);
      final chapter = await repository.getChapterDetail(widget.bookId, widget.chapterId);
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
    final rawPdfUrl = _getPdfUrl();
    if (rawPdfUrl == null) return;

    // Get authenticated URL (with token)
    final pdfUrl = await MediaUrlHelper.getAuthenticatedMediaUrl(rawPdfUrl);
    print('[ChapterReading] Authenticated PDF URL: $pdfUrl');

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
      if (progressState.currentPage > 1) {
        _pdfController.jumpToPage(progressState.currentPage);
      }
      _hasJumpedToSavedPage = true;
    }
  }

  String? _getPdfUrl() {
    if (_chapter == null || _chapter!.files == null || _chapter!.files!.isEmpty) {
      print('[ChapterReading] No PDF file found in chapter');
      return null;
    }

    final pdfFile = _chapter!.files!.first;
    print('[ChapterReading] Found PDF file: ${pdfFile.fileName}');
    print('[ChapterReading] PDF URL: ${pdfFile.fileUrl}');
    return pdfFile.fileUrl;
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
    // Log screen view to Firebase
    FirebaseAnalytics.instance.logScreenView(
      screenName: 'ChapterReadingPage',
      parameters: {
        'bookId': widget.bookId.toString(),
        'chapterId': widget.chapterId.toString(),
      },
    );

    final progressState = ref.watch(readingProgressProvider(widget.chapterId));

    return Scaffold(
      backgroundColor: const Color(0xFF1a1a2e),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/books/${widget.bookId}/chapters/${widget.chapterId}'),
        ),
        title: Text(
          _chapter?.title ?? 'Đọc sách',
          style: const TextStyle(fontSize: 16),
        ),
        backgroundColor: const Color(0xFF2D7061),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (_totalPages > 0)
            Center(
              child: Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Text(
                  '$_currentPage/$_totalPages',
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ),
        ],
      ),
      body: _isLoadingChapter
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFFFD700)),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(
                        'Không thể tải PDF',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.white.withOpacity(0.8),
                        ),
                      ),
                    ],
                  ),
                )
              : _isDownloading
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const CircularProgressIndicator(color: Color(0xFFFFD700)),
                          const SizedBox(height: 24),
                          Text(
                            'Đang tải PDF... ${(_downloadProgress * 100).toStringAsFixed(0)}%',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.8),
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Container(
                            width: 200,
                            height: 4,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(2),
                            ),
                            child: FractionallySizedBox(
                              alignment: Alignment.centerLeft,
                              widthFactor: _downloadProgress,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFD700),
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  : _buildPdfViewer(),
    );
  }
}
