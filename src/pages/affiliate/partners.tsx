import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Handshake, Loader2, Percent } from 'lucide-react';
import {
  getAffiliateOverview,
  getPartners,
  setPartnerCommission,
  setPartnerStatus,
  type AdminPartner,
  type CommissionType,
  type PartnerStatus,
} from '@/apis/affiliate.api';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { enumParam, numberParam, stringParam, useUrlFilters } from '@/hooks/useUrlFilters';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Applications' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
] as const;

const FILTER_SCHEMA = {
  page: numberParam(1),
  limit: numberParam(20),
  search: stringParam(''),
  status: enumParam(['', 'pending', 'active', 'suspended', 'rejected'] as const, ''),
  sortBy: enumParam(['created_at', 'name', 'email', 'status', 'unpaid', 'lifetime', 'last_login'] as const, 'created_at'),
  sortOrder: enumParam(['ASC', 'DESC'] as const, 'DESC'),
} as const;

const STATUS_STYLE: Record<PartnerStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-red-100 text-red-700',
  rejected: 'bg-gray-200 text-gray-700',
};

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(n);
}

export function AffiliatePartnersPage() {
  const { filters, setFilters } = useUrlFilters(FILTER_SCHEMA);
  const [searchInput, setSearchInput] = useState(filters.search);
  const [rateEditor, setRateEditor] = useState<AdminPartner | null>(null);

  const { data: overview } = useQuery({
    queryKey: ['admin', 'affiliate', 'overview'],
    queryFn: getAffiliateOverview,
  });

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['admin', 'affiliate', 'partners', filters],
    queryFn: () =>
      getPartners({
        page: filters.page,
        limit: filters.limit,
        search: filters.search || undefined,
        status: (filters.status || undefined) as PartnerStatus | undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }),
    placeholderData: keepPreviousData,
  });

  const rows = data?.data ?? [];

  return (
    <div className="min-w-0 space-y-6">
      {rateEditor && (
        <CommissionModal partner={rateEditor} onClose={() => setRateEditor(null)} />
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Partners</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve applications and manage commission rates.
        </p>
      </div>

      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Active partners" value={String(overview.activePartners)} />
          <Stat label="Awaiting approval" value={String(overview.pendingApplications)} highlight={overview.pendingApplications > 0} />
          <Stat label="Owed to partners" value={formatINR(overview.totalAccrued)} />
          <Stat label="Paid out to date" value={formatINR(overview.totalPaid)} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
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
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Name, email, company or code…"
            className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-72"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setFilters({ search: searchInput.trim() })}
          />
          <Button variant="secondary" size="sm" className="h-9" onClick={() => setFilters({ search: searchInput.trim() })}>
            Search
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground">
          <Handshake className="size-10 opacity-30" />
          <p className="text-sm">No partners found</p>
        </div>
      ) : (
        <div className="max-w-full overflow-hidden rounded-xl border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Partner</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Rate</th>
                  <th className="px-4 py-3 text-right font-medium">Owed</th>
                  <th className="px-4 py-3 text-right font-medium">Lifetime</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <PartnerRow key={p.id} partner={p} onEditRate={() => setRateEditor(p)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        pagination={data?.pagination}
        onPageChange={(page) => setFilters({ page }, { keepPage: true })}
        onLimitChange={(limit) => setFilters({ limit })}
        isLoading={isPlaceholderData}
        itemLabel="partners"
      />
    </div>
  );
}

function PartnerRow({ partner, onEditRate }: { partner: AdminPartner; onEditRate: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: PartnerStatus) => setPartnerStatus(partner.id, { status }),
    onSuccess: () => {
      toast.success('Partner updated');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate'] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <tr className="border-b last:border-0 hover:bg-muted/20">
      <td className="px-4 py-3">
        <div className="font-medium">{partner.firstName} {partner.lastName}</div>
        <div className="text-xs text-muted-foreground">{partner.email}</div>
        {partner.companyName && (
          <div className="mt-0.5 w-fit rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {partner.companyName}
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs">{partner.referralCode}</td>
      <td className="px-4 py-3">
        {partner.commissionRate === null ? (
          <span className="text-xs text-muted-foreground">Global default</span>
        ) : (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
            {partner.commissionType === 'percent'
              ? `${Number(partner.commissionRate)}%`
              : formatINR(Number(partner.commissionRate))}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-medium tabular-nums">
        {formatINR(Number(partner.unpaidEarnings))}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
        {formatINR(Number(partner.lifetimeEarnings))}
      </td>
      <td className="px-4 py-3">
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLE[partner.status])}>
          {partner.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {partner.status === 'pending' && (
            <>
              <Button size="xs" onClick={() => mutation.mutate('active')} disabled={mutation.isPending}>
                Approve
              </Button>
              <Button size="xs" variant="destructive" onClick={() => mutation.mutate('rejected')} disabled={mutation.isPending}>
                Reject
              </Button>
            </>
          )}
          {partner.status === 'active' && (
            <Button size="xs" variant="destructive" onClick={() => mutation.mutate('suspended')} disabled={mutation.isPending}>
              Suspend
            </Button>
          )}
          {partner.status === 'suspended' && (
            <Button size="xs" onClick={() => mutation.mutate('active')} disabled={mutation.isPending}>
              Reactivate
            </Button>
          )}
          <Button size="xs" variant="outline" onClick={onEditRate}>
            <Percent className="size-3" />
            Rate
          </Button>
        </div>
      </td>
    </tr>
  );
}

/** Per-partner override. Clearing reverts to the global rate, which is not the
 *  same as copying today's global value onto the partner. */
function CommissionModal({ partner, onClose }: { partner: AdminPartner; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<CommissionType>(partner.commissionType ?? 'percent');
  const [rate, setRate] = useState(String(partner.commissionRate ?? ''));

  const mutation = useMutation({
    mutationFn: (payload: { commissionType: CommissionType | null; commissionRate: number | null }) =>
      setPartnerCommission(partner.id, payload),
    onSuccess: () => {
      toast.success('Commission updated');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'affiliate'] });
      onClose();
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="font-semibold">Commission override</h2>
          <p className="text-sm text-muted-foreground">
            {partner.firstName} {partner.lastName}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Type</label>
          <select
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value as CommissionType)}
          >
            <option value="percent">Percent of spend</option>
            <option value="flat">Flat per OTP</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            {type === 'percent' ? 'Rate (%)' : 'Rate (₹ per OTP)'}
          </label>
          <input
            type="number"
            step="0.25"
            min="0"
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            disabled={mutation.isPending || rate === ''}
            onClick={() => mutation.mutate({ commissionType: type, commissionRate: Number(rate) })}
          >
            {mutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save
          </Button>
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ commissionType: null, commissionRate: null })}
          >
            Use global
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn('rounded-xl border bg-card p-4', highlight && 'border-amber-300 bg-amber-50/50')}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
