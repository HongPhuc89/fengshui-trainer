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

  purchaseCourse(videoId) {
    return api.post('payments/purchase-video/', { video_id: videoId })
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
