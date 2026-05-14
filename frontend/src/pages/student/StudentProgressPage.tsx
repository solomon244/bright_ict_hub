import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import ProgressBar from '../../components/common/ProgressBar';
import RingProgress from '../../components/student/RingProgress';
import Button from '../../components/common/Button';
import { fetchMyEnrollments } from '../../services/enrollmentService';
import { fetchCourseProgress } from '../../services/progressService';
import { formatMinutesRounded } from '../../utils/formatDuration';
import { estimateCourseTimeInvested, summarizeGamification } from '../../utils/studentGamification';
import type { Course, Enrollment, Progress } from '../../types';

function courseIdFromEnrollment(enrollment: Enrollment): string | null {
  const c = enrollment.course;
  if (typeof c === 'object' && c) {
    return c._id || c.id || null;
  }
  return typeof c === 'string' ? c : null;
}

const StudentProgressPage = () => {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, Progress[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        setError(err instanceof Error ? err.message : 'Failed to load progress');
        console.error('Failed to load progress:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const calculateProgress = (courseId: string): number => {
    const progress = progressMap[courseId] || [];
    if (progress.length === 0) return 0;
    const completed = progress.filter((p) => p.status === 'completed').length;
    return Math.round((completed / progress.length) * 100);
  };

  const allProgressFlat = useMemo(() => Object.values(progressMap).flat(), [progressMap]);
  const game = useMemo(() => summarizeGamification(allProgressFlat), [allProgressFlat]);

  const averageProgress =
    enrollments.length > 0
      ? enrollments.reduce((sum, enrollment) => {
          const courseId = courseIdFromEnrollment(enrollment);
          if (!courseId) return sum;
          return sum + calculateProgress(courseId);
        }, 0) / enrollments.length
      : 0;

  const totalEstimatedMinutes = useMemo(() => {
    return enrollments.reduce((sum, enrollment) => {
      const course = typeof enrollment.course === 'object' ? enrollment.course : null;
      const courseId = course ? course._id || course.id : null;
      if (!course || !courseId) return sum;
      return sum + estimateCourseTimeInvested(course as Course, progressMap[courseId] || []);
    }, 0);
  }, [enrollments, progressMap]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 rounded-3xl bg-stone-200/80" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-stone-200/80" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-danger/20 bg-red-50/80 text-stone-900">
        <p className="font-semibold">Couldn&apos;t load progress</p>
        <p className="mt-1 text-sm text-stone-600">{error}</p>
      </Card>
    );
  }

  const avgRounded = Math.round(averageProgress);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col items-center gap-4 border-primary/10 bg-gradient-to-br from-white to-violet-50/50 p-6 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <RingProgress value={avgRounded} size={140} stroke={12} label={`${avgRounded}%`} sublabel="Overall" />
            <div className="text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Journey</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-stone-900">Progress pulse</h2>
              <p className="mt-2 max-w-md text-sm text-stone-600">
                Average completion across every enrollment. Estimated study time so far:{' '}
                <strong className="text-stone-800">{formatMinutesRounded(totalEstimatedMinutes)}</strong>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-stone-500">
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">{game.xp} XP</span>
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">Level {game.level}</span>
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
                  {game.completedLessons} lessons done
                </span>
              </div>
            </div>
          </div>
          <div className="w-full max-w-md flex-1">
            <ProgressBar value={avgRounded} label="Average completion" size="md" />
          </div>
        </Card>

        <Card className="flex flex-col justify-center gap-3 border-stone-100 bg-white/90 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Time invested</p>
          <p className="font-display text-4xl font-bold text-stone-900">{formatMinutesRounded(totalEstimatedMinutes)}</p>
          <p className="text-sm text-stone-500">
            Sum of estimated time from completed lessons (uses course duration when available).
          </p>
          <Button variant="secondary" asChild className="mt-2 w-full">
            <Link to="/student">Back to overview</Link>
          </Button>
        </Card>
      </div>

      {enrollments.length === 0 ? (
        <Card className="border-dashed py-12 text-center text-stone-500">
          <p>No enrollments yet.</p>
          <Button asChild className="mt-4">
            <Link to="/courses">Explore courses</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {enrollments.map((enrollment) => {
            const course = typeof enrollment.course === 'object' ? enrollment.course : null;
            if (!course) return null;
            const courseId = course._id || course.id;
            if (!courseId) return null;
            const pct = calculateProgress(courseId);
            const progresses = progressMap[courseId] || [];
            const totalLessons = course.totalLessons || progresses.length || 0;
            const done = progresses.filter((p) => p.status === 'completed').length;
            const invested = estimateCourseTimeInvested(course as Course, progresses);

            return (
              <Card
                key={enrollment._id || enrollment.id}
                className="space-y-4 border-stone-100 bg-gradient-to-b from-white to-stone-50/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-display font-semibold text-stone-900">{course.title}</h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {done} / {totalLessons || '—'} lessons · {formatMinutesRounded(invested)}
                      {course.totalDuration ? (
                        <>
                          {' '}
                          of ~{formatMinutesRounded(course.totalDuration)} catalog
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">{pct}%</span>
                </div>
                <ProgressBar value={pct} label="Completion" />
                <p className="text-xs text-stone-400">
                  Updated {new Date(enrollment.updatedAt || enrollment.lastAccessedAt || Date.now()).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentProgressPage;
