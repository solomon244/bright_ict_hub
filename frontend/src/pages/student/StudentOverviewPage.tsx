import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';
import StatCard from '../../components/common/StatCard';
import RingProgress from '../../components/student/RingProgress';
import { fetchDashboardAiInsights } from '../../services/dashboardAiService';
import { fetchMyEnrollments } from '../../services/enrollmentService';
import { fetchCourseProgress } from '../../services/progressService';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { formatMinutesRounded } from '../../utils/formatDuration';
import { estimateCourseTimeInvested, summarizeGamification } from '../../utils/studentGamification';
import type { Course, Enrollment, Progress, DashboardStat } from '../../types';

function formatRelativeUpdated(iso?: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 48) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 14) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

function parseCoachInsights(text: string): { greeting: string; bullets: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { greeting: text, bullets: [] };
  const bullets = lines.filter((l) => l.startsWith('•')).map((l) => l.replace(/^•\s*/, ''));
  const greetingLines = lines.filter((l) => !l.startsWith('•'));
  const greeting = greetingLines.join(' ') || lines[0];
  return { greeting, bullets };
}

function courseIdFromEnrollment(enrollment: Enrollment): string | null {
  const c = enrollment.course;
  if (typeof c === 'object' && c) {
    return c._id || c.id || null;
  }
  return typeof c === 'string' ? c : null;
}

function continueLessonPath(courseId: string, progresses: Progress[]): string {
  const inProgress = progresses.find((p) => p.status === 'in_progress');
  const fallback = progresses.find((p) => p.status !== 'not_started');
  const pick = inProgress || fallback;
  const lesson = pick?.lesson;
  const lessonId =
    typeof lesson === 'object' && lesson ? lesson._id || lesson.id : typeof lesson === 'string' ? lesson : null;
  if (lessonId) {
    return `/courses/${courseId}/lessons/${lessonId}`;
  }
  return `/courses/${courseId}`;
}

const StudentOverviewPage = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, Progress[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiFallback, setAiFallback] = useState(false);
  const [aiSource, setAiSource] = useState<'gemini' | 'static' | 'none' | null>(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);

  const loadAiInsights = useCallback(async () => {
    setAiLoading(true);
    try {
      const d = await fetchDashboardAiInsights();
      setAiText(d.insights);
      setAiFallback(Boolean(d.fallback));
      setAiSource(d.source ?? null);
      setAiGeneratedAt(d.generatedAt ?? null);
    } catch {
      setAiText(null);
      setAiFallback(true);
      setAiSource('none');
      setAiGeneratedAt(null);
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAiInsights();
  }, [loadAiInsights]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const enrollmentsData = await fetchMyEnrollments();
        setEnrollments(enrollmentsData);

        const progressPromises = enrollmentsData.map((enrollment) => {
          const courseId = courseIdFromEnrollment(enrollment);
          if (!courseId) return Promise.resolve({ courseId: '', progress: [] as Progress[] });
          return fetchCourseProgress(courseId).then((progress) => ({ courseId, progress }));
        });
        const progressResults = await Promise.all(progressPromises);
        const progressMapData: Record<string, Progress[]> = {};
        progressResults.forEach(({ courseId, progress }) => {
          if (courseId) {
            progressMapData[courseId] = progress;
          }
        });
        setProgressMap(progressMapData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const calculateProgressPercent = (courseId: string): number => {
    const progress = progressMap[courseId] || [];
    if (progress.length === 0) return 0;
    const completed = progress.filter((p) => p.status === 'completed').length;
    return Math.round((completed / progress.length) * 100);
  };

  const allProgressFlat = useMemo(() => Object.values(progressMap).flat(), [progressMap]);
  const game = useMemo(() => summarizeGamification(allProgressFlat), [allProgressFlat]);

  const sortedForContinue = useMemo(() => {
    return [...enrollments].sort((a, b) => {
      const ta = new Date(a.lastAccessedAt || a.updatedAt || 0).getTime();
      const tb = new Date(b.lastAccessedAt || b.updatedAt || 0).getTime();
      return tb - ta;
    });
  }, [enrollments]);
  const continueCourses = sortedForContinue.slice(0, 4);

  const completedLessonCount = allProgressFlat.filter((p) => p.status === 'completed').length;
  const inProgressLessonCount = allProgressFlat.filter((p) => p.status === 'in_progress').length;
  const stats: DashboardStat[] = [
    {
      id: '1',
      label: 'Enrolled courses',
      value: enrollments.length,
      trend: 'neutral',
      helper: 'Active enrollments',
    },
    {
      id: '2',
      label: 'Points',
      value: game.xp,
      trend: 'up',
      helper: 'XP on your Hub',
    },
    {
      id: '3',
      label: 'Completed lessons',
      value: completedLessonCount,
      trend: completedLessonCount > 0 ? 'up' : 'neutral',
      helper:
        inProgressLessonCount > 0
          ? `${inProgressLessonCount} in progress · across your courses`
          : 'Across all courses',
    },
  ];

  const coachParts = useMemo(() => (aiText ? parseCoachInsights(aiText) : null), [aiText]);
  const coachUpdatedLabel = formatRelativeUpdated(aiGeneratedAt);

  if (error) {
    return (
      <Card className="border-warning/30 bg-amber-50/80 text-stone-800">
        <p className="font-semibold">Something went wrong</p>
        <p className="mt-1 text-sm text-stone-600">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap gap-2" aria-label="Student shortcuts">
        {[
          { to: '/student/courses', label: 'My courses' },
          { to: '/student/progress', label: 'Progress' },
          { to: '/student/quizzes', label: 'Quizzes' },
          { to: '/student/tutor', label: 'Solomon · AI' },
          { to: '/courses', label: 'Browse catalog' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="inline-flex items-center rounded-full border border-stone-200/90 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-stone-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Card className="relative overflow-hidden border-secondary/20 bg-gradient-to-br from-sky-50/80 via-white to-violet-50/60 p-5 md:p-6">
        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-secondary/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-xl" aria-hidden>
              ✨
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">AI coach · ሰለሞን</p>
              <h2 className="mt-1 font-display text-lg font-semibold text-stone-900 md:text-xl">Today&apos;s personalized tip</h2>
              <p className="mt-1 text-xs text-stone-500">
                Uses your enrollments and lesson progress. Gemini enriches wording when configured.
              </p>
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" className="shrink-0 self-start" onClick={() => void loadAiInsights()} disabled={aiLoading}>
            {aiLoading ? '…' : 'Refresh'}
          </Button>
        </div>
        <div className="relative mt-4 rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur-sm">
          {aiLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 w-3/4 max-w-md rounded bg-stone-200" />
              <div className="h-4 w-full rounded bg-stone-200" />
              <div className="h-4 w-5/6 rounded bg-stone-200" />
            </div>
          ) : aiText ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
                <div className="flex flex-wrap items-center gap-2">
                  {aiSource === 'gemini' ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-900">AI-generated</span>
                  ) : aiSource === 'static' ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-950">Progress-based</span>
                  ) : null}
                  {coachUpdatedLabel ? (
                    <span className="text-stone-400">Updated {coachUpdatedLabel}</span>
                  ) : null}
                </div>
              </div>
              {coachParts && coachParts.bullets.length > 0 ? (
                <div lang="am" className="space-y-3 text-sm leading-relaxed text-stone-800">
                  <p className="font-medium text-stone-900">{coachParts.greeting}</p>
                  <ul className="list-none space-y-2 border-t border-stone-100/80 pt-3">
                    {coachParts.bullets.map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-0.5 shrink-0 font-bold text-primary" aria-hidden>
                          •
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p lang="am" className="whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
                  {aiText}
                </p>
              )}
              {aiSource === 'static' && aiFallback ? (
                <p className="text-xs text-stone-500">
                  Tip is built from your snapshot without the live model. Add <code className="font-mono text-stone-700">GEMINI_API_KEY</code>{' '}
                  for richer AI phrasing when available.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/70 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Coach tip unavailable</p>
                <p lang="am" className="mt-2 text-stone-800">
                  አሁን ምክር ማምጣት አልተቻለም። <span className="font-semibold">Refresh</span> ይጫኑ ወይም ትንሽ ቆይተው እንደገና ይሞክሩ።
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-stone-700">
                  <li lang="am">የኢንተርኔት ግንኙነትዎን እና የ API አድራሻውን ያረጋግጡ።</li>
                  <li lang="am">
                    ለ AI የበለጠ ቋንቋ፦ በባክኤንድ <code className="font-mono text-xs">GEMINI_API_KEY</code> እና CORS ላይ{' '}
                    <code className="font-mono text-xs">CLIENT_URL</code> ያረጋግጡ።
                  </li>
                  {aiSource === 'none' ? (
                    <li className="text-xs text-stone-500">
                      Operators: check server logs for snapshot/DB errors on{' '}
                      <code className="font-mono text-stone-700">GET /dashboard/ai-insights</code>.
                    </li>
                  ) : null}
                </ul>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link to="/student/tutor">Open Solomon tutor</Link>
              </Button>
            </div>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-stone-200/80" />
            ))}
          </div>
          <div className="h-48 rounded-3xl bg-stone-200/80" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-stone-200/80" />
            ))}
          </div>
        </div>
      ) : (
        <>
      {/* Gamification hero */}
      <Card className="relative overflow-hidden border-primary/10 bg-gradient-to-br from-white via-violet-50/40 to-cyan-50/30 p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <RingProgress
              value={game.levelProgressPercent}
              size={132}
              stroke={11}
              label={`${game.level}`}
              sublabel="Level"
            />
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Your learning streak</p>
              <h2 className="font-display text-2xl font-semibold text-stone-900 md:text-3xl">
                {game.xp} <span className="text-lg font-medium text-stone-500">XP</span>
              </h2>
              <p className="text-sm text-stone-600">
                <span className="font-semibold text-stone-800">{game.xpForNextLevel - game.xpIntoLevel} XP</span> to
                reach level {game.level + 1}.{' '}
                <span className="text-stone-500">
                  {game.lessonsThisWeek} lesson{game.lessonsThisWeek === 1 ? '' : 's'} completed in the last 7 days.
                </span>
              </p>
              <ProgressBar
                label="Next level"
                value={(game.xpIntoLevel / game.xpForNextLevel) * 100}
                size="sm"
                className="max-w-md"
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 lg:max-w-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Badges</p>
            <div className="flex flex-wrap gap-2">
              {game.badges.map((b) => (
                <span
                  key={b.id}
                  title={b.label}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-opacity ${
                    b.unlocked
                      ? 'border-primary/25 bg-white/90 text-stone-800 shadow-sm'
                      : 'border-stone-100 bg-stone-100/60 text-stone-400 opacity-60'
                  }`}
                >
                  <span aria-hidden>{b.emoji}</span>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <section className="rounded-2xl border border-stone-100 bg-stone-50/60 p-4 sm:p-5" aria-labelledby="student-dash-glance">
        <h2 id="student-dash-glance" className="mb-3 text-xs font-bold uppercase tracking-widest text-stone-400">
          At a glance
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, idx) => (
            <StatCard
              key={stat.id}
              stat={stat}
              icon={idx === 0 ? '📚' : idx === 1 ? '⭐' : '✅'}
            />
          ))}
        </div>
      </section>

      <Card className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Continue learning</p>
            <h3 className="font-display text-xl font-semibold text-stone-900 md:text-2xl">Pick up where you left off</h3>
            <p className="mt-1 text-sm text-stone-500">Courses sorted by recent activity — finish the next lesson for bonus XP.</p>
          </div>
          <Button variant="secondary" asChild>
            <Link to="/student/courses">All courses</Link>
          </Button>
        </div>

        {enrollments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 py-12 text-center">
            <p className="text-stone-600">You haven&apos;t enrolled yet.</p>
            <Button asChild className="mt-4">
              <Link to="/courses">Browse catalog</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {continueCourses.map((enrollment) => {
              const course = typeof enrollment.course === 'object' ? enrollment.course : null;
              if (!course) return null;
              const courseId = course._id || course.id;
              if (!courseId) return null;
              const progresses = progressMap[courseId] || [];
              const pct = calculateProgressPercent(courseId);
              const totalLessons = course.totalLessons || progresses.length || 0;
              const done = progresses.filter((p) => p.status === 'completed').length;
              const invested = estimateCourseTimeInvested(course as Course, progresses);
              const totalDur = course.totalDuration;
              const thumb = resolveMediaUrl(course.thumbnailUrl);
              const href = continueLessonPath(courseId, progresses);

              return (
                <div
                  key={enrollment._id || enrollment.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-stone-100 bg-white/90 shadow-sm transition-all hover:border-primary/20 hover:shadow-card"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/15 to-accent/10">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full items-center justify-center font-display text-3xl font-bold text-primary/30">
                        {(course.title || 'Course').slice(0, 1)}
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                      {pct}% completed
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <p className="font-display font-semibold text-stone-900 line-clamp-2">{course.title}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {done}/{totalLessons || '?'} lessons ·{' '}
                        <span className="font-medium text-stone-600">{formatMinutesRounded(invested)}</span>
                        {totalDur ? (
                          <>
                            {' '}
                            / {formatMinutesRounded(totalDur)} total
                          </>
                        ) : null}
                      </p>
                    </div>
                    <ProgressBar value={pct} label="Course progress" size="sm" />
                    <Button asChild variant="ghost" className="mt-auto w-full justify-center gap-1 px-0 text-primary hover:bg-transparent hover:text-primary/90 sm:w-auto sm:justify-start">
                      <Link to={href} className="inline-flex items-center gap-1 font-semibold">
                        Continue learning
                        <span aria-hidden className="text-base font-normal">
                          ›
                        </span>
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

        </>
      )}
    </div>
  );
};

export default StudentOverviewPage;
