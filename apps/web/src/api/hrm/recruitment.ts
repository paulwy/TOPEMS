import apiClient from '../client';
import type { ApiResponse } from '../client';
import type { JobOpening, Candidate, Interview, ListParams, PaginatedResult } from './types';
import { buildQueryString } from './types';

export const jobOpeningApi = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<JobOpening>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/job-openings${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/job-openings/${id}`);
  },

  create: (data: Partial<JobOpening>) => {
    return apiClient.hrm.post('/job-openings', data);
  },

  update: (id: string, data: Partial<JobOpening>) => {
    return apiClient.hrm.put(`/job-openings/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/job-openings/${id}`);
  },

  publish(id: string): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.put(`/job-openings/${id}/publish`);
  },

  close(id: string): Promise<ApiResponse<JobOpening>> {
    return apiClient.hrm.put(`/job-openings/${id}/close`);
  },
};

export const candidateApi = {
  list: async (params?: ListParams) => {
    const queryString = buildQueryString(params);
    return await apiClient.hrm.get(`/candidates${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/candidates/${id}`);
  },

  create: (data: Partial<Candidate>) => {
    return apiClient.hrm.post('/candidates', data);
  },

  update: (id: string, data: Partial<Candidate>) => {
    return apiClient.hrm.put(`/candidates/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/candidates/${id}`);
  },
};

export const interviewApi = {
  list(params?: ListParams): Promise<ApiResponse<PaginatedResult<Interview>>> {
    const queryString = buildQueryString(params);
    return apiClient.hrm.get(`/interviews${queryString}`);
  },

  get: (id: string) => {
    return apiClient.hrm.get(`/interviews/${id}`);
  },

  create: (data: Partial<Interview>) => {
    return apiClient.hrm.post('/interviews', data);
  },

  update: (id: string, data: Partial<Interview>) => {
    return apiClient.hrm.put(`/interviews/${id}`, data);
  },

  delete: (id: string) => {
    return apiClient.hrm.delete(`/interviews/${id}`);
  },

  complete(id: string, data: Partial<Interview>): Promise<ApiResponse<Interview>> {
    return apiClient.hrm.put(`/interviews/${id}/complete`, data);
  },
};

export default jobOpeningApi;
