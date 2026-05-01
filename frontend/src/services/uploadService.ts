import apiClient from './apiClient';

const unwrap = <T>(response: { data: { data: T } }): T => response.data.data;

export interface UploadResponse {
  file: {
    filename: string;
    originalName: string;
    url: string;
    path: string;
    size: number;
    mimetype: string;
    type?: string;
  };
}

export const uploadProfileImage = async (file: File): Promise<UploadResponse['file']> => {
  const formData = new FormData();
  formData.append('profileImage', file);
  const response = await apiClient.post('/upload/profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap<UploadResponse>(response).file;
};

export const uploadThumbnail = async (file: File): Promise<UploadResponse['file']> => {
  const formData = new FormData();
  formData.append('thumbnail', file);
  const response = await apiClient.post('/upload/thumbnail', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap<UploadResponse>(response).file;
};

export const uploadVideo = async (file: File): Promise<UploadResponse['file']> => {
  const formData = new FormData();
  formData.append('video', file);
  const response = await apiClient.post('/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap<UploadResponse>(response).file;
};

export const uploadResource = async (file: File): Promise<UploadResponse['file']> => {
  const formData = new FormData();
  formData.append('resource', file);
  const response = await apiClient.post('/upload/resource', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return unwrap<UploadResponse>(response).file;
};

