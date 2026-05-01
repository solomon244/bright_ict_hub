import { API_BASE_URL } from '../services/apiClient';

const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');

export const resolveMediaUrl = (url?: string): string => {
  if (!url) return '';

  if (url.startsWith('/uploads/')) {
    return `${apiOrigin}${url}`;
  }

  if (url.startsWith('http://localhost:5173/uploads/')) {
    return url.replace('http://localhost:5173', apiOrigin);
  }

  return url;
};

