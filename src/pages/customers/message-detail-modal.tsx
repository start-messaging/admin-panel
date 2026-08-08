import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminMessage } from '@/types';

/**
 * Everything the API knows about one message, including the fields no
 * customer response carries.
 *
 * It exists mainly to answer one question quickly: why did this message not
 * arrive? That is usually settled by reading "Text sent" against "Approved
 * template body" — an operator rejects on the exact rendered string, so a
 * stray variable, a doubled space or a smuggled app-hash shows up there and
 * nowhere else.
 */

const STATUS_BADGE: Record<string, string> = {
  delivered: 'bg-green-100 text-green-700',
  sent: 'bg-blue-100 text-blue-700',
  queued: 'bg-amber-100 text-amber-700',
  initiated: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

const formatINR = (amount: number | string) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(Number(amount));

const formatStamp = (value: string | null) =>
  value ? new Date(value).toLocaleString('en-IN') : '—';

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-xs">{children}</div>
    </div>
  );
}

function Mono({ value }: { value: string | null }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <p className="whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-2 font-mono text-[11px] leading-relaxed">
      {value}
    </p>
  );
}

export function MessageDetailModal({
  message,
  onClose,
}: {
  message: AdminMessage;
  onClose: () => void;
}) {
  const template = message.otpTemplate;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase',
                  STATUS_BADGE[message.status] ?? 'bg-gray-100 text-gray-600',
                )}
              >
                {message.status}
              </span>
              <span className="font-mono text-sm">{message.phoneNumber}</span>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              {message.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Template">
            {template ? (
              <>
                <span className="font-medium">{template.name}</span>
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  ({template.status})
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">
                Fallback body — no template resolved
              </span>
            )}
          </Field>
          <Field label="Provider">
            <span className="text-muted-foreground">{message.provider}</span>
          </Field>
          <Field label="Cost">
            <span className="font-medium tabular-nums">
              {formatINR(message.costAmount)}
            </span>
          </Field>
          <Field label="Created">
            <span className="tabular-nums text-muted-foreground">
              {formatStamp(message.createdAt)}
            </span>
          </Field>
          <Field label="Sent">
            <span className="tabular-nums text-muted-foreground">
              {formatStamp(message.sentAt)}
            </span>
          </Field>
          <Field label="Delivered">
            <span className="tabular-nums text-muted-foreground">
              {formatStamp(message.deliveredAt)}
            </span>
          </Field>
        </div>

        <div className="mb-4 space-y-3">
          <Field label="Text sent to provider (digits masked)">
            <Mono value={message.renderedContent} />
            {!message.renderedContent && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                Not recorded — this message predates message-text capture.
              </p>
            )}
          </Field>

          {template && (
            <Field label="Approved template body">
              <Mono value={template.body} />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Operators match the rendered text against this. Any difference
                beyond the substituted variables is a likely DLT rejection.
              </p>
            </Field>
          )}
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <Field label="Shown to customer">
            {message.failureReason ? (
              <p className="whitespace-pre-wrap break-words leading-snug text-muted-foreground">
                {message.failureReason}
              </p>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Field>
          <Field label="Provider's own wording (admin only)">
            {message.providerFailureReason ? (
              <p className="whitespace-pre-wrap break-words rounded-md border border-amber-200 bg-amber-50 p-2 leading-snug text-amber-900">
                {message.providerFailureReason}
              </p>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Provider status detail">
            <span className="text-muted-foreground">
              {message.providerStatusDescription ?? '—'}
            </span>
          </Field>
          <Field label="Provider message id">
            <span className="break-all font-mono text-[10px] text-muted-foreground">
              {message.providerMsgId ?? '—'}
            </span>
          </Field>
        </div>

        {message.statusHistory?.length > 0 && (
          <Field label="Status history" className="mt-4 border-t pt-3">
            <ol className="space-y-1">
              {message.statusHistory.map((entry, i) => (
                <li key={i} className="flex items-center gap-2 text-[11px]">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase',
                      STATUS_BADGE[entry.status] ?? 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {entry.status}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString('en-IN')}
                  </span>
                </li>
              ))}
            </ol>
          </Field>
        )}
      </div>
    </div>
  );
}
