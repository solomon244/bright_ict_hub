import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { fetchCourses } from '../../services/courseService';
import type { Course } from '../../types';

const AdminCoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCourses();
        setCourses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load courses');
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    };
    loadCourses();
  }, []);

  if (loading) {
    return <div className="text-center">Loading courses...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600">Error: {error}</div>;
  }

  if (courses.length === 0) {
    return <div className="text-center text-stone-500">No courses found.</div>;
  }

  return (
    <div className="space-y-6">
      {courses.map((course) => {
        const categoryName = typeof course.category === 'object' ? course.category.name : course.category;
        return (
          <Card key={course._id || course.id} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">{categoryName}</p>
                <h3 className="text-xl font-semibold">{course.title}</h3>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" asChild>
                  <Link to={`/courses/${course._id || course.id}`}>View</Link>
                </Button>
                <Badge variant={course.isPublished ? 'success' : 'warning'}>
                  {course.isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-stone-500">{course.description}</p>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminCoursesPage;


