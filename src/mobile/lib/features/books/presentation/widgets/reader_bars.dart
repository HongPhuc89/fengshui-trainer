import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../../shared/theme/app_colors.dart';
import '../../domain/entities/book.dart';
import '../bloc/book_reader_bloc.dart';

class ReaderTopBar extends StatelessWidget {
  final String bookTitle;
  final BookChapterContent chapter;
  final String bookSlug;
  final BookReaderBloc bloc;

  const ReaderTopBar({
    super.key,
    required this.bookTitle,
    required this.chapter,
    required this.bookSlug,
    required this.bloc,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        height: 56,
        decoration: const BoxDecoration(
          // Solid through the icon row, fading only in the last stretch —
          // a straight top→bottom fade left the tap targets themselves
          // (TOC/back/training icons, roughly mid-height) sitting on
          // already-faded black, low-contrast against light PDF pages.
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.black, Colors.black, Colors.transparent],
            stops: [0.0, 0.75, 1.0],
          ),
        ),
        child: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.white),
              onPressed: () => context.pop(),
            ),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    chapter.title,
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    bookTitle,
                    style: const TextStyle(
                        color: Colors.white70, fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.list, color: Colors.white),
              onPressed: () => bloc.add(const ToggleToc()),
            ),
            if (chapter.hasTrainingSet)
              IconButton(
                icon: const Icon(Icons.school_outlined,
                    color: AppColors.primaryGold),
                onPressed: () => context.push(
                    '/training/chapter/$bookSlug/${chapter.order}'),
              ),
          ],
        ),
      ),
    );
  }
}

class ReaderBottomBar extends StatelessWidget {
  final int currentPage;
  final int totalPages;

  /// Order of the chapter across the boundary, null when there is none —
  /// nearest by `order`, not `currentOrder ± 1` (see BookReaderLoaded).
  final int? nextChapterOrder;
  final int? prevChapterOrder;

  /// Target page when jumping into the previous chapter (its last page).
  final int prevChapterLastPage;
  final String bookSlug;
  final BookReaderBloc bloc;

  const ReaderBottomBar({
    super.key,
    required this.currentPage,
    required this.totalPages,
    this.nextChapterOrder,
    this.prevChapterOrder,
    this.prevChapterLastPage = 1,
    required this.bookSlug,
    required this.bloc,
  });

  @override
  Widget build(BuildContext context) {
    final atLastPage = currentPage >= totalPages;
    final atFirstPage = currentPage <= 1;

    return SafeArea(
      // `minimum` guarantees clearance even when the OS under-reports the
      // bottom inset (seen on at least one gesture-nav device in testing —
      // SafeArea's own padding was 0 there, leaving the page indicator and
      // nav-bar tap targets flush against the gesture strip).
      minimum: const EdgeInsets.only(bottom: 12),
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
            colors: [Colors.black87, Colors.transparent],
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Cross-chapter navigation only appears at the chapter's edge —
            // scrolling never crosses a chapter boundary on its own (each
            // chapter is decrypted separately), this is the explicit action
            // that loads the next/previous one.
            if (atLastPage && nextChapterOrder != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => bloc.add(
                      LoadChapter(
                        bookSlug: bookSlug,
                        chapterOrder: nextChapterOrder!,
                        startPage: 1,
                      ),
                    ),
                    icon: const Icon(Icons.arrow_downward, size: 18),
                    label: const Text('Chương tiếp theo'),
                  ),
                ),
              ),
            if (atFirstPage && prevChapterOrder != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => bloc.add(
                      LoadChapter(
                        bookSlug: bookSlug,
                        chapterOrder: prevChapterOrder!,
                        startPage: prevChapterLastPage,
                      ),
                    ),
                    icon: const Icon(Icons.arrow_upward, size: 18),
                    label: const Text('Chương trước'),
                  ),
                ),
              ),
            SliderTheme(
              data: SliderTheme.of(context).copyWith(
                trackHeight: 2,
                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
              ),
              child: Slider(
                value: currentPage.toDouble().clamp(1.0, totalPages.toDouble()),
                min: 1.0,
                max: totalPages.toDouble(),
                activeColor: AppColors.primaryGold,
                inactiveColor: Colors.white30,
                onChanged: (v) => bloc.add(ChangePage(v.round())),
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon:
                        const Icon(Icons.chevron_left, color: Colors.white),
                    onPressed: currentPage > 1
                        ? () => bloc.add(ChangePage(currentPage - 1))
                        : null,
                  ),
                  Text(
                    '$currentPage / $totalPages',
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                  ),
                  IconButton(
                    icon:
                        const Icon(Icons.chevron_right, color: Colors.white),
                    onPressed: currentPage < totalPages
                        ? () => bloc.add(ChangePage(currentPage + 1))
                        : null,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class TocPanel extends StatelessWidget {
  final List<BookChapterMeta> chapters;
  final int currentOrder;
  final String bookSlug;

  const TocPanel({
    super.key,
    required this.chapters,
    required this.currentOrder,
    required this.bookSlug,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      child: Column(
        children: [
          const SafeArea(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Mục lục',
                style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary),
              ),
            ),
          ),
          Expanded(
            child: ListView.builder(
              itemCount: chapters.length,
              itemBuilder: (_, i) {
                final ch = chapters[i];
                final isActive = ch.order == currentOrder;
                return ListTile(
                  selected: isActive,
                  selectedTileColor:
                      AppColors.primaryGold.withOpacity(0.1),
                  leading: CircleAvatar(
                    backgroundColor: isActive
                        ? AppColors.primaryGold.withOpacity(0.2)
                        : AppColors.surfaceAlt,
                    child: Text(
                      '${ch.order}',
                      style: TextStyle(
                          color: isActive
                              ? AppColors.primaryGold
                              : AppColors.textSecondary,
                          fontSize: 12),
                    ),
                  ),
                  title: Text(
                    ch.title,
                    style: TextStyle(
                        color: isActive
                            ? AppColors.primaryGold
                            : AppColors.textPrimary,
                        fontSize: 14),
                  ),
                  onTap: () {
                    Navigator.of(context).pop();
                    context.push(
                        '/books/$bookSlug/read?chapter=${ch.order}');
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
