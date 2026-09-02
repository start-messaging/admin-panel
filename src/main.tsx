// First import on purpose: Sentry has to be initialised before any other
// module runs, or an error thrown during their evaluation goes unreported.
import './instrument';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import posthog from 'posthog-js';
import { PostHogProvider } from '@posthog/react';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/common/error-boundary';
import App from './App';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// No key (local dev, CI) = analytics off. The provider still gets the client
// below — an uninitialised PostHog instance just no-ops every call, which is
// exactly the behaviour we want instead of a second code path.
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    defaults: '2025-05-24',
    person_profiles: 'identified_only',
    // Admin sessions are recorded in full by design ("record session
    // complete") — masking inputs keeps customer PII typed into forms
    // (emails, PAN numbers) out of the recordings.
    session_recording: { maskAllInputs: true },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delay={200} closeDelay={0}>
            <ErrorBoundary>
              <BrowserRouter>
                <App />
                <Toaster richColors position="top-right" />
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </QueryClientProvider>
      </GoogleOAuthProvider>
    </PostHogProvider>
  </StrictMode>,
);
