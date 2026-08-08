export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'sm_admin_access_token',
} as const;

export const ROUTES = {
  SIGN_IN: '/sign-in',
  DASHBOARD: '/dashboard',
  CUSTOMERS: '/customers',
  CUSTOMER_DETAIL: '/customers/:userId',
  MESSAGES: '/messages',
  TOPUP: '/topup',
  KYC_REVIEW: '/kyc-review',
  KYC_DETAIL: '/kyc-review/:userId',
  TEMPLATES: '/templates',
  TEMPLATE_CREATE: '/templates/create',
  TEMPLATE_DETAIL: '/templates/:id',
  EMAIL: '/email',
  EMAIL_NEW: '/email/new',
  /** A draft opens in the composer; a sent campaign opens its analytics. */
  EMAIL_EDIT: '/email/:id/edit',
  EMAIL_DETAIL: '/email/:id',
  AFFILIATE_PARTNERS: '/affiliate/partners',
  AFFILIATE_PAYOUTS: '/affiliate/payouts',
  AFFILIATE_SETTINGS: '/affiliate/settings',
} as const;
