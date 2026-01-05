import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/models/reading_progress_models.dart';
import '../../data/repositories/reading_progress_repository.dart';

// Repository Provider
final readingProgressRepositoryProvider =
    Provider<ReadingProgressRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ReadingProgressRepository(apiClient);
});

// Reading Progress State
class ReadingProgressState {
  final ReadingProgress? progress;
  final bool isLoading;
  final bool isSaving;
  final String? error;

  ReadingProgressState({
    this.progress,
    this.isLoading = false,
    this.isSaving = false,
    this.error,
  });

  ReadingProgressState copyWith({
    ReadingProgress? progress,
    bool? isLoading,
    bool? isSaving,
    String? error,
  }) {
    return ReadingProgressState(
      progress: progress ?? this.progress,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      error: error,
    );
  }
}

// Reading Progress Notifier
class ReadingProgressNotifier extends StateNotifier<ReadingProgressState> {
  final ReadingProgressRepository _repository;
  final int chapterId;

  ReadingProgressNotifier(this._repository, this.chapterId)
      : super(ReadingProgressState()) {
    loadProgress();
  }

  Future<void> loadProgress() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final progress = await _repository.getProgress(chapterId);
      state = state.copyWith(progress: progress, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> updateProgress(int currentPage, int totalPages) async {
    state = state.copyWith(isSaving: true);

    try {
      final request = UpdateProgressRequest(
        currentPage: currentPage,
        totalPages: totalPages,
      );
      final progress = await _repository.updateProgress(chapterId, request);
      state = state.copyWith(progress: progress, isSaving: false);
    } on DioException catch (e) {
      state = state.copyWith(isSaving: false);
      // Silently fail for progress updates
    }
  }

  Future<void> markAsCompleted() async {
    try {
      await _repository.markAsCompleted(chapterId);
      await loadProgress();
    } catch (e) {
      // Silently fail
    }
  }
}

// Reading Progress Provider Family
final readingProgressProvider = StateNotifierProvider.family<
    ReadingProgressNotifier, ReadingProgressState, int>((ref, chapterId) {
  final repository = ref.watch(readingProgressRepositoryProvider);
  return ReadingProgressNotifier(repository, chapterId);
});
