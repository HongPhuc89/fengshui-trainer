import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/books_provider.dart';
import '../widgets/book_card.dart';

class BooksListPage extends ConsumerWidget {
  const BooksListPage({super.key});

  // Helper function to get first letter of book title
  String _getBookInitial(String title) {
    return title.isNotEmpty ? title[0].toUpperCase() : 'B';
  }

  // Helper function to get category label
  String _getCategoryLabel(int index) {
    const categories = [
      'THÀNH Ở TỪ',
      'PHỤC HY',
      'TRẤN ĐOÀN',
      'TU TIÊN',
      'HUYỀN HUYỄN'
    ];
    return categories[index % categories.length];
  }

  // Helper function to get gradient colors for book icons
  List<Color> _getIconGradient(int index) {
    const gradients = [
      [Color(0xFF8B4513), Color(0xFFD2691E)], // Brown
      [Color(0xFF2C5F7C), Color(0xFF4A8FB0)], // Blue
      [Color(0xFF5B4B8A), Color(0xFF8B7AB8)], // Purple
      [Color(0xFFC17817), Color(0xFFE8A84D)], // Gold
      [Color(0xFF6B4423), Color(0xFFA0522D)], // Sienna
    ];
    return gradients[index % gradients.length];
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final booksState = ref.watch(booksProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF1a1a2e), // Dark background
      appBar: AppBar(
        title: const Text('Sách'),
        backgroundColor: const Color(0xFF2D7061),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              context.go('/login');
            },
          ),
        ],
      ),
      body: booksState.isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(
                    color: Color(0xFFFFD700),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Đang tải sách...',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white.withOpacity(0.7),
                    ),
                  ),
                ],
              ),
            )
          : booksState.error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'Không thể tải sách',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFFFF6B6B),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        booksState.error!,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.white.withOpacity(0.6),
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () =>
                            ref.read(booksProvider.notifier).loadBooks(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2D7061),
                        ),
                        child: const Text('Thử lại'),
                      ),
                    ],
                  ),
                )
              : booksState.books.isEmpty
                  ? Center(
                      child: Text(
                        'Chưa có sách nào',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.white.withOpacity(0.6),
                        ),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () =>
                          ref.read(booksProvider.notifier).loadBooks(),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: booksState.books.length,
                        itemBuilder: (context, index) {
                          final book = booksState.books[index];
                          return BookCard(
                            title: book.title,
                            category: _getCategoryLabel(index),
                            description: book.description ??
                                'Cuốn sách cơ bản nhất cho người mới bắt đầu tìm hiểu về địa lý và phong thủy.',
                            chapterCount: book.totalChapters,
                            initial: _getBookInitial(book.title),
                            gradientColors: _getIconGradient(index),
                            coverImage: book.coverImage,
                            onPress: () => context.go('/books/${book.id}'),
                            index: index,
                          );
                        },
                      ),
                    ),
    );
  }
}
