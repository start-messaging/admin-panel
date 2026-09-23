import { Link } from 'react-router-dom';
import { CircleCheck, Clock, Mail, MailX, TriangleAlert } from 'lucide-react';
import { HeaderTooltip } from '@/components/common/header-tooltip';
import { HelpBadge } from '@/components/common/help-badge';
import {
  EMAIL_STAT_HELP,
  REMINDER_STAGE_HELP,
  REMINDER_STATUS_HELP,
  REMINDER_STEP_HELP,
  SIGNUPS_SECTION_HELP,
} from '@/lib/help-copy';
import { cn } from '@/lib/utils';
import type { GrowthEmail, ReminderCopy } from '@/types';
import { formatIstDateTime } from './formatting';

/**
 * Labels for values that arrive as plain strings.
 *
 * `blockedStep` is a varchar server-side, not an enum column, so a stored row
 * can carry something this build has never heard of. Every lookup here falls
 * back to the raw value rather than rendering `undefined` for a real send.
 */
const STAGE_LABEL: Record<string, string> = {
  day_2: 'Day 2 nudge',
  day_7: 'Day 7 final nudge',
};

const STEP_LABEL: Record<string, string> = {
  mobile_verification: 'Mobile not verified',
  kyc_submission: 'KYC not submitted',
  kyc_resubmission: 'KYC rejected, not resubmitted',
  unknown: 'Unrecognised step',
};

const STATUS_STYLE: Record<string, { className: string; icon: typeof Mail }> = {
  sent: { className: 'bg-emerald-100 text-emerald-700', icon: CircleCheck },
  pending: { className: 'bg-amber-100 text-amber-700', icon: Clock },
  failed: { className: 'bg-red-100 text-red-700', icon: TriangleAlert },
};

function stageLabel(key: string) {
  return STAGE_LABEL[key] ?? key;
}

function stepLabel(key: string | null) {
  if (!key) return STEP_LABEL.unknown;
  return STEP_LABEL[key] ?? key;
}

/** Status as an icon plus a word — never colour on its own. */
function StatusChip({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? {
    className: 'bg-gray-100 text-gray-600',
    icon: Mail,
  };
  const Icon = style.icon;

  return (
    <HelpBadge
      help={REMINDER_STATUS_HELP[status]}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        style.className,
      )}
    >
      <Icon className="size-3" />
      {status}
    </HelpBadge>
  );
}

/** Counts as a magnitude, one hue. Categorical colour would imply identity it does not have. */
function BreakdownBars({
  title,
  help,
  rows,
  labelOf,
  helpOf,
}: {
  title: string;
  help: string;
  rows: { key: string; count: number }[];
  labelOf: (key: string) => string;
  helpOf?: (key: string) => string | undefined;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);

  return (
    <div className="rounded-lg border bg-background p-4">
      <HeaderTooltip
        label={title}
        help={help}
        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
      />
      <ul className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <HelpBadge help={helpOf?.(row.key)}>{labelOf(row.key)}</HelpBadge>
              <span className="font-semibold tabular-nums">
                {row.count.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: max > 0 ? `${(row.count / max) * 100}%` : '0%' }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CopyCard({ copy }: { copy: ReminderCopy }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <HelpBadge
        help={REMINDER_STEP_HELP[copy.blockedStep]}
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {stepLabel(copy.blockedStep)}
      </HelpBadge>
      <p className="mt-2 text-sm font-medium">{copy.subject}</p>
      <p className="mt-1 text-sm text-muted-foreground">{copy.headline}</p>
      <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
        <div className="flex gap-2">
          <dt className="w-10 shrink-0 font-semibold text-foreground/70">Ask</dt>
          <dd>{copy.ask}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-10 shrink-0 font-semibold text-foreground/70">Why</dt>
          <dd>{copy.why}</dd>
        </div>
      </dl>
    </div>
  );
}

export function EmailSection({ email }: { email: GrowthEmail }) {
  const hasRows = email.totalRows > 0;
  const stages = [...new Set(email.catalogue.map((c) => c.stage))];

  return (
    <section className="rounded-xl border bg-card p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Reminder emails</h2>
        <HelpBadge
          help={email.scope}
          className="text-xs text-muted-foreground"
        >
          counted by send time
        </HelpBadge>
      </div>
      <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
        {SIGNUPS_SECTION_HELP.email}
      </p>

      {/* Rule of this section: an empty bar chart reads as a broken render.
          Say it in words, and say WHICH kind of empty — "never sent one" and
          "none in the window you picked" lead to different next actions, and
          the server distinguishes them for exactly that reason. */}
      {!hasRows && (
        <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
          <MailX className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">
              {email.neverAny
                ? 'No reminder email has ever been sent.'
                : 'No reminder email was sent in this window.'}
            </p>
            {/* The server writes this sentence and distinguishes the two
                empties itself. The fallback exists so an empty section can
                never render as a bare heading if that ever comes back null. */}
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {email.reason ??
                'The reminder table holds nothing for this window, so there is no breakdown to draw.'}
            </p>
            {email.neverAny && (
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                The six variants below are what production sends as accounts
                become eligible — read them as a plan, not as history.
              </p>
            )}
          </div>
        </div>
      )}

      {hasRows && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-background p-4">
              <HeaderTooltip
                label="Sent"
                help={EMAIL_STAT_HELP.totalSent}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              />
              <p className="mt-2 text-3xl font-bold tabular-nums">
                {email.totalSent.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <HeaderTooltip
                label="Rows written"
                help={EMAIL_STAT_HELP.totalRows}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              />
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {email.totalRows.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <HeaderTooltip
                label="Pending"
                help={EMAIL_STAT_HELP.pending}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              />
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {email.pending.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <HeaderTooltip
                label="Failed"
                help={EMAIL_STAT_HELP.failed}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              />
              <p
                className={cn(
                  'mt-2 text-2xl font-bold tabular-nums',
                  email.failed > 0 && 'text-red-600',
                )}
              >
                {email.failed.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <BreakdownBars
              title="Which nudge"
              help={EMAIL_STAT_HELP.byStage}
              rows={email.byStage}
              labelOf={stageLabel}
              helpOf={(key) => REMINDER_STAGE_HELP[key]}
            />
            <BreakdownBars
              title="What it was about"
              help={EMAIL_STAT_HELP.byBlockedStep}
              rows={email.byBlockedStep}
              labelOf={(key) => stepLabel(key)}
              helpOf={(key) => REMINDER_STEP_HELP[key]}
            />
          </div>

          {/* The cross-tab the two bar lists above summarise. Kept because the
              margins hide the combination that matters: "day 7, KYC
              resubmission, failed" is a different problem from either of its
              rows read alone. */}
          <div className="mt-6">
            <h3 className="mb-3 text-base font-semibold">
              Every combination sent
            </h3>
            <div className="max-w-full overflow-hidden rounded-lg border">
              <div className="touch-pan-x overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-max text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                      <th className="min-w-[130px] px-4 py-3 font-medium">Nudge</th>
                      <th className="min-w-[170px] px-4 py-3 font-medium">About</th>
                      <th className="min-w-[110px] px-4 py-3 font-medium">Status</th>
                      <th className="min-w-[80px] px-4 py-3 text-right font-medium">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...email.matrix]
                      .sort((a, b) => b.count - a.count)
                      .map((cell) => (
                        <tr
                          key={`${cell.stage}-${cell.blockedStep}-${cell.status}`}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          <td className="px-4 py-3">{stageLabel(cell.stage)}</td>
                          <td className="px-4 py-3">{stepLabel(cell.blockedStep)}</td>
                          <td className="px-4 py-3">
                            <StatusChip status={cell.status} />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">
                            {cell.count.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-base font-semibold">Recent sends</h3>
            <div className="max-w-full overflow-hidden rounded-lg border">
              <div className="touch-pan-x overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-max text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                      <th className="min-w-[200px] px-4 py-3 font-medium">
                        Customer
                      </th>
                      <th className="min-w-[130px] px-4 py-3 font-medium">Nudge</th>
                      <th className="min-w-[170px] px-4 py-3 font-medium">
                        About
                      </th>
                      <th className="min-w-[280px] px-4 py-3 font-medium">
                        Subject line
                      </th>
                      <th className="min-w-[110px] px-4 py-3 font-medium">
                        Status
                      </th>
                      <th className="min-w-[170px] px-4 py-3 font-medium">Sent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {email.recent.map((send) => (
                      <tr
                        key={send.id}
                        className="border-b align-top transition-colors last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3">
                          <Link
                            to={`/customers/${send.userId}`}
                            className="font-medium hover:underline"
                          >
                            {send.name ?? send.email ?? send.userId}
                          </Link>
                          {send.email && (
                            <p className="text-xs text-muted-foreground">
                              {send.email}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <HelpBadge help={REMINDER_STAGE_HELP[send.stage]}>
                            {stageLabel(send.stage)}
                          </HelpBadge>
                        </td>
                        <td className="px-4 py-3">
                          <HelpBadge
                            help={
                              REMINDER_STEP_HELP[send.blockedStep ?? 'unknown']
                            }
                          >
                            {stepLabel(send.blockedStep)}
                          </HelpBadge>
                        </td>
                        {/* The wording this row actually put in an inbox,
                            resolved server-side from the same function that
                            composes the mail. Null when the stored row names a
                            variant this build cannot identify — captioning it
                            with a guess would be worse than saying so. */}
                        <td className="px-4 py-3">
                          {send.copy ? (
                            send.copy.subject
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              Copy for this variant is not in this build
                            </span>
                          )}
                          {send.lastError && (
                            <p className="mt-1 text-xs text-red-600">
                              {send.lastError}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusChip status={send.status} />
                          {send.attempts > 1 && (
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {send.attempts} attempts
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatIstDateTime(send.sentAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The 20 most recent sends in this window.
            </p>
          </div>
        </>
      )}

      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">
            <HeaderTooltip
              label="What we send"
              help={EMAIL_STAT_HELP.catalogue}
            />
          </h3>
          <span className="text-xs text-muted-foreground">
            {email.catalogue.length} variants
          </span>
        </div>
        <div className="space-y-4">
          {stages.map((stage) => (
            <div key={stage}>
              <HelpBadge
                help={REMINDER_STAGE_HELP[stage]}
                className="text-sm font-medium"
              >
                {stageLabel(stage)}
              </HelpBadge>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {email.catalogue
                  .filter((copy) => copy.stage === stage)
                  .map((copy) => (
                    <CopyCard
                      key={`${copy.stage}-${copy.blockedStep}`}
                      copy={copy}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
