import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { toast } from 'sonner';
import { googleLogin } from '@/apis/auth.api';
import { useAuth } from '@/hooks/useAuth';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/lib/constants';
import { Chrome } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight">Admin Sign In</h1>
        <p className="text-muted-foreground text-sm">
          Select your administrator account to access the control panel
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative min-h-[50px] flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google sign-in failed. Please try again.')}
            size="large"
            width="380"
            text="continue_with"
            shape="rectangular"
          />
        </div>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-muted" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-4 text-zinc-400 font-medium">
              Authorized Personnel Only
            </span>
          </div>
        </div>
      </div>

      <div className="group rounded-xl border bg-zinc-50/50 p-5 transition-all hover:bg-zinc-50 dark:bg-zinc-900/50 dark:hover:bg-zinc-900">
        <div className="flex items-start gap-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Chrome className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Secure Admin OAuth</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Google OAuth 2.0 verification ensures strict role-based access control to system configuration and data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
