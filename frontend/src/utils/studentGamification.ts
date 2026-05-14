import type { Course, Progress } from '../types';

const XP_COMPLETED_LESSON = 45;
const XP_IN_PROGRESS_LESSON = 12;
const XP_PER_LEVEL = 250;

export interface GamificationSummary {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  levelProgressPercent: number;
  completedLessons: number;
  inProgressLessons: number;
  lessonsThisWeek: number;
  badges: Array<{ id: string; label: string; emoji: string; unlocked: boolean }>;
}

function countLessonsCompletedThisWeek(progress: Progress[]): number {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return progress.filter(
    (p) =>
      p.status === 'completed' &&
      p.updatedAt &&
      new Date(p.updatedAt).getTime() >= weekAgo
  ).length;
}

export function summarizeGamification(allProgress: Progress[]): GamificationSummary {
  const completedLessons = allProgress.filter((p) => p.status === 'completed').length;
  const inProgressLessons = allProgress.filter((p) => p.status === 'in_progress').length;
  const xp = completedLessons * XP_COMPLETED_LESSON + inProgressLessons * XP_IN_PROGRESS_LESSON;
  const level = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
  const xpIntoLevel = xp % XP_PER_LEVEL;
  const xpForNextLevel = XP_PER_LEVEL;
  const levelProgressPercent = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));
  const lessonsThisWeek = countLessonsCompletedThisWeek(allProgress);

  const badges = [
    { id: 'first', label: 'First step', emoji: '🎯', unlocked: completedLessons >= 1 },
    { id: 'five', label: 'On a roll', emoji: '🔥', unlocked: completedLessons >= 5 },
    { id: 'twenty', label: 'Scholar', emoji: '🏆', unlocked: completedLessons >= 20 },
    { id: 'week', label: 'Weekly spark', emoji: '⚡', unlocked: lessonsThisWeek >= 3 },
  ];

  return {
    xp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    levelProgressPercent,
    completedLessons,
    inProgressLessons,
    lessonsThisWeek,
    badges,
  };
}

/** Estimated minutes invested in a course from completion ratio × published duration. */
export function estimateCourseTimeInvested(course: Course, courseProgress: Progress[]): number {
  const totalDur = course.totalDuration;
  const nLessons = course.totalLessons || 0;
  if (totalDur && nLessons > 0) {
    const done = courseProgress.filter((p) => p.status === 'completed').length;
    return Math.round((done / nLessons) * totalDur);
  }
  let sum = 0;
  for (const p of courseProgress) {
    if (p.status !== 'completed') continue;
    const lesson = p.lesson;
    if (typeof lesson === 'object' && lesson && 'duration' in lesson && lesson.duration) {
      sum += lesson.duration;
    }
  }
  return Math.round(sum);
}
