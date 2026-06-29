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

  trackVideoLoad(courseSlug, lessonSlug) {
    console.log('[video] load success', { course: courseSlug, lesson: lessonSlug })
  },

  trackPdfLoad(bookSlug, chapterOrder) {
    console.log('[pdf] load success', { book: bookSlug, chapter: chapterOrder })
  },
}

export { sentryService }
