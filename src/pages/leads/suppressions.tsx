import { useState } from 'react';
import { Loader2, MailX, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ActionTooltip } from '@/components/common/action-tooltip';
import { HeaderTooltip } from '@/components/common/header-tooltip';
import { HelpBadge } from '@/components/common/help-badge';
import { Pagination } from '@/components/ui/pagination';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  LEADS_ACTION_HELP,
  SUPPRESSION_FIELD_HELP,
  SUPPRESSION_REASON_HELP,
  SUPPRESSIONS_COLUMN_HELP,
} from '@/lib/help-copy';
import { cn } from '@/lib/utils';
import type { SuppressionReason } from '@/apis/leads.api';
import {
  useAddLeadSuppression,
  useAdminLeadSuppressions,
  useRemoveLeadSuppression,
} from '@/hooks/admin';

const REASON_BADGE: Record<SuppressionReason, string> = {
  unsubscribed: 'bg-amber-100 text-amber-700',
  bounced: 'bg-red-100 text-red-700',
  complaint: 'bg-violet-100 text-violet-700',
  manual: 'bg-gray-100 text-gray-500',
};

const REASON_OPTIONS: { value: SuppressionReason; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'complaint', label: 'Complaint' },
];

function AddSuppressionModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState<SuppressionReason>('manual');
  const [notes, setNotes] = useState('');
  const addSuppression = useAddLeadSuppression();

  function handleSubmit() {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Enter the email address to suppress.');
      return;
    }
    addSuppression.mutate(
      {
        email: trimmed,
        reason,
        notes: notes.trim() === '' ? undefined : notes.trim(),
      },
      {
        onSuccess: (data) => {
          toast.success(`${data.email} added to the suppression list`);
          onClose();
        },
        onError: (e) => toast.error(getApiErrorMessage(e)),
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
        aria-labelledby="add-suppression-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-suppression-title" className="text-lg font-semibold">
          Add suppression
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Outreach is never queued to a suppressed address, whatever the lead says.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              placeholder="person@example.com"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <HeaderTooltip label="Reason" help={SUPPRESSION_FIELD_HELP.reason} />
            </label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value as SuppressionReason)}
            >
              {REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Notes
            </label>
            <textarea
              className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="Why this address must not be contacted…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={addSuppression.isPending}
            onClick={handleSubmit}
          >
            {addSuppression.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              'Add suppression'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LeadSuppressionsPage() {
  const [addModalOpen, setAddModalOpen] = useState(false);

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
  } = useAdminLeadSuppressions();

  const removeSuppression = useRemoveLeadSuppression();

  // The search box is uncontrolled between submissions: the URL (and the
  // query) only update on Enter or the Search button.
  const [searchInput, setSearchInput] = useState(filters.search);

  const suppressions = data?.data ?? [];
  const pagination = data?.pagination;

  function applySearch() {
    setFilters({ search: searchInput.trim() });
  }

  function handleRemove(id: string, email: string) {
    if (
      !window.confirm(`Remove ${email} from the suppression list? Outreach to it becomes possible again.`)
    ) {
      return;
    }
    removeSuppression.mutate(id, {
      onSuccess: () => toast.success(`${email} removed from the suppression list`),
      onError: (e) => toast.error(getApiErrorMessage(e)),
    });
  }

  return (
    <div className="min-w-0 space-y-6">
      {addModalOpen && <AddSuppressionModal onClose={() => setAddModalOpen(false)} />}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Suppressions</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {pagination
                ? `${pagination.totalItems.toLocaleString('en-IN')} suppressed addresses`
                : 'Addresses cold outreach must never be sent to'}
            </p>
          </div>
          <Button size="sm" className="gap-2" onClick={() => setAddModalOpen(true)}>
            <Plus className="size-4" />
            Add suppression
          </Button>
        </div>

        <div className="min-w-0 rounded-lg border bg-muted/30 p-3 sm:p-4">
          <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-3">
            <div className="flex min-w-[min(100%,200px)] max-w-[280px] flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Search</label>
              <input
                type="search"
                enterKeyHint="search"
                placeholder="Email…"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applySearch();
                }}
              />
            </div>
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
      ) : suppressions.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
          <MailX className="mb-2 size-10 opacity-40" />
          <p className="text-sm">No suppressed addresses</p>
        </div>
      ) : (
        <div className="max-w-full overflow-hidden rounded-xl border">
          <div className="touch-pan-x overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="min-w-[220px] px-4 py-3 text-left font-medium text-muted-foreground">
                    <HeaderTooltip label="Email" help={SUPPRESSIONS_COLUMN_HELP.email} />
                  </th>
                  <th className="min-w-[120px] px-4 py-3 text-left font-medium text-muted-foreground">
                    <HeaderTooltip label="Reason" help={SUPPRESSIONS_COLUMN_HELP.reason} />
                  </th>
                  <th className="min-w-[240px] px-4 py-3 text-left font-medium text-muted-foreground">
                    Notes
                  </th>
                  <th className="min-w-[110px] px-4 py-3 text-left font-medium text-muted-foreground">
                    Added
                  </th>
                  <th className="w-px px-2 py-3 text-left font-medium text-muted-foreground">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {suppressions.map((suppression) => (
                  <tr
                    key={suppression.id}
                    className="border-b transition-colors last:border-0 hover:bg-muted/30"
                  >
                    <td className="min-w-[220px] px-4 py-3 font-medium break-all">
                      {suppression.email}
                    </td>
                    <td className="min-w-[120px] px-4 py-3">
                      <HelpBadge
                        help={SUPPRESSION_REASON_HELP[suppression.reason]}
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                          REASON_BADGE[suppression.reason],
                        )}
                      >
                        {suppression.reason}
                      </HelpBadge>
                    </td>
                    <td className="min-w-[240px] max-w-md px-4 py-3 text-muted-foreground">
                      <p className="break-words text-xs leading-snug whitespace-pre-wrap">
                        {suppression.notes ?? '—'}
                      </p>
                    </td>
                    <td className="min-w-[110px] px-4 py-3 text-muted-foreground">
                      {new Date(suppression.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="w-px px-2 py-3">
                      <ActionTooltip help={LEADS_ACTION_HELP.removeSuppression} side="left">
                        {(props) => (
                          <Button
                            {...props}
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${suppression.email} from the suppression list`}
                            disabled={removeSuppression.isPending}
                            onClick={() => handleRemove(suppression.id, suppression.email)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </ActionTooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={setLimit}
        isLoading={isPlaceholderData}
        itemLabel="suppressions"
      />
    </div>
  );
}
