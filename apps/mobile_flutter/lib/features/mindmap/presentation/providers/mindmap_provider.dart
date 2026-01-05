import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/mindmap_models.dart';
import '../../data/repositories/mindmap_repository.dart';

/// Mindmap state class
class MindmapState {
  final MindMap? mindmap;
  final bool isLoading;
  final String? error;

  const MindmapState({
    this.mindmap,
    this.isLoading = false,
    this.error,
  });

  MindmapState copyWith({
    MindMap? mindmap,
    bool? isLoading,
    String? error,
  }) {
    return MindmapState(
      mindmap: mindmap ?? this.mindmap,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

/// Mindmap notifier for state management
class MindmapNotifier extends StateNotifier<MindmapState> {
  final MindmapRepository _repository;

  MindmapNotifier(this._repository) : super(const MindmapState());

  /// Load mindmap for a chapter
  Future<void> loadMindmap({
    required int bookId,
    required int chapterId,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final mindmap = await _repository.getMindmap(
        bookId: bookId,
        chapterId: chapterId,
      );

      state = state.copyWith(
        mindmap: mindmap,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      debugPrint('Error loading mindmap: $e');
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Reset state
  void reset() {
    state = const MindmapState();
  }
}

/// Provider for mindmap repository
final mindmapRepositoryProvider = Provider<MindmapRepository>((ref) {
  return MindmapRepository();
});

/// Provider for mindmap state
final mindmapProvider =
    StateNotifierProvider<MindmapNotifier, MindmapState>((ref) {
  final repository = ref.watch(mindmapRepositoryProvider);
  return MindmapNotifier(repository);
});
