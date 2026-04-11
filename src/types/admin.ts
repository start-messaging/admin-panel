export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'expired';

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
  sentAt: string | null;
  deliveredAt: string | null;
  otpRequestId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOverview {
  wallet: { balance: number; currency: string };
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
