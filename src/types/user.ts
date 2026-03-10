export type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'customer' | 'referrer';
  mobileNumber: string | null;
  companyName: string | null;
  websiteUrl: string | null;
  hasCompletedOnboarding: boolean;
  isActive: boolean;
  country: string | null;
  kycStatus: KycStatus;
  mobileVerified: boolean;
  businessName: string | null;
  gstin: string | null;
  pan: string | null;
  businessAddress: string | null;
  kycDocumentPath: string | null;
  kycSubmittedAt: string | null;
  kycReviewedAt: string | null;
  kycReviewedBy: string | null;
  kycRejectionReason: string | null;
  createdAt: string;
}
