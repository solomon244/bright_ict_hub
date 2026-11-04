const XPEvent = require('../models/XPEvent');
const Achievement = require('../models/Achievement');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const { XP, XP_PER_LEVEL, TIMEZONE, TZ_OFFSET_MINUTES, BADGES } = require('../constants/gamification');

const DAY_MS = 24 * 60 * 60 * 1000;

/** 'YYYY-MM-DD' of an instant in Ethiopian local time. */
const dayKey = (date, offsetMinutes = TZ_OFFSET_MINUTES) =>
  new Date(new Date(date).getTime() + offsetMinutes * 60 * 1000).toISOString().slice(0, 10);

const dayNumber = (key) => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);

/**
 * Current streak counts consecutive learning days ending today, or yesterday (so the streak is not
 * lost before the student has had a chance to study today). Longest streak is over all history.
 */
function computeStreak(dayKeys, now = Date.now(), offsetMinutes = TZ_OFFSET_MINUTES) {
  const days = [...new Set(dayKeys)].map(dayNumber).sort((a, b) => a - b);
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const today = dayNumber(dayKey(now, offsetMinutes));
  const last = days[days.length - 1];
  if (last < today - 1) return { current: 0, longest };

  let current = 1;
  for (let i = days.length - 1; i > 0 && days[i] === days[i - 1] + 1; i -= 1) current += 1;
  return { current, longest };
}

function levelFromXp(xp) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;
  return { level, xpIntoLevel, xpForNextLevel: XP_PER_LEVEL, levelProgressPercent: Math.round((xpIntoLevel / XP_PER_LEVEL) * 100) };
}

/** Pure: which badge codes a learner has earned given their verified counts. */
function earnedBadgeCodes({ lessons = 0, quizPasses = 0, perfectQuizzes = 0, courses = 0, longestStreak = 0 }) {
  const codes = [];
  if (lessons >= 1) codes.push('first_lesson');
  if (lessons >= 5) codes.push('five_lessons');
  if (lessons >= 20) codes.push('twenty_lessons');
  if (longestStreak >= 3) codes.push('streak_3');
  if (longestStreak >= 7) codes.push('streak_7');
  if (quizPasses >= 1) codes.push('first_quiz_pass');
  if (perfectQuizzes >= 1) codes.push('perfect_quiz');
  if (courses >= 1) codes.push('course_complete');
  return codes;
}

/** Idempotent award. Returns { awarded, xp }. */
async function award({ userId, type, refId }) {
  const xp = XP[type];
  try {
    await XPEvent.create({ user: userId, type, refId, xp });
    return { awarded: true, xp };
  } catch (err) {
    if (err.code === 11000) return { awarded: false, xp: 0 };
    throw err;
  }
}

async function loadSummary(userId) {
  const [byType, dayRows] = await Promise.all([
    XPEvent.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$type', count: { $sum: 1 }, xp: { $sum: '$xp' } } },
    ]),
    XPEvent.aggregate([
      { $match: { user: userId } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TIMEZONE } } } },
    ]),
  ]);
  const count = (t) => byType.find((r) => r._id === t)?.count || 0;
  const xp = byType.reduce((sum, r) => sum + r.xp, 0);
  const streak = computeStreak(dayRows.map((r) => r._id));
  return {
    xp,
    streak,
    counts: { lessons: count('lesson_complete'), quizPasses: count('quiz_pass'), perfectQuizzes: count('quiz_perfect'), courses: count('course_complete') },
  };
}

/** Grants any newly earned badges and returns them. */
async function refreshBadges(userId, summary) {
  const s = summary || (await loadSummary(userId));
  const earned = earnedBadgeCodes({ ...s.counts, longestStreak: s.streak.longest });
  const have = new Set((await Achievement.find({ user: userId }).select('code').lean()).map((a) => a.code));
  const fresh = earned.filter((c) => !have.has(c));
  for (const code of fresh) {
    try {
      await Achievement.create({ user: userId, code });
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }
  return fresh.map((code) => BADGES.find((b) => b.code === code)).filter(Boolean);
}

/** Awards XP for a verified event, then badges. Never throws: gamification must not break learning. */
async function recordEvent({ userId, type, refId }) {
  try {
    const result = await award({ userId, type, refId });
    const newBadges = result.awarded ? await refreshBadges(userId) : [];
    return { xpAwarded: result.xp, newBadges };
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error('Gamification error:', err.message);
    return { xpAwarded: 0, newBadges: [] };
  }
}

async function getStats(userId) {
  const summary = await loadSummary(userId);
  await refreshBadges(userId, summary); // heals badge state if rules changed
  const owned = new Map((await Achievement.find({ user: userId }).lean()).map((a) => [a.code, a.awardedAt]));
  const weekStart = new Date(Date.now() - 7 * DAY_MS);
  const weekly = await XPEvent.aggregate([
    { $match: { user: userId, createdAt: { $gte: weekStart } } },
    { $group: { _id: null, xp: { $sum: '$xp' } } },
  ]);
  const user = await User.findById(userId).select('leaderboardOptIn').lean();
  return new ApiResponse(200, 'Gamification stats', {
    xp: summary.xp,
    weeklyXp: weekly[0]?.xp || 0,
    ...levelFromXp(summary.xp),
    streak: summary.streak,
    completedLessons: summary.counts.lessons,
    badges: BADGES.map((b) => ({ ...b, unlocked: owned.has(b.code), awardedAt: owned.get(b.code) || null })),
    leaderboardOptIn: Boolean(user?.leaderboardOptIn),
  });
}

/** "Selam Kebede" -> "Selam K." : never expose full names on a public board. */
const publicName = (u) => `${u.firstName || 'Student'} ${u.lastName ? `${u.lastName[0]}.` : ''}`.trim();

async function leaderboard(userId, limit = 10) {
  const weekStart = new Date(Date.now() - 7 * DAY_MS);
  const rows = await XPEvent.aggregate([
    { $match: { createdAt: { $gte: weekStart } } },
    { $group: { _id: '$user', xp: { $sum: '$xp' } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    { $match: { 'u.leaderboardOptIn': true, 'u.role': 'student' } },
    { $sort: { xp: -1 } },
    { $limit: Math.min(Math.max(Number(limit) || 10, 1), 25) },
    { $project: { xp: 1, 'u.firstName': 1, 'u.lastName': 1 } },
  ]);
  return new ApiResponse(200, 'Weekly leaderboard', {
    period: 'last_7_days',
    entries: rows.map((r, i) => ({ rank: i + 1, name: publicName(r.u), xp: r.xp, isMe: String(r._id) === String(userId) })),
  });
}

async function setLeaderboardOptIn(userId, optIn) {
  await User.updateOne({ _id: userId }, { $set: { leaderboardOptIn: Boolean(optIn) } });
  return new ApiResponse(200, optIn ? 'You now appear on the weekly leaderboard' : 'You are hidden from the leaderboard', {
    leaderboardOptIn: Boolean(optIn),
  });
}

module.exports = {
  dayKey,
  computeStreak,
  levelFromXp,
  earnedBadgeCodes,
  award,
  recordEvent,
  getStats,
  leaderboard,
  setLeaderboardOptIn,
  publicName,
};
