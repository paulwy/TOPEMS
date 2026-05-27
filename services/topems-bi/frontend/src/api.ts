import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8013';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout?: any;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  config: any;
  data_source?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  report_id?: string;
  widget_type: string;
  title?: string;
  position: any;
  config?: any;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  code: number;
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}

export const dashboardApi = {
  getDashboards: () => api.get<ApiResponse<any>>('/api/v1/dashboards'),
  createDashboard: (data: any) => api.post<ApiResponse<Dashboard>>('/api/v1/dashboards', data),
  getDashboard: (id: string) => api.get<ApiResponse<Dashboard>>(`/api/v1/dashboards/${id}`),
  updateDashboard: (id: string, data: any) => api.put<ApiResponse<Dashboard>>(`/api/v1/dashboards/${id}`, data),
  deleteDashboard: (id: string) => api.delete<ApiResponse<string>>(`/api/v1/dashboards/${id}`),
};

export const reportApi = {
  getReports: () => api.get<ApiResponse<any>>('/api/v1/reports'),
  createReport: (data: any) => api.post<ApiResponse<Report>>('/api/v1/reports', data),
  getReport: (id: string) => api.get<ApiResponse<Report>>(`/api/v1/reports/${id}`),
  updateReport: (id: string, data: any) => api.put<ApiResponse<Report>>(`/api/v1/reports/${id}`, data),
  deleteReport: (id: string) => api.delete<ApiResponse<string>>(`/api/v1/reports/${id}`),
};

export const analyticsApi = {
  getOverview: () => api.get<ApiResponse<any>>('/api/v1/analytics/overview'),
};

export default api;
