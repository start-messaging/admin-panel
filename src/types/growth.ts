import type { KycStatus } from './user';

/**
 * Shapes returned by `GET /admin/growth` and `GET /admin/growth/notes`.
 *
 * Mirrors src/admin/growth.service.ts in the server repo. Two of these types
 * carry rules rather than just fields, and both exist because of a specific
 * way this screen could lie:
 *
 *  - `RateEnvelope.value` is null — never 0 — when nothing was measured. See
 *    the note on the type.
 *  - `stage` / `blockedStep` are plain strings, not unions, on stored rows.
 *    `blockedStep` is a varchar column server-side, so a row can carry a value
 *    this build has never heard of; typing it as a union would make TypeScript
 *    promise a lookup can't miss, and the label maps would then render
 *    `undefined` for a real send.
 */

/**
 * A rate that can say "undefined" instead of lying about zero.
 *
 * `value` is a percentage with one decimal (49.0, not 0.49) and is null
 * whenever `denominator` is 0. "0% of signups were called" and "nobody signed
 * up" are different facts an operator acts on differently, so a null must
 * never be coalesced to 0 anywhere between here and the DOM — render it with
 * <RateValue>/<RateReason>, which show an em dash and `reason` instead.
 */
export interface RateEnvelope {
  value: number | null;
  numerator: number;
  denominator: number;
  /** False when the denominator is 0, i.e. the rate is undefined rather than low. */
  sufficient: boolean;
  /** Why the value is null, in a sentence meant to be rendered. */
  reason: string | null;
}

export type GrowthGranularity = 'day' | 'week';

export interface GrowthWindow {
  from: string;
  /** Exclusive: the panel never has to guess whether the last day counts. */
  toExclusive: string;
  granularity: GrowthGranularity;
  buckets: number;
  timezone: string;
  /** True when neither bound was sent and the server applied its 30-day default. */
  defaulted: boolean;
}

/** One point on the signup graph. `bucket` is an IST calendar day, `YYYY-MM-DD`. */
export interface SignupBucket {
  bucket: string;
  count: number;
}

export type FunnelStageKey =
  | 'signed_up'
  | 'mobile_verified'
  | 'kyc_submitted'
  | 'kyc_approved'
  | 'first_message';

export interface FunnelStage {
  key: FunnelStageKey;
  label: string;
  /** Cleared this gate AND every gate before it. Monotone by construction. */
  reached: number;
  /**
   * This stage's own condition, ignoring the earlier gates. Differs from
   * `reached` on real data (an approved account whose mobile was never marked
   * verified), which is why the server publishes both.
   */
  matched: number;
  lostFromPrevious: number;
  conversionFromPrevious: RateEnvelope;
  conversionFromSignup: RateEnvelope;
}

export interface GrowthFunnel {
  stages: FunnelStage[];
  biggestDropOff: { from: string; to: string; lost: number } | null;
  /** Asserted by the server. False means the ladder has been rewritten wrongly. */
  monotone: boolean;
}

export interface GrowthCalling {
  called: number;
  uncalled: number;
  withNotes: number;
  /** Non-zero means a note exists with no timestamp, so `coverage` undercounts. */
  notedWithoutCall: number;
  /** called ÷ signups. Measured on adminLastCalledAt, never on the note. */
  coverage: RateEnvelope;
  /** withNotes ÷ called — of the calls logged, how many were written up. */
  noteRate: RateEnvelope;
  lastCalledAt: string | null;
  staleDays: number | null;
  source: 'self_reported';
  sourceNote: string;
}

export type ReminderStage = 'day_2' | 'day_7';

export type ReminderBlockedStep =
  | 'mobile_verification'
  | 'kyc_submission'
  | 'kyc_resubmission';

export type ReminderStatus = 'pending' | 'sent' | 'failed';

/** What one reminder variant actually says, lifted from the server's EmailService. */
export interface ReminderCopy {
  stage: ReminderStage;
  blockedStep: ReminderBlockedStep;
  subject: string;
  headline: string;
  ask: string;
  why: string;
}

export interface ReminderSend {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  stage: string;
  blockedStep: string | null;
  status: string;
  attempts: number;
  sentAt: string | null;
  lastError: string | null;
  /** Null when the stored row's stage/step is not one this build knows. */
  copy: ReminderCopy | null;
}

export interface GrowthEmail {
  totalSent: number;
  /** Rows written, whatever became of them. Always >= totalSent. */
  totalRows: number;
  pending: number;
  failed: number;
  byStage: { key: string; count: number }[];
  byBlockedStep: { key: string; count: number }[];
  byStatus: { key: string; count: number }[];
  matrix: {
    stage: string;
    blockedStep: string;
    status: string;
    count: number;
  }[];
  recent: ReminderSend[];
  /** The six variants the system can send. Populated even when nothing was sent. */
  catalogue: ReminderCopy[];
  /** Nothing in this window. */
  none: boolean;
  /** Nothing, ever — a different fact, with a different next action. */
  neverAny: boolean;
  /** The sentence to render in place of an empty chart. Null when there is data. */
  reason: string | null;
  scope: string;
}

export interface GrowthAsOf {
  generatedAt: string;
  customersAllTime: number;
  earliestSignupAt: string | null;
  latestSignupAt: string | null;
  /** The one flag to branch on before reading any rate in this payload. */
  windowHasData: boolean;
}

export interface GrowthResponse {
  window: GrowthWindow;
  signups: { total: number; series: SignupBucket[] };
  funnel: GrowthFunnel;
  calling: GrowthCalling;
  email: GrowthEmail;
  asOf: GrowthAsOf;
}

/** One row of "what the calling team wrote". */
export interface GrowthNoteRow {
  userId: string;
  email: string;
  name: string | null;
  calledAt: string | null;
  note: string | null;
  hasNote: boolean;
  kycStatus: KycStatus;
  mobileVerified: boolean;
  signedUpAt: string | null;
}
