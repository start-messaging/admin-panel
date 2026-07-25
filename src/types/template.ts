export type TemplateStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected';

export interface Channel {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
}

export interface TemplateOwner {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface OtpTemplate {
  id: string;
  /** null = shared SYSTEM template (admin-authored). */
  userId: string | null;
  user?: TemplateOwner | null;
  name: string;
  body: string;
  channelId: string;
  channel: Channel;
  status: TemplateStatus;
  language: string | null;
  metadata: Record<string, unknown> | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
