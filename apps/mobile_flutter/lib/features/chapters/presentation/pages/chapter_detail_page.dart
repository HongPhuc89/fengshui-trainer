import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_analytics/firebase_analytics.dart';

import '../../../books/data/models/book_models.dart';
import '../../../books/presentation/providers/books_provider.dart';

import '../widgets/bottom_menu_bar.dart';

class ChapterDetailPage extends ConsumerStatefulWidget {
  const ChapterDetailPage({
    required this.bookId,
    required this.chapterId,
    super.key,
  });
  
  final int bookId;
  final int chapterId;

  @override
  ConsumerState<ChapterDetailPage> createState() => _ChapterDetailPageState();
}

class _ChapterDetailPageState extends ConsumerState<ChapterDetailPage> {
  Chapter? _chapter;
  bool _isLoadingChapter = true;
  String? _error;

  @override
  void initState() {
    super.initState();
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
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoadingChapter = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Log screen view to Firebase
    FirebaseAnalytics.instance.logScreenView(
      screenName: 'ChapterDetailPage',
      parameters: {
        'bookId': widget.bookId.toString(),
        'chapterId': widget.chapterId.toString(),
      },
    );

    return Scaffold(
      backgroundColor: const Color(0xFFFFFBE6), // Cream/beige background like book pages
      appBar: AppBar(
        backgroundColor: const Color(0xFF2D3E50),
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/books/${widget.bookId}'),
        ),
        title: Text(
          _chapter?.title ?? 'Chi tiết chương',
          style: const TextStyle(fontSize: 16),
        ),
      ),
      body: _isLoadingChapter
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF2D3E50)),
            )
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline, size: 48, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(
                        'Không thể tải nội dung',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[800],
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _error!,
                        style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Content area
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Chapter title
                            Text(
                              _chapter?.title ?? '',
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF2D3E50),
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 24),
                            // Chapter content
                            Text(
                              _chapter?.content ?? 'Nội dung chương đang được cập nhật...',
                              style: TextStyle(
                                fontSize: 18,
                                color: Colors.grey[900],
                                height: 1.8,
                                letterSpacing: 0.3,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Bottom menu bar
                    BottomMenuBar(
                      bookId: widget.bookId,
                      chapterId: widget.chapterId,
                    ),
                  ],
                ),
    );
  }
}
