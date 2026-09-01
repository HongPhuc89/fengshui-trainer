import 'package:flutter_test/flutter_test.dart';
import 'package:huyenhoc/features/videos/domain/entities/video.dart';
import 'package:huyenhoc/features/videos/presentation/bloc/video_player_bloc.dart';

LessonContent _lessonContent(String slug) => LessonContent(
      slug: slug,
      title: slug,
      order: 0,
      videoUrl: 'https://example.test/$slug.mp4',
      durationSeconds: 60,
      hasTrainingSet: false,
    );

LessonMeta _lesson(String slug, int order) => LessonMeta(
      slug: slug,
      title: slug,
      order: order,
      durationSeconds: 60,
      canAccess: true,
      isCompleted: false,
      hasTrainingSet: false,
    );

void main() {
  group('VideoPlayerLoaded prev/next', () {
    test('sortedLessons orders by order, not by list position', () {
      final state = VideoPlayerLoaded(
        courseSlug: 'course',
        lesson: _lessonContent('b'),
        lessons: [_lesson('c', 3), _lesson('a', 1), _lesson('b', 2)],
      );
      expect(state.sortedLessons.map((l) => l.slug), ['a', 'b', 'c']);
    });

    test('middle lesson has both a prev and a next', () {
      final state = VideoPlayerLoaded(
        courseSlug: 'course',
        lesson: _lessonContent('b'),
        lessons: [_lesson('a', 1), _lesson('b', 2), _lesson('c', 3)],
      );
      expect(state.prevLesson?.slug, 'a');
      expect(state.nextLesson?.slug, 'c');
    });

    test('first lesson has no prev', () {
      final state = VideoPlayerLoaded(
        courseSlug: 'course',
        lesson: _lessonContent('a'),
        lessons: [_lesson('a', 1), _lesson('b', 2)],
      );
      expect(state.prevLesson, isNull);
      expect(state.nextLesson?.slug, 'b');
    });

    test('last lesson has no next', () {
      final state = VideoPlayerLoaded(
        courseSlug: 'course',
        lesson: _lessonContent('b'),
        lessons: [_lesson('a', 1), _lesson('b', 2)],
      );
      expect(state.prevLesson?.slug, 'a');
      expect(state.nextLesson, isNull);
    });

    test('empty lessons list (course fetch failed) has neither', () {
      const state = VideoPlayerLoaded(
        courseSlug: 'course',
        lesson: LessonContent(
          slug: 'a',
          title: 'a',
          order: 0,
          videoUrl: 'https://example.test/a.mp4',
          durationSeconds: 60,
          hasTrainingSet: false,
        ),
      );
      expect(state.prevLesson, isNull);
      expect(state.nextLesson, isNull);
    });

    test(
        'current lesson missing from the list (standalone open) has neither',
        () {
      final state = VideoPlayerLoaded(
        courseSlug: 'course',
        lesson: _lessonContent('unlisted'),
        lessons: [_lesson('a', 1), _lesson('b', 2)],
      );
      expect(state.prevLesson, isNull);
      expect(state.nextLesson, isNull);
    });
  });
}
