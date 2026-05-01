import apiClient from './apiClient';
import type { Quiz, QuizAttempt } from '../types';

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export interface CreateQuizPayload {
  lesson: string;
  title: string;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswerIndex: number;
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

