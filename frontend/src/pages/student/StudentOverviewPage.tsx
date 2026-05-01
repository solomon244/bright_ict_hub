import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';
import StatCard from '../../components/common/StatCard';
import { fetchMyEnrollments } from '../../services/enrollmentService';
import { fetchCourseProgress } from '../../services/progressService';
import type { Enrollment, Progress, DashboardStat } from '../../types';

const StudentOverviewPage = () => {
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
        setEnrollments(enrollmentsData.slice(0, 4)); // Show only first 4

        // Load progress for each course
        const progressPromises = enrollmentsData.map((enrollment) => {
          const courseId = typeof enrollment.course === 'object' ? (enrollment.course._id || enrollment.course.id) : enrollment.course;
          if (!courseId) return { courseId: '', progress: [] };
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

  const calculateProgress = (courseId: string): number => {
    const progress = progressMap[courseId] || [];
    if (progress.length === 0) return 0;
    const completed = progress.filter((p) => p.status === 'completed').length;
    return Math.round((completed / progress.length) * 100);
  };

  const stats: DashboardStat[] = [
    {
      id: '1',
      label: 'Enrolled Courses',
      value: enrollments.length,
      trend: 'neutral',
    },
    {
      id: '2',
      label: 'Completed Lessons',
      value: Object.values(progressMap).flat().filter((p) => p.status === 'completed').length,
      trend: 'up',
    },
    {
      id: '3',
      label: 'In Progress',
      value: Object.values(progressMap).flat().filter((p) => p.status === 'in_progress').length,
      trend: 'neutral',
    },
  ];

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Continue learning</p>
            <h3 className="text-xl font-display">Resume where you left off</h3>
          </div>
          <Button variant="secondary" asChild>
            <Link to="/student/courses">View all</Link>
          </Button>
        </div>
        {enrollments.length === 0 ? (
          <div className="text-center text-stone-500 py-8">
            <p>You haven't enrolled in any courses yet.</p>
            <Button asChild className="mt-4">
              <Link to="/courses">Browse courses</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {enrollments.map((enrollment) => {
              const course = typeof enrollment.course === 'object' ? enrollment.course : null;
              if (!course) return null;
              const courseId = course._id || course.id;
              if (!courseId) return null;
              const progress = calculateProgress(courseId);
              const lastProgress = progressMap[courseId]?.find((p: Progress) => p.status === 'in_progress') || progressMap[courseId]?.[0];

              return (
                <div key={enrollment.id} className="rounded-2xl border border-stone-100 p-4">
                  <p className="text-sm font-semibold text-stone-900">{course.title}</p>
                  <p className="text-xs text-stone-400">
                    {lastProgress ? `Last lesson: ${typeof lastProgress.lesson === 'object' ? lastProgress.lesson.title : 'N/A'}` : 'Not started'}
                  </p>
                  <div className="mt-4">
                    <ProgressBar value={progress} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentOverviewPage;


