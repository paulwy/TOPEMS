import axios from 'axios';
import type { 
  ApiResponse, 
  PatrolRecord, 
  ScanRecord, 
  MediaFile, 
  MobileTask,
  DashboardStats 
} from '../types';

const baseURL = (import.meta as any).env?.VITE_API_URL || '/';

const api = axios.create({
  baseURL,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const patrolApi = {
  getAll: async (): Promise<PatrolRecord[]> => {
    try {
      const response = await api.get<ApiResponse>('/api/v1/patrol-records');
      return response.data.data?.patrol_records || [];
    } catch (error) {
      console.error('Failed to fetch patrol records:', error);
      return [];
    }
  },
  
  create: async (data: Partial<PatrolRecord>): Promise<PatrolRecord> => {
    const response = await api.post<ApiResponse>('/api/v1/patrol-records', data);
    return response.data.data;
  },
  
  update: async (id: string, data: Partial<PatrolRecord>): Promise<PatrolRecord> => {
    const response = await api.put<ApiResponse>(`/api/v1/patrol-records/${id}`, data);
    return response.data.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/patrol-records/${id}`);
  },
};

export const scanApi = {
  getAll: async (): Promise<ScanRecord[]> => {
    try {
      const response = await api.get<ApiResponse>('/api/v1/scan-records');
      return response.data.data?.scan_records || [];
    } catch (error) {
      console.error('Failed to fetch scan records:', error);
      return [];
    }
  },
  
  create: async (data: Partial<ScanRecord>): Promise<ScanRecord> => {
    const response = await api.post<ApiResponse>('/api/v1/scan-records', data);
    return response.data.data;
  },
};

export const mediaApi = {
  getPhotos: async (): Promise<MediaFile[]> => {
    try {
      const response = await api.get<ApiResponse>('/api/v1/media/photos');
      return response.data.data?.photos || [];
    } catch (error) {
      console.error('Failed to fetch photos:', error);
      return [];
    }
  },
  
  getAudio: async (): Promise<MediaFile[]> => {
    try {
      const response = await api.get<ApiResponse>('/api/v1/media/audio');
      return response.data.data?.audio || [];
    } catch (error) {
      console.error('Failed to fetch audio:', error);
      return [];
    }
  },
  
  getVideo: async (): Promise<MediaFile[]> => {
    try {
      const response = await api.get<ApiResponse>('/api/v1/media/video');
      return response.data.data?.video || [];
    } catch (error) {
      console.error('Failed to fetch video:', error);
      return [];
    }
  },
  
  upload: async (type: 'photo' | 'audio' | 'video', data: FormData): Promise<MediaFile> => {
    const endpoint = `/api/v1/media/${type}`;
    const response = await api.post<ApiResponse>(endpoint, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};

export const taskApi = {
  getAll: async (): Promise<MobileTask[]> => {
    try {
      const response = await api.get<ApiResponse>('/api/v1/mobile-tasks');
      return response.data.data?.mobile_tasks || [];
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      return [];
    }
  },
  
  create: async (data: Partial<MobileTask>): Promise<MobileTask> => {
    const response = await api.post<ApiResponse>('/api/v1/mobile-tasks', data);
    return response.data.data;
  },
  
  update: async (id: string, data: Partial<MobileTask>): Promise<MobileTask> => {
    const response = await api.put<ApiResponse>(`/api/v1/mobile-tasks/${id}`, data);
    return response.data.data;
  },
  
  complete: async (id: string): Promise<MobileTask> => {
    const response = await api.post<ApiResponse>(`/api/v1/mobile-tasks/${id}/status`, { status: 'completed' });
    return response.data.data;
  },
};

export const statsApi = {
  getDashboard: async (): Promise<DashboardStats> => {
    try {
      const response = await api.get<ApiResponse>('/api/v1/stats/dashboard');
      return response.data.data || {
        todayPatrols: 0,
        todayScans: 0,
        pendingTasks: 0,
        completedTasks: 0,
      };
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return {
        todayPatrols: 0,
        todayScans: 0,
        pendingTasks: 0,
        completedTasks: 0,
      };
    }
  },
};

export default api;
