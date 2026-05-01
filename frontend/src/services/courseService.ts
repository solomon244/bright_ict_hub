import apiClient from './apiClient';
import type { Course, Lesson } from '../types';

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export interface CreateCoursePayload {
  title: string;
  description: string;
  category: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  price?: number;
  thumbnailUrl?: string;
  requirements?: string[];
  outcomes?: string[];
  tags?: string[];
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {
  isPublished?: boolean;
}

export interface CreateLessonPayload {
  title: string;
  description?: string;
  order?: number;
  content?: string;
  videoUrl?: string;
  duration?: number;
  isPreviewable?: boolean;
}

export const fetchCourses = async (filters?: {
  category?: string;
  level?: string;
  isPublished?: boolean;
}): Promise<Course[]> => {
  // Convert boolean to string for backend compatibility
  const params: Record<string, string> = {};
  if (filters?.category) params.category = filters.category;
  if (filters?.level) params.level = filters.level;
  if (filters?.isPublished !== undefined) {
    params.isPublished = filters.isPublished.toString();
  }
  
  const response = await apiClient.get('/courses', { params });
  return unwrap<{ courses: Course[] }>(response).courses;
};

export const fetchCourse = async (courseId: string): Promise<{ course: Course; lessons: Lesson[] }> => {
  const response = await apiClient.get(`/courses/${courseId}`);
  return unwrap<{ course: Course; lessons: Lesson[] }>(response);
};

export const createCourse = async (payload: CreateCoursePayload): Promise<Course> => {
  const response = await apiClient.post('/courses', payload);
  return unwrap<{ course: Course }>(response).course;
};

export const updateCourse = async (courseId: string, payload: UpdateCoursePayload): Promise<Course> => {
  const response = await apiClient.patch(`/courses/${courseId}`, payload);
  return unwrap<{ course: Course }>(response).course;
};

export const deleteCourse = async (courseId: string): Promise<void> => {
  await apiClient.delete(`/courses/${courseId}`);
};

export const publishCourse = async (courseId: string, isPublished: boolean): Promise<Course> => {
  const response = await apiClient.patch(`/courses/${courseId}/publish`, { isPublished });
  return unwrap<{ course: Course }>(response).course;
};

export const createLesson = async (courseId: string, payload: CreateLessonPayload): Promise<Lesson> => {
  const response = await apiClient.post(`/courses/${courseId}/lessons`, payload);
  return unwrap<{ lesson: Lesson }>(response).lesson;
};

export const updateLesson = async (lessonId: string, payload: Partial<CreateLessonPayload>): Promise<Lesson> => {
  const response = await apiClient.patch(`/courses/lessons/${lessonId}`, payload);
  return unwrap<{ lesson: Lesson }>(response).lesson;
};

export const deleteLesson = async (lessonId: string): Promise<void> => {
  await apiClient.delete(`/courses/lessons/${lessonId}`);
};

export const uploadCourseThumbnail = async (courseId: string, file: File): Promise<{ url: string; filename: string }> => {
  const formData = new FormData();
  formData.append('thumbnail', file);
  const response = await apiClient.post(`/courses/${courseId}/thumbnail`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap<{ file: { url: string; filename: string } }>(response).file;
};

export const uploadLessonVideo = async (lessonId: string, file: File): Promise<{ url: string; filename: string }> => {
  const formData = new FormData();
  formData.append('video', file);
  const response = await apiClient.post(`/courses/lessons/${lessonId}/video`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap<{ file: { url: string; filename: string } }>(response).file;
};

