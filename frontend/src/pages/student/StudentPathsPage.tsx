import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import ProgressBar from '../../components/common/ProgressBar';
import {
  fetchLearningPath,
  fetchLearningPaths,
  type LearningPathSummary,
  type PathProgress,
} from '../../services/learningPathService';
import { apiErrorMessage } from '../../services/tutorService';

const STATUS_LABEL = { not_enrolled: 'Not started', in_progress: 'In progress', completed: 'Completed ✓' } as const;

const StudentPathsPage = () => {
  const [paths, setPaths] = useState<LearningPathSummary[] | null>(null);
  const [selected, setSelected] = useState<{ path: LearningPathSummary; progress: PathProgress } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLearningPaths()
      .then(setPaths)
      .catch((err) => {
        setError(apiErrorMessage(err));
        setPaths([]);
      });
  }, []);

  const open = async (id: string) => {
    try {
      setError(null);
      setSelected(await fetchLearningPath(id));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (selected) {
    const { path, progress } = selected;
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <button type="button" onClick={() => setSelected(null)} className="text-sm font-semibold text-primary">
          ← All paths
        </button>
        <Card className="space-y-3">
          <h2 className="font-display text-2xl font-semibold text-stone-900">{path.title}</h2>
          {path.titleAm && <p className="text-sm text-stone-400" lang="am">{path.titleAm}</p>}
          {path.description && <p className="text-sm text-stone-600">{path.description}</p>}
          {path.skills.length > 0 && (
            <p className="text-xs text-stone-500">Skills: {path.skills.join(' · ')}</p>
          )}
          <ProgressBar
            label={`${progress.completedCourses} of ${progress.totalCourses} courses completed`}
            value={progress.percent}
          />
        </Card>
        <ol className="space-y-3">
          {progress.courses.map((c) => {
            const isNext = c.course._id === progress.nextCourseId;
            return (
              <li key={c.course._id}>
                <Link to={`/courses/${c.course._id}`}>
                  <div
                    className={`flex items-center gap-4 rounded-xl border p-4 transition-colors hover:border-primary/40 ${
                      isNext ? 'border-primary/40 bg-primary/5' : 'border-stone-100 bg-white'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-sm font-bold text-stone-600">
                      {c.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-stone-900">{c.course.title}</p>
                      <p className="text-xs text-stone-500">
                        {STATUS_LABEL[c.status]}
                        {c.status === 'in_progress' ? ` · ${c.progressPercentage}%` : ''}
                        {isNext ? ' · Up next' : ''}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      {paths === null ? (
        <div className="h-28 animate-pulse rounded-2xl bg-stone-200/80" />
      ) : paths.length === 0 ? (
        <Card>
          <p className="text-sm text-stone-600">No learning paths are published yet. Check back soon!</p>
        </Card>
      ) : (
        paths.map((p) => (
          <button key={p._id} type="button" onClick={() => void open(p._id)} className="block w-full text-left">
            <Card className="transition-shadow hover:shadow-card">
              <h2 className="font-display text-lg font-semibold text-stone-900">{p.title}</h2>
              {p.titleAm && <p className="text-xs text-stone-400" lang="am">{p.titleAm}</p>}
              {p.description && <p className="mt-1 text-sm text-stone-600">{p.description}</p>}
              <p className="mt-2 text-xs text-stone-500">
                {p.level} · {p.totalCourses} course{p.totalCourses === 1 ? '' : 's'}
              </p>
            </Card>
          </button>
        ))
      )}
    </div>
  );
};

export default StudentPathsPage;
