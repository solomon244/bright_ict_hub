import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { fetchCourse } from '../../services/courseService';
import { fetchCourseProgress, updateProgress } from '../../services/progressService';
import type { Course, Lesson, Progress } from '../../types';

const StudentLessonPage = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        setError(null);
        const { course: courseData, lessons: lessonsData } = await fetchCourse(courseId);
        setCourse(courseData);
        const sortedLessons = [...lessonsData].sort((a, b) => (a.order || 0) - (b.order || 0));
        setLessons(sortedLessons);
        
        // Find current lesson
        const lesson = sortedLessons.find(
          (l) => (l._id || l.id) === lessonId
        );
        setCurrentLesson(lesson || null);
        
        // Load progress
        const progressData = await fetchCourseProgress(courseId);
        setProgress(progressData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lesson');
        console.error('Failed to load lesson:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [courseId, lessonId]);

  const getLessonProgress = (lId: string): Progress | undefined => {
    return progress.find((p) => {
      const pLessonId = typeof p.lesson === 'object' ? (p.lesson._id || p.lesson.id) : p.lesson;
      return pLessonId === lId;
    });
  };

  const handleMarkComplete = async () => {
    if (!courseId || !lessonId || !currentLesson) return;
    try {
      setMarkingComplete(true);
      await updateProgress({
        courseId,
        lessonId,
        status: 'completed',
        percentage: 100,
      });
      // Reload progress
      const progressData = await fetchCourseProgress(courseId);
      setProgress(progressData);
    } catch (err) {
      console.error('Failed to mark lesson as complete:', err);
    } finally {
      setMarkingComplete(false);
    }
  };

  const getNextLesson = (): Lesson | null => {
    if (!currentLesson || lessons.length === 0) return null;
    const currentIndex = lessons.findIndex(
      (l) => (l._id || l.id) === (currentLesson._id || currentLesson.id)
    );
    return lessons[currentIndex + 1] || null;
  };

  const getPreviousLesson = (): Lesson | null => {
    if (!currentLesson || lessons.length === 0) return null;
    const currentIndex = lessons.findIndex(
      (l) => (l._id || l.id) === (currentLesson._id || currentLesson.id)
    );
    return lessons[currentIndex - 1] || null;
  };

  const getVideoEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    
    // Check if it's already an embed URL
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    // Check if it's a direct video file (mp4, webm, etc.)
    if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
      return url;
    }
    
    // Extract YouTube video ID from various URL formats
    let videoId: string | null = null;
    
    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    // Format: https://youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^"&?\/\s]{11})/);
    if (watchMatch && watchMatch[1]) {
      videoId = watchMatch[1];
    }
    
    // Format: https://www.youtube.com/v/VIDEO_ID
    const vMatch = url.match(/youtube\.com\/v\/([^"&?\/\s]{11})/);
    if (vMatch && vMatch[1]) {
      videoId = vMatch[1];
    }
    
    // Format: https://youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^"&?\/\s]{11})/);
    if (shortMatch && shortMatch[1]) {
      videoId = shortMatch[1];
    }
    
    if (videoId) {
      // Convert to YouTube embed URL
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Return as-is for other URLs (might be Vimeo, direct links, etc.)
    return url;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">Loading lesson...</div>
      </div>
    );
  }

  if (error || !course || !currentLesson) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center text-red-600">
          Error: {error || 'Lesson not found'}
        </div>
        <div className="mt-4 text-center">
          <Button asChild>
            <Link to={courseId ? `/courses/${courseId}` : '/courses'}>
              Back to Course
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const lessonProgress = getLessonProgress(currentLesson._id || currentLesson.id || '');
  const isCompleted = lessonProgress?.status === 'completed';
  const nextLesson = getNextLesson();
  const previousLesson = getPreviousLesson();
  const currentIndex = lessons.findIndex(
    (l) => (l._id || l.id) === (currentLesson._id || currentLesson.id)
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild>
            <Link to={`/courses/${courseId}`}>← Back to Course</Link>
          </Button>
          <h1 className="text-3xl font-semibold text-stone-900 mt-2">{course.title}</h1>
        </div>
        <Badge variant="info">
          Lesson {currentIndex + 1} of {lessons.length}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        {/* Main Content */}
        <Card className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="info">Lesson {currentLesson.order || currentIndex + 1}</Badge>
              {currentLesson.isPreviewable && (
                <Badge variant="success">Preview</Badge>
              )}
              {isCompleted && (
                <Badge variant="success">Completed</Badge>
              )}
            </div>
            <h2 className="text-2xl font-semibold text-stone-900">{currentLesson.title}</h2>
            {currentLesson.description && (
              <p className="text-stone-500 mt-2">{currentLesson.description}</p>
            )}
          </div>

          {/* Video */}
          {currentLesson.videoUrl && (() => {
            const embedUrl = getVideoEmbedUrl(currentLesson.videoUrl);
            const isDirectVideo = currentLesson.videoUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
            
            if (!embedUrl) return null;
            
            if (isDirectVideo) {
              // Direct video file
              return (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-stone-900">
                  <video
                    src={embedUrl}
                    controls
                    className="w-full h-full"
                    title={currentLesson.title}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              );
            } else {
              // YouTube or other embeddable video
              return (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-stone-900">
                  <iframe
                    src={embedUrl}
                    title={currentLesson.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    frameBorder="0"
                  />
                </div>
              );
            }
          })()}

          {/* Content */}
          {currentLesson.content && (
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
            </div>
          )}

          {/* Resources */}
          {currentLesson.resources && currentLesson.resources.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-stone-900">Resources</h3>
              <div className="space-y-2">
                {currentLesson.resources.map((resource, idx) => (
                  <a
                    key={idx}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg border border-stone-200 hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-primary">📎</span>
                      <span className="font-medium text-stone-900">
                        {resource.title || `Resource ${idx + 1}`}
                      </span>
                      <span className="text-xs text-stone-500 ml-auto">
                        {resource.type.toUpperCase()}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-stone-200">
            <Button
              variant="secondary"
              onClick={() => {
                if (previousLesson) {
                  const prevId = previousLesson._id || previousLesson.id;
                  navigate(`/courses/${courseId}/lessons/${prevId}`);
                }
              }}
              disabled={!previousLesson}
            >
              ← Previous
            </Button>
            <Button
              variant="primary"
              onClick={handleMarkComplete}
              disabled={markingComplete || isCompleted}
            >
              {markingComplete ? 'Marking...' : isCompleted ? '✓ Completed' : 'Mark as Complete'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (nextLesson) {
                  const nextId = nextLesson._id || nextLesson.id;
                  navigate(`/courses/${courseId}/lessons/${nextId}`);
                } else {
                  navigate(`/courses/${courseId}`);
                }
              }}
            >
              {nextLesson ? 'Next →' : 'Finish Course'}
            </Button>
          </div>
        </Card>

        {/* Sidebar - Lesson List */}
        <Card className="space-y-4">
          <h3 className="text-lg font-semibold text-stone-900">Course Curriculum</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {lessons.map((lesson, index) => {
              const lId = lesson._id || lesson.id || '';
              const lProgress = getLessonProgress(lId);
              const isCurrent = lId === (currentLesson._id || currentLesson.id);
              const isLCompleted = lProgress?.status === 'completed';
              const isLInProgress = lProgress?.status === 'in_progress';

              return (
                <Link
                  key={lId}
                  to={`/courses/${courseId}/lessons/${lId}`}
                  className={`block p-3 rounded-lg border transition-colors ${
                    isCurrent
                      ? 'border-primary bg-primary/5'
                      : isLCompleted
                        ? 'border-green-200 bg-green-50'
                        : isLInProgress
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-stone-200 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-stone-500">
                          {lesson.order || index + 1}
                        </span>
                        {isLCompleted && <span className="text-green-600">✓</span>}
                        {isLInProgress && <span className="text-blue-600">●</span>}
                      </div>
                      <p className="text-sm font-medium text-stone-900 line-clamp-2">
                        {lesson.title}
                      </p>
                      {lesson.duration && (
                        <p className="text-xs text-stone-500 mt-1">{lesson.duration} min</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentLessonPage;

