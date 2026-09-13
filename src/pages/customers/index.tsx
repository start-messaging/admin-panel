import { useState } from 'react';
import { UserTagsEditor } from '@/components/tags/user-tags-editor';
import { Link } from 'react-router-dom';
import {
  Loader2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Pencil,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getApiErrorMessage } from '@/lib/api-error';
import { isoToDatetimeLocalValue } from '@/lib/datetime';
import {
  ACCOUNT_STATUS_HELP,
  CUSTOMERS_COLUMN_HELP,
  KYC_STATUS_HELP,
} from '@/lib/help-copy';
import { cn } from '@/lib/utils';
import { HeaderTooltip } from '@/components/common/header-tooltip';
import { HelpBadge } from '@/components/common/help-badge';
import { Pagination } from '@/components/ui/pagination';
import type { UserListSortBy } from '@/apis/admin.api';
import { useAdminUsersList, useUpdateAdminUser } from '@/hooks/admin';
import {
  ACCOUNT_STATUS_OPTIONS,
  KYC_STATUS_OPTIONS,
} from '@/hooks/admin/useAdminUsersList';
import type { KycStatus, User } from '@/types';

const USER_LIST_SORT_KEYS: UserListSortBy[] = [
  'created_at',
  'name',
  'email',
  'last_called',
  'last_login',
  'kyc_status',
  'role',
  'wallet_balance',
];

function parseSortPreset(preset: string): {
  sortBy: UserListSortBy;
  sortOrder: 'asc' | 'desc';
} {
  const [by, ord] = preset.split(':');
  const sortBy = USER_LIST_SORT_KEYS.includes(by as UserListSortBy)
    ? (by as UserListSortBy)
    : 'created_at';
  const sortOrder = ord === 'asc' ? 'asc' : 'desc';
  return { sortBy, sortOrder };
}

const KYC_FILTER_OPTIONS: { value: KycStatus | ''; label: string }[] = [
  { value: '', label: 'All KYC' },
  { value: 'not_submitted', label: 'Unverified' },
  { value: 'pending', label: 'Pending review' },
  { value: 'approved', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

const SORT_PRESETS: { value: string; label: string }[] = [
  { value: 'created_at:desc', label: 'Signup: newest first' },
  { value: 'created_at:asc', label: 'Signup: oldest first' },
  { value: 'name:asc', label: 'Name: A → Z' },
  { value: 'name:desc', label: 'Name: Z → A' },
  { value: 'email:asc', label: 'Email: A → Z' },
  { value: 'email:desc', label: 'Email: Z → A' },
  { value: 'wallet_balance:desc', label: 'Balance: highest first' },
  { value: 'wallet_balance:asc', label: 'Balance: lowest first' },
  { value: 'last_called:desc', label: 'Last called: most recent' },
  { value: 'last_called:asc', label: 'Last called: least recent' },
  { value: 'last_login:desc', label: 'Last login: most recent' },
  { value: 'last_login:asc', label: 'Last login: least recent' },
  { value: 'kyc_status:asc', label: 'KYC status (A → Z)' },
  { value: 'kyc_status:desc', label: 'KYC status (Z → A)' },
  { value: 'role:asc', label: 'Role: A → Z' },
  { value: 'role:desc', label: 'Role: Z → A' },
];

function CustomerNotesCell({ notes }: { notes: string | null | undefined }) {
  const text = notes?.trim() ?? '';
  if (!text) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <span
            {...props}
            className={cn(
              'block w-full min-w-0 cursor-default text-left break-words text-muted-foreground',
              'line-clamp-3',
              props.className,
            )}
          >
            {text}
          </span>
        )}
      />
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className="max-w-sm text-balance whitespace-pre-wrap"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function formatINR(amount: number | undefined) {
  if (amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function CallTrackingEditModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(user.adminCallNotes ?? '');
  const [lastCalled, setLastCalled] = useState(isoToDatetimeLocalValue(user.adminLastCalledAt));

  const updateUser = useUpdateAdminUser();

  function handleSave() {
    updateUser.mutate(
      {
        userId: user.id,
        payload: {
          adminCallNotes: notes.trim() === '' ? null : notes,
          adminLastCalledAt:
            lastCalled.trim() === '' ? null : new Date(lastCalled).toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast.success('Saved');
          onClose();
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border bg-background p-5 shadow-lg"
        role="dialog"
        aria-labelledby="call-tracking-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="call-tracking-title" className="text-lg font-semibold">
          Call tracking
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {user.firstName} {user.lastName} — only visible to admins.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Last called
            </label>
            <input
              type="datetime-local"
              className="h-10 w-full rounded-md border bg-background px-3 text-base sm:h-9 sm:text-sm"
              value={lastCalled}
              onChange={(e) => setLastCalled(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9"
                onClick={() => setLastCalled(isoToDatetimeLocalValue(new Date().toISOString()))}
              >
                Set to now
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => setLastCalled('')}
              >
                Clear
              </Button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Notes
            </label>
            <textarea
              className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-base sm:text-sm"
              placeholder="Call outcome, follow-up…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9"
            disabled={updateUser.isPending}
            onClick={handleSave}
          >
            {updateUser.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

const KYC_BADGE: Record<
  KycStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-700',
    icon: Clock,
  },
  approved: {
    label: 'Verified',
    className: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
  not_submitted: {
    label: 'Unverified',
    className: 'bg-gray-100 text-gray-500',
    icon: Shield,
  },
};

const BADGE_BASE =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium';

function KycBadge({ status }: { status: KycStatus }) {
  const kyc = KYC_BADGE[status];
  const Icon = kyc.icon;
  return (
    <HelpBadge help={KYC_STATUS_HELP[status]} className={cn(BADGE_BASE, kyc.className)}>
      <Icon className="size-3" />
      {kyc.label}
    </HelpBadge>
  );
}

function AccountBadge({ isActive }: { isActive: boolean }) {
  return (
    <HelpBadge
      help={isActive ? ACCOUNT_STATUS_HELP.active : ACCOUNT_STATUS_HELP.suspended}
      className={cn(
        BADGE_BASE,
        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
      )}
    >
      <span
        className={cn('size-1.5 rounded-full', isActive ? 'bg-green-500' : 'bg-red-500')}
      />
      {isActive ? 'Active' : 'Suspended'}
    </HelpBadge>
  );
}

function RoleBadge({ role }: { role: User['role'] }) {
  return (
    <span
      className={cn(
        BADGE_BASE,
        'capitalize',
        role === 'admin' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700',
      )}
    >
      {role}
    </span>
  );
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * The phone-sized rendering of one customer.
 *
 * A ten-column table on a 390px screen is a horizontal-scrolling puzzle, so
 * below `md` the same row is re-laid out as a card: identity and balance on
 * the first line (the two things an admin scans for), then state, then the
 * call-tracking detail that only matters once a specific customer is found.
 */
function CustomerCard({
  user,
  onEditTracking,
}: {
  user: User;
  onEditTracking: () => void;
}) {
  const notes = user.adminCallNotes?.trim() ?? '';

  return (
    <li className="p-4">
      <div className="flex items-start gap-3">
        <Link to={`/customers/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {user.firstName?.[0]}
            {user.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {user.firstName} {user.lastName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </Link>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Balance
          </p>
          <p className="font-semibold tabular-nums">{formatINR(user.walletBalance)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <KycBadge status={user.kycStatus} />
        <AccountBadge isActive={user.isActive} />
        <RoleBadge role={user.role} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Mobile</dt>
          <dd className="truncate font-mono">
            {user.mobileNumber ? (
              // Tapping a number on a phone should dial it.
              <a href={`tel:${user.mobileNumber}`} className="underline-offset-2 hover:underline">
                {user.mobileNumber}
              </a>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Joined</dt>
          <dd className="truncate">{formatDate(user.createdAt)}</dd>
        </div>
        <div className="col-span-2 min-w-0">
          <dt className="text-muted-foreground">Last called</dt>
          <dd className="truncate">{formatDateTime(user.adminLastCalledAt)}</dd>
        </div>
        {notes && (
          <div className="col-span-2 min-w-0">
            <dt className="text-muted-foreground">Notes</dt>
            <dd className="whitespace-pre-wrap break-words">{notes}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <UserTagsEditor
            userId={user.id}
            tags={user.tags ?? []}
            derivedTags={user.derivedTags ?? []}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 shrink-0"
          aria-label={`Edit call tracking for ${user.firstName} ${user.lastName}`}
          onClick={onEditTracking}
        >
          <Pencil className="size-4" />
          Call log
        </Button>
      </div>
    </li>
  );
}

export function CustomersPage() {
  const [trackingUser, setTrackingUser] = useState<User | null>(null);
  /** Mobile only — from `sm` up the filter row is always on screen. */
  const [showFilters, setShowFilters] = useState(false);

  const {
    data,
    isLoading,
    isPlaceholderData,
    filters,
    setFilters,
    setPage,
    setLimit,
    resetFilters,
    hasActiveFilters,
  } = useAdminUsersList();

  // The search box is uncontrolled between submissions: firing a request per
  // keystroke against a multi-column trigram search is wasteful, so the URL
  // (and the query) only update on Enter or the Search button.
  const [searchInput, setSearchInput] = useState(filters.search);

  const sortPreset = `${filters.sortBy}:${filters.sortOrder}`;
  const users = data?.data ?? [];
  const pagination = data?.pagination;

  // What the collapsed mobile panel hides: the search term has its own visible
  // box, so it is not counted here.
  const activeFilterCount =
    (filters.status ? 1 : 0) +
    (filters.kycStatus ? 1 : 0) +
    (sortPreset === 'created_at:desc' ? 0 : 1);

  function applySearch() {
    setFilters({ search: searchInput.trim() });
  }

  return (
    <div className="min-w-0 space-y-6">
      {trackingUser && (
        <CallTrackingEditModal
          key={trackingUser.id}
          user={trackingUser}
          onClose={() => setTrackingUser(null)}
        />
      )}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {pagination ? `${pagination.totalItems} total users` : 'Manage all platform users'}
            </p>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border bg-muted/30 p-3 sm:p-4">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[260px]">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <input
                type="search"
                enterKeyHint="search"
                placeholder="Name, email, mobile, company…"
                className="h-10 w-full rounded-md border bg-background px-3 text-base sm:h-9 sm:text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applySearch();
                }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-10 flex-1 sm:h-9 sm:flex-none"
                onClick={applySearch}
              >
                Search
              </Button>
              {/* Three selects eat the whole first screen on a phone, so below
                  `sm` they collapse behind a toggle that carries a count of the
                  ones already applied. */}
              <Button
                variant="outline"
                size="sm"
                className="h-10 flex-1 sm:hidden"
                aria-expanded={showFilters}
                onClick={() => setShowFilters((open) => !open)}
              >
                <SlidersHorizontal className="size-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          <div
            className={cn(
              'mt-3 min-w-0 flex-wrap items-end gap-x-2 gap-y-3 sm:flex',
              showFilters ? 'flex' : 'hidden',
            )}
          >
            <div className="flex w-full flex-col gap-1 sm:w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Account</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-base sm:h-9 sm:text-sm"
                value={filters.status}
                onChange={(e) =>
                  setFilters({
                    status: e.target.value as (typeof ACCOUNT_STATUS_OPTIONS)[number],
                  })
                }
              >
                <option value="">All accounts</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex w-full flex-col gap-1 sm:w-[180px]">
              <label className="text-xs font-medium text-muted-foreground">KYC status</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-base sm:h-9 sm:text-sm"
                value={filters.kycStatus}
                onChange={(e) =>
                  setFilters({
                    kycStatus: e.target.value as (typeof KYC_STATUS_OPTIONS)[number],
                  })
                }
              >
                {KYC_FILTER_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-full flex-col gap-1 sm:w-[240px]">
              <label className="text-xs font-medium text-muted-foreground">Sort</label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-base sm:h-9 sm:text-sm"
                value={sortPreset}
                onChange={(e) => setFilters(parseSortPreset(e.target.value))}
              >
                {SORT_PRESETS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-full shrink-0 text-muted-foreground sm:h-9 sm:w-auto"
                onClick={() => {
                  setSearchInput('');
                  resetFilters();
                }}
              >
                <X className="mr-1 size-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
          <Users className="mb-2 size-10 opacity-40" />
          <p className="text-sm">No users found</p>
        </div>
      ) : (
        <>
          {/* Phones get cards, not a sideways table. The old wrapper also set
              `touch-action: pan-x`, which told the browser a finger on the
              table could only pan horizontally — so the page itself would not
              scroll vertically while the table was under the thumb. */}
          <ul className="divide-y overflow-hidden rounded-xl border md:hidden">
            {users.map((user) => (
              <CustomerCard
                key={user.id}
                user={user}
                onEditTracking={() => setTrackingUser(user)}
              />
            ))}
          </ul>

          <div className="hidden max-w-full overflow-hidden rounded-xl border md:block">
            <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-px px-2 py-3 text-left font-medium text-muted-foreground">
                  <span className="sr-only">Edit</span>
                </th>
                <th className="min-w-[200px] px-4 py-3 text-left font-medium text-muted-foreground">
                  User
                </th>
                <th className="min-w-[120px] px-4 py-3 text-left font-medium text-muted-foreground">
                  Mobile
                </th>
                <th className="min-w-[88px] px-4 py-3 text-right font-medium text-muted-foreground">
                  <HeaderTooltip label="Balance" help={CUSTOMERS_COLUMN_HELP.balance} />
                </th>
                <th className="min-w-[100px] px-4 py-3 text-left font-medium text-muted-foreground">
                  <HeaderTooltip label="KYC" help={CUSTOMERS_COLUMN_HELP.kyc} />
                </th>
                <th className="min-w-[100px] px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="min-w-[168px] px-4 py-3 text-left font-medium text-muted-foreground">
                  <HeaderTooltip label="Last called" help={CUSTOMERS_COLUMN_HELP.lastCalled} />
                </th>
                <th className="min-w-[248px] px-4 py-3 text-left font-medium text-muted-foreground">
                  <HeaderTooltip label="Notes" help={CUSTOMERS_COLUMN_HELP.notes} />
                </th>
                <th className="min-w-[88px] px-4 py-3 text-left font-medium text-muted-foreground">
                  Role
                </th>
                <th className="min-w-[96px] px-4 py-3 text-left font-medium text-muted-foreground">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                return (
                  <tr
                    key={user.id}
                    className="border-b last:border-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="w-px px-2 py-3 align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Edit call tracking for ${user.firstName} ${user.lastName}`}
                        onClick={() => setTrackingUser(user)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    </td>
                    <td className="min-w-[200px] px-4 py-3">
                      <Link
                        to={`/customers/${user.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {user.firstName?.[0]}
                          {user.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium hover:underline">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </Link>
                      {/* Outside the Link on purpose: nested inside it, every
                          tag click would navigate to the customer instead of
                          editing. stopPropagation guards the row handler too. */}
                      <div
                        className="mt-1.5 pl-12"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <UserTagsEditor
                          userId={user.id}
                          tags={user.tags ?? []}
                          derivedTags={user.derivedTags ?? []}
                        />
                      </div>
                    </td>
                    <td className="min-w-[120px] px-4 py-3 font-mono text-xs text-muted-foreground">
                      {user.mobileNumber ?? '—'}
                    </td>
                    <td className="min-w-[88px] px-4 py-3 text-right font-medium tabular-nums">
                      {formatINR(user.walletBalance)}
                    </td>
                    <td className="min-w-[100px] px-4 py-3">
                      <KycBadge status={user.kycStatus} />
                    </td>
                    <td className="min-w-[100px] px-4 py-3">
                      <AccountBadge isActive={user.isActive} />
                    </td>
                    <td className="min-w-[168px] whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateTime(user.adminLastCalledAt)}
                    </td>
                    <td className="min-w-[248px] px-4 py-3 align-top">
                      <CustomerNotesCell notes={user.adminCallNotes} />
                    </td>
                    <td className="min-w-[88px] px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="min-w-[96px] px-4 py-3 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            </div>
          </div>
        </>
      )}

      <Pagination
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={isPlaceholderData}
        itemLabel="customers"
      />
    </div>
  );
}
