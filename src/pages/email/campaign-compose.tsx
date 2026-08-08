import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  Loader2,
  PenLine,
  Save,
  Send,
  TestTube2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  createCampaign,
  getCampaign,
  getEmailStatus,
  renderPreview,
  sendCampaign,
  sendTestEmail,
  updateCampaign,
  type CampaignPayload,
} from '@/apis/email.api';
import { RichTextEditor } from '@/components/email/rich-text-editor';
import { RecipientPicker } from '@/components/email/recipient-picker';
import { EmailPreview } from '@/components/email/email-preview';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { EmailAudience, EmailCampaign } from '@/types/email';

const EMPTY_BODY = '<p></p>';

/** Debounces a value so the preview does not re-render on every keystroke. */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Loads an existing draft, then hands it to the composer as initial state.
 *
 * The split exists so `Composer` can seed its `useState` calls directly from
 * the loaded campaign. Copying a query result into state inside an effect —
 * the obvious alternative — renders twice on every load and, worse, fires
 * again on any background refetch, overwriting whatever the admin has typed
 * since. That is the classic way an autosaving editor eats a paragraph.
 */
export function CampaignComposePage() {
  const { id } = useParams<{ id: string }>();

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin', 'email', 'campaign', id],
    queryFn: () => getCampaign(id as string),
    enabled: Boolean(id),
  });

  if (id && isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Keyed on the campaign so navigating from one draft straight to another
  // remounts with the new content rather than keeping the first one's state.
  return <Composer key={existing?.id ?? 'new'} initial={existing} />;
}

function Composer({ initial }: { initial?: EmailCampaign }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState(initial?.name ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [preheader, setPreheader] = useState(initial?.preheader ?? '');
  const [bodyHtml, setBodyHtml] = useState(initial?.bodyHtml || EMPTY_BODY);
  const [replyTo, setReplyTo] = useState(initial?.replyTo ?? '');
  const [audience, setAudience] = useState<EmailAudience>({
    filter: initial?.audienceFilter ?? undefined,
  });
  const [previewFor, setPreviewFor] = useState('');
  const [mobileTab, setMobileTab] = useState<'compose' | 'preview'>('compose');
  const [confirmingSend, setConfirmingSend] = useState(false);

  /** The id we are editing — set after the first save of a new campaign. */
  const [campaignId, setCampaignId] = useState<string | undefined>(initial?.id);

  const { data: status } = useQuery({
    queryKey: ['admin', 'email', 'status'],
    queryFn: getEmailStatus,
    staleTime: 60 * 1000,
  });

  const debouncedSubject = useDebounced(subject, 400);
  const debouncedBody = useDebounced(bodyHtml, 400);
  const debouncedPreheader = useDebounced(preheader, 400);
  const debouncedPreviewFor = useDebounced(previewFor, 600);

  const { data: preview, isFetching: previewLoading } = useQuery({
    queryKey: [
      'admin',
      'email',
      'preview',
      debouncedSubject,
      debouncedBody,
      debouncedPreheader,
      debouncedPreviewFor,
    ],
    queryFn: () =>
      renderPreview({
        subject: debouncedSubject || '(no subject)',
        bodyHtml: debouncedBody,
        preheader: debouncedPreheader || undefined,
        previewFor: debouncedPreviewFor.includes('@')
          ? debouncedPreviewFor
          : undefined,
      }),
    staleTime: 30 * 1000,
  });

  const payload = useMemo<CampaignPayload>(
    () => ({
      // Falls back to the subject so a campaign never shows up in the list
      // as "Untitled" just because nobody filled in the internal label.
      name: name.trim() || subject.trim() || 'Untitled campaign',
      subject: subject.trim(),
      bodyHtml,
      preheader: preheader.trim() || undefined,
      replyTo: replyTo.trim() || undefined,
      audience,
    }),
    [name, subject, bodyHtml, preheader, replyTo, audience],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (campaignId) return updateCampaign(campaignId, payload);
      return createCampaign(payload);
    },
    onSuccess: (campaign) => {
      setCampaignId(campaign.id);
      queryClient.invalidateQueries({ queryKey: ['admin', 'email', 'campaigns'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (to: string) => {
      const campaign = await saveMutation.mutateAsync();
      return sendTestEmail(campaign.id, to);
    },
    onSuccess: (result) => toast.success(`Test sent to ${result.to}`),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const campaign = await saveMutation.mutateAsync();
      return sendCampaign(campaign.id);
    },
    onSuccess: (campaign) => {
      toast.success(`Sending to ${campaign.totalRecipients} recipients`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'email'] });
      navigate(`/email/${campaign.id}`);
    },
    onError: (error) => {
      setConfirmingSend(false);
      toast.error(getApiErrorMessage(error));
    },
  });

  const isBusy =
    saveMutation.isPending || sendMutation.isPending || testMutation.isPending;

  const bodyIsEmpty = !bodyHtml || bodyHtml === EMPTY_BODY;
  const canSend = Boolean(subject.trim()) && !bodyIsEmpty && !isBusy;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(ROUTES.EMAIL)}
            aria-label="Back to campaigns"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <input
            className="min-w-0 flex-1 bg-transparent text-xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/60"
            placeholder="Campaign name (internal)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            onClick={() => {
              saveMutation.mutate(undefined, {
                onSuccess: () => toast.success('Draft saved'),
                onError: (error) => toast.error(getApiErrorMessage(error)),
              });
            }}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save draft
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={!canSend}
            onClick={() => {
              const to = window.prompt('Send a test copy to which address?');
              if (to) testMutation.mutate(to);
            }}
          >
            {testMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <TestTube2 className="size-4" />
            )}
            Test
          </Button>

          <Button
            size="sm"
            disabled={!canSend}
            onClick={() => setConfirmingSend(true)}
          >
            <Send className="size-4" />
            Send
          </Button>
        </div>
      </div>

      {/* Transport warnings */}
      {status && !status.isConfigured && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Sending is not configured</p>
            <p className="mt-0.5 text-amber-700">
              The transport is <code>{status.name}</code>, which only logs
              messages. Set the <code>CAMPAIGN_*</code> environment variables to
              send for real. You can still write and preview.
            </p>
          </div>
        </div>
      )}
      {status?.isConfigured && !status.trackingConfigured && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            <code>CAMPAIGN_TRACKING_SECRET</code> is unset, so opens, clicks and
            unsubscribes will not be recorded — and the unsubscribe link will
            not work.
          </p>
        </div>
      )}

      {/* Mobile tab switch */}
      <div className="flex gap-1 rounded-lg border bg-muted/30 p-1 lg:hidden">
        {(['compose', 'preview'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              mobileTab === tab
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            {tab === 'compose' ? (
              <PenLine className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Composer */}
        <div
          className={cn(
            'space-y-3',
            mobileTab === 'preview' && 'hidden lg:block',
          )}
        >
          <RecipientPicker
            audience={audience}
            onChange={setAudience}
            disabled={isBusy}
          />

          <input
            className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-ring"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <input
            className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-ring"
            placeholder="Preview text — the line shown next to the subject in the inbox"
            value={preheader}
            onChange={(e) => setPreheader(e.target.value)}
          />

          <RichTextEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            mergeFields={status?.mergeFields ?? []}
            disabled={isBusy}
          />

          <input
            type="email"
            className="h-9 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:border-ring"
            placeholder="Reply-To (optional) — where replies should land"
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
          />

          {status && (
            <p className="px-1 text-xs text-muted-foreground">
              Sending from{' '}
              <span className="font-medium text-foreground">
                {status.fromEmail ?? 'not set'}
              </span>{' '}
              via {status.name} · {status.remainingToday} of{' '}
              {status.dailySendCap} sends left today ·{' '}
              {status.sendRatePerMinute}/min
            </p>
          )}
        </div>

        {/* Preview */}
        <div className={cn(mobileTab === 'compose' && 'hidden lg:block')}>
          <EmailPreview
            preview={preview}
            isLoading={previewLoading}
            previewFor={previewFor}
            onPreviewForChange={setPreviewFor}
          />
        </div>
      </div>

      {/* Send confirmation */}
      {confirmingSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-background p-5 shadow-xl">
            <h2 className="text-base font-semibold">Send this campaign?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Email cannot be recalled once it leaves. Recipients who
              unsubscribed are skipped automatically.
            </p>

            {status && status.remainingToday < 1 && (
              <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                Today's send cap is used up. The campaign will queue and pause
                until the window resets.
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmingSend(false)}
                disabled={sendMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending}
              >
                {sendMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Send now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
