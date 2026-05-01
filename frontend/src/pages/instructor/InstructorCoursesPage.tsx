import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import SelectField from '../../components/common/SelectField';
import { fetchCourses, publishCourse, deleteCourse } from '../../services/courseService';
import { useAuth } from '../../hooks/useAuth';
import type { Course } from '../../types';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

const InstructorCoursesPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCourses();
      // Filter courses where instructor matches current user
      const instructorCourses = data.filter(
        (course) => {
          const instructorId = typeof course.instructor === 'object' 
            ? (course.instructor._id || course.instructor.id)
            : course.instructor;
          const currentUserId = user?._id || user?.id;
          return instructorId === currentUserId;
        }
      );
      setCourses(instructorCourses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCourses();
    }
  }, [user]);

  const filteredCourses = useMemo(() => {
    if (filter === 'all') return courses;
    if (filter === 'published') return courses.filter(c => c.isPublished);
    return courses.filter(c => !c.isPublished);
  }, [courses, filter]);

  const handlePublish = async (courseId: string, currentStatus: boolean, course: Course) => {
    const newStatus = !currentStatus;
    
    // If trying to publish, check if course has lessons
    if (newStatus && (course.totalLessons || 0) === 0) {
      setError('Cannot publish course without lessons. Please add at least one lesson before publishing.');
      return;
    }

    setPublishing((prev) => ({ ...prev, [courseId]: true }));
    setError(null);
    try {
      await publishCourse(courseId, newStatus);
      await loadCourses();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update course status';
      setError(errorMessage);
      console.error('Failed to publish course:', err);
    } finally {
      setPublishing((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleDelete = async (courseId: string, courseTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${courseTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting((prev) => ({ ...prev, [courseId]: true }));
    try {
      await deleteCourse(courseId);
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete course');
      console.error('Failed to delete course:', err);
    } finally {
      setDeleting((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const getCourseId = (course: Course): string => {
    return course._id || course.id || '';
  };

  if (loading) {
    return <div className="text-center py-12">Loading courses...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
          {error.includes('lessons') && (
            <p className="text-xs mt-2 text-red-500">
              Go to the course detail page to add lessons, then return here to publish.
            </p>
          )}
        </div>
      )}

      {/* Header with Create Button and Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-stone-900">My Courses</h2>
          <p className="text-sm text-stone-500 mt-1">
            {courses.length} total • {courses.filter(c => c.isPublished).length} published • {courses.filter(c => !c.isPublished).length} drafts
          </p>
        </div>
        <div className="flex gap-3">
          <SelectField
            label=""
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'published' | 'draft')}
            options={[
              { label: 'All courses', value: 'all' },
              { label: 'Published', value: 'published' },
              { label: 'Drafts', value: 'draft' },
            ]}
            className="w-40"
          />
          <Button asChild>
            <Link to="/instructor/courses/new">+ Create Course</Link>
          </Button>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <Card className="text-center py-12">
          {courses.length === 0 ? (
            <div className="space-y-4">
              <p className="text-stone-500 text-lg">You haven't created any courses yet.</p>
              <Button asChild>
                <Link to="/instructor/courses/new">Create your first course</Link>
              </Button>
            </div>
          ) : (
            <p className="text-stone-500">
              No {filter === 'published' ? 'published' : filter === 'draft' ? 'draft' : ''} courses found.
            </p>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredCourses.map((course) => {
            const courseId = getCourseId(course);
            const categoryName = typeof course.category === 'object' ? course.category.name : course.category;
            const isPublishing = publishing[courseId];
            const isDeleting = deleting[courseId];

            return (
              <Card key={courseId} className="space-y-4">
                {/* Course Thumbnail */}
                {course.thumbnailUrl && (
                  <img
                    src={resolveMediaUrl(course.thumbnailUrl)}
                    alt={course.title}
                    className="w-full h-48 object-cover rounded-xl"
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
                    <Badge variant={course.isPublished ? 'success' : 'warning'}>
                      {course.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <p className="text-sm text-stone-500 line-clamp-2">{course.description}</p>
                </div>

                {/* Course Stats */}
                <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-stone-100">
                  <div className="text-center">
                    <p className={`text-2xl font-semibold ${(course.totalLessons || 0) === 0 ? 'text-amber-600' : 'text-stone-900'}`}>
                      {course.totalLessons || 0}
                    </p>
                    <p className="text-xs text-stone-500">Lessons</p>
                    {(course.totalLessons || 0) === 0 && !course.isPublished && (
                      <p className="text-xs text-amber-600 mt-1 font-medium">⚠️ Add lessons</p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-stone-900">{course.totalDuration || 0}h</p>
                    <p className="text-xs text-stone-500">Duration</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-stone-900 capitalize">{course.level || 'N/A'}</p>
                    <p className="text-xs text-stone-500">Level</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handlePublish(courseId, course.isPublished, course)}
                    disabled={isPublishing || isDeleting || (!course.isPublished && (course.totalLessons || 0) === 0)}
                    className="flex-1 min-w-[120px] text-sm px-4 py-2"
                    title={!course.isPublished && (course.totalLessons || 0) === 0 ? 'Add at least one lesson to publish' : ''}
                  >
                    {isPublishing ? 'Updating...' : course.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button
                    variant="secondary"
                    asChild
                    disabled={isPublishing || isDeleting}
                    className="text-sm px-4 py-2"
                  >
                    <Link to={`/courses/${courseId}`}>View</Link>
                  </Button>
                  <Button
                    variant="secondary"
                    asChild
                    disabled={isPublishing || isDeleting}
                    className="text-sm px-4 py-2"
                  >
                    <Link to={`/instructor/courses/${courseId}/manage`}>Manage Lessons</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(courseId, course.title)}
                    disabled={isPublishing || isDeleting}
                    className="text-sm px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
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

export default InstructorCoursesPage;


