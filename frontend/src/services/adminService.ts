import apiClient from './apiClient';
import type { User } from '../types';

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export interface DashboardStats {
  userCount: number;
  instructorPending: number;
  courseCount: number;
  enrollmentCount: number;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: 'student' | 'instructor' | 'admin';
  isEmailVerified?: boolean;
  bio?: string;
  skills?: string[];
}

export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get('/admin/stats');
  return unwrap<{ stats: DashboardStats }>(response).stats;
};

export const fetchUsers = async (): Promise<User[]> => {
  const response = await apiClient.get('/admin/users');
  return unwrap<{ users: User[] }>(response).users;
};

export const fetchUser = async (userId: string): Promise<User> => {
  const response = await apiClient.get(`/admin/users/${userId}`);
  return unwrap<{ user: User }>(response).user;
};

export const updateUser = async (userId: string, payload: UpdateUserPayload): Promise<User> => {
  const response = await apiClient.patch(`/admin/users/${userId}`, payload);
  return unwrap<{ user: User }>(response).user;
};

export const deleteUser = async (userId: string): Promise<void> => {
  await apiClient.delete(`/admin/users/${userId}`);
};

export const updateInstructorStatus = async (instructorId: string, status: 'approved' | 'rejected'): Promise<User> => {
  const response = await apiClient.patch(`/admin/instructors/${instructorId}`, { status });
  return unwrap<{ user: User }>(response).user;
};

