import apiClient from './apiClient';

export type InstructorAnalytics = {
  summary: {
    courses: number;
    learners: number;
    enrollments: number;
    completedEnrollments: number;
    completionRate: number;
    activeLearners7d: number;
    atRiskLearners: number;
    unansweredQuestions: number;
  };
  courses: { courseId: string; title: string; enrollments: number; completed: number; completionRate: number; avgProgress: number }[];
  weakestQuizzes: { quizId: string; title: string; courseTitle: string; attempts: number; avgScorePercent: number }[];
  unanswered: { _id: string; title: string; courseTitle: string; createdAt: string }[];
};

export type AdminAnalytics = {
  windowDays: number;
  totals: {
    users: number;
    students: number;
    instructors: number;
    admins: number;
    pendingInstructors: number;
    courses: number;
    enrollments: number;
    completedEnrollments: number;
    completionRate: number;
    avgProgress: number;
    activeLearners7d: number;
  };
  retention14d: { cohortSize: number; retained: number; rate: number };
  window: { newUsers: number; newEnrollments: number; lessonsCompleted: number; quizAttempts: number; avgQuizScorePercent: number; aiRequests: number };
  daily: { date: string; new_users: number; new_enrollments: number; lessons_completed: number; quiz_attempts: number }[];
  topCourses: { courseId: string; title: string; enrollments: number; completed: number; completionRate: number }[];
  notCollected: string[];
};

export type AiUsage = {
  provider: { name: string; configured: boolean; dailyLimitPerUser: number };
  totals: { requests: number; errors: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number; activeUsers: number; avgLatencyMs: number };
  feedback: { rating: 'up' | 'down'; reason: string | null; count: number }[];
};

export type ModerationItem = {
  kind: 'thread' | 'comment';
  id: string;
  threadId: string;
  text: string;
  author: { name: string; role: string | null };
  reportCount: number;
  reasons: Record<string, number>;
  isHidden: boolean;
  createdAt: string;
};

export type AuditEntry = {
  _id: string;
  action: string;
  actorRole?: string;
  actor?: { firstName: string; lastName: string } | null;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

export const fetchInstructorAnalytics = async (): Promise<InstructorAnalytics> =>
  unwrap(await apiClient.get('/analytics/instructor'));

export const fetchAdminAnalytics = async (days = 30): Promise<AdminAnalytics> =>
  unwrap(await apiClient.get('/analytics/admin', { params: { days } }));

export const fetchAiUsage = async (days = 30): Promise<AiUsage> => unwrap(await apiClient.get('/admin/ai/usage', { params: { days } }));

export const fetchModerationQueue = async (): Promise<ModerationItem[]> =>
  unwrap<{ items: ModerationItem[] }>(await apiClient.get('/admin/moderation')).items;

export const fetchAuditLogs = async (page = 1): Promise<{ logs: AuditEntry[]; pagination: { page: number; limit: number; total: number } }> =>
  unwrap(await apiClient.get('/admin/audit-logs', { params: { page, limit: 25 } }));

/** Downloads an aggregated CSV (no personal data) through the authenticated API client. */
export async function downloadReport(report: 'daily' | 'courses', days = 30): Promise<void> {
  const response = await apiClient.get('/analytics/admin/export', { params: { report, days }, responseType: 'blob' });
  const url = URL.createObjectURL(response.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = report === 'daily' ? `daily-${days}d.csv` : 'courses.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
