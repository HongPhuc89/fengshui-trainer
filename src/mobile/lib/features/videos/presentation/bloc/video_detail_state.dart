part of 'video_detail_bloc.dart';

abstract class VideoDetailState extends Equatable {
  const VideoDetailState();
  @override
  List<Object?> get props => [];
}

class VideoDetailInitial extends VideoDetailState {}

class VideoDetailLoading extends VideoDetailState {}

class VideoDetailLoaded extends VideoDetailState {
  final VideoDetail detail;

  /// Nullable: a transient failure fetching it must not block showing the
  /// course itself — only the progress bar degrades (see VideoDetailBloc).
  final CourseProgress? progress;
  const VideoDetailLoaded(this.detail, {this.progress});
  @override
  List<Object?> get props => [detail, progress];
}

class VideoDetailError extends VideoDetailState {
  final String message;
  const VideoDetailError(this.message);
  @override
  List<Object?> get props => [message];
}

class VideoDetailPurchasing extends VideoDetailState {
  final VideoDetail detail;
  final CourseProgress? progress;
  const VideoDetailPurchasing(this.detail, {this.progress});
  @override
  List<Object?> get props => [detail, progress];
}

class VideoDetailPurchaseError extends VideoDetailState {
  final VideoDetail detail;
  final String message;
  final CourseProgress? progress;
  const VideoDetailPurchaseError(this.detail, this.message, {this.progress});
  @override
  List<Object?> get props => [detail, message, progress];
}
