/**
 * Training service — §9 của detail design.
 * Calls /api/training/* endpoints.
 * Exam submit/flashcard review vẫn dùng exams.service.js (không thay đổi).
 */
import api from '../api/client'

const CACHE_15M = { ttl: 15 * 60 * 1000 }
const CACHE_10M = { ttl: 10 * 60 * 1000 }

export const trainingService = {
  getTrainingByLesson(lessonSlug) {
    return api.get(`training/lesson/${lessonSlug}/`, { cache: CACHE_15M })
  },

  getTrainingByChapter(bookSlug, chapterOrder) {
    return api.get(`training/chapter/${bookSlug}/${chapterOrder}/`, { cache: CACHE_15M })
  },

  getFlashcards(activityId, count = 20) {
    return api.get(`training/activities/${activityId}/flashcards/`, {
      params: { count },
      cache: CACHE_10M,
    })
  },

  // No cache: exam data must be fresh each session
  getExam(activityId) {
    return api.get(`training/activities/${activityId}/exam/`)
  },
}
