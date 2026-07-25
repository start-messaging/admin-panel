import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPayouts,
  approvePayout,
  rejectPayout,
  type PayoutStatus,
} from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { formatMicros } from '@/lib/money';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';

type FilterTab = 'all' | PayoutStatus;

const STATUS_TONE: Record<PayoutStatus, string> = {
  requested: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'paid', label: 'Paid' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

export function PayoutsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<FilterTab>('requested');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payouts', tab],
    queryFn: () =>
      getPayouts({
        page: 1,
        limit: 50,
        status: tab === 'all' ? undefined : tab,
      }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });

  const approve = useMutation({
    mutationFn: (input: { id: string; ref?: string }) =>
      approvePayout(input.id, input.ref),
    onSuccess: () => {
      toast.success('Payout marked as paid');
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const reject = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      rejectPayout(input.id, input.reason),
    onSuccess: () => {
      toast.success('Payout rejected — funds returned to partner');
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const payouts = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Affiliate Payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and process partner withdrawal requests.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition',
              tab === key
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : payouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No payouts in this view.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Partner</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {payouts.map((p) => {
                const upi =
                  (p.payoutDetails?.upiId as string | undefined) ??
                  (p.payoutDetails?.accountNumber as string | undefined) ??
                  '—';
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      {p.partnerName ?? p.partnerEmail ?? p.partnerId}
                      {p.partnerName && p.partnerEmail && (
                        <span className="block text-xs text-muted-foreground">
                          {p.partnerEmail}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatMicros(p.amountMicros)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{upi}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.windowMonth}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_TONE[p.status],
                        )}
                      >
                        {p.status}
                      </span>
                      {p.rejectionReason && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {p.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'requested' && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={approve.isPending}
                            onClick={() => {
                              const ref =
                                window.prompt(
                                  'Transfer reference / UTR (optional)',
                                ) ?? undefined;
                              approve.mutate({
                                id: p.id,
                                ref: ref || undefined,
                              });
                            }}
                          >
                            <Check className="size-4" />
                            Mark paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reject.isPending}
                            onClick={() => {
                              const reason = window.prompt(
                                'Reason for rejection?',
                              );
                              if (reason) reject.mutate({ id: p.id, reason });
                            }}
                          >
                            <X className="size-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
