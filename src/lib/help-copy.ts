import type { PartnerStatus, PayoutStatus } from '@/apis/affiliate.api';
import type { KycStatus, TemplateStatus } from '@/types';

/**
 * Every piece of help copy in the panel lives here, grouped by page or enum,
 * so wording is written once and read everywhere — the same status must not
 * mean one thing in a list and another on a detail page.
 *
 * The bar for adding an entry: would a new team member have to ask what this
 * is, or what happens when they click it? Self-evident labels (Email, Name,
 * Created) deliberately have no entry — the help glyph only appears where
 * there is something to say.
 *
 * Semantics were read from the server code, not guessed — the windows and
 * timezones below (all-time vs IST-day, delivered-only cost, what KYC
 * approval actually unlocks) mirror the queries that produce the numbers.
 * Where a value is configuration-driven, the copy points at the settings
 * screen instead of hardcoding today's number.
 */

// ── Sidebar ────────────────────────────────────────────

export const NAV_HELP = {
  dashboard: 'Platform-wide numbers: signups, messages, revenue and the KYC queue.',
  customers: 'Every customer account — wallets, KYC state, call notes.',
  messages: 'Every OTP/SMS the platform has sent — search by phone number.',
  topup: "Credit a customer's wallet by email. Immediate, and logged against your admin account.",
  kyc: "Approve or reject customers' identity documents.",
  templates: 'The message templates customers send with — draft, publish, retire.',
  affiliatePartners: 'Partner programme: applications, accounts and commission rates.',
  affiliatePayouts: 'Monthly commission payouts to partners — send the money, record the outcome.',
  affiliateSettings: 'Programme-wide affiliate settings: rates, minimums, payout day.',
  leads: 'Newly registered Indian businesses to prospect — the cold-outreach queue.',
  pipeline:
    'The machinery behind Leads: cron schedules, queue depth, and the jobs currently running or failed — with rerun buttons.',
  suppressions: 'Opt-outs and bounces we must never email again.',
} as const;

// ── Leads ──────────────────────────────────────────────

export const LEADS_COLUMN_HELP = {
  domain:
    "The business's website, found in the daily feed of newly registered domains. Click the name for the lead's detail page; the small icon opens the live site in a new tab.",
  signals:
    'How many signals the crawler VERIFIED on the site (0–5): a payment checkout script, a real login form, ecommerce assets, a WhatsApp link, an app-store link. Structural evidence, never text mentions — the detail page shows which. Sort descending to work the best prospects first.',
  registered:
    'The date the domain appeared in the registration feed — i.e. when the business registered it.',
  liveness:
    'Whether the domain answers at all — DNS plus one page fetch. The crawler only spends on live sites; inactive ones are re-probed on a backoff (daily, then weekly, then monthly) so a late launch is still caught.',
  enrichment:
    'Whether our crawler has visited the site yet, and what it found. Hover a badge for what each state means.',
  contacts:
    'Emails, phone numbers and WhatsApp numbers the crawler extracted from the site.',
  status:
    'Where the lead sits in the outreach funnel: new → contacted → replied/converted; unsubscribed/bounced are enforced by suppressions; disqualified = delisted. The table hides this column (most rows say "new") — filter by it instead, and the detail page shows the badge.',
  lastCrawled:
    "When the crawler last read the site. Hover a value for the absolute time and the last liveness probe — 'never' means enrichment hasn't reached it yet.",
  rating:
    "Your team's own 1–5 judgment after looking at the site — the machine collects evidence; people rate. Set it from the lead's detail page.",
  added:
    'When we imported the lead. Registered (left) is when the business created the domain.',
  country:
    '.in domains and India-named/India-evidenced sites are India; everything else stays "Not sure" until the crawler finds Indian markers (+91 numbers, GSTIN, Indian payment rails) — there is deliberately no "not India".',
} as const;

export const LEADS_STAT_HELP = {
  total: 'Every lead ever imported from the registration feed, whatever its current state.',
  withContact: 'Leads where the crawler found at least one email, phone or WhatsApp number.',
  india:
    'Leads confirmed India: a .in/.co.in domain or Indian markers on the site. The rest are "not sure", never "not India".',
  live: 'Domains that answered their last liveness probe — the pool the crawler actually works.',
  queued:
    'Leads mid-send. Sends complete immediately, so anything sitting here for long likely hit a provider error.',
  contacted: 'Leads whose cold email has actually been sent.',
  replied: 'Leads that wrote back — the strongest signal in the funnel.',
} as const;

export const LEADS_ACTION_HELP = {
  runIngest:
    "Downloads a day's domain-registration feed (default: yesterday, IST) and imports the new matches. Safe to re-run: completed days are skipped and known domains are never duplicated.",
  reEnrich:
    'Recrawls the site right now to refresh title, description and contacts. Takes a few seconds — the page waits for it.',
  deepReEnrich:
    "Renders the site in headless Chromium and reads the result — for JS-built sites the plain crawl can't see. Can take ~20 seconds.",
  probe:
    'Probes DNS and fetches the homepage to re-test whether the site is live — the pipeline also does this automatically on a backoff.',
  markReplied:
    'Records that they answered. With a plain SMTP sender replies land in the mailbox, so this is how a reply gets into the funnel.',
  runEnrichSweep:
    'Claims the next priority batch of uncrawled leads right now. Always safe — the sweep just picks up whatever is due.',
  queueOutreach:
    'Sends the cold email immediately via the configured email provider — a real send that counts against the daily outreach cap (resets at midnight IST).',
  delist:
    "Removes this lead from all pipeline work — probing, crawling, outreach. The row is kept so tomorrow's import can't re-add the domain. Reversible.",
  relist:
    'Puts the lead back into the pipeline as "new" — the sweeps may spend on it again and outreach can be queued.',
  markConverted: 'Records that this lead became a customer.',
  backToNew: 'Returns the lead to the untouched pool so outreach can be queued again.',
  removeSuppression:
    'Careful: removing an address here makes it mailable again, immediately. Only do this if they explicitly asked to hear from us.',
} as const;

export const OUTREACH_FIELD_HELP = {
  subject:
    'Optional override for the email subject (max 200 characters). Leave empty to use the default template.',
  bodyHtml:
    'Optional custom HTML body (max 20,000 characters). Whatever you write, the server always appends the unsubscribe footer and tracking — they cannot be omitted.',
} as const;

export const LEADS_DETAIL_HELP = {
  opened:
    'Recorded when the tracking image loads. Apple/Gmail privacy proxies prefetch it, so opens overcount — clicks and replies are the signals to trust.',
  teamRating:
    "Your team's own judgment after looking at the site — the machine collects evidence; people rate. Click a star to set it, the cross to clear.",
} as const;

// ── Pipeline ───────────────────────────────────────────

export const PIPELINE_HELP = {
  crons: {
    'leads-nrd-sweep':
      "Downloads each day's newly-registered-domains file and imports the matches. Completed days short-circuit and domains dedupe, so reruns are free.",
    'leads-liveness-sweep':
      'Checks which imported domains actually answer — DNS plus one quick page fetch. Dead domains are re-checked on a backoff (daily for two weeks, then weekly, then monthly) so a late launch is still caught.',
    'leads-enrich-sweep':
      'Crawls eligible leads in a continuous drain — it runs until nothing is eligible, then stops. A 5-minute kick starts a new drain whenever fresh work appears.',
  } as Record<string, string>,
  gates: {
    'leads-nrd-sweep':
      'Follows the Auto-run switch in Settings below — flip it there and it applies within seconds, no deploy. "Run now" works regardless: an explicit click is its own authorization.',
    'leads-liveness-sweep':
      'Follows the Auto-run switch in Settings below — flip it there and it applies within seconds, no deploy. "Run now" works regardless: an explicit click is its own authorization.',
    'leads-enrich-sweep':
      'Follows the Auto-run switch in Settings below. Switching off stops even a drain already running within seconds. "Run now" works regardless.',
  } as Record<string, string>,
  counts:
    'Queue depth right now: waiting/delayed are backlogs, active is in-flight, failed wants a look. Blank means Redis is briefly unreachable — the queue itself is likely fine.',
  runNow:
    'Always safe: ingest days are idempotent and the sweeps just claim whatever is due.',
  crawler: {
    card:
      "The enrichment drain's live state: what it is doing, what it will do (the order book), and what it did.",
    pendingLive: 'Live sites never crawled — first in line for the drain.',
    staleRecrawl:
      'Crawled leads older than the re-crawl window — due to be swapped through the drain again.',
    parkedRecheckDue:
      'Parked domains due their periodic recheck, to catch the site finally launching.',
    crawledLast24h:
      "Crawls completed in the last 24 hours — the drain's actual throughput, not a projection.",
  },
  settings: {
    card:
      'The pipeline is operated from here: every switch and number is stored in the database and applies live within seconds — no deploy, no restart. What you see is what runs.',
    ingestEnabled:
      'Auto-run for the daily domain import. Off = nothing imports on its own; "Run now" still works.',
    livenessEnabled:
      'Auto-run for the hourly liveness probe. Off = no automatic probing; "Run now" still works.',
    enrichEnabled:
      'Auto-run for the crawler drain. Switching off stops even a drain already running within seconds. "Run now" still works.',
    batchPerSweep: 'Leads the drain claims per slice (1–10,000).',
    concurrency: 'Parallel crawls in flight (1–20).',
    recrawlHours:
      'The swap cycle: how stale a crawled lead may get before it re-enters the drain (1–8,760 hours).',
  },
} as const;

// ── Suppressions ───────────────────────────────────────

export const SUPPRESSIONS_COLUMN_HELP = {
  email:
    'An address we must never mail again. The send path checks this list before every outreach email, whatever the lead record says.',
  reason: 'Why the address is blocked. Hover a badge for what each reason means.',
} as const;

export const SUPPRESSION_FIELD_HELP = {
  reason:
    "Why the address is being blocked: unsubscribed = they opted out, bounced = the mailbox doesn't exist, complaint = they reported us as spam, manual = a team decision. Pick the one that actually happened — it documents intent.",
} as const;

// ── Customers ──────────────────────────────────────────

export const CUSTOMERS_COLUMN_HELP = {
  balance:
    'Current wallet balance (INR). In: top-ups and the signup welcome credit. Out: message costs, charged when a message is confirmed delivered — failed sends are not charged.',
  kyc: 'Identity verification state — approval is what unlocks API keys and sending. Hover a badge for each state.',
  lastCalled:
    'When an admin last phoned this customer — set it from the pencil icon after a call. Customers never see this.',
  notes: 'Call notes for the team. Only visible in the admin panel.',
} as const;

export const KYC_STATUS_HELP: Record<KycStatus, string> = {
  not_submitted:
    'No identity documents uploaded yet. Until KYC is approved the customer cannot create API keys or send messages.',
  pending:
    'Documents uploaded and waiting for an admin. The customer stays blocked from sending until approved.',
  approved:
    'Identity verified — this is the state that unlocks API keys and message sending.',
  rejected:
    'Sent back with a reason (emailed to the customer). They must resubmit; sending stays blocked meanwhile.',
};

export const ACCOUNT_STATUS_HELP = {
  active: 'The account is in good standing and can use the platform.',
  suspended:
    'Suspended by an admin: sign-in, existing sessions and API-key sends are all blocked immediately, until reactivated.',
} as const;

export const CUSTOMER_ACTION_HELP = {
  suspend:
    'Immediately blocks sign-in, kills existing sessions and stops API-key sends. Reversible — activating restores access.',
  activate: 'Restores sign-in and API access for this account.',
} as const;

// ── Messages ───────────────────────────────────────────

export const MESSAGES_COLUMN_HELP = {
  status: 'How far the message got. Hover a badge for what each state means.',
  cost: "What this message cost the customer (INR). Charged only when delivery is confirmed — failed messages show the cost but are not billed.",
} as const;

export const MESSAGE_STATUS_HELP: Record<string, string> = {
  initiated: 'Accepted by our API; not yet handed to an SMS provider.',
  queued: 'Waiting in line to be handed to the SMS provider.',
  sent: 'The provider accepted it but has not confirmed delivery. Stuck "sent" messages are re-checked automatically for up to 48 hours.',
  delivered:
    'The provider confirmed it reached the handset — this is the moment the wallet is charged.',
  failed: 'The provider reported it undeliverable. Nothing is charged for a failed message.',
  expired:
    'Legacy state — nothing in the current pipeline sets it. Customers see these as failed.',
};

export const TRANSACTION_TYPE_HELP: Record<string, string> = {
  credit:
    'Money in: a Razorpay top-up, an admin top-up, or the small welcome credit at signup.',
  debit: 'Money out: the cost of a message, charged when it is first confirmed delivered.',
  refund:
    'Money returned to the wallet. Note: nothing issues refunds automatically today — failed sends are simply never charged.',
};

// ── Templates ──────────────────────────────────────────

export const TEMPLATES_COLUMN_HELP = {
  channel: 'The delivery channel this template sends over (e.g. SMS).',
  status: 'Draft templates are invisible to customers; only published ones are live. Hover a badge for details.',
} as const;

export const TEMPLATE_STATUS_HELP: Record<TemplateStatus, string> = {
  draft:
    'Invisible to customers. A send referencing a draft silently falls back to the generic OTP text instead of erroring.',
  published:
    'Live: customers can send with it right now. Unpublishing while traffic references it silently degrades those sends to the generic fallback text.',
};

export const TEMPLATE_FIELD_HELP = {
  body:
    'Placeholders use the exact form {{otp}}, {{expiry}}, {{appName}} — any {{variable}} the API caller supplies also works. No spaces inside the braces: "{{ otp }}" is left as-is in the SMS. {{otp}} is required.',
} as const;

// ── Affiliate ──────────────────────────────────────────

export const AFFILIATE_STAT_HELP = {
  activePartners: 'Partners approved into the programme and currently accruing commission.',
  pendingApplications: 'Applications waiting for an approve/reject decision.',
  totalAccrued:
    'Commission earned by partners but not yet paid out — the amount we currently owe, from the commission ledger.',
  totalPaid: 'Everything ever paid out to partners, all time.',
} as const;

export const PARTNER_COLUMN_HELP = {
  code: "The partner's referral code — it rides their share links, and signups carrying it attribute to this partner.",
  rate: 'Commission override for this partner: a percent of each referred customer\'s delivered-message spend, or a flat amount per delivered OTP. "Global default" means the programme rate from Affiliate → Programme applies.',
  owed: 'Commission accrued but not yet paid out. Becomes a payout once the partner has payout details on file and clears the programme minimums (amount and paying referrals — Affiliate → Programme).',
  lifetime: 'Everything the partner has ever earned — paid and unpaid together.',
  status: 'Application state. Hover a badge for what each state means.',
} as const;

export const PARTNER_STATUS_HELP: Record<PartnerStatus, string> = {
  pending: 'Applied and waiting for an approve/reject decision.',
  active: 'Approved into the programme — their referrals accrue commission.',
  suspended: 'Temporarily stopped by an admin: no commission accrues. Can be reactivated.',
  rejected: 'The application was declined.',
};

export const PAYOUT_STATUS_HELP: Record<PayoutStatus, string> = {
  pending:
    'Raised by the monthly run (from the configured payout day onward — Affiliate → Programme). No money has moved: pay it out-of-band, then record the outcome.',
  processing: 'An admin marked the transfer as underway.',
  paid: 'Recorded as paid, with its transaction reference. Terminal — undoing it needs raw SQL.',
  failed:
    "The transfer failed. Terminal — the full amount was released back to the partner's unpaid balance, and the next cycle raises it again.",
  on_hold:
    'Parked by an admin with its commissions still attached. Release it back to pending (or settle it) when ready.',
};

export const PAYOUT_ACTION_HELP = {
  recordOutcome:
    'Opens the settle dialog: mark the transfer paid (with its reference) or failed (returns the amount to the partner for the next cycle). Both outcomes are final.',
} as const;

export const PAYOUT_META_HELP = {
  period: 'The month (IST) whose accrued commissions this payout bundles.',
} as const;

export const PARTNER_ACTION_HELP = {
  approve: 'Admits the partner into the programme — their referral link starts accruing commission.',
  reject: 'Declines the application.',
  suspend: 'Stops commission accruing for this partner until reactivated.',
  reactivate: 'Resumes the partnership — accrual starts again.',
  rate: "Set a commission override for this partner, or revert them to the programme's global rate.",
} as const;

// ── KYC review ─────────────────────────────────────────

export const KYC_ACTION_HELP = {
  approve:
    "Marks the customer's identity as verified and unlocks the account — API keys and message sending are gated on exactly this. The customer is notified by email.",
  reject:
    'Sets KYC to rejected with your reason. The reason is emailed to the customer, who must resubmit; sending stays blocked meanwhile.',
} as const;

// ── Manual top-up ──────────────────────────────────────

export const TOPUP_ACTION_HELP = {
  credit:
    'Credits exactly this amount — no convenience fee or GST is added or deducted (fees only apply to customer-initiated Razorpay top-ups). One click = one ledger credit; there is no duplicate guard, so do not double-submit.',
} as const;

// ── Dashboard ──────────────────────────────────────────

export const DASHBOARD_STAT_HELP: Record<string, string> = {
  kycPending:
    'Customers whose documents are waiting for review — a work queue, not a metric. They cannot send until approved.',
  totalCustomers:
    'Every account ever registered, including suspended ones and admin accounts. "New today" counts signups since midnight IST.',
  activeCustomers:
    'Accounts not suspended by an admin — it says nothing about recent activity. The "this week" figure is new signups over the last 7 days (IST), rolling, not a calendar week.',
  totalMessages: 'Every message ever created, in any status — not just delivered ones.',
  platformRevenue:
    'Lifetime wallet debits for delivered messages — what customers actually spent on sends. Top-ups are not revenue; they only become revenue when spent. "Today" follows the IST calendar day.',
  razorpay:
    'Completed Razorpay wallet top-ups, all time — the credited amounts, excluding the convenience fee paid on top. "Today" is by order-creation time, midnight IST onward.',
  successRate:
    'Delivered messages as a share of every message ever created — a lifetime figure, unlike "Failed today" beside it.',
  failedToday: 'Messages that failed since midnight IST — today only, unlike the lifetime success rate above.',
} as const;

export const DASHBOARD_USAGE_COLUMN_HELP = {
  delivered: 'Messages confirmed delivered on the selected day (IST).',
  failed: 'Messages that failed on the selected day (IST).',
  totalSpent:
    "The cost of that day's delivered messages only — failed sends are never charged, so they add nothing here.",
} as const;
