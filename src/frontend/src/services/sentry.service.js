import * as Sentry from '@sentry/vue'

const sentryService = {
  /**
   * Identify the current user in Sentry.
   * Call this after login or on app boot when user is already authenticated.
   */
  setUser(user) {
    if (!user) {
      Sentry.setUser(null)
      return
    }
    Sentry.setUser({
      id: user.public_id,
      email: user.email,
    })
  },

  clearUser() {
    Sentry.setUser(null)
  },

  trackLogin(user) {
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'User logged in',
      data: { email: user.email },
      level: 'info',
    })
  },

  trackVideoLoad(courseSlug, lessonSlug) {
    Sentry.addBreadcrumb({
      category: 'video',
      message: 'Video load success',
      data: { course: courseSlug, lesson: lessonSlug },
      level: 'info',
    })
  },

  trackPdfLoad(bookSlug, chapterOrder) {
    Sentry.addBreadcrumb({
      category: 'pdf',
      message: 'PDF load success',
      data: { book: bookSlug, chapter: chapterOrder },
      level: 'info',
    })
  },
}

export { sentryService }
