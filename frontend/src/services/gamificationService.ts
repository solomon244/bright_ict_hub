import apiClient from './apiClient';

export type GamificationBadge = {
  code: string;
  label: string;
  emoji: string;
  description: string;
  unlocked: boolean;
  awardedAt: string | null;
};

export type GamificationStats = {
  xp: number;
  weeklyXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  levelProgressPercent: number;
  streak: { current: number; longest: number };
  completedLessons: number;
  badges: GamificationBadge[];
  leaderboardOptIn: boolean;
};

export type LeaderboardEntry = { rank: number; name: string; xp: number; isMe: boolean };

const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

export async function fetchGamification(): Promise<GamificationStats> {
  return unwrap<GamificationStats>(await apiClient.get('/gamification/me'));
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  return unwrap<{ entries: LeaderboardEntry[] }>(await apiClient.get('/gamification/leaderboard')).entries;
}

export async function setLeaderboardOptIn(optIn: boolean): Promise<boolean> {
  return unwrap<{ leaderboardOptIn: boolean }>(await apiClient.put('/gamification/leaderboard-opt-in', { optIn }))
    .leaderboardOptIn;
}
