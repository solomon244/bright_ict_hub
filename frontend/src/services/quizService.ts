import apiClient from './apiClient';
import type { Quiz, QuizAttempt } from '../types';

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export interface CreateQuizPayload {
  lesson: string;
  title: string;
  durationMinutes?: number;
  questions: Array<{
    prompt: string; // the API field is `prompt` (was mistyped as `question`)
    options: string[];
    correctAnswerIndex: number;
    explanation?: string;
  }>;
}

export interface SubmitQuizPayload {
  answers: Array<{
    questionIndex: number;
    selectedOptionIndex: number;
  }>;
}

export const fetchQuizByLesson = async (lessonId: string): Promise<Quiz> => {
  const response = await apiClient.get(`/quizzes/lesson/${lessonId}`);
  return unwrap<{ quiz: Quiz }>(response).quiz;
};

export const fetchQuiz = async (quizId: string): Promise<Quiz> => {
  const response = await apiClient.get(`/quizzes/${quizId}`);
  return unwrap<{ quiz: Quiz }>(response).quiz;
};

export const createQuiz = async (payload: CreateQuizPayload): Promise<Quiz> => {
  const response = await apiClient.post('/quizzes', payload);
  return unwrap<{ quiz: Quiz }>(response).quiz;
};

export const updateQuiz = async (quizId: string, payload: Partial<CreateQuizPayload>): Promise<Quiz> => {
  const response = await apiClient.patch(`/quizzes/${quizId}`, payload);
  return unwrap<{ quiz: Quiz }>(response).quiz;
};

export const deleteQuiz = async (quizId: string): Promise<void> => {
  await apiClient.delete(`/quizzes/${quizId}`);
};

export const submitQuiz = async (quizId: string, payload: SubmitQuizPayload): Promise<QuizAttempt> => {
  const response = await apiClient.post(`/quizzes/${quizId}/submit`, payload);
  return unwrap<{ attempt: QuizAttempt }>(response).attempt;
};

export const fetchQuizHistory = async (): Promise<QuizAttempt[]> => {
  const response = await apiClient.get('/quizzes/history/me');
  return unwrap<{ attempts: QuizAttempt[] }>(response).attempts;
};

export const fetchQuizAttempts = async (quizId: string): Promise<QuizAttempt[]> => {
  const response = await apiClient.get(`/quizzes/${quizId}/attempts`);
  return unwrap<{ attempts: QuizAttempt[] }>(response).attempts;
};

export interface QuizDraft {
  lessonId: string;
  title: string;
  status: 'draft';
  aiGenerated: true;
  requiresReview: true;
  questions: Array<{ prompt: string; options: string[]; correctAnswerIndex: number; explanation?: string }>;
}

/** AI-generated draft for instructors. Nothing is saved: review/edit, then publish with createQuiz(). */
export const generateQuizDraft = async (payload: {
  lessonId: string;
  count?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: 'en' | 'am';
}): Promise<QuizDraft> => {
  const response = await apiClient.post('/ai/quiz-draft', payload);
  return unwrap<{ draft: QuizDraft }>(response).draft;
};
