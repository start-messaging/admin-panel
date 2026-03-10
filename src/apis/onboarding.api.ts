import { apiGet, apiPost } from './api-client';

export interface OnboardingStep {
  step: number;
  title: string;
  completed: boolean;
  support?: {
    message: string;
    whatsapp: {
      number: string;
      url: string;
    };
  };
}

export interface OnboardingStatus {
  currentStep: number;
  isComplete: boolean;
  steps: OnboardingStep[];
}

export function getOnboardingStatus(): Promise<OnboardingStatus> {
  return apiGet<OnboardingStatus>('/users/onboarding-status');
}

export function sendMobileOtp(mobileNumber: string): Promise<{ sent: boolean; message: string }> {
  return apiPost('/users/send-mobile-otp', { mobileNumber });
}

export function verifyMobileOtp(otp: string): Promise<unknown> {
  return apiPost('/users/verify-mobile-otp', { otp });
}

export interface SubmitKycPayload {
  businessName: string;
  pan: string;
  gstin?: string;
  businessAddress: string;
  websiteUrl?: string;
  document: File;
}

export function submitKyc(payload: SubmitKycPayload): Promise<unknown> {
  const formData = new FormData();
  formData.append('businessName', payload.businessName);
  formData.append('pan', payload.pan);
  if (payload.gstin) formData.append('gstin', payload.gstin);
  formData.append('businessAddress', payload.businessAddress);
  if (payload.websiteUrl) formData.append('websiteUrl', payload.websiteUrl);
  formData.append('document', payload.document);

  return apiPost('/users/kyc', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
