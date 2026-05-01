import { NavLink } from 'react-router-dom';
import { FaBook, FaChartPie, FaCog, FaGraduationCap, FaPenFancy, FaUserFriends } from 'react-icons/fa';
import useAuth from '../../hooks/useAuth';
import type { UserRole } from '../../types';
import clsx from 'clsx';

const navConfig: Record<
  UserRole,
  { label: string; icon: JSX.Element; path: string }[]
> = {
  student: [
    { label: 'Overview', icon: <FaChartPie />, path: '/student' },
    { label: 'My Courses', icon: <FaBook />, path: '/student/courses' },
    { label: 'Progress', icon: <FaGraduationCap />, path: '/student/progress' },
    { label: 'Quizzes', icon: <FaPenFancy />, path: '/student/quizzes' },
    { label: 'Profile', icon: <FaCog />, path: '/student/profile' },
  ],
  instructor: [
    { label: 'Overview', icon: <FaChartPie />, path: '/instructor' },
    { label: 'Manage Courses', icon: <FaBook />, path: '/instructor/courses' },
    { label: 'Create Course', icon: <FaPenFancy />, path: '/instructor/courses/new' },
    { label: 'Students', icon: <FaUserFriends />, path: '/instructor/students' },
    { label: 'Profile', icon: <FaCog />, path: '/instructor/profile' },
  ],
  admin: [
    { label: 'Overview', icon: <FaChartPie />, path: '/admin' },
    { label: 'Users', icon: <FaUserFriends />, path: '/admin/users' },
    { label: 'Courses', icon: <FaBook />, path: '/admin/courses' },
    { label: 'Categories', icon: <FaPenFancy />, path: '/admin/categories' },
    { label: 'Settings', icon: <FaCog />, path: '/admin/settings' },
  ],
};

const DashboardSidebar = () => {
  const { user } = useAuth();
  const role = user?.role ?? 'student';

  return (
    <aside className="hidden w-64 flex-col gap-6 border-r border-white/40 bg-white/80 p-6 backdrop-blur-3xl lg:flex">
      <div>
        <p className="text-xs font-semibold uppercase text-stone-400">Welcome back</p>
        <p className="mt-1 text-lg font-display font-semibold text-stone-900">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="text-sm text-stone-500 capitalize">{role} workspace</p>
      </div>
      <nav className="space-y-2">
        {navConfig[role].map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                isActive ? 'bg-primary text-white shadow-card' : 'text-stone-500 hover:bg-stone-100'
              )
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default DashboardSidebar;

