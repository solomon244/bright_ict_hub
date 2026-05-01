import { Route, Routes } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';
import HomePage from '../pages/public/HomePage';
import CoursesPage from '../pages/public/CoursesPage';
import CourseDetailPage from '../pages/public/CourseDetailPage';
import AboutPage from '../pages/public/AboutPage';
import ContactPage from '../pages/public/ContactPage';
import NotFoundPage from '../pages/public/NotFoundPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage';
import StudentOverviewPage from '../pages/student/StudentOverviewPage';
import StudentCoursesPage from '../pages/student/StudentCoursesPage';
import StudentProgressPage from '../pages/student/StudentProgressPage';
import StudentQuizzesPage from '../pages/student/StudentQuizzesPage';
import StudentProfilePage from '../pages/student/StudentProfilePage';
import StudentLessonPage from '../pages/student/StudentLessonPage';
import InstructorOverviewPage from '../pages/instructor/InstructorOverviewPage';
import InstructorCoursesPage from '../pages/instructor/InstructorCoursesPage';
import InstructorCreateCoursePage from '../pages/instructor/InstructorCreateCoursePage';
import InstructorManageCoursePage from '../pages/instructor/InstructorManageCoursePage';
import InstructorStudentsPage from '../pages/instructor/InstructorStudentsPage';
import InstructorProfilePage from '../pages/instructor/InstructorProfilePage';
import AdminOverviewPage from '../pages/admin/AdminOverviewPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminCoursesPage from '../pages/admin/AdminCoursesPage';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage';

const AppRoutes = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route index element={<HomePage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/courses/:courseId" element={<CourseDetailPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
    </Route>

    <Route element={<ProtectedRoute allowedRoles={['student']} />}>
      <Route
        path="/courses/:courseId/lessons/:lessonId"
        element={<StudentLessonPage />}
      />
    </Route>

    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
    </Route>

    <Route element={<ProtectedRoute allowedRoles={['student']} />}>
      <Route
        path="/student"
        element={
          <DashboardLayout title="Student Overview" subtitle="Track learning milestones and next steps">
            <StudentOverviewPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/student/courses"
        element={
          <DashboardLayout title="My Courses" subtitle="Manage enrollments and schedules">
            <StudentCoursesPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/student/progress"
        element={
          <DashboardLayout title="Progress" subtitle="Detailed performance insights">
            <StudentProgressPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/student/quizzes"
        element={
          <DashboardLayout title="Quizzes" subtitle="Practice assessments per lesson">
            <StudentQuizzesPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/student/profile"
        element={
          <DashboardLayout title="Profile settings" subtitle="Update contact information and interests">
            <StudentProfilePage />
          </DashboardLayout>
        }
      />
    </Route>

    <Route element={<ProtectedRoute allowedRoles={['instructor']} />}>
      <Route
        path="/instructor"
        element={
          <DashboardLayout title="Instructor Overview" subtitle="Monitor cohorts and live sessions">
            <InstructorOverviewPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/instructor/courses"
        element={
          <DashboardLayout title="Manage Courses" subtitle="Update modules and materials">
            <InstructorCoursesPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/instructor/courses/new"
        element={
          <DashboardLayout title="Create Course" subtitle="Publish a new learning experience">
            <InstructorCreateCoursePage />
          </DashboardLayout>
        }
      />
      <Route
        path="/instructor/courses/:courseId/manage"
        element={
          <DashboardLayout title="Manage Course" subtitle="Add lessons and manage content">
            <InstructorManageCoursePage />
          </DashboardLayout>
        }
      />
      <Route
        path="/instructor/students"
        element={
          <DashboardLayout title="Learners" subtitle="Engage and support students">
            <InstructorStudentsPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/instructor/profile"
        element={
          <DashboardLayout title="Instructor Profile" subtitle="Share your expertise and background">
            <InstructorProfilePage />
          </DashboardLayout>
        }
      />
    </Route>

    <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
      <Route
        path="/admin"
        element={
          <DashboardLayout title="Admin Overview" subtitle="Platform-wide health and impact">
            <AdminOverviewPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/admin/users"
        element={
          <DashboardLayout title="Manage Users" subtitle="Control access and roles">
            <AdminUsersPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/admin/courses"
        element={
          <DashboardLayout title="Courses & Reports" subtitle="Audit catalog quality">
            <AdminCoursesPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <DashboardLayout title="Categories" subtitle="Structure the learning catalog">
            <AdminCategoriesPage />
          </DashboardLayout>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <DashboardLayout title="Platform Settings" subtitle="Environment and system configuration">
            <AdminSettingsPage />
          </DashboardLayout>
        }
      />
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default AppRoutes;


