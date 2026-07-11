import { apiClient } from './client';
import type { ApiResponse, Task } from '@/types';

export const taskApi = {
  getTasks: async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
    priority?: string;
    type?: string;
    assigneeId?: string;
    dueDateStart?: string;
    dueDateEnd?: string;
  }): Promise<ApiResponse<{ items: Task[]; total: number }>> => {
    const response = await apiClient.get('/task', { params });
    return response.data;
  },

  getTaskById: async (id: string): Promise<ApiResponse<Task>> => {
    const response = await apiClient.get(`/task/${id}`);
    return response.data;
  },

  createTask: async (data: {
    title: string;
    description?: string;
    taskType: string;
    priority: string;
    status?: string;
    assigneeId?: string;
    dueDate?: string;
    locationLat?: number;
    locationLng?: number;
  }): Promise<ApiResponse<Task>> => {
    const response = await apiClient.post('/task', data);
    return response.data;
  },

  updateTask: async (
    id: string,
    data: {
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      assigneeId?: string;
      dueDate?: string;
    }
  ): Promise<ApiResponse<Task>> => {
    const response = await apiClient.put(`/task/${id}`, data);
    return response.data;
  },

  deleteTask: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/task/${id}`);
    return response.data;
  },

  getMyTasks: async (params: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<ApiResponse<{ items: Task[]; total: number }>> => {
    const response = await apiClient.get('/task/my', { params });
    return response.data;
  },

  getPendingTasks: async (): Promise<ApiResponse<Task[]>> => {
    const response = await apiClient.get('/task/pending');
    return response.data;
  },

  getOverdueTasks: async (): Promise<ApiResponse<Task[]>> => {
    const response = await apiClient.get('/task/overdue');
    return response.data;
  },

  completeTask: async (id: string): Promise<ApiResponse<Task>> => {
    const response = await apiClient.post(`/task/${id}/complete`);
    return response.data;
  },

  reopenTask: async (id: string): Promise<ApiResponse<Task>> => {
    const response = await apiClient.post(`/task/${id}/reopen`);
    return response.data;
  },

  batchUpdateStatus: async (
    ids: string[],
    status: string
  ): Promise<ApiResponse<{ success: number; failed: number }>> => {
    const response = await apiClient.post('/task/batch/status', { ids, status });
    return response.data;
  },

  searchTasks: async (keyword: string): Promise<ApiResponse<Task[]>> => {
    const response = await apiClient.get('/task/search', { params: { keyword } });
    return response.data;
  },
};