export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'sm_admin_access_token',
} as const;

export const ROUTES = {
  SIGN_IN: '/sign-in',
  DASHBOARD: '/dashboard',
  CUSTOMERS: '/customers',
  CUSTOMER_DETAIL: '/customers/:userId',
  KYC_REVIEW: '/kyc-review',
  KYC_DETAIL: '/kyc-review/:userId',
  TEMPLATES: '/templates',
  TEMPLATE_CREATE: '/templates/create',
  TEMPLATE_DETAIL: '/templates/:id',
  PAYOUTS: '/payouts',
} as const;
