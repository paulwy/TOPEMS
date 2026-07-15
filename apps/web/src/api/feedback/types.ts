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
  bug: 'Bug反馈',
  feature: '功能建议',
  improvement: '改进优化',
  question: '使用问题',
  other: '其他',
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  closed: '已关闭',
};
