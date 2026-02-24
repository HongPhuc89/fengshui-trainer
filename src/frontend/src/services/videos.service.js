import api from '../api/client'

export const videosService = {
  getCategories() {
    return api.get('videos/categories/')
  },

  getVideos(params = {}) {
    return api.get('videos/', { params })
  },

  getVideoDetail(slug) {
    return api.get(`videos/${slug}/`)
  },

  getLesson(courseSlug, lessonSlug) {
    return api.get(`videos/${courseSlug}/lessons/${lessonSlug}/`)
  },

  updateProgress(courseSlug, lessonSlug, progressSeconds) {
    return api.post(`videos/${courseSlug}/lessons/${lessonSlug}/progress/`, {
      progress_seconds: progressSeconds,
    })
  },

  getCourseProgress(courseSlug) {
    return api.get(`videos/${courseSlug}/progress/`)
  },
}
