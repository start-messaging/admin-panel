import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bug,
  CalendarClock,
  Download,
  Loader2,
  RefreshCw,
  Settings2,
  Wifi,
  Workflow,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ActionTooltip } from '@/components/common/action-tooltip';
import { HeaderTooltip } from '@/components/common/header-tooltip';
import { HelpBadge } from '@/components/common/help-badge';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatRelativeTime } from '@/lib/datetime';
import { PIPELINE_HELP } from '@/lib/help-copy';
import { cn } from '@/lib/utils';
import type {
  EnrichmentReadout,
  PipelineJobView,
  PipelineSettingsView,
  UpdatePipelineSettingsPayload,
} from '@/apis/leads.api';
import {
  useAdminLeadsPipeline,
  useAdminLeadsSettings,
  useRunEnrichSweep,
  useRunLeadIngest,
  useRunLivenessSweep,
  useUpdateLeadsSettings,
} from '@/hooks/admin';

/**
 * Queue and cron visibility for the leads machinery, on its own page so the
 * 5-second polling never rides along with the (much heavier) leads list.
 */

const COUNT_LABELS = [
  ['waiting', 'Waiting'],
  ['active', 'Active'],
  ['delayed', 'Delayed'],
  ['failed', 'Failed'],
  ['completed', 'Completed'],
] as const;

const JOB_SECTIONS = [
  ['active', 'Active'],
  ['waiting', 'Waiting'],
  ['delayed', 'Delayed'],
  ['failed', 'Failed'],
] as const;

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STOP_REASON_LABEL: Record<string, string> = {
  drained: 'ran out of eligible leads',
  disabled: 'switched off mid-run',
  'max-per-run': 'hit the per-run cap',
};

function CrawlerCard({ enrichment }: { enrichment: EnrichmentReadout }) {
  const { running, startedAt, processedThisRun, lastRun, todo, done } = enrichment;

  const tiles = [
    ['Never crawled', todo.pendingLive, PIPELINE_HELP.crawler.pendingLive],
    ['Stale re-crawl', todo.staleRecrawl, PIPELINE_HELP.crawler.staleRecrawl],
    ['Parked recheck', todo.parkedRecheckDue, PIPELINE_HELP.crawler.parkedRecheckDue],
    ['Crawled 24h', done.crawledLast24h, PIPELINE_HELP.crawler.crawledLast24h],
  ] as const;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <Bug className="size-4 text-muted-foreground" />
          <HeaderTooltip label="Crawler" help={PIPELINE_HELP.crawler.card} />
        </h2>
        {running ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            <span className="size-2 animate-pulse rounded-full bg-green-500" />
            Running — {processedThisRun.toLocaleString('en-IN')} crawled
            {startedAt && ` · started ${formatRelativeTime(startedAt)}`}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
            <span className="size-2 rounded-full bg-gray-400" />
            Idle
          </span>
        )}
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        {lastRun ? (
          <>
            Last run finished{' '}
            <span className="font-medium text-foreground">
              {formatRelativeTime(lastRun.finishedAt)}
            </span>{' '}
            ·{' '}
            <span className="font-medium tabular-nums text-foreground">
              {lastRun.processed.toLocaleString('en-IN')}
            </span>{' '}
            crawled · stopped because it{' '}
            {STOP_REASON_LABEL[lastRun.stoppedBecause] ?? lastRun.stoppedBecause}
          </>
        ) : (
          // The run state is in-memory by design (single process), so a
          // deploy resets it — absence means "since restart", not "never".
          'No completed runs since the server started.'
        )}
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map(([label, value, help]) => (
          <div key={label} className="rounded-lg border bg-muted/20 p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <HeaderTooltip label={label} help={help} />
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {value.toLocaleString('en-IN')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The pipeline's control panel. Deliberately edits EFFECTIVE values — what
 * you see is what runs, and Save writes exactly the fields you changed to
 * the database. There is no visible "default vs override" split: the team
 * operates the pipeline from here, full stop (deployment defaults only fill
 * in fields nobody has ever saved).
 */
function SettingsForm({ view }: { view: PipelineSettingsView }) {
  const { effective } = view;
  const updateSettings = useUpdateLeadsSettings();

  const GATES = [
    ['ingestEnabled', 'Daily import', PIPELINE_HELP.settings.ingestEnabled],
    ['livenessEnabled', 'Liveness probe', PIPELINE_HELP.settings.livenessEnabled],
    ['enrichEnabled', 'Crawler drain', PIPELINE_HELP.settings.enrichEnabled],
  ] as const;

  const [gateDrafts, setGateDrafts] = useState<Record<string, boolean>>({
    ingestEnabled: effective.ingestEnabled,
    livenessEnabled: effective.livenessEnabled,
    enrichEnabled: effective.enrichEnabled,
  });
  const [batchDraft, setBatchDraft] = useState(String(effective.enrichBatchPerSweep));
  const [concurrencyDraft, setConcurrencyDraft] = useState(
    String(effective.enrichConcurrency),
  );
  const [recrawlDraft, setRecrawlDraft] = useState(
    String(effective.enrichRecrawlHours),
  );

  function numericPatch(
    draft: string,
    current: number,
    min: number,
    max: number,
    label: string,
  ): { value?: number; error?: string } {
    const parsed = Number(draft);
    if (draft.trim() === '' || !Number.isInteger(parsed) || parsed < min || parsed > max) {
      return { error: `${label} must be a whole number between ${min} and ${max}.` };
    }
    return parsed === current ? {} : { value: parsed };
  }

  function handleSave() {
    const patch: UpdatePipelineSettingsPayload = {};

    for (const [key] of GATES) {
      if (gateDrafts[key] !== effective[key]) patch[key] = gateDrafts[key];
    }

    for (const [draft, current, min, max, label, key] of [
      [batchDraft, effective.enrichBatchPerSweep, 1, 10000, 'Batch per sweep', 'enrichBatchPerSweep'],
      [concurrencyDraft, effective.enrichConcurrency, 1, 20, 'Concurrency', 'enrichConcurrency'],
      [recrawlDraft, effective.enrichRecrawlHours, 1, 8760, 'Re-crawl hours', 'enrichRecrawlHours'],
    ] as const) {
      const result = numericPatch(draft, current, min, max, label);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.value !== undefined) patch[key] = result.value;
    }

    if (Object.keys(patch).length === 0) {
      toast.info('Nothing changed.');
      return;
    }

    updateSettings.mutate(patch, {
      onSuccess: () =>
        toast.success('Settings saved — the pipeline obeys them within seconds'),
      onError: (e) => toast.error(getApiErrorMessage(e)),
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {GATES.map(([key, label, help]) => (
          <div key={key}>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <HeaderTooltip label={`${label} · auto-run`} help={help} />
            </label>
            <select
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={gateDrafts[key] ? 'on' : 'off'}
              onChange={(e) =>
                setGateDrafts((d) => ({ ...d, [key]: e.target.value === 'on' }))
              }
            >
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ['Batch per sweep', PIPELINE_HELP.settings.batchPerSweep, batchDraft, setBatchDraft, 1, 10000],
            ['Concurrency', PIPELINE_HELP.settings.concurrency, concurrencyDraft, setConcurrencyDraft, 1, 20],
            ['Re-crawl hours', PIPELINE_HELP.settings.recrawlHours, recrawlDraft, setRecrawlDraft, 1, 8760],
          ] as const
        ).map(([label, help, draft, setDraft, min, max]) => (
          <div key={label}>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              <HeaderTooltip label={label} help={help} />
            </label>
            <input
              type="number"
              min={min}
              max={max}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm tabular-nums"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          disabled={updateSettings.isPending}
          onClick={handleSave}
        >
          {updateSettings.isPending ? (
            <>
              <Loader2 className="mr-1 size-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save settings'
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Stored in the database — applies live within seconds, even to a run
          in progress.
        </p>
      </div>
    </div>
  );
}

function JobList({ label, jobs }: { label: string; jobs: PipelineJobView[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
        <span className="ml-1.5 font-normal normal-case tracking-normal">
          ({jobs.length})
        </span>
      </h3>
      {jobs.length === 0 ? (
        <p className="text-xs text-muted-foreground">None.</p>
      ) : (
        <ul className="space-y-1.5">
          {jobs.map((job, index) => (
            <li
              key={job.id ?? `${job.name}-${index}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border bg-muted/20 px-3 py-2 text-xs"
            >
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                {job.name}
              </span>
              {job.leadId ? (
                <Link
                  to={`/leads/${job.leadId}`}
                  className="font-medium text-primary hover:underline"
                >
                  {job.domain ?? job.leadId}
                </Link>
              ) : job.fileDate ? (
                <span className="font-mono">{job.fileDate}</span>
              ) : null}
              {job.failedReason && (
                <span className="min-w-0 break-words text-red-600">
                  {job.failedReason}
                </span>
              )}
              <span className="ml-auto tabular-nums text-muted-foreground">
                {new Date(job.timestamp).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function LeadsPipelinePage() {
  const { data: pipeline, isLoading } = useAdminLeadsPipeline();
  const { data: settingsView } = useAdminLeadsSettings();
  const runIngest = useRunLeadIngest();
  const runLivenessSweep = useRunLivenessSweep();
  const runEnrichSweep = useRunEnrichSweep();

  function runNow(cronId: string) {
    if (cronId === 'leads-nrd-sweep') {
      runIngest.mutate(undefined, {
        onSuccess: ({ fileDate }) =>
          toast.success(
            fileDate
              ? `Ingest for ${fileDate} enqueued`
              : 'Ingest enqueued',
          ),
        onError: (e) => toast.error(getApiErrorMessage(e)),
      });
    } else if (cronId === 'leads-liveness-sweep') {
      runLivenessSweep.mutate(undefined, {
        onSuccess: () => toast.success('Liveness sweep enqueued'),
        onError: (e) => toast.error(getApiErrorMessage(e)),
      });
    } else if (cronId === 'leads-enrich-sweep') {
      runEnrichSweep.mutate(undefined, {
        onSuccess: () => toast.success('Enrichment sweep enqueued'),
        onError: (e) => toast.error(getApiErrorMessage(e)),
      });
    }
  }

  const runPending =
    runIngest.isPending || runLivenessSweep.isPending || runEnrichSweep.isPending;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const counts = pipeline?.counts ?? {};
  const countsAvailable = Object.keys(counts).length > 0;

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Workflow className="size-5 text-muted-foreground" />
          Pipeline
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The machinery behind Leads — schedules, queue depth and the jobs an
          operator would ask about. Refreshes every 5 seconds.
        </p>
      </div>

      {/* Crons */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <CalendarClock className="size-4 text-muted-foreground" />
          Scheduled jobs
        </h2>
        <div className="space-y-3">
          {(pipeline?.crons ?? []).map((cron) => (
            <div
              key={cron.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/20 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {PIPELINE_HELP.crons[cron.id] ? (
                    <HeaderTooltip label={cron.label} help={PIPELINE_HELP.crons[cron.id]} />
                  ) : (
                    cron.label
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{cron.schedule}</p>
              </div>
              <HelpBadge
                help={PIPELINE_HELP.gates[cron.id]}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                  cron.enabled
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-600',
                )}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    cron.enabled ? 'bg-green-500' : 'bg-gray-400',
                  )}
                />
                {cron.enabled ? 'Auto on' : 'Auto off'}
              </HelpBadge>
              <span className="text-xs tabular-nums text-muted-foreground">
                Next: {formatDateTime(cron.next)}
              </span>
              <ActionTooltip help={PIPELINE_HELP.runNow} side="left">
                {(props) => (
                  <Button
                    {...props}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={runPending}
                    onClick={() => runNow(cron.id)}
                  >
                    {cron.id === 'leads-nrd-sweep' ? (
                      <Download className="size-4" />
                    ) : cron.id === 'leads-liveness-sweep' ? (
                      <Wifi className="size-4" />
                    ) : (
                      <RefreshCw className="size-4" />
                    )}
                    Run now
                  </Button>
                )}
              </ActionTooltip>
            </div>
          ))}
        </div>
      </div>

      {/* Crawler readouts */}
      {pipeline?.enrichment && <CrawlerCard enrichment={pipeline.enrichment} />}

      {/* Pipeline settings — every knob is database-operated from here */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Settings2 className="size-4 text-muted-foreground" />
          <HeaderTooltip label="Settings" help={PIPELINE_HELP.settings.card} />
        </h2>
        {settingsView ? (
          // Keyed on the effective values: a successful save re-seeds the
          // query and remounts the form on the fresh values, while mere
          // pipeline polling never touches the drafts.
          <SettingsForm
            key={JSON.stringify(settingsView.effective)}
            view={settingsView}
          />
        ) : (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Queue counts */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">
          <HeaderTooltip label="Queue" help={PIPELINE_HELP.counts} />
        </h2>
        {countsAvailable ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {COUNT_LABELS.map(([key, label]) => (
              <div key={key} className="rounded-lg border bg-muted/20 p-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p
                  className={cn(
                    'mt-1 text-lg font-bold tabular-nums',
                    key === 'failed' && (counts[key] ?? 0) > 0 && 'text-red-600',
                  )}
                >
                  {(counts[key] ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Queue counts unavailable — Redis is briefly unreachable. The queue
            itself is likely fine; this view will recover on its own.
          </p>
        )}
      </div>

      {/* Jobs */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Jobs (first 20 of each)</h2>
        <div className="space-y-5">
          {JOB_SECTIONS.map(([key, label]) => (
            <JobList key={key} label={label} jobs={pipeline?.jobs[key] ?? []} />
          ))}
        </div>
      </div>
    </div>
  );
}
