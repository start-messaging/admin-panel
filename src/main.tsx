// First import on purpose: Sentry has to be initialised before any other
// module runs, or an error thrown during their evaluation goes unreported.
import './instrument';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/common/error-boundary';
import App from './App';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// No product analytics in this app, deliberately.
//
// PostHog covers the two customer-facing surfaces — app.startmessaging.com and
// startmessaging.com — and nothing else. Staff traffic was actively harmful in
// there: an admin paging through the customer list produced $pageviews
// indistinguishable from real product usage, so every funnel and active-user
// number was inflated by our own back-office work. Replays of these screens were
// worse, since they render customer PAN and KYC documents as text, which no
// amount of input masking covers.
//
// Error reporting is separate and stays — see instrument.ts.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
);
