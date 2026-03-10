import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullPageSpinner } from '@/components/common/full-page-spinner';
import { ROUTES } from '@/lib/constants';

export function CustomerRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to={ROUTES.SIGN_IN} replace />;

  // Admins go to admin dashboard
  if (user?.role === 'admin') return <Navigate to={ROUTES.DASHBOARD} replace />;

  // Customers who completed onboarding go to dashboard (future)
  // For now, show onboarding
  return <Outlet />;
}
