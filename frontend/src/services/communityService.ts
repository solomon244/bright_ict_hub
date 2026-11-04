import apiClient from './apiClient';

export type Author = { id: string | null; name: string; role: 'student' | 'instructor' | 'admin' | null };
export type Board = { _id: string; title: string };

export type ThreadSummary = {
  _id: string;
  title: string;
  preview: string;
  author: Author;
  course: Board | null;
  isResolved: boolean;
  commentCount: number;
  lastActivityAt: string;
  createdAt: string;
};

export type ThreadDetail = {
  thread: {
    _id: string;
    title: string;
    body: string;
    author: Author;
    course: Board | null;
    isResolved: boolean;
    acceptedComment: string | null;
    isHidden: boolean;
    commentCount: number;
    createdAt: string;
  };
  comments: {
    _id: string;
    body: string;
    author: Author;
    isHidden: boolean;
    isAccepted: boolean;
    mine: boolean;
    createdAt: string;
  }[];
  permissions: { canModerate: boolean; isAuthor: boolean };
};

export type ReportReason = 'spam' | 'inappropriate' | 'harassment' | 'wrong_info' | 'other';

const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

export async function fetchBoards(): Promise<Board[]> {
  return unwrap<{ courses: Board[] }>(await apiClient.get('/community/boards')).courses;
}

export async function fetchThreads(params: {
  course?: string;
  status?: 'open' | 'resolved' | 'all';
  q?: string;
  page?: number;
}): Promise<{ threads: ThreadSummary[]; pagination: { page: number; limit: number; total: number } }> {
  return unwrap(await apiClient.get('/community/threads', { params }));
}

export async function createThread(input: { title: string; body: string; course?: string }): Promise<string> {
  return unwrap<{ thread: { _id: string } }>(await apiClient.post('/community/threads', input)).thread._id;
}

export async function fetchThread(id: string): Promise<ThreadDetail> {
  return unwrap<ThreadDetail>(await apiClient.get(`/community/threads/${id}`));
}

export async function postComment(threadId: string, body: string): Promise<void> {
  await apiClient.post(`/community/threads/${threadId}/comments`, { body });
}

export async function acceptAnswer(threadId: string, commentId: string): Promise<void> {
  await apiClient.post(`/community/threads/${threadId}/accept`, { commentId });
}

export async function reportContent(kind: 'thread' | 'comment', id: string, reason: ReportReason): Promise<string> {
  const path = kind === 'thread' ? 'threads' : 'comments';
  return (await apiClient.post(`/community/${path}/${id}/report`, { reason })).data.message as string;
}

export async function moderateContent(
  kind: 'thread' | 'comment',
  id: string,
  action: 'hide' | 'unhide' | 'delete',
): Promise<void> {
  const path = kind === 'thread' ? 'threads' : 'comments';
  await apiClient.post(`/community/${path}/${id}/moderate`, { action });
}
