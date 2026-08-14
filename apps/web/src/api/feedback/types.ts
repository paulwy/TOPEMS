import i18n from '@/i18n';
export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'question' | 'other';

export type FeedbackStatus = 'pending' | 'processing' | 'resolved' | 'closed';

export interface Feedback {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  screenshots: string[];
  satisfaction: number;
  status: FeedbackStatus;
  created_by: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
  assignee?: string;
  reply?: string;
}

export interface CreateFeedbackRequest {
  type: FeedbackType;
  title: string;
  description: string;
  screenshots?: string[];
  satisfaction?: number;
}

export interface UpdateFeedbackRequest {
  type?: FeedbackType;
  title?: string;
  description?: string;
  status?: FeedbackStatus;
  assignee?: string;
  reply?: string;
}

export interface FeedbackQueryParams {
  type?: FeedbackType;
  status?: FeedbackStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: i18n.t('shared.types.bug_0'),
  feature: i18n.t('shared.types.k0'),
  improvement: i18n.t('shared.types.k1'),
  question: i18n.t('shared.types.k2'),
  other: i18n.t('shared.types.k3'),
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: i18n.t('shared.types.k4'),
  processing: i18n.t('shared.types.k5'),
  resolved: i18n.t('shared.types.k6'),
  closed: i18n.t('shared.types.k7'),
};
