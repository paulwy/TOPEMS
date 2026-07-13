import { apiClient } from './client';
import type { ApiResponse, Event } from '@/types';

export const scheduleApi = {
  getEvents: async (params: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    eventType?: string;
    status?: string;
  }): Promise<ApiResponse<{ items: Event[]; total: number }>> => {
    const response = await apiClient.get('/schedule/events', { params });
    return response.data;
  },

  getEventById: async (id: string): Promise<ApiResponse<Event>> => {
    const response = await apiClient.get(`/schedule/events/${id}`);
    return response.data;
  },

  createEvent: async (data: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    eventType: string;
    attendees?: string[];
  }): Promise<ApiResponse<Event>> => {
    const response = await apiClient.post('/schedule/events', data);
    return response.data;
  },

  updateEvent: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      location?: string;
      attendees?: string[];
    },
  ): Promise<ApiResponse<Event>> => {
    const response = await apiClient.put(`/schedule/events/${id}`, data);
    return response.data;
  },

  deleteEvent: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/schedule/events/${id}`);
    return response.data;
  },

  getTodayEvents: async (): Promise<ApiResponse<Event[]>> => {
    const response = await apiClient.get('/schedule/events/today');
    return response.data;
  },

  getWeekEvents: async (): Promise<ApiResponse<Event[]>> => {
    const response = await apiClient.get('/schedule/events/week');
    return response.data;
  },

  getMonthEvents: async (params: {
    year: number;
    month: number;
  }): Promise<ApiResponse<Event[]>> => {
    const response = await apiClient.get('/schedule/events/month', { params });
    return response.data;
  },

  getMyEvents: async (params: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<{ items: Event[]; total: number }>> => {
    const response = await apiClient.get('/schedule/events/my', { params });
    return response.data;
  },

  getAttendingEvents: async (params: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<{ items: Event[]; total: number }>> => {
    const response = await apiClient.get('/schedule/events/attending', { params });
    return response.data;
  },

  updateStatus: async (id: string, status: string): Promise<ApiResponse<Event>> => {
    const response = await apiClient.put(`/schedule/events/${id}/status`, { status });
    return response.data;
  },

  addAttendee: async (id: string, userId: string): Promise<ApiResponse<Event>> => {
    const response = await apiClient.post(`/schedule/events/${id}/attendees`, { userId });
    return response.data;
  },

  removeAttendee: async (id: string, userId: string): Promise<ApiResponse<Event>> => {
    const response = await apiClient.delete(`/schedule/events/${id}/attendees/${userId}`);
    return response.data;
  },
};
