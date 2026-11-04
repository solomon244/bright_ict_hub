const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const ApiResponse = require('../utils/apiResponse');
const ai = require('./ai');

// The coach card is shown on every dashboard visit. Without a cache each visit would spend one of the
// student's daily AI requests (shared with the tutor), so a generated card is reused for a few hours.
const COACH_TTL_MS = Number(process.env.COACH_CACHE_TTL_MS) || 6 * 60 * 60 * 1000;
const COACH_CACHE_MAX = 5000;
const coachCache = new Map(); // studentId -> { at, text }

const readCoachCache = (studentId) => {
  const hit = coachCache.get(String(studentId));
  if (!hit) return null;
  if (Date.now() - hit.at > COACH_TTL_MS) {
    coachCache.delete(String(studentId));
    return null;
  }
  return hit;
};

const writeCoachCache = (studentId, text) => {
  if (coachCache.size >= COACH_CACHE_MAX) coachCache.delete(coachCache.keys().next().value); // oldest first
  coachCache.set(String(studentId), { at: Date.now(), text });
};

const clearCoachCache = () => coachCache.clear();

/**
 * Build a compact, non-PII snapshot for the LLM (titles + counts only).
 */
async function buildLearningSnapshot(studentId) {
  const enrollments = await Enrollment.find({ student: studentId, status: 'active' })
    .populate('course', 'title totalLessons totalDuration level')
    .sort('-lastAccessedAt')
    .lean();

  const courseIds = enrollments.map((e) => e.course && e.course._id).filter(Boolean);
  const allProgress =
    courseIds.length > 0
      ? await Progress.find({ student: studentId, course: { $in: courseIds } }).lean()
      : [];

  const byCourse = {};
  for (const p of allProgress) {
    const cid = String(p.course);
    if (!byCourse[cid]) byCourse[cid] = [];
    byCourse[cid].push(p);
  }

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let lessonsCompletedThisWeek = 0;
  for (const p of allProgress) {
    if (p.status === 'completed' && p.updatedAt && new Date(p.updatedAt).getTime() >= weekAgo) {
      lessonsCompletedThisWeek += 1;
    }
  }

  const courses = enrollments
    .map((e) => {
      const c = e.course;
      if (!c || !c._id) return null;
      const cid = String(c._id);
      const rows = byCourse[cid] || [];
      const completed = rows.filter((r) => r.status === 'completed').length;
      const inProgress = rows.filter((r) => r.status === 'in_progress').length;
      const denom = rows.length || c.totalLessons || 0;
      const completionPct = denom > 0 ? Math.round((completed / denom) * 100) : 0;

      return {
        title: c.title,
        level: c.level,
        completionPct,
        lessonsCompleted: completed,
        lessonsTracked: rows.length,
        catalogLessonCount: c.totalLessons || null,
        inProgressLessons: inProgress,
        lastAccessedAt: e.lastAccessedAt || e.updatedAt || null,
      };
    })
    .filter(Boolean);

  return {
    enrolledCourseCount: courses.length,
    lessonsCompletedThisWeek,
    courses,
  };
}

/**
 * Same shape as the LLM coach card: greeting + 3 bullets, Amharic, no PII.
 * Used when Gemini is off, errors, or returns empty text — avoids 502 to the client.
 * @param {{ lessonsCompletedThisWeek?: number, courses?: Array<Record<string, unknown>> }} snapshot
 */
function buildStaticCoachInsights(snapshot) {
  const week = snapshot.lessonsCompletedThisWeek || 0;
  const list = snapshot.courses || [];

  if (!list.length) {
    return [
      'ሰላም! ዛሬ በ Ethio Tech Hub ላይ ጉዞዎን ለመጀመር ጥሩ ቀን ነው።',
      '• ከካታሎግ ኮርስ ይምረጡ እና enrollment ያድርጉ — ከአንድ ትምህርት በኋላ እንበረታለሁ።',
      '• ኮድ እና ድር ቃላትን በ English እንዲሁም ትርጉምን በአማርኛ ይማሩ።',
      '• በየቀኑ 20–30 ደቂቃ ብቻ ቢሆንም ተመሳሳይ ሰዓት መያዝ እድገትን ያፋጥናል።',
    ].join('\n');
  }

  const sorted = [...list].sort((a, b) => {
    if (a.completionPct !== b.completionPct) return a.completionPct - b.completionPct;
    return a.lessonsCompleted - b.lessonsCompleted;
  });
  const focus = sorted[0];
  const title = focus.title || 'ኮርስ';
  const pct = focus.completionPct ?? 0;

  let encouragement;
  if (week >= 3) {
    encouragement = `• በ7 ቀናት ውስጥ ${week} ትምህርቶችን ጨርሰዋል — እንዲህ ቀጥለው!`;
  } else if (week >= 1) {
    encouragement = '• መልካም! በዚህ ሳምንት ቢያንስ አንድ ትምህርት ጨርሰዋል — ትንሽ ትንሽ ይጨምሩ።';
  } else {
    encouragement = '• ዛሬ አንድ ትምህርት መጀመር ብቻ በቂ ነው — ፍፁም መጨረሻ አይጠብቁ።';
  }

  const nextStep =
    pct < 100
      ? `• ቀጣዩ እርምጃ፦ «${title}» ላይ ${pct}% ነው — ቀጣዩን lesson ይክፈቱ ወይም ይቀጥሉ።`
      : `• «${title}» ላይ በጥሩ ሁኔታ እየጨረሱ ነው — ሌላ ኮርስ ለማጠናከር ይሞክሩ።`;

  const pacing =
    '• በየቀኑ ተመሳሳይ ሰዓት መማር (የ20 ደቂቃ rule) ከስህተት በኋላ መመለስን ቀላል ያደርገዋል።';

  return ['ሰላም! ዛሬም በ Ethio Tech Hub ላይ እንቀጥል።', encouragement, nextStep, pacing].join('\n');
}

exports.getDashboardInsights = async (studentId) => {
  const cached = readCoachCache(studentId);
  if (cached) {
    return new ApiResponse(200, 'OK', {
      generatedAt: new Date(cached.at).toISOString(),
      insights: cached.text,
      fallback: false,
      source: 'ai',
      cached: true,
    });
  }

  let snapshot;
  try {
    snapshot = await buildLearningSnapshot(studentId);
  } catch (err) {
    return new ApiResponse(500, err.message || 'Snapshot failed', {
      insights: null,
      fallback: true,
      source: 'none',
      generatedAt: new Date().toISOString(),
    });
  }

  const staticInsights = buildStaticCoachInsights(snapshot);
  const payloadBase = {
    generatedAt: new Date().toISOString(),
  };

  if (!ai.isConfigured()) {
    return new ApiResponse(200, 'OK', {
      ...payloadBase,
      insights: staticInsights,
      fallback: true,
      source: 'static',
    });
  }

  const prompt = `You are ሰለሞን (Solomon), a warm AI learning coach on Ethio Tech Hub — an Ethiopian platform for grades 9–12 (programming, web, digital skills).

Student snapshot (JSON only, no names):
${JSON.stringify(snapshot)}

Rules:
- Write ONLY in simple Amharic. Keep code/tech words in English when needed (e.g. Python, HTML).
- Max ~100 words.
- Structure exactly:
  Line 1: short greeting (one sentence).
  Then 3 lines, each starting with "• " — (1) encouragement, (2) one concrete next step (pick the course with lowest completion or suggest browsing courses if none), (3) tip on consistency or pacing.
- No exam answers. No personal data requests.`;

  let text;
  try {
    ({ text } = await ai.generateText({
      feature: 'dashboard_coach',
      userId: studentId,
      prompt,
      temperature: 0.55,
      maxTokens: 400,
    }));
  } catch {
    return new ApiResponse(200, 'OK', {
      ...payloadBase,
      insights: staticInsights,
      fallback: true,
      source: 'static',
    });
  }

  if (!text) {
    return new ApiResponse(200, 'OK', {
      ...payloadBase,
      insights: staticInsights,
      fallback: true,
      source: 'static',
    });
  }

  writeCoachCache(studentId, text);
  return new ApiResponse(200, 'OK', {
    ...payloadBase,
    insights: text,
    fallback: false,
    source: 'ai',
    cached: false,
  });
};

exports.clearCoachCache = clearCoachCache;
