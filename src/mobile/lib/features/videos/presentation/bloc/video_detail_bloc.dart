import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:injectable/injectable.dart';

import '../../domain/entities/video.dart';
import '../../domain/repositories/videos_repository.dart';

part 'video_detail_event.dart';
part 'video_detail_state.dart';

@injectable
class VideoDetailBloc extends Bloc<VideoDetailEvent, VideoDetailState> {
  final VideosRepository _repository;

  VideoDetailBloc(this._repository) : super(VideoDetailInitial()) {
    on<LoadVideoDetail>(_onLoad);
    on<PurchaseVideo>(_onPurchase);
  }

  Future<void> _onLoad(
    LoadVideoDetail event,
    Emitter<VideoDetailState> emit,
  ) async {
    emit(VideoDetailLoading());

    // Both requests kick off immediately (Dart runs sync code up to the
    // first `await` inside each call before returning its Future), so this
    // runs concurrently with getVideoDetail below rather than after it.
    final progressFuture = _repository.getCourseProgress(event.slug);

    final result = await _repository.getVideoDetail(
      event.slug,
      forceRefresh: event.forceRefresh,
    );

    final progressResult = await progressFuture;
    // Supplementary data only (progress bar) — a failure here must not
    // block the course detail itself, so we just leave progress null (bar
    // degrades, rest of the screen renders normally).
    final progress = progressResult.fold((_) => null, (p) => p);

    result.fold(
      (failure) => emit(VideoDetailError(failure.message)),
      (detail) => emit(VideoDetailLoaded(detail, progress: progress)),
    );
  }

  Future<void> _onPurchase(
    PurchaseVideo event,
    Emitter<VideoDetailState> emit,
  ) async {
    final current = state;
    if (current is! VideoDetailLoaded) return;

    // Carry the existing progress forward instead of dropping it — purchase
    // doesn't change it, and re-emitting without it would flicker the
    // progress bar off then back on once LoadVideoDetail re-fetches below.
    emit(VideoDetailPurchasing(current.detail, progress: current.progress));
    final result = await _repository.purchaseVideo(event.slug);
    result.fold(
      (failure) => emit(
        VideoDetailPurchaseError(
          current.detail,
          failure.message,
          progress: current.progress,
        ),
      ),
      (_) => add(LoadVideoDetail(event.slug)),
    );
  }
}
