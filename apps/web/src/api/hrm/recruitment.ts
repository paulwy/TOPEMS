import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { JobOpening, Candidate, Interview, ListParams, PaginatedResult } from './types';
import { buildQueryString } from './types';

export const jobOpeningApi = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<JobOpening>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/job-openings${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/api/hrm/job-openings/${id}`);
  },

  create: (data: Partial<JobOpening>) => {
    return apiClient.hrm.post('/api/hrm/job-openings', data);
  },

  update: (id: string, data: Partial<JobOpening>) => {
    return apiClient.hrm.put(`/api/hrm/job-openings/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/api/hrm/job-openings/${id}`);
  },

  publish(id: string): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.put(`/api/hrm/job-openings/${id}/publish`);
  },

  close(id: string): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.put(`/api/hrm/job-openings/${id}/close`);
  },
};

export const candidateApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/api/hrm/candidates${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/api/hrm/candidates/${id}`);
  },

  create: (data: Partial<Candidate>) => {
    return apiClient.hrm.post('/api/hrm/candidates', data);
  },

  update: (id: string, data: Partial<Candidate>) => {
    return apiClient.hrm.put(`/api/hrm/candidates/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/api/hrm/candidates/${id}`);
  },
};

export const interviewApi = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<Interview>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/api/hrm/interviews${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/api/hrm/interviews/${id}`);
  },

  create: (data: Partial<Interview>) => {
    return apiClient.hrm.post('/api/hrm/interviews', data);
  },

  update: (id: string, data: Partial<Interview>) => {
    return apiClient.hrm.put(`/api/hrm/interviews/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/api/hrm/interviews/${id}`);
  },

  complete(id: string, data: Partial<Interview>): Promise<ApiResponse<Interview>> {
    return apiClient.hrm.put(`/api/hrm/interviews/${id}/complete`, data);
  },
};

export default jobOpeningApi;
