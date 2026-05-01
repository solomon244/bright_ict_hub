import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ProgressBar from '../../components/common/ProgressBar';
import Badge from '../../components/common/Badge';
import { fetchCourse } from '../../services/courseService';
import { enrollInCourse, fetchMyEnrollments } from '../../services/enrollmentService';
import { fetchCourseProgress } from '../../services/progressService';
import type { Course, Lesson, Enrollment, Progress } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

const CourseDetailPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCourse(courseId);
        setCourse(data.course);
        setLessons(data.lessons.sort((a, b) => (a.order || 0) - (b.order || 0)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load course');
        console.error('Failed to load course:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCourse();
  }, [courseId]);

  useEffect(() => {
    const loadEnrollmentStatus = async () => {
      if (!courseId || !user || user.role !== 'student') return;
      try {
        const enrollments = await fetchMyEnrollments();
        const foundEnrollment = enrollments.find((e) => {
          const eCourseId = typeof e.course === 'object' ? (e.course._id || e.course.id) : e.course;
          return eCourseId === courseId;
        });
        setEnrollment(foundEnrollment || null);
        
        if (foundEnrollment) {
          const progressData = await fetchCourseProgress(courseId);
          setProgress(progressData);
        }
      } catch (err) {
        console.error('Failed to load enrollment status:', err);
      }
    };
    loadEnrollmentStatus();
  }, [courseId, user]);

  const calculateProgress = useMemo(() => {
    if (progress.length === 0) return 0;
    const completed = progress.filter((p) => p.status === 'completed').length;
    return Math.round((completed / progress.length) * 100);
  }, [progress]);

  const getNextLesson = (): Lesson | null => {
    if (lessons.length === 0) return null;
    if (progress.length === 0) return lessons[0];
    
    // Find the first incomplete lesson
    const incompleteLesson = lessons.find((lesson) => {
      const lessonId = lesson._id || lesson.id;
      const lessonProgress = progress.find((p) => {
        const pLessonId = typeof p.lesson === 'object' ? (p.lesson._id || p.lesson.id) : p.lesson;
        return pLessonId === lessonId;
      });
      return !lessonProgress || lessonProgress.status !== 'completed';
    });
    
    return incompleteLesson || lessons[0];
  };

  const handleEnroll = async () => {
    if (!courseId || !user) {
      navigate('/login', { state: { from: `/courses/${courseId}` } });
      return;
    }
    try {
      setEnrolling(true);
      setError(null);
      await enrollInCourse(courseId);
      // Reload enrollment status
      const enrollments = await fetchMyEnrollments();
      const foundEnrollment = enrollments.find((e) => {
        const eCourseId = typeof e.course === 'object' ? (e.course._id || e.course.id) : e.course;
        return eCourseId === courseId;
      });
      setEnrollment(foundEnrollment || null);
      if (foundEnrollment) {
        const progressData = await fetchCourseProgress(courseId);
        setProgress(progressData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enroll';
      setError(errorMessage);
      console.error('Failed to enroll:', err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleStartCourse = () => {
    if (!courseId) return;
    const nextLesson = getNextLesson();
    if (nextLesson) {
      const lessonId = nextLesson._id || nextLesson.id;
      navigate(`/courses/${courseId}/lessons/${lessonId}`);
    } else {
      navigate(`/courses/${courseId}`);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">Loading course...</div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center text-red-600">Error: {error || 'Course not found'}</div>
        <div className="mt-4 text-center">
          <Button asChild>
            <Link to="/courses">Back to Courses</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center text-red-600">Course not found</div>
        <div className="mt-4 text-center">
          <Button asChild>
            <Link to="/courses">Back to Courses</Link>
          </Button>
        </div>
      </div>
    );
  }

  const categoryName = typeof course.category === 'object' ? course.category.name : course.category;
  const instructorName = typeof course.instructor === 'object' 
    ? `${course.instructor.firstName} ${course.instructor.lastName}`
    : 'Unknown Instructor';
  const isEnrolled = !!enrollment;
  const nextLesson = getNextLesson();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12">
      {/* Error Message */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-primary/80">
            <Badge variant="info">{categoryName}</Badge>
            <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
            <Badge variant="success">{course.level}</Badge>
            {isEnrolled && (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                <Badge variant="info">Enrolled</Badge>
              </>
            )}
          </div>
          <h1 className="text-4xl font-display font-semibold">{course.title}</h1>
          <p className="text-stone-500">{course.description}</p>
          <img
            src={resolveMediaUrl(course.thumbnailUrl) || '/placeholder-course.jpg'}
            alt={course.title}
            className="h-80 w-full rounded-3xl object-cover"
          />
          
          {/* Progress for enrolled students */}
          {isEnrolled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600 font-semibold">Your Progress</span>
                <span className="font-semibold text-stone-900">{calculateProgress}%</span>
              </div>
              <ProgressBar value={calculateProgress} />
            </div>
          )}

          {/* Course Curriculum */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-stone-900">Course Curriculum</h2>
            {lessons.length === 0 ? (
              <p className="text-stone-500">No lessons available yet.</p>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const lessonId = lesson._id || lesson.id;
                  const lessonProgress = progress.find((p) => {
                    const pLessonId = typeof p.lesson === 'object' ? (p.lesson._id || p.lesson.id) : p.lesson;
                    return pLessonId === lessonId;
                  });
                  const isCompleted = lessonProgress?.status === 'completed';
                  const isInProgress = lessonProgress?.status === 'in_progress';
                  
                  return (
                    <Card key={lessonId} className={`space-y-2 ${isCompleted ? 'bg-green-50 border-green-200' : isInProgress ? 'bg-blue-50 border-blue-200' : 'bg-stone-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="info">Lesson {lesson.order || index + 1}</Badge>
                            {lesson.isPreviewable && (
                              <Badge variant="success">Preview</Badge>
                            )}
                            {isCompleted && (
                              <Badge variant="success">Completed</Badge>
                            )}
                            {isInProgress && (
                              <Badge variant="info">In Progress</Badge>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-stone-900">{lesson.title}</h4>
                          {lesson.description && (
                            <p className="text-xs text-stone-500 mt-1">{lesson.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
                            {lesson.duration && <span>⏱ {lesson.duration} min</span>}
                          </div>
                        </div>
                        {isEnrolled && (
                          <Button
                            variant="secondary"
                            size="sm"
                            asChild
                            className="text-xs"
                          >
                            <Link to={`/courses/${courseId}/lessons/${lessonId}`}>
                              {isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start'}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
        <Card className="space-y-6 bg-primary/5">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Instructor</p>
            <h3 className="text-2xl font-display text-stone-900">{instructorName}</h3>
            {typeof course.instructor === 'object' && course.instructor.bio && (
              <p className="text-sm text-stone-500">{course.instructor.bio}</p>
            )}
          </div>
          
          {/* Course Stats */}
          <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-stone-200">
            <div>
              <p className="text-2xl font-semibold text-stone-900">{lessons.length}</p>
              <p className="text-xs text-stone-500">Lessons</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-stone-900">{course.totalDuration || 0}h</p>
              <p className="text-xs text-stone-500">Duration</p>
            </div>
          </div>

          {course.requirements && course.requirements.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-stone-900 mb-2">Requirements</p>
              <ul className="space-y-1 text-sm text-stone-600">
                {course.requirements.map((req, idx) => (
                  <li key={idx}>• {req}</li>
                ))}
              </ul>
            </div>
          )}

          {course.outcomes && course.outcomes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-stone-900 mb-2">What you'll learn</p>
              <ul className="space-y-1 text-sm text-stone-600">
                {course.outcomes.map((outcome, idx) => (
                  <li key={idx}>• {outcome}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          {isEnrolled ? (
            <div className="space-y-3">
              <Button 
                fullWidth 
                className="py-3 text-base" 
                onClick={handleStartCourse}
                disabled={!nextLesson}
              >
                {calculateProgress === 0 ? 'Start Course' : calculateProgress === 100 ? 'Review Course' : 'Continue Learning'}
              </Button>
              <Button asChild variant="secondary" fullWidth className="py-3 text-base">
                <Link to="/student/courses">My Courses</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button 
                fullWidth 
                className="py-3 text-base" 
                onClick={handleEnroll} 
                disabled={enrolling || !user || user.role !== 'student'}
              >
                {enrolling ? 'Enrolling...' : !user ? 'Login to Enroll' : user.role !== 'student' ? 'Students Only' : 'Enroll now'}
              </Button>
              {!user && (
                <Button asChild variant="secondary" fullWidth className="py-3 text-base">
                  <Link to="/login" state={{ from: `/courses/${courseId}` }}>Login</Link>
                </Button>
              )}
              <Button asChild variant="ghost" fullWidth className="py-3 text-base">
                <Link to="/contact">Talk to an advisor</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CourseDetailPage;


