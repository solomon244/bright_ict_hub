import { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import MiniBars from '../../components/common/MiniBars';
import {
  downloadReport,
  fetchAdminAnalytics,
  fetchAiUsage,
  type AdminAnalytics,
  type AiUsage,
} from '../../services/analyticsService';
import { apiErrorMessage } from '../../services/tutorService';

const AdminAnalyticsPage = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [ai, setAi] = useState<AiUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetchAdminAnalytics(days).then(setData).catch((err) => setError(apiErrorMessage(err)));
    fetchAiUsage(days).then(setAi).catch(() => setAi(null));
  }, [days]);

  const exportCsv = async (report: 'daily' | 'courses') => {
    setExporting(report);
    try {
      await downloadReport(report, days);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  if (error && !data) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-stone-200/80" />;

  const t = data.totals;
  const cards = [
    { label: 'Students', value: t.students },
    { label: 'Instructors', value: t.instructors, helper: t.pendingInstructors ? `${t.pendingInstructors} pending approval` : undefined },
    { label: 'Courses', value: t.courses },
    { label: 'Enrolments', value: t.enrollments },
    { label: 'Course completion', value: `${t.completionRate}%`, helper: `${t.completedEnrollments} completed` },
    { label: 'Active learners (7d)', value: t.activeLearners7d },
  ];
  const dates = data.daily.map((d) => d.date);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Period">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${days === d ? 'bg-primary text-white' : 'bg-white text-stone-600 shadow-sm hover:bg-stone-50'}`}
            >
              {d} days
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={exporting !== null} onClick={() => void exportCsv('daily')}>
            {exporting === 'daily' ? 'Preparing…' : '⬇ Daily CSV'}
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={exporting !== null} onClick={() => void exportCsv('courses')}>
            {exporting === 'courses' ? 'Preparing…' : '⬇ Courses CSV'}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="space-y-1">
            <p className="text-xs font-semibold uppercase text-primary">{c.label}</p>
            <p className="text-3xl font-display">{c.value}</p>
            {c.helper && <p className="text-xs text-stone-400">{c.helper}</p>}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-stone-900">Retention (14 days)</h2>
          <p className="text-3xl font-display">{data.retention14d.rate}%</p>
          <p className="text-xs text-stone-500">
            {data.retention14d.retained} of {data.retention14d.cohortSize} students who enrolled at least 14 days ago learned something in the last 14 days.
          </p>
        </Card>
        <Card className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-stone-900">Last {data.windowDays} days</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-stone-700">
            <li>New users: <b>{data.window.newUsers}</b></li>
            <li>New enrolments: <b>{data.window.newEnrollments}</b></li>
            <li>Lessons completed: <b>{data.window.lessonsCompleted}</b></li>
            <li>Quiz attempts: <b>{data.window.quizAttempts}</b></li>
            <li>Avg quiz score: <b>{data.window.avgQuizScorePercent}%</b></li>
            <li>AI requests: <b>{data.window.aiRequests}</b></li>
          </ul>
        </Card>
      </div>

      <Card className="grid gap-6 md:grid-cols-3">
        <MiniBars label="New users" dates={dates} values={data.daily.map((d) => d.new_users)} />
        <MiniBars label="New enrolments" dates={dates} values={data.daily.map((d) => d.new_enrollments)} />
        <MiniBars label="Lessons completed" dates={dates} values={data.daily.map((d) => d.lessons_completed)} />
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-stone-900">Top courses</h2>
        {data.topCourses.length === 0 ? (
          <p className="text-sm text-stone-500">No enrolments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-stone-400">
                <tr><th className="py-1 pr-4">Course</th><th className="pr-4">Enrolled</th><th className="pr-4">Completed</th><th>Rate</th></tr>
              </thead>
              <tbody>
                {data.topCourses.map((c) => (
                  <tr key={c.courseId} className="border-t border-stone-100">
                    <td className="py-2 pr-4 font-semibold text-stone-800">{c.title}</td>
                    <td className="pr-4">{c.enrollments}</td>
                    <td className="pr-4">{c.completed}</td>
                    <td>{c.completionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {ai && (
        <Card className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-stone-900">AI usage</h2>
          <p className="text-sm text-stone-600">
            Provider <b>{ai.provider.name}</b> {ai.provider.configured ? '(configured)' : '(not configured)'} · limit {ai.provider.dailyLimitPerUser} requests per student per day
          </p>
          <p className="text-sm text-stone-700">
            {ai.totals.requests} requests · {ai.totals.errors} errors · {ai.totals.activeUsers} users · avg {ai.totals.avgLatencyMs} ms ·{' '}
            {(ai.totals.inputTokens + ai.totals.outputTokens).toLocaleString()} tokens
            {ai.totals.estimatedCostUsd > 0 ? ` · ≈ $${ai.totals.estimatedCostUsd.toFixed(2)}` : ''}
          </p>
          <p className="text-xs text-stone-500">
            Answer feedback: 👍 {ai.feedback.filter((f) => f.rating === 'up').reduce((a, f) => a + f.count, 0)} · 👎{' '}
            {ai.feedback.filter((f) => f.rating === 'down').reduce((a, f) => a + f.count, 0)}
          </p>
        </Card>
      )}

      <p className="text-xs text-stone-400">
        Not collected yet: {data.notCollected.join(', ')}. Reports contain aggregated numbers only — no personal data.
      </p>
    </div>
  );
};

export default AdminAnalyticsPage;
