export interface Tag {
  id: string;
  name: string;
  colour: string;
  description: string | null;
}

/** Computed from account activity; cannot be applied or removed by hand. */
export interface DerivedTag {
  kind: 'derived';
  key: string;
  label: string;
  colour: string;
}

export interface UserMetrics {
  messages30d: number;
  delivered30d: number;
  failed30d: number;
  /** Null when nothing was sent in the window. */
  deliveryRate30d: number | null;
  lifetimeMessages: number;
  lifetimeSpend: number;
  topupCount: number;
  topupTotal: number;
  balance: number;
  lastMessageAt: string | null;
  stuckCount: number;
}

export type MessageStatus =
  | 'initiated'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'expired';

export interface PaginationMeta {
  page: number;
  limit: number;
  /** -1 when the request opted out of counting and the total is unknown. */
  totalItems: number;
  /** -1 when the request opted out of counting and the total is unknown. */
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/** Trimmed to what the admin UI reads; the API returns the whole row. */
export interface AdminOtpTemplate {
  id: string;
  name: string;
  body: string;
  status: string;
}

export interface AdminMessage {
  id: string;
  userId: string;
  phoneNumber: string;
  content: string;
  provider: string;
  providerMsgId: string | null;
  status: MessageStatus;
  statusHistory: { status: string; timestamp: string }[];
  costAmount: number;
  failureReason: string | null;
  /** Set when DLR/webhook reports failure details separately */
  providerStatusDescription: string | null;
  /**
   * The provider's own rejection wording. Admin-only by construction — no
   * customer projection selects it. Null on every row sent before 2026-08-08.
   */
  providerFailureReason: string | null;
  /** Owning customer, returned only by the platform-wide admin search. */
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    companyName: string | null;
  } | null;
  /** The template actually resolved at send time; null if the fallback body ran. */
  otpTemplateId: string | null;
  otpTemplate: AdminOtpTemplate | null;
  /** Text handed to the provider, digits masked. Null for pre-2026-08-08 rows. */
  renderedContent: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  otpRequestId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOverview {
  wallet: { balance: number; currency: string };
  tags: Tag[];
  derivedTags: DerivedTag[];
  metrics: UserMetrics | null;
  messages: {
    totalMessages: number;
    totalSpent: number;
    statusBreakdown: Record<string, number>;
  };
  apiKeyCount: number;
  messagesTrend: {
    date: string;
    total: number;
    delivered: number;
    failed: number;
  }[];
}

export interface DailyUsageUser {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    businessName: string | null;
  };
  tags?: Tag[];
  derivedTags?: DerivedTag[];
  metrics?: UserMetrics | null;
  totalMessages: number;
  deliveredCount: number;
  failedCount: number;
  totalSpent: number;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'credit' | 'debit' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  description: string;
  createdAt: string;
}

export interface AdminApiKey {
  id: string;
  userId: string;
  keyPrefix: string;
  label: string;
  lastUsedAt: string | null;
  isActive: boolean;
  allowedIps: string[] | null;
  createdAt: string;
}
