export type EmailCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'paused'
  | 'cancelled'
  | 'failed';

export type EmailRecipientStatus =
  | 'pending'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'complained'
  | 'unsubscribed'
  | 'skipped'
  | 'failed';

export type EmailSuppressionReason =
  | 'unsubscribed'
  | 'complained'
  | 'bounced'
  | 'manual';

export type EmailAudienceType = 'segment' | 'manual';

/** Filter over the customer table, resolved when the campaign is sent. */
export interface EmailAudienceFilter {
  status?: 'active' | 'suspended';
  kycStatus?: string[];
  tagIds?: string[];
  country?: string;
  hasCompletedOnboarding?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  neverToppedUp?: boolean;
}

export interface ManualRecipient {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

export interface EmailAudience {
  type?: EmailAudienceType;
  filter?: EmailAudienceFilter;
  manual?: ManualRecipient[];
  manualRaw?: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  bodyHtml: string;
  replyTo: string | null;
  status: EmailCampaignStatus;
  audienceType: EmailAudienceType;
  audienceFilter: EmailAudienceFilter | null;
  trackOpens: boolean;
  trackClicks: boolean;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  complainedCount: number;
  unsubscribedCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmailCampaignRecipient {
  id: string;
  campaignId: string;
  userId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  status: EmailRecipientStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
  firstClickedAt: string | null;
  openCount: number;
  clickCount: number;
  errorMessage: string | null;
  createdAt: string;
  /** Present only on the per-customer history endpoint. */
  campaign?: Pick<EmailCampaign, 'id' | 'name' | 'subject' | 'status'>;
}

export interface EmailCampaignStats {
  funnel: {
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    complained: number;
    unsubscribed: number;
    failed: number;
    skipped: number;
  };
  rates: {
    openRate: number;
    clickRate: number;
    clickToOpenRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  };
  timeline: { bucket: string; opened: number; clicked: number }[];
  topLinks: { url: string; clicks: number; uniqueClicks: number }[];
  clients: { name: string; count: number }[];
  devices: { name: string; count: number }[];
}

export interface AudienceContact {
  userId: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
}

export interface AudiencePreview {
  total: number;
  segmentCount: number;
  manualCount: number;
  /** Pasted addresses dropped because they are on the suppression list. */
  suppressedCount: number;
  sample: AudienceContact[];
}

export interface EmailMergeField {
  token: string;
  label: string;
  sample: string;
}

/**
 * Whether this deployment can actually send.
 *
 * The composer reads it on load so it can say "sending is off" up front, rather
 * than letting an admin write a campaign and discover it at the Send button.
 */
export interface EmailTransportStatus {
  name: string;
  isConfigured: boolean;
  trackingConfigured: boolean;
  fromEmail: string | null;
  dailySendCap: number;
  sendRatePerMinute: number;
  remainingToday: number;
  mergeFields: EmailMergeField[];
}

export interface EmailSuppression {
  id: string;
  email: string;
  reason: EmailSuppressionReason;
  campaignId: string | null;
  note: string | null;
  createdAt: string;
}

export interface EmailPreviewResult {
  subject: string;
  html: string;
  text: string;
  context: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
  };
  isSampleData: boolean;
}
