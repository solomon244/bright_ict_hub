import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

const roleRedirectMap: Record<UserRole, string> = {
  student: '/student',
  instructor: '/instructor',
  admin: '/admin',
};

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-stone-500">
        Loading workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={roleRedirectMap[user.role]} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

