import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../../books/domain/entities/book.dart';
import '../../../books/domain/repositories/books_repository.dart';
import '../../../videos/domain/entities/video.dart';
import '../../../videos/domain/repositories/videos_repository.dart';

part 'home_event.dart';
part 'home_state.dart';

@injectable
class HomeBloc extends Bloc<HomeEvent, HomeState> {
  final BooksRepository _booksRepository;
  final VideosRepository _videosRepository;

  HomeBloc(this._booksRepository, this._videosRepository)
      : super(HomeInitial()) {
    on<LoadHome>(_onLoad);
  }

  Future<void> _onLoad(
      LoadHome event, Emitter<HomeState> emit) async {
    emit(HomeLoading());

    // Fetch all concurrently
    final results = await Future.wait([
      _booksRepository.getRecentlyRead(),
      _videosRepository.getRecentlyWatched(),
      _booksRepository.getBooks(),
      _videosRepository.getVideos(),
    ]);

    final recentlyRead = results[0].fold(
      (_) => <RecentlyReadBook>[],
      (v) => v as List<RecentlyReadBook>,
    );
    final recentlyWatched = results[1].fold(
      (_) => <RecentlyWatchedVideo>[],
      (v) => v as List<RecentlyWatchedVideo>,
    );
    final newBooks = results[2].fold(
      (_) => <Book>[],
      (v) => (v as List<Book>).take(10).toList(),
    );
    final newVideos = results[3].fold(
      (_) => <Video>[],
      (v) => (v as List<Video>).take(10).toList(),
    );

    emit(HomeLoaded(
      recentlyRead: recentlyRead,
      recentlyWatched: recentlyWatched,
      newBooks: newBooks,
      newVideos: newVideos,
    ));
  }
}
