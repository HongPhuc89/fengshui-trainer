import 'package:sentry_flutter/sentry_flutter.dart';

/// Structured Sentry Logs + custom metrics — mirrors the web app's
/// sentry.service.js (feature-38 design doc,
/// md/design/feature-38-mobile-sentry-logs.md).
///
/// Distinct from Sentry's automatic crash/exception capture (configured via
/// `options.dsn` in main.dart): these are explicit, queryable log lines and
/// counters for key product events, not error reports. Safe to call even if
/// Sentry failed to init (SDK falls back to no-op logger/metrics).
class SentryLogService {
  SentryLogService._();

  static void trackLogin(String email) {
    Sentry.logger.info(
      'User logged in',
      attributes: {'email': SentryAttribute.string(email)},
    );
    Sentry.metrics.count(
      'auth.login.success',
      1,
      attributes: {'email': SentryAttribute.string(email)},
    );
  }

  static void trackVideoLoad(String courseSlug, String lessonSlug) {
    final attrs = {
      'course_slug': SentryAttribute.string(courseSlug),
      'lesson_slug': SentryAttribute.string(lessonSlug),
    };
    Sentry.logger.info('Video load success', attributes: attrs);
    Sentry.metrics.count('video.load.success', 1, attributes: attrs);
  }

  static void trackVideoLoadError(
    String courseSlug,
    String lessonSlug,
    String reason,
  ) {
    Sentry.logger.error('Video load failed', attributes: {
      'course_slug': SentryAttribute.string(courseSlug),
      'lesson_slug': SentryAttribute.string(lessonSlug),
      'reason': SentryAttribute.string(reason),
    });
    Sentry.metrics.count('video.load.error', 1, attributes: {
      'course_slug': SentryAttribute.string(courseSlug),
      'lesson_slug': SentryAttribute.string(lessonSlug),
    });
  }

  static void trackPdfLoad(String bookSlug, int chapterOrder) {
    final attrs = {
      'book_slug': SentryAttribute.string(bookSlug),
      'chapter_order': SentryAttribute.int(chapterOrder),
    };
    Sentry.logger.info('PDF load success', attributes: attrs);
    Sentry.metrics.count('pdf.load.success', 1, attributes: attrs);
  }

  static void trackPdfLoadError(
    String bookSlug,
    int chapterOrder,
    String reason,
  ) {
    Sentry.logger.error('PDF load failed', attributes: {
      'book_slug': SentryAttribute.string(bookSlug),
      'chapter_order': SentryAttribute.int(chapterOrder),
      'reason': SentryAttribute.string(reason),
    });
    Sentry.metrics.count('pdf.load.error', 1, attributes: {
      'book_slug': SentryAttribute.string(bookSlug),
      'chapter_order': SentryAttribute.int(chapterOrder),
    });
  }

  static void trackImageLoadError(String url) {
    Sentry.logger.error(
      'CDN image load failed',
      attributes: {'url': SentryAttribute.string(url)},
    );
    Sentry.metrics.count(
      'image.load.error',
      1,
      attributes: {'url': SentryAttribute.string(url)},
    );
  }
}
