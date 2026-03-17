import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FullPageSpinner } from '@/components/common/full-page-spinner';
import { ROUTES } from '@/lib/constants';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user && user.role !== 'admin') {
      toast.error('Access denied. Admin only.');
      logout();
    }
  }, [isAuthenticated, user, logout]);

  if (isLoading) return <FullPageSpinner />;

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to={ROUTES.SIGN_IN} replace />;
  }

  return <Outlet />;
}
