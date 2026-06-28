import apiClient from '../../client';
import type { ApiResponse } from '../../client';
import type { MeetingRoom, MeetingBooking, PaginationParams, PaginatedResult } from '../types';

export const meetingRoomApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<MeetingRoom>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/erp/meeting-rooms${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<MeetingRoom>> {
    return apiClient.erp.get(`/api/erp/meeting-rooms/${id}`);
  },

  async create(data: Partial<MeetingRoom>): Promise<ApiResponse<MeetingRoom>> {
    return apiClient.erp.post('/api/erp/meeting-rooms', data);
  },

  async update(id: string, data: Partial<MeetingRoom>): Promise<ApiResponse<MeetingRoom>> {
    return apiClient.erp.put(`/api/erp/meeting-rooms/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/meeting-rooms/${id}`);
  },

  async getBookings(id: string): Promise<ApiResponse<MeetingBooking[]>> {
    return apiClient.erp.get(`/api/erp/meeting-rooms/${id}/bookings`);
  },
};

export const meetingBookingApi = {
  async list(params?: PaginationParams): Promise<ApiResponse<PaginatedResult<MeetingBooking>>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pagesize) searchParams.set('pagesize', params.pagesize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);

    const queryString = searchParams.toString();
    return apiClient.erp.get(`/api/erp/meeting-bookings${queryString ? `?${queryString}` : ''}`);
  },

  async get(id: string): Promise<ApiResponse<MeetingBooking>> {
    return apiClient.erp.get(`/api/erp/meeting-bookings/${id}`);
  },

  async create(data: Partial<MeetingBooking>): Promise<ApiResponse<MeetingBooking>> {
    return apiClient.erp.post('/api/erp/meeting-bookings', data);
  },

  async update(id: string, data: Partial<MeetingBooking>): Promise<ApiResponse<MeetingBooking>> {
    return apiClient.erp.put(`/api/erp/meeting-bookings/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<string>> {
    return apiClient.erp.delete(`/api/erp/meeting-bookings/${id}`);
  },
};
