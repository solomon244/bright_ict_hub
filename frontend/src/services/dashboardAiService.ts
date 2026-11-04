import apiClient from './apiClient';

export type DashboardAiPayload = {
  insights: string | null;
  fallback: boolean;
  /** ai = LLM text (any provider); static = rule-based from your snapshot; none = server error */
  source?: 'ai' | 'gemini' | 'static' | 'none';
  generatedAt?: string;
};

const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

export async function fetchDashboardAiInsights(): Promise<DashboardAiPayload> {
  const response = await apiClient.get('/dashboard/ai-insights');
  return unwrap<DashboardAiPayload>(response);
}
