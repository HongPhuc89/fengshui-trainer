import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../../core/di/injection.dart';
import '../../../../../shared/theme/app_colors.dart';
import '../bloc/videos_bloc.dart';
import '../widgets/video_card.dart';

class VideosScreen extends StatelessWidget {
  const VideosScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<VideosBloc>()..add(const LoadVideos()),
      child: const _VideosView(),
    );
  }
}

class _VideosView extends StatefulWidget {
  const _VideosView();

  @override
  State<_VideosView> createState() => _VideosViewState();
}

class _VideosViewState extends State<_VideosView> {
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
                  hintText: 'Tìm kiếm video...',
                  border: InputBorder.none,
                  hintStyle:
                      TextStyle(color: AppColors.textSecondary),
                ),
                onChanged: (q) =>
                    context.read<VideosBloc>().add(SearchVideos(q)),
              )
            : const Text('Video'),
        actions: [
          IconButton(
            icon:
                Icon(_searchVisible ? Icons.close : Icons.search),
            onPressed: () {
              setState(() => _searchVisible = !_searchVisible);
              if (!_searchVisible) {
                _searchController.clear();
                context.read<VideosBloc>().add(const SearchVideos(''));
              }
            },
          ),
        ],
      ),
      body: BlocBuilder<VideosBloc, VideosState>(
        builder: (context, state) {
          if (state is VideosLoading) {
            return const Center(
                child: CircularProgressIndicator(
                    color: AppColors.primaryGold));
          }

          if (state is VideosError) {
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
                    onPressed: () => context
                        .read<VideosBloc>()
                        .add(const LoadVideos()),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }

          if (state is VideosLoaded) {
            return Column(
              children: [
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
                              .read<VideosBloc>()
                              .add(const FilterVideosCategory(null)),
                        ),
                        const SizedBox(width: 8),
                        ...state.categories.map((cat) => Padding(
                              padding:
                                  const EdgeInsets.only(right: 8),
                              child: FilterChip(
                                label: Text(cat.name),
                                selected: state.selectedCategory ==
                                    cat.slug,
                                onSelected: (_) => context
                                    .read<VideosBloc>()
                                    .add(FilterVideosCategory(
                                        cat.slug)),
                              ),
                            )),
                      ],
                    ),
                  ),
                Expanded(
                  child: state.videos.isEmpty
                      ? const Center(
                          child: Text(
                          'Không có video nào',
                          style: TextStyle(
                              color: AppColors.textSecondary),
                        ))
                      : GridView.builder(
                          padding: const EdgeInsets.all(16),
                          gridDelegate:
                              const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 0.75,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: state.videos.length,
                          itemBuilder: (_, i) {
                            final video = state.videos[i];
                            return Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                VideoCard(
                                  video: video,
                                  onTap: () => context.push(
                                      '/videos/${video.slug}'),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  video.title,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: AppColors.textPrimary,
                                  ),
                                  maxLines: 2,
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
