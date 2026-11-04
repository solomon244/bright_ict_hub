import apiClient from './apiClient';

export type RecommendationItem = {
  type: 'welcome_back' | 'continue_lesson' | 'revise_quiz' | 'start_course';
  priority: number;
  title: string;
  reason: string;
  reasonAm: string;
  courseId?: string;
  lessonId?: string;
  quizId?: string;
};

export type RecommendationsPayload = {
  items: RecommendationItem[];
  goals: { weeklyLessons: number; dailyLessons: number; basedOn: 'default' | 'recent_pace' };
  atRisk: boolean;
  /** Always "rules": derived from real progress data, not generated text. */
  source: 'rules';
  generatedAt: string;
};

export async function fetchRecommendations(): Promise<RecommendationsPayload> {
  const response = await apiClient.get('/recommendations');
  return (response.data as { data: RecommendationsPayload }).data;
}
