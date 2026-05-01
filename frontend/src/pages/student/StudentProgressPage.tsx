import { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import ProgressBar from '../../components/common/ProgressBar';
import { fetchMyEnrollments } from '../../services/enrollmentService';
import { fetchCourseProgress } from '../../services/progressService';
import type { Enrollment, Progress } from '../../types';

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

  const averageProgress =
    enrollments.length > 0
      ? enrollments.reduce((sum, enrollment) => {
          const courseId = typeof enrollment.course === 'object' ? (enrollment.course._id || enrollment.course.id) : enrollment.course;
          if (!courseId) return sum;
          return sum + calculateProgress(courseId);
        }, 0) / enrollments.length
      : 0;

  if (loading) {
    return <div className="text-center">Loading progress...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase text-primary">Overall performance</p>
          <p className="text-4xl font-display">{Math.round(averageProgress)}%</p>
          <p className="text-sm text-stone-500">Average completion rate across all enrollments.</p>
        </div>
        <ProgressBar value={Math.round(averageProgress)} />
      </Card>

      {enrollments.length === 0 ? (
        <div className="text-center text-stone-500 py-8">
          <p>No progress data available.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {enrollments.map((enrollment) => {
            const course = typeof enrollment.course === 'object' ? enrollment.course : null;
            if (!course) return null;
            const courseId = course._id || course.id;
            if (!courseId) return null;
            const progress = calculateProgress(courseId);

            return (
              <Card key={enrollment._id || enrollment.id} className="space-y-4">
                <h3 className="text-xl font-semibold text-stone-900">{course.title}</h3>
                <p className="text-sm text-stone-500">
                  Updated {new Date(enrollment.updatedAt || Date.now()).toLocaleDateString()}
                </p>
                <ProgressBar value={progress} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentProgressPage;


