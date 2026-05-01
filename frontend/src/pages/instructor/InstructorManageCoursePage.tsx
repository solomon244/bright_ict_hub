import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import InputField from '../../components/common/InputField';
import Badge from '../../components/common/Badge';
import { fetchCourse, createLesson, updateLesson, deleteLesson, type CreateLessonPayload } from '../../services/courseService';
import { useAuth } from '../../hooks/useAuth';
import type { Course, Lesson } from '../../types';

const InstructorManageCoursePage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState<CreateLessonPayload>({
    title: '',
    description: '',
    order: 0,
    content: '',
    videoUrl: '',
    duration: 0,
    isPreviewable: false,
  });

  useEffect(() => {
    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const loadCourse = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCourse(courseId);
      setCourse(data.course);
      // Sort lessons by order
      const sortedLessons = [...data.lessons].sort((a, b) => (a.order || 0) - (b.order || 0));
      setLessons(sortedLessons);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course');
      console.error('Failed to load course:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      order: lessons.length + 1,
      content: '',
      videoUrl: '',
      duration: 0,
      isPreviewable: false,
    });
    setShowAddForm(false);
    setEditingLesson(null);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: value ? Number(value) : 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setError(null);
  };

  const handleEdit = (lesson: Lesson) => {
    setFormData({
      title: lesson.title,
      description: lesson.description || '',
      order: lesson.order || 0,
      content: lesson.content || '',
      videoUrl: lesson.videoUrl || '',
      duration: lesson.duration || 0,
      isPreviewable: lesson.isPreviewable || false,
    });
    setEditingLesson(lesson._id || lesson.id || '');
    setShowAddForm(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!courseId) return;

    setFormLoading(true);
    setError(null);

    try {
      if (!formData.title.trim()) {
        throw new Error('Lesson title is required');
      }

      if (editingLesson) {
        // Update existing lesson
        await updateLesson(editingLesson, formData);
      } else {
        // Create new lesson
        await createLesson(courseId, {
          ...formData,
          order: formData.order || lessons.length + 1,
        });
      }

      resetForm();
      await loadCourse();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lesson');
      console.error('Failed to save lesson:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (lessonId: string, lessonTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${lessonTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      await deleteLesson(lessonId);
      await loadCourse();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete lesson');
      console.error('Failed to delete lesson:', err);
    }
  };

  // Check if user is the instructor
  const isInstructor = course && (
    typeof course.instructor === 'object'
      ? (course.instructor._id || course.instructor.id) === (user?._id || user?.id)
      : course.instructor === (user?._id || user?.id)
  );

  if (loading) {
    return <div className="text-center py-12">Loading course...</div>;
  }

  if (error && !course) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          Error: {error}
        </div>
        <Button onClick={() => navigate('/instructor/courses')}>Back to Courses</Button>
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-12">Course not found</div>;
  }

  if (!isInstructor && user?.role !== 'admin') {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-600">
          You don't have permission to manage this course.
        </div>
        <Button onClick={() => navigate('/instructor/courses')}>Back to Courses</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/instructor/courses')} className="mb-2">
            ← Back to Courses
          </Button>
          <h2 className="text-2xl font-semibold text-stone-900">{course.title}</h2>
          <p className="text-sm text-stone-500 mt-1">Manage lessons and course content</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={course.isPublished ? 'success' : 'warning'}>
            {course.isPublished ? 'Published' : 'Draft'}
          </Badge>
          <Button variant="secondary" asChild>
            <Link to={`/courses/${courseId}`}>View Course</Link>
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Course Info */}
      <Card className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-stone-500">Total Lessons</p>
            <p className="text-2xl font-semibold text-stone-900">{lessons.length}</p>
          </div>
          <div>
            <p className="text-stone-500">Total Duration</p>
            <p className="text-2xl font-semibold text-stone-900">{course.totalDuration || 0}h</p>
          </div>
          <div>
            <p className="text-stone-500">Status</p>
            <p className="text-2xl font-semibold text-stone-900 capitalize">{course.level || 'N/A'}</p>
          </div>
        </div>
      </Card>

      {/* Add Lesson Button */}
      {!showAddForm && (
        <Button onClick={() => {
          setFormData((prev) => ({ ...prev, order: lessons.length + 1 }));
          setShowAddForm(true);
        }}>
          + Add Lesson
        </Button>
      )}

      {/* Add/Edit Lesson Form */}
      {showAddForm && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{editingLesson ? 'Edit Lesson' : 'Add New Lesson'}</h3>
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <InputField
                label="Lesson Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Introduction to React"
                required
                disabled={formLoading}
              />
              <InputField
                label="Order"
                name="order"
                type="number"
                value={formData.order || lessons.length + 1}
                onChange={handleChange}
                min="1"
                disabled={formLoading}
              />
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-600">Description</span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="min-h-[100px] w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                placeholder="Brief description of this lesson"
                disabled={formLoading}
              />
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              <InputField
                label="Video URL"
                name="videoUrl"
                type="url"
                value={formData.videoUrl}
                onChange={handleChange}
                placeholder="https://youtube.com/watch?v=..."
                disabled={formLoading}
              />
              <InputField
                label="Duration (minutes)"
                name="duration"
                type="number"
                value={formData.duration || 0}
                onChange={handleChange}
                min="0"
                disabled={formLoading}
              />
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-600">Content</span>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                className="min-h-[150px] w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                placeholder="Lesson content, notes, or instructions..."
                disabled={formLoading}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isPreviewable"
                checked={formData.isPreviewable || false}
                onChange={handleChange}
                disabled={formLoading}
                className="rounded border-stone-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-stone-600">Allow preview (students can view without enrollment)</span>
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Saving...' : editingLesson ? 'Update Lesson' : 'Create Lesson'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm} disabled={formLoading}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lessons List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Lessons ({lessons.length})</h3>
        {lessons.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-stone-500 mb-4">No lessons yet. Add your first lesson to get started.</p>
            <Button onClick={() => {
              setFormData((prev) => ({ ...prev, order: 1 }));
              setShowAddForm(true);
            }}>
              Add First Lesson
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, index) => {
              const lessonId = lesson._id || lesson.id || '';
              return (
                <Card key={lessonId} className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="info">Lesson {lesson.order || index + 1}</Badge>
                        {lesson.isPreviewable && (
                          <Badge variant="success">Preview</Badge>
                        )}
                        {lesson.duration && (
                          <span className="text-xs text-stone-500">{lesson.duration} min</span>
                        )}
                      </div>
                      <h4 className="text-lg font-semibold text-stone-900">{lesson.title}</h4>
                      {lesson.description && (
                        <p className="text-sm text-stone-500 mt-1">{lesson.description}</p>
                      )}
                      {lesson.videoUrl && (
                        <a
                          href={lesson.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-2 inline-block"
                        >
                          View Video →
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleEdit(lesson)}
                        className="text-sm px-3 py-1"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(lessonId, lesson.title)}
                        className="text-sm px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorManageCoursePage;




