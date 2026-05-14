import apiClient from './apiClient';

export type TutorMessage = { role: 'user' | 'assistant'; content: string };

export type TutorChatResponse = {
  reply: string;
  escalate: boolean;
  reason: string | null;
  confidence: number | null;
  lessonHints?: { lessonId: string; title: string }[];
};

const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

export async function sendTutorMessage(messages: TutorMessage[]): Promise<TutorChatResponse> {
  const response = await apiClient.post('/tutor/chat', { messages });
  return unwrap<TutorChatResponse>(response);
}
