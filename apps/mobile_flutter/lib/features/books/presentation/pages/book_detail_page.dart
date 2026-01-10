import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/books_provider.dart';

class BookDetailPage extends ConsumerWidget {
  const BookDetailPage({required this.bookId, super.key});
  final int bookId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final chaptersState = ref.watch(chaptersProvider(bookId));

    return Scaffold(
      backgroundColor: const Color(0xFF1a1a2e), // Dark background
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
        title: const Text('Danh sách chương'),
        backgroundColor: const Color(0xFF2D7061),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: chaptersState.isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(
                    color: Color(0xFFFFD700),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Đang tải chương...',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withOpacity(0.7),
                    ),
                  ),
                ],
              ),
            )
          : chaptersState.error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'Không thể tải chương',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFFF6B6B),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        chaptersState.error!,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.white.withOpacity(0.6),
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ref
                            .read(chaptersProvider(bookId).notifier)
                            .loadChapters(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2D7061),
                        ),
                        child: const Text('Thử lại'),
                      ),
                    ],
                  ),
                )
              : chaptersState.chapters.isEmpty
                  ? Center(
                      child: Text(
                        'Chưa có chương nào',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.white.withOpacity(0.6),
                        ),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: chaptersState.chapters.length,
                      itemBuilder: (context, index) {
                        final chapter = chaptersState.chapters[index];
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                Colors.white.withOpacity(0.05),
                                Colors.white.withOpacity(0.02),
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: Colors.white.withOpacity(0.1),
                              width: 1,
                            ),
                          ),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () {
                                context.go(
                                    '/books/$bookId/chapters/${chapter.id}');
                              },
                              borderRadius: BorderRadius.circular(16),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    // Chapter number badge with gradient
                                    Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        gradient: const LinearGradient(
                                          colors: [
                                            Color(0xFF2D7061),
                                            Color(0xFF3E8B7A),
                                          ],
                                          begin: Alignment.topLeft,
                                          end: Alignment.bottomRight,
                                        ),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Center(
                                        child: Text(
                                          '${chapter.orderIndex}',
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    // Chapter info
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            chapter.title,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w600,
                                              fontSize: 16,
                                              color: Colors.white,
                                            ),
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          if (chapter.files != null &&
                                              chapter.files!.isNotEmpty) ...[
                                            const SizedBox(height: 4),
                                            Text(
                                              '${chapter.files!.length} file',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.white
                                                    .withOpacity(0.6),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    // Chevron icon
                                    Icon(
                                      Icons.chevron_right,
                                      color: Colors.white.withOpacity(0.5),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
