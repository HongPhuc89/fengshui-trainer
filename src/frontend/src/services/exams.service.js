import api from '../api/client'

export const examsService = {
  submitExam(examSlug, answers) {
    return api.post(`exams/${examSlug}/submit/`, { answers })
  },

  reviewFlashcard(flashcardId, quality) {
    return api.post(`practice/flashcards/${flashcardId}/review/`, { quality })
  },
}
