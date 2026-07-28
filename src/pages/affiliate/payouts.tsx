import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, Loader2 } from 'lucide-react';
import {
  getAffiliatePayouts,
  updatePayout,
  type AdminPayout,
  type PayoutStatus,
} from '@/apis/affiliate.api';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { enumParam, numberParam, useUrlFilters } from '@/hooks/useUrlFilters';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';

const STATUS_TABS = [
  { value: 'pending', label: 'To pay' },
  { value: '', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
] as const;

const FILTER_SCHEMA = {
  page: numberParam(1),
  limit: numberParam(20),
  status: enumParam(['', 'pending', 'processing', 'paid', 'failed', 'on_hold'] as const, 'pending'),
} as const;

const STATUS_STYLE: Record<PayoutStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  on_hold: 'bg-gray-200 text-gray-700',
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n);
}

export function AffiliatePayoutsPage() {
  const { filters, setFilters } = useUrlFilters(FILTER_SCHEMA);
  const [settling, setSettling] = useState<AdminPayout | null>(null);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['admin', 'affiliate', 'payouts', filters],
    queryFn: () =>
      getAffiliatePayouts({
        page: filters.page,
        limit: filters.limit,
        status: (filters.status || undefined) as PayoutStatus | undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const rows = data?.data ?? [];

  return (
    <div className="min-w-0 space-y-6">
      {settling && <SettleModal payout={settling} onClose={() => setSettling(null)} />}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Partner payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Raised automatically each month for partners who meet both thresholds.
          Send the money, then record it here.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value || 'all'}
            onClick={() => setFilters({ status: tab.value })}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              filters.status === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
          <Banknote className="size-10 opacity-30" />
          <p className="text-sm">Nothing here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      {p.partner ? `${p.partner.firstName} ${p.partner.lastName}` : p.partnerId}
                    </h3>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLE[p.status])}>
                      {p.status.replace('_', ' ')}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{p.periodKey}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.partner?.email} · {p.commissionCount.toLocaleString('en-IN')} entries ·{' '}
                    {p.qualifiedReferralCount} paying referrals
                  </p>
                  <p className="mt-1 text-xs">
                    {p.payoutMethod ? (
                      <span className="text-muted-foreground">
                        {p.payoutMethod.toUpperCase()} · {p.payoutAccountName ?? '—'} · {p.payoutAccountRef ?? '—'}
                      </span>
                    ) : (
                      // Blocks the admin from "paying" a partner who never told
                      // us where to send it.
                      <span className="font-medium text-red-600">
                        No payout details on file — partner must add them first
                      </span>
                    )}
                  </p>
                  {p.paymentReference && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">Ref {p.paymentReference}</p>
                  )}
                  {p.failureReason && (
                    <p className="mt-1 text-xs text-red-600">{p.failureReason}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-xl font-bold tabular-nums">{formatINR(Number(p.amount))}</p>
                  {(p.status === 'pending' || p.status === 'processing' || p.status === 'on_hold') && (
                    <Button size="sm" onClick={() => setSettling(p)}>
                      Record outcome
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        pagination={data?.pagination}
        onPageChange={(page) => setFilters({ page }, { keepPage: true })}
        onLimitChange={(limit) => setFilters({ limit })}
        isLoading={isPlaceholderData}
        itemLabel="payouts"
      />
    </div>
  );
}

function SettleModal({ payout, onClose }: { payout: AdminPayout; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reference, setReference] = useState('');
  const [failureReason, setFailureReason] = useState('');

  const mutation = useMutation({
    mutationFn: (status: PayoutStatus) =>
      updatePayout(payout.id, {
        status,
        ...(status === 'paid' ? { paymentReference: reference } : {}),
        ...(status === 'failed' ? { failureReason } : {}),
      }),
    onSuccess: (_, status) => {
      toast.success(
        status === 'failed'
          ? 'Marked failed — the balance has returned to the partner and will retry next cycle'
          : 'Payout recorded',
      );
      void queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate'] });
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-xl border bg-card p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="font-semibold">Record payout outcome</h2>
          <p className="text-sm text-muted-foreground">
            {formatINR(Number(payout.amount))} · {payout.periodKey}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Transaction reference (if paid)</label>
          <input
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            placeholder="UTR / UPI reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Failure reason (if failed)</label>
          <input
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            placeholder="e.g. Invalid IFSC"
            value={failureReason}
            onChange={(e) => setFailureReason(e.target.value)}
          />
        </div>

        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Both outcomes are final. Marking failed returns the full amount to the
          partner's available balance so the next cycle picks it up again.
        </p>

        <div className="flex gap-2">
          <Button className="flex-1" disabled={mutation.isPending || !reference} onClick={() => mutation.mutate('paid')}>
            {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Mark paid
          </Button>
          <Button variant="destructive" disabled={mutation.isPending || !failureReason} onClick={() => mutation.mutate('failed')}>
            Mark failed
          </Button>
        </div>
      </div>
    </div>
  );
}
