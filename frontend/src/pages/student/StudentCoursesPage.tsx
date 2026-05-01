import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import SelectField from '../../components/common/SelectField';
import InputField from '../../components/common/InputField';
import { fetchMyEnrollments, unenrollFromCourse } from '../../services/enrollmentService';
import { fetchCourseProgress } from '../../services/progressService';
import { fetchCourse } from '../../services/courseService';
import type { Enrollment, Progress, Lesson } from '../../types';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

const StudentCoursesPage = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, Progress[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unenrolling, setUnenrolling] = useState<Record<string, boolean>>({});
  const [startingCourse, setStartingCourse] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, []);

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
      setError(err instanceof Error ? err.message : 'Failed to load enrollments');
      console.error('Failed to load enrollments:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (courseId: string): number => {
    const progress = progressMap[courseId] || [];
    if (progress.length === 0) return 0;
    const completed = progress.filter((p) => p.status === 'completed').length;
    return Math.round((completed / progress.length) * 100);
  };

  const getCourseStatus = (courseId: string): 'active' | 'completed' => {
    const progress = calculateProgress(courseId);
    return progress === 100 ? 'completed' : 'active';
  };

  const handleStartCourse = async (courseId: string) => {
    setStartingCourse((prev) => ({ ...prev, [courseId]: true }));
    try {
      setError(null);
      // Fetch course with lessons
      const { lessons } = await fetchCourse(courseId);
      const sortedLessons = [...lessons].sort((a, b) => (a.order || 0) - (b.order || 0));
      const progress = progressMap[courseId] || [];
      
      let nextLesson: Lesson | null = null;
      
      if (progress.length === 0) {
        // No progress, use first lesson
        nextLesson = sortedLessons[0] || null;
      } else {
        // Find the first incomplete lesson
        nextLesson = sortedLessons.find((lesson) => {
          const lessonId = lesson._id || lesson.id;
          const lessonProgress = progress.find((p) => {
            const pLessonId = typeof p.lesson === 'object' ? (p.lesson._id || p.lesson.id) : p.lesson;
            return pLessonId === lessonId;
          });
          return !lessonProgress || lessonProgress.status !== 'completed';
        }) || sortedLessons[0] || null;
      }
      
      if (nextLesson) {
        const lessonId = nextLesson._id || nextLesson.id;
        navigate(`/courses/${courseId}/lessons/${lessonId}`);
      } else {
        // No lessons available, go to course detail page
        navigate(`/courses/${courseId}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load course';
      setError(errorMessage);
      console.error('Failed to start course:', err);
      // Fallback to course detail page
      navigate(`/courses/${courseId}`);
    } finally {
      setStartingCourse((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const filteredEnrollments = useMemo(() => {
    let filtered = enrollments;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter((enrollment) => {
        const courseId = typeof enrollment.course === 'object' 
          ? (enrollment.course._id || enrollment.course.id)
          : enrollment.course;
        if (!courseId) return false;
        return getCourseStatus(courseId) === filter;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((enrollment) => {
        const course = typeof enrollment.course === 'object' ? enrollment.course : null;
        if (!course) return false;
        return (
          course.title.toLowerCase().includes(query) ||
          course.description?.toLowerCase().includes(query) ||
          (typeof course.category === 'object' ? course.category.name : course.category)?.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [enrollments, filter, searchQuery, progressMap]);

  const handleUnenroll = async (enrollmentId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to unenroll from "${courseTitle}"? You'll lose all progress.`)) {
      return;
    }

    setUnenrolling((prev) => ({ ...prev, [enrollmentId]: true }));
    try {
      setError(null);
      await unenrollFromCourse(enrollmentId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unenroll from course');
      console.error('Failed to unenroll:', err);
    } finally {
      setUnenrolling((prev) => ({ ...prev, [enrollmentId]: false }));
    }
  };

  const stats = useMemo(() => {
    const total = enrollments.length;
    const active = enrollments.filter((e) => {
      const courseId = typeof e.course === 'object' ? (e.course._id || e.course.id) : e.course;
      return courseId && getCourseStatus(courseId) === 'active';
    }).length;
    const completed = enrollments.filter((e) => {
      const courseId = typeof e.course === 'object' ? (e.course._id || e.course.id) : e.course;
      return courseId && getCourseStatus(courseId) === 'completed';
    }).length;
    return { total, active, completed };
  }, [enrollments, progressMap]);

  if (loading) {
    return <div className="text-center py-12">Loading your courses...</div>;
  }

  if (error && enrollments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          Error: {error}
        </div>
        <Button asChild>
          <Link to="/courses">Browse courses</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">My Courses</h2>
          <p className="text-sm text-stone-500 mt-1">
            {stats.total} total • {stats.active} active • {stats.completed} completed
          </p>
        </div>
        <Button asChild>
          <Link to="/courses">Browse More Courses</Link>
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Filters and Search */}
      {enrollments.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <InputField
            label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses..."
            className="w-full"
          />
          <SelectField
            label=""
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'completed')}
            options={[
              { label: 'All courses', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Completed', value: 'completed' },
            ]}
          />
        </div>
      )}

      {/* Empty States */}
      {enrollments.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-stone-500 text-lg mb-4">You haven't enrolled in any courses yet.</p>
          <Button asChild>
            <Link to="/courses">Browse Available Courses</Link>
          </Button>
        </Card>
      ) : filteredEnrollments.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-stone-500">
            No courses found {searchQuery ? `matching "${searchQuery}"` : `with status "${filter}"`}.
          </p>
        </Card>
      ) : (
        /* Courses Grid */
        <div className="grid gap-6 md:grid-cols-2">
          {filteredEnrollments.map((enrollment) => {
            const course = typeof enrollment.course === 'object' ? enrollment.course : null;
            if (!course) return null;
            const courseId = course._id || course.id;
            if (!courseId) return null;
            const enrollmentId = enrollment._id || enrollment.id || '';
            const progress = calculateProgress(courseId);
            const status = getCourseStatus(courseId);
            const categoryName = typeof course.category === 'object' ? course.category.name : course.category;
            const isUnenrolling = unenrolling[enrollmentId];

            return (
              <Card key={enrollmentId} className="space-y-4">
                {/* Course Thumbnail */}
                {course.thumbnailUrl && (
                  <img
                    src={resolveMediaUrl(course.thumbnailUrl)}
                    alt={course.title}
                    className="w-full h-48 rounded-xl object-cover"
                  />
                )}

                {/* Course Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <Badge variant="info" className="mb-2">
                        {categoryName}
                      </Badge>
                      <h3 className="text-xl font-semibold text-stone-900 line-clamp-2">
                        {course.title}
                      </h3>
                    </div>
                    <Badge variant={status === 'completed' ? 'success' : 'info'}>
                      {status === 'completed' ? 'Completed' : 'Active'}
                    </Badge>
                  </div>
                  <p className="text-sm text-stone-500 line-clamp-2">{course.description}</p>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-600">Progress</span>
                    <span className="font-semibold text-stone-900">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>

                {/* Course Stats */}
                <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-stone-100 text-center">
                  <div>
                    <p className="text-lg font-semibold text-stone-900">{course.totalLessons || 0}</p>
                    <p className="text-xs text-stone-500">Lessons</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-stone-900">{course.totalDuration || 0}h</p>
                    <p className="text-xs text-stone-500">Duration</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-stone-900 capitalize">{course.level || 'N/A'}</p>
                    <p className="text-xs text-stone-500">Level</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleStartCourse(courseId)}
                    disabled={startingCourse[courseId]}
                    className="flex-1 min-w-[120px] text-sm px-4 py-2"
                  >
                    {startingCourse[courseId] 
                      ? 'Loading...' 
                      : progress === 0 
                        ? 'Start Course' 
                        : progress === 100 
                          ? 'Review Course' 
                          : 'Continue Learning'}
                  </Button>
                  <Button
                    variant="secondary"
                    asChild
                    className="text-sm px-4 py-2"
                  >
                    <Link to={`/courses/${courseId}`}>View Details</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleUnenroll(enrollmentId, course.title)}
                    disabled={isUnenrolling}
                    className="text-sm px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {isUnenrolling ? 'Unenrolling...' : 'Unenroll'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentCoursesPage;



