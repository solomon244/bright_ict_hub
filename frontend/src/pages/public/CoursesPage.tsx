import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import SelectField from '../../components/common/SelectField';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { fetchCourses } from '../../services/courseService';
import { fetchCategories } from '../../services/categoryService';
import type { Course, Category } from '../../types';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

const levelOptions = [
  { label: 'All levels', value: 'all' },
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

const CoursesPage = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState('all');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [coursesData, categoriesData] = await Promise.all([
          fetchCourses({ isPublished: true }),
          fetchCategories(),
        ]);
        console.log('Loaded courses:', coursesData);
        console.log('Courses count:', coursesData.length);
        console.log('Loaded categories:', categoriesData);
        setCourses(coursesData);
        setCategories(categoriesData);
        
        // If no published courses, try to fetch all courses to see if any exist
        if (coursesData.length === 0) {
          try {
            const allCourses = await fetchCourses();
            console.log('Total courses (published + unpublished):', allCourses.length);
            if (allCourses.length > 0) {
              console.warn('Courses exist but are not published. Instructors need to publish courses for them to appear here.');
            }
          } catch (err) {
            // Ignore error, just for debugging
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load courses');
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const categoryOptions = [
    { label: 'All categories', value: 'all' },
    ...categories.map((cat) => ({
      label: cat.name,
      value: (cat as any)._id || cat.id || '',
    })),
  ];

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const levelMatch = level === 'all' || course.level === level;
      
      // Handle category matching - category can be object or string ID
      let categoryMatch = true;
      if (category !== 'all') {
        if (typeof course.category === 'object') {
          const categoryId = (course.category as any)._id || course.category.id || '';
          categoryMatch = categoryId === category;
        } else {
          categoryMatch = course.category === category;
        }
      }
      
      return levelMatch && categoryMatch;
    });
  }, [courses, level, category]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">Loading courses...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-12">
      <header className="space-y-4 text-center">
        <h1 className="section-heading">Explore live and on-demand programs</h1>
        <p className="section-subheading mx-auto">
          Choose pathways spanning full-stack engineering, AI, product design, and entrepreneurship.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Category" value={category} onChange={(event) => setCategory(event.target.value)} options={categoryOptions} />
        <SelectField label="Level" value={level} onChange={(event) => setLevel(event.target.value)} options={levelOptions} />
        <SelectField
          label="Duration"
          options={[
            { label: 'Any length', value: 'any' },
            { label: 'Less than 10h', value: 'short' },
            { label: '10h - 20h', value: 'medium' },
            { label: '20h+', value: 'long' },
          ]}
        />
        <SelectField
          label="Language"
          options={[
            { label: 'English & Amharic', value: 'bilingual' },
            { label: 'English only', value: 'english' },
            { label: 'Amharic only', value: 'amharic' },
          ]}
        />
      </div>

      {filteredCourses.length === 0 ? (
        <div className="text-center space-y-4 py-12">
          <div className="mx-auto max-w-md space-y-3">
            <p className="text-lg font-semibold text-stone-700">No courses available</p>
            {courses.length === 0 ? (
              <div className="space-y-2 text-sm text-stone-500">
                <p>There are no published courses available at the moment.</p>
                <p className="text-xs">
                  Instructors need to create and publish courses for them to appear here.
                </p>
              </div>
            ) : (
              <p className="text-sm text-stone-500">
                {courses.length} course(s) available, but none match the current filters.
                Try adjusting your filters above.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredCourses.map((course) => {
            const categoryName = typeof course.category === 'object' ? course.category.name : course.category;
            return (
              <Card key={course._id || course.id} className="space-y-4">
                <img
                  src={resolveMediaUrl(course.thumbnailUrl) || '/placeholder-course.jpg'}
                  alt={course.title}
                  className="h-48 w-full rounded-2xl object-cover"
                />
                <div className="flex flex-wrap gap-3">
                  <Badge variant="info">{categoryName}</Badge>
                  <Badge variant="success">{course.level}</Badge>
                </div>
                <h2 className="text-2xl font-display font-semibold text-stone-900">{course.title}</h2>
                <p className="text-sm text-stone-500">{course.description}</p>
                <div className="grid grid-cols-3 gap-4 text-center text-sm font-semibold text-stone-600">
                  <div>
                    <p className="text-2xl font-display text-stone-900">{course.totalLessons || 0}</p>
                    <p>Lessons</p>
                  </div>
                  <div>
                    <p className="text-2xl font-display text-stone-900">{course.totalDuration || 0}h</p>
                    <p>Duration</p>
                  </div>
                  <div>
                    <p className="text-2xl font-display text-stone-900">-</p>
                    <p>Learners</p>
                  </div>
                </div>
                <Button asChild fullWidth className="py-3 text-base">
                  <Link to={`/courses/${course._id || course.id}`}>See details</Link>
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CoursesPage;


