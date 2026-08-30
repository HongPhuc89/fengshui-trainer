import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../bloc/books_bloc.dart';
import '../widgets/book_card.dart';

class BooksScreen extends StatelessWidget {
  const BooksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<BooksBloc>()..add(const LoadBooks()),
      child: const _BooksView(),
    );
  }
}

class _BooksView extends StatefulWidget {
  const _BooksView();

  @override
  State<_BooksView> createState() => _BooksViewState();
}

class _BooksViewState extends State<_BooksView> {
  final _searchController = TextEditingController();
  bool _searchVisible = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _searchVisible
            ? TextField(
                controller: _searchController,
                autofocus: true,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: const InputDecoration(
                  hintText: 'Tìm kiếm sách...',
                  border: InputBorder.none,
                  hintStyle: TextStyle(color: AppColors.textSecondary),
                ),
                onChanged: (q) =>
                    context.read<BooksBloc>().add(SearchBooks(q)),
              )
            : const Text('Thư Viện'),
        actions: [
          IconButton(
            icon: Icon(_searchVisible ? Icons.close : Icons.search),
            onPressed: () {
              setState(() => _searchVisible = !_searchVisible);
              if (!_searchVisible) {
                _searchController.clear();
                context.read<BooksBloc>().add(const SearchBooks(''));
              }
            },
          ),
        ],
      ),
      body: BlocBuilder<BooksBloc, BooksState>(
        builder: (context, state) {
          if (state is BooksLoading) {
            return const Center(
                child: CircularProgressIndicator(
                    color: AppColors.primaryGold));
          }

          if (state is BooksError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline,
                      color: AppColors.error, size: 48),
                  const SizedBox(height: 12),
                  Text(state.message,
                      style: const TextStyle(
                          color: AppColors.textSecondary)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () =>
                        context.read<BooksBloc>().add(const LoadBooks()),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }

          if (state is BooksLoaded) {
            return Column(
              children: [
                // Category filter chips
                if (state.categories.isNotEmpty)
                  SizedBox(
                    height: 48,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 8),
                      children: [
                        FilterChip(
                          label: const Text('Tất cả'),
                          selected: state.selectedCategory == null,
                          onSelected: (_) => context
                              .read<BooksBloc>()
                              .add(const FilterBooksCategory(null)),
                        ),
                        const SizedBox(width: 8),
                        ...state.categories.map((cat) => Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: FilterChip(
                                label: Text(cat.title),
                                selected:
                                    state.selectedCategory == cat.slug,
                                onSelected: (_) => context
                                    .read<BooksBloc>()
                                    .add(FilterBooksCategory(cat.slug)),
                              ),
                            )),
                      ],
                    ),
                  ),

                // Books grid
                Expanded(
                  child: state.books.isEmpty
                      ? const Center(
                          child: Text(
                            'Không có sách nào',
                            style: TextStyle(
                                color: AppColors.textSecondary),
                          ),
                        )
                      : GridView.builder(
                          padding: const EdgeInsets.all(16),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 0.65,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: state.books.length,
                          itemBuilder: (_, i) {
                            final book = state.books[i];
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: BookCard(
                                    book: book,
                                    onTap: () => context
                                        .push('/books/${book.slug}'),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  book.title,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.textPrimary,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  book.author,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: AppColors.textSecondary,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            );
                          },
                        ),
                ),
              ],
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }
}
