import api from '../api/client'

const CACHE_12H = { ttl: 12 * 60 * 60 * 1000 }
const CACHE_1H = { ttl: 60 * 60 * 1000 }
const CACHE_5M = { ttl: 5 * 60 * 1000 }

export const videosService = {
  getRecentlyWatched() {
    return api.get('videos/recently-watched/', { cache: CACHE_5M })
  },

  getCategories() {
    return api.get('videos/categories/', { cache: CACHE_12H })
  },

  getVideos(params = {}) {
    return api.get('videos/', { params, cache: CACHE_1H })
  },

  getVideoDetail(slug) {
    return api.get(`videos/${slug}/`, { cache: CACHE_1H })
  },

  // No cache: lesson content with access control must be fresh
  getLesson(courseSlug, lessonSlug) {
    return api.get(`videos/${courseSlug}/lessons/${lessonSlug}/`)
  },

  updateProgress(courseSlug, lessonSlug, progressSeconds) {
    return api.post(`videos/${courseSlug}/lessons/${lessonSlug}/progress/`, {
      progress_seconds: progressSeconds,
    })
  },

  // No cache: real-time progress tracking
  getCourseProgress(courseSlug) {
    return api.get(`videos/${courseSlug}/progress/`)
  },

  // No cache: needs accurate last-lesson for navigation
  getLastLesson(courseSlug) {
    return api.get(`videos/${courseSlug}/progress/last-lesson/`)
  },

  setLastLesson(courseSlug, lessonSlug) {
    return api.post(`videos/${courseSlug}/progress/last-lesson/`, { lesson_slug: lessonSlug })
  },

  purchaseCourse(videoId) {
    return api.post('payments/purchase-video/', { video_id: videoId })
  },

  getLessonFlashcards(courseSlug, lessonSlug, count = 10) {
    return api.get(`videos/${courseSlug}/lessons/${lessonSlug}/flashcards/`, { params: { count } })
  },

  getLessonExam(courseSlug, lessonSlug) {
    return api.get(`videos/${courseSlug}/lessons/${lessonSlug}/exam/`)
  },

  /**
   * Upload a video file to a lesson (staff only).
   * @param {string} lessonPublicId - lesson public_id (UUID)
   * @param {File} file - video file
   * @param {function} onProgress - optional progress callback (progressEvent) => void
   */
  uploadLessonVideo(lessonPublicId, file, onProgress) {
    const form = new FormData()
    form.append('video', file)
    return api.post(`videos/lessons/${lessonPublicId}/upload/`, form, {
      headers: { 'Content-Type': undefined },
      onUploadProgress: onProgress,
    })
  },
}
