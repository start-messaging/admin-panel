import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Loader2,
  PhoneCall,
  PhoneOff,
  StickyNote,
  TriangleAlert,
} from 'lucide-react';
import { ActionTooltip } from '@/components/common/action-tooltip';
import { HeaderTooltip } from '@/components/common/header-tooltip';
import { HelpBadge } from '@/components/common/help-badge';
import {
  RateCounts,
  RateReason,
  RateValue,
} from '@/components/common/rate-value';
import { Pagination } from '@/components/ui/pagination';
import { useAdminGrowthNotes, type NotesScope } from '@/hooks/admin';
import type { GrowthNotesSortBy } from '@/apis/growth.api';
import { ROUTES } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/datetime';
import {
  CALLING_STAT_HELP,
  KYC_STATUS_HELP,
  NOTES_COLUMN_HELP,
  NOTES_SCOPE_HELP,
  SIGNUPS_SECTION_HELP,
} from '@/lib/help-copy';
import { cn } from '@/lib/utils';
import type { GrowthCalling, KycStatus } from '@/types';
import { formatIstDateTime, formatIstDay } from './formatting';

/** Never-called accounts first: the list sorts NULLS FIRST on an ascending sort. */
const UNCALLED_QUEUE_LINK = `${ROUTES.CUSTOMERS}?sortBy=last_called&sortOrder=asc`;

const SCOPE_TABS: { value: NotesScope; label: string }[] = [
  { value: 'all', label: 'Everyone touched' },
  { value: 'true', label: 'With a note' },
  { value: 'false', label: 'Called, not written up' },
];

const NOTES_SORT_PRESETS: { value: string; label: string }[] = [
  { value: 'called_at:DESC', label: 'Called: most recent' },
  { value: 'called_at:ASC', label: 'Called: least recent' },
  { value: 'signed_up_at:DESC', label: 'Signup: newest first' },
  { value: 'signed_up_at:ASC', label: 'Signup: oldest first' },
  { value: 'name:ASC', label: 'Name: A → Z' },
  { value: 'email:ASC', label: 'Email: A → Z' },
];

const KYC_CHIP: Record<KycStatus, { label: string; className: string }> = {
  not_submitted: { label: 'Unverified', className: 'bg-gray-100 text-gray-600' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Verified', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
};

function StatBlock({
  label,
  help,
  value,
  detail,
  tone,
}: {
  label: string;
  help: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'default' | 'muted';
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <HeaderTooltip
        label={label}
        help={help}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      />
      <p
        className={cn(
          'mt-2 text-2xl font-bold tabular-nums',
          tone === 'muted' && 'text-muted-foreground',
        )}
      >
        {value}
      </p>
      {detail && <div className="mt-1 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

export function CallingSection({ calling }: { calling: GrowthCalling }) {
  const notes = useAdminGrowthNotes();
  const rows = notes.data?.data ?? [];
  const pagination = notes.data?.pagination;
  const scope = notes.filters.notesScope;
  const sortPreset = `${notes.filters.notesSortBy}:${notes.filters.notesSortOrder}`;

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Calling</h2>
          <HelpBadge
            help={calling.sourceNote}
            className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            self-reported
          </HelpBadge>
        </div>
        <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
          {SIGNUPS_SECTION_HELP.calling}
        </p>

        {/* Only when it happens. A permanent "0 notes without a call" line is
            noise; a non-zero one means coverage below is an undercount and
            somebody saved a note without setting the date. */}
        {calling.notedWithoutCall > 0 && (
          <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              {calling.notedWithoutCall.toLocaleString('en-IN')}{' '}
              {calling.notedWithoutCall === 1 ? 'account has' : 'accounts have'} a
              note but no call date, so coverage below is an undercount. Set the
              call date on those accounts from the customer list.
            </p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-background p-4">
            <HeaderTooltip
              label="Coverage"
              help={CALLING_STAT_HELP.coverage}
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            />
            <p className="mt-2 text-3xl font-bold tabular-nums">
              <RateValue rate={calling.coverage} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <RateCounts rate={calling.coverage} unit="signups called" />
            </p>
            {/* An em dash on its own invites the reader to assume zero. The
                server's sentence says which kind of nothing this is. */}
            <RateReason rate={calling.coverage} className="mt-1" />
          </div>

          <StatBlock
            label="Called"
            help={CALLING_STAT_HELP.called}
            value={calling.called.toLocaleString('en-IN')}
            detail={
              <>
                Last logged call {formatIstDateTime(calling.lastCalledAt)}
                {calling.staleDays !== null && (
                  <>
                    {' '}
                    <HelpBadge help={CALLING_STAT_HELP.staleDays}>
                      ({calling.staleDays.toLocaleString('en-IN')}d ago)
                    </HelpBadge>
                  </>
                )}
              </>
            }
          />

          <div className="rounded-lg border bg-background p-4">
            <HeaderTooltip
              label="Never called"
              help={CALLING_STAT_HELP.uncalled}
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            />
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {calling.uncalled.toLocaleString('en-IN')}
            </p>
            {calling.uncalled > 0 && (
              <Link
                to={UNCALLED_QUEUE_LINK}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Work the queue
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>

          <div className="rounded-lg border bg-background p-4">
            <HeaderTooltip
              label="Written up"
              help={CALLING_STAT_HELP.noteRate}
              className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            />
            <p className="mt-2 text-2xl font-bold tabular-nums">
              <RateValue rate={calling.noteRate} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <RateCounts rate={calling.noteRate} unit="calls have a note" />
            </p>
            <RateReason rate={calling.noteRate} className="mt-1" />
          </div>
        </div>
      </div>

      {/* The notes themselves. Asked for as content — "add some notes, show
          them too" — so they are rows to read, not a number on a card. */}
      <div className="rounded-xl border bg-card p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">What the callers wrote</h3>
          {pagination && pagination.totalItems >= 0 && (
            <span className="text-xs text-muted-foreground">
              {pagination.totalItems.toLocaleString('en-IN')} accounts touched
            </span>
          )}
        </div>
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          {SIGNUPS_SECTION_HELP.notes}
        </p>

        <div className="mb-4 flex flex-wrap items-end gap-x-2 gap-y-3">
          <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
            {SCOPE_TABS.map((tab) => (
              <ActionTooltip
                key={tab.value}
                help={NOTES_SCOPE_HELP[tab.value]}
                side="top"
              >
                {(props) => (
                  <button
                    {...props}
                    type="button"
                    onClick={() => notes.setScope(tab.value)}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      scope === tab.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tab.label}
                  </button>
                )}
              </ActionTooltip>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="notes-called-since"
              className="text-xs font-medium text-muted-foreground"
            >
              Called since
            </label>
            <input
              id="notes-called-since"
              type="date"
              value={notes.filters.notesSince}
              onChange={(e) => notes.setSince(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="notes-sort"
              className="text-xs font-medium text-muted-foreground"
            >
              Sort
            </label>
            <select
              id="notes-sort"
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={sortPreset}
              onChange={(e) => {
                const [by, order] = e.target.value.split(':');
                notes.setSort(by as GrowthNotesSortBy, order === 'ASC' ? 'ASC' : 'DESC');
              }}
            >
              {NOTES_SORT_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {notes.isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-muted-foreground">
            <StickyNote className="size-8 opacity-30" />
            <p className="max-w-md text-sm">
              {scope === 'false'
                ? 'Every logged call in this list has a note against it. Nothing to write up.'
                : scope === 'true'
                  ? 'No account has a call note written against it yet.'
                  : 'Nobody has been called or noted yet.'}
            </p>
          </div>
        ) : (
          <div className="max-w-full overflow-hidden rounded-lg border">
            <div className="touch-pan-x overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                    <th className="min-w-[200px] px-4 py-3 font-medium">Customer</th>
                    <th className="min-w-[170px] px-4 py-3 font-medium">
                      <HeaderTooltip
                        label="Called"
                        help={NOTES_COLUMN_HELP.calledAt}
                      />
                    </th>
                    <th className="min-w-[320px] px-4 py-3 font-medium">
                      <HeaderTooltip label="Note" help={NOTES_COLUMN_HELP.note} />
                    </th>
                    <th className="min-w-[150px] px-4 py-3 font-medium">
                      <HeaderTooltip
                        label="State today"
                        help={NOTES_COLUMN_HELP.state}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const chip = KYC_CHIP[row.kycStatus];

                    return (
                      <tr
                        key={row.userId}
                        className="border-b align-top transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/customers/${row.userId}`}
                            className="font-medium hover:underline"
                          >
                            {row.name ?? row.email}
                          </Link>
                          <p className="text-xs text-muted-foreground">{row.email}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Signed up {formatIstDay(row.signedUpAt)}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatIstDateTime(row.calledAt)}
                          <span className="block text-xs">
                            {formatRelativeTime(row.calledAt)}
                          </span>
                        </td>
                        {/* Wrapped, never truncated: the whole point of this
                            list is that the note is readable here. */}
                        <td className="max-w-xl px-4 py-3">
                          {row.note ? (
                            <p className="whitespace-pre-wrap break-words">
                              {row.note}
                            </p>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              Called, nothing written up
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <HelpBadge
                            help={KYC_STATUS_HELP[row.kycStatus]}
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              chip.className,
                            )}
                          >
                            {chip.label}
                          </HelpBadge>
                          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            {row.mobileVerified ? (
                              <>
                                <PhoneCall className="size-3" />
                                Mobile verified
                              </>
                            ) : (
                              <>
                                <PhoneOff className="size-3" />
                                Mobile unverified
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination
          className="mt-4"
          pagination={pagination}
          onPageChange={notes.setPage}
          onLimitChange={notes.setLimit}
          isLoading={notes.isPlaceholderData}
          itemLabel="accounts"
        />
      </div>
    </section>
  );
}
