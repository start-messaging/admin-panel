export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'sm_admin_access_token',
} as const;

export const ROUTES = {
  SIGN_IN: '/sign-in',
  DASHBOARD: '/dashboard',
  CUSTOMERS: '/customers',
  CUSTOMER_DETAIL: '/customers/:userId',
  /**
   * Deliberately not `/growth`, even though it is served by `/admin/growth`.
   * The panel had a GROWTH nav group (leads, outreach, pipeline) that was
   * removed; reusing the word here would make a customer-operations screen
   * read like that cold-outreach surface coming back.
   */
  SIGNUPS: '/signups',
  MESSAGES: '/messages',
  TOPUP: '/topup',
  KYC_REVIEW: '/kyc-review',
  KYC_DETAIL: '/kyc-review/:userId',
  TEMPLATES: '/templates',
  TEMPLATE_CREATE: '/templates/create',
  TEMPLATE_DETAIL: '/templates/:id',
  AFFILIATE_PARTNERS: '/affiliate/partners',
  AFFILIATE_PAYOUTS: '/affiliate/payouts',
  AFFILIATE_SETTINGS: '/affiliate/settings',
} as const;
