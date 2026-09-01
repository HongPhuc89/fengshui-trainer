part of 'video_detail_bloc.dart';

abstract class VideoDetailEvent extends Equatable {
  const VideoDetailEvent();
  @override
  List<Object?> get props => [];
}

class LoadVideoDetail extends VideoDetailEvent {
  final String slug;
  final bool forceRefresh;
  const LoadVideoDetail(this.slug, {this.forceRefresh = false});
  @override
  List<Object?> get props => [slug, forceRefresh];
}

class PurchaseVideo extends VideoDetailEvent {
  final String slug;
  const PurchaseVideo(this.slug);
  @override
  List<Object?> get props => [slug];
}
