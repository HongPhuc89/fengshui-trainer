import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Reading Progress State
class ReadingProgressState {

  ReadingProgressState({
    this.currentPage = 1,
    this.totalPages = 0,
    this.lastReadAt,
  });
  final int currentPage;
  final int totalPages;
  final DateTime? lastReadAt;

  ReadingProgressState copyWith({
    int? currentPage,
    int? totalPages,
    DateTime? lastReadAt,
  }) {
    return ReadingProgressState(
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
      lastReadAt: lastReadAt ?? this.lastReadAt,
    );
  }

  double get progressPercentage {
    if (totalPages == 0) return 0.0;
    return (currentPage / totalPages).clamp(0.0, 1.0);
  }
}

// Reading Progress Notifier - Local Only
class ReadingProgressNotifier extends StateNotifier<ReadingProgressState> {

  ReadingProgressNotifier(this.chapterId) : super(ReadingProgressState()) {
    _loadProgress();
  }
  final int chapterId;

  Future<void> _loadProgress() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = 'reading_progress_$chapterId';
      final jsonString = prefs.getString(key);
      
      if (jsonString != null) {
        final json = jsonDecode(jsonString) as Map<String, dynamic>;
        state = ReadingProgressState(
          currentPage: json['currentPage'] as int? ?? 1,
          totalPages: json['totalPages'] as int? ?? 0,
          lastReadAt: json['lastReadAt'] != null 
              ? DateTime.parse(json['lastReadAt'] as String)
              : null,
        );
        print('[ReadingProgress] Loaded: page ${state.currentPage}/${state.totalPages}');
      }
    } catch (e) {
      print('[ReadingProgress] Failed to load: $e');
      // Reset to default state on error
      state = ReadingProgressState(currentPage: 1, totalPages: 0);
    }
  }

  Future<void> updateProgress(int currentPage, int totalPages) async {
    // Update state
    state = state.copyWith(
      currentPage: currentPage,
      totalPages: totalPages,
      lastReadAt: DateTime.now(),
    );
    
    // Save to local storage
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = 'reading_progress_$chapterId';
      
      final json = {
        'currentPage': currentPage,
        'totalPages': totalPages,
        'lastReadAt': DateTime.now().toIso8601String(),
      };
      
      await prefs.setString(key, jsonEncode(json));
      print('[ReadingProgress] Saved: page $currentPage/$totalPages');
    } catch (e) {
      print('[ReadingProgress] Failed to save: $e');
    }
  }
}

// Reading Progress Provider Family
final readingProgressProvider = StateNotifierProvider.family<
    ReadingProgressNotifier, ReadingProgressState, int>((ref, chapterId) {
  return ReadingProgressNotifier(chapterId);
});

// Infographic Progress Notifier - Separate from Chapter Progress
class InfographicProgressNotifier extends StateNotifier<ReadingProgressState> {

  InfographicProgressNotifier(this.chapterId) : super(ReadingProgressState()) {
    _loadProgress();
  }
  final int chapterId;

  Future<void> _loadProgress() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = 'infographic_progress_$chapterId'; // Different key!
      final jsonString = prefs.getString(key);
      
      if (jsonString != null) {
        final json = jsonDecode(jsonString) as Map<String, dynamic>;
        state = ReadingProgressState(
          currentPage: json['currentPage'] as int? ?? 1,
          totalPages: json['totalPages'] as int? ?? 0,
          lastReadAt: json['lastReadAt'] != null 
              ? DateTime.parse(json['lastReadAt'] as String)
              : null,
        );
        print('[InfographicProgress] Loaded: page ${state.currentPage}/${state.totalPages}');
      }
    } catch (e) {
      print('[InfographicProgress] Failed to load: $e');
      state = ReadingProgressState(currentPage: 1, totalPages: 0);
    }
  }

  Future<void> updateProgress(int currentPage, int totalPages) async {
    state = state.copyWith(
      currentPage: currentPage,
      totalPages: totalPages,
      lastReadAt: DateTime.now(),
    );
    
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = 'infographic_progress_$chapterId'; // Different key!
      
      final json = {
        'currentPage': currentPage,
        'totalPages': totalPages,
        'lastReadAt': DateTime.now().toIso8601String(),
      };
      
      await prefs.setString(key, jsonEncode(json));
      print('[InfographicProgress] Saved: page $currentPage/$totalPages');
    } catch (e) {
      print('[InfographicProgress] Failed to save: $e');
    }
  }
}

// Infographic Progress Provider Family
final infographicProgressProvider = StateNotifierProvider.family<
    InfographicProgressNotifier, ReadingProgressState, int>((ref, chapterId) {
  return InfographicProgressNotifier(chapterId);
});
