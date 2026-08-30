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
      LoadVideoDetail event, Emitter<VideoDetailState> emit) async {
    emit(VideoDetailLoading());
    final result = await _repository.getVideoDetail(event.slug);
    result.fold(
      (failure) => emit(VideoDetailError(failure.message)),
      (detail) => emit(VideoDetailLoaded(detail)),
    );
  }

  Future<void> _onPurchase(
      PurchaseVideo event, Emitter<VideoDetailState> emit) async {
    final current = state;
    if (current is! VideoDetailLoaded) return;

    emit(VideoDetailPurchasing(current.detail));
    final result = await _repository.purchaseVideo(event.slug);
    result.fold(
      (failure) => emit(
          VideoDetailPurchaseError(current.detail, failure.message)),
      (_) => add(LoadVideoDetail(event.slug)),
    );
  }
}
