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
  signups:
    'Signups over time, where they stall in verification, who the team called and what they wrote, and which reminder emails went out.',
  messages: 'Every OTP/SMS the platform has sent — search by phone number.',
  topup: "Credit a customer's wallet by email. Immediate, and logged against your admin account.",
  kyc: "Approve or reject customers' identity documents.",
  templates: 'The message templates customers send with — draft, publish, retire.',
  affiliatePartners: 'Partner programme: applications, accounts and commission rates.',
  affiliatePayouts: 'Monthly commission payouts to partners — send the money, record the outcome.',
  affiliateSettings: 'Programme-wide affiliate settings: rates, minimums, payout day.',
  pipeline:
    'The machinery behind Leads: cron schedules, queue depth, and the jobs currently running or failed — with rerun buttons.',
} as const;

// ── Leads ──────────────────────────────────────────────

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

// ── Signups & onboarding ───────────────────────────────

export const SIGNUPS_SECTION_HELP = {
  window:
    'Both dates are IST calendar days and the end date counts in full. Leave them empty for the last 30 IST days. Everything on this screen except the call notes list follows this window.',
  granularity:
    'Bucket width for the graph. A range wider than 400 buckets is refused, so switch to weeks for anything longer than about a year.',
  graph:
    'Customer signups per bucket, IST. Zero-filled: a day with no signups is a point at zero, not a gap in the line — which is the difference this screen was built to show.',
  funnel:
    'Each stage counts accounts that cleared it AND every stage before it, so the bars can only descend. Scoped to accounts that signed up inside the window.',
  calling:
    'How much of this window the calling team has actually reached, and what they wrote down. Coverage is measured on the call timestamp, never on the note.',
  notes:
    'Every account the calling team has touched — a logged call OR a note. All-time, not limited to the window above: the API filters these by when the call happened, not by when the account signed up.',
  email:
    'Onboarding reminder emails, counted by when the mail went out rather than by when its recipient signed up — a day-7 nudge for a June signup is a July send.',
} as const;

export const SIGNUPS_STAT_HELP = {
  totalSignups:
    'Customer accounts created inside the window. Admin and referrer accounts are excluded throughout this screen — staff logins never signed up for anything.',
  busiest: 'The single bucket with the most signups in this window.',
  customersAllTime:
    'Every customer account ever created, ignoring the window. Useful as a sanity check when the window is empty.',
  dataRange:
    'The oldest and newest customer signup in the database. If the window sits outside this range it will legitimately be empty.',
} as const;

export const FUNNEL_STAGE_HELP: Record<string, string> = {
  signed_up: 'A customer account was created. The cohort every other stage is measured against.',
  mobile_verified: 'Signed up AND confirmed their mobile number by OTP.',
  kyc_submitted: 'Mobile verified AND uploaded identity documents for review.',
  kyc_approved:
    'KYC submitted AND approved by an admin. Approval is what unlocks API keys and sending, so this is the first stage where the account can do anything.',
  first_message: 'Approved AND has sent at least one message. The only stage that means the account is genuinely live.',
} as const;

export const FUNNEL_COLUMN_HELP = {
  reached:
    'Accounts that cleared this stage and every stage before it. Monotone by construction, which is why it can never exceed the row above.',
  matched:
    "Accounts matching this stage's own condition, ignoring the earlier gates. Shown only where the two disagree — an approved account whose mobile was never marked verified counts here but not under Reached.",
  lost: 'Accounts that reached the stage above this one but not this one.',
  fromPrevious: 'Reached here as a share of the stage above.',
  fromSignup: 'Reached here as a share of everyone who signed up in this window.',
} as const;

export const CALLING_STAT_HELP = {
  coverage:
    'Accounts with a logged call, as a share of signups in the window. Measured on the call timestamp, never on the note: an account can be called without being written up, and counting notes instead silently drops every one of those calls.',
  called: 'Signups in this window carrying a call timestamp.',
  uncalled: 'Signups in this window with no call ever logged. Opens the customer list ordered so never-called accounts come first.',
  withNotes: 'Signups in this window carrying a written note.',
  noteRate:
    'Of the calls logged in this window, how many have a note written against them. The rest are the "called, not written up" queue below.',
  staleDays: 'Days since the most recent call logged against this window.',
  notedWithoutCall:
    'Accounts with a note but no call timestamp. Coverage is measured on the timestamp, so anything above zero means coverage is an undercount — and that a note was saved without a date.',
  selfReported:
    'The call timestamp is whatever an admin set on the account by hand, including a backdated one. It records that somebody said a call happened, not that one was observed.',
} as const;

export const NOTES_COLUMN_HELP = {
  calledAt: 'When an admin says the last call happened. Self-reported and editable from the customer list.',
  note: 'What the caller wrote. Shown in full — the founder asked to read these, not to count them.',
  state: 'Where this account currently sits in verification. Live state, not its state at the time of the call.',
} as const;

export const NOTES_SCOPE_HELP = {
  all: 'Every account the team has touched: a logged call or a note.',
  true: 'Only accounts with a written note.',
  false: 'Called, never written up — the follow-up worklist.',
} as const;

export const EMAIL_STAT_HELP = {
  totalSent: 'Reminder emails the provider accepted in this window.',
  totalRows:
    'Reminder rows written in this window, whatever became of them. A row is created before the send, so this counts the failures and the still-pending ones too.',
  pending: 'Claimed by a sweep; the send has not resolved yet.',
  failed: 'The send was attempted and did not go out. Each row keeps its last error and is retried up to three times.',
  byStage: 'Which nudge went out: the day-2 one or the final day-7 one.',
  byBlockedStep: 'What the mail was about — the step the customer still had not completed when it was sent.',
  catalogue:
    'Every reminder variant this system can put in an inbox, read from the same function that composes the mail — so the wording here cannot drift from what a customer actually received.',
} as const;

export const REMINDER_STAGE_HELP: Record<string, string> = {
  day_2: 'The 24-48 hour nudge, sent to accounts that stalled just after signing up.',
  day_7: 'The 7-8 day nudge. The last reminder we ever send to an account.',
} as const;

export const REMINDER_STEP_HELP: Record<string, string> = {
  mobile_verification: 'The customer never confirmed their mobile number by OTP.',
  kyc_submission: 'Mobile confirmed, but no identity documents were ever uploaded.',
  kyc_resubmission: 'Documents were uploaded and rejected, and nothing has been resubmitted.',
  unknown:
    'The stored row carries a step this build does not recognise, so the copy it used cannot be named with confidence.',
} as const;

export const REMINDER_STATUS_HELP: Record<string, string> = {
  sent: 'Handed to the email provider, which accepted it.',
  pending: 'A row was claimed by the sweep but the send has not resolved yet.',
  failed: 'The send was attempted and rejected. The row keeps the provider error.',
} as const;
