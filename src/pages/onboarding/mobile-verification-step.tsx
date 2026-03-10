import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Phone, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  onSendOtp: (phone: string) => void;
  onVerifyOtp: (otp: string) => void;
  isSending: boolean;
  isVerifying: boolean;
  otpSent: boolean;
}

export function MobileVerificationStep({
  onSendOtp,
  onVerifyOtp,
  isSending,
  isVerifying,
  otpSent,
}: Props) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Verify your mobile number</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We'll send a 6-digit OTP to verify your phone number
        </p>
      </div>

      {/* Phone input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Mobile Number</label>
        <div className="flex gap-3">
          <div className="flex h-10 items-center rounded-lg border bg-muted px-3 text-sm text-muted-foreground">
            +91
          </div>
          <input
            type="tel"
            placeholder="9034036898"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            disabled={isSending || isVerifying}
          />
          <Button
            size="lg"
            onClick={() => onSendOtp(`+91${phone}`)}
            disabled={phone.length !== 10 || isSending}
          >
            {isSending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Phone className="size-4" />
                {otpSent ? 'Resend' : 'Send OTP'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* OTP input */}
      {otpSent && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Enter OTP</label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm tracking-widest outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              maxLength={6}
            />
            <Button
              size="lg"
              onClick={() => onVerifyOtp(otp)}
              disabled={otp.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Verify
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            OTP is valid for 5 minutes. You can resend after 60 seconds.
          </p>
        </div>
      )}
    </div>
  );
}
