/**
 * Training service — §9 của detail design.
 * Calls /api/training/* endpoints.
 * Exam submit/flashcard review vẫn dùng exams.service.js (không thay đổi).
 */
import api from '../api/client'

export const trainingService = {
  getTrainingByLesson(lessonSlug) {
    return api.get(`training/lesson/${lessonSlug}/`)
  },

  getTrainingByChapter(bookSlug, chapterOrder) {
    return api.get(`training/chapter/${bookSlug}/${chapterOrder}/`)
  },

  getFlashcards(activityId, count = 10) {
    return api.get(`training/activities/${activityId}/flashcards/`, { params: { count } })
  },

  getExam(activityId) {
    return api.get(`training/activities/${activityId}/exam/`)
  },
}
