import apiClient from './apiClient';
import type { Enrollment } from '../types';

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export const enrollInCourse = async (courseId: string): Promise<Enrollment> => {
  const response = await apiClient.post('/enrollments', { courseId });
  return unwrap<{ enrollment: Enrollment }>(response).enrollment;
};

export const fetchMyEnrollments = async (): Promise<Enrollment[]> => {
  const response = await apiClient.get('/enrollments/me');
  return unwrap<{ enrollments: Enrollment[] }>(response).enrollments;
};

export const fetchEnrollment = async (enrollmentId: string): Promise<Enrollment> => {
  const response = await apiClient.get(`/enrollments/${enrollmentId}`);
  return unwrap<{ enrollment: Enrollment }>(response).enrollment;
};

export const unenrollFromCourse = async (enrollmentId: string): Promise<void> => {
  await apiClient.delete(`/enrollments/${enrollmentId}`);
};

export const fetchCourseEnrollments = async (courseId: string): Promise<Enrollment[]> => {
  const response = await apiClient.get(`/enrollments/course/${courseId}`);
  return unwrap<{ enrollments: Enrollment[] }>(response).enrollments;
};

