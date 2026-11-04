import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import ProgressBar from '../../components/common/ProgressBar';
import { fetchInstructorAnalytics, type InstructorAnalytics } from '../../services/analyticsService';
import { apiErrorMessage } from '../../services/tutorService';

/** Real learner analytics for the instructor's own courses (replaces the earlier hard-coded placeholders). */
const InstructorOverviewPage = () => {
  const [data, setData] = useState<InstructorAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInstructorAnalytics().then(setData).catch((err) => setError(apiErrorMessage(err)));
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-stone-200/80" />;

  const s = data.summary;
  const cards = [
    { label: 'Courses', value: s.courses },
    { label: 'Learners', value: s.learners },
    { label: 'Active this week', value: s.activeLearners7d },
    { label: 'Completion rate', value: `${s.completionRate}%` },
    { label: 'At risk (14d idle)', value: s.atRiskLearners },
    { label: 'Unanswered questions', value: s.unansweredQuestions },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="space-y-1 text-center">
            <p className="text-xs font-semibold uppercase text-primary">{c.label}</p>
            <p className="text-3xl font-display">{c.value}</p>
          </Card>
        ))}
      </div>

      {s.courses === 0 ? (
        <Card className="space-y-2">
          <p className="text-sm text-stone-600">You have no courses yet, so there is nothing to measure.</p>
          <Link to="/instructor/courses/new" className="text-sm font-semibold text-primary">Create your first course →</Link>
        </Card>
      ) : (
        <>
          <Card className="space-y-4">
            <h2 className="font-display text-lg font-semibold text-stone-900">Course progress</h2>
            {data.courses.map((c) => (
              <div key={c.courseId} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-stone-800">{c.title}</span>
                  <span className="text-stone-500">{c.enrollments} enrolled · {c.completed} completed</span>
                </div>
                <ProgressBar label="Average progress" value={c.avgProgress} />
              </div>
            ))}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-stone-900">Quizzes students find hardest</h2>
              {data.weakestQuizzes.length === 0 ? (
                <p className="text-sm text-stone-500">Shown once a quiz has at least 3 attempts.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.weakestQuizzes.map((q) => (
                    <li key={q.quizId} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{q.title} <span className="text-xs text-stone-400">({q.courseTitle})</span></span>
                      <span className="shrink-0 font-semibold text-stone-700">{q.avgScorePercent}% · {q.attempts} tries</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-stone-900">Questions waiting for an answer</h2>
              {data.unanswered.length === 0 ? (
                <p className="text-sm text-stone-500">Nothing unanswered. 🎉</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.unanswered.map((u) => (
                    <li key={u._id}>
                      <Link to={`/community/${u._id}`} className="font-semibold text-primary">{u.title}</Link>
                      <span className="block text-xs text-stone-400">{u.courseTitle} · {new Date(u.createdAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default InstructorOverviewPage;
