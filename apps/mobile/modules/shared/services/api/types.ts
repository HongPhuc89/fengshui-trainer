// API Response Types

// Auth Types
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  name?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    name?: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: number;
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

// Book Types
export interface Book {
  id: number;
  title: string;
  description?: string;
  coverImage?: string;
  author?: string;
  published: boolean;
  chapter_count?: number; // Computed field from backend
  createdAt: string;
  updatedAt: string;
}

// Chapter Types
export interface Chapter {
  id: number;
  bookId: number;
  title: string;
  description?: string;
  content?: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// Flashcard Types
export interface Flashcard {
  id: number;
  chapterId: number;
  question: string;
  answer: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt: string;
  updatedAt: string;
}

// Quiz Types
export interface QuizConfig {
  id: number;
  chapterId: number;
  questionCount: number;
  easyPercentage: number;
  mediumPercentage: number;
  hardPercentage: number;
  passingScore: number;
  timeLimit?: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showCorrectAnswers: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  type: 'multiple_choice' | 'multiple_answer' | 'true_false';
  options: any;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface QuizAttempt {
  id: number;
  userId: number;
  chapterId: number;
  questions: QuizQuestion[];
  startedAt: string;
  completedAt?: string;
  score?: number;
  passed?: boolean;
  totalPoints?: number;
  earnedPoints?: number;
}

export interface SubmitQuizRequest {
  attempt_id: number;
  answers: Record<number, any>; // questionId -> answer
}

export interface SubmitQuizResponse {
  attemptId: number;
  score: number;
  passed: boolean;
  totalPoints: number;
  earnedPoints: number;
  correctAnswers: number;
  totalQuestions: number;
  results: Array<{
    questionId: number;
    isCorrect: boolean;
    pointsEarned: number;
    userAnswer: any;
    correctAnswer?: any;
  }>;
  completedAt: string;
}

// MindMap Types
export interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
  metadata?: Record<string, any>;
}

export interface MindMap {
  id: number;
  chapterId: number;
  title: string;
  description?: string;
  structure: MindMapNode;
  createdAt: string;
  updatedAt: string;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error Types
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
