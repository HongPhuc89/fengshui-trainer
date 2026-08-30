import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../domain/entities/video.dart';
import '../../domain/repositories/videos_repository.dart';

part 'videos_event.dart';
part 'videos_state.dart';

@injectable
class VideosBloc extends Bloc<VideosEvent, VideosState> {
  final VideosRepository _repository;

  VideosBloc(this._repository) : super(VideosInitial()) {
    on<LoadVideos>(_onLoad);
    on<FilterVideosCategory>(_onFilterCategory);
    on<SearchVideos>(_onSearch);
  }

  String? _selectedCategory;
  String? _searchQuery;
  List<VideoCategory> _categories = [];

  Future<void> _onLoad(
      LoadVideos event, Emitter<VideosState> emit) async {
    emit(VideosLoading());

    final catResult = await _repository.getCategories();
    catResult.fold((_) => null, (cats) => _categories = cats);

    final result = await _repository.getVideos(
      category: _selectedCategory,
      search: _searchQuery,
    );

    result.fold(
      (failure) => emit(VideosError(failure.message)),
      (videos) => emit(VideosLoaded(
        videos: videos,
        categories: _categories,
        selectedCategory: _selectedCategory,
      )),
    );
  }

  Future<void> _onFilterCategory(
      FilterVideosCategory event, Emitter<VideosState> emit) async {
    _selectedCategory = event.categorySlug;
    _searchQuery = null;
    add(const LoadVideos());
  }

  Future<void> _onSearch(
      SearchVideos event, Emitter<VideosState> emit) async {
    _searchQuery = event.query.isEmpty ? null : event.query;
    add(const LoadVideos());
  }
}
