import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { FullPageSpinner } from '@/components/common/full-page-spinner';
import { GuestRoute } from '@/components/guards/guest-route';
import { ProtectedRoute } from '@/components/guards/protected-route';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { SignInPage } from '@/pages/signIn';
import { DashboardPage } from '@/pages/dashboard';
import { CustomersPage } from '@/pages/customers';
import { MessagesLookupPage } from '@/pages/messages';
import { TopupPage } from '@/pages/topup';
import { CustomerDetailPage } from '@/pages/customers/customer-detail';
import { KycReviewPage } from '@/pages/kyc-review';
import { KycDetailPage } from '@/pages/kyc-review/kyc-detail';
import { TemplatesPage } from '@/pages/templates';
import { TemplateCreatePage } from '@/pages/templates/template-create';
import { TemplateDetailPage } from '@/pages/templates/template-detail';
import { EmailCampaignsPage } from '@/pages/email';
import { CampaignDetailPage } from '@/pages/email/campaign-detail';
import { AffiliatePartnersPage } from '@/pages/affiliate/partners';
import { AffiliatePayoutsPage } from '@/pages/affiliate/payouts';
import { AffiliateSettingsPage } from '@/pages/affiliate/settings';
import { ROUTES } from '@/lib/constants';

/**
 * Split out because it pulls in the rich-text editor, which is roughly a third
 * of the whole bundle. Every other screen would otherwise pay for an editor
 * that only loads when someone actually writes a campaign.
 */
const CampaignComposePage = lazy(() =>
  import('@/pages/email/campaign-compose').then((m) => ({
    default: m.CampaignComposePage,
  })),
);

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.SIGN_IN} element={<SignInPage />} />
        </Route>
      </Route>


      {/* Protected — admin only */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.CUSTOMERS} element={<CustomersPage />} />
          <Route path={ROUTES.CUSTOMER_DETAIL} element={<CustomerDetailPage />} />
          <Route path={ROUTES.MESSAGES} element={<MessagesLookupPage />} />
          <Route path={ROUTES.TOPUP} element={<TopupPage />} />
          <Route path={ROUTES.KYC_REVIEW} element={<KycReviewPage />} />
          <Route path={ROUTES.KYC_DETAIL} element={<KycDetailPage />} />
          <Route path={ROUTES.TEMPLATES} element={<TemplatesPage />} />
          <Route path={ROUTES.TEMPLATE_CREATE} element={<TemplateCreatePage />} />
          <Route path={ROUTES.TEMPLATE_DETAIL} element={<TemplateDetailPage />} />
          {/* `/email/new` is declared before `/email/:id` so "new" is not
              matched as a campaign id. */}
          <Route path={ROUTES.EMAIL} element={<EmailCampaignsPage />} />
          <Route
            path={ROUTES.EMAIL_NEW}
            element={
              <Suspense fallback={<FullPageSpinner />}>
                <CampaignComposePage />
              </Suspense>
            }
          />
          <Route
            path={ROUTES.EMAIL_EDIT}
            element={
              <Suspense fallback={<FullPageSpinner />}>
                <CampaignComposePage />
              </Suspense>
            }
          />
          <Route path={ROUTES.EMAIL_DETAIL} element={<CampaignDetailPage />} />
          <Route path={ROUTES.AFFILIATE_PARTNERS} element={<AffiliatePartnersPage />} />
          <Route path={ROUTES.AFFILIATE_PAYOUTS} element={<AffiliatePayoutsPage />} />
          <Route path={ROUTES.AFFILIATE_SETTINGS} element={<AffiliateSettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}
