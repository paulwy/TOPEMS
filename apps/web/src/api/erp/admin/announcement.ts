import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { Announcement, PaginationParams, PaginatedResult } from '../types';
import type { CrudOperations } from '@/hooks/useCrudQueries';

export const announcementApi = {
  async list(
    params?: PaginationParams & { priority?: string }
  ): Promise<ApiResponse<PaginatedResult<Announcement>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.priority) searchParams.set('priority', params.priority);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/announcements${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.get(`/announcements/${id}`);
  },

  async create(data: Partial<Announcement>): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.post('/announcements', data);
  },

  async update(id: string, data: Partial<Announcement>): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.put(`/announcements/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/announcements/${id}`);
  },

  async publish(id: string): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.post(`/announcements/${id}/publish`);
  },

  async unpublish(id: string): Promise<ApiResponse<Announcement>> {
    return apiClient.erp.post(`/announcements/${id}/unpublish`);
  },
};

const announcementCrudApi: CrudOperations<Announcement> = {
  list: (params?) =>
    announcementApi.list({
      page: params?.page as number,
      pagesize: params?.pagesize as number,
      ...(params as unknown as Record<string, unknown>),
    }),
  get: announcementApi.get,
  create: announcementApi.create,
  update: announcementApi.update,
  delete: announcementApi.delete,
};

export default announcementApi;
