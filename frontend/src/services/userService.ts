import apiClient from './apiClient';
import type { User } from '../types';
import { uploadProfileImage } from './uploadService';

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export const fetchProfile = async (): Promise<User> => {
  const response = await apiClient.get('/users/me');
  const payload = unwrap<{ user: User }>(response);
  return payload.user;
};

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  bio?: string;
  skills?: string[];
  socialLinks?: {
    youtube?: string;
    linkedin?: string;
    website?: string;
  };
  profileImage?: string;
  instructorProfile?: {
    experienceYears?: number;
    highlight?: string;
  };
}

export const updateProfile = async (payload: UpdateProfilePayload): Promise<User> => {
  const response = await apiClient.patch('/users/me', payload);
  return unwrap<{ user: User }>(response).user;
};

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
  await apiClient.patch('/users/me/password', payload);
};

export const uploadProfileImageAndUpdate = async (file: File): Promise<User> => {
  const fileData = await uploadProfileImage(file);
  return updateProfile({ profileImage: fileData.url });
};


