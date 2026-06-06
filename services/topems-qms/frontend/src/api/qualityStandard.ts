import apiClient from './client';

export interface QualityStandard {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  version?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface QualityIssue {
  id: string;
  title: string;
  description?: string;
  severity: 'critical' | 'major' | 'minor';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  source?: string;
  assigned_to?: string;
  priority?: string;
  created_at: string;
  updated_at: string;
}

export const qualityStandardApi = {
  list: async (params?: { page?: number; pageSize?: number; search?: string; status?: string }) => {
    const response = await apiClient.get('/api/v1/standards', { params });
    return response.data;
  },
  
  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/standards/${id}`);
    return response.data;
  },
  
  create: async (data: { code: string; name: string; description?: string; category?: string; version?: string }) => {
    const response = await apiClient.post('/api/v1/standards', data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<QualityStandard>) => {
    const response = await apiClient.put(`/api/v1/standards/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/standards/${id}`);
    return response.data;
  },
};

export const issueApi = {
  list: async (params?: { page?: number; pageSize?: number; search?: string; severity?: string; status?: string }) => {
    const response = await apiClient.get('/api/v1/issues', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/issues/${id}`);
    return response.data;
  },

  create: async (data: { title: string; description?: string; severity?: string; source?: string; assigned_to?: string; priority?: string }) => {
    const response = await apiClient.post('/api/v1/issues', data);
    return response.data;
  },

  update: async (id: string, data: Partial<QualityIssue>) => {
    const response = await apiClient.put(`/api/v1/issues/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/issues/${id}`);
    return response.data;
  },
};

export interface QualityInspection {
  id: string;
  title: string;
  inspection_type: '巡检' | '定期检查' | '专项检查' | '来料检查' | '出货检查';
  inspector: string;
  status: 'pending' | 'in_progress' | 'completed';
  description?: string;
  result?: string;
  findings?: string;
  created_at: string;
  updated_at: string;
}

export const inspectionApi = {
  list: async (params?: { page?: number; pageSize?: number; search?: string; status?: string; inspection_type?: string }) => {
    const response = await apiClient.get('/api/v1/inspections', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await apiClient.get(`/api/v1/inspections/${id}`);
    return response.data;
  },

  create: async (data: { title: string; inspection_type: string; inspector?: string; status?: string; description?: string; result?: string; findings?: string }) => {
    const response = await apiClient.post('/api/v1/inspections', data);
    return response.data;
  },

  update: async (id: string, data: Partial<QualityInspection>) => {
    const response = await apiClient.put(`/api/v1/inspections/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/v1/inspections/${id}`);
    return response.data;
  },
};
