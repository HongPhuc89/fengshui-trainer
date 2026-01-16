import 'dart:io';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_analytics/firebase_analytics.dart';

import '../../../../core/services/pdf_cache_service.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../../../core/utils/media_url_helper.dart';
import '../../../books/data/models/book_models.dart';
import '../../../books/presentation/providers/books_provider.dart';
import '../providers/reading_progress_provider.dart';
import '../widgets/bottom_menu_bar.dart';
import '../widgets/base_pdf_viewer.dart';

class ChapterReadingPage extends ConsumerStatefulWidget {
  const ChapterReadingPage({
    required this.bookId,
    required this.chapterId,
    this.isInfographic = false,
    super.key,
  });

  final int bookId;
  final int chapterId;
  final bool isInfographic;

  @override
  ConsumerState<ChapterReadingPage> createState() =>
      _ChapterReadingPageState();
}

class _ChapterReadingPageState extends ConsumerState<ChapterReadingPage> {
  late final PdfCacheService _cacheService;

  Chapter? _chapter;
  bool _isLoadingChapter = true;
  String? _error;

  String? _pdfPath;
  bool _isDownloading = false;
  double _downloadProgress = 0;

  // For reading progress tracking
  int _currentPage = 1;
  int _totalPages = 0;
  int? _savedPage;

  @override
  void initState() {
    super.initState();
    _cacheService = PdfCacheService(SecureStorage());
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

      // Load saved progress if not infographic
      if (!widget.isInfographic) {
        final progress = await ref
            .read(readingProgressProvider.notifier)
            .getProgress(widget.chapterId);
        if (progress != null && progress.currentPage > 0) {
          setState(() {
            _savedPage = progress.currentPage;
          });
        }
      }

      // Load PDF
      final pdfUrl = _getPdfUrl();
      if (pdfUrl != null) {
        await _loadPdf(pdfUrl);
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoadingChapter = false;
      });
    }
  }

  Future<void> _loadPdf(String rawPdfUrl) async {
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
          _pdfPath = downloadedPath;
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

  String? _getPdfUrl() {
    if (_chapter == null) return null;

    if (widget.isInfographic) {
      if (_chapter!.infographicFile == null) {
        print('[ChapterReading] No Infographic file found in chapter');
        return null;
      }
      print(
          '[ChapterReading] Found Infographic file: ${_chapter!.infographicFile!.fileName}');
      return _chapter!.infographicFile!.fileUrl;
    }

    if (_chapter!.files == null || _chapter!.files!.isEmpty) {
      print('[ChapterReading] No PDF file found in chapter');
      return null;
    }

    final pdfFile = _chapter!.files!.first;
    print('[ChapterReading] Found PDF file: ${pdfFile.fileName}');
    print('[ChapterReading] PDF URL: ${pdfFile.fileUrl}');
    return pdfFile.fileUrl;
  }

  void _handlePageChanged(int currentPage, int totalPages) {
    setState(() {
      _currentPage = currentPage;
      _totalPages = totalPages;
    });

    // Save progress only for chapter reading (not infographic)
    if (!widget.isInfographic) {
      ref.read(readingProgressProvider.notifier).updateProgress(
            widget.chapterId,
            currentPage,
            totalPages,
          );
    }
  }

  String _getTitle() {
    if (widget.isInfographic) {
      return 'Đồ họa - ${_chapter?.title ?? ""}';
    }
    return _chapter?.title ?? 'Đọc sách';
  }

  Color _getThemeColor() {
    return widget.isInfographic
        ? const Color(0xFF5D4037)
        : const Color(0xFF2D7061);
  }

  @override
  Widget build(BuildContext context) {
    // Log screen view to Firebase
    FirebaseAnalytics.instance.logScreenView(
      screenName: widget.isInfographic
          ? 'ChapterInfographicPage'
          : 'ChapterReadingPage',
      parameters: {
        'bookId': widget.bookId.toString(),
        'chapterId': widget.chapterId.toString(),
      },
    );

    if (_isLoadingChapter) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Đang tải...'),
          backgroundColor: _getThemeColor(),
          foregroundColor: Colors.white,
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Lỗi'),
          backgroundColor: _getThemeColor(),
          foregroundColor: Colors.white,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text('Lỗi: $_error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.pop(),
                child: const Text('Quay lại'),
              ),
            ],
          ),
        ),
      );
    }

    if (_pdfPath == null) {
      if (_isDownloading) {
        return Scaffold(
          appBar: AppBar(
            title: const Text('Đang tải PDF...'),
            backgroundColor: _getThemeColor(),
            foregroundColor: Colors.white,
          ),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(
                  value: _downloadProgress > 0 ? _downloadProgress : null,
                ),
                const SizedBox(height: 16),
                Text(
                  _downloadProgress > 0
                      ? '${(_downloadProgress * 100).toStringAsFixed(0)}%'
                      : 'Đang tải...',
                ),
              ],
            ),
          ),
        );
      }

      return Scaffold(
        appBar: AppBar(
          title: Text(_getTitle()),
          backgroundColor: _getThemeColor(),
          foregroundColor: Colors.white,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.picture_as_pdf,
                  size: 64, color: Colors.grey),
              const SizedBox(height: 16),
              Text(widget.isInfographic
                  ? 'Chương này chưa có file Đồ họa'
                  : 'Chương này chưa có file PDF'),
            ],
          ),
        ),
      );
    }

    // Use BasePdfViewer for actual PDF display
    return BasePdfViewer(
      pdfUrl: _pdfPath!,
      title: _getTitle(),
      themeColor: _getThemeColor(),
      initialPage: _savedPage ?? 1,
      onPageChanged: _handlePageChanged,
      showRotationHint: true,
    );
  }
}
