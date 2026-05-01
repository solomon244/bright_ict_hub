import apiClient from './apiClient';
import type { User, AuthTokens } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  firstName: string;
  lastName: string;
  role: 'student' | 'instructor';
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface VerifyEmailPayload {
  token: string;
}

interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const response = await apiClient.post('/auth/login', payload);
  return unwrap<AuthResponse>(response);
};

export const register = async (payload: RegisterPayload) => {
  const response = await apiClient.post('/auth/register', payload);
  return unwrap<{ user: User }>(response);
};

export const logout = async (refreshToken: string | null) => {
  if (!refreshToken) {
    return;
  }
  await apiClient.post('/auth/logout', { refreshToken });
};

export const requestPasswordReset = async (email: string) => {
  await apiClient.post('/auth/forgot-password', { email });
};

export const resetPassword = async (payload: ResetPasswordPayload) => {
  await apiClient.post('/auth/reset-password', payload);
};

export const requestEmailVerification = async () => {
  await apiClient.post('/auth/verify-email/request');
};

export const verifyEmail = async (payload: VerifyEmailPayload) => {
  await apiClient.post('/auth/verify-email/confirm', payload);
};

export const refreshSession = async (refreshToken: string) => {
  const response = await apiClient.post('/auth/refresh', { refreshToken });
  return unwrap<{ tokens: AuthTokens }>(response);
};

