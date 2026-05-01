import apiClient from './apiClient';
import type { Category } from '../types';

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export interface CreateCategoryPayload {
  name: string;
  description?: string;
  icon?: string;
}

export const fetchCategories = async (): Promise<Category[]> => {
  const response = await apiClient.get('/categories');
  return unwrap<{ categories: Category[] }>(response).categories;
};

export const fetchCategory = async (categoryId: string): Promise<Category> => {
  const response = await apiClient.get(`/categories/${categoryId}`);
  return unwrap<{ category: Category }>(response).category;
};

export const createCategory = async (payload: CreateCategoryPayload): Promise<Category> => {
  const response = await apiClient.post('/categories', payload);
  return unwrap<{ category: Category }>(response).category;
};

export const updateCategory = async (categoryId: string, payload: Partial<CreateCategoryPayload>): Promise<Category> => {
  const response = await apiClient.patch(`/categories/${categoryId}`, payload);
  return unwrap<{ category: Category }>(response).category;
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  await apiClient.delete(`/categories/${categoryId}`);
};

