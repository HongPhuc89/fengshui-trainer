part of 'videos_bloc.dart';

abstract class VideosEvent extends Equatable {
  const VideosEvent();
  @override
  List<Object?> get props => [];
}

class LoadVideos extends VideosEvent {
  const LoadVideos();
}

class FilterVideosCategory extends VideosEvent {
  final String? categorySlug;
  const FilterVideosCategory(this.categorySlug);
  @override
  List<Object?> get props => [categorySlug];
}

class SearchVideos extends VideosEvent {
  final String query;
  const SearchVideos(this.query);
  @override
  List<Object?> get props => [query];
}
