import apiClient from './apiClient';

export type ChallengeSummary = {
  _id: string;
  slug: string;
  title: string;
  titleAm?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  myBest: { passed: number; total: number; attempts: number } | null;
};

export type Challenge = ChallengeSummary & {
  description: string;
  functionName: string;
  starterCode: string;
  tests: { args: unknown[]; expected: unknown }[];
};

export type SavedAttempt = { _id: string; code: string; passedCount: number; totalTests: number; createdAt: string };

const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

export async function fetchChallenges(): Promise<ChallengeSummary[]> {
  return unwrap<{ challenges: ChallengeSummary[] }>(await apiClient.get('/coding/challenges')).challenges;
}

export async function fetchChallenge(id: string): Promise<Challenge> {
  return unwrap<{ challenge: Challenge }>(await apiClient.get(`/coding/challenges/${id}`)).challenge;
}

/** Saves an attempt. The pass count comes from the student's browser sandbox (self-reported). */
export async function saveAttempt(id: string, code: string, passedCount: number): Promise<void> {
  await apiClient.post(`/coding/challenges/${id}/submissions`, { code, passedCount });
}

export async function fetchAttempts(id: string): Promise<SavedAttempt[]> {
  return unwrap<{ submissions: SavedAttempt[] }>(await apiClient.get(`/coding/challenges/${id}/submissions`)).submissions;
}
