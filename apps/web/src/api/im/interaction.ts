import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../client';

// ==================== 类型定义 ====================

export type AnnouncementType = 'info' | 'warning' | 'important';
export type PollStatus = 'active' | 'closed' | 'draft';
export type CheckInType = 'daily' | 'once' | 'event';

// ==================== 群公告 ====================

export interface Announcement {
  id: string;
  chat_id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  is_pinned: boolean;
  pinned_until?: string;
  created_by: string;
  created_by_name: string;
  created_by_avatar?: string;
  view_count: number;
  read_count: number;
  read_user_ids: string[];
  allow_comment: boolean;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementRequest {
  chat_id: string;
  title: string;
  content: string;
  type?: AnnouncementType;
  is_pinned?: boolean;
  pinned_until?: string;
  allow_comment?: boolean;
}

export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  type?: AnnouncementType;
  is_pinned?: boolean;
  pinned_until?: string;
  allow_comment?: boolean;
}

export interface AnnouncementQuery {
  chat_id?: string;
  type?: AnnouncementType;
  is_pinned?: boolean;
  page?: number;
  pagesize?: number;
}

// ==================== 投票 ====================

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
  is_winner?: boolean;
}

export interface Poll {
  id: string;
  chat_id: string;
  title: string;
  description?: string;
  options: PollOption[];
  allow_multiple: boolean;
  max_selections?: number;
  is_anonymous: boolean;
  status: PollStatus;
  created_by: string;
  created_by_name: string;
  created_by_avatar?: string;
  total_votes: number;
  voters: Array<{
    user_id: string;
    user_name: string;
    option_ids: string[];
    voted_at: string;
  }>;
  deadline?: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePollRequest {
  chat_id: string;
  title: string;
  description?: string;
  options: string[];
  allow_multiple?: boolean;
  max_selections?: number;
  is_anonymous?: boolean;
  deadline?: string;
}

export interface PollQuery {
  chat_id?: string;
  status?: PollStatus;
  page?: number;
  pagesize?: number;
}

// ==================== 群签到 ====================

export interface CheckIn {
  id: string;
  chat_id: string;
  title: string;
  description?: string;
  type: CheckInType;
  location?: string;
  longitude?: number;
  latitude?: number;
  radius_meters?: number;
  check_in_code?: string;
  allow_late: boolean;
  late_deadline?: string;
  status: 'active' | 'closed';
  created_by: string;
  created_by_name: string;
  created_by_avatar?: string;
  total_participants: number;
  checked_in_count: number;
  participants: Array<{
    user_id: string;
    user_name: string;
    user_avatar?: string;
    checked_in: boolean;
    checked_in_at?: string;
    is_late: boolean;
    location_valid?: boolean;
  }>;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCheckInRequest {
  chat_id: string;
  title: string;
  description?: string;
  type: CheckInType;
  location?: string;
  longitude?: number;
  latitude?: number;
  radius_meters?: number;
  check_in_code?: string;
  allow_late?: boolean;
  late_deadline?: string;
  participant_ids?: string[];
  starts_at: string;
  ends_at: string;
}

export interface CheckInQuery {
  chat_id?: string;
  type?: CheckInType;
  status?: 'active' | 'closed';
  page?: number;
  pagesize?: number;
}

export interface SubmitCheckInRequest {
  check_in_code?: string;
  longitude?: number;
  latitude?: number;
}

// ==================== API 函数 ====================

export const imInteractionApi = {
  // ==================== 群公告 ====================

  /**
   * 创建群公告
   * POST /im/announcements
   */
  createAnnouncement: async (
    data: CreateAnnouncementRequest
  ): Promise<ApiResponse<Announcement>> => {
    return apiClient.im.post('/im/announcements', data);
  },

  /**
   * 列出群公告
   * GET /im/announcements
   */
  listAnnouncements: async (
    params?: AnnouncementQuery
  ): Promise<ApiResponse<PaginatedResponse<Announcement>>> => {
    return apiClient.im.get('/im/announcements', { params });
  },

  /**
   * 获取公告详情
   * GET /im/announcements/:id
   */
  getAnnouncement: async (id: string): Promise<ApiResponse<Announcement>> => {
    return apiClient.im.get(`/im/announcements/${id}`);
  },

  /**
   * 更新公告
   * PUT /im/announcements/:id
   */
  updateAnnouncement: async (
    id: string,
    data: UpdateAnnouncementRequest
  ): Promise<ApiResponse<Announcement>> => {
    return apiClient.im.put(`/im/announcements/${id}`, data);
  },

  /**
   * 删除公告
   * DELETE /im/announcements/:id
   */
  deleteAnnouncement: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.im.delete(`/im/announcements/${id}`);
  },

  /**
   * 标记公告已读
   * POST /im/announcements/:id/read
   */
  markAnnouncementRead: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.im.post(`/im/announcements/${id}/read`);
  },

  // ==================== 投票 ====================

  /**
   * 创建投票
   * POST /im/polls
   */
  createPoll: async (data: CreatePollRequest): Promise<ApiResponse<Poll>> => {
    return apiClient.im.post('/im/polls', data);
  },

  /**
   * 列出投票
   * GET /im/polls
   */
  listPolls: async (params?: PollQuery): Promise<ApiResponse<PaginatedResponse<Poll>>> => {
    return apiClient.im.get('/im/polls', { params });
  },

  /**
   * 获取投票详情
   * GET /im/polls/:id
   */
  getPoll: async (id: string): Promise<ApiResponse<Poll>> => {
    return apiClient.im.get(`/im/polls/${id}`);
  },

  /**
   * 参与投票
   * POST /im/polls/:id/vote
   */
  votePoll: async (id: string, data: { option_ids: string[] }): Promise<ApiResponse<Poll>> => {
    return apiClient.im.post(`/im/polls/${id}/vote`, data);
  },

  /**
   * 关闭投票
   * POST /im/polls/:id/close
   */
  closePoll: async (id: string): Promise<ApiResponse<Poll>> => {
    return apiClient.im.post(`/im/polls/${id}/close`);
  },

  /**
   * 删除投票
   * DELETE /im/polls/:id
   */
  deletePoll: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.im.delete(`/im/polls/${id}`);
  },

  // ==================== 群签到 ====================

  /**
   * 创建签到活动
   * POST /im/check-ins
   */
  createCheckIn: async (data: CreateCheckInRequest): Promise<ApiResponse<CheckIn>> => {
    return apiClient.im.post('/im/check-ins', data);
  },

  /**
   * 列出签到活动
   * GET /im/check-ins
   */
  listCheckIns: async (params?: CheckInQuery): Promise<ApiResponse<PaginatedResponse<CheckIn>>> => {
    return apiClient.im.get('/im/check-ins', { params });
  },

  /**
   * 获取签到详情
   * GET /im/check-ins/:id
   */
  getCheckIn: async (id: string): Promise<ApiResponse<CheckIn>> => {
    return apiClient.im.get(`/im/check-ins/${id}`);
  },

  /**
   * 参与签到
   * POST /im/check-ins/:id/submit
   */
  submitCheckIn: async (id: string, data?: SubmitCheckInRequest): Promise<ApiResponse<CheckIn>> => {
    return apiClient.im.post(`/im/check-ins/${id}/submit`, data || {});
  },

  /**
   * 关闭签到活动
   * POST /im/check-ins/:id/close
   */
  closeCheckIn: async (id: string): Promise<ApiResponse<CheckIn>> => {
    return apiClient.im.post(`/im/check-ins/${id}/close`);
  },

  /**
   * 删除签到活动
   * DELETE /im/check-ins/:id
   */
  deleteCheckIn: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.im.delete(`/im/check-ins/${id}`);
  },
};

export default imInteractionApi;
