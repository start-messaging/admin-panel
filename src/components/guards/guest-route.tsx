import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullPageSpinner } from '@/components/common/full-page-spinner';
import { ROUTES } from '@/lib/constants';

export function GuestRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  // Only an admin session has somewhere to be sent. Redirecting every
  // authenticated user sent non-admins into a ping-pong with ProtectedRoute.
  if (isAuthenticated && user?.role === 'admin') return <Navigate to={ROUTES.DASHBOARD} replace />;

  return <Outlet />;
}
