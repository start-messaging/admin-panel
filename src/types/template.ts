export type TemplateStatus = 'draft' | 'published';

export interface Channel {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
}

export interface OtpTemplate {
  id: string;
  name: string;
  body: string;
  channelId: string;
  channel: Channel;
  status: TemplateStatus;
  language: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
