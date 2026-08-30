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
  const VideoDetailLoaded(this.detail);
  @override
  List<Object?> get props => [detail];
}

class VideoDetailError extends VideoDetailState {
  final String message;
  const VideoDetailError(this.message);
  @override
  List<Object?> get props => [message];
}

class VideoDetailPurchasing extends VideoDetailState {
  final VideoDetail detail;
  const VideoDetailPurchasing(this.detail);
  @override
  List<Object?> get props => [detail];
}

class VideoDetailPurchaseError extends VideoDetailState {
  final VideoDetail detail;
  final String message;
  const VideoDetailPurchaseError(this.detail, this.message);
  @override
  List<Object?> get props => [detail, message];
}
