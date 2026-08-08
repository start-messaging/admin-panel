import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Users, X } from 'lucide-react';
import { listTags } from '@/apis/admin.api';
import { previewAudience } from '@/apis/email.api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  EmailAudience,
  EmailAudienceFilter,
  ManualRecipient,
} from '@/types/email';

interface RecipientPickerProps {
  audience: EmailAudience;
  onChange: (audience: EmailAudience) => void;
  disabled?: boolean;
}

const KYC_OPTIONS = [
  { value: 'not_submitted', label: 'KYC not submitted' },
  { value: 'pending', label: 'KYC pending' },
  { value: 'approved', label: 'KYC approved' },
  { value: 'rejected', label: 'KYC rejected' },
] as const;

/** Loose on purpose — the admin can see what they pasted. */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

/**
 * Splits whatever was typed or pasted into addresses.
 *
 * Handles the shapes people actually paste: one per line, comma or semicolon
 * separated, and `Name <email>` out of a mail client. The alternative is an
 * admin hand-editing a list into the one format we decided to accept.
 */
function parseAddresses(raw: string): ManualRecipient[] {
  return raw
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((token) => {
      const angled = /^(.*?)<\s*([^>\s]+)\s*>$/.exec(token);
      const name = angled ? angled[1].trim().replace(/^["']|["']$/g, '') : '';
      const email = (angled ? angled[2] : token).trim().toLowerCase();
      const [firstName, ...rest] = name.split(/\s+/).filter(Boolean);
      return {
        email,
        firstName: firstName || undefined,
        lastName: rest.length ? rest.join(' ') : undefined,
      };
    })
    .filter((r) => EMAIL_RE.test(r.email));
}

/** True when the filter would select every customer. */
function isEmptyFilter(filter?: EmailAudienceFilter): boolean {
  if (!filter) return true;
  return Object.values(filter).every(
    (v) => v === undefined || v === '' || (Array.isArray(v) && v.length === 0),
  );
}

export function RecipientPicker({
  audience,
  onChange,
  disabled,
}: RecipientPickerProps) {
  const [input, setInput] = useState('');
  const [showSegment, setShowSegment] = useState(
    !isEmptyFilter(audience.filter),
  );

  const manual = useMemo(() => audience.manual ?? [], [audience.manual]);
  const filter = audience.filter ?? {};

  const { data: tags } = useQuery({
    queryKey: ['admin', 'tags'],
    queryFn: listTags,
    staleTime: 5 * 60 * 1000,
  });

  // Debounced through react-query's key rather than a timer: the key only
  // changes when the audience genuinely does, so typing a name into a chip
  // does not re-count the whole customer table.
  const audienceKey = JSON.stringify({
    filter: audience.filter,
    manual: manual.map((m) => m.email).sort(),
  });

  const { data: preview, isFetching: counting } = useQuery({
    queryKey: ['admin', 'email', 'audience', audienceKey],
    queryFn: () =>
      previewAudience({
        filter: audience.filter,
        manual,
      }),
    enabled: manual.length > 0 || !isEmptyFilter(audience.filter),
    staleTime: 30 * 1000,
  });

  const addFromInput = (raw: string) => {
    const parsed = parseAddresses(raw);
    if (parsed.length === 0) return;

    const existing = new Set(manual.map((m) => m.email));
    const added = parsed.filter((p) => !existing.has(p.email));
    if (added.length === 0) {
      setInput('');
      return;
    }

    onChange({ ...audience, manual: [...manual, ...added] });
    setInput('');
  };

  const removeChip = (email: string) => {
    onChange({ ...audience, manual: manual.filter((m) => m.email !== email) });
  };

  const patchFilter = (patch: Partial<EmailAudienceFilter>) => {
    onChange({ ...audience, filter: { ...filter, ...patch } });
  };

  return (
    <div className="space-y-2">
      {/* To row */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 rounded-xl border bg-background px-3 py-2 focus-within:border-ring',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <span className="text-sm text-muted-foreground">To</span>

        {!isEmptyFilter(audience.filter) && (
          <button
            type="button"
            onClick={() => setShowSegment((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 py-0.5 pl-2 pr-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
          >
            <Users className="size-3" />
            {counting ? 'counting…' : `${preview?.segmentCount ?? 0} customers`}
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear segment"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ ...audience, filter: undefined });
                setShowSegment(false);
              }}
              className="flex size-4 items-center justify-center rounded-full hover:bg-blue-300/60"
            >
              <X className="size-2.5" />
            </span>
          </button>
        )}

        {manual.map((m) => (
          <span
            key={m.email}
            className="inline-flex items-center gap-1.5 rounded-full bg-muted py-0.5 pl-2 pr-1 text-xs font-medium"
            title={m.email}
          >
            <span className="max-w-[180px] truncate">
              {m.firstName ? `${m.firstName} · ${m.email}` : m.email}
            </span>
            <button
              type="button"
              aria-label={`Remove ${m.email}`}
              onClick={() => removeChip(m.email)}
              className="flex size-4 items-center justify-center rounded-full hover:bg-foreground/10"
            >
              <X className="size-2.5" />
            </button>
          </span>
        ))}

        <input
          className="h-6 min-w-[180px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder={
            manual.length || !isEmptyFilter(audience.filter)
              ? 'Add more…'
              : 'Type or paste addresses, or add a segment'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
              e.preventDefault();
              addFromInput(input);
            }
            // Backspace on an empty box removes the last chip, which is what
            // every mail client does and what fingers expect.
            if (e.key === 'Backspace' && !input && manual.length) {
              removeChip(manual[manual.length - 1].email);
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            if (!/[\n,;]/.test(text)) return;
            e.preventDefault();
            addFromInput(text);
          }}
          onBlur={() => addFromInput(input)}
        />

        {isEmptyFilter(audience.filter) && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setShowSegment((s) => !s)}
          >
            <Plus className="size-3" />
            Segment
          </Button>
        )}
      </div>

      {/* Segment builder */}
      {showSegment && (
        <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Customer segment
            </p>
            {!isEmptyFilter(audience.filter) && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => onChange({ ...audience, filter: undefined })}
              >
                Clear
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Account</span>
              <select
                className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                value={filter.status ?? ''}
                onChange={(e) =>
                  patchFilter({
                    status:
                      (e.target.value as 'active' | 'suspended') || undefined,
                  })
                }
              >
                <option value="">Any</option>
                <option value="active">Active only</option>
                <option value="suspended">Suspended only</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Country</span>
              <input
                className="h-8 w-full rounded-md border bg-background px-2 text-sm uppercase"
                placeholder="IN"
                maxLength={2}
                value={filter.country ?? ''}
                onChange={(e) =>
                  patchFilter({
                    country: e.target.value.toUpperCase() || undefined,
                  })
                }
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Signed up after</span>
              <input
                type="date"
                className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                value={filter.createdAfter?.slice(0, 10) ?? ''}
                onChange={(e) =>
                  patchFilter({
                    createdAfter: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : undefined,
                  })
                }
              />
            </label>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">KYC status</span>
            <div className="flex flex-wrap gap-1.5">
              {KYC_OPTIONS.map((opt) => {
                const active = filter.kycStatus?.includes(opt.value) ?? false;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      const current = filter.kycStatus ?? [];
                      const next = active
                        ? current.filter((v) => v !== opt.value)
                        : [...current, opt.value];
                      patchFilter({
                        kycStatus: next.length ? next : undefined,
                      });
                    }}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'border-transparent bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted',
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {tags && tags.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                Carrying any of these tags
              </span>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const active = filter.tagIds?.includes(tag.id) ?? false;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        const current = filter.tagIds ?? [];
                        const next = active
                          ? current.filter((v) => v !== tag.id)
                          : [...current, tag.id];
                        patchFilter({ tagIds: next.length ? next : undefined });
                      }}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        active
                          ? 'border-transparent bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted',
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border"
              checked={filter.neverToppedUp ?? false}
              onChange={(e) =>
                patchFilter({ neverToppedUp: e.target.checked || undefined })
              }
            />
            Only accounts that have never topped up
          </label>
        </div>
      )}

      {/* Resolved audience summary */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
        {counting ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" />
            Counting audience…
          </span>
        ) : preview ? (
          <>
            <span className="font-medium text-foreground">
              {preview.total.toLocaleString('en-IN')} will receive this
            </span>
            {preview.segmentCount > 0 && (
              <span>{preview.segmentCount.toLocaleString('en-IN')} from segment</span>
            )}
            {preview.manualCount > 0 && (
              <span>{preview.manualCount} added by hand</span>
            )}
            {preview.suppressedCount > 0 && (
              <span className="text-amber-600">
                {preview.suppressedCount} skipped — already unsubscribed
              </span>
            )}
          </>
        ) : (
          <span>No recipients yet</span>
        )}
      </div>
    </div>
  );
}
