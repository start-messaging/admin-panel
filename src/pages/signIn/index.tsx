import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { googleLogin } from '@/apis/auth.api';
import { useAuth } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/lib/constants';

export function SignInPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      toast.error('Failed to get Google credentials');
      return;
    }

    try {
      const { accessToken, user } = await googleLogin({ idToken });

      if (user.role !== 'admin') {
        toast.error('Access denied. Admin only.');
        return;
      }

      login(accessToken, user);
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Admin Sign In</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your Google account to access the admin panel
        </p>
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => toast.error('Google sign-in failed. Please try again.')}
          size="large"
          width="320"
          text="signin_with"
          shape="rectangular"
        />
      </div>
    </div>
  );
}
