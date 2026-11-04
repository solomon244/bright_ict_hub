import apiClient from './apiClient';
import type { Progress } from '../types';

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export interface UpdateProgressPayload {
  courseId?: string; // ignored by the server (it derives the course from the lesson)
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  percentage: number;
}

export const updateProgress = async (payload: UpdateProgressPayload): Promise<Progress> => {
  const response = await apiClient.post('/progress', payload);
  return unwrap<{ progress: Progress }>(response).progress;
};

export const fetchCourseProgress = async (courseId: string): Promise<Progress[]> => {
  const response = await apiClient.get(`/progress/${courseId}`);
  return unwrap<{ progress: Progress[] }>(response).progress;
};

export interface ProgressReward {
  xpAwarded: number;
  newBadges: { code: string; label: string; emoji: string }[];
}

/** Same as updateProgress but also returns the XP / badges the server granted. */
export const updateProgressWithReward = async (
  payload: UpdateProgressPayload,
): Promise<{ progress: Progress; reward: ProgressReward; courseProgress: { percentage: number; completed: boolean } }> => {
  const response = await apiClient.post('/progress', payload);
  return unwrap(response);
};
