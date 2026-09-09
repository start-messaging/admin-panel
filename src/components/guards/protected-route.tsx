import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullPageSpinner } from '@/components/common/full-page-spinner';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/constants';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  if (isLoading) return <FullPageSpinner />;

  if (!isAuthenticated) return <Navigate to={ROUTES.SIGN_IN} replace />;

  // A signed-in non-admin used to be bounced to /sign-in, where GuestRoute saw
  // a live session and bounced them straight back — an infinite redirect that
  // fired a logout request every lap (measured: 155 in 8 seconds). The session
  // is valid, it just isn't an admin one, so say so and let them sign out.
  if (user?.role !== 'admin') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold">Admin access only</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You are signed in as {user?.email}, which is not an administrator account.
        </p>
        <Button onClick={() => void logout()}>Sign out</Button>
      </div>
    );
  }

  return <Outlet />;
}
