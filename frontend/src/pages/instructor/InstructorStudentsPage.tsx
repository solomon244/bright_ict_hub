import { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import { fetchCourseEnrollments } from '../../services/enrollmentService';
import { fetchCourses } from '../../services/courseService';
import { useAuth } from '../../hooks/useAuth';
import type { Enrollment } from '../../types';

interface StudentEnrollment {
  student: {
    _id?: string;
    id?: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  course: {
    _id?: string;
    id?: string;
    title: string;
  };
  enrollment: Enrollment;
}

const InstructorStudentsPage = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);

        // Fetch all courses for the instructor
        const allCourses = await fetchCourses();
        const instructorCourses = allCourses.filter((course) => {
          const instructorId = typeof course.instructor === 'object' 
            ? (course.instructor._id || course.instructor.id)
            : course.instructor;
          const currentUserId = user._id || user.id;
          return instructorId === currentUserId;
        });

        if (instructorCourses.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        // Fetch enrollments for all instructor courses
        const enrollmentPromises = instructorCourses.map(async (course) => {
          try {
            const courseId = course._id || course.id || '';
            const enrollments = await fetchCourseEnrollments(courseId);
            return enrollments.map((enrollment) => ({
              student: typeof enrollment.student === 'object' ? enrollment.student : null,
              course: {
                _id: course._id || course.id,
                id: course.id || course._id,
                title: course.title,
              },
              enrollment,
            }));
          } catch (err) {
            console.error(`Failed to load enrollments for course ${course.title}:`, err);
            return [];
          }
        });

        const enrollmentResults = await Promise.all(enrollmentPromises);
        const allStudents = enrollmentResults.flat().filter((item) => item.student !== null) as StudentEnrollment[];
        
        // Remove duplicates (same student in multiple courses)
        const uniqueStudents = new Map<string, StudentEnrollment>();
        allStudents.forEach((item) => {
          const studentId = item.student._id || item.student.id || '';
          if (studentId && !uniqueStudents.has(studentId)) {
            uniqueStudents.set(studentId, item);
          }
        });

        setStudents(Array.from(uniqueStudents.values()));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load students');
        console.error('Failed to load students:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  if (loading) {
    return <div className="text-center">Loading students...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Enrolled learners</p>
          <h3 className="text-xl font-display">Active students</h3>
        </div>
        <span className="text-sm font-semibold text-stone-500">{students.length} total</span>
      </div>
      {students.length === 0 ? (
        <div className="text-center text-stone-500 py-8">
          <p>No students enrolled in your courses yet.</p>
          <p className="text-xs mt-2">Students will appear here once they enroll in your courses.</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {students.map((item) => {
            const student = item.student;
            const enrollment = item.enrollment;
            const enrollmentId = enrollment._id || enrollment.id || '';

            return (
              <div key={enrollmentId} className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <p className="font-semibold text-stone-800">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="text-xs text-stone-500 mt-1">
                    {student.email}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    Course: {item.course.title}
                  </p>
                  {enrollment.progressPercentage !== undefined && (
                    <p className="text-xs text-stone-400 mt-1">
                      Progress: {enrollment.progressPercentage}%
                    </p>
                  )}
                </div>
                <button className="text-sm font-semibold text-primary hover:text-primary-dark px-3 py-1 rounded hover:bg-primary/10 transition-colors">
                  Message
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default InstructorStudentsPage;


