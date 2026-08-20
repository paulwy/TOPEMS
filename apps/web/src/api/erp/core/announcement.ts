import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { PaginationParams } from './types';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author?: string;
  status: 'draft' | 'published' | 'expired' | 'archived';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  publish_at?: string;
  expire_at?: string;
  created_at: string;
  updated_at: string;
}

interface AnnouncementListResponse {
  items: Announcement[];
  total: number;
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  publish_at?: string;
  expire_at?: string;
}

export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  publish_at?: string;
  expire_at?: string;
}

const resolvePageSize = (params?: PaginationParams): string | undefined => {
  const ps =
    (params as { pageSize?: number } | undefined)?.pageSize ??
    (params as { pagesize?: number } | undefined)?.pagesize;
  return ps ? ps.toString() : undefined;
};

export const announcementApi = {
  async list(
    params?: PaginationParams & { priority?: string }
  ): Promise<ApiResponse<AnnouncementListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    const ps = resolvePageSize(params);
    if (ps) searchParams.set('pagesize', ps);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if ((params as { priority?: string })?.priority)
      searchParams.set('priority', (params as { priority?: string }).priority as string);

    const queryString = searchParams.toString();
    return apiClient.erp.get<AnnouncementListResponse>(
      `/announcements${queryString ? `?${queryString}` : ''}`
    );
  },

  async get(id: string): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.get<Announcement>(`/announcements/${id}`);
  },

  async create(data: CreateAnnouncementRequest): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.post<Announcement>('/announcements', data);
  },

  async update(id: string, data: UpdateAnnouncementRequest): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.put<Announcement>(`/announcements/${id}`, data);
  },

  async remove(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete<string>(`/announcements/${id}`);
  },
  async delete(id: string): Promise<ApiResponse<string>> {
    return this.remove(id);
  },

  async publish(id: string): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.post<Announcement>(`/announcements/${id}/publish`, {});
  },

  async unpublish(id: string): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.post<Announcement>(`/announcements/${id}/unpublish`, {});
  },
};
