import { Navigate, Route, Routes } from 'react-router-dom';
import { GuestRoute } from '@/components/guards/guest-route';
import { ProtectedRoute } from '@/components/guards/protected-route';
import { CustomerRoute } from '@/components/guards/customer-route';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { SignInPage } from '@/pages/signIn';
import { DashboardPage } from '@/pages/dashboard';
import { OnboardingPage } from '@/pages/onboarding';
import { CustomersPage } from '@/pages/customers';
import { CustomerDetailPage } from '@/pages/customers/customer-detail';
import { KycReviewPage } from '@/pages/kyc-review';
import { KycDetailPage } from '@/pages/kyc-review/kyc-detail';
import { TemplatesPage } from '@/pages/templates';
import { TemplateCreatePage } from '@/pages/templates/template-create';
import { TemplateDetailPage } from '@/pages/templates/template-detail';
import { ROUTES } from '@/lib/constants';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.SIGN_IN} element={<SignInPage />} />
        </Route>
      </Route>

      {/* Customer — onboarding */}
      <Route element={<CustomerRoute />}>
        <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />
      </Route>

      {/* Protected — admin only */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
          <Route path={ROUTES.CUSTOMERS} element={<CustomersPage />} />
          <Route path={ROUTES.CUSTOMER_DETAIL} element={<CustomerDetailPage />} />
          <Route path={ROUTES.KYC_REVIEW} element={<KycReviewPage />} />
          <Route path={ROUTES.KYC_DETAIL} element={<KycDetailPage />} />
          <Route path={ROUTES.TEMPLATES} element={<TemplatesPage />} />
          <Route path={ROUTES.TEMPLATE_CREATE} element={<TemplateCreatePage />} />
          <Route path={ROUTES.TEMPLATE_DETAIL} element={<TemplateDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
    </Routes>
  );
}
