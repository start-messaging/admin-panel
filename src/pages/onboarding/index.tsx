import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getOnboardingStatus,
  sendMobileOtp,
  verifyMobileOtp,
  submitKyc,
  type SubmitKycPayload,
} from '@/apis/onboarding.api';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import { Check, Phone, Building2, ShieldCheck, Loader2 } from 'lucide-react';
import { MobileVerificationStep } from './mobile-verification-step';
import { BusinessDetailsStep } from './business-details-step';
import { AdminApprovalStep } from './admin-approval-step';

export function OnboardingPage() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['onboarding', 'status'],
    queryFn: getOnboardingStatus,
  });

  const sendOtpMutation = useMutation({
    mutationFn: (mobileNumber: string) => sendMobileOtp(mobileNumber),
    onSuccess: () => toast.success('OTP sent to your mobile number'),
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (otp: string) => verifyMobileOtp(otp),
    onSuccess: () => {
      toast.success('Mobile number verified!');
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const submitKycMutation = useMutation({
    mutationFn: (payload: SubmitKycPayload) => submitKyc(payload),
    onSuccess: () => {
      toast.success('KYC documents submitted for review!');
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  if (isLoading || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stepIcons = [Phone, Building2, ShieldCheck];

  return (
    <div className="mx-auto min-h-screen bg-background px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to StartMessaging
          </h1>
          <p className="mt-2 text-muted-foreground">
            Complete these steps to get started with your account
          </p>
        </div>

        {/* Step indicators */}
        <div className="mb-10 flex items-center justify-center gap-0">
          {status.steps.map((step, i) => {
            const Icon = stepIcons[i];
            const isActive = status.currentStep === step.step;
            const isCompleted = step.completed;

            return (
              <div key={step.step} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`h-0.5 w-12 sm:w-20 ${
                      isCompleted || isActive
                        ? 'bg-primary'
                        : 'bg-border'
                    }`}
                  />
                )}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex size-10 items-center justify-center rounded-full border-2 transition-colors ${
                      isCompleted
                        ? 'border-primary bg-primary text-primary-foreground'
                        : isActive
                          ? 'border-primary bg-background text-primary'
                          : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="size-5" />
                    ) : (
                      <Icon className="size-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          {status.currentStep === 1 && (
            <MobileVerificationStep
              onSendOtp={(phone) => sendOtpMutation.mutate(phone)}
              onVerifyOtp={(otp) => verifyOtpMutation.mutate(otp)}
              isSending={sendOtpMutation.isPending}
              isVerifying={verifyOtpMutation.isPending}
              otpSent={sendOtpMutation.isSuccess}
            />
          )}

          {status.currentStep === 2 && (
            <BusinessDetailsStep
              onSubmit={(payload) => submitKycMutation.mutate(payload)}
              isSubmitting={submitKycMutation.isPending}
            />
          )}

          {status.currentStep === 3 && (
            <AdminApprovalStep step={status.steps[2]} />
          )}
        </div>
      </div>
    </div>
  );
}
