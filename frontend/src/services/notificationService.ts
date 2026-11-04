import apiClient from './apiClient';

export type AppNotification = {
  _id: string;
  type: 'reply' | 'answer_accepted' | 'moderation';
  message: string;
  link?: string;
  readAt: string | null;
  createdAt: string;
};

const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

export async function fetchUnreadCount(): Promise<number> {
  return unwrap<{ unread: number }>(await apiClient.get('/notifications/unread-count')).unread;
}

export async function fetchNotifications(): Promise<{ notifications: AppNotification[]; unread: number }> {
  return unwrap(await apiClient.get('/notifications', { params: { limit: 15 } }));
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/read-all');
}
