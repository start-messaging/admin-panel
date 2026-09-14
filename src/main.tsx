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

// No third-party telemetry in this app at all — no analytics, no error
// reporting. That is a decision, not an omission.
//
// PostHog covers the two customer-facing surfaces (app.startmessaging.com and
// startmessaging.com) and nothing else: staff traffic in there was actively
// harmful, because an admin paging through the customer list produced $pageviews
// indistinguishable from real product usage, inflating every funnel and
// active-user figure with our own back-office work.
//
// Sentry is gone for the adjacent reason. These screens render customer PAN
// numbers and KYC documents as page text, so anything that captures context from
// them — a replay, a stack frame's surrounding state, an attached component tree
// — is a store of customer identity documents. This panel has one operator, who
// sees a failure the moment it happens, so the exchange was a poor one.
//
// The consequence, stated plainly: an error here reaches the operator's own
// console and nowhere else. If this panel ever has more than one user, that
// trade needs revisiting.

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
