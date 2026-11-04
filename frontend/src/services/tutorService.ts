import apiClient from './apiClient';

export type TutorMode =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'exam_prep'
  | 'practice'
  | 'programming_mentor';

export const TUTOR_MODES: TutorMode[] = [
  'beginner',
  'intermediate',
  'advanced',
  'exam_prep',
  'practice',
  'programming_mentor',
];

export type TutorMessage = { role: 'user' | 'assistant'; content: string };

/** Only real platform lessons carry a courseId (the bundled curriculum has none), so only those can be linked. */
export type LessonHint = { lessonId: string; title: string; courseId?: string };

export type TutorChatResponse = {
  reply: string;
  escalate: boolean;
  reason: string | null;
  confidence: number | null;
  lessonHints?: LessonHint[];
  aiGenerated: boolean;
  conversationId: string;
  messageId: string;
  mode: TutorMode;
};

export type ConversationSummary = {
  _id: string;
  title: string;
  mode: TutorMode;
  messageCount: number;
  lastMessageAt: string;
};

export type StoredMessage = {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  aiGenerated?: boolean;
  feedback?: { rating?: 'up' | 'down' };
  meta?: { lessonHints?: LessonHint[] };
};

const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

/** Pulls the server's message out of an axios error so students see something useful. */
export function apiErrorMessage(err: unknown, fallback = 'Request failed'): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

/** The server keeps the history; only the newest message needs to be last in `messages`. */
export async function sendTutorMessage(
  messages: TutorMessage[],
  options: { conversationId?: string | null; mode?: TutorMode } = {},
): Promise<TutorChatResponse> {
  const response = await apiClient.post('/tutor/chat', {
    messages: messages.slice(-1),
    conversationId: options.conversationId || undefined,
    mode: options.mode,
  });
  return unwrap<TutorChatResponse>(response);
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const response = await apiClient.get('/tutor/conversations', { params: { limit: 30 } });
  return unwrap<{ conversations: ConversationSummary[] }>(response).conversations;
}

export async function fetchConversationMessages(
  id: string,
): Promise<{ conversation: ConversationSummary; messages: StoredMessage[] }> {
  const response = await apiClient.get(`/tutor/conversations/${id}/messages`);
  return unwrap<{ conversation: ConversationSummary; messages: StoredMessage[] }>(response);
}

export async function deleteConversation(id: string): Promise<void> {
  await apiClient.delete(`/tutor/conversations/${id}`);
}

export async function sendMessageFeedback(
  messageId: string,
  rating: 'up' | 'down',
  reason?: 'inaccurate' | 'confusing' | 'inappropriate' | 'other',
): Promise<void> {
  await apiClient.post(`/tutor/messages/${messageId}/feedback`, { rating, reason });
}
