import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/auth/auth_cubit.dart';
import '../../../../../core/di/injection.dart';
import '../../../../../l10n/l10n.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../../../../../shared/widgets/app_logo.dart';
import '../../../books/presentation/widgets/book_card.dart';
import '../../../videos/presentation/widgets/video_card.dart';
import '../bloc/home_bloc.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) =>
          getIt<HomeBloc>()..add(const LoadHome()),
      child: const _HomeView(),
    );
  }
}

class _HomeView extends StatelessWidget {
  const _HomeView();

  String _greeting(BuildContext context) {
    final l10n = context.l10n;
    final hour = DateTime.now().hour;
    if (hour < 12) return l10n.homeGreetingMorning;
    if (hour < 18) return l10n.homeGreetingAfternoon;
    return l10n.homeGreetingEvening;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final user = getIt<AuthCubit>().currentUser;

    return BlocBuilder<HomeBloc, HomeState>(
      builder: (context, state) {
        return CustomScrollView(
          slivers: [
            // AppBar — matches web header branding
            SliverAppBar(
              pinned: true,
              title: const AppLogo(variant: AppLogoVariant.app),
              actions: [
                IconButton(
                  icon: const Icon(Icons.refresh),
                  onPressed: () =>
                      context.read<HomeBloc>().add(const LoadHome()),
                ),
              ],
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Greeting
                    Text(
                      '${_greeting(context)}, ${user?.name ?? 'bạn'}!',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 24),

                    if (state is HomeLoading) ...[
                      const Center(
                        child: CircularProgressIndicator(
                            color: AppColors.primaryGold),
                      ),
                    ] else if (state is HomeLoaded) ...[
                      // Recently Read
                      if (state.recentlyRead.isNotEmpty) ...[
                        _SectionHeader(
                          title: l10n.homeSectionReading,
                          onSeeAll: () => context.go('/books'),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 160,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: state.recentlyRead.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: 12),
                            itemBuilder: (_, i) {
                              final r = state.recentlyRead[i];
                              return SizedBox(
                                width: 100,
                                child: BookCard(
                                  book: r.book,
                                  currentChapter: r.chapterOrder,
                                  currentPage: r.currentPage,
                                  onTap: () => context.push(
                                      '/books/${r.book.slug}/read?chapter=${r.chapterOrder}'),
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Recently Watched
                      if (state.recentlyWatched.isNotEmpty) ...[
                        _SectionHeader(
                          title: l10n.homeSectionWatching,
                          onSeeAll: () => context.go('/videos'),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 110,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: state.recentlyWatched.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: 12),
                            itemBuilder: (_, i) {
                              final r = state.recentlyWatched[i];
                              return SizedBox(
                                width: 180,
                                child: VideoCard(
                                  video: r.video,
                                  onTap: () {
                                    if (r.lessonSlug != null) {
                                      context.push(
                                          '/videos/${r.video.slug}/lessons/${r.lessonSlug}');
                                    } else {
                                      context.push(
                                          '/videos/${r.video.slug}');
                                    }
                                  },
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],

                      // New Books
                      if (state.newBooks.isNotEmpty) ...[
                        _SectionHeader(
                          title: l10n.homeSectionNewBooks,
                          onSeeAll: () => context.go('/books'),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 160,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: state.newBooks.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: 12),
                            itemBuilder: (_, i) {
                              final book = state.newBooks[i];
                              return SizedBox(
                                width: 100,
                                child: BookCard(
                                  book: book,
                                  onTap: () => context
                                      .push('/books/${book.slug}'),
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],

                      // New Videos
                      if (state.newVideos.isNotEmpty) ...[
                        _SectionHeader(
                          title: l10n.homeSectionNewVideos,
                          onSeeAll: () => context.go('/videos'),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 110,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemCount: state.newVideos.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(width: 12),
                            itemBuilder: (_, i) {
                              final video = state.newVideos[i];
                              return SizedBox(
                                width: 180,
                                child: VideoCard(
                                  video: video,
                                  onTap: () => context
                                      .push('/videos/${video.slug}'),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ],

                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onSeeAll;

  const _SectionHeader({required this.title, this.onSeeAll});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        if (onSeeAll != null)
          GestureDetector(
            onTap: onSeeAll,
            child: Text(
              l10n.homeSeeAll,
              style: const TextStyle(
                  color: AppColors.primaryGold, fontSize: 13),
            ),
          ),
      ],
    );
  }
}
