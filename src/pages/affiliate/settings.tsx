import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Play, RefreshCw, Banknote } from 'lucide-react';
import {
  getAffiliateSettings,
  runAccrualJob,
  runPayoutJob,
  runReconcileJob,
  updateAffiliateSettings,
  type AffiliateSettings,
  type CommissionType,
} from '@/apis/affiliate.api';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';

export function AffiliateSettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'affiliate', 'settings'],
    queryFn: getAffiliateSettings,
  });

  const [form, setForm] = useState<AffiliateSettings | null>(null);
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: (payload: Partial<AffiliateSettings>) =>
      updateAffiliateSettings(payload),
    onSuccess: () => {
      toast.success('Settings saved');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  if (isLoading || !form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const set = <K extends keyof AffiliateSettings>(
    key: K,
    value: AffiliateSettings[K],
  ) => setForm({ ...form, [key]: value });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Affiliate programme</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Commission rate and payout rules. Changing the rate only affects
          future earnings — every commission already recorded keeps the rate it
          was calculated at.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-semibold">Programme enabled</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              When off, referral links stop attributing and no commission accrues.
            </span>
          </span>
          <input
            type="checkbox"
            className="size-5 shrink-0 accent-primary"
            checked={form.isEnabled}
            onChange={(e) => set('isEnabled', e.target.checked)}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Commission</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Type</label>
            <select
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={form.defaultCommissionType}
              onChange={(e) =>
                set('defaultCommissionType', e.target.value as CommissionType)
              }
            >
              <option value="percent">Percent of customer spend</option>
              <option value="flat">Flat amount per delivered OTP</option>
            </select>
          </div>
          <NumberField
            label={
              form.defaultCommissionType === 'percent'
                ? 'Rate (% of spend)'
                : 'Rate (₹ per OTP)'
            }
            value={form.defaultCommissionRate}
            onChange={(v) => set('defaultCommissionRate', v)}
            step={0.25}
            hint={
              form.defaultCommissionType === 'percent'
                ? 'e.g. 10 means the partner earns ₹0.025 on a ₹0.25 OTP'
                : 'Paid per delivered message regardless of its cost'
            }
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Payout rules</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Minimum paying referrals"
            value={form.minPaidReferrals}
            onChange={(v) => set('minPaidReferrals', v)}
            hint="Referrals who have completed at least one payment"
          />
          <NumberField
            label="Minimum payout (₹)"
            value={form.minPayoutAmount}
            onChange={(v) => set('minPayoutAmount', v)}
            hint="Balances below this carry over to the next month"
          />
          <NumberField
            label="Payout day of month"
            value={form.payoutDayOfMonth}
            onChange={(v) => set('payoutDayOfMonth', v)}
            hint="Capped at 28 so it always exists, including February"
          />
          <NumberField
            label="Cookie duration (days)"
            value={form.cookieDurationDays}
            onChange={(v) => set('cookieDurationDays', v)}
            hint="How long after a click a signup is still attributed"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Accrual schedule</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Accrual interval (hours)"
            value={form.accrualIntervalHours}
            onChange={(v) => set('accrualIntervalHours', v)}
            hint="How often earnings are added. Batched rather than per-message."
          />
          <NumberField
            label="Re-scan window (hours)"
            value={form.accrualLookbackHours}
            onChange={(v) => set('accrualLookbackHours', v)}
            hint="Each run re-checks this far back to catch late deliveries. Safe — duplicates are impossible."
          />
        </div>
      </section>

      <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
        {save.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Save settings
      </Button>

      <section className="space-y-3 rounded-xl border bg-muted/20 p-5">
        <h2 className="font-semibold">Run jobs manually</h2>
        <p className="text-sm text-muted-foreground">
          These run on a schedule automatically. Triggering them here is safe —
          accrual and payouts are both idempotent, so nothing is ever paid twice.
        </p>
        <div className="flex flex-wrap gap-2">
          <JobButton icon={Play} label="Run accrual" run={runAccrualJob} />
          <JobButton icon={Banknote} label="Run payouts" run={runPayoutJob} />
          <JobButton icon={RefreshCw} label="Reconcile totals" run={runReconcileJob} />
        </div>
      </section>
    </div>
  );
}

function JobButton({
  icon: Icon,
  label,
  run,
}: {
  icon: typeof Play;
  label: string;
  run: () => Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: run,
    onSuccess: (result) => {
      toast.success(`${label} finished`, {
        description: JSON.stringify(result).slice(0, 200),
      });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <Button variant="outline" size="sm" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
      {mutation.isPending ? (
        <Loader2 className="mr-1 size-4 animate-spin" />
      ) : (
        <Icon className="mr-1 size-4" />
      )}
      {label}
    </Button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  step?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="number"
        step={step}
        min={0}
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
