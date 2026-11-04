import apiClient from './apiClient';

export type LearningPathSummary = {
  _id: string;
  title: string;
  titleAm?: string;
  description?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  skills: string[];
  totalCourses: number;
  isPublished: boolean;
};

export type PathCourse = {
  order: number;
  status: 'not_enrolled' | 'in_progress' | 'completed';
  progressPercentage: number;
  course: { _id: string; title: string; level?: string; totalLessons?: number };
};

export type PathProgress = {
  courses: PathCourse[];
  completedCourses: number;
  totalCourses: number;
  percent: number;
  nextCourseId: string | null;
};

const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

export async function fetchLearningPaths(): Promise<LearningPathSummary[]> {
  return unwrap<{ paths: LearningPathSummary[] }>(await apiClient.get('/learning-paths')).paths;
}

export async function fetchLearningPath(
  id: string,
): Promise<{ path: LearningPathSummary; progress: PathProgress }> {
  return unwrap(await apiClient.get(`/learning-paths/${id}`));
}
