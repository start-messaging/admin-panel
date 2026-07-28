import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import { getKycList } from '@/apis/admin.api';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { adminQueryKeys } from '@/hooks/admin';
import {
  enumParam,
  numberParam,
  stringParam,
  useUrlFilters,
} from '@/hooks/useUrlFilters';
import { cn } from '@/lib/utils';
import type { KycStatus } from '@/types';

const KYC_TAB_VALUES = [
  'all',
  'pending',
  'approved',
  'rejected',
] as const satisfies readonly (KycStatus | 'all')[];

const STATUS_TABS: { label: string; value: (typeof KYC_TAB_VALUES)[number] }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

const KYC_SORT_OPTIONS = [
  'submitted_at',
  'reviewed_at',
  'created_at',
  'name',
  'email',
  'business_name',
] as const;

/** Module-level so `useUrlFilters` can memoise on a stable identity. */
const KYC_FILTER_SCHEMA = {
  page: numberParam(1),
  limit: numberParam(15),
  // Pending is the working queue, so it stays the landing view — but it is now
  // in the URL, so a link can point at approved or rejected instead.
  status: enumParam(KYC_TAB_VALUES, 'pending'),
  search: stringParam(''),
  sortBy: enumParam(KYC_SORT_OPTIONS, 'submitted_at'),
  sortOrder: enumParam(['asc', 'desc'] as const, 'desc'),
} as const;

const STATUS_BADGE: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    className: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
};

export function KycReviewPage() {
  const { filters, setFilters, resetFilters, hasActiveFilters } =
    useUrlFilters(KYC_FILTER_SCHEMA);

  const activeTab = filters.status;

  // Uncontrolled between submissions so a multi-column trigram search only
  // runs when the reviewer is done typing.
  const [searchInput, setSearchInput] = useState(filters.search);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: adminQueryKeys.kycList(filters),
    queryFn: () =>
      getKycList({
        page: filters.page,
        limit: filters.limit,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        ...(activeTab !== 'all' && { status: activeTab as KycStatus }),
      }),
    placeholderData: keepPreviousData,
  });

  const users = data?.data ?? [];
  const pagination = data?.pagination;

  function applySearch() {
    setFilters({ search: searchInput.trim() });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">KYC Reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and manage customer KYC submissions
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Search KYC..."
            className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-[250px]"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applySearch();
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            className="h-9 shrink-0"
            onClick={applySearch}
          >
            Search
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 text-muted-foreground"
              onClick={() => {
                setSearchInput('');
                resetFilters();
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilters({ status: tab.value })}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
          <FileText className="mb-2 size-10 opacity-40" />
          <p className="text-sm">No KYC submissions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const badge = STATUS_BADGE[user.kycStatus];
            const BadgeIcon = badge?.icon;

            return (
              <Link
                key={user.id}
                to={`/kyc-review/${user.id}`}
                className="flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {user.firstName?.[0]}
                      {user.lastName?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  {user.businessName && (
                    <p className="ml-[3.25rem] mt-1 truncate text-sm text-muted-foreground">
                      {user.businessName}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  {user.kycSubmittedAt && (
                    <span className="hidden text-xs text-muted-foreground sm:block">
                      {new Date(user.kycSubmittedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                  {badge && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        badge.className,
                      )}
                    >
                      {BadgeIcon && <BadgeIcon className="size-3" />}
                      {badge.label}
                    </span>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination
        pagination={pagination}
        onPageChange={(page) => setFilters({ page }, { keepPage: true })}
        onLimitChange={(limit) => setFilters({ limit })}
        isLoading={isPlaceholderData}
        itemLabel="submissions"
      />
    </div>
  );
}
